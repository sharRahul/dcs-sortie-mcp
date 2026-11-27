# Project presentation and demonstration

Use real product output for the README and promotion. No recorded demonstration
is included by this document. Capture the same mission from chat through DCS;
keep its prompt, generated file, application version and DCS version together.

## Repository description

Suggested GitHub About text:

> Create, edit and validate DCS World missions with your AI assistant. Natural-language mission building, existing .miz editing and optional live DCS tools.

Suggested topics: `dcs`, `dcs-world`, `mission-editor`, `flight-simulator`,
`mcp`, `model-context-protocol`, `mission-planning`.

These are proposed repository settings, not settings applied by this change.

## Record a 30-second demonstration

Use the README's Caucasus/Su-25T quick-start prompt so viewers can reproduce it
with the maps and aircraft included with DCS. First generate, validate, open and
fly the mission. Fix any issues before recording the final take.

| Time | Real footage | Caption |
| --- | --- | --- |
| 00–05 | Mission Editor with the intended route and player setup visible | “An idea for your next DCS mission?” |
| 05–12 | The prompt and actual assistant tool activity | “Describe your sortie.” |
| 12–20 | The saved file opening in Mission Editor; show its aircraft, route and briefing | “Open your generated mission in DCS World.” |
| 20–27 | Cockpit footage from that same mission, with the aircraft flying | “Fly it. Then refine it in chat.” |
| 27–30 | Project name and repository URL | “DCS Sortie MCP — From mission idea to DCS World.” |

Generation and simulator loading may take longer than the edit. Label skipped
time or sped-up footage; the video's duration is not a mission-generation claim.
Hide account details, keys, personal paths and unrelated chats. Keep captions
readable without sound and provide a transcript for the full video.

Export a captioned 30-second video and a short README GIF showing prompt,
Mission Editor result and cockpit. Link the GIF to the full video. Add it below
the README's opening links only after the asset exists, with descriptive alt text.
Do not substitute a conceptual diagram or generated cockpit art for product footage.

## Example mission downloads

The current [examples](../../examples/scenarios/README.md) are JSON source
specifications with generation instructions and verification scope. Before
offering ready-to-fly downloads, generate clean `.miz` archives from those sources,
check them in the current DCS version and attach them to a release. Include:

- The source specification and project version used to generate each file.
- Required terrain and aircraft, player start, objective and expected duration.
- Validation results and the exact native checks performed, including whether
  cockpit entry or a complete sortie was tested.

Link the existing [verification record](verification.md); retain its limits.
Do not label every example fully flight-tested based on structural validation
or a successful cockpit start.

## Distribution after recording

Use the same genuine footage for a YouTube Short and community demonstrations.
Lead with the mission result, include the repository link and describe setup
requirements. Tailor captions to the audience and follow each community's posting
rules. Posting and any paid promotion require a separate decision from preparing
these materials.

For a GitHub social preview, use a frame from the recorded Mission Editor result,
the project name and “From mission idea to DCS World.” Check text readability at
thumbnail size before uploading.
