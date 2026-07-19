import type Anthropic from '@anthropic-ai/sdk';
import { getReadonlyPool } from '../db';
import type { AgentTool } from './types';

/**
 * KÖTELEZŐ SAJÁT TOOL (kódolós).
 * Kilistázza a katalógus ÖSSZES kategóriáját: SELECT DISTINCT category.
 *
 * Miért külön tool és nem sima runSql? Mert így a modell determinisztikusan,
 * a séma ismerete nélkül is le tudja kérni a VALÓS kategórianeveket, mielőtt
 * kategóriára szűrne — ez csökkenti a "kitalált kategória" (hallucináció) esélyét.
 */
const inputSchema: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {},
};

export const listCategoriesTool: AgentTool = {
  definition: {
    name: 'list_categories',
    description:
      'Visszaadja a katalógusban szereplő ÖSSZES növénykategóriát (SELECT DISTINCT category). ' +
      'Használd, ha a felhasználó kategóriákra kérdez, vagy MIELŐTT kategóriára szűrnél, ' +
      'hogy a valóban létező kategórianeveket használd (ne találj ki nem létező kategóriát).',
    input_schema: inputSchema,
  },

  async run() {
    const pool = getReadonlyPool();
    const result = await pool.query<{ category: string }>(
      'SELECT DISTINCT category FROM products ORDER BY category',
    );
    const categories = result.rows.map((r) => r.category);
    return { categories, count: categories.length };
  },
};
