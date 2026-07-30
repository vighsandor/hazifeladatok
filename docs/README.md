# Customer Locator API Agent

A TypeScript agent that generates a complete, offline-first REST API for customer geo-localization.

## What It Does

Parses a YAML `skill.md` blueprint and generates:
- Express.js REST API (TypeScript)
- PostgreSQL migrations and idempotent seed loading
- Haversine distance calculations (customers sorted by distance from Budapest)
- Jest unit tests

**Key Features:**
- Zero external APIs (offline-first, no geocoding service)
- Modular agent architecture (parser, codegen, executor)
- Handlebars templating for code generation
- Idempotent seed loading (safe to run multiple times)
- Hybrid execution: Skill + CLI

## Quick Start

```bash
# 1. Setup env
cp .env.example .env
# Edit: DATABASE_URL=postgresql://hf2:hf2@10.0.0.106:5432/hf2

# 2. Generate API
npm run generate ./skill.md ./generated-api

# 3. Run API
cd generated-api
npm install
npm run dev
```

## Generated Project Structure

```
generated-api/
├── src/
│   ├── index.ts        # Express server
│   ├── db.ts           # Postgres pool
│   ├── routes.ts       # /customers/* endpoints
│   ├── geo.ts          # haversine, town lookup
│   └── seed.ts         # idempotent seed
├── migrations/
│   └── 001-init.sql    # customers table
├── __tests__/
│   └── geo.test.ts     # unit tests
├── package.json        # generated scripts
└── .env.example        # placeholder
```

## API Endpoints

```
GET /customers/count
→ { "count": 15 }

GET /customers/by-distance
→ [
  { "id": 1, "name": "Anna Kovács", "distanceKm": 0.0, "lat": 47.4979, "lon": 19.0402 },
  { "id": 2, "name": "Lena Fischer", "distanceKm": 214.0, "lat": 48.2082, "lon": 16.3738 },
  ...
]
```

## Testing

```bash
# Unit tests (haversine, town normalization)
npm test

# Haversine validation
# Budapest → Vienna: 214.0 km ✓
# Budapest → Budapest: 0.0 km ✓
# null coordinates: distanceKm: null ✓
```

## Documentation

- [DESIGN.md](./DESIGN.md) – Architecture, modules, templates
- [USAGE.md](./USAGE.md) – Detailed usage guide
- [OPERATIONS.md](./OPERATIONS.md) – Deployment, troubleshooting
- [HANDOVER.md](./HANDOVER.md) – Tech assumptions, next steps
- [SKILL_EXTENSION.md](./SKILL_EXTENSION.md) – How to extend

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.0+
- **Framework:** Express 4.18+
- **DB:** PostgreSQL 12+
- **Testing:** Jest 29+
- **Templates:** Handlebars 4.7+

## License

MIT
