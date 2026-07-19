import 'dotenv/config';
import { Client } from 'pg';

// Megvárja, amíg a Postgres fogadja a kapcsolatokat (docker indulás után).
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Hiányzik a DATABASE_URL (.env). Másold a .env.example-ből.');
  process.exit(1);
}

const DEADLINE_MS = 60_000;
const start = Date.now();

async function tryConnect() {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

console.log('⏳ Várakozás az adatbázisra...');
while (Date.now() - start < DEADLINE_MS) {
  if (await tryConnect()) {
    console.log('✅ Az adatbázis elérhető.');
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.error('❌ Időtúllépés: az adatbázis nem lett elérhető. Fut a Docker? (pnpm db:up)');
process.exit(1);
