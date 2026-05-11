'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const { body, validationResult } = require('express-validator');

const { db, isConnected, getRawDatabaseUrl } = require('../config/database');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { sendCancellationEmail } = require('../config/email');
const { timeToMinutes } = require('../config/hours');

const router = express.Router();

/* ─────────────────────────────────────────────
   SAFE ADMIN AUTO-SEED (IMPORTANT FIX)
   ───────────────────────────────────────────── */

const ensureAdminExists = async () => {
  console.log('[ADMIN SEED] Checking for admin user...');

  db.get('SELECT id, username FROM owners WHERE username = ?', ['admin'], async (err, row) => {
    if (err) {
      console.error('[ADMIN SEED ERROR]', err);
      // Try again in 5 seconds
      setTimeout(ensureAdminExists, 5000);
      return;
    }

    if (!row) {
      console.log('[ADMIN] No admin user found — creating default admin...');

      try {
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
      } catch (e) {
        console.error('[ADMIN HASH ERROR]', e);
      }
    } else {
      console.log('[ADMIN] Default admin user already exists (id:', row.id + ')');
    }
  });
};

// Run immediately and also after 2 seconds as backup
ensureAdminExists();
setTimeout(ensureAdminExists, 2000);

/* ─────────────────────────────────────────────
   MANUAL ADMIN CREATION (DEBUG ENDPOINT)
   ───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   DEBUG ENDPOINT - Check admin user
   ───────────────────────────────────────────── */

router.get('/debug-admin', (req, res) => {
  const dbUrl = getRawDatabaseUrl().trim();
  const isPlaceholder = /your-railway-connection-string-here/i.test(dbUrl);
  const configured = Boolean(dbUrl && !isPlaceholder);
  const connected = isConnected();

  if (!configured) {
    return res.json({
      configured: false,
      connected,
      error: 'DATABASE_URL is not configured. Replace the placeholder with your Railway connection string.'
    });
  }

  if (!connected) {
    return res.json({
      configured: true,
      connected: false,
      error: 'Database pool not initialized. Check DATABASE_URL and app logs.'
    });
  }

  db.get('SELECT id, username FROM owners LIMIT 5', [], (err, row) => {
    if (err) {
      return res.json({ error: 'Database error', details: err.message, configured: true, connected: true });
    }
    res.json({ admin_users: row ? [row] : [], database_connected: true, configured: true, connected: true });
  });
});

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
      console.log('[LOGIN] Validation errors:', errors.array());
      return res.status(400).json({ error: 'Username and password required.' });
    }

    const { username, password } = req.body;
    console.log('[LOGIN] Attempt for user:', username, 'from IP:', req.ip);

    db.get(
      'SELECT * FROM owners WHERE username=?',
      [username],
      async (err, owner) => {
        if (err) {
          console.error('[DB ERROR]', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!owner) {
          console.log('[LOGIN] User not found:', username);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!owner.password) {
          console.log('[LOGIN] No password for user:', username);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        let match = false;

        try {
          match = await bcrypt.compare(password, owner.password);
          console.log('[LOGIN] Password match result:', match, 'for user:', username);
        } catch (e) {
          console.error('[BCRYPT ERROR]', e);
          return res.status(500).json({ error: 'Authentication error' });
        }

        if (!match) {
          console.log('[LOGIN] Password mismatch for user:', username);
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('[LOGIN] Success for user:', username);

        req.session.regenerate((err) => {
          if (err) {
            console.error('[SESSION ERROR]', err);
            return res.status(500).json({ error: 'Session error' });
          }

          req.session.ownerId = owner.id;
          req.session.username = owner.username;
          console.log('[LOGIN] Session created for user:', username, 'session ID:', req.session.id);

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

router.get('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('haka.sid');
    res.redirect('/admin/login');
  });
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('haka.sid');
    res.json({ success: true });
  });
});

/* ─────────────────────────────────────────────
   ADMIN DASHBOARD METRICS
   ───────────────────────────────────────────── */

router.get('/api/stats', requireAuth, (req, res) => {
  db.get('SELECT COUNT(*) AS totalbookings FROM bookings', [], (err, row) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Unable to fetch stats' });
    }
    res.json({ totalBookings: Number(row?.totalbookings || row?.totalBookings || 0) });
  });
});

/* ─────────────────────────────────────────────
   BLOCKED SLOTS
   ───────────────────────────────────────────── */

router.get('/api/blocks', requireAuth, (req, res) => {
  db.all('SELECT * FROM blocked_slots ORDER BY block_date, start_time', [], (err, rows) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Unable to load blocked slots' });
    }
    res.json(rows);
  });
});

router.post('/api/blocks', requireAuth, (req, res) => {
  const { block_date, start_time, end_time, reason } = req.body;
  if (!block_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Date, start and end time are required.' });
  }

  db.run(
    'INSERT INTO blocked_slots (block_date, start_time, end_time, reason) VALUES (?, ?, ?, ?)',
    [block_date, start_time, end_time, reason || null],
    (err) => {
      if (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ error: 'Unable to create blocked slot' });
      }
      res.json({ success: true });
    }
  );
});

router.delete('/api/blocks/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM blocked_slots WHERE id=?', [req.params.id], (err) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Unable to delete blocked slot' });
    }
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
        console.error('[DB ERROR]', err);
        return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
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

  // Get booking details for email
  db.get(
    `SELECT b.*, s.name as service_name, s.duration, s.price
     FROM bookings b
     JOIN services s ON b.service_id = s.id
     WHERE b.id=?`,
    [req.params.id],
    async (err, booking) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      db.run('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id], async (err) => {
        if (err) return res.status(500).json({ error: 'Update failed' });

        // Send cancellation email if status changed to cancelled
        if (status === 'cancelled') {
          try {
            const { sendCancellationEmail } = require('../config/email');
            await sendCancellationEmail(booking, { name: booking.service_name, duration: booking.duration, price: booking.price });
          } catch (e) {
            console.error('[Email]', e.message);
          }
        }

        res.json({ success: true });
      });
    }
  );
});

/* ─────────────────────────────────────────────
   SERVICES (CRUD)
   ───────────────────────────────────────────── */

router.get('/api/services', requireAuth, (req, res) => {
  db.all('SELECT * FROM services ORDER BY id', [], (err, rows) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
    }
    res.json(rows);
  });
});

router.post('/api/services', requireAuth, (req, res) => {
  const { name, description, duration, price } = req.body;
  db.run(
    'INSERT INTO services (name, description, duration, price) VALUES (?,?,?,?) RETURNING id',
    [name, description, duration, price],
    function (err, result) {
      if (err) return res.status(500).json({ error: 'Insert failed' });
      res.json({ success: true, id: result.rows[0].id });
    }
  );
});

router.put('/api/services/:id', requireAuth, (req, res) => {
  const { name, description, duration, price, active } = req.body;
  db.run(
    'UPDATE services SET name=?, description=?, duration=?, price=?, active=? WHERE id=?',
    [name, description, duration, price, active, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ success: true });
    }
  );
});

router.delete('/api/services/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM services WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ success: true });
  });
});

/* ─────────────────────────────────────────────
   BLOCKED SLOTS (SAFE)
   ───────────────────────────────────────────── */

router.get('/api/blocks', requireAuth, (req, res) => {
  db.all('SELECT * FROM blocked_slots', [], (err, rows) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
    }
    res.json(rows);
  });
});

router.post('/api/blocks', requireAuth, (req, res) => {
  const { block_date, start_time, end_time, reason } = req.body;

  db.run(
    'INSERT INTO blocked_slots (block_date,start_time,end_time,reason) VALUES (?,?,?,?) RETURNING id',
    [block_date, start_time, end_time, reason || null],
    function (err, result) {
      if (err) return res.status(500).json({ error: 'Insert failed' });
      res.json({ success: true, id: result.rows[0].id });
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
      if (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
      }
      res.json({ totalBookings: row.count });
    }
  );
});

/* ───────────────────────────────────────────── */

module.exports = router;
