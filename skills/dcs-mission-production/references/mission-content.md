# What goes into a mission, and which tool builds it

Served as `dcs://skills/mission-production/checklist`. The skill (`dcs://skills/mission-production`) covers the
process: projects, revisions and flight evidence. This page covers the content. Work through it in order. Every
item says which tool to use and what goes wrong if you skip it. Read `dcs://guide/conventions` first for the rules
on coordinates, units and validation. Every registered tool belongs to one primary toolset in the appendix;
the build sections show how to combine those toolsets. Toolsets organise existing tools, not new wrappers or
client exposure restrictions. Use the actual MCP tool schema for arguments.

## Agent routing and mission build order

Read this order before editing. Retrieve a toolset through `dcs_tool_catalogue guide=checklist topic="<id>"`
(for example `topic="terrain-placement"` or `topic="voice-comms"`). For exact tool discovery use
`dcs_tool_catalogue query="<words>"`, following `nextOffset` until the relevant results are read. Only call
tools exposed by the current client; a guide entry does not enable a tool excluded by `--tools`.

| Order | Toolsets | Do this before moving on |
|---|---|---|
| 0. Plan and check dependencies | discovery, production, reference-data | Define objective, victory/failure, theatre, era, coalitions, player/client slots, difficulty and required modules/mods. Check bridge status; offline authoring does not need a running sim. Resume an existing project rather than starting over. |
| 1. Create the mission shell | mission-session, mission-settings | New/open session, countries, airbase ownership, date/time, weather, options and reference points. Preserve an existing mission's content when editing. |
| 2. Place departure platforms and flights | terrain-placement, force-placement | Check carrier waters and the full FARP footprint; create carrier/naval group or supported FARP first. Look up airfield parking and ownership. Then place aircraft/helicopters on the airfield, carrier or FARP using supported starts and carrier compatibility. |
| 3. Load mission-start Lua | mission-scripting | Call `dcs_miz_load_scripts` once with `frameworks: ["mist", "moose", "skynet", "splash"]` when all four are requested. It embeds files and orders actions in ONE mission-start trigger: MIST, MOOSE, Skynet-IADS, Splash Damage, then custom setup. Separate start triggers have no guaranteed order. Inspect resources and triggers. For other missions include only needed/requested frameworks. |
| 4. Check every flight's payload | flight-equipment, logistics | Inspect player, client and AI loadouts, pylon/store compatibility, fuel/range and countermeasures. Confirm support aircraft equipment and available warehouse fuel/weapons. |
| 5. Place troops and vehicles | terrain-placement, force-placement | Find sufficiently flat, dry, clear land for the WHOLE formation, not just its centre. Place infantry, vehicles, artillery and complete mixed radar/launcher SAM groups. Reserve space for routes, access and scenery. |
| 6. Dress the sites | terrain-placement, site-scenery, logistics | Check footprints for airfield scenery, FARP, military base, staging area and SAM site. Keep runways, taxiways, parking, helipads, roads and weapon arcs clear. Add support/stock. Do not assume an imported layout fits the new terrain. |
| 7. Build routes, tasks and logic | routes-tasks, mission-scripting | Set departure, altitude/speed, ingress, objective, egress and recovery; then ground routes, SAM/IADS membership, AWACS/tanker orbits and JTAC/GCI roles. Create named groups/zones before triggers that reference them. Configure IADS after final site names/prefixes exist; its setup must follow library loads. Define activation, timing, flags, scoring, victory, failure and mission end. |
| 8. Add voices and briefing | voice-comms, presentation | Finalise callsigns, frequencies, presets, TACAN and recovery before generating ATC, control centre, JTAC, GCI and AWACS dialogue. Convert/generate audio and attach it to supported sound/radio trigger actions; inspect embedded files and audience/timing. Use `atc` flight configuration after the route and landing leg are final. |
| 9. Validate and save | validation, mission-session, production | Recompute reports; fix errors and review warnings about parking, stock, references, modules, fuel and terrain. Save a new file using its returned path, or checkpoint an immutable production revision and validate saved bytes. |
| 10. Fly and verify when authorised | live-control, live-aircraft, acceptance, production | Test the exact saved revision, inspect logs, spawning/taxi/takeoff, framework startup, SAM engagement, support service, voice playback, objectives and recovery. Capture evidence; revise and retest changed behaviour. Report unobserved checks explicitly. |

The detailed sections below are a content reference; the table above is the execution order. Dependencies take
precedence over row order: if a custom script needs final group names, append it after creating those groups.
Do not re-add all frameworks after setup scripts have already been appended: inspect the ordered load trigger
and keep every dependency ahead of its consumers.

Terrain evidence is required before promising flat placement. Offline use needs a sourced grid or matching
terrain pack; live helpers need a running mission on the same theatre. `dcs_check_terrain` proves surface type,
not flatness or scenery clearance. `dcs_terrain_clear_spot` checks flat clear candidates live; use
`dcs_terrain_analyze` for slope/footprint analysis. Without suitable evidence report placement as unverified.

Spoken dialogue does not create a functioning controller. AWACS needs an appropriate flight/task/orbit/radio;
JTAC needs supported FAC tasks and targeting configuration; GCI/control-centre behaviour needs explicit
mission logic or framework setup. Discover supported actions with `dcs_list_waypoint_actions` and trigger
capabilities before authoring them. Do not invent dedicated ATC/JTAC/GCI tools or claim realistic procedural
behaviour from audio alone. Keep native ATC if voice generation is unavailable unless text-only scripting is
explicitly chosen. Briefings should cover objectives, threats, comms, support, recovery and dependencies.

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
| Load in DCS | `dcs_load_mission` (requests a swap in a running mission only), then `dcs_bridge_status` and `dcs_get_log_errors` | Verify the running mission identity against the saved revision. Acceptance of the request or a running phase does not prove the swap occurred. |
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

## Toolsets: complete tool inventory

Each registered tool has one primary home below. A tool can be used at several build stages; its home is a
routing aid, not a restriction. Read the **When / order** guidance, then the tool's schema. Toolset ids are
unique topic selectors for `dcs_tool_catalogue guide=checklist topic="<id>"`.

### discovery toolset

**When / order:** Start here for capabilities, connection and failure diagnosis. Check bridge phase before
choosing live tools. Logs work even with DCS closed. Install the hook only when live setup is requested.

- `dcs_tool_catalogue`
- `dcs_bridge_status`
- `dcs_status`
- `dcs_get_log_errors`
- `dcs_install_hook`

### production toolset

**When / order:** For a durable mission project, read status first when resuming. For a new project create the
plan, validate the scenario, generate, then validate saved bytes. Edit the returned revision in a session and
revise with the current expectedRevision. Capture only while that exact revision runs; read status to report
observed and missing checks. Revision changes require fresh evidence.

- `dcs_production_status`
- `dcs_production_create`
- `dcs_production_generate`
- `dcs_production_revise`
- `dcs_production_validate`
- `dcs_production_capture`
- `dcs_scenario_validate`
- `dcs_scenario_generate`

### reference-data toolset

**When / order:** Before placing anything, inspect the installation, then exact types, countries, airfields,
templates, coverage and service dates as appropriate. Learn missing types from supplied missions only after
checking installed/catalogued data. Learned ids do not prove deployed modules, payload compatibility or fit.
Remove learned data only for requested cleanup; inspect provenance when sources disagree.

- `dcs_install_report`
- `dcs_list_installed_mods`
- `dcs_list_unit_types`
- `dcs_list_countries`
- `dcs_list_airfields`
- `dcs_theatre_data`
- `dcs_country_inventory`
- `dcs_service_date_check`
- `dcs_aircraft_coverage`
- `dcs_authoring_coverage_audit`
- `dcs_data_provenance`
- `dcs_learn_mission_types`
- `dcs_list_learned_types`
- `dcs_remove_learned_types`

### mission-session toolset

**When / order:** New/open a mission or list/restore an existing session after restart. Inspect summary and diff
before editing. Save a new file after validation; use its returned path. Close only after saving or intentionally
discarding changes. Production revisions use the production checkpoint path instead of an unrelated save.

- `dcs_miz_new`
- `dcs_miz_open`
- `dcs_miz_list_sessions`
- `dcs_miz_restore_session`
- `dcs_miz_get_summary`
- `dcs_miz_diff`
- `dcs_miz_save_as`
- `dcs_miz_close`

### mission-settings toolset

**When / order:** After opening the session, assign countries and ownership, set mission date/time/options,
choose weather/preset and reference points. Set weather before writing wind/runway-sensitive plans and voice
briefings. Do not silently flip an enemy airbase to make a flight spawn.

- `dcs_miz_assign_country`
- `dcs_miz_set_airbase_coalition`
- `dcs_miz_configure_mission`
- `dcs_miz_set_mission_options`
- `dcs_miz_get_weather`
- `dcs_miz_set_weather`
- `dcs_list_cloud_presets`
- `dcs_miz_set_cloud_preset`
- `dcs_miz_add_reference_point`

### terrain-placement toolset

**When / order:** Convert coordinates and check the theatre, surface, slope and footprint before ground/site
placement. Use matching offline packs/grids or live data; sample missing terrain/airbase data only with a
matching running theatre. Check roads/rail before routes/trains. After moving a formation recheck all units
and its routes. Visibility checks prove geometry, not radar detection. List packs before removing any.

- `dcs_geo_convert`
- `dcs_convert_coords`
- `dcs_distance_bearing`
- `dcs_geometry`
- `dcs_check_terrain`
- `dcs_terrain_analyze`
- `dcs_terrain_clear_spot`
- `dcs_terrain_roads`
- `dcs_terrain_visibility`
- `dcs_miz_move_ground_on_terrain`
- `dcs_terrain_build_pack`
- `dcs_terrain_list_packs`
- `dcs_terrain_remove_pack`
- `dcs_airbase_build_pack`
- `dcs_list_airbase_packs`
- `dcs_remove_airbase_pack`

### force-placement toolset

**When / order:** Resolve exact types and terrain first. Place naval platforms/FARPs before dependent flights.
Choose role and check carrier compatibility before creating the flight. Create complete mixed SAM groups
from site templates, not individual launchers. Create groups before triggers, routes and controller setup
that reference their names. Clone deliberately: inspect copied positions, tasks and names afterwards.

- `dcs_list_flight_roles`
- `dcs_carrier_compatibility`
- `dcs_miz_create_flight`
- `dcs_miz_add_aircraft_group`
- `dcs_miz_add_naval_group`
- `dcs_miz_add_farp`
- `dcs_miz_create_ground_plan`
- `dcs_miz_add_ground_group`
- `dcs_miz_add_units_to_group`
- `dcs_miz_add_train`
- `dcs_miz_clone_group`

### flight-equipment toolset

**When / order:** After flight placement, inspect loadout options, apply a role-appropriate loadout or explicit
payload, then check fuel for the planned sortie. Configure callsigns/livery and radios; verify again when
route or task changes. Radio presets/frequencies must agree with support units and generated dialogue.

- `dcs_list_loadouts`
- `dcs_miz_apply_loadout`
- `dcs_miz_set_payload`
- `dcs_aircraft_fuel`
- `dcs_miz_fuel_report`
- `dcs_miz_configure_flight`
- `dcs_list_callsigns`
- `dcs_list_liveries`
- `dcs_check_livery`
- `dcs_list_radios`
- `dcs_airfield_radio`
- `dcs_miz_set_radio_presets`
- `dcs_miz_reset_radio_presets`
- `dcs_miz_set_intra_flight_frequency`

### site-scenery toolset

**When / order:** Discover scene/site templates or scan a supplied donor mission and import a measured layout.
Check the full footprint at its new location, then place airfield dressing, bases, staging areas, SAM sites,
perimeters and statics. Preserve operational clearance. FARPs themselves are in force-placement; warehouses
are in logistics. Remove imports only for requested library cleanup, not to remove mission objects.

- `dcs_list_site_templates`
- `dcs_import_site_template`
- `dcs_remove_site_template`
- `dcs_list_scene_templates`
- `dcs_scan_scene_candidates`
- `dcs_import_scene_template`
- `dcs_list_scene_imports`
- `dcs_remove_scene_template`
- `dcs_list_terrain_sites`
- `dcs_miz_populate_airfield`
- `dcs_miz_add_scene`
- `dcs_miz_add_perimeter`
- `dcs_miz_add_static`
- `dcs_miz_add_target_area`

### logistics toolset

**When / order:** After airfield/ship/FARP ownership and placement, inspect warehouses and configure fuel,
weapons and operating stock. Import a donor when adding stock requires it. Recheck finite supply against
every player/client flight and planned rearming/refuelling. Warehouse presence alone does not prove services.

- `dcs_miz_list_warehouses`
- `dcs_miz_edit_warehouse`
- `dcs_miz_add_warehouse_stock`
- `dcs_import_warehouse_donor`
- `dcs_list_warehouse_donors`

### routes-tasks toolset

**When / order:** Inspect existing routes; create/replace/update waypoints, then add supported tasks/actions.
Use the action catalogue for exact ids/parameters. Add recovery before generating ATC. Configure support
orbits, tanking, FAC/targeting and ground/naval actions explicitly. Transport setup uses supported boarding
and Disembarking tasks. Static SAMs need valid composition/engagement setup rather than arbitrary patrols.
Removing waypoints/tasks can invalidate later references: inspect and validate afterwards.

- `dcs_miz_get_route`
- `dcs_miz_add_waypoint`
- `dcs_miz_set_route`
- `dcs_miz_update_waypoint`
- `dcs_miz_remove_waypoint`
- `dcs_miz_set_group_task`
- `dcs_list_waypoint_actions`
- `dcs_miz_add_waypoint_action`
- `dcs_miz_add_waypoint_task`
- `dcs_miz_modify_waypoint_task`
- `dcs_miz_remove_waypoint_task`
- `dcs_miz_set_waypoint_task_enabled`
- `dcs_miz_add_surface_task`
- `dcs_miz_add_airfield_landing`
- `dcs_miz_add_carrier_recovery`
- `dcs_miz_make_troop_transport`

### mission-scripting toolset

**When / order:** Load libraries early with the ordered loader. Create final group names and zones before
dependent triggers/IADS setup. Read compiler capabilities before choosing conditions/actions; add flags,
activation, reserves and goals, then inspect resulting triggers. Configure IADS once SAM/EWR membership is
known, after its libraries in the same start trigger. A framework loaded successfully is not a configured
IADS or proof of engagement. Director audio placeholders are not playable voices.

- `dcs_miz_load_scripts`
- `dcs_miz_configure_iads`
- `dcs_miz_trigger_capabilities`
- `dcs_miz_add_trigger_zone`
- `dcs_miz_add_quad_zone`
- `dcs_miz_list_zones`
- `dcs_miz_points_in_zone`
- `dcs_miz_update_zone`
- `dcs_miz_remove_zone`
- `dcs_miz_add_trigger`
- `dcs_miz_list_triggers`
- `dcs_miz_update_trigger`
- `dcs_miz_replace_trigger`
- `dcs_miz_remove_trigger`
- `dcs_miz_add_counter`
- `dcs_miz_add_unit_activation`
- `dcs_miz_add_reactive_spawn`
- `dcs_miz_set_dynamic_spawn`
- `dcs_miz_direct_mission`
- `dcs_miz_add_goal`
- `dcs_miz_list_goals`
- `dcs_miz_get_goal`
- `dcs_miz_modify_goal`
- `dcs_miz_remove_goal`

### voice-comms toolset

**When / order:** After final routes, callsigns, frequencies, controllers and recovery exist, use the `atc`
argument on flight creation/configuration for scripted ATC. Prefer configuring it at this final stage to
avoid stale briefing/route audio; replacing existing ATC requires `atc.replace=true`. For control centre,
JTAC, GCI, AWACS and custom lines, generate speech or convert supplied audio, then attach the returned file
to supported trigger sound/radio actions. Inspect resources/assets and validate. Spoken calls require a
voice provider and FFmpeg; a radio transmission also needs a matching tuned receiver. Test playback live.

- `dcs_audio_convert`
- `dcs_miz_list_resources`

Flight configuration belongs to flight-equipment; trigger creation belongs to mission-scripting. Combine
those tools with this set rather than inventing a separate controller voice API.

### presentation toolset

**When / order:** After the plan, threats and comms are final, write coalition briefings and embed briefing
images/kneeboards. Add reference drawings/threat rings using known coordinates and map icons. Inspect assets
and drawings before deleting them; replacing a picture does not update a stale briefing automatically.

- `dcs_miz_get_briefing`
- `dcs_miz_set_briefing`
- `dcs_miz_embed_asset`
- `dcs_miz_list_assets`
- `dcs_miz_remove_asset`
- `dcs_list_map_icons`
- `dcs_miz_add_drawing`
- `dcs_miz_add_threat_ring`
- `dcs_miz_list_drawings`
- `dcs_miz_remove_drawing`
- `dcs_miz_clear_drawing_layer`

### inspect-edit toolset

**When / order:** For revisions, list/find/get the affected groups/units first. Prefer typed updates and moves;
use raw field access only when the supported tools cannot express a required change. Renames/removals may
affect tasks, goals, scripts and triggers: inspect dependencies, avoid forced dangling references, validate,
then save/checkpoint. Moving a ground unit also requires fresh terrain checks.

- `dcs_miz_list_groups`
- `dcs_miz_find_groups_near`
- `dcs_miz_get_group`
- `dcs_miz_get_unit`
- `dcs_miz_update_group`
- `dcs_miz_modify_unit`
- `dcs_miz_move_group`
- `dcs_miz_move_unit`
- `dcs_miz_rename_group`
- `dcs_miz_rename_unit`
- `dcs_miz_remove_group`
- `dcs_miz_remove_unit`
- `dcs_miz_get_value`
- `dcs_miz_set_value`

### validation toolset

**When / order:** Recompute current-state reports after all edits; check historical scope where requested.
Fix every structural error and assess warnings before saving. For production use saved-byte validation too.
Offline success does not prove taxi clearance, framework behaviour, support service, dialogue or outcomes.

- `dcs_miz_validate`
- `dcs_miz_mission_report`
- `dcs_miz_historical_report`

### live-control toolset

**When / order:** Only after flight testing/live changes are authorised and the bridge reports a running
mission. Read identity/state before acting. Load the exact returned saved path, observe the running identity
and inspect logs; a load request does not prove success and cannot start from the cold main menu. Live
spawning changes the running simulation, not the offline mission or its saved revision.

- `dcs_load_mission`
- `dcs_get_mission_info`
- `dcs_get_self_data`
- `dcs_get_all_units`
- `dcs_get_aircraft_list`
- `dcs_runtime_inspect`
- `dcs_spawn_unit`
- `dcs_send_message`

### live-aircraft toolset

**When / order:** In an authorised running mission, inspect aircraft and documented options before changing
AI tasks/options. Register support flights before inspecting their lifecycle or verifying transport evidence;
remove registrations when requested. Live detection/service evidence has bounded retention. An orbit alone
does not prove AWACS/tanker service, and live task changes do not edit the saved mission.

- `dcs_aircraft_detect`
- `dcs_aircraft_inspect_options`
- `dcs_aircraft_set_option`
- `dcs_aircraft_task`
- `dcs_support_flight_register`
- `dcs_support_flight_inspect`
- `dcs_support_flight_remove`
- `dcs_transport_verify`

### acceptance toolset

**When / order:** For capability acceptance testing, generate the kit, inspect the job, perform its required
flight, collect evidence, then check results against declared expectations. Keep generated/offline checks
distinct from live evidence. For a user's mission revision use production capture/status as well.

- `dcs_acceptance_generate`
- `dcs_acceptance_job`
- `dcs_acceptance_collect`
- `dcs_acceptance_check`

### campaign toolset

**When / order:** Only when linked sorties/campaigns are requested. Generate scenario stages or read an
existing `.cmp`; write a real campaign with score intervals covering 0-100 and missions beside it. Step the
campaign to inspect advancement/repeat/retreat. A generated transition manifest is not itself a `.cmp`.
Apply the mission workflow and verification to each sortie.

- `dcs_campaign_generate`
- `dcs_campaign_read`
- `dcs_campaign_write`
- `dcs_campaign_step`
