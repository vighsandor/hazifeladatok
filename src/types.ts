export interface Config {
  project: {
    name: string;
    language: string;
    framework: string;
    description?: string;
  };
  database: {
    url: string;
  };
  server: {
    host: string;
    port: number;
  };
  data: {
    seedFile: string;
    coordinatesRef: string;
  };
  steps: Step[];
}

export type Step = 'npm-install' | 'migrate-db' | 'seed-data' | 'run-tests';

export interface TemplateContext {
  config: Config;
  coordinates: Record<string, { lat: number; lon: number }>;
  seedData: Array<{ name: string; city: string; budget?: number; note?: string }>;
}

export interface Logger {
  info(msg: string): void;
  error(msg: string, err?: Error): void;
  warn(msg: string): void;
}
