import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface HyDEResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function hydeAnswer(question: string): Promise<HyDEResult> {
  const prompt = `You are an expert in ETSI electronic-signature standards. Write a short, factual, technical paragraph (3-5 sentences, in English) that would plausibly answer the question below, as if it were an excerpt from an ETSI standard. State it confidently and use precise terminology; do NOT add caveats or say you are unsure. Question: ${question}`;

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt,
  });

  return {
    text: result.text,
    usage: {
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
    },
  };
}
