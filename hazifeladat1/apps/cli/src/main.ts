#!/usr/bin/env -S npx tsx
import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { askAgent, closePools } from '@plantbase/core';

const program = new Command();

program
  .name('plantbase')
  .description('plantbase — természetes nyelvű növénykatalógus asszisztens (text-to-SQL)')
  .version('0.1.0');

program
  .command('ask')
  .description('Egyetlen kérdés feltevése az agentnek')
  .argument('<question...>', 'a kérdés (idézőjel nélkül is megadható)')
  .option('--show-prompt', 'a rendszerprompt és a tool-ok kiírása', false)
  .action(async (parts: string[], opts: { showPrompt?: boolean }) => {
    const question = parts.join(' ');
    try {
      const { answer, steps, logFile } = await askAgent(question, { showPrompt: opts.showPrompt });
      console.log('\n' + answer + '\n');
      console.error(`(lépések: ${steps} · napló: ${logFile})`);
    } catch (err) {
      console.error('Hiba:', err instanceof Error ? err.message : err);
      process.exitCode = 1;
    } finally {
      await closePools();
    }
  });

program
  .command('chat')
  .description('Interaktív beszélgetés az agenttel (kilépés: exit / quit / kilépés)')
  .option('--show-prompt', 'a rendszerprompt kiírása az első kérdésnél', false)
  .action(async (opts: { showPrompt?: boolean }) => {
    const rl = createInterface({ input, output });
    console.log('🌱 plantbase chat — kérdezz a növénykatalógusról! (kilépés: exit)\n');
    let first = true;
    try {
      while (true) {
        const question = (await rl.question('🌱 > ')).trim();
        if (!question) continue;
        if (['exit', 'quit', 'kilépés'].includes(question.toLowerCase())) break;
        try {
          const { answer } = await askAgent(question, {
            showPrompt: first && opts.showPrompt,
          });
          console.log('\n' + answer + '\n');
        } catch (err) {
          console.error('Hiba:', err instanceof Error ? err.message : err, '\n');
        }
        first = false;
      }
    } finally {
      rl.close();
      await closePools();
    }
  });

program.parseAsync().catch(async (err) => {
  console.error(err);
  await closePools();
  process.exit(1);
});
