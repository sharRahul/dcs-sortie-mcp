# What goes into a mission, and which tool builds it

Served as `dcs://skills/mission-production/checklist`. The skill (`dcs://skills/mission-production`) covers the
process: projects, revisions and flight evidence. This page covers the content. Work through it in order. Every
item says which tool to use and what goes wrong if you skip it. Read `dcs://guide/conventions` first for the rules
on coordinates, units and validation.

Fastest route: `dcs_scenario_generate` builds most of this from one specification (forces, player, objectives,
support, ATC, airfield ownership). Use the steps below to check its output, or to build or extend a mission by hand.

## 0. Before you start

| Ask / check | Tool | Why |
|---|---|---|
| Live or offline? | `dcs_bridge_status` | Live tools need phase `running`. |
| Which DCS build, terrains, modules? | `dcs_install_report` | Theatre must be installed; flyable modules decide player aircraft. |
| Player aircraft flyable here? | `dcs_list_unit_types` (`playerFlyable`) | CoreMods-only types are AI-only; a Player slot in one is unflyable. |
| Exact unit ids | `dcs_list_unit_types`, `dcs_list_installed_mods` | Never guess ids. A mod type spawns only if the mod is deployed. |
| Realistic order of battle | `dcs_country_inventory`, `dcs_service_date_check` | `dcs_list_unit_types country=X` is what the editor allows, not what a country flies. |

Settle with the user, or choose sensible defaults for: theatre, date and time, side and country, player aircraft
and role, objective, how victory and failure are decided, and difficulty.

## 1. The mission shell

| Item | Tool | Notes |
|---|---|---|
| New mission on the theatre | `dcs_miz_new` | Or `dcs_miz_open` on an existing file. |
| Coalitions and countries | `dcs_miz_assign_country` | One country cannot sit on both sides. |
| Date, start time, title, description | `dcs_miz_configure_mission` | Start time sets light and the briefing clock. |
| Weather | `dcs_miz_set_weather`, `dcs_list_cloud_presets` + `dcs_miz_set_cloud_preset` | Wind feeds the briefing. Runway choice does not read it, so pass the runway yourself. |
| Mission options (labels, F10 view, etc.) | `dcs_miz_set_mission_options` | |
| Bullseye and reference points | `dcs_miz_add_reference_point` | |

## 2. The player flight

| Item | Tool | Notes |
|---|---|---|
| Role template | `dcs_list_flight_roles` | |
| The flight | `dcs_miz_create_flight` | Defaults to 2 aircraft; only the lead is Player. Parking/runway/air/ship/FARP starts. |
| Airfield ownership | (automatic on create) | A flight spawns only at an airfield its side owns: neutral fields are claimed, enemy ones reported (`dcs_miz_set_airbase_coalition`). |
| Loadout and fuel | `dcs_list_loadouts` + `dcs_miz_apply_loadout`, or `dcs_miz_set_payload`; `dcs_miz_fuel_report` | An empty payload is legal but useless. |
| Route | `dcs_miz_add_waypoint`, `dcs_miz_set_route`; tasks `dcs_miz_add_waypoint_task` | Waypoint 1 is the start. Headings in degrees; x north, y east. |
| Landing | `dcs_miz_add_airfield_landing` (or `dcs_miz_add_carrier_recovery`) | Without it there is no recovery leg and no arrival ATC. |
| Radios, callsign, tail numbers, livery | `dcs_miz_configure_flight`, `dcs_miz_set_radio_presets`, `dcs_list_callsigns`, `dcs_list_liveries` | |
| ATC and briefing | `atc` argument of `dcs_miz_create_flight` / `dcs_miz_configure_flight` | See section 6. |

## 3. Friendly support

| Item | Tool | Notes |
|---|---|---|
| AWACS, tankers | `dcs_miz_create_flight` with an AWACS or tanker role; orbit via `dcs_miz_add_waypoint_task` | Give each one a frequency, and the tanker a TACAN. The ATC script hands the player to the AWACS. |
| Escorts, CAP, SEAD | `dcs_miz_create_flight` | |
| JTAC, CSAR, troop lift | `dcs_miz_make_troop_transport`, `dcs_miz_direct_mission` | Troop unloading uses `Disembarking`; the transport tool writes it. |
| Friendly ground forces | `dcs_miz_create_ground_plan`, `dcs_miz_add_ground_group` | |

## 4. The threat and the target

| Item | Tool | Notes |
|---|---|---|
| Air defence sites | `dcs_list_site_templates` + `dcs_miz_add_ground_group` (composition) | A site is ONE group with radar plus launchers. Launchers alone never fire. |
| Integrated air defence (Skynet) | `dcs_miz_configure_iads`, `dcs_miz_load_scripts` | Scripts load in one start trigger, in dependency order. |
| Enemy air | `dcs_miz_create_flight`, `dcs_miz_add_reactive_spawn` | Waves activate on zone entry or group death. |
| Targets | `dcs_miz_add_target_area`, `dcs_list_scene_templates`, `dcs_miz_add_scene` | Give the player something specific to find. |
| Ships | `dcs_miz_add_naval_group` | Leave about 1 km between ships, or escorts collide at t=0. |
| Ground forces on real terrain | `dcs_check_terrain` (live), `dcs_terrain_roads`, `dcs_miz_move_ground_on_terrain` | Units placed in water are inert with no error. |
| Threat rings on the F10 map | `dcs_miz_add_threat_ring`, `dcs_miz_add_drawing` | |

## 5. Scenery: make places look lived in

| Item | Tool | Notes |
|---|---|---|
| Airfields | `dcs_miz_populate_airfield` | Default about 17% of slots (editor-saved missions), capped at 38%. Adds ground support behind parked static aircraft. Never fill a field. |
| Airfield air defence | site templates (section 4) | In real missions it sits more than 120 m from parking. |
| FARPs and staging areas | `dcs_miz_add_farp` (with support group), `dcs_miz_add_perimeter` | |
| Compounds and bases | `dcs_scan_scene_candidates` + `dcs_import_scene_template` + `dcs_miz_add_scene` | Reuse a real footprint from a mission the user supplies. |
| Effects | `dcs_miz_add_static` with `big_smoke` | Requires a preset (1-8). |

Never put equipment "behind" a parked FLIGHT. DCS turns parked aircraft to the slot's own direction at spawn, so
that spot can be in front of the aircraft and block its taxi (seen live).

## 6. Briefing, ATC and radio

| Item | Tool | Notes |
|---|---|---|
| Coalition briefing text and images | `dcs_miz_set_briefing`, `dcs_miz_embed_asset` | The ME briefing screen needs the picture and neutral-task fields; new missions carry them. |
| Spoken briefing plus scripted ATC | `atc` on `dcs_miz_create_flight` / `dcs_miz_configure_flight` | Briefing (objective, flight, time, weather, departure, route legs, AWACS, recovery), startup, taxi, takeoff, airborne handoff, AWACS check-in, inbound, landing, taxi-in. |
| Voices | ElevenLabs key or Windows voices, plus FFmpeg | With no voice the flight keeps DCS's own ATC and only a text briefing is written. Check `atc.notes`. |
| Custom calls and sounds | `dcs_audio_convert` (file or `speech`) + `dcs_miz_add_trigger` sound actions | |
| Kneeboards | `dcs_miz_embed_asset` | |

## 7. Logic: what happens, and how it ends

| Item | Tool | Notes |
|---|---|---|
| Triggers | `dcs_miz_add_trigger` (`dcs_miz_trigger_capabilities` lists the supported surface) | Names are resolved to ids; unknown names are refused. |
| Victory and failure | `dcs_miz_add_goal` and/or trigger `end_mission` | Every mission needs a defined end. |
| Dynamic events | `dcs_miz_add_reactive_spawn`, `dcs_miz_add_unit_activation`, `dcs_miz_add_counter` | |
| Directed story (radio scripts, phases) | `dcs_miz_direct_mission` | Built-in dialogue is fictional. |
| F10 radio menu items | trigger actions `add_radio_item_*` | |

## 8. Check, save, verify

| Step | Tool | Notes |
|---|---|---|
| Validate | `dcs_miz_validate`, `dcs_miz_mission_report` | ERROR = DCS cannot load the file; fix them all. Read the warnings. |
| Save | `dcs_miz_save_as` | Always a new file in `DCS_MISSION_OUTPUT_DIR`; use the returned `outPath`. |
| Load in DCS | `dcs_load_mission` (swaps a running mission only), then `dcs_get_log_errors` | dcs.log is the only place a load failure shows. |
| Flight evidence | `dcs_production_capture`, `dcs_production_status` | Each new revision starts without evidence. |

## Minimum for "playable"

A mission is not finished until it has all of:

- a flyable player slot at an airfield its side owns, or an air, ship or FARP start;
- a loadout fit for the objective;
- a route out and a way home;
- a briefing;
- an objective with a defined victory and failure;
- something to fight or find;
- a validation with zero ERRORs;
- a saved file.

Report anything left out or unverified to the user.
