# CHANGELOG

All notable changes to this project will be documented in this file.

## [1.0.0] – 2026-07-30

### Added

- **Agent System**
  - Modular TypeScript agent (parser, codegen, executor)
  - YAML skill.md blueprint support
  - Handlebars template rendering
  - Hybrid execution (Skill + CLI)

- **Code Generation**
  - Express.js REST API templates
  - PostgreSQL migration template
  - Idempotent seed loader
  - Jest test templates

- **REST API**
  - `GET /customers/count` endpoint
  - `GET /customers/by-distance` endpoint
  - Haversine distance calculation
  - Town normalization (accent/case-insensitive)
  - Null coordinate handling

- **Documentation**
  - DESIGN.md – architecture
  - README.md – quick start
  - USAGE.md – detailed usage
  - OPERATIONS.md – deployment guide
  - HANDOVER.md – assumptions & future work
  - SKILL_EXTENSION.md – extension guide
  - SKILL_EXAMPLES.md – parameterization examples
  - API_SPECIFICATION.md – endpoint reference

- **Testing**
  - Unit tests for parser, codegen, executor
  - Haversine distance tests
  - Town normalization tests
  - E2E integration test skeleton

### Initial Features

- Offline-first (no external geocoding API)
- Idempotent seed loading (safe re-runs)
- TypeScript strict mode
- Semantic versioning

### Known Limitations

- Console-only logging (use Winston for production)
- No rate limiting
- No authentication
- No input validation
- Basic town normalization (European accents only)

## Future Releases

- [ ] v1.1.0 – Add input validation, structured logging
- [ ] v1.2.0 – Add rate limiting, authentication
- [ ] v2.0.0 – Multi-city reference points, GraphQL support
