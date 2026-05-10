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

/* ── Trust Railway's proxy ── */
app.set('trust proxy', 1);

/* ── Security headers ── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc:    ["'self'", 'fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'self'", 'https://www.google.com'],
    },
  },
}));

/* ── Body parsing ── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

/* ── Rate limiting ── */
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false }));
app.use('/api/bookings', rateLimit({ windowMs: 60 * 60 * 1000, max: 15 }));

/* ── Sessions ── */
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let sessionStore;
try {
  const SQLiteStore = require('connect-sqlite3')(session);
  sessionStore = new SQLiteStore({ db: 'sessions.db', dir: DATA_DIR });
} catch (e) {
  console.warn('[Session] Using memory store (install connect-sqlite3 for persistence)');
}

app.use(session({
  secret:            process.env.SESSION_SECRET || 'haka-dev-secret-change-me',
  resave:            false,
  saveUninitialized: false,
  name:              'haka.sid',
  store:             sessionStore,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000,
  },
}));

/* ── Static files ── */
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

/* ── Routes ── */
app.use('/api',   publicRoutes);
app.use('/admin', adminRoutes);

/* ── Health check for Railway ── */
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

/* ── Root ── */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ── 404 ── */
app.use((req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/api/'))
    return res.status(404).json({ error: 'Not found.' });
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── Error handler ── */
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'Internal server error.' });
  res.status(500).send('Internal Server Error');
});

/* ── Boot ── */
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  ✦ Haka Barbers running on port ${PORT}`);
    console.log(`  ✦ Admin: http://localhost:${PORT}/admin\n`);
  });
}).catch(err => {
  console.error('[Boot] Database init failed:', err);
  process.exit(1);
});