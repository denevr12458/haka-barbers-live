'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const { initDatabase } = require('./config/database');

/* ── Trust proxy (Railway) ── */
app.set('trust proxy', 1);

/* ── Security ── */
app.use(helmet());

/* ── Body parsing ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ── Session ── */
app.use(session({
  name: 'haka.sid',
  secret: process.env.SESSION_SECRET || 'haka-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

/* ── Rate limit ── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

/* ── STATIC FRONTEND (IMPORTANT) ── */
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   ROUTES (FULL RESTORE)
========================= */
const initializeApp = async () => {
  try {
    await initDatabase();
  } catch (err) {
    console.error('[DB INIT]', err.message || err);
  }

  try {
    app.use('/api', require('./routes/public'));
    app.use('/admin', require('./routes/admin'));
  } catch (err) {
    console.error('[ROUTES ERROR]', err.message || err);
  }
};

initializeApp();

/* ── ROOT → FRONTEND ── */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── HEALTH CHECK (Railway) ── */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* ── ERROR HANDLER ── */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Haka Barbers running on port ${PORT}`);
});
