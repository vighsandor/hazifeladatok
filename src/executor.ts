import { execSync } from 'child_process';
import { Step } from './types';
import { log } from './logger';

export class Executor {
  async executeStep(step: Step, cwd: string): Promise<void> {
    log.info(`Executing step: ${step}`);

    try {
      switch (step) {
        case 'npm-install':
          this.exec('npm install', cwd);
          break;
        case 'migrate-db':
          this.exec(`psql ${process.env.DATABASE_URL} < migrations/001-init.sql`, cwd);
          break;
        case 'seed-data':
          this.exec('npm run seed', cwd);
          break;
        case 'run-tests':
          this.exec('npm test', cwd);
          break;
        default:
          log.warn(`Unknown step: ${step}`);
      }
    } catch (err) {
      log.error(`Step '${step}' failed`, err as Error);
      throw err;
    }
  }

  private exec(cmd: string, cwd: string): void {
    try {
      execSync(cmd, {
        cwd,
        stdio: 'inherit',
        encoding: 'utf-8',
        env: process.env,
      });
      log.info(`Command succeeded: ${cmd}`);
    } catch (err) {
      log.error(`Command failed: ${cmd}`, err as Error);
      throw err;
    }
  }
}

export const executor = new Executor();
