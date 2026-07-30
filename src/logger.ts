import { Logger } from './types';

export const createLogger = (): Logger => ({
  info: (msg: string) => {
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`);
  },
  error: (msg: string, err?: Error) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`);
    if (err) console.error(err.message);
  },
  warn: (msg: string) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${msg}`);
  },
});

export const log = createLogger();
