import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, appendFile, readFile, rm, open, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { parseLog, findProblems } from '../src/dcs/log.js';

// Run the real CLI body with a fake bridge, real log files, and no background timer.
async function monitor(t: { after: (fn: () => Promise<void>) => void }) {
  const dir = await mkdtemp(path.join(tmpdir(), 'dcs-monitor-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const logPath = path.join(dir, 'dcs.log');
  await writeFile(logPath, '');
  let status: any = { ok: true, data: { phase: 'running', mission: 'Same title', missionFilename: 'C:/a.miz', missionGeneration: 1 } };
  class Socket {
    handlers: Record<string, (...args: any[]) => void> = {};
    on(event: string, fn: (...args: any[]) => void) { this.handlers[event] = fn; return this; }
    connect(_port: number, _host: string, ready: () => void) { ready(); }
    write() { queueMicrotask(() => this.handlers.data(Buffer.from(JSON.stringify(status) + '\n'))); }
    destroy() {}
  }
  const source = readFileSync('scripts/dev/monitor-flight.mjs', 'utf8').replace(/^import .*;\r?$/gm, '');
  const result = await vm.runInNewContext(`(async () => { ${source}\n return { poll, state }; })()`, {
    open, stat, writeFile, appendFile, mkdir, path, net: { Socket }, parseLog, findProblems,
    defaultLogPath: () => logPath, process: { argv: ['node', 'monitor', dir, '1'], cwd: () => dir },
    Buffer, console: { log() {}, error() {} }, setTimeout, clearTimeout, setInterval: () => 0,
  });
  return { ...result, setStatus: (value: any) => { status = value; },
    add: (line: string) => appendFile(logPath, `2026-11-26 17:00:00.000 ${line}\n`),
    records: async () => (await readFile(path.join(dir, 'events.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line)),
  };
}

test('monitor includes framework and telemetry failures in the error digest with their details', async t => {
  const m = await monitor(t);
  await m.add('ERROR SCRIPTING: [DCSMCP] FRAMEWORK name=MIST loaded=0 expected=1\nstack traceback:\n  mission.lua:12: in function');
  await m.add('ERROR SCRIPTING: [DCSMCP] ERROR reason=observer_failed');
  await m.poll();
  assert.equal(m.state.errors.length, 2);
  assert.match(m.state.errors[0].message, /name=MIST/);
  assert.match(m.state.errors[0].detail.join('\n'), /mission.lua:12/);
  assert.equal(m.state.frameworks.MIST.loaded, false);
});

test('monitor stops on a mission change even when both phases are running', async t => {
  const m = await monitor(t);
  await m.add('INFO SCRIPTING: [DCSMCP] TRIG name=old');
  await m.poll();
  m.setStatus({ ok: true, data: { phase: 'running', mission: 'Other', missionFilename: 'C:/b.miz', missionGeneration: 2 } });
  await m.add('INFO SCRIPTING: [DCSMCP] TRIG name=new');
  await m.poll();
  assert.equal(m.state.status, 'mission_changed');
  assert.equal(m.state.triggers.length, 1);
  assert.equal(m.state.triggers[0].name, 'old');
  assert.ok((await m.records()).some((r: any) => r.kind === 'MISSION_CHANGED'));
  await m.poll();
  assert.equal(m.state.triggers.length, 1);
});

test('monitor detects a restart of the same file and title by generation', async t => {
  const m = await monitor(t);
  m.setStatus({ ok: true, data: { phase: 'running', mission: 'Same title', missionFilename: 'C:/a.miz', missionGeneration: 2 } });
  await m.poll();
  assert.equal(m.state.status, 'mission_changed');
});

test('monitor detects a new simulator process even when its generation and mission match', async t => {
  const m = await monitor(t);
  m.setStatus({ ok: true, data: { phase: 'running', mission: 'Same title', missionFilename: 'C:/a.miz', missionGeneration: 1, bridgeSession: 'new-process' } });
  await m.poll();
  assert.equal(m.state.status, 'mission_changed');
});

test('monitor preserves disconnected log batches without attributing them to the last mission', async t => {
  const m = await monitor(t);
  m.setStatus({ ok: false, error: 'connection refused' });
  await m.add('INFO SCRIPTING: [DCSMCP] TRIG name=uncertain');
  await m.poll();
  assert.equal(m.state.triggers.length, 0);
  assert.equal(m.state.bridge.drops, 1);
  assert.ok((await m.records()).some((r: any) => r.kind === 'UNCORRELATED_LOG' && r.text.includes('name=uncertain')));
});
