'use strict';

const { Pool } = require('pg');

/* ─────────────────────────────────────────────
   POSTGRES CONNECTION (RAILWAY SAFE)
   ───────────────────────────────────────────── */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

/* ─────────────────────────────────────────────
   SIMPLE DB WRAPPER (KEEPS YOUR EXISTING CODE WORKING)
   ───────────────────────────────────────────── */

const db = {
  get: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows[0]))
      .catch(err => callback(err));
  },

  all: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows))
      .catch(err => callback(err));
  },

  run: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res))
      .catch(err => callback(err));
  }
};

/* ─────────────────────────────────────────────
   AUTO CREATE TABLES (PREVENTS LOGIN BREAKING)
   ───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   AUTO CREATE TABLES (PREVENTS LOGIN BREAKING)
   ───────────────────────────────────────────── */

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS owners (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name TEXT,
        description TEXT,
        duration INT,
        price NUMERIC,
        active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        service_id INT,
        booking_date TEXT,
        start_time TEXT,
        end_time TEXT,
        status TEXT DEFAULT 'confirmed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS blocked_slots (
        id SERIAL PRIMARY KEY,
        block_date TEXT,
        start_time TEXT,
        end_time TEXT,
        reason TEXT
      );
    `);

    // Insert default services if none exist
    const res = await pool.query('SELECT COUNT(*) as count FROM services');
    if (res.rows[0].count == 0) {
      await pool.query(`
        INSERT INTO services (name, description, duration, price) VALUES
        ('Classic Cut', 'Traditional haircut with precision styling.', 30, 25.00),
        ('Fade & Taper', 'Modern fade with tapered sides and back.', 45, 35.00),
        ('Beard Trim', 'Professional beard shaping and trimming.', 20, 15.00),
        ('Hot Towel Shave', 'Luxury straight razor shave with hot towel.', 30, 30.00),
        ('Full Service', 'Haircut, beard trim, and hot towel shave.', 75, 70.00);
      `);
      console.log('[DB] Default services inserted');
    }

    console.log('[DB] Tables ensured');
  } catch (err) {
    console.error('[DB INIT ERROR]', err);
    throw err;
  }
};

module.exports = { db, initDatabase };
