# API SPECIFICATION

## Endpoints

### GET /customers/count

**Description:** Returns total number of customers in database.

**Request:**
```
GET /customers/count
```

**Response:**
```json
{ "count": 15 }
```

**Status:** 200 OK

---

### GET /customers/by-distance

**Description:** Returns all customers sorted by distance from Budapest (47.4979, 19.0402).

**Request:**
```
GET /customers/by-distance
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Anna Kovács",
    "telepules": "Budapest",
    "lat": 47.4979,
    "lon": 19.0402,
    "distanceKm": 0.0
  },
  {
    "id": 2,
    "name": "Lena Fischer",
    "telepules": "Vienna",
    "lat": 48.2082,
    "lon": 16.3738,
    "distanceKm": 214.0
  },
  {
    "id": 15,
    "name": "Isabella Silva",
    "telepules": "Lisbon",
    "lat": 38.7223,
    "lon": -9.1393,
    "distanceKm": 2469.4
  },
  {
    "id": 14,
    "name": "Unknown Town Customer",
    "telepules": "UnknownTown",
    "lat": null,
    "lon": null,
    "distanceKm": null
  }
]
```

**Sorting:**
1. By `distanceKm` ascending (closest first)
2. Customers with `distanceKm: null` at end
3. Tie-breaker: by `name` alphabetically

**Status:** 200 OK

---

### GET /health

**Description:** Health check endpoint.

**Request:**
```
GET /health
```

**Response:**
```json
{ "status": "ok" }
```

**Status:** 200 OK

---

## Distance Calculation

Uses Haversine formula:
- Earth radius: 6371 km
- Result rounded to 1 decimal place

## Data Types

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | int | ✓ | Primary key |
| name | string | ✓ | Customer name |
| telepules | string | ✓ | City name |
| lat | decimal | ✗ | Latitude (nullable) |
| lon | decimal | ✗ | Longitude (nullable) |
| distanceKm | float | ✗ | Distance from Budapest (nullable) |

## Error Handling

**500 Internal Server Error:**
```json
{ "error": "Failed to fetch count" }
```

Causes:
- Database connection failure
- Query execution error
- Unhandled exception
