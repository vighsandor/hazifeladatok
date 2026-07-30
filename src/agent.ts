import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { CodeGen } from './codegen';
import { Executor } from './executor';
import { TemplateContext } from './types';
import { log } from './logger';

export class Agent {
  private parser = new Parser();
  private codegen = new CodeGen();
  private executor = new Executor();

  async run(skillPath: string, outputDir: string): Promise<void> {
    try {
      log.info(`Starting agent with skill: ${skillPath}`);

      const config = await this.parser.parseSkillFile(skillPath);
      log.info('Skill parsed and validated');

      const coordinates = await this.parser.loadCoordinates(config.data.coordinatesRef);
      const seedData = await this.parser.loadSeed(config.data.seedFile);

      const context: TemplateContext = {
        config,
        coordinates,
        seedData: seedData.map((c: any) => ({
          name: c.name,
          city: c.location.city,
          budget: c.budget,
          note: c.note,
        })),
      };

      log.info('Generating files...');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      await this.codegen.generateFiles(context, outputDir);

      for (const step of config.steps) {
        await this.executor.executeStep(step, outputDir);
      }

      log.info('Agent completed successfully');
    } catch (err) {
      log.error('Agent failed', err as Error);
      throw err;
    }
  }
}

export const agent = new Agent();
