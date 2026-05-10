'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

const db = {
  query: (text, params) => pool.query(text, params),

  get: async (text, params, cb) => {
    try {
      const res = await pool.query(text, params);
      cb(null, res.rows[0]);
    } catch (err) {
      cb(err);
    }
  },

  all: async (text, params, cb) => {
    try {
      const res = await pool.query(text, params);
      cb(null, res.rows);
    } catch (err) {
      cb(err);
    }
  },

  run: async (text, params, cb) => {
    try {
      const res = await pool.query(text, params);
      cb(null, res);
    } catch (err) {
      cb(err);
    }
  }
};

module.exports = { db };
