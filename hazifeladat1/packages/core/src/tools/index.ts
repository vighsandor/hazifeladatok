import { runSqlTool } from './runSql';
import { listCategoriesTool } from './listCategories';
import type { AgentTool } from './types';

/** Az agent számára elérhető összes tool. */
export const allTools: AgentTool[] = [runSqlTool, listCategoriesTool];

/** Név -> tool leképezés a gyors kereséshez a tool-use loopban. */
export const toolByName: Record<string, AgentTool> = Object.fromEntries(
  allTools.map((t) => [t.definition.name, t]),
);

export type { AgentTool } from './types';
export { runSqlTool } from './runSql';
export { listCategoriesTool } from './listCategories';
export { assertReadOnlySelect, MAX_ROWS } from './sql-guard';
