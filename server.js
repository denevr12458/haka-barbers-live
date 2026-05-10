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

/* ======================
   HEALTHCHECK (RAILWAY)
====================== */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* ======================
   MIDDLEWARE
====================== */
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ======================
   STATIC FRONTEND
====================== */
app.use(express.static(path.join(__dirname, 'public')));

/* ======================
   SESSIONS
====================== */
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

/* ======================
   RATE LIMIT
====================== */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

/* ======================
   BACKEND ROUTES
====================== */
app.use('/api', require('./routes/public'));
app.use('/admin', require('./routes/admin'));

/* ======================
   ROOT = REAL WEBSITE
====================== */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ======================
   ERROR HANDLER
====================== */
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).send('Internal Server Error');
});

/* ======================
   START SERVER
====================== */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Running on port ${PORT}`);

  // Init DB AFTER server is live
  setTimeout(async () => {
    try {
      const { initDatabase } = require('./config/database');
      await initDatabase();
      console.log('[DB] Initialized');
    } catch (err) {
      console.error('[DB WARNING]', err.message);
    }
  }, 500);
});
