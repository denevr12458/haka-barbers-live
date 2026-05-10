'use strict';

/* 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat */
const OPENING_HOURS = {
  0: { open: '11:00', close: '16:00' },
  1: null,
  2: { open: '10:30', close: '19:00' },
  3: { open: '09:30', close: '15:00' },
  4: { open: '09:30', close: '19:00' },
  5: { open: '09:30', close: '19:00' },
  6: { open: '09:30', close: '18:00' },
};

const SLOT_INTERVAL = 15;

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function getHoursForDate(dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  return OPENING_HOURS[dow] || null;
}

function generateSlots(dateStr, duration) {
  const hrs = getHoursForDate(dateStr);
  if (!hrs) return [];
  const open  = timeToMinutes(hrs.open);
  const close = timeToMinutes(hrs.close);
  const slots = [];
  for (let t = open; t + duration <= close; t += SLOT_INTERVAL) slots.push(minutesToTime(t));
  return slots;
}

function isWithinOpeningHours(dateStr, startTime, endTime) {
  const hrs = getHoursForDate(dateStr);
  if (!hrs) return false;
  const open  = timeToMinutes(hrs.open);
  const close = timeToMinutes(hrs.close);
  const start = timeToMinutes(startTime);
  const end   = timeToMinutes(endTime);
  return start >= open && end <= close && start < end;
}

const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getFormattedHours() {
  return DAY_LABELS.map((label, idx) => {
    const h = OPENING_HOURS[idx];
    return { day: label, hours: h ? `${h.open} – ${h.close}` : 'Closed', open: !!h };
  });
}

module.exports = {
  OPENING_HOURS, SLOT_INTERVAL,
  timeToMinutes, minutesToTime,
  getHoursForDate, generateSlots,
  isWithinOpeningHours, getFormattedHours,
};