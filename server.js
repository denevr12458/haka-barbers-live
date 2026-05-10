'use strict';

require('dotenv').config();

const express = require('express');
const PORT = process.env.PORT || 3000;

// Create app with ONLY health check
const app = express();
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// START SERVER IMMEDIATELY
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Started on port ${PORT}`);
});

// Load everything else asynchronously AFTER server is listening
setImmediate(async () => {
  try {
    const helmet = require('helmet');
    const session = require('express-session');
    const cookieParser = require('cookie-parser');
    const rateLimit = require('express-rate-limit');
    const path = require('path');

    // Middleware
    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Static
    app.use(express.static(path.join(__dirname, 'public')));

    // Session
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

    // Rate limit
    app.use('/api/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200
    }));

    // Routes
    app.use('/api', require('./routes/public'));
    app.use('/admin', require('./routes/admin'));

    // Root
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error('[ERROR]', err.message);
      res.status(500).send('Internal Server Error');
    });

    console.log('[APP] Routes and middleware loaded');

    // Init database
    try {
      const { initDatabase } = require('./config/database');
      await initDatabase();
      console.log('[DB] Initialized');
    } catch (err) {
      console.error('[DB WARNING]', err.message);
    }
  } catch (err) {
    console.error('[LOAD ERROR]', err.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM');
  server.close(() => process.exit(0));
});
