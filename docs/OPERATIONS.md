# OPERATIONS – Deployment & Monitoring

## Production Deployment

### Build

```bash
npm run build
# Generates dist/ with compiled JavaScript
```

### Run

```bash
npm start
# node dist/index.js listens on 0.0.0.0:3000
```

### Environment

```bash
export DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/prod_db
npm start
```

## Monitoring

### Logs

Check server output:
```
[INFO] TIMESTAMP Server running on http://0.0.0.0:3000
[INFO] TIMESTAMP GET /customers/count
[ERROR] TIMESTAMP Failed query
```

### Health Check

```bash
curl http://0.0.0.0:3000/health
# { "status": "ok" }
```

### Metrics

No built-in metrics. Add Winston/Pino for structured logging if needed.

## Backup & Restore

### PostgreSQL Backup

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore

```bash
psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Server won't start

Check DATABASE_URL:
```bash
psql $DATABASE_URL -c "SELECT 1"  # Should return 1
```

### Seed incomplete

Rerun (idempotent):
```bash
npm run seed
```

### Port in use

Change port in `src/index.ts` or environment config.

## Scaling

For load balancing: run multiple instances with separate DATABASE_URLs pointing to same Postgres instance.
