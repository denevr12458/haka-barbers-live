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

/* =====================
   Middleware
===================== */

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =====================
   Static Files
===================== */

app.use(express.static(path.join(__dirname, 'public')));

/* =====================
   Health Check (Railway)
===================== */

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* =====================
   Sessions
===================== */

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

/* =====================
   Rate Limiting
===================== */

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

/* =====================
   Routes
===================== */

app.use('/api', require('./routes/public'));
app.use('/admin', require('./routes/admin'));

/* =====================
   Root Route
===================== */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =====================
   Error Handler
===================== */

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).send('Internal Server Error');
});

/* =====================
   Start Server
===================== */

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[SERVER] Running on port ${PORT}`);

  try {
    const { initDatabase } = require('./config/database');
    await initDatabase();
    console.log('[DB] Initialized');
  } catch (err) {
    console.error('[DB WARNING]', err.message);
  }
});
