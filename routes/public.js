'use strict';

const express   = require('express');
const { body, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db }    = require('../config/database');
const { generateSlots, isWithinOpeningHours, getHoursForDate, timeToMinutes, minutesToTime } = require('../config/hours');
const { sendCustomerConfirmation, sendOwnerNotification } = require('../config/email');

const router = express.Router();

/* GET /api/services */
router.get('/services', (req, res) => {
  db.all('SELECT id,name,description,duration,price FROM services WHERE active=1 ORDER BY id', [], (err, rows) => {
    if (err) {
      console.error('[DB ERROR]', err);
      return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
    }
    res.json(rows);
  });
});

/* GET /api/availability?date=YYYY-MM-DD&service_id=N */
router.get('/availability',
  [
    query('date').isDate(),
    query('service_id').isInt({ min: 1 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid parameters.' });

    const { date, service_id } = req.query;

    const today = new Date(); today.setHours(0,0,0,0);
    const req_d = new Date(date + 'T00:00:00');
    if (req_d < today) return res.status(400).json({ error: 'Cannot book dates in the past.' });

    const max = new Date(); max.setDate(max.getDate() + 60);
    if (req_d > max)  return res.status(400).json({ error: 'Cannot book more than 60 days ahead.' });

    const hrs = getHoursForDate(date);
    if (!hrs) return res.json({ available: false, closed: true, slots: [] });

    db.get('SELECT duration FROM services WHERE id=? AND active=1', [service_id], (err, svc) => {
      if (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
      }
      if (!svc) return res.status(404).json({ error: 'Service not found.' });

      const all = generateSlots(date, svc.duration);

      db.all(
        `SELECT start_time, end_time FROM bookings
         WHERE booking_date=? AND status NOT IN ('cancelled')
         UNION ALL
         SELECT start_time, end_time FROM blocked_slots WHERE block_date=?`,
        [date, date],
        (err, occupied) => {
          if (err) {
            console.error('[DB ERROR]', err);
            return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
          }

          const free = all.filter(slot => {
            const sMin = timeToMinutes(slot);
            const eMin = sMin + svc.duration;
            return !occupied.some(o => sMin < timeToMinutes(o.end_time) && eMin > timeToMinutes(o.start_time));
          });

          res.json({ available: true, closed: false, open: hrs.open, close: hrs.close, slots: free });
        }
      );
    });
  }
);

/* POST /api/bookings */
router.post('/bookings',
  [
    body('customer_name').trim().isLength({ min: 2, max: 80 }),
    body('customer_email').isEmail().normalizeEmail(),
    body('customer_phone').optional({ checkFalsy: true }).trim(),
    body('service_id').isInt({ min: 1 }),
    body('booking_date').isDate(),
    body('start_time').matches(/^\d{2}:\d{2}$/),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { customer_name, customer_email, customer_phone, service_id, booking_date, start_time, notes } = req.body;

    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(booking_date + 'T00:00:00') < today)
      return res.status(400).json({ error: 'Cannot book dates in the past.' });

    db.get('SELECT * FROM services WHERE id=? AND active=1', [service_id], async (err, svc) => {
      if (err) {
        console.error('[DB ERROR]', err);
        return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
      }
      if (!svc) return res.status(404).json({ error: 'Service not found.' });

      const startMin = timeToMinutes(start_time);
      const end_time = minutesToTime(startMin + svc.duration);

      if (!isWithinOpeningHours(booking_date, start_time, end_time))
        return res.status(400).json({ error: 'Time is outside opening hours.' });

      db.get(
        `SELECT id FROM bookings
         WHERE booking_date=? AND status NOT IN ('cancelled') AND start_time<? AND end_time>?
         UNION ALL
         SELECT CAST(id AS TEXT) FROM blocked_slots
         WHERE block_date=? AND start_time<? AND end_time>?
         LIMIT 1`,
        [booking_date, end_time, start_time, booking_date, end_time, start_time],
        async (err, conflict) => {
          if (err) {
            console.error('[DB ERROR]', err);
            return res.status(500).json({ error: 'Database temporarily unavailable. Please try again later.' });
          }
          if (conflict) return res.status(409).json({ error: 'This slot is no longer available. Please choose another time.' });

          const id = uuidv4();
          db.run(
            `INSERT INTO bookings (id,customer_name,customer_email,customer_phone,service_id,booking_date,start_time,end_time,notes)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [id, customer_name, customer_email, customer_phone || null, service_id, booking_date, start_time, end_time, notes || null],
            async function(err) {
              if (err) {
                console.error('[DB ERROR]', err);
                if (err.message.includes('UNIQUE'))
                  return res.status(409).json({ error: 'That slot was just taken. Please try another time.' });
                return res.status(500).json({ error: 'Booking failed. Please try again.' });
              }

              const booking = { id, customer_name, customer_email, customer_phone, booking_date, start_time, end_time, notes };
              try { await sendCustomerConfirmation(booking, svc); } catch (e) { console.error('[Email]', e.message); }
              try { await sendOwnerNotification(booking, svc);    } catch (e) { console.error('[Email]', e.message); }

              res.status(201).json({
                success:    true,
                message:    'Booking confirmed! Check your email for details.',
                booking_id: id.split('-')[0].toUpperCase(),
              });
            }
          );
        }
      );
    });
  }
);

module.exports = router;