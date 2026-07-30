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
