# plantbase — Claude Code projekt-memória

Ez a **plantbase**: egy természetes nyelvű (magyar) növénykatalógus-asszisztens, ami
**text-to-SQL** módon válaszol a saját PostgreSQL adatbázisából. Nx monorepo, két csomaggal.

## Két réteg (fontos!)

- **L2 – app-réteg (fejlesztés):** itt a séma, migráció, seed a Prisma dolga, és
  típusos lekérdezéseket írhatunk (lásd `scripts/typed-categories.ts`).
- **L1 – agent-réteg (futásidő):** az agent NEM a Prisma-klienst használja, hanem
  nyers, **csak-olvasó** SQL-t futtat a `run_sql` toollal, egy kizárólag SELECT jogú
  DB role-on keresztül. Ez a biztonsági határ.

## Architektúra

- `packages/core` (`@plantbase/core`): tool-ok (`run_sql`, `list_categories`),
  `askAgent` (kézzel írt tool-use loop), rendszerprompt, read-only pg pool, JSONL napló.
- `apps/cli` (`@plantbase/cli`): `commander` CLI — `ask` és `chat` parancs.

## Adatbázis: egyetlen tábla, `products`

Oszlopok: `id, name, scientific_name, category, price (Ft), size_category, height_cm,
light_need, water_frequency, care_level, pet_safe (bool), color, in_stock, description, created_at`.

Kötött értékek:

- `size_category`: kicsi | közepes | nagy
- `light_need`: alacsony | közepes | erős
- `water_frequency`: ritka | heti | gyakori
- `care_level`: könnyű | közepes | nehéz
- `category`: mindig a `list_categories` toolból (ne találj ki kategóriát).

## SQL-konvenciók (kód és prompt)

- Kizárólag `SELECT` / `WITH ... SELECT`, egyetlen utasítás, záró `;` nélkül.
- Szöveges keresés `ILIKE '%...%'` mintával.
- Mindig legyen `LIMIT` (alap max 100).
- Csak létező oszlopokat használj; kategóriára szűrés előtt `list_categories`.

## Futtatás

```bash
pnpm install
cp .env.example .env      # töltsd ki az ANTHROPIC_API_KEY-t
pnpm db:setup             # docker up + wait + migrate + generate + seed
pnpm ask "milyen macskabarát pálmák vannak 10000 Ft alatt?"
pnpm chat                 # interaktív mód
```

## Munkamódszer

- Új tool: `packages/core/src/tools/` alá, `AgentTool` interfész szerint, majd
  regisztráld a `tools/index.ts`-ben és tesztelj (`*.test.ts`).
- Commitok: **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`).
- A DB-mentes egységtesztek env/DB nélkül is fussanak (`sql-guard`, tool-definíciók).
