import express from 'express';
import { query } from './db/connection';

export const app = express();

app.use(express.json());

// GET /customers/count
app.get('/customers/count', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM customers;');
    const count = parseInt(result.rows[0].count, 10);
    res.json({ count });
  } catch (error) {
    console.error('Count endpoint error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
