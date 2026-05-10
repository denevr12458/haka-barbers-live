'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   ABSOLUTE FAST HEALTHCHECK
========================= */
app.get('/health', (req, res) => {
  return res.status(200).send('OK');
});

/* =========================
   STATIC FRONTEND (SAFE)
========================= */
app.use(express.static(path.join(__dirname, 'public')));

/* =========================
   ROOT = WEBSITE
========================= */
app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[OK] Server running on ${PORT}`);
});
