/**
 * What editor-saved missions put on and around airfields: every static and ground vehicle
 * within `RADIUS_M` of a bundled airfield's reference point, tallied by type and category,
 * with each object's distance to the nearest parking slot (on a slot vs. beside the apron).
 *
 *   node --import tsx scripts/dev/sweep-base-dressing.ts "<missions folder>" ["<more>" ...]
 *
 * Read-only. Prints a summary and writes JSON to the path in DRESSING_OUT if set.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readMizArchive } from '../../src/miz/archive.js';
import { asTable, luaArray, parseLuaAssignment, type LuaTable } from '../../src/miz/lua.js';
import { findUnitType, resolveTheatreName, theatreAirports } from '../../src/data/reference.js';

const RADIUS_M = 3000;
const files: string[] = [];
const walk = (d: string) => {
  try {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!/vs code|opencode|my mission/i.test(e.name)) walk(p); }
      else if (e.name.toLowerCase().endsWith('.miz')) files.push(p);
    }
  } catch { /* unreadable */ }
};
process.argv.slice(2).forEach(walk);

interface Tally { count: number; missions: Set<string>; airfields: Set<string>; category: string; onSlot: number; nearSlot: number; off: number }
const types = new Map<string, Tally>();
const perAirfield: number[] = [];
let read = 0, dressed = 0;

for (const f of files) {
  let m: LuaTable;
  try {
    const a = await readMizArchive(f); const t = a.entries.get('mission'); if (!t) continue;
    m = parseLuaAssignment(t, 'mission') as LuaTable;
  } catch { continue; }
  read++;
  const theatre = resolveTheatreName(String(m.theatre ?? '')); if (!theatre) continue;
  let airports; try { airports = theatreAirports(theatre); } catch { continue; }
  const objs: { type: string; cat: string; x: number; y: number }[] = [];
  for (const side of Object.values(asTable(m.coalition) ?? {})) for (const c of luaArray(asTable(asTable(side)?.country))) {
    for (const [cat, key] of [['static', 'static'], ['vehicle', 'vehicle']] as const) for (const g of luaArray(asTable(asTable(c[key])?.group))) {
      for (const u of luaArray(asTable(g.units))) {
        const x = Number(u.x), y = Number(u.y);
        if (Number.isFinite(x) && Number.isFinite(y)) objs.push({ type: String(u.type), cat: cat === 'static' ? String(u.category ?? 'static') : 'vehicle', x, y });
      }
    }
  }
  for (const ap of airports.airports as unknown as { name: string; x: number; y: number; slots: [unknown, unknown, number, number][] }[]) {
    const near = objs.filter(o => Math.hypot(o.x - ap.x, o.y - ap.y) < RADIUS_M);
    if (near.length < 5) continue;
    dressed++; perAirfield.push(near.length);
    for (const o of near) {
      const k = types.get(o.type) ?? { count: 0, missions: new Set(), airfields: new Set(), category: findUnitType(o.type)?.category ?? o.cat, onSlot: 0, nearSlot: 0, off: 0 };
      k.count++; k.missions.add(f); k.airfields.add(`${theatre}/${ap.name}`);
      const d = Math.min(Infinity, ...ap.slots.map(s => Math.hypot(Number(s[2]) - o.x, Number(s[3]) - o.y)));
      if (d < 8) k.onSlot++; else if (d < 120) k.nearSlot++; else k.off++;
      types.set(o.type, k);
    }
  }
}

perAirfield.sort((a, b) => a - b);
const median = perAirfield[Math.floor(perAirfield.length / 2)] ?? 0;
console.log(`missions=${files.length} read=${read} dressedAirfieldInstances=${dressed} medianObjects=${median}`);
const rows = [...types].filter(([, t]) => t.missions.size >= 3).sort((a, b) => b[1].missions.size - a[1].missions.size);
const byCat = new Map<string, typeof rows>();
for (const r of rows) { const c = r[1].category; byCat.set(c, [...(byCat.get(c) ?? []), r]); }
for (const [cat, rs] of byCat) {
  console.log(`\n${cat}:`);
  for (const [type, t] of rs.slice(0, 25)) console.log(`  ${type.padEnd(32)} missions=${t.missions.size} airfields=${t.airfields.size} n=${t.count} onSlot=${t.onSlot} apron<120m=${t.nearSlot} beyond=${t.off}`);
}
if (process.env.DRESSING_OUT) writeFileSync(process.env.DRESSING_OUT, JSON.stringify(rows.map(([type, t]) => ({ type, category: t.category,
  missions: t.missions.size, airfields: t.airfields.size, count: t.count, onSlot: t.onSlot, nearSlot: t.nearSlot, beyond: t.off })), null, 1));
