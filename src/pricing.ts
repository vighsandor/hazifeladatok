// Per-query pricing (USD per 1 million tokens/requests)
// Source: https://openai.com/pricing, https://www.anthropic.com/pricing

export const PRICING = {
  // OpenAI
  'text-embedding-3-small': 0.02 / 1_000_000, // $0.02 per 1M tokens
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000,  // $0.15 per 1M input tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M output tokens
  },

  // Anthropic Claude (update these from pricing page)
  'claude-haiku-4.5': {
    input: 0.80 / 1_000_000,   // $0.80 per 1M input tokens (adjust)
    output: 4.00 / 1_000_000,  // $4.00 per 1M output tokens (adjust)
  },
  'claude-sonnet-4.5': {
    input: 3.00 / 1_000_000,   // $3.00 per 1M input tokens (adjust)
    output: 15.00 / 1_000_000, // $15.00 per 1M output tokens (adjust)
  },
};

export interface TokenUsage {
  step: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface QueryUsageReport {
  steps: TokenUsage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: 'text-embedding-3-small' | 'gpt-4o-mini' | 'claude-haiku-4.5' | 'claude-sonnet-4.5'
): number {
  if (model === 'text-embedding-3-small') {
    return inputTokens * PRICING[model];
  }

  const pricing = PRICING[model] as { input: number; output: number };
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

export function formatCost(cost: number): string {
  if (cost < 0.00001) return '<$0.000001';
  return `$${cost.toFixed(6)}`;
}
