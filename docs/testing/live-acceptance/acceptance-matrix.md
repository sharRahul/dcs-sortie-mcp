# Release acceptance matrix

This page is the current status of live acceptance. It supersedes the status lines in
[results-2026-11-17.md](results-2026-11-17.md) and the first bullet of
[known_limitations.md](known_limitations.md), which describe the state on 17 November.
Dated evidence is in [verification.md](../../development/verification.md); each row names
the section.

Status values:

- **PASS**: observed in DCS 2.9.31.29434 MT on the Windows verification PC. The evidence is cited.
- **PARTIAL**: some required checks passed in DCS; the ones still open are listed.
- **OPEN**: not yet observed in DCS.
- **SUPERSEDED**: an earlier result replaced by a later run. The newer result is in the same row.

Offline checks (tests, `verify-mission.mjs`, the Mission Editor fix-up harness, mocked Lua)
are never counted as live results here.

## Generated acceptance package (10 scenarios, `test_matrix.md`)

Per-row checks are ME_OPEN, SPAWN, TASKS, FEATURE, TRIGGERS, RADIO, OBJECTIVE and LOG_CLEAN.
No row has all eight checks recorded, so **no package row is a full PASS**.

| ID | Status | Passed live | Still open | Evidence |
|---|---|---|---|---|
| 01 SEAD | PARTIAL | Hot player start, SA-6 + Osa alive, no false outcome; the file opens in the ME | HARM attack, site kill, victory, LOG_CLEAN | verification.md, "Scenario status" (16/17 Nov) |
| 02 CAP | PARTIAL | OBJECTIVE: player kills both MiGs, victory marker, landing (pilot flew) | LOG_CLEAN failed on third-party DCS-gRPC errors; full ME panel comparison | results-2026-11-17.md, "Completed CAP sortie" |
| 03 Carrier | PARTIAL | Player on the Stennis deck; carrier under way | Launch, arrested recovery (needs a pilot) | Scenario status |
| 04 CAS/JTAC | PARTIAL | JTAC HMMWV and targets placed and alive | F10 JTAC menu, designation, attack | Scenario status |
| 05 Convoy | PARTIAL | Ambush activates once on zone entry (shortened-route variant only) | Generated ~35 km route end to end; fire exchange | Scenario status |
| 06 Naval | PARTIAL | Moskva + 2 escorts placed ~1 km apart and under way | Harpoon attack, group objective | Scenario status |
| 07 Branching | PARTIAL | Escalation branch: reinforcements at exactly t=1200 | Target-destroyed branch, ANDed victory | Scenario status |
| 08 Airfield/FARP | PARTIAL | Parking, statics, FARPs, support trucks, AI Huey cold start | Rearm/refuel (see the cross-cutting FARP row) | Scenario status |
| 09 Logistics | PARTIAL | Empty finite stock denies the player spawn | Positive-stock follow-up | Scenario status |
| 10 Cinematic | PARTIAL | Briefing flag, AWACS flying | Phases after player takeoff | Scenario status |

All ten files opened in the Mission Editor with no load-error dialog (17 Nov). That shows only
that the files open; a full ME_OPEN check still needs every panel compared against the manifest.

## Example scenarios (`examples/scenarios/*.json`)

| Item | Status | Notes | Evidence |
|---|---|---|---|
| 9 examples, functional execution | PASS | 70/70 director phases and 209 native assertions, run with the player converted to AI | "Native scenario execution follow-up — 2026-11-19" |
| Player cockpit entry (7 airframes) | PASS | Apache and Ka-50 III untested: modules not installed | "Player starts and theatre launcher survey" |
| Terrain/scenery audit | PASS (sampled) | 2,292 points and 70 spawns sampled; not a continuous clearance guarantee | Native follow-up |
| Flown player sorties of the examples | OPEN | Functional checks used AI in place of the player | — |

## Cross-cutting features

| Feature | Status | Passed live / still open | Evidence |
|---|---|---|---|
| Hook install, status phases, menu refusal | PASS | `phase` reported from the menu; loading a mission from the menu is refused | 16/17 Nov, results-2026-11-17 |
| Runtime query from the menu | SUPERSEDED → PASS | 17 Nov: internal nil-reference. 21 Nov: still failing at first, then fixed: refuses with "no mission is running", verified live | "Runtime query from the menu (2026-11-21)" |
| Event monitoring | SUPERSEDED → PASS | 17 Nov: `available=false`. Fixed by the hook observer (`source=hook_observer`) | "eventMonitoring" + "Resolved since" |
| Mission swap via `dcs_load_mission` | OPEN (DCS limit) | `net.load_mission` does nothing in single player started from `DCS.exe <miz>`; relaunching DCS is the working route | "Installed-client live run" |
| Paused-runtime contract | OPEN | 17 Nov: returned frozen state where the test plan expects an unavailable error | results-2026-11-17 |
| Triggers: start/once/change/group_dead/zones | PASS | — | CLAUDE.md "Verified in DCS" |
| MIST/MOOSE/Skynet/Splash load order | PASS | — | Multiple sorties |
| Reactive spawn, late activation | PASS | — | 0.6.3 run, Black Dagger |
| Scripted ATC, ground phase | PASS | Startup/taxi/takeoff F10 sequence | "Depth sortie, live (2026-11-21)" |
| Scripted ATC, airborne/arrival | OPEN | Needs the jet flown | Depth sortie |
| ATC silent mode for AI traffic | OPEN | Must be checked by ear; no scripting API reports ATC radio calls | — |
| Into-wind runway choice | PASS | DCS briefing confirms the blow-toward convention | Depth sortie |
| FARP cold start (AI helicopter) | PASS | — | Depth sortie |
| FARP AI landing | PASS | Linked, unlinked and farp_cold-return helicopters all land on the pad (place=FARP). Two failed runs had the FARP 3 km from Kutaisi (likely cause, not isolated) | "Landing probe" (21 Nov) |
| FARP rearm/refuel | OPEN | AI parked by the support group is NOT refuelled in 10 min; player ground-crew request untested | "Landing probe" (21 Nov) |
| Troop transport boarding | OPEN | Helicopters landed and lifted off; boarding not observed | Black Dagger |
| Train, `big_smoke` rendering | OPEN | Train needs rail points; smoke is not scriptable | 0.6.3 run |
| Carrier recovery, JTAC service | OPEN | Need a pilot | — |
| Spoken ATC/briefing audio | PARTIAL | ElevenLabs voice lines heard in flight (Black Dagger); Windows-voice ATC not flown | Black Dagger |

## Client integration

See "Client installation smoke test" in verification.md. What passes there is that each
client's stored launch entry starts the server and completes a long authoring session. That
the app's own UI discovers the tools and its model uses them is a separate check:

| Client | Launch entry + 50-call session | In-app chat build | Evidence |
|---|---|---|---|
| Claude Desktop (config entry) | PASS | PARTIAL: Claude Code acting as client built and flew a mission (20 Nov) | Smoke test; "Assistant-driven build" |
| Claude Desktop (`.mcpb`) | PASS | PARTIAL: mission built through the installed bundle and flown (20 Nov); a plain brief typed into the app chat is recorded as not tested | Smoke test; "Installed-client live run" |
| Codex (`codex mcp add` entry) | PASS | PARTIAL: mission built through the plugin-cache server and flown (20 Nov) | Smoke test; "Installed-client live run" |
| ChatGPT local plugin | PASS | OPEN: the ChatGPT app's chat is recorded as not tested | Smoke test |

Done 21 Nov: the `.mcpb` and ChatGPT plugin were rebuilt from this checkout and reinstalled in place, the stale
`dcs-mcp-server` npx entry was removed from `~/.codex/config.toml`, and the smoke test was rerun: all four
entries report `dcs-sortie-mcp`, 198 tools, 50/50 calls, reopened intact. Claude Desktop and Codex must be
restarted to load the new copies.
