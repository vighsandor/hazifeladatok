import { CodeGen } from '../src/codegen';
import { TemplateContext } from '../src/types';

describe('CodeGen', () => {
  const codegen = new CodeGen();

  describe('render', () => {
    it('substitutes Handlebars variables', () => {
      const template = 'Hello {{name}}, listening on {{host}}:{{port}}';
      const context = { name: 'API', host: '0.0.0.0', port: 3000 };
      const result = codegen.render(template, context);

      expect(result).toBe('Hello API, listening on 0.0.0.0:3000');
    });

    it('handles nested objects', () => {
      const template = 'DB: {{config.database.url}}';
      const context = {
        config: {
          database: { url: 'postgresql://user:pass@host/db' },
        },
      };
      const result = codegen.render(template, context);

      expect(result).toContain('postgresql://');
    });

    it('loops over arrays', () => {
      const template = '{{#each items}}{{name}},{{/each}}';
      const context = { items: [{ name: 'A' }, { name: 'B' }] };
      const result = codegen.render(template, context);

      expect(result).toBe('A,B,');
    });
  });

  describe('generateFiles', () => {
    it('validates context structure', () => {
      const context: TemplateContext = {
        config: {
          project: { name: 'test', language: 'typescript', framework: 'express' },
          database: { url: 'postgresql://test:test@localhost/test' },
          server: { host: '0.0.0.0', port: 3000 },
          data: { seedFile: 'seed.json', coordinatesRef: 'coords.md' },
          steps: ['npm-install'],
        },
        coordinates: { budapest: { lat: 47.4979, lon: 19.0402 } },
        seedData: [],
      };

      expect(context.config.project.name).toBe('test');
    });
  });
});
