/**
 * Two checks that need no piloting:
 *   1. FARP rearm/refuel: an AI UH-1H cold-starts at a FARP with 25% fuel and half gun ammo,
 *      flies a short loop and lands back on the pad (Land waypoint linked to the pad, as pydcs
 *      flight_group_from_unit links starts). [REARM] lines log fuel and ammo every 15 s, so a
 *      rise while it sits beside the support group is the answer.
 *   2. ATC silent mode vs AI: Senaki-Kolkhi is silenced at mission start; an AI F-16 2-ship
 *      hot-starts there and departs. Whether the tower still talks to it can only be heard,
 *      so the player slot (cold, Senaki) is for a listener tuned to Senaki tower.
 *
 *   npm run build && node scripts/dev/build-rearm-check.mjs [outputPath]
 */
import path from "node:path";
import { newSession, saveSessionAs } from "../../dist/miz/sessions.js";
import { addAircraftGroup, addTrigger, addWaypoint, findGroup, findUnit, setPayload, setWeather } from "../../dist/miz/authoring.js";
import { addFarp } from "../../dist/miz/dressing.js";
import { findAirport, findUnitType } from "../../dist/data/reference.js";
import { claimStartAirfields } from "../../dist/miz/logistics.js";
import { airfieldRadio } from "../../dist/data/airfield-radio.js";
import { asTable, luaArray } from "../../dist/miz/lua.js";

const SAVED = path.join(process.env.USERPROFILE ?? ".", "Saved Games", "DCS");
const OUT = process.argv[2] ?? path.join(SAVED, "Missions", "VS Code Missions", "dcs-mcp-rearm-check.miz");
const s = newSession("Caucasus", 9 * 3600);
const kut = findAirport("Caucasus", "Kutaisi");
const sen = findAirport("Caucasus", "Senaki-Kolkhi");
setWeather(s.mission, { windGroundSpeed: 3, windGroundDir: 70, temperatureCelsius: 15, qnhMmHg: 760 });

// --- 1. FARP rearm ---
const farp = { x: kut.x - 3000, y: kut.y + 3000 };
const fr = addFarp(s.mission, { side: "blue", country: "USA", name: "FARP-Rearm", x: farp.x, y: farp.y, support: true });
addAircraftGroup(s.mission, "helicopter", { side: "blue", country: "USA", name: "Huey-Rearm", type: "UH-1H", count: 1, x: 0, y: 0,
  skill: "High", start: { kind: "farp_cold", farp: "FARP-Rearm" } });
const heliUnit = String(luaArray(asTable(findGroup(s.mission, "Huey-Rearm").group.units))[0].name);
const fuelMax = findUnitType("UH-1H")?.fuelMax ?? 631;
setPayload(s.mission, heliUnit, { fuel: Math.round(fuelMax * 0.25), gun: 50 });
addWaypoint(s.mission, "Huey-Rearm", { x: farp.x + 4000, y: farp.y + 4000, altitudeMetres: 200, speedMps: 45 });
const landIdx = addWaypoint(s.mission, "Huey-Rearm", { x: farp.x, y: farp.y, altitudeMetres: 0, speedMps: 0, type: "Land", action: "Landing" });
const pts = asTable(asTable(findGroup(s.mission, "Huey-Rearm").group.route)?.points);
const padId = asTable(pts?.[1])?.linkUnit;
Object.assign(asTable(pts?.[landIdx]), { linkUnit: padId, helipadId: padId });

// --- 2. ATC silent mode vs AI traffic ---
addAircraftGroup(s.mission, "plane", { side: "blue", country: "USA", name: "AI-Senaki", type: "F-16C_50", count: 2, x: 0, y: 0,
  skill: "High", start: { kind: "parking_hot", airfield: "Senaki-Kolkhi" } });
addWaypoint(s.mission, "AI-Senaki", { x: sen.x + 30000, y: sen.y + 10000, altitudeMetres: 3000, speedMps: 200 });
addAircraftGroup(s.mission, "plane", { side: "blue", country: "USA", name: "Listener", type: "F-16C_50", count: 1, x: 0, y: 0,
  skill: "Player", start: { kind: "parking_cold", airfield: "Senaki-Kolkhi" } });
addTrigger(s.mission, { type: "start", comment: "Silence Senaki", conditions: [],
  actions: [{ kind: "set_atc_silent_mode", airdromeId: sen.id, silent: true }] }, s.dictionary);
claimStartAirfields(s);

const lua = String.raw`
local function log(s) env.info("[REARM] " .. s) end
local landed
local function ammo(u) local n = 0; for _, a in ipairs(u:getAmmo() or {}) do n = n + (a.count or 0) end; return n end
local function poll()
  local g = Group.getByName("Huey-Rearm"); local u = g and g:getUnit(1)
  if not u then log(string.format("t=%.0f gone=1", timer.getTime())) return nil end
  local p = u:getPoint()
  log(string.format("t=%.0f inAir=%s fuel=%.3f ammo=%d agl=%.0f life=%.1f", timer.getTime(), tostring(u:inAir()), u:getFuel(), ammo(u),
    p.y - land.getHeight({ x = p.x, y = p.z }), u:getLife()))
  return timer.getTime() + 15
end
local H = {}
function H:onEvent(e)
  local W = world.event
  local names = { [W.S_EVENT_TAKEOFF] = "TAKEOFF", [W.S_EVENT_LAND] = "LAND", [W.S_EVENT_ENGINE_STARTUP] = "ENGINE_STARTUP",
    [W.S_EVENT_CRASH] = "CRASH", [W.S_EVENT_HIT] = "HIT", [W.S_EVENT_RUNWAY_TAKEOFF] = "RUNWAY_TAKEOFF" }
  if names[e.id] then
    local ok, n = pcall(function() return e.initiator and e.initiator:getName() end)
    log(string.format("EVT %s t=%.0f unit=%s", names[e.id], timer.getTime(), ok and tostring(n) or "?"))
  end
end
world.addEventHandler(H)
timer.scheduleFunction(poll, nil, timer.getTime() + 2)
log("START")
`;
addTrigger(s.mission, { type: "start", comment: "REARM logger", conditions: [], actions: [{ kind: "do_script", text: lua }] }, s.dictionary);

const saved = await saveSessionAs(s, OUT, { overwrite: true });
let tower; try { tower = airfieldRadio("Caucasus", "Senaki-Kolkhi"); } catch { tower = null; }
console.log(JSON.stringify({ out: saved.outPath ?? OUT, heliUnit, padId, farpSupport: fr.supportGroup ?? null, senakiId: sen.id, tower }, null, 2));
