# Mission archetypes

Mission types that come up again and again in DCS gameplay videos. Each one is written as a
recipe: what the player does, what has to be on the map, the trigger logic, and which tools build
it. Use it to turn a short request ("Fulda Gap A-10 against a tank push") into a full build plan.
Then follow `dcs://skills/mission-production/checklist` for build order.

Source: a title survey of two DCS gameplay YouTube channels, November 2026.
Only the themes were taken from it. Every unit, route, timing and outcome below is still the
author's to choose, from the catalogue (`dcs_list_unit_types`, `dcs_country_inventory`) and the
terrain checks. Nothing in this page is real procedure or a real order of battle.

Status column: **live** = the building blocks have flown in DCS (see the acceptance matrix);
**offline** = authored and validated but not flown; **gap** = this server cannot build it.

## Quick map

| # | Archetype | Typical aircraft | Core tools | Status |
|---|---|---|---|---|
| 1 | Behind enemy lines / deep interdiction | F-16C, F-15E, F/A-18C, F-117, Mirage 2000 | create_flight, add_threat_ring, configure_iads, add_target_area, add_goal | live |
| 2 | Cold War breakthrough (Fulda Gap) | A-10C, AH-64D, F-4E, AV-8B, F-5E | create_ground_plan, add_reactive_spawn, add_target_area | live |
| 3 | Emergency CAS: troops in contact | A-10C, AH-64D, F/A-18C, Su-25T, Harrier | add_ground_group, add_trigger_zone, add_reactive_spawn, direct_mission | live |
| 4 | SEAD / Wild Weasel / "SAM alley" | F-16C, F-4E, F-100D, F/A-18C | list_site_templates, configure_iads, load_scripts (Skynet) | live |
| 5 | Airbase under attack: scramble | F-16C, F-15C, MiG-29, F-4E | create_flight (hot/runway start), add_reactive_spawn, set_airbase_coalition | live |
| 6 | Highway (Autobahn) scramble | F-4E, F-100D, A-10C, F-5E | airbase_build_pack, create_flight | gap / check |
| 7 | Fleet defense / carrier group under attack | F/A-18C, F-14B | add_naval_group, create_flight (carrier start), add_carrier_recovery | partial |
| 8 | CAP / No-fly zone / airspace sanitization | F-15C, F-14B, F/A-18F, Su-27 | create_flight (CAP/AWACS), add_reactive_spawn, add_goal | live |
| 9 | Intercept / escort (HVA, bomber, tanker, transport) | F-15C, F-22 mod, Su-27, J-11 | create_flight, add_waypoint_task, add_goal | offline |
| 10 | Convoy hunt / SCUD hunt / VBIED | AH-64D, A-10C, F-14B, F-16C | create_ground_plan, add_reactive_spawn, add_counter | live |
| 11 | Helicopter ops: crash-site security, insertion, MEDEVAC cover | AH-64D, UH-1H, UH-60 mod, CH-47F | add_farp, make_troop_transport, add_reactive_spawn | partial |
| 12 | Strategic strike package (bombers + escort + cruise missiles) | B-52/B-1 (AI), F-15C, F/A-18C | create_flight (several), add_waypoint_task, direct_mission | offline |
| 13 | Historical re-creation (Desert Storm, Vietnam, Six-Day War, Korea) | era aircraft | dcs_service_date_check, dcs_country_inventory | offline |
| 14 | Night / bad-weather strike | F-15E, F-16C, A-10C | set_weather, set_cloud_preset, configure_mission (time) | offline |

## Recipes

### 1. Behind enemy lines / deep interdiction
Player ingresses through a layered air defense to one high-value target and has to get out again.
Common sub-themes: a mobile missile launcher (TEL), a rocket artillery battery, a radar, or a stealth strike.
- Map: target compound (`dcs_list_scene_templates` or `add_target_area`); 2-3 SAM sites in
  layers (`dcs_list_site_templates`, prefer the editor's `me-*` batteries); EWR; one or two
  CAP flights, late-activated.
- Logic: Skynet IADS (`configure_iads`) so radars go dark and come up; zone entry on the
  ingress corridor activates the CAP (`add_reactive_spawn`); `add_goal` on target destroyed plus
  return to a friendly zone (egress is part of the win, as in the example scenarios).
- Check: `dcs_check_terrain` every ground point when DCS is live; SAMs on flat land.

### 2. Cold War breakthrough (Fulda Gap)
Armour pushes west on a main road while the player blunts it. Variants: a bridge crossing, a
mechanized company, an anti-aircraft gun trap guarding the column.
- Map: Germany Cold War theatre if installed (`dcs_install_report`); a Soviet armour column
  on a road (`create_ground_plan`, road points from `dcs_terrain_roads` when live); NATO
  defensive line; mobile air defense (Shilka/Tunguska/SA-8) travelling with the column.
- Logic: waves on timers or on defensive-line losses (`add_reactive_spawn`, `c_group_dead`);
  fail if the column reaches the objective zone.
- Era: `dcs_service_date_check` against the mission date. Mod or unbundled theatres need an
  airbase pack for airfield starts.

### 3. Emergency CAS: troops in contact
Friendly troops are under fire, and the player arrives on a tight timer. Variants: a peacekeeping
force under attack, a show of force, MEDEVAC cover.
- Map: friendly infantry/vehicles inside a zone; enemy ground groups closing on them;
  optional JTAC (JTAC service itself is unverified).
- Logic: start message as the 9-line style briefing (fictional text); `c_time_after` deadline
  to fail if the friendlies' life drops below a threshold (`group_life_less`); success when the
  enemy groups are dead. `direct_mission` for the radio/briefing cues (subtitles if no audio).

### 4. SEAD / Wild Weasel / "SAM alley"
Kill or suppress SAM sites so a strike can get through. Variants: one site at a time (SA-2, SA-3,
SA-6, SA-11, S-300), Patriot against Su-25T, a stand-off glide-bomb SEAD.
- Map: site templates with real compositions (a launcher-only group never fires); EWR
  coverage; a friendly strike package that waits.
- Logic: Skynet; the strike package pushes on a flag set when the radar group is dead.
  Note `c_group_dead` fires on the launchers before every radar reports dead (CLAUDE.md).

### 5. Airbase under attack: scramble
The enemy strikes the player's base. The player takes off under fire. Variants: a surprise
strike on a US base, ballistic missiles, a drone swarm.
- Map: player `parking_hot` or runway start; populated ramp (`populate_airfield`, default
  occupancy); inbound strike group air-started at a distance.
- Logic: the attackers are active at t=0 with a short run-in; protect-asset failure
  (`unit_dead` on parked statics or a command post); optional base SHORAD.
- Ownership: the side must own the airfield (`claimStartAirfields` / `set_airbase_coalition`).

### 6. Highway (Autobahn) scramble
Dispersed operations from a road strip.
- Gap: road strips are airbases only if DCS exposes them on that theatre. Check
  `dcs_airbase_build_pack` from a running Germany Cold War mission; if the strip is listed,
  it can be used as a parking start like any airbase. Otherwise use an air start near the
  road and say so in the briefing.

### 7. Fleet defense / carrier group under attack
- Map: carrier group (`add_naval_group`; keep ~1 km spacing, closer escorts collided);
  anti-ship bombers with escorts; player deck start on the carrier.
- Logic: raids in waves (`add_reactive_spawn` on timers); fail on carrier loss.
- Unverified: launch/recovery flown by a player (`add_carrier_recovery` writes the plan only).

### 8. CAP / no-fly zone / airspace sanitization
- Map: player CAP racetrack, AWACS (`create_flight` role awacs), random-ish bandit groups.
- Logic: `random_less` picks which bandit wave launches (`add_reactive_spawn`); success after N
  kills (`add_counter`) or when the time on station ends. That gives the "anything can happen"
  replay value the dynamic videos are named for.

### 9. Intercept / escort
Escort or protect a high-value aircraft (Air Force One, a tanker, a transport, a maritime
patrol plane), or intercept one (a spy plane, a bomber stream, a drone).
- Logic: protect = `unit_dead` on the escorted unit fails the mission; intercept = the target
  flies a long route toward a zone, and reaching it is failure.
- Mod aircraft (F-22, F-15EX, Su-57, SR-71): resolve with `dcs_list_unit_types`; a type that is
  not installed shows `MOD_NOT_DEPLOYED` / `TYPE_NOT_ON_THIS_MACHINE`. Never swap types silently.

### 10. Convoy hunt / SCUD hunt / VBIED
- Map: moving convoy on roads (rail points from `dcs_terrain_roads` for trains); decoys;
  launchers that appear late.
- Logic: launchers activate on a random timer and move (`add_reactive_spawn`); a counter of
  launches is the failure clock.

### 11. Helicopter operations
Secure a crash site, cover a special-forces insertion, or reinforce a small base.
- Map: FARP with support (`add_farp support:true`); keep FARPs well away from airfields (a FARP
  3 km from Kutaisi made AI return landings fail, 21 Nov); troop lift (`make_troop_transport`).
- Verified: FARP cold start and AI landing on the pad. **Not** verified: troop boarding, and AI
  being refuelled at the FARP (it is not, after 10 min parked).

### 12. Strategic strike package
- Map: AI bombers with their own escorts, cruise-missile shooters (ships), SEAD lead; the
  player escorts or leads.
- Logic: time-on-target sequencing with flags; `direct_mission` phases for the briefing cues.

### 13. Historical re-creations
Recurring periods: Desert Storm (1991), Vietnam, the Six-Day War, Korea, the Falklands, and
Israeli strikes (Lebanon 1982, Osirak).
- Check every type with `dcs_service_date_check` against the mission date; use
  `dcs_country_inventory` for which countries flew what (Wikipedia-based, partial).
- Describe it as inspired by the event. Never claim the order of battle or the timings are accurate.

### 14. Night / bad-weather strike
- `set_weather`, `set_cloud_preset`, mission start time after dusk; NVG/IR targets need
  illumination or self-lasing. The wind is stored blow-TOWARD (ATC runway pick uses it).

## Not buildable here (say so instead of improvising)
- Player-flown carrier recovery checks, live JTAC laser service, automatic CSAR pickup, and
  refuelling AI at a FARP.
- PvP server persistence, dynamic campaign servers, mod scripts that are not installed.
- Real radio procedures: built-in dialogue is fictional; spoken ATC needs a voice provider.
