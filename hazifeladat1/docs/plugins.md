# Használt bővítmények, skillek és MCP-k (indoklással)

A projekt Claude Code-vezérelt fejlesztéssel készült. Az alábbi eszközök segítették a
munkát; mindegyiknél röviden indoklom, miért releváns ehhez a text-to-SQL agenthez.
(A kötelező minimum 3 releváns bővítmény — itt ennél több szerepel.)

## MCP-szerverek (`.mcp.json`, projekt-scope)

1. **GitHub MCP** — `https://api.githubcopilot.com/mcp/`
   A repó kezelése (issue-k, PR-ek, commit-előzmény, kód-kereszthivatkozás)
   közvetlenül az ügynökből. Így a Conventional Commits-előzmény és a repó-műveletek
   egy helyről vezérelhetők — a HF-nél a commit-történet és a GitHub-repó a leadás alapja.
   Hitelesítés: `GITHUB_MCP_PAT` környezeti változóból (nem kerül a repóba).

2. **Context7 MCP** — `@upstash/context7-mcp`
   Naprakész, verzió-pontos könyvtár-dokumentációt húz be (Prisma, `pg`,
   `@anthropic-ai/sdk`, commander). Mivel a stack gyorsan változó API-kat használ
   (pl. Anthropic SDK tool-use), a Context7 csökkenti az elavult minták és a
   hallucinált API-hívások esélyét.

## Skillek (`.claude/skills/`)

3. **testdata-seeder** (saját skill)
   Reális, konzisztens seed-/tesztadatok generálása a `products` táblához, a kötött
   szókészletek és a valósághű `pet_safe` betartásával. Közvetlenül a "saját DB +
   seed adatok" követelményt támogatja, és megkönnyíti az edge-case-ek felvételét.

4. **readonly-sql-audit** (saját skill)
   A csak-olvasó SQL-fegyelem átvizsgálása: DB-jog, SQL-kapuőr, read-only tranzakció,
   prompt–séma összhang. A biztonság (kizárólag SELECT) és a text-to-SQL helyesség a
   projekt lényege, ezért hasznos egy ismételhető ellenőrző-rutin.

## Javasolt/kompatibilis Claude Code plugin-ok

5. **Conventional Commits / commit-parancsok** — a `git`-előzmény a HF egyik
   értékelt eleme; a strukturált commit-üzenetek (`feat/fix/docs/chore`) betartását segíti.

6. **skill-creator** — a fenti saját skillek létrehozásához/finomításához használható
   (skill-scaffolding, description-optimalizálás a jobb aktiválásért).

> Megjegyzés: a `.claude/settings.json`-ben `enableAllProjectMcpServers: true` áll, így a
> projekt MCP-szerverei bekapcsolva indulnak. Az MCP-tokenek környezeti változóból jönnek.
