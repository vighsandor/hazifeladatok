# ETSI RAG — digitális aláírás tudásbázis

Retrieval-Augmented Generation pipeline az **ETSI elektronikus aláírás szabványok** felett. Egy kérdésre a
rendszer megkeresi a releváns szabvány-részleteket, és **kizárólag azokból** ad választ, pontos
forrás-hivatkozással (szabvány-azonosító + klauzula + URL) — ha pedig a tudásbázisban nincs válasz, ezt
kimondja, nem hallucinál.

A tudásbázis 20 ETSI szabvány (PAdES, XAdES, CAdES, ASiC, tanúsítvány-profilok, time-stamping, crypto suites),
összesen **1 657 chunk** a pgvectorban.

## Hogyan működik

**Ingest (offline):** a `sources/` PDF-jeit beolvassuk → megtisztítjuk az ETSI-zajtól (fejléc/lábléc, TOC,
boilerplate) → **klauzula-tudatos chunker** darabolja (a klauzula-határokat tiszteletben tartva, metaadattal)
→ OpenAI `text-embedding-3-small` beágyazás → pgvector (`knowledge_chunks` tábla).

**Lekérdezés (online):** kérdés → **HyDE** (egy kis modell hipotetikus választ ír, azt keressük) → embedding →
pgvector koszinusz-keresés (`<=>`, top-20) → **rerank** (Claude Haiku 0–10 pontozás, top-5) → **grounded válasz**
(Claude Sonnet, forrás-hivatkozással). Részletek: [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md).

**Multi-provider routing:** a mechanikus lépések olcsó modellt kapnak, a végső válasz erőset —
lásd lent és az architektúra-doksiban.

| Lépés | Provider / modell | Miért |
|---|---|---|
| Embedding | OpenAI `text-embedding-3-small` (1536d) | olcsó, bevált, a `vector(1536)`-hoz illik |
| HyDE | OpenAI `gpt-4o-mini` | csak keresünk vele, nem kell drága modell |
| Rerank | Claude Haiku 4.5 | olcsó, gyors olvasás + relevancia-pontozás |
| Válasz | Claude Sonnet 4.5 | felhasználónak szánt, grounded szintézis hivatkozásokkal |

## Előfeltételek

- **Node.js 20+**
- **PostgreSQL** a **pgvector** kiterjesztéssel (pl. `pgvector/pgvector:pg16` Docker image)
- **OpenAI** és **Anthropic** API-kulcs

## Telepítés

```bash
npm install
cp .env.example .env
```

A `.env`-be írd be:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<db>
```

## Használat

```bash
# 1) a 20 ETSI PDF letöltése a sources/ mappába (manifest.json alapján)
node sources/download-sources.mjs

# 2) adatbázis-séma + pgvector kiterjesztés
npm run migrate

# 3a) a tudásbázis felépítése a nulláról (beágyazás, OpenAI-kulcs kell)
npm run knowledge:ingest
#   VAGY 3b) a kész tudásbázis visszatöltése a mellékelt dumpból (NINCS OpenAI-hívás)
npm run db:restore

# 4) kérdezés – parancssorból
npm run ask "What are the PAdES baseline signature levels?"

# 5) kérdezés – webes felületen (http://localhost:3000)
npm run web
```

További parancsok:

```bash
npm test               # unit tesztek (chunker, loader)
npm run debug "<q>"    # egy kérdésre: nyers vs. HyDE vs. reranked találatok
npm run golden         # a golden set kiértékelése (nyers vs. teljes pipeline)
npm run db:dump        # a jelenlegi tudásbázis exportja SQL-be (db/knowledge_dump.sql)
```

A kérdés nyelvét a rendszer követi: magyar kérdésre magyar válasz, a `[ETSI …]` hivatkozásokat angolul tartva.
Tudásbázison kívüli kérdésre a válasz: „Erről nincs információ a tudásbázisban."

## Reprodukció másik környezetben

A `db/knowledge_dump.sql` a teljes beágyazott tudásbázist tartalmazza (1 657 chunk), így másik gépen
**újra-embeddelés és OpenAI-költség nélkül** felhozható:

```bash
npm install
# a .env DATABASE_URL-je a cél-DB-re mutasson (pgvectorral)
npm run migrate      # pgvector kiterjesztés + tábla
npm run db:restore   # a dump betöltése (~20 mp)
npm run ask "..."    # azonnal kereshető
```

Részletek: [`db/README.md`](db/README.md).

## Chunking-stratégia (és miért ez)

Az ETSI szabványok számozott klauzulákból, címhierarchiából és táblázatokból állnak, sok kereszthivatkozással.
Ezért **nem karakterre vagy bekezdésre** vágunk, hanem **klauzula-tudatosan**: a darabhatár sosem lép át két
klauzulán, a táblázatok egyben maradnak, és minden chunk megkapja a klauzula-útvonalát (`source_id` + klauzula)
metaadatként. Ez javítja a keresést (a kérdés gyakran a klauzula témájára utal) és a grounding pontosságát
(pontos hivatkozás). A chunk-méret 200–1600 karakter, kis mondat-átfedéssel a klauzulán belül. A stratégia
determinisztikus, ezért unit tesztekkel fedett (`npm test`).

## Kiértékelés (golden set)

10 kérdéses golden set (9 szakmai + 1 negatív), a PAdES / DTS / time-stamping témakörre élezve, mindegyik
kérdéshez rögzített elvárt forrással. Minden kérdést lefuttatunk **nyers vektorkeresés** és **teljes pipeline**
módban, és megmutatjuk, hol javít a HyDE és a rerank (pl. a nyers keresés a `1 Scope`-ot hozza, a rerank a
tartalmilag helyes `6.1 Signature levels`-t). A negatív kérdésre a rendszer helyesen megtagadja a választ.
Részletek és a teljes táblázat: [`golden-set.md`](golden-set.md).

## Költségbecslés

A számok a rendszer tényleges méréseiből származnak (`npm run ask` token-kiírása).

**Ingest (egyszeri):** a teljes tudásbázis vektorizálása — 20 szabvány, 1 657 chunk — **338 808 token, ≈ $0.0068**.

**Egy kérdés (teljes pipeline), három mérés:**

| Lépés | 1. kérdés | 2. kérdés | 3. kérdés |
|---|---|---|---|
| HyDE (gpt-4o-mini) | 237 tok · $0.000103 | 246 tok · $0.000107 | 271 tok · $0.000119 |
| Embed (text-embedding-3-small) | 151 tok · <$0.000001 | 155 tok · <$0.000001 | 205 tok · <$0.000001 |
| Rerank (Claude Haiku 4.5) | 2 694 tok · $0.002485 | 2 653 tok · $0.002452 | 2 697 tok · $0.002487 |
| Answer (Claude Sonnet 4.5) | 1 799 tok · $0.009273 | 2 034 tok · $0.011646 | 2 003 tok · $0.011085 |
| **Total** | **4 881 tok · $0.011863** | **5 088 tok · $0.014208** | **5 176 tok · $0.013695** |

Egy tipikus kérdés **~5 000 token, ~$0.012–0.014**. A költséget a Claude Sonnet válasz dominálja, utána a Claude Haiku rerank; a HyDE és az embedding elhanyagolható. A CLI és a webes felület ugyanazt a pipeline-t hívja, így a költség azonos.
