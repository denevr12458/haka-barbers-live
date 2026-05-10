'use strict';

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'haka.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('[DB] Connection failed:', err.message); process.exit(1); }
  console.log('[DB] Connected →', DB_PATH);
});

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('PRAGMA journal_mode=WAL');
      db.run('PRAGMA foreign_keys=ON');

      db.run(`CREATE TABLE IF NOT EXISTS owners (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT    NOT NULL UNIQUE,
        password   TEXT    NOT NULL,
        email      TEXT    NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS services (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT    NOT NULL,
        description TEXT,
        duration    INTEGER NOT NULL,
        price       REAL    NOT NULL,
        active      INTEGER DEFAULT 1
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id             TEXT    PRIMARY KEY,
        customer_name  TEXT    NOT NULL,
        customer_email TEXT    NOT NULL,
        customer_phone TEXT,
        service_id     INTEGER NOT NULL REFERENCES services(id),
        booking_date   TEXT    NOT NULL,
        start_time     TEXT    NOT NULL,
        end_time       TEXT    NOT NULL,
        status         TEXT    DEFAULT 'confirmed'
                                CHECK(status IN ('confirmed','cancelled','completed','no-show')),
        notes          TEXT,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(booking_date, start_time)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS blocked_slots (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        block_date TEXT    NOT NULL,
        start_time TEXT    NOT NULL,
        end_time   TEXT    NOT NULL,
        reason     TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      /* Seed services */
      db.run(`INSERT OR IGNORE INTO services (id,name,description,duration,price) VALUES
        (1,'Classic Cut','Precision scissor or clipper cut tailored to your style',30,25),
        (2,'Skin Fade','Graduated fade from skin to desired length — sharp finish',45,30),
        (3,'Beard Trim & Shape','Expert beard shaping and line-up using straight razor',20,15),
        (4,'Cut & Beard','Full service — haircut combined with beard trim',60,40),
        (5,'Hot Towel Shave','Traditional straight razor shave with hot towel treatment',40,28),
        (6,'Kids Cut (U-12)','Relaxed cut for children under 12',25,15)`);

      /* Seed default admin — password: HakaAdmin2024! */
      const hash = bcrypt.hashSync('HakaAdmin2024!', 12);
      db.run(
        `INSERT OR IGNORE INTO owners (username,password,email) VALUES (?,?,?)`,
        ['admin', hash, process.env.OWNER_EMAIL || 'dscott09ymk@gmail.com'],
        (err) => {
          if (err) { reject(err); return; }
          console.log('[DB] Schema ready. Admin: admin / HakaAdmin2024!');
          resolve();
        }
      );
    });
  });
}

module.exports = { db, initDatabase };