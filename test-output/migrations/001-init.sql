CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telepules VARCHAR(255),
  lat DECIMAL(10, 6),
  lon DECIMAL(10, 6),
  budget INT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, telepules)
);
