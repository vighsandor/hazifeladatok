# Database Dump & Reproduction Guide

## Contents

The `knowledge_dump.sql` file contains a complete SQL dump of the `knowledge_chunks` table from the ETSI electronic-signature standards knowledge base. This table stores:

- **Rows**: 1,657 chunks (from 20 PDF documents)
- **Columns**: 
  - `id`: Primary key (UUID)
  - `content`: Chunk text (cleaned, de-noised ETSI standard excerpts)
  - `embedding`: 1536-dimensional vector (OpenAI text-embedding-3-small)
  - `source_id`: Document identifier (e.g., "ETSI EN 319 142-1")
  - `clause_path`: Section reference (e.g., "6.1 Signature levels")
  - `source_url`: Link to PDF source
  - `content_hash`: SHA256 hash for idempotent ingestion
  - `created_at`: Insertion timestamp

**Extension**: The dump includes `CREATE EXTENSION IF NOT EXISTS vector;` for pgvector support.

**Schema**: The schema definition and migration logic are in `src/db/migrate.ts`.

---

## Reproduction in Another Environment

### Option A: Fresh Database Setup (Recommended for CI/Testing)

If you're setting up on a new database server:

1. **Prerequisites**:
   - PostgreSQL 12+ with pgvector extension installed
   - Node.js 18+

2. **Steps**:
   ```bash
   # 1. Clone the repo and install dependencies
   npm install

   # 2. Set DATABASE_URL in .env to your target PostgreSQL
   export DATABASE_URL="postgresql://user:password@host:5432/knowledge_db"

   # 3. Initialize schema (creates extension + table structure)
   npm run migrate

   # 4. Load knowledge chunks from dump (NO OpenAI API calls)
   npm run db:restore
   ```

3. **Verification**: `npm run db:restore` prints the row count before and after the load
   (expected: 1,657 rows).

### Option B: Rebuild from Source PDFs

If you want to re-ingest from the original PDF manifest (requires OpenAI API key):

```bash
# Assumes schema is already created (npm run migrate)
npm run knowledge:ingest
```

This re-processes all 20 PDFs, re-chunks, re-embeds, and inserts into the database. Takes ~2-3 minutes due to OpenAI embedding API calls.

---

## Scripts

Both scripts talk to PostgreSQL through the `pg` client. **No `pg_dump` / `psql` needed.**

### Dump (Export)
```bash
npm run db:dump
```
Exports the current `knowledge_chunks` table to `db/knowledge_dump.sql`.
- Automatically creates the `db/` directory if missing
- **Data only** — plain `INSERT` statements, no schema. The schema comes from
  `npm run migrate` (`src/db/migrate.ts`), which is its single source of truth.
- Embeddings are written as `'[...]'::vector` literals, timestamps as quoted ISO strings
- Each `INSERT` carries `ON CONFLICT DO NOTHING`, so restores are idempotent

### Restore (Import)
```bash
npm run db:restore            # load next to existing data (idempotent)
npm run db:restore -- --fresh # empty the table first, then load
```
Imports the dump file into the target database specified by `.env DATABASE_URL`.
- **Run `npm run migrate` first** — the dump carries no schema
- Runs in a single transaction; with `--fresh` the `TRUNCATE` is part of it, so a failed
  load rolls back to the original content
- Advances `knowledge_chunks_id_seq` past the restored ids
- Does NOT call OpenAI; purely SQL-based

---

## Prerequisites for Production / Multi-Environment

### For dump/restore scripts to work:
- **Nothing beyond `npm install`** — both scripts use the `pg` client, so no PostgreSQL
  command-line tools are required.

### For the target database:
- **pgvector extension**: Must be enabled
  - `npm run migrate` runs `CREATE EXTENSION IF NOT EXISTS vector;` — the dump no longer does
  - If that fails with "extension vector not found", the pgvector binary is missing from the
    server (a `CREATE EXTENSION` cannot install it); use e.g. the `pgvector/pgvector:pg16` image

### For re-ingestion (if rebuilding from PDFs):
- **OpenAI API key** in `.env` (only if using `npm run knowledge:ingest`)
- **PDF manifest** at `src/manifest.json` (already included in repo)

---

## Troubleshooting

### `relation "knowledge_chunks" does not exist`
The dump carries data only. Run `npm run migrate` first to create the schema.

### `ERROR: extension "vector" does not exist`
The target PostgreSQL does not have pgvector installed. Install it or use a PostgreSQL image with pgvector pre-installed (e.g., `pgvector/pgvector:pg16`).

### Dump file is incomplete or empty
- Check that DATABASE_URL is correct and server is reachable
- Verify credentials (user, password, database name)
- Ensure the `knowledge_chunks` table exists and is populated (`npm run migrate`, then check
  the row count printed by `npm run db:restore`)

---

## Docker Example

To quickly set up a pgvector-enabled PostgreSQL for testing:

```bash
docker run --rm -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=knowledge \
  -p 5432:5432 pgvector/pgvector:pg16

# In another terminal
export DATABASE_URL="postgresql://postgres:testpass@localhost:5432/knowledge"
npm run db:restore
```

---

## File Size & Performance

- **Dump file size**: ~32 MB (plain `INSERT` statements; the 1536-dim vectors dominate it)
- **Restore time**: ~10-20 seconds (depends on network and disk I/O)
- **Query performance**: Vector similarity search (~0.2s for raw search, <0.5s with HyDE + reranking)
