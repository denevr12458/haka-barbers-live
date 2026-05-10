'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const { body, validationResult } = require('express-validator');

const { db } = require('../config/database');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { sendCancellationEmail } = require('../config/email');
const { timeToMinutes } = require('../config/hours');

const router = express.Router();

/* ─────────────────────────────────────────────
   SAFE ADMIN AUTO-SEED (IMPORTANT FIX)
   ───────────────────────────────────────────── */

const ensureAdminExists = async () => {
  db.get('SELECT * FROM owners LIMIT 1', async (err, row) => {
    if (err) {
      console.error('[ADMIN SEED ERROR]', err);
      return;
    }

    if (!row) {
      console.log('[ADMIN] No owner found — creating default admin...');

      const hash = await bcrypt.hash('admin123', 12);

      db.run(
        'INSERT INTO owners (username, password) VALUES (?, ?)',
        ['admin', hash],
        (err) => {
          if (err) {
            console.error('[ADMIN CREATE ERROR]', err);
          } else {
            console.log('[ADMIN CREATED] username: admin | password: admin123');
          }
        }
      );
    }
  });
};

ensureAdminExists();

/* ─────────────────────────────────────────────
   PAGE ROUTES
   ───────────────────────────────────────────── */

router.get('/', (req, res) => {
  if (req.session?.ownerId) return res.redirect('/admin/dashboard');
  return res.redirect('/admin/login');
});

router.get('/login', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin-dashboard.html'));
});

/* ─────────────────────────────────────────────
   LOGIN (FIXED + SAFE)
   ───────────────────────────────────────────── */

router.post(
  '/login',
  requireGuest,
  [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const { username, password } = req.body;

    db.get(
      'SELECT * FROM owners WHERE username=?',
      [username],
      async (err, owner) => {
        if (err) {
          console.error('[DB ERROR]', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!owner || !owner.password) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        let match = false;

        try {
          match = await bcrypt.compare(password, owner.password);
        } catch (e) {
          console.error('[BCRYPT ERROR]', e);
          return res.status(500).json({ error: 'Authentication error' });
        }

        if (!match) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.regenerate((err) => {
          if (err) {
            console.error('[SESSION ERROR]', err);
            return res.status(500).json({ error: 'Session error' });
          }

          req.session.ownerId = owner.id;
          req.session.username = owner.username;

          res.json({
            success: true,
            redirect: '/admin/dashboard'
          });
        });
      }
    );
  }
);

/* ─────────────────────────────────────────────
   LOGOUT
   ───────────────────────────────────────────── */

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('haka.sid');
    res.json({ success: true });
  });
});

/* ─────────────────────────────────────────────
   BOOKINGS (UNCHANGED BUT SAFER)
   ───────────────────────────────────────────── */

router.get('/api/bookings', requireAuth, (req, res) => {
  db.all(
    `SELECT b.*, s.name as service_name, s.duration, s.price
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     ORDER BY b.booking_date ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('[BOOKINGS ERROR]', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

/* ─────────────────────────────────────────────
   BOOKING STATUS UPDATE
   ───────────────────────────────────────────── */

router.patch('/api/bookings/:id', requireAuth, async (req, res) => {
  const { status } = req.body;

  db.run(
    'UPDATE bookings SET status=? WHERE id=?',
    [status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ success: true });
    }
  );
});

/* ─────────────────────────────────────────────
   BLOCKED SLOTS (SAFE)
   ───────────────────────────────────────────── */

router.get('/api/blocks', requireAuth, (req, res) => {
  db.all('SELECT * FROM blocked_slots', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

router.post('/api/blocks', requireAuth, (req, res) => {
  const { block_date, start_time, end_time, reason } = req.body;

  db.run(
    'INSERT INTO blocked_slots (block_date,start_time,end_time,reason) VALUES (?,?,?,?)',
    [block_date, start_time, end_time, reason || null],
    function (err) {
      if (err) return res.status(500).json({ error: 'Insert failed' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

router.delete('/api/blocks/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM blocked_slots WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ success: true });
  });
});

/* ─────────────────────────────────────────────
   STATS (SAFE)
   ───────────────────────────────────────────── */

router.get('/api/stats', requireAuth, (req, res) => {
  db.get(
    `SELECT COUNT(*) as count FROM bookings`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ totalBookings: row.count });
    }
  );
});

/* ───────────────────────────────────────────── */

module.exports = router;
