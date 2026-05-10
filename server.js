'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { initDatabase } = require('./config/database');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

/* ───────────────────────────────
   BASIC SETUP
   ─────────────────────────────── */

app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ───────────────────────────────
   STATIC FRONTEND
   ─────────────────────────────── */

app.use(express.static(path.join(__dirname, 'public')));

/* ───────────────────────────────
   FIXED SESSION (NO SQLITE STORE)
   ───────────────────────────────
   Railway-safe memory session (prevents 500 crashes)
   ─────────────────────────────── */

app.use(session({
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

/* ───────────────────────────────
   RATE LIMIT
   ─────────────────────────────── */

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

/* ───────────────────────────────
   ROUTES
   ─────────────────────────────── */

app.use('/api', publicRoutes);
app.use('/admin', adminRoutes);

/* ───────────────────────────────
   ROOT
   ─────────────────────────────── */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ───────────────────────────────
   ERROR HANDLER
   ─────────────────────────────── */

app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).send('Internal Server Error');
});

/* ───────────────────────────────
   START
   ─────────────────────────────── */

initDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Haka Barbers running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[BOOT ERROR]', err);
    process.exit(1);
  });
