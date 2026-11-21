/**
 * Text-to-speech for mission audio. Two providers:
 * - `elevenlabs`: the ElevenLabs REST API (ELEVENLABS_API_KEY; voice from the call or
 *   ELEVENLABS_VOICE_ID). Only the line's text is sent.
 * - `windows`: the voices installed in Windows (System.Speech via PowerShell). Offline.
 * Either way the result goes through FFmpeg (`convertAudio`) to the DCS format.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { convertAudio } from './convert.js';

const exec = promisify(execFile);

export const speechSchema = z.object({
  text: z.string().min(1).max(5000),
  provider: z.enum(['auto', 'elevenlabs', 'windows']).default('auto'),
  /** ElevenLabs voice id, or the name of an installed Windows voice. */
  voice: z.string().min(1).max(200).optional(),
  /** ElevenLabs model id. */
  model: z.string().min(1).max(100).default('eleven_multilingual_v2'),
}).strict();
export type SpeechInput = z.input<typeof speechSchema>;

export function speechProvider(requested: 'auto' | 'elevenlabs' | 'windows', env = process.env): 'elevenlabs' | 'windows' {
  if (requested !== 'auto') return requested;
  if (env.ELEVENLABS_API_KEY?.trim()) return 'elevenlabs';
  if (process.platform === 'win32') return 'windows';
  throw new Error('No speech provider: set ELEVENLABS_API_KEY, or run on Windows for its installed voices.');
}

async function elevenLabs(text: string, voice: string | undefined, model: string, out: string): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
  const voiceId = voice ?? process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!voiceId) throw new Error('No ElevenLabs voice: pass voice (a voice id from your ElevenLabs voice library) or set ELEVENLABS_VOICE_ID.');
  if (!/^[A-Za-z0-9]{1,64}$/.test(voiceId)) throw new Error(`'${voiceId}' is not an ElevenLabs voice id`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error('ElevenLabs returned no audio');
  await writeFile(out, bytes, { flag: 'wx' });
}

async function windowsVoice(text: string, voice: string | undefined, out: string): Promise<void> {
  if (process.platform !== 'win32') throw new Error('The windows speech provider needs Windows');
  // Text, voice and path travel in environment variables, never in the script text.
  const script = 'Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
    'if ($env:DCS_TTS_VOICE) { $s.SelectVoice($env:DCS_TTS_VOICE) }; $s.Rate = 1; ' +
    '$s.SetOutputToWaveFile($env:DCS_TTS_OUT); $s.Speak($env:DCS_TTS_TEXT); $s.Dispose()';
  await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, DCS_TTS_TEXT: text, DCS_TTS_OUT: out, DCS_TTS_VOICE: voice ?? '' },
    timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024,
  });
}

/** Speak `text` into a new DCS-ready file at `outputPath` (.ogg or .wav). */
export async function synthesizeSpeech(input: SpeechInput, outputPath: string, opts: { radioEffect?: boolean } = {}) {
  const spec = speechSchema.parse(input);
  const provider = speechProvider(spec.provider);
  const format = path.extname(outputPath).toLowerCase() === '.wav' ? 'wav' : 'ogg';
  const staging = await mkdtemp(path.join(tmpdir(), 'dcs-tts-'));
  try {
    const raw = path.join(staging, provider === 'elevenlabs' ? 'speech.mp3' : 'speech.wav');
    if (provider === 'elevenlabs') await elevenLabs(spec.text, spec.voice, spec.model, raw);
    else await windowsVoice(spec.text, spec.voice, raw);
    const converted = await convertAudio({ inputPath: raw, outputPath, format, sampleRate: 44100, channels: 1, radioEffect: opts.radioEffect ?? false });
    return { ...converted, provider };
  } finally { await rm(staging, { recursive: true, force: true }); }
}

/**
 * Can a spoken line be produced here at all? Needs a provider (ElevenLabs key, or Windows
 * with at least one installed voice) AND FFmpeg. Returns the reason when not.
 */
export async function speechAvailable(requested: 'auto' | 'elevenlabs' | 'windows' = 'auto'): Promise<{ ok: true; provider: 'elevenlabs' | 'windows' } | { ok: false; reason: string }> {
  let provider: 'elevenlabs' | 'windows';
  try { provider = speechProvider(requested); } catch (e) { return { ok: false, reason: (e as Error).message }; }
  if (provider === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY?.trim()) return { ok: false, reason: 'ELEVENLABS_API_KEY is not set' };
  try {
    await exec(process.env.DCS_FFMPEG_PATH || 'ffmpeg', ['-version'], { timeout: 15_000, windowsHide: true });
  } catch { return { ok: false, reason: 'FFmpeg was not found (install it on PATH or set DCS_FFMPEG_PATH)' }; }
  if (provider === 'windows') {
    try {
      const { stdout } = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices().Count'], { timeout: 30_000, windowsHide: true });
      if (!(Number(stdout.trim()) > 0)) return { ok: false, reason: 'Windows has no installed speech voices' };
    } catch { return { ok: false, reason: 'Windows speech (System.Speech) is not available' }; }
  }
  return { ok: true, provider };
}
