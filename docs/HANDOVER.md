# HANDOVER – Technical Assumptions & Next Steps

## Assumptions

- Postgres 12+ running at 10.0.0.106:5432
- Node.js 18+ available
- All 15 seed customers have valid city names
- Coordinates reference (ellenorzo-adatok.md) covers all seed cities
- .env contains valid DATABASE_URL before running

## Known Limitations

- No rate limiting (add express-rate-limit if needed)
- No authentication (add JWT/session if needed)
- Logging is console-only (use Winston/Pino for prod)
- No metrics/tracing (add Prometheus/OpenTelemetry if needed)
- Town normalization is basic (works for European accents)

## Tech Debt

- [ ] Add TypeScript strict mode checks
- [ ] Add input validation (express-validator)
- [ ] Add error recovery for seed idempotency
- [ ] Add structured logging (Winston)
- [ ] Add OpenAPI/Swagger docs

## Future Enhancements

1. **Multi-city reference point** – Allow sorting by different cities, not just Budapest
2. **Pagination** – Limit results per page
3. **Filtering** – Filter customers by budget, country code, etc.
4. **Caching** – Redis for distance calculations
5. **GraphQL** – Alternative to REST endpoints

## Running Locally

```bash
# 1. Ensure Postgres is accessible
psql postgresql://hf2:hf2@10.0.0.106:5432/hf2 -c "SELECT 1"

# 2. Setup and run
npm install
npm run generate ./skill.md ./api
cd api
npm install
npm run dev
```

## Contact

Questions? See docs/README.md, DESIGN.md, USAGE.md.
