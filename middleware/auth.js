'use strict';

/* ───────────────────────────────
   SAFE AUTH MIDDLEWARE (RAILWAY SAFE)
   ─────────────────────────────── */

function requireAuth(req, res, next) {
  try {
    if (req.session && req.session.ownerId) {
      return next();
    }
    return res.redirect('/admin/login');
  } catch (err) {
    console.error('[requireAuth ERROR]', err);
    return res.status(500).send('Internal Server Error');
  }
}

function requireGuest(req, res, next) {
  try {
    if (req.session && req.session.ownerId) {
      return res.redirect('/admin/dashboard');
    }
    return next();
  } catch (err) {
    console.error('[requireGuest ERROR]', err);
    return res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  requireAuth,
  requireGuest
};
