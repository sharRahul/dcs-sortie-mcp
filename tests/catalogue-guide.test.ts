import { test } from "node:test";
import assert from "node:assert/strict";
import { readGuide } from "../src/tools/catalogue.js";

test("guide=archetypes lists every recipe and returns one by topic", async () => {
  const all = await readGuide("archetypes");
  assert.equal(all.sections.length, 14);
  assert.match(all.text, /^# Mission archetypes/);
  const fulda = await readGuide("archetypes", "fulda gap");
  assert.match(fulda.text, /^### 2\. Cold War breakthrough \(Fulda Gap\)/);
  assert.doesNotMatch(fulda.text, /### 3\./);
  const farp = await readGuide("archetypes", "helicopter");
  assert.match(farp.text, /^### 11\./);
  await assert.rejects(readGuide("archetypes", "submarine warfare"), /No archetypes section matches/);
});

test("guide=checklist returns the build-order checklist", async () => {
  const c = await readGuide("checklist");
  assert.ok(c.text.length > 500);
});

test("guide=scenario lists the examples and returns one full spec that validates", async () => {
  const all = await readGuide("scenario");
  assert.ok(all.sections.includes("cas-a10c.json"));
  assert.match(all.text, /Scenario examples/);
  const one = await readGuide("scenario", "cas-a10c");
  const spec = JSON.parse(one.text);
  const { generateScenario } = await import("../src/scenario/engine.js");
  const { closeSession } = await import("../src/miz/sessions.js");
  const built = generateScenario(spec);
  closeSession(built.session.id);
  await assert.rejects(readGuide("scenario", "no such mission"), /No scenario example matches/);
});
