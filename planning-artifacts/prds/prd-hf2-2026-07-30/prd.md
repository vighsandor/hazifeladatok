---
title: Customer Distance API — Offline Geocoding & Distance Service
status: draft
created: 2026-07-30
updated: 2026-07-30
project: hf2-learning
scope: internal-learning
---

## Overview

Build a minimal, offline REST service that loads customer data, geocodes them locally using a bundled city-coordinate reference, and serves distance calculations from Budapest. No external APIs, no runtime LLM calls. Learning goal: understand seed idempotency, local data transforms, and unit-testable distance logic.

---

## Problem & Opportunity

**Context**: We have 15 customers in 15 European cities (seed-customers.json). Each has a city name, but no coordinates. We need to:
1. Load them into Postgres once, safely (no duplicates on re-run)
2. Assign lat/lon from a local city-coordinate registry (15 cities, hardcoded)
3. Serve two REST endpoints that work with partial data (nulls for unknown cities, logged gracefully)
4. Validate haversine distance math with unit tests

**Why offline?** Eliminates API latency, key mismanagement, and rate limits. Cities are fixed; geocoding is deterministic.

---

## Success Metrics

1. ✓ **Idempotent seed**: Run `npm run seed` twice → still 15 rows, no duplicates (`ON CONFLICT` or equivalent verified by test)
2. ✓ **Count endpoint**: `GET /customers/count` returns `{ "count": 15 }`
3. ✓ **Distance endpoint**: `GET /customers/by-distance` returns customers sorted by distance to Budapest (0 km first), with `distanceKm` field (1 decimal), nulls at end sorted by name
4. ✓ **Haversine unit tests**: Budapest–Vienna ≈ 214.0 km, Budapest–Budapest = 0.0 km, null-coordinate handled without crash
5. ✓ **Null handling**: Unknown city → lat/lon = null, logged, no error, customer still appears in count and at end of distance list
6. ✓ **City matching**: Robust normalization (case-insensitive, trimmed, diacritics-aware)

---

## Functional Requirements

### FR1: Seed Loading (Idempotent)
- Source: `seed-customers.json` (15 customers)
- Target: `customers` table in Postgres
- Deduplication key: `name` (unique constraint or `ON CONFLICT DO NOTHING`)
- Test: Run seed twice, verify count = 15, no duplicates

### FR2: Local Geocoding
- Reference: 15-city lookup table (bundled in code, from `ellenorzo-adatok.md`):
  ```
  Budapest: 47.4979, 19.0402
  Vienna: 48.2082, 16.3738
  Munich: 48.1351, 11.5820
  ... (12 more cities)
  ```
- Matching: City name from seed → lookup by normalized key (lowercase, trim, diacritics)
- Fallback: If city not found → lat = null, lon = null (no error)
- Logging: "City 'XYZ' not found in geocode registry" (debug level) for unknown cities

### FR3: REST Endpoints

#### GET /customers/count
- Response: `{ "count": <integer> }`
- Returns: Total number of customers (should match actual DB row count)

#### GET /customers/by-distance
- Response: Array of customer objects sorted by distance to Budapest
- Fields per customer: `id`, `name`, `telepules`, `lat`, `lon`, `distanceKm` (number or null), `budget` (optional), `note` (optional)
- Sorting:
  1. Known coordinates: ascending distance to Budapest (47.4979, 19.0402)
  2. Unknown coordinates: end of list (distanceKm = null)
  3. Tiebreaker: `name` (alphabetical)
- Distance unit: kilometers, rounded to 1 decimal place
- Algorithm: Haversine (great-circle distance)

### FR4: Distance Calculation
- Algorithm: Haversine formula
- Reference point: Budapest (47.4979, 19.0402)
- Output: kilometers, 1 decimal place
- Edge cases:
  - Same point (Budapest) → 0.0 km
  - Null coordinates → null distance (no error)

---

## Non-Functional Requirements

### NFR1: Offline Operation
- No geocoding API calls (Google Maps, OpenStreetMap, etc.)
- No runtime LLM calls
- All coordinates bundled with code

### NFR2: Technology Stack
- Runtime: Node.js + Express
- Language: TypeScript (via tsx, no separate build step)
- Database: PostgreSQL (connection via DATABASE_URL env)
- Migration: npm-driven Node script (no psql CLI required)
- Testing: Jest (with TypeScript support)

### NFR3: Database
- Schema: `customers` table with `id`, `name`, `telepules`, `lat`, `lon`, and optional `budget`, `note`
- Constraint: Unique `name` (deduplication key)
- Idempotency: Migrations must be safe to re-run; seed uses `ON CONFLICT DO NOTHING`

### NFR4: Configuration
- DATABASE_URL: Read from `.env` (not checked in; `.env.example` in repo for reference)
- PORT: Env var (default 3000)
- City reference: Bundled in code (constants or JSON), no external file load

### NFR5: Logging & Error Handling
- Seed: Log city geocoding misses (debug level, not fatal)
- Distance API: Return 500 only if DB connection fails; invalid queries return 400 with message
- All errors to console (simple logging, no Winston/Pino)

### NFR6: Testing
- Unit tests for haversine:
  - Budapest → Vienna ≈ 214.0 km (known distance, +/- 0.1 km tolerance)
  - Budapest → Budapest = 0.0 km
  - Null coordinates: function returns null, no throw
- Integration test (optional): Seed + query, verify count and order

---

## Key Assumptions (Approved)

1. ✓ Database connection is stable and available (10.0.0.106:5432)
2. ✓ Seed file (seed-customers.json) exists and is valid JSON
3. ✓ All 15 cities in seed match the 15-city reference (verified in ellenorzo-adatok.md)
4. ✓ No query auth required; single-user learning environment
5. ✓ City name matching is case/diacritic-insensitive but exact substring (no fuzzy)
6. ✓ Postgres ON CONFLICT mechanism available (not SQLite)
7. ✓ TypeScript + tsx + Jest can run post-npm-install without additional CLI tools

---

## Concerns & Mitigations

| Concern | Mitigation |
|---------|-----------|
| Seed runs twice, duplicates appear | Unique name constraint + ON CONFLICT DO NOTHING in migration |
| City not in reference → crash | Null lat/lon allowed; logged, no throw; endpoint handles gracefully |
| Haversine precision | Known-distance validation (214 km Budapest–Vienna); unit test tolerance ±0.1 km |
| DATABASE_URL missing at start | .env.example in repo; seed script exits with clear message if not set |
| TypeScript build overhead | Use tsx (no compile step), dependencies installed via npm install |

---

## Implementation Scope

### In Scope
- Postgres schema (customers table + migration script)
- Express app (two endpoints)
- Local geocoding (constant lookup)
- Haversine distance (utility, unit-tested)
- Idempotent seed script
- README (setup, run, test)
- Unit & integration tests

### Out of Scope
- Admin endpoints (no user management, CRUD, etc.)
- Caching (small dataset, no need)
- Advanced auth/secrets (single-user learning)
- Frontend (API only)
- Deployment/containerization (local dev only)

---

## Next Steps

1. **Epics & Stories** → Break into dev tasks (schema, seed, endpoints, tests, README)
2. **Development** → Implement story by story, one commit per story
3. **Testing** → Unit tests + local manual validation
4. **Finalize** → README complete, all tests passing, endpoints live
