'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ───────────────────────────── */
/* HEALTHCHECK (DO NOT REMOVE)   */
/* ───────────────────────────── */
app.get('/', (req, res) => {
  res.status(200).json({ ok: true });
});

/* ───────────────────────────── */
/* FRONTEND UI                   */
/* ───────────────────────────── */
app.use('/app', express.static(path.join(__dirname, 'public')));

app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ───────────────────────────── */
/* START SERVER                  */
/* ───────────────────────────── */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
