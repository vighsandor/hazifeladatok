import express, { Request, Response } from 'express';
import { query } from './db/connection';
import { haversine } from './utils/distance';

export const app = express();

app.use(express.json());

// Reference point: Budapest
const BUDAPEST = { lat: 47.4979, lon: 19.0402 };

interface Customer {
  id: number;
  name: string;
  telepules: string;
  lat: number | null;
  lon: number | null;
  budget?: number | null;
  note?: string | null;
  distanceKm?: number | null;
}

// GET /customers/count
app.get('/customers/count', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM customers;');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('Count endpoint error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /customers/by-distance
// Sorted by distance to Budapest (ascending), nulls at end (sorted by name)
app.get('/customers/by-distance', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, name, telepules, lat, lon, budget, note FROM customers;');

    // Add distance calculations
    const customersWithDistance: Customer[] = result.rows.map((row: Customer) => {
      const distance = haversine(BUDAPEST.lat, BUDAPEST.lon, row.lat, row.lon);
      return { ...row, distanceKm: distance };
    });

    // Sort: known coordinates by distance (asc), then unknowns by name
    customersWithDistance.sort((a, b) => {
      // Known coordinates
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      // Both unknown: sort by name
      if (a.distanceKm === null && b.distanceKm === null) {
        return a.name.localeCompare(b.name);
      }
      // Known before unknown
      return a.distanceKm !== null ? -1 : 1;
    });

    res.json(customersWithDistance);
  } catch (error) {
    console.error('Distance endpoint error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default app;
