/**
 * Launches the DCS server exactly as each INSTALLED client is configured to launch it, then
 * drives one long authoring session over MCP stdio: list tools, ~50 authoring calls, validate,
 * save, reopen the saved file and compare its contents.
 *
 * What this proves: the command/args/env each client stores actually starts this server on this
 * PC, every tool is discoverable over the protocol, and a long session saves a mission that
 * reopens intact. What it does NOT prove: that the client app's own UI lists the tools, that its
 * model picks them, or the app's own timeouts and approval prompts. Those need the app itself.
 *
 *   node scripts/dev/client-install-smoke.mjs [--only <name>]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HOME = os.homedir();
const APPDATA = process.env.APPDATA ?? path.join(HOME, "AppData", "Roaming");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : undefined;

/** Minimal TOML reader for `[mcp_servers.<name>]` / `[mcp_servers.<name>.env]` tables. */
function codexServers(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  let cur;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    const h = /^\[mcp_servers\.([^\].]+)(\.env)?\]$/.exec(line);
    if (h) { out[h[1]] ??= { env: {} }; cur = h[2] ? out[h[1]].env : out[h[1]]; continue; }
    if (line.startsWith("[")) { cur = undefined; continue; }
    const kv = /^([A-Za-z_][\w-]*)\s*=\s*(.+)$/.exec(line);
    if (!cur || !kv) continue;
    const v = kv[2].trim();
    const str = s => s.replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, (_, x) => x.replace(/\\\\/g, "\\"));
    cur[kv[1]] = v.startsWith("[") ? [...v.matchAll(/'[^']*'|"(?:[^"\\]|\\.)*"/g)].map(m => str(m[0])) : v === "true" ? true : v === "false" ? false : str(v);
  }
  return out;
}

function entries() {
  const list = [];
  const cd = path.join(APPDATA, "Claude", "claude_desktop_config.json");
  if (fs.existsSync(cd)) {
    const e = JSON.parse(fs.readFileSync(cd, "utf8")).mcpServers?.dcs;
    if (e) list.push({ name: "claude-desktop-config", ...e });
  }
  const extDir = path.join(APPDATA, "Claude", "Claude Extensions", "local.mcpb.dcs-sortie-mcp-contributors.dcs-mcp");
  if (fs.existsSync(path.join(extDir, "manifest.json"))) {
    const m = JSON.parse(fs.readFileSync(path.join(extDir, "manifest.json"), "utf8"));
    // Unanswered user_config fields expand to "" (the server treats that as unset).
    const sub = s => s.replaceAll("${__dirname}", extDir).replace(/\$\{user_config\.[^}]+\}/g, "");
    list.push({ name: "claude-desktop-mcpb", version: m.version, command: m.server.mcp_config.command,
      args: m.server.mcp_config.args.map(sub), env: Object.fromEntries(Object.entries(m.server.mcp_config.env ?? {}).map(([k, v]) => [k, sub(v)])) });
  }
  for (const [n, e] of Object.entries(codexServers(path.join(HOME, ".codex", "config.toml")))) {
    if (!/dcs/i.test(n) || e.enabled === false) continue;
    list.push({ name: `codex:${n}`, command: e.command, args: e.args ?? [], env: e.env });
  }
  const pluginRoot = path.join(HOME, ".codex", "plugins", "cache", "dcs-mcp-local", "dcs-chatgpt");
  if (fs.existsSync(pluginRoot)) for (const ver of fs.readdirSync(pluginRoot)) {
    const root = path.join(pluginRoot, ver), f = path.join(root, "mcp.json");
    if (!fs.existsSync(f)) continue;
    const e = JSON.parse(fs.readFileSync(f, "utf8")).mcpServers.dcs;
    const sub = s => s.replaceAll("${PLUGIN_ROOT}", root);
    list.push({ name: `chatgpt-plugin@${ver}`, command: e.command, args: e.args.map(sub), cwd: e.cwd && sub(e.cwd), env: e.env });
  }
  return only ? list.filter(e => e.name.includes(only)) : list;
}

const text = r => (r.content ?? []).map(c => c.text ?? "").join("\n");
const json = r => r.structuredContent ?? JSON.parse(text(r));

async function session(entry) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "dcs-client-smoke-"));
  const env = { ...process.env, ...(entry.env ?? {}), DCS_MISSION_OUTPUT_DIR: outDir };
  const res = { client: entry.name, command: [entry.command, ...entry.args].join(" "), calls: 0, failures: [] };
  const t0 = Date.now();
  const client = new Client({ name: "client-install-smoke", version: "1" });
  try {
    await client.connect(new StdioClientTransport({ command: entry.command, args: entry.args, env, cwd: entry.cwd, stderr: "pipe" }));
  } catch (e) { res.startError = String(e.message ?? e); return res; }
  res.server = client.getServerVersion();
  res.tools = (await client.listTools()).tools.length;
  const call = async (name, args) => {
    res.calls++;
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
    if (r.isError) { res.failures.push(`${name}: ${text(r).slice(0, 200)}`); return undefined; }
    return r;
  };
  const created = json(await call("dcs_miz_new", { theatre: "Caucasus", startTime: 32400 }));
  const sessionId = created.sessionId;
  const S = { sessionId, side: "blue", country: "USA" };
  await call("dcs_miz_set_weather", { sessionId, windGroundSpeed: 5, windGroundDir: 90, temperatureCelsius: 12 });
  await call("dcs_miz_add_aircraft_group", { ...S, name: "Smoke-Player", type: "F-16C_50", skill: "Player", start: { kind: "parking_cold", airfield: "Kutaisi" } });
  await call("dcs_miz_add_waypoint", { sessionId, group: "Smoke-Player", x: -270000, y: 690000, altitudeMetres: 5000, speedMps: 220 });
  await call("dcs_miz_add_farp", { ...S, name: "Smoke-FARP", x: -287000, y: 686000, support: true });
  const groups = 10;
  for (let i = 0; i < groups; i++) {
    const g = `Smoke-Armour-${i + 1}`, x = -290000 + i * 800, y = 700000 + i * 600;
    await call("dcs_miz_add_ground_group", { sessionId, side: "red", country: "Russia", name: g, type: "T-72B", count: 3, x, y, heading: 90 });
    for (let w = 1; w <= 2; w++) await call("dcs_miz_add_waypoint", { sessionId, group: g, x: x + w * 1500, y: y + w * 500, speedMps: 8 });
  }
  for (let z = 1; z <= 4; z++) await call("dcs_miz_add_trigger_zone", { sessionId, name: `Smoke-Zone-${z}`, x: -289000 + z * 2000, y: 701000, radius: 1500 });
  for (let z = 1; z <= 4; z++) await call("dcs_miz_add_trigger", { sessionId, type: "once", comment: `Smoke-T${z}`,
    conditions: [{ kind: "part_of_group_in_zone", group: `Smoke-Armour-${z}`, zone: `Smoke-Zone-${z}` }],
    actions: [{ kind: "message", text: `Armour ${z} entered zone ${z}` }, { kind: "set_flag", flag: 100 + z }] });
  await call("dcs_miz_add_trigger", { sessionId, type: "start", comment: "Smoke-Start", conditions: [], actions: [{ kind: "message", text: "Smoke start" }] });
  const v = json(await call("dcs_miz_validate", { sessionId, response_format: "json" }) ?? { content: [{ text: "{}" }] });
  res.validateErrors = (v.issues ?? v.findings ?? []).filter(i => i.severity === "error").length;
  const saved = await call("dcs_miz_save_as", { sessionId, outPath: `client-smoke-${entry.name.replace(/[^\w.-]/g, "_")}.miz` });
  const outPath = saved && json(saved).outPath;
  res.saved = outPath && fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
  await call("dcs_miz_close", { sessionId });
  if (outPath) {
    const reopened = json(await call("dcs_miz_open", { path: outPath }));
    const sum = await call("dcs_miz_list_groups", { sessionId: reopened.sessionId });
    const s = text(sum);
    res.reopenGroups = (s.match(/Smoke-Armour-\d+/g) ?? []).length ? new Set(s.match(/Smoke-Armour-\d+/g)).size : 0;
    res.reopenOk = res.reopenGroups === groups && /Smoke-Player/.test(s);
    await call("dcs_miz_close", { sessionId: reopened.sessionId });
  }
  res.seconds = Math.round((Date.now() - t0) / 100) / 10;
  await client.close();
  fs.rmSync(outDir, { recursive: true, force: true });
  return res;
}

const results = [];
for (const e of entries()) {
  try { results.push(await session(e)); } catch (err) { results.push({ client: e.name, error: String(err?.message ?? err) }); }
}
console.log(JSON.stringify(results, null, 2));
