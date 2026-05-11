'use strict';

const { Pool } = require('pg');

/* ─────────────────────────────────────────────
   POSTGRES CONNECTION (RAILWAY SAFE)
   ───────────────────────────────────────────── */

let pool;

const normalizeSql = (text, params) => {
  if (!params || params.length === 0) return { text, params };
  let index = 0;
  const normalizedText = text.replace(/\?/g, () => `$${++index}`);
  return { text: normalizedText, params };
};

try {
  const rawConnectionString = process.env.DATABASE_URL || '';
  const connectionString = rawConnectionString.trim().replace(/^['"]|['"]$/g, '').replace(/^postgresql:/, 'postgres:');
  const isPlaceholder = /your-railway-connection-string-here|postgresql:\/\/username:password@host:port\/database|postgres:\/\/postgres:password@containers-us-west-1\.railway\.app:5432\/railway/i.test(connectionString);

  if (!connectionString || isPlaceholder) {
    console.error('[DB CONFIG] DATABASE_URL is missing, invalid, or using a placeholder value');
    console.error('[DB CONFIG] Current DATABASE_URL:', connectionString || '<empty>');
  } else {
    try {
      const useSsl = process.env.NODE_ENV === 'production' || /railway|rlwy\.net|proxy/i.test(connectionString) || process.env.PGSSLMODE === 'require';
      pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 5,
        ssl: useSsl ? { rejectUnauthorized: false } : false
      });

      pool.on('error', (err) => {
        console.error('[POOL ERROR]', err.message);
      });
    } catch (err) {
      console.error('[POOL INIT ERROR]', err.message);
      pool = null;
    }
  }
} catch (err) {
  console.error('[POOL INIT ERROR]', err.message);
  pool = null;
}

/* ─────────────────────────────────────────────
   SIMPLE DB WRAPPER (KEEPS YOUR EXISTING CODE WORKING)
   ───────────────────────────────────────────── */

const db = {
  get: (text, params, callback) => {
    if (!pool) return callback(new Error('Database not connected'));
    const query = normalizeSql(text, params);
    pool.query(query.text, query.params)
      .then(res => callback(null, res.rows[0]))
      .catch(err => callback(err));
  },

  all: (text, params, callback) => {
    if (!pool) return callback(new Error('Database not connected'));
    const query = normalizeSql(text, params);
    pool.query(query.text, query.params)
      .then(res => callback(null, res.rows))
      .catch(err => callback(err));
  },

  run: (text, params, callback) => {
    if (!pool) return callback(new Error('Database not connected'));
    const query = normalizeSql(text, params);
    pool.query(query.text, query.params)
      .then(res => callback(null, res))
      .catch(err => callback(err));
  }
};

/* ─────────────────────────────────────────────
   AUTO CREATE TABLES (PREVENTS LOGIN BREAKING)
   ───────────────────────────────────────────── */

const initDatabase = async () => {
  if (!pool) {
    console.log('[DB] WARNING: Database pool not initialized - skipping database setup');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.log('[DB] WARNING: No DATABASE_URL provided - database features will not work');
    return;
  }

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

const isConnected = () => !!pool;
const getRawDatabaseUrl = () => process.env.DATABASE_URL || '';

module.exports = { db, initDatabase, isConnected, getRawDatabaseUrl };
