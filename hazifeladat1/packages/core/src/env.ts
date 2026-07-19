import 'dotenv/config';
import { z } from 'zod';

/**
 * Környezeti változók sémája. Szándékosan LUSTA: csak akkor validálunk,
 * amikor tényleg szükség van rá (getEnv()), így a tool-definíciók importja
 * (pl. teszthez) nem bukik el hiányzó API-kulcs miatt.
 */
const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'Hiányzik az ANTHROPIC_API_KEY (lásd .env.example).'),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-sonnet-4-5-20250929'),
  DATABASE_URL_READONLY: z
    .string()
    .min(1, 'Hiányzik a DATABASE_URL_READONLY (a read-only DB kapcsolat).'),
  LOG_DIR: z.string().min(1).default('logs'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
      throw new Error(`Hibás vagy hiányzó környezeti változók:\n${issues.join('\n')}`);
    }
    cached = parsed.data;
  }
  return cached;
}
