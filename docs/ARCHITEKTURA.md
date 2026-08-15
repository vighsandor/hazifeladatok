# ETSI RAG — Architektúra

## 1. Rendszer-áttekintés

### Ingest (offline) fázis
Egyszer lefutó adatfeldolgozás:
- **PDF betöltés** (unpdf): 20 dokumentum ETSI EN/TS szabványokból
- **Szöveg-tisztítás** (cleanEtsiText): sorszámok, fejlécek, TOC eltávolítása; klauzulaszámok, táblázatok megőrzése (~91% szövegtartalom)
- **Klauzula-tudatos chunking** (~200–1600 karakteres blokkok): klauzulahatárokra törés, átfedés ugyanazon klauzulán belül
- **Embedding** (OpenAI text-embedding-3-small): 1536-dimenziós vektorok; 1 657 chunk végül
- **pgvector tárolás**: `knowledge_chunks` tábla; idempotens beszúrás (content_hash alapján)

### Lekérdezés (online) fázis
Felhasználó-szintű válaszadás:
- **Kérdés fogadása** (CLI: `npm run ask` / Web: `POST /api/ask`)
- **HyDE** (gpt-4o-mini): 3–5 mondatos hipotetikus válasz
- **Embedding** (OpenAI text-embedding-3-small): HyDE szöveg vektorizálása
- **pgvector koszinusz-keresés** (`<=>`): top-20 legtöbb hasonló chunk
- **Reranking** (Claude Haiku 4.5): 0–10 pontszám; top-5 releváns chunk kiválasztása
- **Grounded válasz** (Claude Sonnet 4.5): 
  - Kérdés nyelvét követi (magyar/angol)
  - ETSI referenciákat angol formában tartja
  - Forrás-hivatkozások inline: `[ETSI EN 319 142-1, 6.1]`
  - Out-of-domain: `"Erről nincs információ a tudásbázisban."` (magyar, fix)

### Belépési pontok
- **CLI**: `npm run ask "..."` → output
- **Web UI**: `npm run web` → `http://localhost:3000`
- **Debug CLI**: `npm run debug "..."` → retrieval lépések

---

## 2. Multi-provider routing

| Lépés | Provider/Modell | Miért? |
|-------|---|---|
| Embedding | OpenAI text-embedding-3-small (1536-dim) | Legjobb ár–minőség; reranker és válaszgenerátor erre épít |
| HyDE | gpt-4o-mini (OpenAI) | Kis, gyors modell; csak keresési célra |
| Reranking | Claude Haiku 4.5 | Olcsó, gyors szövegelemzés |
| Grounded válasz | Claude Sonnet 4.5 | Felhasználó-szintű output; hosszú szintézis, többnyelvű támogatás |

**Elv**: mechanikus lépések → olcsó/gyors modell; végső felhasználói válasz → erős modell.

---

## 3. A tudásbázis inkrementális karbantartása

### 3.1. Honnan tudod, hogy egy dokumentum változott, és hogyan éred el, hogy a változatlan ne vektorizálódjon újra?

**Dokumentum-szintű változásérzékelés**:
- Ingest futáskor minden forrásdokumentumhoz kiszámoljuk: `doc_hash = SHA-256(teljes PDF tartalma)`
- Összehasonlítjuk a pgvector-ban tárolt `doc_hash` értékkel (ugyanez `source_id`)
- **Egyezés** → dokumentum változatlan → **dokumentum kimarad**, nincs OpenAI-hívás
- **Eltérés** → dokumentum módosult → újrachunkolás

**Chunk-szintű változásérzékelés**:
- Minden chunk-hoz: `content_hash = SHA-256(chunk tartalma)`
- Új chunk-ok beillesztése az `ON CONFLICT (content_hash) DO NOTHING` garanciájával
  - Egyezik egy régi chunk-kal → DNS adatbázis; nincs újra-embedding
  - Nem egyezik → INSERT; az embedding is csak akkor készül, ha új

**Gyakorlati folyamat**:
- Módosított dokumentum → újrachunkolás
- Chunk-szinten: csak a ténylegesen megváltozott chunkok mennek OpenAI-be
- Teljes dokumentum újra-vektorizálásra NINCS szükség

### 3.2. Mi történik az új dokumentummal? Mi történik a törölt dokumentum chunkjaival?

**Új dokumentum**:
1. `source_id` nem létezik az adatbázisban
2. PDF feldolgozás: szöveg-tisztítás → chunking → SHA-256 content_hash
3. Minden chunk-hoz: embedding (OpenAI)
4. INSERT a knowledge_chunks táblába
5. `doc_hash` besorolása (az ingest később ezt ellenőrzi)

**Módosított dokumentum**:
1. `doc_hash` eltér a tárolt verzióétól → felismerés
2. Újrachunkolás az új PDF-ből
3. Chunk-onként:
   - Új `content_hash` → INSERT (az `ON CONFLICT DO NOTHING` elkerüli a duplikációt)
   - Régi `content_hash`, de az új verzióban már nem szerepel → **DELETE** az adatbázisból
4. Az elavult chunkok (már nem releváns) eltávolítása automatikus

**Törölt dokumentum**:
1. A `source_id` már nem szerepel a forrás-listában
2. `DELETE WHERE source_id = 'X'` → az összes hozzátartozó chunk törlése

### 3.3. Mikor / mi triggereli az újraindexelést?

**Trigger-lehetőségek**:
1. **Manuális**: `npm run knowledge:ingest` — adminisztrátor döntésre
2. **Ütemezett (cron)**: napi/heti automatikus újraépítés
3. **Forrás-webhook**: ha a szabvány-kiadó (ETSI) értesítő szolgáltatása elérhető
4. **Fájl-figyelő**: `sources/` mappa monitorozása; új/módosított PDF → trigger
5. **Teljes újraépítés**: kis korpusz (20 doc) esetén a teljes reindexálás is olcsó

**Idempotencia**: az ingest többszöri futtatása biztonságos (content_hash UNIQUE) — nem duplikál.

---

## 4. Adatmodell

### `knowledge_chunks` tábla

| Oszlop | Típus | Szerepe |
|--------|-------|--------|
| `id` | serial | Elsődleges kulcs |
| `source_id` | text | Dokumentumazonosító (pl. "ETSI EN 319 142-1") |
| `source_url` | text | PDF URL |
| `clause_path` | text | Klauzula-hivatkozás (pl. "6.1 Signature levels") |
| `content` | text | Chunk szövege (200–1600 karakter) |
| `content_hash` | text | SHA-256(content) — chunk-szintű változásérzékelés |
| `doc_hash` | text | SHA-256(teljes dokumentum) — dokumentum-szintű változásérzékelés |
| `embedding` | vector(1536) | pgvector (OpenAI text-embedding-3-small) |
| `created_at` | timestamp | Beillesztés időpontja |

**Indexek**: `(source_id)`, `(content_hash)` UNIQUE

---

## 5. Reprodukció és hordozhatóság

- **SQL dump**: `db/knowledge_dump.sql` (1 657 chunk, teljes embedding-ekkel)
- Másik PostgreSQL-be betöltés: `npm run db:restore` — ingyenes, OpenAI-hívás nélküli
- Séma replikálása: `npm run migrate` + `npm run db:restore` bármely új környezetben

---

![Architektúra](architektura.png)

*Az ábra a teljes adatfolyamot szemlélteti: PDF forrás → SHA-256 doc_hash (változásérzékelés) → chunking → SHA-256 content_hash (chunk-szintű deduplikáció) → embedding → pgvector tárolás, valamint a módosítás/törlés útvonalát.*
