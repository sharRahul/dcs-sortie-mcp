import {readFile} from 'node:fs/promises';
import {packagePath} from '../paths.js';
/**
 * MCP resources (reference material a client can read into context) and
 * prompts (ready-made workflows). Clients that never read CLAUDE.md get the
 * same conventions from here.
 */
import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONVENTIONS_GUIDE } from "../guide.js";
import { countries, theatres, unitTypes, type UnitCategory } from "../data/reference.js";
import { allSiteTemplates } from "../miz/templates.js";
import { xyToLatLon } from "../miz/projection.js";

const json = (uri: string, data: unknown) => ({
  contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }],
});

const CATEGORIES: UnitCategory[] = ["plane", "helicopter", "vehicle", "ship", "static"];

export function registerResources(server: McpServer): void {
  for (const [name, uri, relative] of [
    ['mission-production-skill','dcs://skills/mission-production','SKILL.md'],
    ['mission-production-contracts','dcs://skills/mission-production/contracts','references/workflow.md'],
    ['mission-content-checklist','dcs://skills/mission-production/checklist','references/mission-content.md'],
    ['mission-archetypes','dcs://skills/mission-production/archetypes','references/mission-archetypes.md'],
  ] as const) server.registerResource(name,uri,{title:name==='mission-production-skill'?'DCS mission production skill':name==='mission-content-checklist'?'Mission build order and toolsets':name==='mission-archetypes'?'Mission archetypes':'Mission production tool contracts',description:name==='mission-content-checklist'?'Mission execution order and complete toolsets: when to call every tool, prerequisites, platforms/flights, ordered Lua, payloads, terrain, scenery, routes/logic, voices and validation.':name==='mission-archetypes'?'Fourteen common mission types (deep interdiction, Fulda Gap, emergency CAS, SEAD, scramble, fleet defense, CAP, escort, convoy/SCUD hunt, helicopter ops, strike package, historical, night) as build recipes with tools and verified status.':'Built-in workflow for planning, generation, validation, revision and flight evidence.',mimeType:'text/markdown'},async address=>({contents:[{uri:address.href,mimeType:'text/markdown',text:await readFile(packagePath('skills','dcs-mission-production',relative),'utf8')}]}));

  server.registerResource(
    "conventions",
    "dcs://guide/conventions",
    {
      title: "DCS Sortie MCP conventions",
      description: "Coordinates, headings, SAM sites, triggers, editing safety, live-bridge rules.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: CONVENTIONS_GUIDE }] })
  );

  server.registerResource(
    "countries",
    "dcs://reference/countries",
    { title: "DCS countries", description: "Every DCS country id and name.", mimeType: "application/json" },
    async (uri) => json(uri.href, countries())
  );

  server.registerResource(
    "site-templates",
    "dcs://reference/site-templates",
    {
      title: "SAM site templates",
      description: "Air-defence site compositions with provenance.",
      mimeType: "application/json",
    },
    async (uri) => json(uri.href, allSiteTemplates())
  );

  server.registerResource(
    "unit-types",
    new ResourceTemplate("dcs://reference/unit-types/{category}", {
      list: async () => ({
        resources: CATEGORIES.map((c) => ({
          uri: `dcs://reference/unit-types/${c}`,
          name: `unit-types-${c}`,
          title: `DCS ${c} types`,
          mimeType: "application/json",
        })),
      }),
      complete: { category: (value) => CATEGORIES.filter((c) => c.startsWith(value)) },
    }),
    {
      title: "DCS unit types",
      description: "Exact unit type ids per category (plane, helicopter, vehicle, ship, static).",
      mimeType: "application/json",
    },
    async (uri, { category }) => {
      const c = String(category) as UnitCategory;
      if (!CATEGORIES.includes(c)) throw new Error(`Unknown category '${c}'. Use one of ${CATEGORIES.join(", ")}.`);
      return json(uri.href, unitTypes()[c]);
    }
  );

  server.registerResource(
    "airfields",
    new ResourceTemplate("dcs://theatres/{theatre}/airfields", {
      list: async () => ({
        resources: Object.keys(theatres()).map((t) => ({
          uri: `dcs://theatres/${t}/airfields`,
          name: `airfields-${t}`,
          title: `${t} airfields`,
          mimeType: "application/json",
        })),
      }),
      complete: { theatre: (value) => Object.keys(theatres()).filter((t) => t.toLowerCase().startsWith(value.toLowerCase())) },
    }),
    {
      title: "Theatre airfields",
      description: "Airfield ids, names, positions and parking counts for one theatre.",
      mimeType: "application/json",
    },
    async (uri, { theatre }) => {
      const id = String(theatre);
      const t = theatres()[id];
      if (!t) throw new Error(`Unknown theatre '${id}'. Use one of ${Object.keys(theatres()).join(", ")}.`);
      return json(
        uri.href,
        t.airports.map((a) => ({
          id: a.id,
          name: a.name,
          x: a.x,
          y: a.y,
          ...xyToLatLon(id, a.x, a.y),
          parkingSlots: a.slots.length,
        }))
      );
    }
  );
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt('produce_mission',{
    title:'Produce and verify a mission',description:'Plan, generate, validate, revise and collect revision-specific flight evidence using the built-in mission-production skill.',
    argsSchema:{projectDir:z.string().describe('New or existing production project directory'),objective:z.string().describe('Mission intent or revision request'),theatre:z.string().optional().describe('Theatre for a new project')},
  },({projectDir,objective,theatre})=>({messages:[{role:'user',content:{type:'text',text:'Use the built-in skill at dcs://skills/mission-production and its contracts at dcs://skills/mission-production/contracts. Project: '+projectDir+'. '+(theatre?'Theatre: '+theatre+'. ':'')+'Request: '+objective+'\nStart by checking whether the project exists, then resume its status or create its plan. Track immutable mission revisions, saved-byte validation and flight evidence for the current revision. Preserve existing simulator work and the current authorization boundaries.'}}]}));

  server.registerPrompt(
    "build_mission",
    {
      title: "Build a mission",
      description: "Author a complete mission offline, validate it and save it to a new .miz.",
      argsSchema: {
        theatre: z.string().describe("Theatre, e.g. Caucasus, PersianGulf, Syria"),
        objective: z.string().describe("What the mission is about, e.g. 'SEAD against an SA-6 and SA-2 near Kutaisi'"),
        outPath: z.string().describe("Where to save the .miz"),
      },
    },
    ({ theatre, objective, outPath }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Build a DCS mission on ${theatre}: ${objective}. Save it to ${outPath}.\n\n` +
              `For a complete mission production project, read dcs://skills/mission-production and use produce_mission. ` +
              `Read dcs://guide/conventions and dcs_tool_catalogue guide=checklist first. Follow its execution-order ` +
              `table and toolsets (guide=checklist topic=<id> retrieves one set): check installation/exact types and ` +
              `objectives → dcs_miz_new (theatre ${theatre}) and mission settings → place carrier/FARP platforms ` +
              `before their aircraft/helicopters → dcs_miz_load_scripts for requested frameworks in one ordered ` +
              `start trigger → check payloads/fuel → terrain-checked ground forces and scenery → routes, recovery, ` +
              `tasks, IADS setup, zones and outcome triggers → final frequencies, controller voices and briefing → ` +
              `dcs_miz_validate and fix every error → dcs_miz_save_as.\n\n` +
              `Mission saves use DCS_MISSION_OUTPUT_DIR; only the filename of ${outPath} is kept. Use the returned ` +
              `path. Report missing terrain/slope/clearance evidence and all behaviour not observed in DCS; ` +
              `offline terrain analysis needs a sourced grid or matching pack. Flight-test only when authorised.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "diagnose_mission",
    {
      title: "Diagnose a mission",
      description: "Find out why a mission will not open in the editor, will not load, or misbehaves.",
      argsSchema: { path: z.string().describe("Path to the .miz") },
    },
    ({ path }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Diagnose the DCS mission ${path}.\n\n` +
              `1. dcs_status — is DCS up, what phase, and recent log problems.\n` +
              `2. dcs_get_log_errors — the Mission Editor and mission scripts report failures ONLY in dcs.log; ` +
              `look for errors naming the mission or me_mission.lua.\n` +
              `3. dcs_miz_open ${path} → dcs_miz_validate → dcs_miz_list_triggers (uncompiled triggers never fire ` +
              `when flown) → dcs_miz_list_groups.\n` +
              `4. If a mission is running: dcs_check_terrain on ground units' positions (units on water sit inert).\n\n` +
              `Explain the most likely cause first, with the evidence, then what you would change.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "fly_mission",
    {
      title: "Load a mission into DCS",
      description: "Swap a built .miz into a running DCS session and confirm it came up cleanly.",
      argsSchema: { path: z.string().describe("Path to the .miz to load") },
    },
    ({ path }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Load ${path} into DCS and confirm it is running.\n\n` +
              `dcs_bridge_status first: phase must be "running" — dcs_load_mission swaps the mission on an ` +
              `already-running session and cannot start one from the main menu (if DCS is at the menu, ask me to fly ` +
              `any mission first). Then dcs_load_mission, poll dcs_bridge_status until phase goes loading → running, ` +
              `and read dcs_get_log_errors (pass sinceLine from before the load) for anything the load reported.`,
          },
        },
      ],
    })
  );
}
