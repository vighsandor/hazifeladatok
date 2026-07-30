---
title: Customer Distance API — Epics & Stories
status: draft
created: 2026-07-30
---

# Epics & Stories — Development Sequence

Each story is **one focused commit**. Order matters: dependencies first.

---

## Epic 1: Project Setup & Dependencies

### Story 1.1 — Initialize Node.js Project
**Acceptance Criteria:**
- [ ] `npm init -y` (generates package.json)
- [ ] `.gitignore` includes `node_modules/`, `.env`, `dist/`, `*.log`
- [ ] `.env.example` created with template: `DATABASE_URL=postgresql://...`
- [ ] Dependency list ready for next story

**Implementation:**
- `package.json` with basic metadata
- `.gitignore` finalized
- `.env.example` with placeholder

**Commit message:** "Project setup: npm init, .gitignore, .env.example"

---

### Story 1.2 — Install & Configure Dependencies
**Dependencies:**
- `express` (REST framework)
- `pg` (Postgres driver)
- `typescript` (language)
- `tsx` (TypeScript runner, no build step)
- `jest` (test framework)
- `@types/jest` (Jest types)
- `@types/express` (Express types)
- `@types/node` (Node types)

**Acceptance Criteria:**
- [ ] `npm install` completes without errors
- [ ] `npm run migrate` is callable (script entry exists; will fail if no DB, but no "not found" error)
- [ ] `npm test` is callable (Jest runs, finds no tests yet, exits cleanly)
- [ ] `npm start` is callable (will fail if no DB, but no "not found" error)

**Implementation:**
- `package.json` scripts: `start`, `migrate`, `seed`, `test`
- `tsconfig.json` configured for Node + CommonJS
- All deps installed

**Commit message:** "Install dependencies: express, pg, typescript, jest, tsx"

---

## Epic 2: Database Schema & Migrations

### Story 2.1 — Create Migration Script Infrastructure
**Acceptance Criteria:**
- [ ] `src/migrations/00_init.ts` exists
- [ ] Migration script uses `pg` client directly (no ORM)
- [ ] Script reads `DATABASE_URL` from env
- [ ] `npm run migrate` executes migration and exits cleanly (or fails gracefully if DB unavailable)
- [ ] Multiple runs are safe (idempotent: `CREATE TABLE IF NOT EXISTS`)

**Implementation:**
- `src/migrations/00_init.ts`: Postgres schema
- `src/index.ts` or similar: Entry point that loads env and runs migration
- Database connection logic

**Commit message:** "Add migration infrastructure: Connection, idempotent setup"

---

### Story 2.2 — Create Customers Table
**Acceptance Criteria:**
- [ ] `customers` table exists with columns:
  - `id` (SERIAL PRIMARY KEY)
  - `name` (VARCHAR UNIQUE NOT NULL)
  - `telepules` (VARCHAR)
  - `lat` (NUMERIC nullable)
  - `lon` (NUMERIC nullable)
  - `budget` (NUMERIC nullable)
  - `note` (TEXT nullable)
  - `created_at` (TIMESTAMP DEFAULT now())
- [ ] UNIQUE constraint on `name` verified
- [ ] Migration runs twice without error (idempotent)
- [ ] Table exists in Postgres after `npm run migrate`

**Implementation:**
- SQL in migration script
- Error handling for connection failures

**Commit message:** "Create customers table with UNIQUE name constraint"

---

## Epic 3: Local Geocoding & Seed Data

### Story 3.1 — Create City Coordinate Reference
**Acceptance Criteria:**
- [ ] `src/data/cityCoordinates.ts` exports array of `{ city: string; lat: number; lon: number }`
- [ ] All 15 cities from `ellenorzo-adatok.md` included with exact coordinates
- [ ] Coordinates are readonly constants (not loaded from file)
- [ ] Can be imported and tested independently

**Cities (verified exact coordinates from ellenorzo-adatok.md):**
```
Budapest: 47.4979, 19.0402
Vienna: 48.2082, 16.3738
Munich: 48.1351, 11.5820
Milan: 45.4642, 9.1900
Barcelona: 41.3874, 2.1686
Lyon: 45.7640, 4.8357
Kraków: 50.0647, 19.9450
Prague: 50.0755, 14.4378
Lisbon: 38.7223, -9.1393
Amsterdam: 52.3676, 4.9041
Stockholm: 59.3293, 18.0686
Ljubljana: 46.0569, 14.5058
Bucharest: 44.4268, 26.1025
Dublin: 53.3498, -6.2603
Copenhagen: 55.6761, 12.5683
```

**Commit message:** "Add city coordinates reference: 15 cities bundled"

---

### Story 3.2 — Implement City Matching Logic
**Acceptance Criteria:**
- [ ] Function `normalizeCity(name: string): string` exists
  - Lowercase
  - Trim whitespace
  - Remove diacritics (if needed; basic: `ü→u`, `é→e`, etc.)
- [ ] Function `findCoordinates(city: string): { lat: number; lon: number } | null` exists
- [ ] Matching is case-insensitive and diacritic-insensitive
- [ ] Returns null if city not found (no throw)
- [ ] Unit test: "Budapest" = "budapest" = "BUDAPEST"

**Implementation:**
- `src/utils/geocoding.ts`: normalization + lookup functions
- Test file: `src/utils/geocoding.test.ts`

**Commit message:** "Add city matching: normalization and coordinate lookup"

---

### Story 3.3 — Create Seed Script (Idempotent)
**Acceptance Criteria:**
- [ ] `src/scripts/seed.ts` exists and runs via `npm run seed`
- [ ] Script reads `seed-customers.json`
- [ ] For each customer:
  - Normalize city name
  - Look up coordinates (fallback: null if not found)
  - Insert into `customers` table with `name`, `telepules`, `lat`, `lon`, `budget`, `note`
- [ ] Uses `ON CONFLICT (name) DO NOTHING` to prevent duplicates
- [ ] Logs: "Loaded 15 customers" and any "City 'XYZ' not found" warnings
- [ ] Run twice: still 15 rows, no duplicates (verified via count)
- [ ] Null coordinates do NOT cause error; customer is inserted with null lat/lon

**Implementation:**
- Read JSON file
- Normalize + geocode loop
- SQL INSERT OR IGNORE
- Log summary

**Commit message:** "Add idempotent seed script: Load, geocode, deduplicate"

---

### Story 3.4 — Test Idempotent Seed & Null Handling
**Acceptance Criteria:**
- [ ] Integration test: Run seed, verify count = 15
- [ ] Run seed again, verify count still = 15 (no duplicates)
- [ ] Manually remove one city from coordinate reference, re-seed, verify:
  - Customer still inserted (lat/lon = null)
  - "City 'XYZ' not found" logged
  - No crash
  - Count still 15

**Commit message:** "Test: Idempotent seed and null-coordinate handling"

---

## Epic 4: Distance Calculation & Utility

### Story 4.1 — Implement Haversine Distance Function
**Acceptance Criteria:**
- [ ] Function `haversine(lat1: number, lon1: number, lat2: number, lon2: number): number`
- [ ] Returns distance in kilometers (1 decimal place)
- [ ] Handles null inputs: returns null (no throw)
- [ ] Uses standard WGS84 Earth radius (6371 km)
- [ ] Formula correct: `2 * R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlon/2)))`

**Commit message:** "Add haversine distance calculation utility"

---

### Story 4.2 — Unit Test Haversine
**Acceptance Criteria:**
- [ ] Test file: `src/utils/distance.test.ts`
- [ ] Test case 1: Budapest → Vienna ≈ 214.0 km (tolerance ±0.5 km)
- [ ] Test case 2: Budapest → Budapest = 0.0 km
- [ ] Test case 3: Null coordinates → function returns null
- [ ] All tests pass locally

**Implementation:**
- Jest unit tests
- Known-distance validation

**Commit message:** "Add haversine unit tests: Budapest–Vienna, 0 km, null-case"

---

## Epic 5: REST API Endpoints

### Story 5.1 — Create Express App & Count Endpoint
**Acceptance Criteria:**
- [ ] `src/app.ts` exports Express app
- [ ] `GET /customers/count` returns `{ "count": <number> }`
- [ ] Count matches actual DB row count
- [ ] App starts on PORT (default 3000)
- [ ] `npm start` launches server

**Implementation:**
- Express app setup
- Database connection pooling (optional, simple for learning)
- Count endpoint handler

**Commit message:** "Add Express app and /customers/count endpoint"

---

### Story 5.2 — Implement /customers/by-distance Endpoint
**Acceptance Criteria:**
- [ ] `GET /customers/by-distance` returns array of customers
- [ ] Each customer object includes: `id`, `name`, `telepules`, `lat`, `lon`, `distanceKm`, `budget`, `note`
- [ ] Sorted by `distanceKm` (ascending), reference point Budapest (47.4979, 19.0402)
- [ ] Budapest customer first (0 km)
- [ ] Unknown-coordinate customers at end (distanceKm: null), sorted by name
- [ ] Distance values rounded to 1 decimal place
- [ ] Tiebreaker: `name` (alphabetical)

**Expected order (verified against ellenorzo-adatok.md):**
```
1. Anna Kovács (Budapest) — 0.0 km
2. Lena Fischer (Vienna) — 214.0 km
3. Katarzyna Nowak (Kraków) — 293.0 km
... (12 more in distance order)
15. Isabella Silva (Lisbon) — 2469.4 km
```

**Commit message:** "Add /customers/by-distance endpoint with haversine sorting"

---

### Story 5.3 — Test REST Endpoints
**Acceptance Criteria:**
- [ ] Integration test: `npm test` includes endpoint tests
- [ ] `GET /customers/count` returns 15
- [ ] `GET /customers/by-distance` returns 15 items in correct distance order
- [ ] Distance values match expected (Budapest–Vienna = 214.0 km, etc.)
- [ ] Null-coordinate handling: customers with null lat/lon appear at end

**Commit message:** "Test: REST endpoints for count and distance"

---

## Epic 6: Documentation & Finalization

### Story 6.1 — Write README
**Acceptance Criteria:**
- [ ] `README.md` includes:
  - Project description (offline customer distance service)
  - Prerequisites (Node.js, npm, PostgreSQL connection)
  - Setup steps:
    1. Clone repo
    2. `npm install`
    3. Create `.env` with `DATABASE_URL`
    4. `npm run migrate`
    5. `npm run seed`
    6. `npm start`
  - Endpoints: `/customers/count`, `/customers/by-distance`
  - Testing: `npm test`
  - Example responses
  - Troubleshooting (missing DB, .env, etc.)

**Commit message:** "Add README: setup, usage, testing"

---

### Story 6.2 — Final Validation & Edge Cases
**Acceptance Criteria:**
- [ ] All tests pass: `npm test`
- [ ] Server runs: `npm start` (listens on PORT)
- [ ] `curl http://localhost:3000/customers/count` → `{ "count": 15 }`
- [ ] `curl http://localhost:3000/customers/by-distance` → correct order
- [ ] Seed runs twice without duplication
- [ ] Manually verify all 15 customers in DB
- [ ] Check logs for any "not found" geocoding warnings (all 15 cities should be found)

**Commit message:** "Validate: All endpoints, tests, idempotent seed confirmed"

---

## Development Checklist

- [ ] Story 1.1: Project setup
- [ ] Story 1.2: Dependencies
- [ ] Story 2.1: Migration infrastructure
- [ ] Story 2.2: Customers table
- [ ] Story 3.1: City coordinates
- [ ] Story 3.2: City matching
- [ ] Story 3.3: Seed script
- [ ] Story 3.4: Seed + null tests
- [ ] Story 4.1: Haversine
- [ ] Story 4.2: Haversine unit tests
- [ ] Story 5.1: Count endpoint
- [ ] Story 5.2: Distance endpoint
- [ ] Story 5.3: Endpoint tests
- [ ] Story 6.1: README
- [ ] Story 6.2: Final validation

**Total: ~13–15 commits** (one per story, or grouped if very small).
