# DCS Sortie MCP

> **NOTE:** This is an independent open-source project for DCS World. Not affiliated with or endorsed by Eagle Dynamics.

**From mission idea to DCS World.**

Create, edit and validate DCS World missions by talking to your AI assistant. Describe the aircraft, enemies, route and objectives you want; your assistant uses DCS Sortie MCP to build a `.miz` file you can open in DCS World. It helps you turn an idea into a mission without configuring every detail manually in the Mission Editor.

For mission creators, campaign builders and players who want to spend more time flying their ideas.

[Quick start](#quick-start) · [Example scenarios](examples/scenarios/README.md) · [Releases](https://github.com/sharRahul/dcs-sortie-mcp/releases/latest) · [Client setup](docs/user/clients.md)

## What can it do?

- Create training and combat missions with aircraft, ships, ground forces and air defences.
- Change routes, weapons, weather, briefings and mission events.
- Inspect an existing mission and save an edited copy.
- Add recorded radio messages and other mission audio.
- Use the included MIST, MOOSE, Skynet-IADS and Splash Damage scripts when requested.
- Check for common mission problems before you fly.
- Optionally connect to a running DCS session for live controls and diagnostics.

DCS can stay closed while you build a mission. You need the appropriate DCS maps and aircraft to fly it.

## Quick start

1. **Connect your assistant.** Choose your app in the download table below and follow its setup link. Node.js 20+ is required for the npm package; the Claude Desktop extension includes its dependencies.
2. **Ask for a small first mission:**

   > Create a fictional Caucasus training mission with an airborne player Su-25T near Kutaisi, clear weather and a short navigation route. Use text-only messages, validate it and save a new file named First_Sortie.miz. Tell me the returned full file path and required modules.

3. **Open the returned file in DCS World.** Check the briefing and player slot in the Mission Editor, then fly. Caucasus and the Su-25T are included with DCS World.
4. **Revise it in chat:** “Move the start farther from Kutaisi and change the time to sunset. Validate it and save a new copy.”

Mission files are saved under your configured mission output folder; use the path returned by the assistant. See [save-folder settings](docs/user/clients.md#mission-save-folder) if you want a different location. File validation checks structure; flying in DCS checks how the mission behaves.

## Get DCS Sortie MCP

Open the [latest GitHub release](https://github.com/sharRahul/dcs-sortie-mcp/releases/latest) and download the file for your app from **Assets**. Extract ZIP downloads first; open the Claude Desktop `.mcpb` directly.

| Your app | What to download | Setup |
| --- | --- | --- |
| Claude Desktop | `dcs-claude-desktop-…` | Open the `.mcpb` extension. [Instructions](docs/user/clients.md#claude-desktop) |
| ChatGPT Desktop | `dcs-chatgpt-plugin-…` | Install the local plugin through a marketplace. [Instructions](docs/user/clients.md#chatgpt-desktop) |
| Codex | `dcs-others-…` | Install the tarball and register the local server. [Instructions](docs/user/clients.md#codex) |
| Others | `dcs-others-…` | Install the npm tarball and add a local MCP server. [Instructions](docs/user/clients.md#others) |

The **Others** download contains the npm file `dcs-sortie-mcp-<version>.tgz`, also used by Codex. You can install it without an npm account. Node.js 20+ is needed for the npm package; the Claude extension uses Claude Desktop's Node runtime. ChatGPT desktop plugin availability depends on your app and account. These downloads do not create a ChatGPT browser connection.

Distribution is **GitHub-only**. No npm account is needed; use the GitHub download rather than `npx dcs-sortie-mcp`.

### Prefer to build it yourself?

Install [Node.js 20+](https://nodejs.org/) and [Git](https://git-scm.com/downloads), then run each line in a terminal, stopping if any command fails:

```powershell
git clone https://github.com/sharRahul/dcs-sortie-mcp.git
cd dcs-sortie-mcp
npm ci
npm run package:build
npm run package:verify
```

This creates and tests the npm tarball locally. The [connection guide](docs/user/clients.md) also explains how to use the built clone directly. Building does not publish anything to npm.

## Try your first mission

After connecting your app, ask:

> Create a simple Caucasus training mission. Put me in an airborne F-16 near Kutaisi, set clear weather and add a short briefing. Check it for problems and save a new .miz file in my DCS Missions folder. Tell me the full file path.

Then ask for changes:

> Add two enemy MiG-29s, give me a wingman and change the time to sunset. Save a new copy.

For an existing mission, give the assistant its full file path and describe what to change.

The [mission build order and toolsets](skills/dcs-mission-production/references/mission-content.md#agent-routing-and-mission-build-order)
cover placement, ordered Lua scripts, payloads, terrain, scenery, routes, controller voices and verification.
Agents can read the same guide with `dcs_tool_catalogue guide=checklist`; add `topic=terrain-placement`,
`topic=mission-scripting` or `topic=voice-comms` to retrieve one toolset with its prerequisites and calling order.

Not sure what to fly? Ask for ideas first:

> Give me three Cold War A-10C mission ideas over Germany, recommend one, then build it and save it.

The assistant can draw on 14 built-in mission types (deep strike, tank breakthrough, emergency close air support, SEAD, airbase scramble, fleet defence, combat air patrol, escort, convoy hunt, helicopter operations, strike package, historical, night) and on ready-made example scenarios.

## Fly the mission

1. Find the `.miz` file at the path your assistant gives you.
2. Open it from DCS World's Missions screen or Mission Editor.
3. Check the briefing, player aircraft and required modules, then fly.

Existing source missions are preserved. Replacing an existing output requires an explicit overwrite. Validation checks the file's structure; test the mission in DCS to confirm its AI, audio and objectives behave as intended.

## Need help?

- **No DCS tools in your chat?** Follow the setup for your app, restart it and open a new chat.
- **DCS is not connected?** File creation still works. Live controls need the optional DCS connection script and a running simulator. [Setup](docs/reference/technical-reference.md#live-bridge-setup)
- **Audio conversion fails?** It needs optional FFmpeg. [Audio setup](docs/user/mission-audio.md)
- **No spoken ATC?** Voices need FFmpeg plus an ElevenLabs key (`ELEVENLABS_API_KEY`) or installed Windows voices; without one, missions keep DCS's own ATC. [Speech](docs/user/mission-audio.md#speech-text-to-audio)
- **A mission will not open?** Ask your assistant to validate it and check the DCS error log.

[App connection guide](docs/user/clients.md) · [Example scenarios](examples/scenarios/README.md) · [Technical reference](docs/reference/technical-reference.md) · [Tested features and limits](docs/development/verification.md) · [Report a problem](https://github.com/sharRahul/dcs-sortie-mcp/issues)

Want to help? See [Contributing](CONTRIBUTING.md). Found a security problem? See [Security](SECURITY.md) to report it privately.

For contributors: [documentation index](docs/README.md), [project scripts](scripts/README.md) and [building and publishing releases](docs/development/releasing.md).

DCS Sortie MCP is licensed under [Apache 2.0](LICENSE) © [github.com/sharRahul](https://github.com/sharRahul). Included community Lua frameworks retain [their own licenses and credits](vendor/lua/README.md).
