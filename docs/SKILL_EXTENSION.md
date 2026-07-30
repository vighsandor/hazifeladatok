# SKILL_EXTENSION – Adding New Steps & Templates

## Adding a New Step

### 1. Define Step Type

In `src/types.ts`, add to `Step` type:
```typescript
export type Step = 'npm-install' | 'migrate-db' | 'seed-data' | 'run-tests' | 'my-custom-step';
```

### 2. Implement in Executor

In `src/executor.ts`, add case:
```typescript
case 'my-custom-step':
  this.exec('npm run my-custom-step', cwd);
  break;
```

### 3. Add to skill.md

```yaml
steps:
  - npm-install
  - migrate-db
  - seed-data
  - my-custom-step  # New step
  - run-tests
```

### 4. Test

```bash
npm test
npm run generate ./skill.md ./test-api
```

## Adding a New Template

### 1. Create Template File

In `src/templates/my-file.ts.hbs`:
```typescript
import { log } from './logger';

export const myFunction = () => {
  log.info('My custom function');
};
```

### 2. Update CodeGen

In `src/codegen.ts`, add to templates array:
```typescript
const templates = [
  // ... existing
  { src: 'my-file.ts.hbs', dest: 'src/my-file.ts' },
];
```

### 3. Use in Other Templates

In `src/templates/index.ts.hbs`:
```typescript
import { myFunction } from './my-file';

myFunction();
```

### 4. Test

```bash
npm run generate ./skill.md ./test-api
cd test-api && npm run build
```

## Parameterizing Templates

Use Handlebars variables in templates:

```typescript
// src/templates/my-file.ts.hbs
const PORT = {{config.server.port}};
const HOST = '{{config.server.host}}';
```

When rendered, `{{config.server.port}}` is replaced with the value from `config.server.port`.

## Testing Extensions

Add unit tests in `__tests__/`:

```typescript
// __tests__/my-feature.test.ts
describe('My Feature', () => {
  it('does something', () => {
    expect(true).toBe(true);
  });
});
```

Run:
```bash
npm test -- __tests__/my-feature.test.ts
```
