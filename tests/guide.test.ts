import { test } from "node:test";
import assert from "node:assert/strict";
import { CONVENTIONS_GUIDE, SERVER_INSTRUCTIONS } from "../src/guide.js";

test("server instructions stay short enough that clients do not truncate them", () => {
  // Claude Code cut the old 11.5k-character instructions at about 4k; keep a margin.
  assert.ok(SERVER_INSTRUCTIONS.length <= 2500, `SERVER_INSTRUCTIONS is ${SERVER_INSTRUCTIONS.length} characters`);
  assert.match(SERVER_INSTRUCTIONS.slice(0, 300), /dcs:\/\/guide\/conventions/);
  for (const rule of [/NORTH/, /DEGREES/, /2 aircraft/, /DCS's own ATC is kept/, /17%/]) assert.match(SERVER_INSTRUCTIONS, rule);
});

test("the conventions resource carries the full rules the instructions point to", () => {
  for (const rule of [/PLAYER_TYPE_NOT_FLYABLE/, /MOD_NOT_DEPLOYED/, /Disembarking/, /KEEPS DCS's own ATC/]) assert.match(CONVENTIONS_GUIDE, rule);
});
