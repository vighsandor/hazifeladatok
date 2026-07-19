import { Pool } from 'pg';
import { getEnv } from './env';

/**
 * Az agent CSAK ezen a read-only poolon keresztül ér az adathoz.
 * A kapcsolat a DATABASE_URL_READONLY-t használja, ami egy kizárólag
 * SELECT jogú DB role — ez a legfontosabb biztonsági határ.
 */
let roPool: Pool | undefined;

export function getReadonlyPool(): Pool {
  if (!roPool) {
    roPool = new Pool({
      connectionString: getEnv().DATABASE_URL_READONLY,
      max: 4,
      // Kapcsolat-szintű védelem: egyetlen lekérdezés se fusson túl sokáig.
      statement_timeout: 5000,
    });
  }
  return roPool;
}

export async function closePools(): Promise<void> {
  if (roPool) {
    await roPool.end();
    roPool = undefined;
  }
}
