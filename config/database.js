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

pool.query(`
  CREATE TABLE IF NOT EXISTS owners (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT,
    duration INT,
    price NUMERIC
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    service_id INT,
    booking_date TEXT,
    start_time TEXT,
    status TEXT DEFAULT 'confirmed'
  );

  CREATE TABLE IF NOT EXISTS blocked_slots (
    id SERIAL PRIMARY KEY,
    block_date TEXT,
    start_time TEXT,
    end_time TEXT,
    reason TEXT
  );
`).then(() => {
  console.log('[DB] Tables ensured');
}).catch(err => {
  console.error('[DB INIT ERROR]', err);
});

module.exports = { db };
