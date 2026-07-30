# Customer Distance API

Offline REST service for managing customers with local geocoding and distance calculations from Budapest.

**Key features:**
- Offline geocoding (no external API calls)
- Idempotent seed loading with deduplication
- Haversine distance calculation to Budapest
- Robust city matching (case-insensitive, diacritics-aware)
- Graceful null-coordinate handling

---

## Prerequisites

- **Node.js** (v18+)
- **npm** (comes with Node.js)
- **PostgreSQL** (remote database at `10.0.0.106:5432`)
  - Database: `hf2`
  - User: `hf2`
  - Password: `hf2`

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env` File

Copy `.env.example` and set your database connection:

```bash
cp .env.example .env
```

Edit `.env` and verify:
```
DATABASE_URL=postgresql://hf2:hf2@10.0.0.106:5432/hf2
PORT=3000
```

### 3. Run Migrations

Creates the `customers` table:

```bash
npm run migrate
```

Expected output:
```
Running migrations...
Executed query in Xms: CREATE TABLE IF NOT EXISTS customers...
✓ customers table created
✓ All migrations completed successfully
```

### 4. Seed Database

Loads 15 customers from `seed-customers.json`, geocodes them locally, and deduplicates:

```bash
npm run seed
```

Expected output:
```
Loaded 15 customers from seed
✓ Seed completed:
  - Inserted: 15
  - Skipped (duplicates): 0
  - Total in DB: 15
```

Run a second time to verify idempotency (should skip all 15, total still 15).

### 5. Start Server

```bash
npm start
```

Server listens on `http://localhost:3000`.

---

## API Endpoints

### `GET /customers/count`

Returns the total number of customers.

**Response:**
```json
{
  "count": 15
}
```

---

### `GET /customers/by-distance`

Returns all customers sorted by distance from Budapest (ascending), with unknown-coordinate customers at the end.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Anna Kovács",
    "telepules": "Budapest",
    "lat": 47.4979,
    "lon": 19.0402,
    "budget": 850,
    "note": "Loves lush, jungle-style rooms...",
    "distanceKm": 0.0
  },
  {
    "id": 2,
    "name": "Lena Fischer",
    "telepules": "Vienna",
    "lat": 48.2082,
    "lon": 16.3738,
    "budget": 950,
    "note": "Prefers architectural, sculptural plants...",
    "distanceKm": 214.0
  },
  ...
]
```

**Sorting rules:**
1. Known coordinates: ascending distance to Budapest (47.4979, 19.0402)
2. Unknown coordinates: at end, sorted by customer name

**Example order (verified):**
- 0.0 km: Budapest
- 214.0 km: Vienna
- 293.0 km: Kraków
- ... (9 more cities)
- null km: Any customer with unknown city

---

## Testing

### Unit Tests

Run all tests (geocoding, distance, endpoints):

```bash
npm test
```

**Key tests:**
- ✓ City matching (case-insensitive, diacritics-aware)
- ✓ Haversine distance: Budapest–Vienna ≈ 214.0 km
- ✓ Haversine distance: Budapest–Budapest = 0.0 km
- ✓ Null-coordinate handling (no crash)

---

## Project Structure

```
src/
├── index.ts                  # Server entry point
├── app.ts                    # Express app & route handlers
├── db/
│   └── connection.ts         # Postgres connection pool
├── migrations/
│   ├── run.ts                # Migration runner
│   └── 00_init.ts            # Schema definitions
├── scripts/
│   └── seed.ts               # Seed loader & geocoder
├── data/
│   └── cityCoordinates.ts    # 15-city reference (WGS84)
├── utils/
│   ├── geocoding.ts          # City matching & lookup
│   ├── geocoding.test.ts     # Geocoding tests
│   ├── distance.ts           # Haversine calculation
│   └── distance.test.ts      # Distance tests
└── app.test.ts               # Endpoint tests
```

---

## Data

### Seed Data

Customer data loaded from `seed-customers.json` (15 customers, 15 cities).

### City Coordinates

Bundled in `src/data/cityCoordinates.ts` (from `ellenorzo-adatok.md`):
- Budapest: 47.4979, 19.0402
- Vienna: 48.2082, 16.3738
- Munich, Milan, Barcelona, Lyon, Kraków, Prague, Lisbon, Amsterdam, Stockholm, Ljubljana, Bucharest, Dublin, Copenhagen

---

## Troubleshooting

### `ERROR: DATABASE_URL environment variable not set`

**Solution:** Create `.env` file with `DATABASE_URL=postgresql://...`

```bash
cp .env.example .env
# Edit .env
```

### `npm test` fails with UNC path error

**Note:** Windows UNC paths (`\\host.lan\...`) don't play well with npm in some configurations. If this occurs, use **Bash** (Git Bash or WSL) to run:

```bash
./node_modules/.bin/tsx src/migrations/run.ts
```

### Database connection fails

Verify:
1. Postgres is running at `10.0.0.106:5432`
2. Database `hf2` exists
3. User `hf2` has credentials `hf2`
4. Network connectivity to the remote Postgres server

### Unknown city warnings during seed

If a city doesn't match the 15-city reference, it's logged as a warning and inserted with `lat = null, lon = null`. This is expected and NOT an error.

Example:
```
⚠️  City "Unknown" not found in geocode registry (customer: John Doe)
```

The customer is still loaded and counted; they appear at the end of the distance list with `distanceKm: null`.

---

## Development Notes

### Idempotent Seed

The seed script uses `ON CONFLICT (name) DO NOTHING` to prevent duplicate insertions. Run `npm run seed` multiple times—the database will always have exactly 15 customers.

### Offline Geocoding

City-to-coordinate matching is done locally via `src/utils/geocoding.ts`. No external API calls occur.

### Haversine Distance

Great-circle distance on Earth (WGS84) calculated to 1 decimal place (kilometers). Verified:
- Budapest ↔ Vienna: 214.0 km
- Budapest ↔ Budapest: 0.0 km

---

## License

Internal learning project.
