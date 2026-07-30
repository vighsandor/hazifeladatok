import path from 'path';
import { agent } from './agent';
import { log } from './logger';

const main = async () => {
  const skillPath = process.argv[2] || path.join(process.cwd(), 'skill.md');
  const outputDir = process.argv[3] || process.cwd();

  try {
    await agent.run(skillPath, outputDir);
    process.exit(0);
  } catch (err) {
    log.error('CLI failed', err as Error);
    process.exit(1);
  }
};

main();
