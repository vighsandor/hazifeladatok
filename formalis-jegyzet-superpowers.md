# Superpowers ág — fejlesztési napló és tapasztalatok

- **Harness:** Superpowers (Claude Code plugin)
- **Branch:** `harness/superpowers-claude`
- **Feladat:** kis REST szolgáltatás Postgres fölött — idempotens seed + offline geokódolás, 2 GET végpont, haversine unit teszt
- **Környezet:** Windows, VS Code + Claude Code (CLI a terminálból), Node.js, hálózati meghajtón lévő repó (`\\host.lan\...`), távoli Postgres (`10.0.0.106:5432`)

---

## 1. Környezet és beállítás

A beállítás lett a munka legküzdelmesebb része. A VS Code + Claude Code + Git + Node.js együttes felállítása (a Node telepítője magával hozta a Chocolatey‑t és a Pythont is), majd a Superpowers plugin bekötése **kb. két órát** vett igénybe (20:27 → 22:27). Ezt követte a Postgres MCP csatlakoztatása, ami elsőre „No MCP servers configured" hibával nem jött össze, és további **~25 percbe** telt, mire stabilan „connected" lett (22:27 → 22:52).

Fontos tanulság: a súrlódás nagy része nem magából a pluginból eredt, hanem a **Windows + hálózati meghajtó** környezetből. A VS Code extension‑panel 30 másodperces indulási timeoutja miatt a Claude Code‑ot végül a **terminálból** indítva volt stabil.

## 2. Munkamenet áttekintése

A Superpowers határozott, több lépcsős folyamatot kényszerít ki:

1. **Brainstorm** (`/brainstorm`) — tisztázó kérdések, tech‑stack és megközelítés kialakítása.
2. **Design** — részletes tervdokumentum (`docs/DESIGN.md`), commitolva.
3. **Terv** (writing‑plans skill) — lépésekre bontott implementációs terv (32 feladat, 8 fázis).
4. **Végrehajtás** — a terv inline végrehajtása, fájlonként és lépésenként.
5. **Tesztelés** — a kész csomag éles kipróbálása.

## 3. Idővonal

| Szakasz | Idő | Tartam |
|---|---|---|
| Környezet felállítása (VS Code, Claude Code, Git, Node, Superpowers) | 20:27 → 22:27 | ~2 óra |
| Postgres MCP bekötése és csatlakoztatása | 22:27 → 22:52 | ~25 perc |
| Brainstorm + tervezés (→ session‑limit miatt megszakadt) | 22:52 → 23:54 | ~1 óra |
| Folytatás: tervezés vége + megvalósítás (13 commit, `v1.0.0`) | (másnap) 17:24 → 18:33 | ~1 óra |
| A kész csomag tesztelése és javítása | 18:33 → 19:23 | ~50 perc |

A **session‑limit kétszer** is kényszervárakozást okozott, ami megtörte a munka folyamatosságát.

## 4. A tervezési és megvalósítási folyamat

A brainstorm sok, apró, de releváns kérdéssel haladt: tech‑stack (Node.js + Express), migrációs eszköz és tesztkeret (nyers SQL + Jest), majd a projektszerkezet. Ezen a ponton a feladatot **meta‑szintre emeltem**: egy `skill.md` „blueprint" + egy TypeScript‑generátor agent (parser → codegen → executor, Handlebars sablonokkal), amely a REST API‑t állítja elő. A Superpowers ezt készségesen végigtervezte — 10 tervezési szekció, YAML‑formátumú `skill.md`, dokumentációs és verziózási stratégia, hibakezelés, USAGE útmutató.

A jóváhagyott tervből `docs/DESIGN.md` és egy részletes implementációs terv készült (mindkettő commitolva), majd az inline végrehajtás legenerálta a modulokat, sablonokat, teszteket és 8 dokumentációs fájlt. A folyamat végén **13 fókuszált commit** és egy **`v1.0.0`** tag született — ez jól illeszkedik az „egy lépés = egy commit" elváráshoz.

Megjegyzés a scope‑ról: a kiírás egy minimalista REST szolgáltatást kért; a Superpowers (részben az én terelésemre) ehelyett egy kód‑generátor keretrendszert épített, ami a REST API‑t generálja. A végeredmény funkcionálisan megfelel, de a megoldás lényegesen összetettebb lett a szükségesnél.

## 5. Tesztelés és éles ellenőrzés

A kész csomag **nem futott elsőre** ezen a környezeten; több kézi javítás kellett:

- `npm run generate` → **`'tsx' is not recognized`** — előbb `npm install` kellett (a `tsx` csak devDependency volt).
- A **hálózati (UNC) útvonal** (`\\host.lan\...`) megakasztotta az `npm install`‑t; megoldás: a megosztást **`Z:` meghajtóra képezve** futott le.
- A generált migráció **`psql`‑t** hívott, ami nincs telepítve → a migrációs lépés elbukott. Megoldás: egy **Node‑alapú migrációs script** (`pg` csomaggal) futtatta le a sémát `psql` nélkül.

A javítások után a szolgáltatás **végig‑működött**:

- `GET /customers/count` → `{ "count": 15 }`
- `GET /customers/by-distance` → helyes sorrend és távolságok: Budapest 0 km, Vienna 214,0, Kraków 293,0, Ljubljana 380,6, Prague 442,4 … (a lista a várt módon nő)
- Idempotens seed: kétszeri futtatás után is 15 sor.

## 6. Értékelés

**Amit jól csinált**
- Erős, **átlátható tervezés**: brainstorm → tervdokumentum → részletes terv → végrehajtás, minden lépés dokumentálva és commitolva.
- **Kis, fókuszált commitok** és verziózás (`v1.0.0`) — pont az elvárt commit‑fegyelem.
- A **tesztek a csomag részei** lettek (parser/codegen/executor + haversine geo‑teszt), az **edge case‑ek** (null‑koordináta a lista végén, ékezet/kis‑nagybetű‑független egyeztetés, idempotens `ON CONFLICT DO NOTHING`) végig lettek gondolva a tervben.
- Jó **dokumentáció‑készség** (README, USAGE, OPERATIONS, HANDOVER stb.).

**Súrlódások**
- **Nagyon interaktív, helyenként „szájbarágós"**: több mint két óra kérdez‑felelek, mire kód lett. A korábbi opencode + Ollama munkafolyamatomhoz képest lassúnak és kevésbé önállónak érződött.
- **Sok kézi jóváhagyás** (szinte minden fájl‑ és parancs‑művelethez).
- A **session‑limit kétszer** megszakította a munkát.
- A generált csomag **környezetfüggő hibái** (`tsx`, `psql`, UNC‑útvonal) kézi beavatkozást igényeltek.
- Az explicit utasítás ellenére **nem pusholt** — a felpusholást kézzel kellett pótolni.
- Hajlamos volt **túltervezni** / a scope‑ot növelni.

## 7. Végeredmény

Működő, dokumentált, verziózott csomag a `harness/superpowers-claude` ágon: 13 commit, `v1.0.0` tag, a generált REST API a kézi javítások után minden funkcionális elvárást teljesít (count = 15, helyes távolságok, idempotens seed, haversine tesztek). A tervezés és a commit‑fegyelem kiemelkedő volt; cserébe a folyamat lassú és nagyon irányított, a kimenet pedig a szükségesnél összetettebb.
