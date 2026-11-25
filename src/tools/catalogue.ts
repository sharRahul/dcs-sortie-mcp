import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildResult } from './format.js';
import { packagePath } from '../paths.js';

/** The mission-production guides, served through this tool as well as resources: some clients never let the model read a resource. */
const GUIDES = { archetypes: 'mission-archetypes.md', checklist: 'mission-content.md' } as const;

/**
 * guide=scenario: the shipped example specifications for dcs_scenario_validate/generate. No topic = the examples
 * README (what each one is, how to use them) plus the file list; topic = the full JSON of the example whose file
 * name or "name" field matches every word. Found live: a model read the plugin's source to learn the spec shape.
 */
export async function readScenarioGuide(topic = ''): Promise<{ guide: string; topic?: string; sections: string[]; text: string }> {
  const dir = packagePath('examples', 'scenarios');
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
  const words = topic.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) {
    const readme = await readFile(path.join(dir, 'README.md'), 'utf8');
    return { guide: 'scenario', sections: files, text: `${readme}\n\nFull example specifications: dcs_tool_catalogue guide=scenario topic=<file or mission name>. Files: ${files.join(', ')}` };
  }
  for (const f of files) {
    const text = await readFile(path.join(dir, f), 'utf8');
    let name = '';
    try { name = String((JSON.parse(text) as { name?: unknown }).name ?? ''); } catch { /* listed by file name only */ }
    if (words.every(w => `${f} ${name}`.toLowerCase().includes(w))) return { guide: 'scenario', topic, sections: files, text };
  }
  throw new Error(`No scenario example matches '${topic}'. Files: ${files.join(', ')}`);
}

/** One guide, or the `### ` section of it that best matches every word of `topic` (heading first, then body). */
export async function readGuide(guide: keyof typeof GUIDES | 'scenario', topic = ''): Promise<{ guide: string; topic?: string; sections: string[]; text: string }> {
  if (guide === 'scenario') return readScenarioGuide(topic);
  const text = await readFile(packagePath('skills', 'dcs-mission-production', 'references', GUIDES[guide]), 'utf8');
  const lines = (x: string) => x.split(/\r?\n/);
  const parts = text.split(/\r?\n(?=### )/);
  const sections = parts.slice(1).map(x => lines(x)[0].replace(/^###\s*/, ''));
  const words = topic.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { guide, sections, text };
  const hit = parts.slice(1).filter(x => words.every(w => x.toLowerCase().includes(w)));
  const best = hit.find(x => words.every(w => lines(x)[0].toLowerCase().includes(w))) ?? hit[0];
  if (!best) throw new Error(`No ${guide} section matches '${topic}'. Sections: ${sections.join('; ')}`);
  return { guide, topic, sections, text: best.trim() };
}

export interface CatalogueEntry { name: string; description: string; title?: string; inputSchema?: unknown; annotations?: Record<string, unknown> }
export function captureCatalogue(server: McpServer, selected?: Set<string>) {
  const entries = new Map<string, CatalogueEntry>(), schemas = new Map<string, unknown>();
  const known = new Set<string>();
  const register = server.registerTool.bind(server) as (...args: any[]) => any;
  server.registerTool = ((name: string, config: Omit<CatalogueEntry, 'name'>, callback: unknown) => {
    if (known.has(name)) throw new Error(`Duplicate MCP tool '${name}'`);
    known.add(name);
    const tool = register(name, config, callback);
    if (selected && !selected.has(name)) tool.disable();
    else { entries.set(name, { ...config, name }); schemas.set(name, config.inputSchema); }
    return tool;
  }) as typeof server.registerTool;
  return { entries, schemas, known };
}
export function registerCatalogueTool(server: McpServer, entries: Map<string, CatalogueEntry>) {
  server.registerTool('dcs_tool_catalogue', {
    title: 'Find DCS Sortie MCP tools', description: 'Search the complete registered tool catalogue by name/description. Paginated summaries and capability annotations help discover composable tools without duplicating wrappers. Standard MCP tools/list remains unchanged. guide=archetypes returns the mission-type recipes (deep interdiction, Fulda Gap, emergency CAS, SEAD, scramble, fleet defense, CAP, escort, convoy/SCUD hunt, helicopter ops, strike package, historical, night); add topic=<words> for one recipe. guide=checklist returns the mission build order and complete toolsets; add topic=<toolset id> (e.g. terrain-placement, mission-scripting, voice-comms) for when to use that set, prerequisites, calling order and its tools. guide=scenario returns the example specifications for dcs_scenario_validate/generate (topic=<name> for one full JSON to copy and edit).',
    inputSchema: z.object({ guide: z.enum(['archetypes', 'checklist', 'scenario']).optional(), topic: z.string().max(200).default(''), query: z.string().max(200).default(''), offset: z.number().int().nonnegative().default(0), limit: z.number().int().min(1).max(50).default(20) }).strict(),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ guide, topic, query, offset, limit }) => {
    if (guide) {
      try { const g = await readGuide(guide, topic); return buildResult(g.text, g); }
      catch (e) { return { isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] }; }
    }
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = [...entries.values()].filter(e => words.every(w => `${e.name} ${e.description}`.toLowerCase().includes(w))).sort((a, b) => a.name.localeCompare(b.name));
    const data = { total: matches.length, offset, nextOffset: offset + limit < matches.length ? offset + limit : null,
      tools: matches.slice(offset, offset + limit).map(e => ({ name: e.name, title: e.title ?? e.name, description: e.description.split('\n')[0].slice(0, 500), annotations: e.annotations ?? {} })) };
    return buildResult(JSON.stringify(data), data);
  });
}
