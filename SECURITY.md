# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately** through GitHub's private vulnerability
reporting: open the [Security tab of sharRahul/dcs-sortie-mcp](https://github.com/sharRahul/dcs-sortie-mcp/security)
and choose **Report a vulnerability** (Security Advisories). Do not open a public
issue, discussion or pull request for an unfixed vulnerability.

Include the version (`dcs-sortie-mcp --version`), the MCP client you use, what an
attacker controls (a `.miz` file, tool arguments, a local process, ...), steps or a
minimal file to reproduce, and the impact you observed. Reports are handled on a
best-effort basis by a volunteer maintainer; you will get an acknowledgement in the
advisory thread, and fixes ship as a patch release with credit if you want it.

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x (latest: 0.1.1) | Yes |
| anything older | No |

Only the latest 0.1.x release receives fixes. Releases are published on
[GitHub Releases](https://github.com/sharRahul/dcs-sortie-mcp/releases) only.

## What this server is

DCS Sortie MCP is a **local** MCP server started by your MCP client over **stdio**.
It reads and writes DCS mission files (`.miz`) offline and, optionally, talks to a
running DCS World through a Lua hook you install yourself. It runs as your user,
with your filesystem permissions. It is not a hosted service.

## Threat model

Inputs treated as **untrusted**:

- `.miz` files and other mission/campaign files, including ones downloaded from the
  internet (crafted ZIPs, hostile Lua, oversized or deeply nested data).
- Tool arguments produced by a language model, which may be steered by prompt
  injection from content the model has read.
- Mod, payload, livery and terrain Lua under the DCS install and Saved Games folders.

Trusted: the user running the client, the MCP client itself, the DCS install, and
the files the user deliberately configures (environment variables, the installed hook).

Out of scope: a malicious MCP client or host, malware already running as the user,
and the behaviour of DCS World itself or of third-party Lua frameworks once DCS runs
them.

## Security measures

Every measure below is in the code today; the file named is where to check it.

### No code execution from data

- **Mission Lua is parsed, never executed.** `src/miz/lua.ts` is a data-only parser
  that evaluates literals only. Keys such as `__proto__` are created as own data
  properties, so a mission cannot reach an object prototype
  (`tests/release-hardening.test.ts`).
- **Mod, payload, livery, terrain and campaign Lua is read as text** and scanned with
  patterns (`src/dcs/mods.ts`, `payloads.ts`, `coremods.ts`, `terrain-files.ts`,
  `campaign.ts`). Payload files go through `parseLuaDataFile`, whose only accepted bare
  identifiers are pydcs main-task names.
- **Raw-path edits are guarded.** `src/miz/raw.ts` refuses `__proto__`, `constructor`
  and `prototype` in paths and in written object keys, reads own properties only, and
  rolls back any write that does not serialize and re-parse.
- User-supplied Lua for triggers is syntax-checked, never run by the server.

### Mission archives

- `src/security/archive-policy.ts` checks every ZIP entry **before decompression**:
  path traversal, absolute and reserved names, duplicates, entry count (20,000),
  per-entry size (64 MiB), total expanded size (256 MiB) and compression ratio
  (200:1). Limits live in `src/constants.ts`.
- `src/miz/archive.ts` recognises RAR and 7z files renamed to `.miz` and refuses them
  with the real format named.

### Files written

- **A source `.miz` is never overwritten.** Saves write a new file; copy-on-write
  packing keeps unchanged entries byte for byte.
- `src/security/files.ts` `atomicWrite` writes to a fresh temporary file (`0600`) in the
  same directory, fsyncs, then links or renames it into place. It refuses destinations
  that are symlinks or directories, the source path itself, and hard-link aliases of it,
  and refuses to replace an existing file unless the caller asks for overwrite.
- **Output is confined.** Mission saves go to `DCS_MISSION_OUTPUT_DIR` (must be absolute;
  default `Saved Games/DCS/Missions/My Mission`). Only the file name of a requested path
  is kept (`src/mission-output.ts`), so a model cannot choose an arbitrary directory for
  mission output.

### MCP protocol and inputs

- **Local stdio transport only.** The server opens no network listener.
- `src/security/transport.ts` bounds message framing (64 MiB) and
  `src/security/input-budget.ts` bounds JSON structure (150,000 nodes, depth 60,
  arrays of 65,536) before schema validation.
- **Every tool input is a strict zod schema** (`.strict()`, so unknown keys are
  rejected); all 198 tools publish `additionalProperties: false`.
- **Every tool declares MCP annotations** (`readOnlyHint`, and `destructiveHint` /
  `openWorldHint` where relevant) so clients can ask for confirmation on writes. These
  are hints for the client; they are not enforced by the server.
- The published tool schemas are pinned by hash in
  `tests/fixtures/mcp-schema-sha256.json`, so a schema change is always a reviewed change.

### Live DCS bridge

- `runtime/dcs/Hooks/dcs-mcp-hook.lua` binds to **`127.0.0.1:8899` only**, never blocks
  the simulation frame, and bounds requests (4 MiB), pending connections (32), accepts
  per frame (4) and returned units (2,000).
- **Raw Lua execution is doubly gated**: the `dcs_execute_lua` tool is only registered
  when the server runs with `DCS_ALLOW_RAW_LUA=1` (`src/tools/bridge.ts`), *and* the
  hook refuses it unless `ALLOW_EXEC = true` is edited into the installed hook file. Both
  default to off.

### Secrets and external services

- The ElevenLabs API key is read only from the `ELEVENLABS_API_KEY` environment
  variable. It is sent only as a request header to `api.elevenlabs.io`, and only the line
  of text to speak is sent in the body (`src/audio/speech.ts`). This is the only outbound
  network call the server makes, and only when speech is requested.
- Windows speech runs PowerShell with a fixed script; the text, voice and output path
  are passed as environment variables, never spliced into the script. FFmpeg and
  PowerShell are started with `execFile` (no shell).
- The key is read only in `src/audio/speech.ts` and used only as that request header;
  it is never a tool argument.

### Supply chain and releases

- **Not published to npm.** `package.json` is `private`. Releases are GitHub Releases
  carrying `SHA256SUMS.txt` and `release-acceptance.json` (exact source commit, accepted
  workflow runs and audit results); see [docs/development/releasing.md](docs/development/releasing.md).
- CI runs `npm audit --audit-level=low` on the full locked tree; a release requires zero
  reported vulnerabilities. Workflows run with `permissions: contents: read` by default.
- Package builders stage versioned sources only, so ignored local files cannot leak into a
  release (`tests/package-staging.test.ts`). The Claude Desktop bundle manifest is
  validated against the hash-pinned MCPB schema.
- Bundled Lua frameworks (MIST, MOOSE, Skynet, Splash Damage) are vendored with their
  original bytes, hashes and licences (`vendor/lua/manifest.json`).
- Reference data in `data/*.json` is generated from pinned sources with recorded hashes;
  the pydcs-derived files are regenerated byte for byte in CI.

## How this maps to MCP security best practices

| Practice | What this project does |
| --- | --- |
| Least privilege | Local stdio server; mission output confined to one folder; raw Lua off by default behind two switches; no network listener except the opt-in loopback bridge. |
| Input validation | Framing and structural budgets, then strict zod schemas on every tool; archive checks before decompression. |
| No code execution | Mission, mod and payload Lua parsed as data or text; prototype keys neutralised. |
| Path safety | Output file-name-only inside `DCS_MISSION_OUTPUT_DIR`; ZIP traversal refused; symlink and source-alias writes refused; atomic writes. |
| Human in the loop | Read-only / destructive annotations on every tool so the client can prompt before writes. |
| Secrets handling | API key from the environment only, sent only to its own service; no secrets in arguments, files or logs. |
| Supply chain | Locked dependencies, CI audit, GitHub-only releases with checksums and an acceptance record, pinned data sources. |

## Known limitations

Stated plainly, so nobody relies on something that is not there:

- **Not a sandbox.** The server has your user's filesystem permissions. Read tools
  accept any path you (or the model) pass, so a prompt-injected model could ask the
  server to *read* any `.miz`, log or Lua file your account can read. Only output is
  confined. Use a client that asks before tool calls, and keep it for trusted chats.
- **The loopback bridge has no authentication.** Any local process or user that can
  reach `127.0.0.1:8899` can send it commands (spawn units, load missions, and raw Lua
  if you enabled both gates). Never forward that port or enable raw Lua on a shared
  machine.
- **Annotations are advisory.** The server does not ask for confirmation itself; that is
  the MCP client's job.
- **Checksums are not signatures.** `SHA256SUMS.txt` detects a corrupted or swapped
  download only if you trust the release page it came from. Releases are not code-signed
  and carry no SLSA/provenance attestation.
- **Embedded frameworks run inside DCS.** Hashes and licences say what the bytes are,
  not that the scripts are safe.
- **Offline checks are not DCS certification.** Validation and tests show the file is
  well-formed; only flying it in DCS shows how it behaves.
- `npm audit` is a point-in-time check of known advisories, not a full review of every
  dependency.

A scoped source review of the release is recorded in
[docs/development/security-acceptance.md](docs/development/security-acceptance.md). It
is not an external penetration test.
