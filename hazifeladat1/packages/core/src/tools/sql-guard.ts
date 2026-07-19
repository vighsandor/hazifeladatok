/**
 * Csak-olvasó SQL "kapuőr". Tiszta függvény (nincs DB), ezért unit-tesztelhető.
 *
 * FONTOS: ez csak a VÉDELEM EGYIK RÉTEGE. Az igazi biztonsági határ a read-only
 * DB role (DATABASE_URL_READONLY) — még ha ez a szűrő ki is hagyna valamit,
 * a DB szinten sincs írási jog. Itt a cél a nyilvánvaló hibák korai elkapása,
 * a találatszám korlátozása, és a modell terelése a helyes irányba.
 */

export const MAX_ROWS = 100;

// Adatmódosító / DDL / tranzakció-vezérlő kulcsszavak. Szó-határral, hogy ne
// akadjon fenn szavakon (pl. "napsütés"), és a data-modifying CTE-t is fogja
// (WITH x AS (DELETE ...) SELECT ...).
const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|merge|call|vacuum|reindex|attach|comment|lock|into)\b/i;

/**
 * Ellenőrzi és normalizálja a lekérdezést. Hibát dob, ha nem biztonságos.
 * @returns a (szükség esetén LIMIT-tel kiegészített) futtatható SQL.
 */
export function assertReadOnlySelect(rawSql: string): string {
  if (typeof rawSql !== 'string' || rawSql.trim() === '') {
    throw new Error('Üres SQL: adj meg egy SELECT lekérdezést.');
  }

  // Záró pontosvessző(k) levágása.
  let sql = rawSql
    .trim()
    .replace(/;+\s*$/, '')
    .trim();

  if (sql.includes(';')) {
    throw new Error('Csak egyetlen utasítás engedélyezett (nincs pontosvessző a lekérdezésben).');
  }

  const lowered = sql.toLowerCase();
  if (!/^(select|with)\b/.test(lowered)) {
    throw new Error('Csak SELECT (vagy WITH ... SELECT) lekérdezés futtatható.');
  }

  if (FORBIDDEN.test(sql)) {
    throw new Error('Tiltott kulcsszó: kizárólag olvasó (SELECT) lekérdezés engedélyezett.');
  }

  // Ha nincs LIMIT, tegyünk rá egyet a találatszám korlátozására.
  if (!/\blimit\b/i.test(sql)) {
    sql = `${sql} LIMIT ${MAX_ROWS}`;
  }

  return sql;
}
