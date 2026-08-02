# HF3 — Fejlesztési napló: RAG az ETSI digitális aláírás tudásbázisra

- **Feladat:** működő RAG‑pipeline egy saját domain tudásbázisán, chunking‑stratégiával, HyDE + rerank +
  grounding kereséssel, multi‑provider routinggal, golden set kiértékeléssel és a tudásbázis‑karbantartás
  architektúra‑tervével.
- **Választott use case:** ETSI elektronikus aláírás szabványok (20 dokumentum).
- **Stack:** TypeScript (Node, ESM) + Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`) + `pg` + pgvector.
- **Providerek:** OpenAI (embedding + HyDE) + Anthropic (rerank + válasz).
- **Környezet:** Windows, VS Code + Claude Code (terminálból), hálózati meghajtón lévő repó, távoli Postgres.
- **Build‑modell:** minden lépést a **Claude Code‑ban, Haiku modellel** végeztem, atomi lépésekre bontva
  (egy lépés → ellenőrzés → egy commit).

---

## 1. Témaválasztás és indoklás

A saját use case‑t választottam, mert közel **tíz évig dolgoztam bizalmi szolgáltatónál**, így a digitális
aláírás domainjét ténylegesen ismerem — ez azért fontos, mert a feladat kiértékelése azon múlik, hogy meg
tudom‑e ítélni, jók‑e a keresési találatok. A tudásbázis **20 ETSI szabvány** (PAdES, XAdES, CAdES, ASiC,
tanúsítvány‑profilok, time‑stamping, crypto suites), amelyek nyilvánosan elérhetők. Ez több munka, mint egy
kész korpusz, de a tudásbázis‑építés maga is része a feladatnak.

## 2. A tudásbázis összeállítása

A 20 szabvány linkjéből egy **`manifest.json`**‑t állítottam össze (szabvány‑azonosító + cím + URL + fájlnév —
az azonosító lesz a grounding‑hivatkozás), és írtam hozzá egy **`download-sources.mjs`** scriptet, amely a
manifest alapján letölti a PDF‑eket a `sources/` mappába. A letöltés hibátlanul lefutott: **20 letöltve, 0 hibás**
(a legnagyobb az EN 319 102‑1 ~1,6 MB, a legkisebb ~59 KB).

## 3. Munkamódszer

A teljes rendszert a **Claude Code‑ban, Haiku modellel** építettem, tudatosan **kis, pontosan specifikált
lépésekre** bontva — a Haiku így dolgozik megbízhatóan. Minden lépés után futtattam egy ellenőrzést (teszt,
lekérdezés vagy preview), és csak utána léptem tovább, külön committal. Ez a fegyelem végig megtartotta a
nyomonkövethetőséget, és a hibák korán kiderültek.

## 4. Építési napló

### 4.1 Környezet és adatbázis — az első buktató
A séma egyszerű (`knowledge_chunks` tábla `vector(1536)` oszloppal), de a migráció elsőre elbukott:
`extension "vector" is not available` — a **pgvector bináris nem volt telepítve** a szerverre (ezt nem a
`CREATE EXTENSION` oldja meg). Kézzel **újrahúztam a Postgrest a `pgvector/pgvector:pg16` Docker image‑dzsel**
(a HF2‑ből örökölt adatbázis helyett), és újra létrehoztam a read‑only szerep‑jogokat. Ezután a migráció zölden
lefutott, az `embedding` oszlop `udt_name`‑je `vector` lett.

### 4.2 Loader — a második buktató (és a legfontosabb tanulság)
A PDF‑szöveget az `unpdf` nyeri ki, majd egy `cleanEtsiText` tisztítja (fejléc/lábléc, tartalomjegyzék,
boilerplate). Az első verzió **túl mohó volt: a nyers szöveg ~97%‑át kidobta** (pl. EN 319 132‑1: 213 132 →
6 141 karakter), így az egész korpusz látszólag csak ~9 000 szó lett. A diagnosztika (dokumentumonként nyers vs.
tisztított karakterhossz) egyértelműen megmutatta, hogy nem a kinyerés, hanem a **tisztító regexek** a ludasak.
A `cleanEtsiText`‑et **sor‑alapúra és nem‑mohóra** írtam át (a „History‑tól a végéig" és a boilerplate‑blokk
törlést kivettem). Eredmény: a tisztított hossz a nyers **80–95%‑a** lett, az összes szó **≈ 216 000**. Tanulság:
egy mohó regex csendben ki tudja üríteni a tudásbázist — mérni kell, nem feltételezni.

### 4.3 Chunker — klauzula‑tudatos darabolás
Az ETSI szövegek számozott klauzulákból állnak, ezért **klauzula‑tudatos** chunkert írtam: a darabhatár nem lép
át két klauzulán, a táblázatok egyben maradnak, és minden chunk megkapja a klauzula‑útvonalát metaadatként.
Az első futásnál voltak apró szemét‑chunkok (5 karakter) és túlméretesek is; finomítottam: **<200 karakter
eldobása, kemény felső korlát 1600 karakter**. Végeredmény: **1 096 chunk** a 20 dokumentumra, arányosan
elosztva (EN 319 102‑1 → 201 chunk … EN 319 422 → 20), min 200 / átlag ~1 100 / max 1 600 karakter. A stratégia
determinisztikus, ezért unit tesztekkel fedtem.

### 4.4 Embedding és betöltés
Kötegelt OpenAI `text-embedding-3-small` beágyazás (batch 100), a vektort pgvector‑literálként szúrva be, és
SHA‑256 `content_hash` / `doc_hash` mezőkkel (ezek a későbbi inkrementális frissítéshez kellenek). Idempotens:
`content_hash` UNIQUE + `ON CONFLICT DO NOTHING`. Eredmény: **1 657 chunk a DB‑ben** (1 377 új + 282 ütközés — ez
utóbbi a több szabványban ismétlődő boilerplate, amit a hash helyesen kiszűrt), **0 null embedding**, a második
futás 0 új sor. **Az ingest mért költsége: 338 808 token ≈ $0.0068.**

### 4.5 Keresési pipeline
Lépésenként építve, mindegyiket éles kérdésekkel ellenőrizve:
- **Nyers vektorkeresés** (`<=>` koszinusz): a próbakérdések 0.18–0.35 távolsággal, a helyes szabványra.
- **HyDE**: egy kis modell (`gpt-4o-mini`) angol, szakszavas hipotetikus választ ír, azt keressük — mérhetően
  csökkentette a távolságot (pl. XAdES 0.2312 → 0.1572).
- **Rerank** (Claude Haiku): a top‑20 jelöltet 0–10‑re pontozza, a top‑5 megy tovább.
- **Grounded válasz** (Claude Sonnet): kizárólag a chunkokból, inline forrás‑hivatkozással; ha nincs találat,
  a pontos „Erről nincs információ a tudásbázisban." mondat.
- **Nyelvkövetés** (utólagos javítás): eleinte angol kérdésre is magyarul válaszolt — a rendszerpromptot
  határozottabbra írva a válasz nyelve követi a kérdését, a `[ETSI …]` hivatkozásokat angolul tartva.

### 4.6 Belépési pontok
- **CLI**: `npm run ask "..."` — egy parancsból végigfut a pipeline, válasz + források.
- **Webes felület** (bónusz, nem volt kötelező): egy Express szerver + egyszerű oldal, kattintható ETSI‑forrás‑
  linkekkel és debug‑nézettel. A CLI és a Web ugyanazt a `searchKnowledge` pipeline‑t hívja.
- **Debug**: `npm run debug "..."` — nyers vs. HyDE vs. reranked találatok egymás alatt (ez a golden set eszköze is).

### 4.7 Golden set
10 kérdés (9 szakmai + 1 negatív), a PAdES / DTS / time‑stamping témakörre élezve, mindegyikhez rögzített elvárt
forrással. Minden kérdés lefutott **nyers** és **teljes** módban. Eredmények: a teljes pipeline mind a 9 szakmai
kérdésnél a **helyes szabványt** hozta, a negatív kérdésre helyesen megtagadta a választ. **Három** rerank‑
átrendezés is bizonyítható:
- Q1: nyersen `1 Scope` volt elöl → rerank után `6.1 Signature levels` (10/10) — a valódi válasz.
- Q8: nyersen `EN 319 422:5.2.3` → rerank után `TS 119 312:10.4` — a rerank **átlépett egy szabványhatárt** a
  helyes forrásra (a crypto‑algoritmusok a Cryptographic Suites‑ban vannak).
- Q9: a konkrétabb klauzulát preferálta.

Egy magyar nyelvű kérdés (Q7) demonstrálja, hogy az angol tudásbázisból magyar kérdésre is helyes, hivatkozott
választ ad (a nyelvfüggetlen embedding + az angol HyDE miatt).

### 4.8 Reprodukció, architektúra, költség
- **DB‑dump** (bónusz): `db/knowledge_dump.sql` (32,58 MB, 1 657 INSERT, a teljes vektorokkal + a
  `CREATE EXTENSION vector`‑ral) + dump/restore scriptek. Másik környezetben `npm run migrate && npm run db:restore`
  és a tudásbázis **újra‑embeddelés és OpenAI‑költség nélkül** kereshető.
- **`docs/ARCHITEKTURA.md` + ábra**: a tudásbázis inkrementális karbantartásának terve (hash‑alapú
  változásérzékelés: a `doc_hash`/`content_hash` összevetése, új/módosított/törölt dokumentum kezelése,
  triggerek), és egy architektúra‑ábra a teljes adatfolyamról.
- **Költség**: az ingest $0.0068; egy kérdés a teljes pipeline‑nal **~5 000 token, ~$0.012–0.014** (a három mérés:
  $0.011863 / $0.014208 / $0.013695). A költséget a **Sonnet‑válasz** dominálja (~80%), utána a **Haiku‑rerank**;
  a HyDE és az embedding elhanyagolható.

## 5. Eredmények számokban

| Mutató | Érték |
|---|---|
| Dokumentum | 20 ETSI szabvány |
| Kinyert szöveg | ≈ 216 000 szó |
| Chunk (DB) | 1 657 (1 377 új + 282 dedup) |
| Embedding dimenzió | 1536 (`text-embedding-3-small`) |
| Ingest költség | 338 808 token ≈ $0.0068 |
| Egy kérdés | ~5 000 token ≈ $0.012–0.014 |
| Golden set | 9/9 szakmai kérdés a helyes szabványra + negatív teszt |
| Rerank‑átrendezés | 3 bizonyított eset (Q1, Q8, Q9) |

## 6. Multi‑provider routing (és indoklása)

| Lépés | Provider / modell | Miért |
|---|---|---|
| Embedding | OpenAI `text-embedding-3-small` | olcsó, 1536 dim, bevált |
| HyDE | OpenAI `gpt-4o-mini` | csak keresünk vele, nem kell drága modell |
| Rerank | Claude Haiku 4.5 | olcsó, gyors olvasás + pontozás |
| Válasz | Claude Sonnet 4.5 | felhasználónak szánt, grounded szintézis |

Elv: a mechanikus lépések olcsó modellt kapnak, a végső válasz erőset — ezt a költségmérés is visszaigazolta.
