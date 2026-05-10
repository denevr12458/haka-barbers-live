'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

/* ───────────────────────────────────────────── */
/* Railway-required settings                     */
/* ───────────────────────────────────────────── */

const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

/* ───────────────────────────────────────────── */
/* Middleware                                    */
/* ───────────────────────────────────────────── */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ───────────────────────────────────────────── */
/* HEALTHCHECK — THIS IS CRITICAL                */
/* ───────────────────────────────────────────── */

app.get('/', (req, res) => {
  res.status(200).json({ ok: true });
});

/* ───────────────────────────────────────────── */
/* STATIC FRONTEND                               */
/* ───────────────────────────────────────────── */

app.use(express.static(path.join(__dirname, 'public')));

/* Fallback to index.html */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ───────────────────────────────────────────── */
/* START SERVER                                  */
/* ───────────────────────────────────────────── */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
