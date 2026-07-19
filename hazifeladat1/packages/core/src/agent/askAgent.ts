import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../env';
import { createRunLogger } from '../logger';
import { SYSTEM_PROMPT } from '../prompt';
import { allTools, toolByName } from '../tools';

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  }
  return client;
}

export interface AskAgentOptions {
  /** Írja-e ki a konzolra a rendszerpromptot és a tool-okat (tanulási céllal). */
  showPrompt?: boolean;
  /** Max. hány modell-körben dolgozhat az agent (végtelen loop ellen). */
  maxSteps?: number;
}

export interface AgentResult {
  answer: string;
  steps: number;
  logFile: string;
}

/**
 * Kézzel írt, több lépéses tool-use loop (nem "beépített" ügynök).
 * A modell választ egy tool-t, mi lefuttatjuk, az eredményt visszaadjuk,
 * és addig ismételjük, amíg a modell szöveges (nem tool) választ nem ad.
 * Minden lépés JSONL-be naplózódik.
 */
export async function askAgent(
  question: string,
  options: AskAgentOptions = {},
): Promise<AgentResult> {
  const env = getEnv();
  const anthropic = getClient();
  const logger = createRunLogger();
  const maxSteps = options.maxSteps ?? 8;

  const toolDefs = allTools.map((t) => t.definition);

  if (options.showPrompt) {
    console.log('\n===== RENDSZERPROMPT =====\n' + SYSTEM_PROMPT);
    console.log('\n===== TOOL-OK =====\n' + toolDefs.map((t) => `- ${t.name}`).join('\n'));
    console.log('\n===== KÉRDÉS =====\n' + question + '\n');
  }

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: question }];
  logger.log({ event: 'run_start', model: env.ANTHROPIC_MODEL, question });

  let steps = 0;
  while (steps < maxSteps) {
    steps += 1;

    const response = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefs,
      messages,
    });

    logger.log({
      event: 'assistant',
      step: steps,
      stop_reason: response.stop_reason,
      content: response.content,
    });

    // A modell teljes válaszát (szöveg + tool-use blokkok) visszafűzzük.
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      const answer = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      logger.log({ event: 'run_end', step: steps, answer });
      return { answer, steps, logFile: logger.file };
    }

    // Végigmegyünk a kért tool-hívásokon, és összegyűjtjük az eredményeket.
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    for (const block of toolUseBlocks) {
      const tool = toolByName[block.name];
      logger.log({ event: 'tool_use', step: steps, name: block.name, input: block.input });

      if (!tool) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          is_error: true,
          content: `Ismeretlen tool: ${block.name}`,
        });
        continue;
      }

      try {
        const output = await tool.run(block.input);
        const content = JSON.stringify(output);
        logger.log({ event: 'tool_result', step: steps, name: block.name, output });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.log({ event: 'tool_error', step: steps, name: block.name, error: message });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          is_error: true,
          content: `Hiba a tool futtatásakor: ${message}`,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  const answer =
    'Elértem a lépéskorlátot, mielőtt végleges választ adhattam volna. ' +
    'Próbáld pontosítani a kérdést.';
  logger.log({ event: 'run_end', step: steps, answer, reason: 'max_steps' });
  return { answer, steps, logFile: logger.file };
}
