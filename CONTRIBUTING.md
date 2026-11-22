# Contributing to DCS Sortie MCP

Thanks for helping. This project writes files that DCS World and its Mission Editor
must open, so it is strict about evidence: nothing is guessed, and nothing is called
"verified" until it has been seen working in DCS.

Security problems: please do **not** open an issue — follow [SECURITY.md](SECURITY.md).

## Setup

Requirements: Node.js 20 or newer (CI runs 20, 22 and 24 on Windows) and Git. DCS World
is only needed for live tests.

```powershell
git clone https://github.com/sharRahul/dcs-sortie-mcp.git
cd dcs-sortie-mcp
npm ci
npm run check   # type-check
npm run build   # compile to dist/
npm test        # full test suite
```

Optional, for the tests that load Lua under DCS's own interpreter (hook loading, the
editor's `fixUnitsPos`, trigger runtime):

```powershell
$env:DCS_LUA = "<DCS install>\bin-mt\luae.exe"; npm test
```

Without `DCS_LUA` those tests are skipped, not failed. `LUA51` (a stock Lua 5.1) runs
the mocked compatibility checks the same way CI does. `DCS_NATIVE_MIZ_DIR=<folder>`
runs the native-fixture and validator checks over your own Mission-Editor-saved missions.

## Project layout

| Path | What lives there |
| --- | --- |
| `src/miz/` | `.miz` handling: safe archive read/pack, data-only Lua parser and serializer, mission model, authoring and editing, trigger compiler, resources, frameworks, sessions, validator |
| `src/tools/` | MCP tool registrations; `src/guide.ts` is the text MCP clients see |
| `src/data/` + `data/*.json` | Reference data (countries, unit types, theatres, airfields) generated from pinned sources |
| `src/dcs/` | Reading the DCS install: hook installer, mods, payloads, liveries, CoreMods, Claude Desktop installer |
| `src/bridge/` | TCP client for the live hook |
| `src/security/` | Archive policy, atomic writes, transport and input budgets |
| `runtime/dcs/` | The live-control hook (Lua 5.1, runs inside DCS) and telemetry script |
| `scripts/` | Data generators, builders, verifiers and dev tools (see `scripts/README.md`) |
| `tests/` | `node:test` suites and fixtures |

[CLAUDE.md](CLAUDE.md) holds the detailed engineering notes and the evidence behind
each convention; read the section for the area you are changing.

## Ground rules

- **Round-trip every authoring change.** Serialize, re-parse and assert, with a test.
- **Never execute mission Lua.** Parse it as data (`src/miz/lua.ts`) or scan it as text.
  Raw Lua stays doubly gated (`DCS_ALLOW_RAW_LUA=1` plus `ALLOW_EXEC` in the hook).
- **Never overwrite a source `.miz`.** Saves write a new file.
- **No guessed data.** Unit types, task ids, predicate signatures, frequencies, fuel,
  layouts: each needs a source (pydcs, ED's own files, an editor-saved mission, the
  live sim). If there is none, refuse or report it as unknown.
- **Never hand-edit `data/*.json`.** Change the generator under `scripts/data/` and
  regenerate; every data file is registered in `src/data/provenance.ts` with pinned
  inputs.
- **Be honest about verification.** Offline tests are not a DCS flight. Say what still
  needs the Mission Editor or a sortie.
- **Versions are PATCH bumps only (0.1.x)** until ATC lands; change `package.json`,
  `server.json` and `package-lock.json` together.

### Tool schema changes

Published tool schemas are pinned in `tests/fixtures/mcp-schema-sha256.json`. After a
deliberate change, run:

```powershell
node --import tsx scripts/dev/update-schema-fixture.mjs
```

and review the `+` / `~` / `-` list it prints in your PR. Keep inputs `.strict()` and give
new tools `readOnlyHint` / `destructiveHint` annotations. Prefer deepening an existing
tool over adding a new one.

### Triggers

Predicate Lua is captured from the Mission Editor, never invented. To add a predicate:
add it to the oracle's supported set, regenerate `tests/fixtures/trig-oracle.json` with
`tests/build-trig-oracle.ts` over editor-saved missions, confirm a record appears, then
write the builder and compiler. No oracle record, no predicate.

### Live acceptance

[docs/testing/live-acceptance/acceptance-matrix.md](docs/testing/live-acceptance/acceptance-matrix.md)
is the current live status of each feature (PASS / PARTIAL / OPEN / SUPERSEDED), each
row citing `docs/development/verification.md`. If you fly something, update the matrix
and add the evidence to `verification.md`. Never promote a status on reasoning alone.

## Commits and pull requests

- Branch from `main`; keep a PR to one topic.
- `npm run check`, `npm run build` and `npm test` must pass (CI also runs a dependency
  audit, a Lua 5.1 job and a data-regeneration job).
- Write commit messages that say what changed and why, in plain language.
- In the PR description, list what you tested offline, what you tested in DCS (version,
  map), and what is still unverified.
- Do not commit missions, mods or files you do not have the right to share, and do not
  commit secrets.

## Releases

Releases are GitHub-only (no npm registry) and are cut by the maintainer through a
controlled draft-release process: [docs/development/releasing.md](docs/development/releasing.md).

## Licence

By contributing you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE).
