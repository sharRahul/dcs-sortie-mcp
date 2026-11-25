import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guide = readFileSync(new URL("../skills/dcs-mission-production/references/mission-content.md", import.meta.url), "utf8");
const tools = Object.keys(JSON.parse(readFileSync(new URL("./fixtures/mcp-schema-sha256.json", import.meta.url), "utf8")));
const named = new Set(guide.match(/\bdcs_[a-z0-9_]+/g) ?? []);

test("the mission checklist names only registered tools", () => {
  const unknown = [...named].filter(n => !tools.includes(n));
  assert.deepEqual(unknown, [], `checklist names tools that do not exist: ${unknown.join(", ")}`);
});

test("every registered tool appears in the mission checklist", () => {
  // A new tool must be added to the checklist (a build section or the appendix) before it ships.
  const missing = tools.filter(t => !named.has(t));
  assert.deepEqual(missing, [], `add these tools to skills/dcs-mission-production/references/mission-content.md: ${missing.join(", ")}`);
});

test("every registered tool has exactly one primary toolset", () => {
  const inventory = guide.split("## Toolsets: complete tool inventory")[1];
  assert.ok(inventory, "missing complete toolset inventory");
  const sections = [...inventory.matchAll(/^### ([a-z-]+) toolset\r?\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm)];
  assert.equal(sections.length, 20);
  const assigned = sections.flatMap(([, , body]) => [...body.matchAll(/^- `(dcs_[a-z0-9_]+)`$/gm)].map(m => m[1]));
  assert.deepEqual(assigned.slice().sort(), tools.slice().sort(), "missing, unknown or multiply assigned tool");
  for (const [, id, body] of sections) {
    assert.match(body, /\*\*When \/ order:\*\*/, `missing routing guidance for ${id}`);
  }
});
