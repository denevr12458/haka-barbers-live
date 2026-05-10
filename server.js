'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* =====================
   INSTANT HEALTHCHECKS
   (THIS IS CRITICAL)
===================== */

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/* =====================
   STATIC FILES
===================== */

app.use(express.static(path.join(__dirname, 'public')));

/* =====================
   REAL SITE ENTRY
===================== */

app.get('/site', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =====================
   START SERVER FIRST
===================== */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Listening on ${PORT}`);

  // Load heavy stuff AFTER server is live
  setTimeout(async () => {
    try {
      const { initDatabase } = require('./config/database');
      await initDatabase();
      console.log('[DB] Initialized');
    } catch (err) {
      console.error('[DB WARNING]', err.message);
    }
  }, 1000);
});
