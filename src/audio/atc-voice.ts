/**
 * Scripted ATC with generated voices: dry-run the script on a copy to learn every line,
 * speak each one (ElevenLabs or Windows voices, through FFmpeg), embed the files, then
 * write the script for real with those resource keys. Steps the caller already gave a
 * resource key for are not regenerated. When no voice can be produced (no ElevenLabs key or
 * Windows voices, or no FFmpeg) - up front or part-way - the scripted exchanges are NOT
 * written: the flight keeps DCS's own ATC and only the briefing is added (`exchanges: false`).
 * `voice: false` is the caller's explicit choice of text-only scripted ATC and is honoured.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { z } from 'zod';
import { addFlightAtc, atcSchema, type AtcAudioStep, type AtcResult } from '../miz/atc.js';
import { addResource } from '../miz/resources.js';
import type { LuaTable } from '../miz/lua.js';
import { speechAvailable, synthesizeSpeech } from './speech.js';

interface Store { mission: LuaTable; dictionary: LuaTable; mapResource: LuaTable; files: Map<string, Buffer> }

function role(step: AtcAudioStep): 'briefing' | 'pilot' | 'awacs' | 'controller' {
  if (step === 'briefing') return 'briefing';
  if (step === 'awacsReply') return 'awacs';
  return /Request$|Call$|CheckIn$|clearOfRunway/.test(step) ? 'pilot' : 'controller';
}

/** Text as it should be spoken: no speaker prefix, no heading line. */
function spoken(step: AtcAudioStep, text: string): string {
  return step === 'briefing' ? text.replace(/^MISSION BRIEFING\n/, 'Mission briefing. ') : text.replace(/^[^:]{1,60}:\s*/, '');
}

export async function writeFlightAtc(s: Store, group: string, input: z.input<typeof atcSchema>): Promise<AtcResult> {
  const spec = atcSchema.parse(input);
  if (spec.voice === false) return addFlightAtc(s.mission, group, spec, s.dictionary);
  const voice = spec.voice;
  if (!spec.exchanges) return addFlightAtc(s.mission, group, spec, s.dictionary);
  const can = await speechAvailable(voice.provider);
  if (!can.ok) return dcsAtc(s, group, spec, `No voice can be produced (${can.reason})`);
  const added: string[] = [];
  const dry = addFlightAtc(structuredClone(s.mission), group, spec, structuredClone(s.dictionary));
  const audio: Partial<Record<AtcAudioStep, string>> = { ...spec.audio };
  const notes: string[] = [];
  const dir = await mkdtemp(path.join(tmpdir(), 'dcs-atc-voice-'));
  const safe = group.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'flight';
  let provider = '';
  try {
    for (const [step, text] of Object.entries(dry.lines) as [AtcAudioStep, string][]) {
      if (audio[step]) continue;
      const r = role(step), file = `atc_${safe}_${step}.ogg`;
      const out = path.join(dir, file);
      const made = await synthesizeSpeech({ text: spoken(step, text), provider: voice.provider, ...(voice[r] ? { voice: voice[r] } : {}) }, out,
        { radioEffect: voice.radioEffect && r !== 'briefing' });
      provider = made.provider;
      const res = addResource(s, file, await readFile(out));
      if (!res.reused) added.push(res.key);
      audio[step] = res.key;
    }
  } catch (e) {
    for (const key of added) { const f = String(s.mapResource[key]); delete s.mapResource[key]; s.files.delete(f); }
    return dcsAtc(s, group, spec, `Voice generation failed (${(e as Error).message})`);
  } finally { await rm(dir, { recursive: true, force: true }); }
  const result = addFlightAtc(s.mission, group, { ...spec, audio }, s.dictionary);
  if (provider) notes.push(`Spoken lines generated with ${provider === 'elevenlabs' ? 'ElevenLabs' : 'Windows installed voices'} and embedded as OGG.`);
  result.notes.unshift(...notes);
  return result;
}

function dcsAtc(s: Store, group: string, spec: z.output<typeof atcSchema>, why: string): AtcResult {
  const r = addFlightAtc(s.mission, group, { ...spec, exchanges: false }, s.dictionary);
  r.notes.unshift(`${why}: kept DCS's own ATC for '${group}' and wrote the briefing as text only.`);
  return r;
}
