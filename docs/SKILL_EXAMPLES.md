# SKILL_EXAMPLES – Parameterized Variants

## Example 1: Custom Port (3001)

```yaml
project:
  name: customer-locator-api
  language: typescript
  framework: express

database:
  url: ${DATABASE_URL}

server:
  host: 0.0.0.0
  port: 3001  # ← Changed

data:
  seedFile: seed-customers.json
  coordinatesRef: ellenorzo-adatok.md

steps:
  - npm-install
  - migrate-db
  - seed-data
  - run-tests
```

## Example 2: Localhost Only (Development)

```yaml
server:
  host: 127.0.0.1  # ← Local only
  port: 3000
```

## Example 3: Skip Tests (Fast Dev)

```yaml
steps:
  - npm-install
  - migrate-db
  - seed-data
  # - run-tests  ← Commented out
```

## Example 4: Different Seed File

```yaml
data:
  seedFile: seed-customers-staging.json  # ← Different
  coordinatesRef: ellenorzo-adatok.md
```

## How to Use

1. Copy base skill.md
2. Edit parameters (port, host, seed file, etc.)
3. Run agent:
   ```bash
   npm run generate ./skill-custom.md ./generated-api
   ```

## CLI Override

Even simpler – pass flags:
```bash
npm run generate ./skill.md ./api -- --port 3001 --host 127.0.0.1
```

(Feature for future implementation – currently edit skill.md directly)
