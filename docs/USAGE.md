# USAGE – Skill & CLI

## Skill Execution (Recommended)

Via harness:
```bash
/setup-api
```

Or with parameter overrides:
```bash
/setup-api --port 3001 --host 127.0.0.1
```

## CLI Execution (Fallback)

```bash
npm install
npm run generate ./skill.md ./generated-api
```

## Generated Project Setup

After generation, enter the project and run:

```bash
cd generated-api
npm install
npm run dev
```

Server starts on http://0.0.0.0:3000

## Testing Generated API

```bash
# In generated-api/
npm test
# Haversine tests ✓
# Distance sorting ✓
# Null coordinate handling ✓
```

## Migration & Seeding

Manual:
```bash
cd generated-api
npm run migrate  # psql < migrations/001-init.sql
npm run seed     # loads seed-customers.json (idempotent)
npm run dev      # starts server
```

## Customizing skill.md

Edit `skill.md`:
```yaml
server:
  port: 3001        # Change port
  host: 127.0.0.1   # Change host
```

Then regenerate:
```bash
npm run generate ./skill.md ./generated-api
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `DATABASE_URL not set` | `export DATABASE_URL=...` or edit .env |
| `psql: command not found` | Install: `apt-get install postgresql-client` |
| `npm ERR! ERESOLVE` | `npm install --legacy-peer-deps` |
| Connection refused | Server not running? `npm run dev` |
| Duplicate seeds | Idempotency should handle – check DB schema |

## Environment Variables

```bash
DATABASE_URL  # Required: postgresql://user:pass@host/db
```

See `.env.example` in generated project.
