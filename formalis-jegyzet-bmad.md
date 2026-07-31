# BMAD ág — fejlesztési napló és tapasztalatok

- **Harness:** BMAD‑METHOD v6 (Claude Code plugin, BMM modul)
- **Branch:** `harness/bmad-claude`
- **Feladat:** kis REST szolgáltatás Postgres fölött — idempotens seed + offline geokódolás, 2 GET végpont, haversine unit teszt
- **Környezet:** Windows, VS Code + Claude Code (CLI a terminálból), Node.js, hálózati meghajtón lévő repó (`\\host.lan\...`), távoli Postgres (`10.0.0.106:5432`)
- **Modell:** ugyanaz a Haiku modell, mint a Superpowers‑ágon (a tiszta összehasonlításért)

---

## 1. Környezet és beállítás

Az alaprendszer (VS Code + Claude Code + Git + Node.js) már megvolt a Superpowers‑körből, így itt csak a Claude Code aktiválása, a **BMAD telepítése** (`npx bmad-method install`), egy VS Code + Claude Code reload és az MCP újracsatlakoztatása kellett (21:45 → 22:25).

**Komoly negatívum az induláskor:** a `bmad-help` / telepítési lépés során a BMAD **önhatalmúlag más branch‑ekben is „kotorászott"**, nem csak abban, amelyikben dolgoznia kellett volna. Kézzel kellett megállítani és utasítani, hogy maradjon a `harness/bmad-claude` ágon, és úgy telepítse magát. Ez rossz első benyomás — egy eszköznek nem szabadna a munkaág határát átlépnie.

## 2. Munkamenet áttekintése

A BMAD **szerep‑alapú, dokumentum‑vezérelt** folyamat (a spec az igazságforrás): a PM‑től indul a PRD, majd Epics & Stories, végül a Dev story‑nként implementál. Két, a dokumentációtól eltérő tapasztalat:

- **A parancsok namespace‑eltek:** nem `/analyst`, `/pm`, hanem `/bmad-agent-analyst`, `/bmad-agent-pm`, `/bmad-agent-dev`, `/bmad-agent-architect`, `/bmad-agent-tech-writer`. A leírásokból kellett kihámozni, melyik kell.
- **Nincs külön Scrum Master és QA agent:** a story‑bontás a PM‑nél (`bmad-create-epics-and-stories`), a tesztelés a Dev‑nél van. Ez az adott telepítés 5‑agentes felállása.

## 3. Idővonal

| Szakasz | Idő | Tartam |
|---|---|---|
| Claude Code aktiválás + BMAD install + reload + MCP (+ a branch‑kotorászás megállítása) | 21:45 → 22:25 | ~40 perc |
| Tervezés (PRD + Epics & Stories) és teljes megvalósítás (story‑nként, ~16 commit) | 22:25 → 23:40 | ~1 óra 15 |
| Tesztelés és javítások | 23:50 → 00:30 | ~40 perc |

A working kódig **majdnem egy órával kevesebb** kellett, mint a Superpowersnél, és **nem fogyott el a token‑keret** sem.

## 4. Tervezési fázis

A PM (John) **interjúztatott**, nem sablont töltött. Előbb rákérdezett a **„stakes"‑re** (belső/learning vs. production‑ready) és ez alapján skálázta a kimenet mélységét — ez a „scale‑adaptive" viselkedés a Superpowersnél nem jelent meg. Majd **18 explicit feltételezést** (tech‑stack, adatmodell, seed‑stratégia, végpontok, devops, commit/dokumentáció) listázott **jóváhagyásra**, mielőtt bármit kódolt. Itt tisztázódott a koordináták forrása (a repóba bundle‑olt lokális referencia), az idempotencia módja (`ON CONFLICT DO NOTHING` egyediségi kulccsal) és a Node‑alapú migráció (nem `psql`). A scope végig **egyszerű, közvetlen REST szolgáltatás** maradt — nem nőtt túl.

Elkészült a `prd.md` és az `epics-and-stories.md` (a `planning-artifacts/` alá), és innen story‑nként haladt az implementáció.

## 5. Megvalósítás

Story‑ról story‑ra, minden lépés külön, kis committal (npm setup → migráció → koordináta‑referencia → egyeztetés → seed → haversine → végpontok → README → validáció). A hálózati meghajtó itt is akadékoskodott:

- **`npm install` elbukott** az UNC úton (esbuild build‑script crash). Megoldás: `npm install --ignore-scripts`, majd a `tsx` külön.
- A `tsx`‑et végül **`./node_modules/.bin/tsx`‑ként** hívva lehetett futtatni az UNC útról (az `npm run` scriptek Windowson a hálózati úton nem mentek megbízhatóan).

A végén ~16 story‑alapú commit készült. **Két hiányosság a folyamat végén:** az utasítás ellenére **nem pusholt** (kézzel kellett), és **az utolsó módosítást már nem is commitolta** — azt is kézzel kellett pótolni. Ez trehányabb lezárás, mint a Superpowersé.

## 6. Tesztelés és éles ellenőrzés

Pozitívum: a BMAD **készített egy `VALIDATION.md` teszt‑útmutatót**, szemben a Superpowersszel, ahol külön kellett kérni a tesztelés menetét. Viszont a tesztelés során **több valós kódhibát kellett javítani** (a Superpowersnél a kódhoz nem kellett hozzányúlni, csak a környezethez):

1. **A `.env` nem töltődött be** — a kód nem olvasta a `DATABASE_URL`‑t fájlból. Javítás: kézi `.env` loader a `connection.ts`‑be.
2. **Idempotencia az élő táblán:** a `CREATE TABLE IF NOT EXISTS` nem tette rá az egyediségi kulcsot egy már létező táblára. Javítás: külön `ALTER TABLE ... ADD CONSTRAINT` (hibakezeléssel).
3. **A null‑koordináta teszthez** a seed nem frissítette a meglévő sorokat; kellett egy `RESET_DB` mód, hogy tiszta lappal újraseedelve látszódjon a `distanceKm: null` a lista végén.
4. **A Jest a TS‑sel az UNC úton nem futott** — helyette egy **kézi `test-runner.ts`** validálta a logikát (10/10 zöld). A Jest‑tesztfájlok léteznek, de a Jest futtatása ebben a környezetben nem sikerült.

A javítások után a szolgáltatás **végig‑működött**:

- `GET /customers/count` → `{ "count": 15 }`
- `GET /customers/by-distance` → helyes sorrend: Budapest 0, Vienna **214,0**, Kraków 293,0 …
- Idempotens seed: 2. futtatás → 0 beszúrás, 15 kihagyva.
- Null‑koordináta: Ljubljana kivéve a referenciából → Matej Horvat a lista **végén**, `distanceKm: null`.
- Kézi test‑runner: **10/10** (haversine 214/0/null, geokódolás, null‑kezelés).

## 7. Értékelés

**Amit jól csinált**
- **Gyorsabb és token‑takarékosabb**: a working kódig ~fele idő, a token‑keret nem fogyott el.
- **Explicit, jóváhagyás‑alapú tervezés**: stakes‑kérdés + 18 feltételezés a kód előtt; a scope végig egyszerű maradt (nem lett túltervezve).
- **Teszt‑útmutatót is adott** (`VALIDATION.md`).
- Kis, story‑alapú commitok (~16).

**Súrlódások**
- **Az induláskor más branch‑ekbe is belenyúlt** — kézzel kellett a munkaágra korlátozni (nagy negatívum).
- A parancsok a dokumentációtól eltérően **namespace‑eltek** (`/bmad-agent-...`).
- A **kódban valós hibák** voltak, amiket a tesztelés hozott elő (`.env` betöltés, egyediségi kulcs élő táblán, null‑teszt reset).
- A **Jest nem futott** az UNC úton — kézi test‑runner kellett.
- **Nem pusholt**, és **az utolsó módosítást nem commitolta** — kézzel kellett.
- Az általam megszokott (autonóm opencode + Ollama) munkafolyamathoz képest **nagyon „szájbarágós"** — bár egy hajszálnyival kevésbé, mint a Superpowers.

## 8. Végeredmény

Működő, dokumentált, direkt REST szolgáltatás a `harness/bmad-claude` ágon: ~16 story‑alapú commit, `prd.md` + `epics-and-stories.md` + `README.md` + `VALIDATION.md`, és a kézi javítások után minden funkcionális elvárás teljesül (count = 15, helyes távolságok, idempotens seed, null‑kezelés, 10/10 kézi teszt). A tervezés fegyelmezett és a folyamat gyors volt; cserébe az induló branch‑átlépés, a kódhibák és a lezárás trehánysága voltak a gyenge pontok.

## 9. Rövid összevetés a Superpowersszel

Ugyanazzal a Haiku modellel: a **Superpowers ~2 órát** vitt és elfogyasztotta a token‑keretet, **de a tesztelésnél a kódhoz nem kellett hozzányúlni**; a **BMAD ~fele annyi idő** alatt végzett és token‑takarékos volt, **viszont a tesztelés során több kódhibát kellett javítani**. Mindkettő erősen irányított/„szájbarágós" volt, és **egyik sem pusholt** magától.
