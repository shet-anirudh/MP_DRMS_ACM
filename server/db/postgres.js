const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
})

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id TEXT PRIMARY KEY,
      data      JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('PostgreSQL table ready')
}

module.exports = { pool, initDB }
