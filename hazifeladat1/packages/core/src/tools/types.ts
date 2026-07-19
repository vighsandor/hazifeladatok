import type Anthropic from '@anthropic-ai/sdk';

/**
 * Egy tool = egy Anthropic tool-definíció + a hozzá tartozó futtató függvény.
 * Az askAgent a definition-öket küldi a modellnek, és a run()-nal hajtja végre
 * a modell által kért hívásokat.
 */
export interface AgentTool {
  definition: Anthropic.Tool;
  run(input: unknown): Promise<unknown>;
}
