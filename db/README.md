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

3. **Verification**:
   ```bash
   # Query should return ~1,657 rows
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM knowledge_chunks;"
   ```

### Option B: Rebuild from Source PDFs

If you want to re-ingest from the original PDF manifest (requires OpenAI API key):

```bash
# Assumes schema is already created (npm run migrate)
npm run knowledge:ingest
```

This re-processes all 20 PDFs, re-chunks, re-embeds, and inserts into the database. Takes ~2-3 minutes due to OpenAI embedding API calls.

---

## Scripts

### Dump (Export)
```bash
npm run db:dump
```
Exports the current `knowledge_chunks` table to `db/knowledge_dump.sql`.
- Automatically creates the `db/` directory if missing
- Prepends `CREATE EXTENSION IF NOT EXISTS vector;` if not present
- Requires `pg_dump` command-line tool (PostgreSQL client)

### Restore (Import)
```bash
npm run db:restore
```
Imports the dump file into the target database specified by `.env DATABASE_URL`.
- Requires `psql` command-line tool (PostgreSQL client)
- Warns about pgvector prerequisite
- Does NOT call OpenAI; purely SQL-based

---

## Prerequisites for Production / Multi-Environment

### For dump/restore scripts to work:
- **PostgreSQL client tools**: `pg_dump` and `psql` must be in PATH
  - **macOS**: `brew install postgresql`
  - **Ubuntu/Debian**: `sudo apt-get install postgresql-client`
  - **Windows**: [Download PostgreSQL installer](https://www.postgresql.org/download/windows/) or use `pgtools`

### For the target database:
- **pgvector extension**: Must be enabled
  - The dump script handles `CREATE EXTENSION IF NOT EXISTS vector;`
  - If restore fails with "extension vector not found", run on the target:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

### For re-ingestion (if rebuilding from PDFs):
- **OpenAI API key** in `.env` (only if using `npm run knowledge:ingest`)
- **PDF manifest** at `src/manifest.json` (already included in repo)

---

## Troubleshooting

### `pg_dump: command not found`
Install PostgreSQL client tools (see Prerequisites above).

### `psql: command not found`
Same as above.

### `ERROR: extension "vector" does not exist`
The target PostgreSQL does not have pgvector installed. Install it or use a PostgreSQL image with pgvector pre-installed (e.g., `pgvector/pgvector:pg16`).

### Dump file is incomplete or empty
- Check that DATABASE_URL is correct and server is reachable
- Verify credentials (user, password, database name)
- Ensure the `knowledge_chunks` table exists: `psql $DATABASE_URL -c "\d knowledge_chunks"`

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

- **Dump file size**: ~10-15 MB (compressed with COPY binary format)
- **Restore time**: ~10-20 seconds (depends on network and disk I/O)
- **Query performance**: Vector similarity search (~0.2s for raw search, <0.5s with HyDE + reranking)
