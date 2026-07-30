import fs from 'fs';
import { pool } from './db';
import { lookupCoordinates } from './geo';

interface SeedCustomer {
  name: string;
  location: { city: string; countryCode: string };
  budget?: number;
  note?: string;
}

export const seed = async (): Promise<void> => {
  const seedFile = 'seed-customers.json';

  if (!fs.existsSync(seedFile)) {
    console.warn(`[WARN] Seed file not found: ${seedFile}`);
    return;
  }

  const data: SeedCustomer[] = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));

  for (const customer of data) {
    const coords = lookupCoordinates(customer.location.city);

    try {
      await pool.query(
        `INSERT INTO customers (name, telepules, lat, lon, budget, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name, telepules) DO NOTHING`,
        [
          customer.name,
          customer.location.city,
          coords.lat,
          coords.lon,
          customer.budget || null,
          customer.note || null,
        ]
      );
    } catch (err) {
      console.error(`[ERROR] Failed to insert ${customer.name}`, err);
    }
  }

  console.log('[INFO] Seed complete');
};

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[ERROR] Seed failed', err);
      process.exit(1);
    });
}
