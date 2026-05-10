'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');

const { initDatabase } = require('./config/database');
const publicRoutes     = require('./routes/public');
const adminRoutes      = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Trust Railway proxy ── */
app.set('trust proxy', 1);

/* ── Security headers ── */
app.use(helmet());

/* ── Body parsing ── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

/* ── Rate limiting ── */
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false
}));

/* ── Sessions ── */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let sessionStore;
try {
  const SQLiteStore = require('connect-sqlite3')(session);
  sessionStore = new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR });
} catch {
  console.warn('[Session] Falling back to memory store');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'haka-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  name: 'haka.sid',
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

/* ── SERVE FRONTEND (THIS IS THE FIX) ── */

// serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// root route → serve your UI instead of text
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── API Routes ── */
app.use('/api', publicRoutes);
app.use('/admin', adminRoutes);

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).send('Internal Server Error');
});

/* ── Boot ── */
initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✦ Haka Barbers running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[Boot] Database init failed:', err);
    process.exit(1);
  });
