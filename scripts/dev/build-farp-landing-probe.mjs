/**
 * Why does an AI helicopter not land on a FARP pad? Three AI UH-1Hs in one run:
 *   A  air start 3 km from the pad, one Land waypoint LINKED to the pad (linkUnit/helipadId)
 *   B  air start 3 km from the pad, one Land waypoint at the pad's x/y, NOT linked
 *   C  farp_cold on the pad, a leg out, linked Land back (the failing case)
 * [PROBE] lines: whether DCS sees the FARP as an Airbase and its id, then each helicopter's
 * distance to the pad, AGL, inAir and fuel every 15 s, plus LAND/TAKEOFF events.
 *   npm run build && node scripts/dev/build-farp-landing-probe.mjs [out]
 */
import path from "node:path";
import { newSession, saveSessionAs } from "../../dist/miz/sessions.js";
import { addAircraftGroup, addTrigger, addWaypoint, findGroup, setPayload } from "../../dist/miz/authoring.js";
import { addFarp } from "../../dist/miz/dressing.js";
import { findAirport } from "../../dist/data/reference.js";
import { claimStartAirfields } from "../../dist/miz/logistics.js";
import { asTable, luaArray } from "../../dist/miz/lua.js";

const OUT = process.argv[2] ?? path.join(process.env.USERPROFILE ?? ".", "Saved Games", "DCS", "Missions", "VS Code Missions", "dcs-mcp-farp-landing-probe.miz");
const s = newSession("Caucasus", 9 * 3600);
const kut = findAirport("Caucasus", "Kutaisi");
// Further from Kutaisi than before (12 km south-east) so "landing at the airfield" cannot be confused with the pad.
const pad = { x: kut.x - 9000, y: kut.y + 8000 };
addFarp(s.mission, { side: "blue", country: "USA", name: "FARP-Probe", x: pad.x, y: pad.y, support: true });
const LAND = { altitudeMetres: 43, speedMps: 41.666666666667, type: "Land", action: "Landing" };
const pts = g => asTable(asTable(findGroup(s.mission, g).group.route)?.points);
const link = (g, i, id) => Object.assign(asTable(pts(g)?.[i]), { linkUnit: id, helipadId: id });

addAircraftGroup(s.mission, "helicopter", { side: "blue", country: "USA", name: "Probe-A-linked", type: "UH-1H", count: 1, x: pad.x + 3000, y: pad.y, altitudeMetres: 150, skill: "High" });
addAircraftGroup(s.mission, "helicopter", { side: "blue", country: "USA", name: "Probe-B-plain", type: "UH-1H", count: 1, x: pad.x - 3000, y: pad.y, altitudeMetres: 150, skill: "High" });
addAircraftGroup(s.mission, "helicopter", { side: "blue", country: "USA", name: "Probe-C-farp", type: "UH-1H", count: 1, x: 0, y: 0, skill: "High", start: { kind: "farp_cold", farp: "FARP-Probe" } });
const padId = asTable(pts("Probe-C-farp")?.[1])?.linkUnit;
link("Probe-A-linked", addWaypoint(s.mission, "Probe-A-linked", { x: pad.x, y: pad.y, ...LAND }), padId);
addWaypoint(s.mission, "Probe-B-plain", { x: pad.x, y: pad.y, ...LAND });
addWaypoint(s.mission, "Probe-C-farp", { x: pad.x + 3000, y: pad.y + 3000, altitudeMetres: 200, speedMps: 45 });
link("Probe-C-farp", addWaypoint(s.mission, "Probe-C-farp", { x: pad.x, y: pad.y, ...LAND }), padId);
for (const g of ["Probe-A-linked", "Probe-B-plain", "Probe-C-farp"]) setPayload(s.mission, String(luaArray(asTable(findGroup(s.mission, g).group.units))[0].name), { fuel: 300 });
addAircraftGroup(s.mission, "plane", { side: "blue", country: "USA", name: "Observer", type: "F-16C_50", count: 1, x: 0, y: 0, skill: "Player", start: { kind: "parking_cold", airfield: "Senaki-Kolkhi" } });
claimStartAirfields(s);

const lua = String.raw`
local function log(s) env.info("[PROBE] " .. s) end
local PX, PY = ${pad.x}, ${pad.y}
local ab = Airbase.getByName("FARP-Probe")
if ab then local ok, d = pcall(function() return ab:getDesc() end)
  log(string.format("AIRBASE found id=%s cat=%s callsign=%s", tostring(ab:getID()), tostring(ok and d and d.category), tostring(ab:getCallsign())))
else log("AIRBASE missing=1") end
for _, b in ipairs(world.getAirbases() or {}) do local p = b:getPoint()
  if math.sqrt((p.x-PX)^2 + (p.z-PY)^2) < 20000 then log(string.format("NEAR id=%s name=%s d=%.0f", tostring(b:getID()), b:getName(), math.sqrt((p.x-PX)^2 + (p.z-PY)^2))) end end
local NAMES = { "Probe-A-linked", "Probe-B-plain", "Probe-C-farp" }
local function poll()
  for _, n in ipairs(NAMES) do local g = Group.getByName(n); local u = g and g:getUnit(1)
    if u then local p = u:getPoint()
      log(string.format("%s t=%.0f d=%.0f agl=%.0f inAir=%s fuel=%.3f", n, timer.getTime(), math.sqrt((p.x-PX)^2 + (p.z-PY)^2),
        p.y - land.getHeight({ x = p.x, y = p.z }), tostring(u:inAir()), u:getFuel()))
    else log(n .. " gone=1") end end
  return timer.getTime() + 15
end
local H = {}
function H:onEvent(e) local W = world.event
  local k = ({ [W.S_EVENT_LAND] = "LAND", [W.S_EVENT_TAKEOFF] = "TAKEOFF", [W.S_EVENT_CRASH] = "CRASH" })[e.id]
  if k then local ok, n = pcall(function() return e.initiator:getName() end)
    local okp, pl = pcall(function() return e.place and e.place:getName() end)
    log(string.format("EVT %s t=%.0f unit=%s place=%s", k, timer.getTime(), ok and tostring(n) or "?", okp and tostring(pl) or "?")) end end
world.addEventHandler(H)
timer.scheduleFunction(poll, nil, timer.getTime() + 2)
log("START")
`;
addTrigger(s.mission, { type: "start", comment: "PROBE logger", conditions: [], actions: [{ kind: "do_script", text: lua }] }, s.dictionary);
const saved = await saveSessionAs(s, OUT, { overwrite: true });
console.log(JSON.stringify({ out: saved.outPath ?? OUT, padId, pad }));
