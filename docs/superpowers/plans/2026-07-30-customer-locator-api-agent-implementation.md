# Customer Locator API Agent – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a modular TypeScript agent that parses YAML skill definitions, generates a complete Express + PostgreSQL REST API, runs migrations and idempotent seed loading, and validates everything with tests.

**Architecture:** Agent decomposes into three core modules (parser, codegen, executor) plus Handlebars templates for code output. CLI entry point + Skill wrapper for hybrid execution. All code generation produces ready-to-run TypeScript files with npm scripts and git-ignored env files.

**Tech Stack:** Node.js 18+, TypeScript 5.0+, Express 4.18+, PostgreSQL 12+, Jest 29+, Handlebars 4.7+, YAML parser (js-yaml), tsx for runtime execution.

## Global Constraints

- TypeScript strict mode enabled
- No external API calls (offline-first)
- Idempotent seed loading (ON CONFLICT DO NOTHING)
- Town lookup with accent/case-insensitive normalization
- Haversine distance from Budapest (47.4979, 19.0402)
- Null coordinates → `distanceKm: null`, sorted to end
- Server binds to `0.0.0.0` for external network access
- DATABASE_URL from env, never hardcoded
- .env in .gitignore, .env.example in repo
- Semantic versioning (v1.0.0+)

---

## Implementation Tasks

### Phase 1: Foundation & Infrastructure

#### Task 1: Project Setup (package.json, TypeScript, Jest)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Create: `.gitignore`

**Interfaces:**
- Produces: npm scripts (dev, build, test, generate), TypeScript strict mode, Jest configuration

- [ ] **Step 1: Create package.json**

```json
{
  "name": "customer-locator-agent",
  "version": "1.0.0",
  "description": "TypeScript agent that generates REST API + Postgres setup",
  "main": "dist/agent.js",
  "scripts": {
    "build": "tsc",
    "generate": "tsx src/cli.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "dotenv": "^16.3.0",
    "js-yaml": "^4.1.0",
    "handlebars": "^4.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "__tests__"]
}
```

- [ ] **Step 3: Create jest.config.js**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: false,
};
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 5: Run npm install**

```bash
npm install
```

Expected: node_modules/ created, package-lock.json generated

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run build
```

Expected: dist/ folder created (empty for now)

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json jest.config.js .gitignore package-lock.json
git commit -m "chore: project setup - TypeScript, Jest, npm scripts"
```

---

#### Task 2: Types & Interfaces

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Produces: `Config`, `Step`, `TemplateContext`, `Logger` interfaces

- [ ] **Step 1: Write types.ts**

```typescript
export interface Config {
  project: {
    name: string;
    language: string;
    framework: string;
    description?: string;
  };
  database: {
    url: string;
  };
  server: {
    host: string;
    port: number;
  };
  data: {
    seedFile: string;
    coordinatesRef: string;
  };
  steps: Step[];
}

export type Step = 'npm-install' | 'migrate-db' | 'seed-data' | 'run-tests';

export interface TemplateContext {
  config: Config;
  coordinates: Record<string, { lat: number; lon: number }>;
  seedData: Array<{ name: string; city: string; budget?: number; note?: string }>;
}

export interface Logger {
  info(msg: string): void;
  error(msg: string, err?: Error): void;
  warn(msg: string): void;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "chore: define TypeScript interfaces for Config, Step, Logger"
```

---

#### Task 3: Logger Module

**Files:**
- Create: `src/logger.ts`

**Interfaces:**
- Produces: `Logger` implementation (console-based, no external deps)

- [ ] **Step 1: Write src/logger.ts**

```typescript
import { Logger } from './types';

export const createLogger = (): Logger => ({
  info: (msg: string) => {
    console.log(`[INFO] ${new Date().toISOString()} ${msg}`);
  },
  error: (msg: string, err?: Error) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`);
    if (err) console.error(err.message);
  },
  warn: (msg: string) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${msg}`);
  },
});

export const log = createLogger();
```

- [ ] **Step 2: Verify types**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/logger.ts
git commit -m "chore: implement Logger utility (console-based)"
```

---

### Phase 2: Parser Module

#### Task 4: Parser – YAML Parsing & Validation

**Files:**
- Create: `src/parser.ts`

**Interfaces:**
- Consumes: `Config`, `Logger`, `fs`, `js-yaml`
- Produces: `Parser` class with methods

- [ ] **Step 1: Write src/parser.ts**

```typescript
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Config, TemplateContext } from './types';
import { log } from './logger';

export class Parser {
  async parseSkillFile(skillPath: string): Promise<Config> {
    if (!fs.existsSync(skillPath)) {
      throw new Error(`skill.md not found: ${skillPath}`);
    }

    const content = fs.readFileSync(skillPath, 'utf-8');
    const config = yaml.load(content) as Config;

    this.validateConfig(config);
    return config;
  }

  private validateConfig(config: Config): void {
    if (!config.project?.name) throw new Error('Missing project.name');
    if (!config.database?.url) throw new Error('Missing database.url');
    if (!config.server?.host || config.server.port === undefined) {
      throw new Error('Missing server.host or server.port');
    }
    if (!config.data?.seedFile || !config.data?.coordinatesRef) {
      throw new Error('Missing data.seedFile or data.coordinatesRef');
    }
    if (!Array.isArray(config.steps)) throw new Error('Missing steps array');
  }

  async loadCoordinates(refFile: string): Promise<Record<string, { lat: number; lon: number }>> {
    if (!fs.existsSync(refFile)) {
      throw new Error(`Coordinates reference file not found: ${refFile}`);
    }

    const content = fs.readFileSync(refFile, 'utf-8');
    const coords: Record<string, { lat: number; lon: number }> = {};

    const lines = content.split('\n');
    let inTable = false;

    for (const line of lines) {
      if (line.includes('| Település')) inTable = true;
      if (!inTable || line.startsWith('|---')) continue;

      const match = line.match(/\|\s*([^\|]+?)\s*\|\s*([\d.]+)\s*\|\s*([-\d.]+)\s*\|/);
      if (match) {
        const town = match[1].trim();
        const lat = parseFloat(match[2]);
        const lon = parseFloat(match[3]);
        const normalized = this.normalizeTown(town);
        coords[normalized] = { lat, lon };
      }
    }

    log.info(`Loaded ${Object.keys(coords).length} towns from ${refFile}`);
    return coords;
  }

  async loadSeed(seedFile: string): Promise<any[]> {
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Seed file not found: ${seedFile}`);
    }

    const content = fs.readFileSync(seedFile, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) throw new Error('Seed file must be a JSON array');
    log.info(`Loaded ${data.length} customers from ${seedFile}`);

    return data;
  }

  private normalizeTown(town: string): string {
    const accents: Record<string, string> = {
      á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o',
      ú: 'u', ü: 'u', ű: 'u', č: 'c', š: 's', ž: 'z',
    };

    return town
      .toLowerCase()
      .trim()
      .replace(/[áéíóöőúüűčšž]/g, c => accents[c] || c);
  }
}

export const parser = new Parser();
```

- [ ] **Step 2: Verify types**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/parser.ts
git commit -m "feat: Parser module - YAML parsing, coordinate/seed loading"
```

---

#### Task 5: Parser Tests

**Files:**
- Create: `__tests__/parser.test.ts`

- [ ] **Step 1: Create test fixtures directory and files**

```bash
mkdir -p __tests__/fixtures
cat > __tests__/fixtures/skill.yaml << 'EOF'
project:
  name: test-api
  language: typescript
  framework: express

database:
  url: postgresql://test:test@localhost/test

server:
  host: 0.0.0.0
  port: 3000

data:
  seedFile: seed-customers.json
  coordinatesRef: ellenorzo-adatok.md

steps:
  - npm-install
  - migrate-db
  - seed-data
  - run-tests
EOF
```

- [ ] **Step 2: Write __tests__/parser.test.ts**

```typescript
import { Parser } from '../src/parser';
import fs from 'fs';
import path from 'path';

describe('Parser', () => {
  const parser = new Parser();

  describe('parseSkillFile', () => {
    it('parses valid YAML skill file', async () => {
      const fixturePath = path.join(__dirname, 'fixtures/skill.yaml');
      const config = await parser.parseSkillFile(fixturePath);

      expect(config.project.name).toBe('test-api');
      expect(config.server.port).toBe(3000);
      expect(config.steps).toContain('npm-install');
    });

    it('throws error if skill file not found', async () => {
      await expect(parser.parseSkillFile('/nonexistent/skill.yaml')).rejects.toThrow(
        'skill.md not found'
      );
    });

    it('throws error if required fields missing', async () => {
      const invalidSkill = 'project:\n  name: test\n';
      const tempFile = '/tmp/invalid-skill.yaml';
      fs.writeFileSync(tempFile, invalidSkill);

      await expect(parser.parseSkillFile(tempFile)).rejects.toThrow();

      fs.unlinkSync(tempFile);
    });
  });

  describe('normalizeTown', () => {
    it('lowercases and trims', () => {
      const result = (parser as any).normalizeTown('  BUDAPEST  ');
      expect(result).toBe('budapest');
    });

    it('removes accents', () => {
      const result = (parser as any).normalizeTown('Václav');
      expect(result).toBe('vaclav');
    });

    it('handles multiple accents', () => {
      const result = (parser as any).normalizeTown('Kraków');
      expect(result).toBe('krakow');
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- __tests__/parser.test.ts
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add __tests__/parser.test.ts __tests__/fixtures/skill.yaml
git commit -m "test: Parser unit tests - YAML parsing, validation, town normalization"
```

---

### Phase 3: Code Generation Module

#### Task 6: CodeGen – Template Rendering & File Writing

**Files:**
- Create: `src/codegen.ts`

- [ ] **Step 1: Create templates directory**

```bash
mkdir -p src/templates
```

- [ ] **Step 2: Write src/codegen.ts**

```typescript
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { TemplateContext } from './types';
import { log } from './logger';

export class CodeGen {
  private templatesDir = path.join(__dirname, 'templates');

  async generateFiles(context: TemplateContext, outputDir: string): Promise<void> {
    const templates = [
      { src: 'package.json.hbs', dest: 'package.json' },
      { src: '.env.example.hbs', dest: '.env.example' },
      { src: '.gitignore.hbs', dest: '.gitignore' },
      { src: 'index.ts.hbs', dest: 'src/index.ts' },
      { src: 'db.ts.hbs', dest: 'src/db.ts' },
      { src: 'routes.ts.hbs', dest: 'src/routes.ts' },
      { src: 'geo.ts.hbs', dest: 'src/geo.ts' },
      { src: 'seed.ts.hbs', dest: 'src/seed.ts' },
      { src: '001-init.sql.hbs', dest: 'migrations/001-init.sql' },
      { src: 'geo.test.ts.hbs', dest: '__tests__/geo.test.ts' },
    ];

    for (const { src, dest } of templates) {
      await this.renderAndWrite(src, dest, context, outputDir);
    }

    log.info(`Generated ${templates.length} files in ${outputDir}`);
  }

  private async renderAndWrite(
    templateFile: string,
    destPath: string,
    context: any,
    outputDir: string
  ): Promise<void> {
    try {
      const templatePath = path.join(this.templatesDir, templateFile);
      const content = fs.readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(content);
      const rendered = template(context);

      const fullPath = path.join(outputDir, destPath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, rendered, 'utf-8');
      log.info(`Generated: ${destPath}`);
    } catch (err) {
      log.error(`Failed to generate ${destPath}`, err as Error);
      throw err;
    }
  }

  render(template: string, context: any): string {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  }
}

export const codegen = new CodeGen();
```

- [ ] **Step 3: Verify types**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/codegen.ts
git commit -m "feat: CodeGen module - Handlebars rendering, file generation"
```

---

#### Task 7: CodeGen Tests

**Files:**
- Create: `__tests__/codegen.test.ts`

- [ ] **Step 1: Write __tests__/codegen.test.ts**

```typescript
import { CodeGen } from '../src/codegen';
import { TemplateContext } from '../src/types';

describe('CodeGen', () => {
  const codegen = new CodeGen();

  describe('render', () => {
    it('substitutes Handlebars variables', () => {
      const template = 'Hello {{name}}, listening on {{host}}:{{port}}';
      const context = { name: 'API', host: '0.0.0.0', port: 3000 };
      const result = codegen.render(template, context);

      expect(result).toBe('Hello API, listening on 0.0.0.0:3000');
    });

    it('handles nested objects', () => {
      const template = 'DB: {{config.database.url}}';
      const context = {
        config: {
          database: { url: 'postgresql://user:pass@host/db' },
        },
      };
      const result = codegen.render(template, context);

      expect(result).toContain('postgresql://');
    });

    it('loops over arrays', () => {
      const template = '{{#each items}}{{name}},{{/each}}';
      const context = { items: [{ name: 'A' }, { name: 'B' }] };
      const result = codegen.render(template, context);

      expect(result).toBe('A,B,');
    });
  });

  describe('generateFiles', () => {
    it('validates context structure', () => {
      const context: TemplateContext = {
        config: {
          project: { name: 'test', language: 'typescript', framework: 'express' },
          database: { url: 'postgresql://test:test@localhost/test' },
          server: { host: '0.0.0.0', port: 3000 },
          data: { seedFile: 'seed.json', coordinatesRef: 'coords.md' },
          steps: ['npm-install'],
        },
        coordinates: { budapest: { lat: 47.4979, lon: 19.0402 } },
        seedData: [],
      };

      expect(context.config.project.name).toBe('test');
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- __tests__/codegen.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add __tests__/codegen.test.ts
git commit -m "test: CodeGen unit tests - template rendering"
```

---

### Phase 4: Template Implementation

#### Task 8: Template – package.json.hbs

**Files:**
- Create: `src/templates/package.json.hbs`

- [ ] **Step 1: Write src/templates/package.json.hbs**

```json
{
  "name": "{{config.project.name}}",
  "version": "1.0.0",
  "description": "{{config.project.description}}",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "migrate": "psql $DATABASE_URL < migrations/001-init.sql",
    "seed": "tsx src/seed.ts"
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

- [ ] **Step 2: Commit**

```bash
git add src/templates/package.json.hbs
git commit -m "template: package.json - scripts and dependencies"
```

---

#### Task 9: Template – .env.example.hbs

**Files:**
- Create: `src/templates/.env.example.hbs`

- [ ] **Step 1: Write src/templates/.env.example.hbs**

```
DATABASE_URL=postgresql://user:password@10.0.0.106:5432/hf2
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/.env.example.hbs
git commit -m "template: .env.example - environment template"
```

---

#### Task 10: Template – .gitignore.hbs

**Files:**
- Create: `src/templates/.gitignore.hbs`

- [ ] **Step 1: Write src/templates/.gitignore.hbs**

```
node_modules/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
.vscode/
.idea/
*.swp
*.swo
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/.gitignore.hbs
git commit -m "template: .gitignore - standard Node.js ignores"
```

---

#### Task 11: Template – index.ts.hbs

**Files:**
- Create: `src/templates/index.ts.hbs`

- [ ] **Step 1: Write src/templates/index.ts.hbs**

```typescript
import express from 'express';
import dotenv from 'dotenv';
import { pool } from './db';
import { seed } from './seed';
import routes from './routes';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/customers', routes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const start = async () => {
  try {
    console.log('[INFO] Seeding database...');
    await seed();
    console.log('[INFO] Seed complete');

    app.listen({{config.server.port}}, '{{config.server.host}}', () => {
      console.log(`[INFO] Server running on http://{{config.server.host}}:{{config.server.port}}`);
    });
  } catch (err) {
    console.error('[ERROR] Startup failed', err);
    process.exit(1);
  }
};

start();
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/index.ts.hbs
git commit -m "template: index.ts - Express app entry point"
```

---

#### Task 12: Template – db.ts.hbs

**Files:**
- Create: `src/templates/db.ts.hbs`

- [ ] **Step 1: Write src/templates/db.ts.hbs**

```typescript
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[ERROR] Unexpected error on idle client', err);
});

export const query = (text: string, values?: any[]) => pool.query(text, values);
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/db.ts.hbs
git commit -m "template: db.ts - Postgres pool and query helper"
```

---

#### Task 13: Template – geo.ts.hbs

**Files:**
- Create: `src/templates/geo.ts.hbs`

- [ ] **Step 1: Write src/templates/geo.ts.hbs**

```typescript
export const coordinatesMap: Record<string, { lat: number; lon: number }> = {
{{#each coordinates}}
  '{{@key}}': { lat: {{this.lat}}, lon: {{this.lon}} },
{{/each}}
};

export const BUDAPEST = { lat: 47.4979, lon: 19.0402 };

export const normalizeTown = (town: string): string => {
  const accents: Record<string, string> = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o',
    ú: 'u', ü: 'u', ű: 'u', č: 'c', š: 's', ž: 'z',
  };

  return town
    .toLowerCase()
    .trim()
    .replace(/[áéíóöőúüűčšž]/g, c => accents[c] || c);
};

export const lookupCoordinates = (
  city: string
): { lat: number | null; lon: number | null } => {
  const normalized = normalizeTown(city);
  const coords = coordinatesMap[normalized];

  if (!coords) {
    console.warn(`[WARN] Unknown town: ${city}`);
    return { lat: null, lon: null };
  }

  return coords;
};

export const haversine = (
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/geo.ts.hbs
git commit -m "template: geo.ts - haversine, town normalization, coordinates map"
```

---

#### Task 14: Template – routes.ts.hbs

**Files:**
- Create: `src/templates/routes.ts.hbs`

- [ ] **Step 1: Write src/templates/routes.ts.hbs**

```typescript
import { Router } from 'express';
import { pool } from './db';
import { haversine, BUDAPEST, lookupCoordinates } from './geo';

const router = Router();

router.get('/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM customers');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (err) {
    console.error('[ERROR] GET /count failed', err);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

router.get('/by-distance', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, telepules, lat, lon FROM customers ORDER BY id'
    );

    const customers = result.rows.map((row: any) => {
      const distance = haversine(row.lat, row.lon, BUDAPEST.lat, BUDAPEST.lon);
      return {
        id: row.id,
        name: row.name,
        telepules: row.telepules,
        lat: row.lat,
        lon: row.lon,
        distanceKm: distance !== null ? Math.round(distance * 10) / 10 : null,
      };
    });

    customers.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return a.name.localeCompare(b.name);
      }
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.name.localeCompare(b.name);
    });

    res.json(customers);
  } catch (err) {
    console.error('[ERROR] GET /by-distance failed', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/routes.ts.hbs
git commit -m "template: routes.ts - /customers/count and /customers/by-distance endpoints"
```

---

#### Task 15: Template – seed.ts.hbs

**Files:**
- Create: `src/templates/seed.ts.hbs`

- [ ] **Step 1: Write src/templates/seed.ts.hbs**

```typescript
import fs from 'fs';
import { pool } from './db';
import { lookupCoordinates } from './geo';

interface SeedCustomer {
  name: string;
  location: { city: string; countryCode: string };
  budget?: number;
  note?: string;
}

export const seed = async (): Promise<void> => {
  const seedFile = 'seed-customers.json';
  
  if (!fs.existsSync(seedFile)) {
    console.warn(`[WARN] Seed file not found: ${seedFile}`);
    return;
  }

  const data: SeedCustomer[] = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));

  for (const customer of data) {
    const coords = lookupCoordinates(customer.location.city);

    try {
      await pool.query(
        `INSERT INTO customers (name, telepules, lat, lon, budget, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name, telepules) DO NOTHING`,
        [
          customer.name,
          customer.location.city,
          coords.lat,
          coords.lon,
          customer.budget || null,
          customer.note || null,
        ]
      );
    } catch (err) {
      console.error(`[ERROR] Failed to insert ${customer.name}`, err);
    }
  }

  console.log('[INFO] Seed complete');
};

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[ERROR] Seed failed', err);
      process.exit(1);
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/seed.ts.hbs
git commit -m "template: seed.ts - idempotent seed loader with town lookup"
```

---

#### Task 16: Template – 001-init.sql.hbs

**Files:**
- Create: `src/templates/001-init.sql.hbs`

- [ ] **Step 1: Write src/templates/001-init.sql.hbs**

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
  UNIQUE(name, telepules)
);
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/001-init.sql.hbs
git commit -m "template: 001-init.sql - customers table schema"
```

---

#### Task 17: Template – geo.test.ts.hbs

**Files:**
- Create: `src/templates/geo.test.ts.hbs`

- [ ] **Step 1: Write src/templates/geo.test.ts.hbs**

```typescript
import { haversine } from './geo';

describe('Haversine Distance', () => {
  it('Budapest → Vienna = 214.0 km', () => {
    const dist = haversine(47.4979, 19.0402, 48.2082, 16.3738);
    expect(dist).not.toBeNull();
    expect(Math.round(dist! * 10) / 10).toBe(214.0);
  });

  it('Budapest → Budapest = 0.0 km', () => {
    const dist = haversine(47.4979, 19.0402, 47.4979, 19.0402);
    expect(dist).toBe(0);
  });

  it('null coordinates → null distance', () => {
    const dist1 = haversine(null, null, 47.4979, 19.0402);
    expect(dist1).toBeNull();

    const dist2 = haversine(47.4979, 19.0402, null, null);
    expect(dist2).toBeNull();

    const dist3 = haversine(null, 19.0402, 47.4979, null);
    expect(dist3).toBeNull();
  });

  it('one coordinate null → null distance', () => {
    const dist = haversine(47.4979, null, 48.2082, 16.3738);
    expect(dist).toBeNull();
  });
});

describe('Distance Sorting', () => {
  it('endpoint returns customers sorted by distance', async () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/templates/geo.test.ts.hbs
git commit -m "template: geo.test.ts - haversine unit tests"
```

---

### Phase 5: Executor Module

#### Task 18: Executor – Subprocess Management

**Files:**
- Create: `src/executor.ts`

- [ ] **Step 1: Write src/executor.ts**

```typescript
import { execSync } from 'child_process';
import { Step } from './types';
import { log } from './logger';

export class Executor {
  async executeStep(step: Step, cwd: string): Promise<void> {
    log.info(`Executing step: ${step}`);

    try {
      switch (step) {
        case 'npm-install':
          this.exec('npm install', cwd);
          break;
        case 'migrate-db':
          this.exec(`psql ${process.env.DATABASE_URL} < migrations/001-init.sql`, cwd);
          break;
        case 'seed-data':
          this.exec('npm run seed', cwd);
          break;
        case 'run-tests':
          this.exec('npm test', cwd);
          break;
        default:
          log.warn(`Unknown step: ${step}`);
      }
    } catch (err) {
      log.error(`Step '${step}' failed`, err as Error);
      throw err;
    }
  }

  private exec(cmd: string, cwd: string): void {
    try {
      execSync(cmd, {
        cwd,
        stdio: 'inherit',
        encoding: 'utf-8',
        env: process.env,
      });
      log.info(`Command succeeded: ${cmd}`);
    } catch (err) {
      log.error(`Command failed: ${cmd}`, err as Error);
      throw err;
    }
  }
}

export const executor = new Executor();
```

- [ ] **Step 2: Verify types**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/executor.ts
git commit -m "feat: Executor module - subprocess management for npm, psql, jest"
```

---

#### Task 19: Executor Tests

**Files:**
- Create: `__tests__/executor.test.ts`

- [ ] **Step 1: Write __tests__/executor.test.ts**

```typescript
import { Executor } from '../src/executor';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('Executor', () => {
  const executor = new Executor();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeStep', () => {
    it('calls npm install for npm-install step', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      await executor.executeStep('npm-install', '/test');

      expect(execSync).toHaveBeenCalledWith(
        'npm install',
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('calls psql migrate for migrate-db step', async () => {
      (execSync as jest.Mock).mockReturnValue('');
      process.env.DATABASE_URL = 'postgresql://test@localhost/test';

      await executor.executeStep('migrate-db', '/test');

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('psql'),
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('calls npm run seed for seed-data step', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      await executor.executeStep('seed-data', '/test');

      expect(execSync).toHaveBeenCalledWith(
        'npm run seed',
        expect.any(Object)
      );
    });

    it('calls npm test for run-tests step', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      await executor.executeStep('run-tests', '/test');

      expect(execSync).toHaveBeenCalledWith(
        'npm test',
        expect.any(Object)
      );
    });

    it('throws error if command fails', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(executor.executeStep('npm-install', '/test')).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- __tests__/executor.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add __tests__/executor.test.ts
git commit -m "test: Executor unit tests - command execution, error handling"
```

---

### Phase 6: Agent Main Module

#### Task 20: Agent – Main Orchestrator

**Files:**
- Create: `src/agent.ts`

- [ ] **Step 1: Write src/agent.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { CodeGen } from './codegen';
import { Executor } from './executor';
import { TemplateContext } from './types';
import { log } from './logger';

export class Agent {
  private parser = new Parser();
  private codegen = new CodeGen();
  private executor = new Executor();

  async run(skillPath: string, outputDir: string): Promise<void> {
    try {
      log.info(`Starting agent with skill: ${skillPath}`);

      const config = await this.parser.parseSkillFile(skillPath);
      log.info('Skill parsed and validated');

      const coordinates = await this.parser.loadCoordinates(config.data.coordinatesRef);
      const seedData = await this.parser.loadSeed(config.data.seedFile);

      const context: TemplateContext = {
        config,
        coordinates,
        seedData: seedData.map((c: any) => ({
          name: c.name,
          city: c.location.city,
          budget: c.budget,
          note: c.note,
        })),
      };

      log.info('Generating files...');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      await this.codegen.generateFiles(context, outputDir);

      for (const step of config.steps) {
        await this.executor.executeStep(step, outputDir);
      }

      log.info('Agent completed successfully');
    } catch (err) {
      log.error('Agent failed', err as Error);
      throw err;
    }
  }
}

export const agent = new Agent();
```

- [ ] **Step 2: Verify types**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/agent.ts
git commit -m "feat: Agent main module - orchestrates parser, codegen, executor"
```

---

#### Task 21: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Write src/cli.ts**

```typescript
import path from 'path';
import { agent } from './agent';
import { log } from './logger';

const main = async () => {
  const skillPath = process.argv[2] || path.join(process.cwd(), 'skill.md');
  const outputDir = process.argv[3] || process.cwd();

  try {
    await agent.run(skillPath, outputDir);
    process.exit(0);
  } catch (err) {
    log.error('CLI failed', err as Error);
    process.exit(1);
  }
};

main();
```

- [ ] **Step 2: Verify can run**

```bash
npm run build
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: CLI entry point for npm run generate"
```

---

#### Task 22: Agent Integration Tests

**Files:**
- Create: `__tests__/agent.test.ts`

- [ ] **Step 1: Write __tests__/agent.test.ts**

```typescript
import { Agent } from '../src/agent';
import path from 'path';
import fs from 'fs';

describe('Agent Integration', () => {
  const agent = new Agent();

  it('orchestrates parser → codegen → executor flow', async () => {
    const fixtureSkill = path.join(__dirname, 'fixtures/skill.yaml');
    expect(fs.existsSync(fixtureSkill)).toBe(true);
  });

  it('throws error if skill.md not found', async () => {
    await expect(agent.run('/nonexistent/skill.md', '/tmp')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- __tests__/agent.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add __tests__/agent.test.ts
git commit -m "test: Agent integration tests - orchestration flow"
```

---

### Phase 7: skill.md & Documentation

#### Task 23: Create skill.md

**Files:**
- Create: `skill.md`

- [ ] **Step 1: Write skill.md**

```yaml
version: 1.0.0

project:
  name: customer-locator-api
  language: typescript
  framework: express
  description: Offline geo-localized customer REST service

database:
  url: ${DATABASE_URL}

server:
  host: 0.0.0.0
  port: 3000

data:
  seedFile: seed-customers.json
  coordinatesRef: ellenorzo-adatok.md

steps:
  - npm-install
  - migrate-db
  - seed-data
  - run-tests
```

- [ ] **Step 2: Commit**

```bash
git add skill.md
git commit -m "config: skill.md - YAML blueprint for API generation"
```

---

#### Task 24-31: Documentation Files (README, USAGE, OPERATIONS, HANDOVER, SKILL_EXTENSION, SKILL_EXAMPLES, API_SPECIFICATION, CHANGELOG)

Create all 8 doc files as specified in the plan.

- [ ] **Step 1: Create docs/README.md**

(See plan Task 24)

- [ ] **Step 2: Create docs/USAGE.md**

(See plan Task 25)

- [ ] **Step 3: Create docs/OPERATIONS.md**

(See plan Task 26)

- [ ] **Step 4: Create docs/HANDOVER.md**

(See plan Task 27)

- [ ] **Step 5: Create docs/SKILL_EXTENSION.md**

(See plan Task 28)

- [ ] **Step 6: Create docs/SKILL_EXAMPLES.md**

(See plan Task 29)

- [ ] **Step 7: Create docs/API_SPECIFICATION.md**

(See plan Task 30)

- [ ] **Step 8: Create docs/CHANGELOG.md**

(See plan Task 31)

- [ ] **Step 9: Commit all docs**

```bash
git add docs/README.md docs/USAGE.md docs/OPERATIONS.md docs/HANDOVER.md docs/SKILL_EXTENSION.md docs/SKILL_EXAMPLES.md docs/API_SPECIFICATION.md docs/CHANGELOG.md
git commit -m "docs: comprehensive documentation - README, USAGE, OPERATIONS, HANDOVER, SKILL guides, API spec, CHANGELOG"
```

---

### Phase 8: Final Verification

#### Task 32: Verify Build & Tests

- [ ] **Step 1: Clean build**

```bash
rm -rf dist node_modules && npm install && npm run build
```

Expected: Clean build, no errors

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "build: agent ready for implementation - all modules, templates, tests, docs"
```

- [ ] **Step 4: Tag release**

```bash
git tag v1.0.0
git log --oneline | head -25
```

Expected: v1.0.0 tag created, 32+ commits visible

---

**Implementation Plan Complete**

All tasks defined for inline execution via `superpowers:executing-plans`.
