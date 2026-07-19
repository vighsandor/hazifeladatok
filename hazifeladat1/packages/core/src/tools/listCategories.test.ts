import { describe, it, expect } from 'vitest';
import { listCategoriesTool } from './listCategories';
import { runSqlTool } from './runSql';

describe('tool-definíciók', () => {
  it('a list_categories tool helyesen van definiálva', () => {
    expect(listCategoriesTool.definition.name).toBe('list_categories');
    expect((listCategoriesTool.definition.description ?? '').length).toBeGreaterThan(10);
    expect(listCategoriesTool.definition.input_schema.type).toBe('object');
    expect(typeof listCategoriesTool.run).toBe('function');
  });

  it('a run_sql tool helyesen van definiálva és kötelező az sql paraméter', () => {
    expect(runSqlTool.definition.name).toBe('run_sql');
    expect(runSqlTool.definition.input_schema.type).toBe('object');
    expect(runSqlTool.definition.input_schema.required).toContain('sql');
  });
});
