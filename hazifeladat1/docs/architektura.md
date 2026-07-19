# Architektúra

## Áttekintés

A plantbase egy **Nx monorepo**, két csomaggal, `pnpm` workspace-ekkel:

- **`packages/core` (`@plantbase/core`)** — az agent-mag:
  - `tools/` — `run_sql` (csak-olvasó SELECT) és `list_categories` (SELECT DISTINCT category, kötelező saját tool)
  - `agent/askAgent.ts` — kézzel írt, több lépéses tool-use loop az Anthropic SDK-val
  - `prompt.ts` — a javított rendszerprompt (séma + szabályok)
  - `db.ts` — read-only `pg` pool (`DATABASE_URL_READONLY`)
  - `logger.ts` — JSONL futásnapló (`logs/<idő>.jsonl`)
  - `env.ts` — lusta, Zod-validált konfiguráció
- **`apps/cli` (`@plantbase/cli`)** — `commander` CLI: `ask` és `chat`.

## Kérés életciklusa

```
felhasználói kérdés (magyar)
      │
      ▼
askAgent ──► Anthropic Messages API  ◄─ rendszerprompt + tool-definíciók
      │            │
      │            ├─ stop_reason = tool_use → tool futtatása:
      │            │      run_sql:        assertReadOnlySelect → read-only tranzakció → sorok
      │            │      list_categories: SELECT DISTINCT category
      │            │   (eredmény vissza a modellnek)  ──► újabb kör
      │            │
      │            └─ stop_reason ≠ tool_use → szöveges válasz
      ▼
magyar összefoglaló a felhasználónak     (közben minden lépés JSONL-be naplózva)
```

## Két réteg (L1/L2)

- **L2 – app-réteg:** Prisma séma + migráció + seed; típusos lekérdezés is lehetséges
  (`scripts/typed-categories.ts`). Fejlesztői oldal.
- **L1 – agent-réteg:** futásidőben **nyers, csak-olvasó SQL** a `run_sql`-en át.

## Biztonság (réteges)

1. **DB role:** `plantbase_ro` — kizárólag `SELECT` jog (a valódi határ).
2. **Kapcsolat:** az agent csak a read-only connection stringet kapja; `BEGIN READ ONLY`
   - `statement_timeout`.
3. **SQL-kapuőr:** `sql-guard.ts` — csak `SELECT`/`WITH`, egy utasítás, tiltott kulcsszavak
   kiszűrése, automatikus `LIMIT`.
4. **Prompt:** a modellt is a fenti szabályok felé tereli.

## Naplózás

Minden futás külön `logs/<idő>.jsonl` fájlba kerül; soronként egy esemény
(`run_start`, `assistant`, `tool_use`, `tool_result`, `run_end`) — teljes visszakövethetőség.
