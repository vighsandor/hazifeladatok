# 🌱 plantbase

Természetes nyelvű (magyar) **növénykatalógus-asszisztens**, amely **text-to-SQL** módon
válaszol a saját PostgreSQL adatbázisából. A felhasználó emberi nyelven kérdez
(pl. _„milyen macskabarát pálmák vannak 10 000 Ft alatt?”_), az agent pedig csak-olvasó
SQL-lel megkeresi a választ a katalógusban, és magyarul összefoglalja.

Ez a projekt az **AI-ágensfejlesztés az alapoktól** kurzus HF1 házi feladata: a `plantbase`
ügynök helyi, Claude Code-vezérelt reprodukciója — valódi termékként, saját SQL-adatbázissal.

## Mit tud?

- Magyar kérdés → futtatható SQL → magyar válasz (nem nyers sortömeg).
- Több lépéses, **kézzel írt tool-use loop** (nem „beépített” ügynök).
- Két tool: `run_sql` (csak-olvasó SELECT) és `list_categories` (kötelező saját tool).
- Minden futás JSONL-be naplózva (`logs/`).

## Architektúra röviden

**Nx monorepo**, `pnpm` workspace-ekkel:

- `packages/core` (`@plantbase/core`) — tool-ok, `askAgent` loop, rendszerprompt, read-only
  `pg` pool, JSONL napló, Zod-os env.
- `apps/cli` (`@plantbase/cli`) — `commander` CLI: `ask` és `chat`.

Két réteg: **L2 app-réteg** (Prisma séma/migráció/seed, típusos lekérdezés) és **L1
agent-réteg** (futásidőben nyers, csak-olvasó SQL). Részletek: [`docs/architektura.md`](docs/architektura.md).

## Előfeltételek

- **Node.js ≥ 20** (ajánlott 22, lásd `.nvmrc`)
- **pnpm** (a repó `[email protected]`-re pinel; `corepack enable` elég hozzá)
- **Docker** (a helyi Postgreshez; OrbStack/Docker Desktop is jó)
- **Anthropic API-kulcs**

## Telepítés és indítás

```bash
# 1) Függőségek
corepack enable
pnpm install

# 2) Környezeti változók
cp .env.example .env
#   töltsd ki az ANTHROPIC_API_KEY-t (a DB-URL-ek alapból passzolnak a docker-compose-hoz)

# 3) Adatbázis: konténer + migráció + seed egy lépésben
pnpm db:setup
#   = docker compose up -d  →  vár a DB-re  →  prisma migrate deploy  →  prisma generate  →  seed

# 4) Kérdezz!
pnpm ask "milyen macskabarát pálmák vannak 10000 Ft alatt?"
pnpm ask "mutasd a legdrágább 3 növényt"
pnpm ask "milyen kategóriák vannak?"

# Interaktív mód
pnpm chat

# A rendszerprompt és a tool-ok megtekintése futás közben
pnpm ask --show-prompt "milyen páfrányok vannak?"
```

### Hasznos parancsok

| Parancs                       | Mit csinál                                                |
| ----------------------------- | --------------------------------------------------------- |
| `pnpm db:up` / `pnpm db:down` | Postgres konténer indítása / leállítása                   |
| `pnpm db:migrate`             | migrációk alkalmazása (`prisma migrate deploy`)           |
| `pnpm db:seed`                | katalógus feltöltése (~33 növény)                         |
| `pnpm db:reset`               | DB visszaállítása + újraseedelés                          |
| `pnpm typed-categories`       | **L1/L2 kontraszt**: ugyanaz típusos Prisma-lekérdezéssel |
| `pnpm typecheck`              | `tsc --noEmit` a core és a cli csomagra                   |
| `pnpm test`                   | egységtesztek (DB nélkül futnak)                          |
| `pnpm format`                 | Prettier                                                  |

## Adatmodell — egyetlen tábla: `products`

`id, name, scientific_name, category, price (Ft), size_category, height_cm, light_need,
water_frequency, care_level, pet_safe (bool), color, in_stock, description, created_at`.

Kötött értékek: `size_category` (kicsi/közepes/nagy), `light_need` (alacsony/közepes/erős),
`water_frequency` (ritka/heti/gyakori), `care_level` (könnyű/közepes/nehéz). A `category`
mindig a `list_categories` toolból jön.

## Biztonság (miért nem tud írni az agent?)

Réteges védelem — a valódi határ a **DB-jog**:

1. **`plantbase_ro` DB role** — kizárólag `SELECT` jog (`docker/initdb/01-readonly-role.sql`).
2. Az agent csak a **read-only** connection stringet kapja; a `run_sql` `BEGIN READ ONLY` +
   `statement_timeout` alatt fut.
3. **SQL-kapuőr** (`sql-guard.ts`): csak `SELECT`/`WITH`, egyetlen utasítás, tiltott
   kulcsszavak kiszűrése, automatikus `LIMIT`.
4. A **rendszerprompt** is a fenti szabályok felé tereli a modellt.

## Naplózás

Minden futás külön `logs/<idő>.jsonl` fájlba kerül; soronként egy esemény
(`run_start`, `assistant`, `tool_use`, `tool_result`, `run_end`).

## Tesztelés

```bash
pnpm test
```

Az egységtesztek **DB és API-kulcs nélkül** futnak: az `sql-guard` (csak-olvasó SQL
validáció) és a tool-definíciók alakja.

## Claude Code-vezérelt fejlesztés

A projekt Claude Code-dal, ügynöki munkafolyamattal készült (a commit-előzmény ezt tükrözi,
**Conventional Commits** üzenetekkel). Konfiguráció: [`CLAUDE.md`](CLAUDE.md) (projekt-memória),
[`.mcp.json`](.mcp.json) (GitHub + Context7 MCP), `.claude/` (settings + saját skillek).
A használt bővítmények indoklása: [`docs/plugins.md`](docs/plugins.md).

## A HF1 követelmények teljesítése

| Követelmény                                                         | Hol                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Nx monorepo, 2 csomag (core + cli), pnpm                            | `nx.json`, `pnpm-workspace.yaml`, `packages/`, `apps/`                                |
| Helyi Postgres (docker-compose), `products` séma, seed              | `docker-compose.yml`, `prisma/`, ~33 növény                                           |
| `run_sql` (csak-olvasó), `askAgent` (több lépés + JSONL), CLI `ask` | `packages/core/src/…`, `apps/cli/src/main.ts`                                         |
| **Saját kódolt tool: `list_categories`** (SELECT DISTINCT), bekötve | `tools/listCategories.ts`, `agent/askAgent.ts`                                        |
| Conventional Commits (értékelt előzmény)                            | `git log`                                                                             |
| ≥3 releváns plugin/skill indoklással                                | [`docs/plugins.md`](docs/plugins.md), `.claude/skills/`                               |
| ROI pénzben (5 fős iroda)                                           | [`docs/roi.md`](docs/roi.md)                                                          |
| Rendszerprompt javítása indoklással                                 | [`docs/system-prompt-javitas.md`](docs/system-prompt-javitas.md), baseline + javított |
| Repó-minőség (README, `.env.example`, tiszta repó)                  | ez a fájl, `.env.example`, `.gitignore`                                               |
| Működő termék (ask → helyes válasz, teljes lánc)                    | `pnpm db:setup && pnpm ask "…"`                                                       |

## Licenc

Oktatási célú projekt (kurzus HF1).
