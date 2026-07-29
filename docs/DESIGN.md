# Customer Locator API – Design Document

**Date:** 2026-07-29  
**Version:** 1.0.0  
**Status:** Approved for Implementation  
**Author:** Claude Code Brainstorming Session

---

## Executive Summary

A modular TypeScript agent-based system that generates and orchestrates a complete REST API service for customer geo-localization. The agent parses a YAML skill definition, generates Express + TypeScript + PostgreSQL code, runs DB migrations and idempotent seed loading, and validates everything with unit tests. Zero external APIs (offline-first), fully parameterized via `skill.md`.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [skill.md Format (YAML)](#2-skillmd-format-yaml)
3. [Agent Modules](#3-agent-modules)
4. [Code Generation (Templates → Output)](#4-code-generation-templates--output)
5. [Documentation & Versioning](#5-documentation--versioning)
6. [Execution Flow](#6-execution-flow-step-by-step)
7. [Testing Strategy](#7-testing-strategy)
8. [Runtime & TypeScript Execution](#8-runtime--typescript-execution)
9. [Error Handling & Resilience](#9-error-handling--resilience)
10. [USAGE.md & Troubleshooting](#10-usagemd--troubleshooting)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    skill.md (YAML)                      │
│  project, database, server, data, steps configuration   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           TypeScript Agent (CLI + Skill)                │
│  ┌──────────┐  ┌────────┐  ┌──────────────────────┐   │
│  │ Parser   │→ │ CodeGen│→ │ Executor (npm/psql)  │   │
│  └──────────┘  └────────┘  └──────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   src/index.ts  migrations/   __tests__/
   src/db.ts     001-init.sql  geo.test.ts
   src/routes.ts
   src/geo.ts
   src/seed.ts
   package.json
```

**Flow:**
1. **skill.md** — centralized configuration (YAML, env var overridable)
2. **Parser** — validates YAML, loads seed data, resolves coordinates
3. **CodeGen** — renders Handlebars templates with config bindings
4. **Executor** — runs CLI steps: `npm install`, `psql migrate`, `npm run seed`, `npm test`
5. **Generated REST API** — Express server listening on `host:port`, endpoints functional

---

## 2. skill.md Format (YAML)

```yaml
project:
  name: customer-locator-api
  language: typescript
  framework: express
  description: Offline geo-localized customer REST service

database:
  url: ${DATABASE_URL}  # env var, fallback to hardcoded if needed

server:
  host: 0.0.0.0        # external network access
  port: 3000

data:
  seedFile: seed-customers.json              # input seed
  coordinatesRef: ellenorzo-adatok.md        # town → lat/lon lookup table

steps:
  - npm-install        # npm install
  - migrate-db         # psql < migrations/001-init.sql
  - seed-data          # npm run seed
  - run-tests          # npm test
  # start-server: omitted – manual `npm run dev` / `npm start`
```

**Features:**
- Environment variable substitution: `${DATABASE_URL}` → reads from `.env` or process.env
- Extensible: new steps can be added to `steps:` array
- Version-tracked: update `version:` field for semantic releases

---

## 3. Agent Modules

```
src/
├── agent.ts              # CLI entry point + Skill wrapper
│   └─ exports Agent class, runs parser → codegen → executor
├── parser.ts             # YAML → structured Config object
│   ├─ loadSkillMd()      # reads skill.md
│   ├─ validateConfig()   # schema validation
│   └─ loadSeed()         # JSON.parse seed-customers.json
├── codegen.ts            # Config → TypeScript files via Handlebars
│   ├─ renderTemplate()   # Handlebars + config bindings
│   └─ writeFile()        # disk write with mkdir
├── executor.ts           # subprocess management
│   ├─ exec()             # runs CLI commands, captures output
│   └─ executeStep()      # switch on step type, error handling
├── templates/
│   ├── index.ts.hbs      # Express app entry
│   ├── db.ts.hbs         # Postgres pool + query helpers
│   ├── routes.ts.hbs     # GET /customers/* endpoints
│   ├── geo.ts.hbs        # haversine + town lookup + normalization
│   ├── seed.ts.hbs       # idempotent seed (ON CONFLICT DO NOTHING)
│   ├── geo.test.ts.hbs   # Jest unit tests
│   ├── 001-init.sql.hbs  # CREATE TABLE customers
│   ├── package.json.hbs  # scripts + dependencies
│   ├── .env.example.hbs  # template for .env
│   └── .gitignore.hbs    # node_modules, .env, dist
└── logger.ts             # simple log utility (no external deps)
```

**Design Principle:** Each module has one responsibility.
- **parser:** understands YAML + env vars
- **codegen:** transforms config → code
- **executor:** runs subprocess commands
- **templates:** contain the output code skeleton

---

## 4. Code Generation (Templates → Output)

**Example: index.ts.hbs**
```typescript
import express from 'express';
import { pool } from './db';
import { seed } from './seed';
import routes from './routes';
import { log } from './logger';

const app = express();
app.use(express.json());

app.use('/customers', routes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const start = async () => {
  try {
    log.info('Seeding database...');
    await seed();
    log.info('Seed complete');
    
    app.listen({{server.port}}, '{{server.host}}', () => {
      log.info(`Server running on http://{{server.host}}:{{server.port}}`);
    });
  } catch (err) {
    log.error('Startup failed', err);
    process.exit(1);
  }
};

start();
```

**Handlebars substitution:**
- `{{server.port}}` → from config
- `{{server.host}}` → from config
- `{{coordinates}}` → loaded town → lat/lon map
- `{{seedData}}` → parsed JSON

**Output:** fully functional TypeScript files, ready for `tsx` or `tsc`.

---

## 5. Documentation & Versioning

**Deliverable docs/ structure:**
```
docs/
├── DESIGN.md           # this file – architecture + design decisions
├── README.md           # project overview, quick start
├── USAGE.md            # step-by-step CLI + Skill usage
├── HANDOVER.md         # tech debt, assumptions, next steps
├── OPERATIONS.md       # deployment, backup, monitoring, troubleshooting
├── SKILL_EXTENSION.md  # how to add new steps/templates
├── SKILL_EXAMPLES.md   # skill.md variants (custom port, SQLite, etc.)
├── API_SPECIFICATION.md# OpenAPI-like endpoint docs
└── CHANGELOG.md        # version history, breaking changes
```

**Versioning (Semantic):**
- `package.json` → `"version": "1.0.0"`
- `skill.md` → `version: 1.0.0` (top-level field)
- Release: `git tag v1.0.0`, CHANGELOG entry
- Breaking change (skill.md format overhaul) → major bump (v2.0.0)

---

## 6. Execution Flow (Step-by-Step)

### When Skill Runs (Harness)

```
1. Harness invokes `.claude/agents/setup-api.md` skill
2. Agent initialization:
   - Parser reads skill.md
   - Env var override: --port 3001 etc.
   - Validate config schema
3. For each step in config.steps:
   - CodeGen renders templates
   - Executor runs subprocess (npm install, psql, etc.)
   - Capture stdout/stderr, log progress
   - On error: abort + show error message
4. Success: all files written, tests pass
5. Next: user manually runs `npm run dev` to start server
```

### When CLI Runs (Fallback)

```bash
npm run generate -- --skill-file ./skill.md
```

Same agent code, different entry point (node vs. harness context).

### Error Handling

| Scenario | Action |
|----------|--------|
| skill.md not found | error + usage hint |
| DATABASE_URL missing | error + check .env |
| Template render fails | skip file, log warning, continue |
| npm install fails | abort, show npm error |
| psql migration fails | abort, show psql error |
| Seed idempotent insert fails | log warning, continue (ON CONFLICT handles duplicates) |

---

## 7. Testing Strategy

### Agent Unit Tests

```typescript
// __tests__/agent.test.ts (tests the agent itself)
describe('Parser', () => {
  it('parses valid skill.md YAML', () => { ... });
  it('overwrites port from CLI flag', () => { ... });
  it('loads seed-customers.json without error', () => { ... });
  it('resolves all 15 towns to coordinates', () => { ... });
});

describe('CodeGen', () => {
  it('renders index.ts template', () => { ... });
  it('renders geo.ts with town lookup table', () => { ... });
  it('renders seed.ts with ON CONFLICT clause', () => { ... });
});

describe('Executor', () => {
  it('runs npm install without error', () => { ... });
  it('runs psql migration without error', () => { ... });
  it('captures command stderr', () => { ... });
});
```

### Generated API Tests (geo.test.ts)

```typescript
// Generated by agent, covers haversine + distance sorting
describe('Haversine Distance', () => {
  it('Budapest → Vienna = 214.0 km', () => {
    const dist = haversine(47.4979, 19.0402, 48.2082, 16.3738);
    expect(Math.round(dist * 10) / 10).toBe(214.0);
  });

  it('Budapest → Budapest = 0.0 km', () => {
    const dist = haversine(47.4979, 19.0402, 47.4979, 19.0402);
    expect(dist).toBe(0);
  });

  it('null coordinates → distanceKm: null', () => {
    const dist = haversine(null, null, 47.4979, 19.0402);
    expect(dist).toBeNull();
  });
});

describe('Distance sorting', () => {
  it('returns customers sorted by distance, Budapest first', () => {
    // mock /customers/by-distance
    // assert order: Anna (0 km), Lena (214 km), ...
  });

  it('puts null-distance customers at end', () => {
    // if any town not in coordinates ref
  });

  it('breaks ties with name', () => {
    // if two customers same distance, sort by name ASC
  });
});
```

### Integration Test (E2E)

```bash
npm run test  # runs jest
```

Verifies: agent generates code, migrations run, seed loads, tests pass, API responds.

---

## 8. Runtime & TypeScript Execution

### package.json Scripts Template

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "migrate": "psql $DATABASE_URL < migrations/001-init.sql",
    "seed": "tsx src/seed.ts",
    "generate": "tsx src/agent.ts"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "dotenv": "^16.3.0"
  }
}
```

### Runtime Modes

| Command | Execution | Use Case |
|---------|-----------|----------|
| `npm run dev` | `tsx src/index.ts` | Development (live TypeScript) |
| `npm run build` | `tsc` | Compile to `dist/` |
| `npm start` | `node dist/index.js` | Production (precompiled) |
| `npm test` | `jest` | Unit + integration tests |
| `npm run generate` | `tsx src/agent.ts` | (Re)generate all code |

### Logging Strategy

Simple, built-in, no external dependencies:

```typescript
// src/logger.ts
export const log = {
  info: (msg: string) => 
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  error: (msg: string, err?: Error) => 
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, err?.message || ''),
  warn: (msg: string) => 
    console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
};
```

Later, swap for `winston` or `pino` if needed.

---

## 9. Error Handling & Resilience

### Seed Idempotency

**Migration (001-init.sql):**
```sql
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telepules VARCHAR(255),
  lat DECIMAL(10, 6),
  lon DECIMAL(10, 6),
  budget INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, telepules)  -- Prevent duplicates
);
```

**Seed (seed.ts):**
```typescript
const seed = async () => {
  const data = JSON.parse(fs.readFileSync('seed-customers.json', 'utf-8'));
  
  for (const customer of data) {
    const coords = lookupCoordinates(customer.location.city);
    
    try {
      await pool.query(`
        INSERT INTO customers (name, telepules, lat, lon, budget, note)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name, telepules) DO NOTHING
      `, [
        customer.name,
        customer.location.city,
        coords.lat,
        coords.lon,
        customer.budget,
        customer.note
      ]);
    } catch (err) {
      log.error(`Failed to insert ${customer.name}`, err as Error);
      // Don't abort – idempotent seed continues
    }
  }
  
  log.info('Seed complete');
};
```

Running seed twice = idempotent (ON CONFLICT DO NOTHING).

### Town Lookup & Normalization

```typescript
// src/geo.ts
const coordinatesMap: Record<string, { lat: number; lon: number }> = {
  'budapest': { lat: 47.4979, lon: 19.0402 },
  'vienna': { lat: 48.2082, lon: 16.3738 },
  // ... 13 more
};

const normalizeTown = (town: string): string => 
  town
    .toLowerCase()
    .trim()
    .replace(/[áéíóöůčšž]/g, c => ({
      á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ů: 'u', č: 'c', š: 's', ž: 'z'
    }[c] || c));

const lookupCoordinates = (city: string): { lat: number | null; lon: number | null } => {
  const normalized = normalizeTown(city);
  const coords = coordinatesMap[normalized];
  
  if (!coords) {
    log.warn(`Unknown town: ${city}`);
    return { lat: null, lon: null };
  }
  
  return coords;
};
```

**Robustness:**
- Case-insensitive: "Budapest" → "budapest"
- Accent-insensitive: "Václav" → "vaclav"
- Whitespace-trimmed: "  Prague  " → "prague"
- Unknown town → `{ lat: null, lon: null }` (not an error)

### Executor Error Capture

```typescript
// src/executor.ts
import { execSync } from 'child_process';

const exec = (cmd: string): void => {
  try {
    const output = execSync(cmd, {
      stdio: 'inherit',  // show output in real-time
      encoding: 'utf-8',
      env: process.env,
    });
  } catch (err) {
    log.error(`Command failed: ${cmd}`);
    throw err;  // abort agent
  }
};

const executeStep = async (step: string, config: Config): Promise<void> => {
  try {
    switch (step) {
      case 'npm-install':
        exec('npm install');
        break;
      case 'migrate-db':
        exec(`psql ${config.database.url} < migrations/001-init.sql`);
        break;
      case 'seed-data':
        exec('npm run seed');
        break;
      case 'run-tests':
        exec('npm test');
        break;
      default:
        log.warn(`Unknown step: ${step}`);
    }
  } catch (err) {
    log.error(`Step '${step}' failed`, err as Error);
    throw err;  // abort entire agent
  }
};
```

---

## 10. USAGE.md & Troubleshooting

See `docs/USAGE.md` for detailed step-by-step guide. Key points:

### Quick Start

```bash
# 1. Setup env
cp .env.example .env
# Edit: DATABASE_URL=postgresql://hf2:hf2@10.0.0.106:5432/hf2

# 2. Run skill (harness)
/setup-api

# Or CLI fallback
npm install
npm run generate
npm run test
npm run dev
```

### API Endpoints

```
GET /customers/count
→ { "count": 15 }

GET /customers/by-distance
→ [
    { "id": 1, "name": "Anna Kovács", "telepules": "Budapest", "distanceKm": 0.0, "lat": 47.4979, "lon": 19.0402 },
    { "id": 2, "name": "Lena Fischer", "telepules": "Vienna", "distanceKm": 214.0, ... },
    ...
  ]
```

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `DATABASE_URL not set` | .env missing or wrong | `cp .env.example .env` + edit |
| `psql: command not found` | postgres-client not installed | `apt-get install postgresql-client` (Linux) or `brew install postgresql` (Mac) |
| `npm ERR! ERESOLVE` | peer dep conflict | `npm install --legacy-peer-deps` |
| `jest: no tests found` | templates not generated | Check `npm run generate` output |
| `Connection refused` | server not running | `npm run dev` |
| Duplicate seed entries | idempotency broken | Check `ON CONFLICT` in seed.ts |
| Town not found warning | coordinates ref incomplete | Add to coordinatesMap in geo.ts |

---

## Appendix: Requirements Checklist

- ✅ REST API on Postgres (Express, TypeScript)
- ✅ Offline: no external geocoding API, no LLM calls
- ✅ Seed data: seed-customers.json (15 customers)
- ✅ Data model: customers (id, name, telepules, lat, lon, + optional budget/note)
- ✅ Idempotent seed loading (ON CONFLICT DO NOTHING)
- ✅ Local town → lat/lon reference (ellenorzo-adatok.md)
- ✅ Robust town matching (case/accent/whitespace-insensitive)
- ✅ GET /customers/count → { count: 15 }
- ✅ GET /customers/by-distance → sorted by distance from Budapest, nulls at end
- ✅ Unit tests: haversine (Budapest–Vienna 214 km, Budapest–Budapest 0 km, null handling)
- ✅ Full documentation: README, USAGE, OPERATIONS, HANDOVER, SKILL_EXTENSION
- ✅ Small, focused commits (agent generates → user commits)
- ✅ Postgres on 10.0.0.106:5432
- ✅ DATABASE_URL from env (not hardcoded)
- ✅ .env in .gitignore, .env.example in repo
- ✅ Hybrid skill + CLI execution
- ✅ TypeScript, Express, Jest, Raw SQL
- ✅ Modular agent architecture (parser, codegen, executor)
- ✅ Semantic versioning

---

## Sign-Off

**Design Status:** ✅ Approved  
**Next Step:** Implementation (via `writing-plans` skill)  
**Assumptions:** Postgres already running, Node.js 18+ available, all seed + coord data valid  
**Tech Stack:** Node.js + Express + TypeScript + Jest + pg + Handlebars  
**Deliverable:** Functional REST API + full documentation + versioned skill.md
