# What goes into a mission, and which tool builds it

Served as `dcs://skills/mission-production/checklist`. The skill (`dcs://skills/mission-production`) covers the
process: projects, revisions and flight evidence. This page covers the content. Work through it in order. Every
item says which tool to use and what goes wrong if you skip it. Read `dcs://guide/conventions` first for the rules
on coordinates, units and validation. Every registered tool is named on this page: build tools in sections 0-8,
and all the others in the appendix.

Fastest route: `dcs_scenario_validate` then `dcs_scenario_generate` builds most of this from one specification
(forces, player, objectives, support, ATC, airfield ownership). Use the steps below to check its output, or to build
or extend a mission by hand. For a tracked project with revisions use `dcs_production_create`,
`dcs_production_generate`, `dcs_production_revise` and `dcs_production_validate` (see the skill).

## 0. Before you start

| Ask / check | Tool | Why |
|---|---|---|
| Live or offline? | `dcs_bridge_status` | Live tools need phase `running`. |
| Which DCS build, terrains, modules? | `dcs_install_report`, `dcs_list_airfields` | Theatre must be installed; flyable modules decide player aircraft. |
| Player aircraft flyable here? | `dcs_list_unit_types` (`playerFlyable`) | CoreMods-only types are AI-only; a Player slot in one is unflyable. |
| Exact unit ids | `dcs_list_unit_types`, `dcs_list_installed_mods`, `dcs_list_countries` | Never guess ids. A mod type spawns only if the mod is deployed. |
| Realistic order of battle | `dcs_country_inventory`, `dcs_service_date_check`, `dcs_miz_historical_report` | `dcs_list_unit_types country=X` is what the editor allows, not what a country flies. |
| What this server can and cannot back up | `dcs_aircraft_coverage`, `dcs_authoring_coverage_audit` | Say which parts are unverified before promising fidelity. |

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
| Trigger zones (used by triggers, ATC, spawns) | `dcs_miz_add_trigger_zone`, `dcs_miz_add_quad_zone` | Create zones before the triggers that name them. |

## 2. The player flight

| Item | Tool | Notes |
|---|---|---|
| Role template | `dcs_list_flight_roles` | |
| The flight | `dcs_miz_create_flight` (or the lower-level `dcs_miz_add_aircraft_group`) | Defaults to 2 aircraft; only the lead is Player. Parking/runway/air/ship/FARP starts. |
| Airfield ownership | (automatic on create) | A flight spawns only at an airfield its side owns: neutral fields are claimed, enemy ones reported (`dcs_miz_set_airbase_coalition`). |
| Carrier start | `dcs_carrier_compatibility` | Check the type can operate from that ship. |
| Loadout and fuel | `dcs_list_loadouts` + `dcs_miz_apply_loadout`, or `dcs_miz_set_payload`; `dcs_aircraft_fuel`, `dcs_miz_fuel_report` | An empty payload is legal but useless. |
| Route | `dcs_miz_add_waypoint`, `dcs_miz_set_route` | Waypoint 1 is the start. Headings in degrees; x north, y east. |
| Tasks and waypoint actions | `dcs_miz_set_group_task`, `dcs_miz_add_waypoint_task`, `dcs_list_waypoint_actions` + `dcs_miz_add_waypoint_action` | Undocumented parameters are refused. |
| Landing | `dcs_miz_add_airfield_landing` (or `dcs_miz_add_carrier_recovery`) | Without it there is no recovery leg and no arrival ATC. |
| Radios | `dcs_list_radios`, `dcs_miz_set_radio_presets`, `dcs_miz_set_intra_flight_frequency`, `dcs_airfield_radio`, `dcs_theatre_data` | Put ATC, AWACS and tanker frequencies in the presets. |
| Callsign, tail numbers, livery | `dcs_miz_configure_flight`, `dcs_list_callsigns`, `dcs_list_liveries` | |
| ATC and briefing | `atc` argument of `dcs_miz_create_flight` / `dcs_miz_configure_flight` | See section 6. |

## 3. Friendly support

| Item | Tool | Notes |
|---|---|---|
| AWACS, tankers | `dcs_miz_create_flight` with an AWACS or tanker role; orbit via `dcs_miz_add_waypoint_task` | Give each one a frequency, and the tanker a TACAN. The ATC script hands the player to the AWACS. |
| Escorts, CAP, SEAD | `dcs_miz_create_flight`, `dcs_miz_clone_group` | |
| JTAC, CSAR, troop lift | `dcs_miz_make_troop_transport`, `dcs_miz_direct_mission` | Troop unloading uses `Disembarking`; the transport tool writes it. |
| Friendly ground forces | `dcs_miz_create_ground_plan`, `dcs_miz_add_ground_group`, `dcs_miz_add_units_to_group`, `dcs_miz_add_surface_task` | |
| Airfield and FARP stock | `dcs_miz_list_warehouses`, `dcs_miz_edit_warehouse`, `dcs_miz_add_warehouse_stock` | An empty finite stock denies the spawn. New stock needs a donor mission (`dcs_import_warehouse_donor`). |

## 4. The threat and the target

| Item | Tool | Notes |
|---|---|---|
| Air defence sites | `dcs_list_site_templates` + `dcs_miz_add_ground_group` (composition) | A site is ONE group with radar plus launchers. Launchers alone never fire. |
| Integrated air defence (Skynet) | `dcs_miz_configure_iads`, `dcs_miz_load_scripts` | Scripts load in one start trigger, in dependency order. |
| Enemy air | `dcs_miz_create_flight`, `dcs_miz_add_reactive_spawn` | Waves activate on zone entry or group death. |
| Targets | `dcs_miz_add_target_area`, `dcs_list_scene_templates`, `dcs_miz_add_scene`, `dcs_list_terrain_sites` | Give the player something specific to find. |
| Ships | `dcs_miz_add_naval_group` | Leave about 1 km between ships, or escorts collide at t=0. |
| Trains | `dcs_terrain_roads` (kind railroads, live) + `dcs_miz_add_train` | A train with no track under it does not exist in the mission. |
| Ground forces on real terrain | `dcs_check_terrain`, `dcs_terrain_roads`, `dcs_terrain_clear_spot`, `dcs_terrain_visibility` (live); `dcs_terrain_analyze`, `dcs_miz_move_ground_on_terrain` (offline, needs a pack or grid) | Units placed in water are inert with no error. |
| Threat rings on the F10 map | `dcs_miz_add_threat_ring`, `dcs_miz_add_drawing`, `dcs_list_map_icons` | |

## 5. Scenery: make places look lived in

| Item | Tool | Notes |
|---|---|---|
| Airfields | `dcs_miz_populate_airfield` | Default about 17% of slots (editor-saved missions), capped at 38%. Adds ground support behind parked static aircraft. Never fill a field. |
| Airfield air defence | site templates (section 4) | In real missions it sits more than 120 m from parking. |
| FARPs and staging areas | `dcs_miz_add_farp` (with support group), `dcs_miz_add_perimeter` | |
| Compounds and bases | `dcs_scan_scene_candidates` + `dcs_import_scene_template` + `dcs_miz_add_scene` | Reuse a real footprint from a mission the user supplies. |
| Single objects and effects | `dcs_miz_add_static` (`big_smoke` needs a preset 1-8) | |

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
| Dynamic events | `dcs_miz_add_reactive_spawn`, `dcs_miz_add_unit_activation`, `dcs_miz_add_counter`, `dcs_miz_set_dynamic_spawn` | |
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

## Appendix: every other tool, by purpose

Not needed to build a new mission, but here when the job calls for them.

**Sessions.** `dcs_miz_list_sessions` lists open sessions. `dcs_miz_restore_session` brings one back after a server
restart. `dcs_miz_close` discards one. `dcs_miz_diff` compares a session with its source.

**Read a mission.**
- Overview and settings: `dcs_miz_get_summary`, `dcs_miz_get_weather`, `dcs_miz_get_briefing`.
- Groups and units: `dcs_miz_list_groups`, `dcs_miz_get_group`, `dcs_miz_get_unit`, `dcs_miz_get_route`,
  `dcs_miz_find_groups_near`.
- Triggers, zones and goals: `dcs_miz_list_triggers`, `dcs_miz_list_zones`, `dcs_miz_points_in_zone`,
  `dcs_miz_list_goals`, `dcs_miz_get_goal`.
- Embedded files and drawings: `dcs_miz_list_resources`, `dcs_miz_list_assets`, `dcs_miz_list_drawings`.
- Any field by path: `dcs_miz_get_value`.

**Edit or remove content.**
- Groups and units: `dcs_miz_update_group`, `dcs_miz_modify_unit`, `dcs_miz_move_group`, `dcs_miz_move_unit`,
  `dcs_miz_rename_group`, `dcs_miz_rename_unit`, `dcs_miz_remove_group`, `dcs_miz_remove_unit`.
- Routes and tasks: `dcs_miz_update_waypoint`, `dcs_miz_remove_waypoint`, `dcs_miz_modify_waypoint_task`,
  `dcs_miz_remove_waypoint_task`, `dcs_miz_set_waypoint_task_enabled`.
- Zones and triggers: `dcs_miz_update_zone`, `dcs_miz_remove_zone`, `dcs_miz_update_trigger`,
  `dcs_miz_replace_trigger`, `dcs_miz_remove_trigger`.
- Goals: `dcs_miz_modify_goal`, `dcs_miz_remove_goal`.
- Drawings and files: `dcs_miz_remove_drawing`, `dcs_miz_clear_drawing_layer`, `dcs_miz_remove_asset`.
- Radios and liveries: `dcs_miz_reset_radio_presets`, `dcs_check_livery`.
- Any field by path: `dcs_miz_set_value`.

**Coordinates and geometry.** `dcs_geo_convert` and `dcs_convert_coords` convert lat/lon and x/y.
`dcs_distance_bearing` and `dcs_geometry` give bearings, distances and points on the flat DCS grid.

**Live sim (needs a running mission).**
- Read state: `dcs_status`, `dcs_get_mission_info`, `dcs_get_self_data`, `dcs_get_all_units`,
  `dcs_get_aircraft_list`, `dcs_runtime_inspect`.
- Act in the sim: `dcs_spawn_unit`, `dcs_send_message`.
- AI aircraft: `dcs_aircraft_detect`, `dcs_aircraft_inspect_options`, `dcs_aircraft_set_option`, `dcs_aircraft_task`.
- Support flights: `dcs_support_flight_register`, `dcs_support_flight_inspect`, `dcs_support_flight_remove`,
  `dcs_transport_verify`.
- Live hook setup: `dcs_install_hook`.

**Campaigns.** `dcs_campaign_generate` builds linked mission stages. `dcs_campaign_read`, `dcs_campaign_write` and
`dcs_campaign_step` handle a real DCS `.cmp`.

**Data packs sampled from DCS** (for theatres or terrain the bundled data lacks):
- Terrain: `dcs_terrain_build_pack`, `dcs_terrain_list_packs`, `dcs_terrain_remove_pack`.
- Airbases: `dcs_airbase_build_pack`, `dcs_list_airbase_packs`, `dcs_remove_airbase_pack`.

**Types learned from missions.** `dcs_learn_mission_types`, `dcs_list_learned_types`, `dcs_remove_learned_types`.

**Imported templates.**
- SAM sites: `dcs_import_site_template`, `dcs_remove_site_template`.
- Compounds and bases: `dcs_list_scene_imports`, `dcs_remove_scene_template`.
- Warehouse donors: `dcs_list_warehouse_donors`.

**Acceptance kits** (offline test packages for a live check). `dcs_acceptance_generate`, `dcs_acceptance_job`,
`dcs_acceptance_check`, `dcs_acceptance_collect`.

**Where the data comes from.** `dcs_data_provenance`.

**Find any tool.** `dcs_tool_catalogue` searches every tool by keyword.
