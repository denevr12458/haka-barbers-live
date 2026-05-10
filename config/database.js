'use strict';

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

/* ─────────────────────────────────────────────
   ENSURE DATA FOLDER EXISTS (IMPORTANT FOR RAILWAY)
   ───────────────────────────────────────────── */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* ─────────────────────────────────────────────
   CREATE / CONNECT DATABASE
   ───────────────────────────────────────────── */
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB CONNECTION ERROR]', err);
  } else {
    console.log('[DB] Connected:', DB_PATH);
  }
});

/* ─────────────────────────────────────────────
   CREATE ALL REQUIRED TABLES (FIXES YOUR LOGIN ISSUE)
   ───────────────────────────────────────────── */
db.serialize(() => {

  // Owners (ADMIN LOGIN)
  db.run(`
    CREATE TABLE IF NOT EXISTS owners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  // Services
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      duration INTEGER,
      price REAL
    )
  `);

  // Bookings
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      booking_date TEXT,
      start_time TEXT,
      status TEXT DEFAULT 'confirmed'
    )
  `);

  // Blocked slots
  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_date TEXT,
      start_time TEXT,
      end_time TEXT,
      reason TEXT
    )
  `);
});

/* ─────────────────────────────────────────────
   AUTO-CREATE DEFAULT ADMIN (THIS FIXES YOUR LOGIN CRASH)
   ───────────────────────────────────────────── */
const bcrypt = require('bcryptjs');

db.get('SELECT COUNT(*) as count FROM owners', async (err, row) => {
  if (err) {
    console.error('[DB SEED ERROR]', err);
    return;
  }

  if (row.count === 0) {
    const hash = await bcrypt.hash('admin123', 12);

    db.run(
      'INSERT INTO owners (username, password) VALUES (?, ?)',
      ['admin', hash],
      (err) => {
        if (err) {
          console.error('[ADMIN SEED ERROR]', err);
        } else {
          console.log('[ADMIN CREATED] username: admin | password: admin123');
        }
      }
    );
  }
});

module.exports = { db };
