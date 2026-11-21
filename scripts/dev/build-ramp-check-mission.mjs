/**
 * Live check of airfield dressing, no pilot needed. Dresses Kutaisi and Senaki-Kolkhi
 * with populateAirfield (default occupancy + support kits), parks AI hot-start flights
 * that have to taxi past the kits, and embeds a start script that logs to dcs.log:
 *   [RAMPCHK] OBJ   name=.. scenery=<n> nearest=<type>@<m> surface=<n>   (per kit object; scenery = hangars,
 *                                                                          buildings DCS models within 15 m)
 *   [RAMPCHK] EVT   <event> unit=.. target=..                              (HIT/CRASH/DEAD/TAKEOFF/collision)
 *   [RAMPCHK] AI    group=.. airborne=a/n moved=<m> ...                    (every 30 s)
 *   [RAMPCHK] DONE
 * Surface: 1 LAND, 2 SHALLOW_WATER, 3 WATER, 4 ROAD, 5 RUNWAY (DCS reports taxiway/apron concrete as RUNWAY too).
 *
 *   node scripts/dev/build-ramp-check-mission.mjs [outputPath]
 */
import path from "node:path";
import { newSession, saveSessionAs } from "../../dist/miz/sessions.js";
import { addAircraftGroup, addTrigger, addWaypoint, findGroup } from "../../dist/miz/authoring.js";
import { populateAirfield } from "../../dist/miz/dressing.js";
import { findAirport } from "../../dist/data/reference.js";
import { claimStartAirfields } from "../../dist/miz/logistics.js";
import { asTable, luaArray } from "../../dist/miz/lua.js";

const SAVED = path.join(process.env.USERPROFILE, "Saved Games", "DCS");
const OUT = process.argv[2] ?? path.join(SAVED, "Missions", "VS Code Missions", "dcs-mcp-ramp-check.miz");
const s = newSession("Caucasus", 10 * 3600);
const kit = [];
const aiGroups = [];

for (const [af, n] of [["Kutaisi", "KUT"], ["Senaki-Kolkhi", "SEN"]]) {
  const ap = findAirport("Caucasus", af);
  for (const [k, type] of [[1, "F-16C_50"], [2, "A-10C"]]) {
    const name = `${n}-AI-${k}`;
    addAircraftGroup(s.mission, "plane", { side: "blue", country: "USA", name, type, count: 2, x: 0, y: 0, skill: "High",
      start: { kind: "parking_hot", airfield: af } });
    addWaypoint(s.mission, name, { x: ap.x + 30000, y: ap.y + 30000 * k, altitudeMetres: 3000, speedMps: 200 });
    aiGroups.push(name);
  }
  const r = populateAirfield(s.mission, { side: "blue", country: "USA", airfield: af, types: ["F-16C_50", "C-130", "A-10C"], namePrefix: `${n}-Park` });
  kit.push(...r.support.map(x => x.name), ...r.placed.map(x => x.name));
  console.log(`${af}: parked ${r.placed.length}, support ${r.support.length}, skipped ${r.supportSkipped}`);
}
claimStartAirfields(s);

const lua = String.raw`
local KIT = {${kit.map(k => `"${k}"`).join(",")}}
local AI = {${aiGroups.map(g => `"${g}"`).join(",")}}
local function log(s) env.info("[RAMPCHK] " .. s) end
for _, n in ipairs(KIT) do
  local o = StaticObject.getByName(n)
  if not o then log("OBJ name=" .. n .. " missing=1") else
    local p = o:getPoint(); local cnt, best, bestd = 0, "-", 1e9
    pcall(world.searchObjects, Object.Category.SCENERY, { id = world.VolumeType.SPHERE, params = { point = p, radius = 15 } }, function(s)
      cnt = cnt + 1; local q = s:getPoint(); local d = math.sqrt((q.x - p.x)^2 + (q.z - p.z)^2)
      if d < bestd then bestd = d; best = (s:getTypeName() or "?") end; return true end)
    log(string.format("OBJ name=%s type=%s scenery=%d nearest=%s@%.1f surface=%d", n, o:getTypeName(), cnt, best, bestd < 1e8 and bestd or -1, land.getSurfaceType({ x = p.x, y = p.z })))
  end
end
local H = {}
function H:onEvent(e)
  local function nm(o) local ok, v = pcall(function() return o and (o.getName and o:getName()) end); return ok and v or "?" end
  local W = world.event
  local names = { [W.S_EVENT_HIT] = "HIT", [W.S_EVENT_CRASH] = "CRASH", [W.S_EVENT_DEAD] = "DEAD", [W.S_EVENT_TAKEOFF] = "TAKEOFF", [W.S_EVENT_RUNWAY_TAKEOFF or -1] = "RUNWAY_TAKEOFF", [W.S_EVENT_UNIT_LOST or -2] = "LOST" }
  if names[e.id] then log(string.format("EVT %s t=%.0f unit=%s target=%s", names[e.id], timer.getTime(), nm(e.initiator), nm(e.target))) end
end
world.addEventHandler(H)
local start = {}
local function sample()
  for _, gname in ipairs(AI) do
    local g = Group.getByName(gname)
    if g then for _, u in ipairs(g:getUnits()) do
      local p = u:getPoint(); start[u:getName()] = start[u:getName()] or p
      local s0 = start[u:getName()]
      log(string.format("AI t=%.0f unit=%s inAir=%s moved=%.0f life=%.1f", timer.getTime(), u:getName(), tostring(u:inAir()), math.sqrt((p.x - s0.x)^2 + (p.z - s0.z)^2), u:getLife()))
    end else log("AI group=" .. gname .. " gone") end
  end
  return timer.getTime() + 30
end
timer.scheduleFunction(sample, nil, timer.getTime() + 1)
timer.scheduleFunction(function() log("DONE t=" .. timer.getTime()) end, nil, timer.getTime() + 600)
log("START kit=" .. #KIT .. " ai=" .. #AI)
`;
addTrigger(s.mission, { type: "start", comment: "RAMPCHK", conditions: [], actions: [{ kind: "do_script", text: lua }] }, s.dictionary);
const saved = await saveSessionAs(s, OUT, { overwrite: true });
console.log(`kit objects ${kit.length}; saved ${saved.outPath ?? OUT}`);
