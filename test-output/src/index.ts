import express from 'express';
import dotenv from 'dotenv';
import { pool } from './db';
import { seed } from './seed';
import routes from './routes';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/customers', routes);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const start = async () => {
  try {
    console.log('[INFO] Seeding database...');
    await seed();
    console.log('[INFO] Seed complete');

    app.listen(3000, '0.0.0.0', () => {
      console.log(`[INFO] Server running on http://0.0.0.0:3000`);
    });
  } catch (err) {
    console.error('[ERROR] Startup failed', err);
    process.exit(1);
  }
};

start();
