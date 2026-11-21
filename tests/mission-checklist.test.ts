import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guide = readFileSync(new URL("../skills/dcs-mission-production/references/mission-content.md", import.meta.url), "utf8");
const tools = Object.keys(JSON.parse(readFileSync(new URL("./fixtures/mcp-schema-sha256.json", import.meta.url), "utf8")));

test("every tool the mission checklist names is a registered tool", () => {
  const named = [...new Set(guide.match(/\bdcs_[a-z0-9_]+/g) ?? [])];
  assert.ok(named.length > 40, `only ${named.length} tools named`);
  const unknown = named.filter(n => !tools.includes(n));
  assert.deepEqual(unknown, [], `checklist names tools that do not exist: ${unknown.join(", ")}`);
});
