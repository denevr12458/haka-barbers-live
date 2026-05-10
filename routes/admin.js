'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const { body, validationResult } = require('express-validator');
const { db }   = require('../config/database');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { sendCancellationEmail } = require('../config/email');
const { timeToMinutes, minutesToTime, isWithinOpeningHours } = require('../config/hours');

const router = express.Router();

/* ─── Page routes ─────────────────────────────────────────────────────────── */

router.get('/', (req, res) => {
  if (req.session && req.session.ownerId) return res.redirect('/admin/dashboard');
  res.redirect('/admin/login');
});

router.get('/login', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-dashboard.html'));
});

/* ─── Auth ────────────────────────────────────────────────────────────────── */

router.post('/login', requireGuest,
  [ body('username').trim().notEmpty(), body('password').notEmpty() ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Username and password required.' });

    const { username, password } = req.body;

    db.get('SELECT * FROM owners WHERE username=?', [username], async (err, owner) => {
      if (err) return res.status(500).json({ error: 'Server error.' });

      const dummy  = '$2b$12$invalidhashfortimingconsistency000000000000';
      const match  = owner ? await bcrypt.compare(password, owner.password) : await bcrypt.compare(password, dummy);

      if (!owner || !match) return res.status(401).json({ error: 'Invalid username or password.' });

      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: 'Session error.' });
        req.session.ownerId  = owner.id;
        req.session.username = owner.username;
        res.json({ success: true, redirect: '/admin/dashboard' });
      });
    });
  }
);

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('haka.sid');
    res.json({ success: true });
  });
});

/* ─── Bookings API ────────────────────────────────────────────────────────── */

/* GET /admin/api/bookings?date=YYYY-MM-DD  OR  ?week=YYYY-MM-DD  OR  ?status=x */
router.get('/api/bookings', requireAuth, (req, res) => {
  const { date, week, status } = req.query;
  let sql    = `SELECT b.*,s.name as service_name,s.duration,s.price FROM bookings b JOIN services s ON b.service_id=s.id WHERE 1=1`;
  const params = [];

  if (date)   { sql += ' AND b.booking_date=?';                                        params.push(date); }
  else if (week) { sql += ' AND b.booking_date>=? AND b.booking_date<date(?,"+7 days")'; params.push(week, week); }

  if (status) { sql += ' AND b.status=?'; params.push(status); }
  sql += ' ORDER BY b.booking_date ASC, b.start_time ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/api/bookings/:id', requireAuth, (req, res) => {
  db.get(
    `SELECT b.*,s.name as service_name,s.duration,s.price FROM bookings b JOIN services s ON b.service_id=s.id WHERE b.id=?`,
    [req.params.id],
    (err, row) => {
      if (err)  return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Booking not found.' });
      res.json(row);
    }
  );
});

router.patch('/api/bookings/:id', requireAuth,
  [ body('status').isIn(['confirmed','cancelled','completed','no-show']) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid status.' });

    const { status } = req.body;

    db.get(
      `SELECT b.*,s.name as service_name,s.duration,s.price FROM bookings b JOIN services s ON b.service_id=s.id WHERE b.id=?`,
      [req.params.id],
      async (err, booking) => {
        if (err || !booking) return res.status(404).json({ error: 'Booking not found.' });

        db.run('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id], async function(err) {
          if (err) return res.status(500).json({ error: err.message });

          if (status === 'cancelled') {
            try {
              await sendCancellationEmail(booking, {
                name: booking.service_name, duration: booking.duration, price: booking.price,
              });
            } catch (e) { console.error('[Email]', e.message); }
          }
          res.json({ success: true, status });
        });
      }
    );
  }
);

/* ─── Blocked slots API ───────────────────────────────────────────────────── */

router.get('/api/blocks', requireAuth, (req, res) => {
  const { date } = req.query;
  let sql = 'SELECT * FROM blocked_slots';
  const params = [];
  if (date) { sql += ' WHERE block_date=?'; params.push(date); }
  sql += ' ORDER BY block_date ASC, start_time ASC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/api/blocks', requireAuth,
  [ body('block_date').isDate(), body('start_time').matches(/^\d{2}:\d{2}$/), body('end_time').matches(/^\d{2}:\d{2}$/) ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { block_date, start_time, end_time, reason } = req.body;

    if (timeToMinutes(start_time) >= timeToMinutes(end_time))
      return res.status(400).json({ error: 'End time must be after start time.' });

    db.run(
      'INSERT INTO blocked_slots (block_date,start_time,end_time,reason) VALUES (?,?,?,?)',
      [block_date, start_time, end_time, reason || null],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ success: true, id: this.lastID });
      }
    );
  }
);

router.delete('/api/blocks/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM blocked_slots WHERE id=?', [req.params.id], function(err) {
    if (err)           return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Block not found.' });
    res.json({ success: true });
  });
});

/* ─── Stats ───────────────────────────────────────────────────────────────── */

router.get('/api/stats', requireAuth, (req, res) => {
  const q = {
    today:   `SELECT COUNT(*) c FROM bookings WHERE booking_date=date('now') AND status='confirmed'`,
    week:    `SELECT COUNT(*) c FROM bookings WHERE booking_date>=date('now') AND booking_date<date('now','+7 days') AND status='confirmed'`,
    total:   `SELECT COUNT(*) c FROM bookings WHERE status NOT IN ('cancelled')`,
    revenue: `SELECT COALESCE(SUM(s.price),0) c FROM bookings b JOIN services s ON b.service_id=s.id WHERE b.status='completed'`,
  };
  const result = {};
  const keys   = Object.keys(q);
  let pending  = keys.length;
  keys.forEach(k => {
    db.get(q[k], [], (err, row) => {
      result[k] = err ? 0 : (row ? row.c : 0);
      if (--pending === 0) res.json(result);
    });
  });
});

/* ─── Change password ─────────────────────────────────────────────────────── */

router.post('/api/change-password', requireAuth,
  [ body('current').notEmpty(), body('newpass').isLength({ min: 8 }) ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const { current, newpass } = req.body;

    db.get('SELECT * FROM owners WHERE id=?', [req.session.ownerId], async (err, owner) => {
      if (err || !owner) return res.status(404).json({ error: 'Owner not found.' });

      const match = await bcrypt.compare(current, owner.password);
      if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

      const hash = await bcrypt.hash(newpass, 12);
      db.run('UPDATE owners SET password=? WHERE id=?', [hash, owner.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  }
);

module.exports = router;