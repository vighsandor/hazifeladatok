import * as fs from 'fs';
import * as path from 'path';
import { query, closePool } from '../db/connection';
import { findCoordinates } from '../utils/geocoding';

interface SeedCustomer {
  name: string;
  budget?: number;
  location: { city: string; countryCode: string };
  note?: string;
}

async function runSeed() {
  try {
    // Optional: Reset database if RESET_DB env var is set
    if (process.env.RESET_DB === 'true') {
      console.log('⚠️  RESET_DB=true: Clearing all customers from database...');
      await query('DELETE FROM customers;');
      console.log('✓ Database cleared');
    }

    // Load seed data
    const seedPath = path.join(process.cwd(), 'seed-customers.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as SeedCustomer[];

    console.log(`Loaded ${seedData.length} customers from seed`);

    let insertedCount = 0;
    let skippedCount = 0;

    for (const customer of seedData) {
      const { city } = customer.location;
      const coords = findCoordinates(city);

      if (!coords) {
        console.warn(`⚠️  City "${city}" not found in geocode registry (customer: ${customer.name})`);
      }

      // Insert with ON CONFLICT DO NOTHING (deduplication by name)
      const result = await query(
        `INSERT INTO customers (name, telepules, lat, lon, budget, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (name) DO NOTHING
         RETURNING id;`,
        [
          customer.name,
          city,
          coords?.lat ?? null,
          coords?.lon ?? null,
          customer.budget ?? null,
          customer.note ?? null,
        ]
      );

      if (result.rows.length > 0) {
        insertedCount++;
      } else {
        skippedCount++;
      }
    }

    // Verify count
    const countResult = await query('SELECT COUNT(*) as count FROM customers;');
    const finalCount = parseInt(countResult.rows[0].count, 10);

    console.log(`✓ Seed completed:`);
    console.log(`  - Inserted: ${insertedCount}`);
    console.log(`  - Skipped (duplicates): ${skippedCount}`);
    console.log(`  - Total in DB: ${finalCount}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runSeed();
