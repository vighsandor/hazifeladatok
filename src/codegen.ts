import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { TemplateContext } from './types';
import { log } from './logger';

export class CodeGen {
  private templatesDir = path.join(__dirname, 'templates');

  async generateFiles(context: TemplateContext, outputDir: string): Promise<void> {
    const templates = [
      { src: 'package.json.hbs', dest: 'package.json' },
      { src: '.env.example.hbs', dest: '.env.example' },
      { src: '.gitignore.hbs', dest: '.gitignore' },
      { src: 'index.ts.hbs', dest: 'src/index.ts' },
      { src: 'db.ts.hbs', dest: 'src/db.ts' },
      { src: 'routes.ts.hbs', dest: 'src/routes.ts' },
      { src: 'geo.ts.hbs', dest: 'src/geo.ts' },
      { src: 'seed.ts.hbs', dest: 'src/seed.ts' },
      { src: '001-init.sql.hbs', dest: 'migrations/001-init.sql' },
      { src: 'geo.test.ts.hbs', dest: '__tests__/geo.test.ts' },
    ];

    for (const { src, dest } of templates) {
      await this.renderAndWrite(src, dest, context, outputDir);
    }

    log.info(`Generated ${templates.length} files in ${outputDir}`);
  }

  private async renderAndWrite(
    templateFile: string,
    destPath: string,
    context: any,
    outputDir: string
  ): Promise<void> {
    try {
      const templatePath = path.join(this.templatesDir, templateFile);
      const content = fs.readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(content);
      const rendered = template(context);

      const fullPath = path.join(outputDir, destPath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, rendered, 'utf-8');
      log.info(`Generated: ${destPath}`);
    } catch (err) {
      log.error(`Failed to generate ${destPath}`, err as Error);
      throw err;
    }
  }

  render(template: string, context: any): string {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  }
}

export const codegen = new CodeGen();
