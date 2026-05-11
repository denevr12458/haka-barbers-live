'use strict';

const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || process.env.SMTP_EMAIL || process.env.SMTP_USERNAME;
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
const HOST      = process.env.SMTP_HOST || 'smtp.gmail.com';
const PORT      = parseInt(process.env.SMTP_PORT || '587');
const SECURE    = process.env.SMTP_SECURE === 'true';
const FROM      = `"Haka Barbers" <${SMTP_USER || 'noreply@haka-barbers.com'}>`;
const OWNER     = process.env.OWNER_EMAIL || SMTP_USER || 'dscott09ymk@gmail.com';
const SITE      = process.env.SITE_URL || 'http://localhost:3000';

function createTransporter() {
  const transportConfig = {
    host: HOST,
    port: PORT,
    secure: SECURE,
    tls: {
      rejectUnauthorized: false,
    },
  };

  if (SMTP_USER && SMTP_PASS) {
    transportConfig.auth = {
      user: SMTP_USER,
      pass: SMTP_PASS,
    };
  }

  return nodemailer.createTransport(transportConfig);
}

/* ── Shared email shell ── */
function shell(body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0908;font-family:Georgia,serif;color:#ede0cc}
.wrap{max-width:580px;margin:0 auto;padding:40px 20px}
.head{text-align:center;padding:40px 0 32px;border-bottom:1px solid #3a2e22}
.logo{font-size:26px;letter-spacing:.3em;color:#c9a96e;text-transform:uppercase}
.logo-sub{font-size:10px;letter-spacing:.5em;color:#7a6858;margin-top:6px;text-transform:uppercase}
.body{padding:40px 0}
.card{background:#1c1510;border:1px solid #3a2e22;padding:28px;margin:28px 0}
.card-label{font-family:'Courier New',monospace;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:#c9a96e;margin-bottom:18px;display:block}
.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2a1f14}
.row:last-child{border-bottom:none}
.rl{font-family:'Courier New',monospace;font-size:11px;letter-spacing:.1em;color:#7a6858;text-transform:uppercase}
.rv{font-size:14px;color:#ede0cc;font-weight:bold}
.rv.gold{color:#c9a96e}
h2{font-size:22px;font-weight:400;margin-bottom:14px}
p{font-size:14px;line-height:1.8;color:#b09a84;margin-bottom:16px}
.cta{display:inline-block;padding:14px 32px;background:#c9a96e;color:#080706;font-family:'Courier New',monospace;font-size:11px;letter-spacing:.25em;text-transform:uppercase;text-decoration:none;margin:16px 0}
.foot{text-align:center;padding:28px 0;border-top:1px solid #2a1f14}
.foot p{font-size:11px;color:#3a2e22;line-height:1.8}
.foot a{color:#c9a96e;text-decoration:none}
</style></head><body><div class="wrap">
<div class="head"><div class="logo">HAKA</div><div class="logo-sub">Barbers · London</div></div>
<div class="body">${body}</div>
<div class="foot"><p>Haka Barbers &nbsp;|&nbsp; London, UK<br>Questions? <a href="mailto:${OWNER}">${OWNER}</a></p></div>
</div></body></html>`;
}

function fmtDate(s) {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d = new Date(s + 'T12:00:00');
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'pm' : 'am'}`;
}

/* ── Customer confirmation ── */
async function sendCustomerConfirmation(booking, service) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[Email] SMTP not configured — skipping customer email');
    return;
  }
  const price = Number(service.price) || 0;
  const duration = Number(service.duration) || 0;
  const body = `
    <h2>Your appointment is confirmed.</h2>
    <p>Hi ${booking.customer_name}, we're looking forward to seeing you. Please arrive 5 minutes early.<br>
    To cancel, contact us at least 24 hours in advance.</p>
    <div class="card">
      <span class="card-label">Booking Details</span>
      <div class="row"><span class="rl">Service</span><span class="rv">${service.name}</span></div>
      <div class="row"><span class="rl">Date</span><span class="rv">${fmtDate(booking.booking_date)}</span></div>
      <div class="row"><span class="rl">Time</span><span class="rv">${fmtTime(booking.start_time)}</span></div>
      <div class="row"><span class="rl">Duration</span><span class="rv">${duration} minutes</span></div>
      <div class="row"><span class="rl">Price</span><span class="rv gold">£${price.toFixed(2)}</span></div>
      <div class="row"><span class="rl">Reference</span><span class="rv" style="font-size:12px;letter-spacing:.1em">${booking.id.split('-')[0].toUpperCase()}</span></div>
    </div>
    <p style="font-size:13px;color:#7a6858"><strong style="color:#c9a96e">Address:</strong> 123 Barber Street, London, EC1A 1BB<br>
    <strong style="color:#c9a96e">Contact:</strong> ${OWNER}</p>
    <p style="text-align:center"><a href="${SITE}/#booking" class="cta">Book Another Appointment</a></p>`;

  await createTransporter().sendMail({
    from:    FROM,
    to:      booking.customer_email,
    subject: `Appointment Confirmed — ${fmtDate(booking.booking_date)} at ${fmtTime(booking.start_time)}`,
    html:    shell(body),
  });
  console.log(`[Email] Confirmation → ${booking.customer_email}`);
}

/* ── Owner notification ── */
async function sendOwnerNotification(booking, service) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[Email] SMTP not configured — skipping owner email');
    return;
  }
  const price = Number(service.price) || 0;
  const duration = Number(service.duration) || 0;
  const body = `
    <h2>New booking received.</h2>
    <p>A customer has just booked through the website.</p>
    <div class="card">
      <span class="card-label">Booking Details</span>
      <div class="row"><span class="rl">Customer</span><span class="rv">${booking.customer_name}</span></div>
      <div class="row"><span class="rl">Email</span><span class="rv">${booking.customer_email}</span></div>
      <div class="row"><span class="rl">Phone</span><span class="rv">${booking.customer_phone || 'Not provided'}</span></div>
      <div class="row"><span class="rl">Service</span><span class="rv">${service.name}</span></div>
      <div class="row"><span class="rl">Date</span><span class="rv">${fmtDate(booking.booking_date)}</span></div>
      <div class="row"><span class="rl">Time</span><span class="rv">${fmtTime(booking.start_time)} – ${fmtTime(booking.end_time)}</span></div>
      <div class="row"><span class="rl">Notes</span><span class="rv">${booking.notes || 'None'}</span></div>
      <div class="row"><span class="rl">Price</span><span class="rv gold">£${price.toFixed(2)}</span></div>
      <div class="row"><span class="rl">Booking ID</span><span class="rv" style="font-size:11px">${booking.id}</span></div>
    </div>
    <p style="text-align:center"><a href="${SITE}/admin/dashboard" class="cta">View in Dashboard</a></p>`;

  await createTransporter().sendMail({
    from:    FROM,
    to:      OWNER,
    subject: `[Haka] New Booking — ${booking.customer_name} · ${fmtDate(booking.booking_date)}`,
    html:    shell(body),
  });
  console.log(`[Email] Owner notification → ${OWNER}`);
}

/* ── Cancellation to customer ── */
async function sendCancellationEmail(booking, service) {
  if (!SMTP_USER || !SMTP_PASS) return;
  const body = `
    <h2>Your appointment has been cancelled.</h2>
    <p>Hi ${booking.customer_name}, your appointment has been cancelled. We're sorry for any inconvenience.
    Please rebook at your convenience or get in touch if you have questions.</p>
    <div class="card">
      <span class="card-label">Cancelled Booking</span>
      <div class="row"><span class="rl">Service</span><span class="rv">${service.name}</span></div>
      <div class="row"><span class="rl">Date</span><span class="rv">${fmtDate(booking.booking_date)}</span></div>
      <div class="row"><span class="rl">Time</span><span class="rv">${fmtTime(booking.start_time)}</span></div>
    </div>
    <p style="text-align:center"><a href="${SITE}/#booking" class="cta">Rebook Now</a></p>`;

  await createTransporter().sendMail({
    from:    FROM,
    to:      booking.customer_email,
    subject: `Appointment Cancelled — Haka Barbers`,
    html:    shell(body),
  });
  console.log(`[Email] Cancellation → ${booking.customer_email}`);
}

async function testSmtpConnection() {
  // If no SMTP configured, return early with helpful message
  if (!SMTP_USER || !SMTP_PASS) {
    return {
      configured: false,
      error: 'SMTP not configured. Set these Railway environment variables:',
      required_vars: [
        'SMTP_USER=your-email@gmail.com',
        'SMTP_PASS=your-app-password',
        'SMTP_HOST=smtp.gmail.com',
        'SMTP_PORT=587',
        'SMTP_SECURE=false',
        'OWNER_EMAIL=your-email@gmail.com',
        'SITE_URL=https://your-railway-domain.up.railway.app'
      ],
      alternatives: [
        'Use Outlook: SMTP_HOST=smtp-mail.outlook.com',
        'Use SendGrid: SMTP_HOST=smtp.sendgrid.net, SMTP_USER=apikey',
        'Use Mailgun: Check their SMTP settings'
      ]
    };
  }

  const transporter = createTransporter();
  try {
    await transporter.verify();
    return {
      configured: true,
      verified: true,
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: Boolean(SMTP_USER && SMTP_PASS),
      ready_to_send: true
    };
  } catch (err) {
    return {
      configured: true,
      verified: false,
      error: err.message,
      host: HOST,
      port: PORT,
      secure: SECURE,
      auth: Boolean(SMTP_USER && SMTP_PASS),
      troubleshooting: [
        'Check SMTP credentials are correct',
        'Verify app password (for Gmail)',
        'Try different SMTP provider',
        'Check Railway environment variables'
      ]
    };
  }
}

module.exports = { sendCustomerConfirmation, sendOwnerNotification, sendCancellationEmail, testSmtpConnection };