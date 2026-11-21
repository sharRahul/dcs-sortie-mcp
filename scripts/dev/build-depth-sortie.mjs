/**
 * One sortie for the features that are still unverified in DCS, built only through the
 * authoring APIs:
 *   - scripted ATC on a player flight (F10 startup -> taxi -> takeoff, AGL handoff, arrival
 *     zones), with the departure runway chosen from the surface wind (into-wind pick);
 *   - an AI helicopter cold start from a FARP, with the FARP's support group beside it;
 *   - a logger that writes [DEPTH] lines to dcs.log: ATC flags as they flip, the FARP
 *     helicopter's position/inAir every 20 s, the pad and support group's surface, and
 *     HIT/CRASH/DEAD/TAKEOFF/LAND events.
 * Needs a human for the ATC part (the F10 items must be pressed). The helicopter part runs
 * unattended once FLY is clicked.
 *
 *   npm run build && node scripts/dev/build-depth-sortie.mjs [outputPath]
 */
import path from "node:path";
import { newSession, saveSessionAs } from "../../dist/miz/sessions.js";
import { addAircraftGroup, addTrigger, addWaypoint, findGroup, setWeather } from "../../dist/miz/authoring.js";
import { addFarp } from "../../dist/miz/dressing.js";
import { addFlightAtc } from "../../dist/miz/atc.js";
import { findAirport } from "../../dist/data/reference.js";
import { claimStartAirfields } from "../../dist/miz/logistics.js";
import { asTable, luaArray } from "../../dist/miz/lua.js";

const SAVED = path.join(process.env.USERPROFILE ?? ".", "Saved Games", "DCS");
const OUT = process.argv[2] ?? path.join(SAVED, "Missions", "VS Code Missions", "dcs-mcp-depth-sortie.miz");
const s = newSession("Caucasus", 9 * 3600);
const kut = findAirport("Caucasus", "Kutaisi");

// Wind blowing TOWARD 70 deg = from 250: the into-wind pick should choose runway 25.
setWeather(s.mission, { windGroundSpeed: 6, windGroundDir: 70, temperatureCelsius: 15, qnhMmHg: 760 });

addAircraftGroup(s.mission, "plane", { side: "blue", country: "USA", name: "Viper", type: "F-16C_50", count: 2, x: 0, y: 0,
  skill: "Player", start: { kind: "parking_cold", airfield: "Kutaisi" } });
addWaypoint(s.mission, "Viper", { x: kut.x + 25000, y: kut.y + 25000, altitudeMetres: 4500, speedMps: 220 });
const land = addWaypoint(s.mission, "Viper", { x: kut.x, y: kut.y, altitudeMetres: 0, speedMps: 0, type: "Land", action: "Landing" });
asTable(asTable(asTable(findGroup(s.mission, "Viper").group.route)?.points)?.[land]).airdromeId = kut.id;
const atc = addFlightAtc(s.mission, "Viper", { callsign: "Viper 1-1", briefing: "Depth check: fly the ATC sequence from the F10 menu, a lap, and land." }, s.dictionary);

// FARP 4 km south-east of the field (inland; the logger reports its surface).
const farp = { x: kut.x - 3000, y: kut.y + 3000 };
const fr = addFarp(s.mission, { side: "blue", country: "USA", name: "FARP-Depth", x: farp.x, y: farp.y, support: true });
addAircraftGroup(s.mission, "helicopter", { side: "blue", country: "USA", name: "Hip-FARP", type: "UH-1H", count: 1, x: 0, y: 0,
  skill: "High", start: { kind: "farp_cold", farp: "FARP-Depth" } });
addWaypoint(s.mission, "Hip-FARP", { x: farp.x + 8000, y: farp.y + 8000, altitudeMetres: 300, speedMps: 50 });
claimStartAirfields(s);

const flags = Object.entries(atc.flags).map(([k, v]) => `{"${k}",${v}}`).join(",");
const support = fr.supportGroup ? `"${fr.supportGroup}"` : "nil";
const lua = String.raw`
local function log(s) env.info("[DEPTH] " .. s) end
local FLAGS = {${flags}}
local SUPPORT = ${support}
local seen = {}
local function flagWatch()
  for _, f in ipairs(FLAGS) do
    local v = trigger.misc.getUserFlag(f[2])
    if v ~= seen[f[1]] then log(string.format("FLAG t=%.0f %s=%s", timer.getTime(), f[1], tostring(v))); seen[f[1]] = v end
  end
  return timer.getTime() + 1
end
local function where(o) local p = o:getPoint(); return p, land.getSurfaceType({ x = p.x, y = p.z }) end
local pad = Airbase.getByName("FARP-Depth") or StaticObject.getByName("FARP-Depth")
if pad then local p, s = where(pad); log(string.format("PAD x=%.0f y=%.0f surface=%d", p.x, p.z, s)) else log("PAD missing=1") end
if SUPPORT then local g = Group.getByName(SUPPORT)
  if g then for _, u in ipairs(g:getUnits()) do local p, s = where(u); log(string.format("SUPPORT unit=%s type=%s surface=%d", u:getName(), u:getTypeName(), s)) end
  else log("SUPPORT group=" .. SUPPORT .. " missing=1") end end
local start
local function heli()
  local g = Group.getByName("Hip-FARP")
  local u = g and g:getUnit(1)
  if not u then log(string.format("HELI t=%.0f gone=1", timer.getTime())) return nil end
  local p = u:getPoint(); start = start or p
  log(string.format("HELI t=%.0f inAir=%s moved=%.0f agl=%.0f life=%.1f", timer.getTime(), tostring(u:inAir()),
    math.sqrt((p.x - start.x)^2 + (p.z - start.z)^2), p.y - land.getHeight({ x = p.x, y = p.z }), u:getLife()))
  return timer.getTime() + 20
end
local H = {}
function H:onEvent(e)
  local W = world.event
  local names = { [W.S_EVENT_HIT] = "HIT", [W.S_EVENT_CRASH] = "CRASH", [W.S_EVENT_DEAD] = "DEAD", [W.S_EVENT_TAKEOFF] = "TAKEOFF",
    [W.S_EVENT_LAND] = "LAND", [W.S_EVENT_ENGINE_STARTUP] = "ENGINE_STARTUP", [W.S_EVENT_BIRTH] = "BIRTH" }
  if names[e.id] then
    local ok, n = pcall(function() return e.initiator and e.initiator:getName() end)
    log(string.format("EVT %s t=%.0f unit=%s", names[e.id], timer.getTime(), ok and tostring(n) or "?"))
  end
end
world.addEventHandler(H)
timer.scheduleFunction(flagWatch, nil, timer.getTime() + 1)
timer.scheduleFunction(heli, nil, timer.getTime() + 2)
log("START runway=${atc.departure?.runway ?? "?"} silenced=${atc.silenced.join("+")}")
`;
addTrigger(s.mission, { type: "start", comment: "DEPTH logger", conditions: [], actions: [{ kind: "do_script", text: lua }] }, s.dictionary);

const saved = await saveSessionAs(s, OUT, { overwrite: true });
console.log(JSON.stringify({ out: saved.outPath ?? OUT, departureRunway: atc.departure?.runway, arrival: atc.arrival, silenced: atc.silenced,
  atcTriggers: atc.triggers.length, farpSupport: fr.supportGroup ?? null, notes: atc.notes }, null, 2));
