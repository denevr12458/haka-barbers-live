'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.ownerId) return next();
  const isApi = req.path.startsWith('/api/') || (req.headers.accept || '').includes('application/json');
  if (isApi) return res.status(401).json({ error: 'Authentication required.' });
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

function requireGuest(req, res, next) {
  if (req.session && req.session.ownerId) return res.redirect('/admin/dashboard');
  next();
}

module.exports = { requireAuth, requireGuest };