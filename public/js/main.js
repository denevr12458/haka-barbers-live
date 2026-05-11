'use strict';

/* ══════════════════════════════════════════════════════════════════════════
   HEXAGON CANVAS
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, hexagons = [];
  var BRASS = 'rgba(201,169,110,', S = 48, GAP = 8, CW = S * 1.732, RH = S * 1.5;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    hexagons = [];
    var cols = Math.ceil(W / CW) + 2, rows = Math.ceil(H / RH) + 2;
    for (var r = -1; r < rows; r++) {
      for (var c = -1; c < cols; c++) {
        var x = c * CW + (r % 2 === 0 ? 0 : CW / 2), y = r * RH;
        var vis = x > W * 0.3;
        hexagons.push({ x: x, y: y, phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.005, base: vis ? 0.04 + Math.random() * 0.12 : 0.01, active: vis && Math.random() > 0.6 });
      }
    }
  }

  function hexPath(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 3 * i - Math.PI / 6;
      var px = x + (r - GAP / 2) * Math.cos(a), py = y + (r - GAP / 2) * Math.sin(a);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    hexagons.forEach(function(h) {
      var t = ts * h.speed + h.phase, g = h.base + (h.active ? Math.abs(Math.sin(t)) * 0.25 : 0);
      ctx.shadowBlur = h.active && g > 0.15 ? 20 : 0;
      if (h.active && g > 0.15) ctx.shadowColor = BRASS + (g * 0.5).toFixed(2) + ')';
      hexPath(h.x, h.y, S);
      ctx.strokeStyle = BRASS + Math.min(g, 0.4).toFixed(2) + ')';
      ctx.lineWidth = h.active ? 0.8 : 0.4;
      ctx.stroke();
      if (h.active && g > 0.2) { hexPath(h.x, h.y, S); ctx.fillStyle = BRASS + (g * 0.05).toFixed(3) + ')'; ctx.fill(); }
    });
    ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();

/* ══════════════════════════════════════════════════════════════════════════
   CUSTOM CURSOR
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var dot = document.querySelector('.cursor'), ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;
  var mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', function(e) { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
  (function loop() { rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
  document.querySelectorAll('a,button,[data-hover],.service-option,.slot-btn').forEach(function(el) {
    el.addEventListener('mouseenter', function() { ring.classList.add('hover'); });
    el.addEventListener('mouseleave', function() { ring.classList.remove('hover'); });
  });
})();

/* ══════════════════════════════════════════════════════════════════════════
   NAV
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var nav = document.querySelector('.nav'), hamb = document.querySelector('.nav-hamburger'), links = document.querySelector('.nav-links');
  if (!nav) return;
  window.addEventListener('scroll', function() { nav.classList.toggle('scrolled', window.scrollY > 60); }, { passive: true });
  if (hamb) hamb.addEventListener('click', function() { links && links.classList.toggle('open'); });
  if (links) links.querySelectorAll('a').forEach(function(a) { a.addEventListener('click', function() { links.classList.remove('open'); }); });
})();

/* ══════════════════════════════════════════════════════════════════════════
   SMOOTH SCROLL
   ══════════════════════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(function(a) {
  a.addEventListener('click', function(e) {
    var t = document.querySelector(this.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SCROLL REVEALS
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(function(e) { e.classList.add('visible'); }); return; }
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function(el) { io.observe(el); });
})();

/* ══════════════════════════════════════════════════════════════════════════
   PARALLAX
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var bg = document.querySelector('.hero-bg');
  if (!bg) return;
  window.addEventListener('scroll', function() {
    if (window.scrollY < window.innerHeight) bg.style.transform = 'translateY(' + window.scrollY * 0.3 + 'px)';
  }, { passive: true });
})();

/* ══════════════════════════════════════════════════════════════════════════
   REVIEWS CAROUSEL
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var track = document.getElementById('reviews-track');
  if (!track) return;
  var reviews = [
    { name: 'Marcus T.',  date: '2 weeks ago',  text: "Best barbershop I've found in London. The atmosphere is incredible — dark, moody, properly premium. My fade has never looked this sharp." },
    { name: 'James O.',   date: '1 month ago',  text: "Came in for a hot towel shave and left feeling like a new man. The attention to detail is something else. Will not be going anywhere else." },
    { name: 'Daniel K.',  date: '3 weeks ago',  text: "The booking system is seamless and the barbers are proper craftsmen. Consistent quality every single time. Highly recommend the Cut & Beard combo." },
    { name: 'Ryan M.',    date: '1 month ago',  text: "Walked past and was drawn in by the shop front. So glad I booked — the skin fade I got was absolutely elite. Booked my next three appointments already." },
    { name: 'Theo B.',    date: '2 months ago', text: "Genuinely the best barbershop experience I've ever had. The vibe, the music, the skill — everything is on point. Worth every penny." },
    { name: 'Kai L.',     date: '3 weeks ago',  text: "Classic cut done to perfection. They actually listened to what I wanted instead of just doing their own thing. Rare to find these days." },
    { name: 'Nathan P.',  date: '5 weeks ago',  text: "Kids cut for my son — he was nervous but the barber put him completely at ease. Result was brilliant. We're regulars now." },
    { name: 'Samuel H.',  date: '6 weeks ago',  text: "The hot towel shave is an experience in itself. Premium products, immaculate technique. Left with the smoothest skin I can remember." },
  ];
  var html = '';
  reviews.concat(reviews).forEach(function(r) {
    html += '<div class="review-card"><div class="review-stars"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>'
      + '<p class="review-text">"' + r.text + '"</p>'
      + '<div class="review-author"><div class="review-avatar">' + r.name[0] + '</div>'
      + '<div><div class="review-name">' + r.name + '</div><div class="review-date">' + r.date + '</div></div>'
      + '<div class="google-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1H12v2.8h5.3c-.5 2.3-2.5 4-5.3 4-3.1 0-5.5-2.4-5.5-5.5s2.4-5.5 5.5-5.5c1.4 0 2.7.5 3.7 1.3l2.1-2.1C16.2 4.8 14.2 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.7 0-.5 0-.9-.1-1.2z"/></svg>Google</div>'
      + '</div></div>';
  });
  track.innerHTML = html;
})();

/* ══════════════════════════════════════════════════════════════════════════
   OPENING HOURS SIDEBAR + TODAY
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var container = document.getElementById('hours-list');
  var todayEl   = document.getElementById('todays-hours');
  var HOURS = [
    { day: 'Monday',    time: null },
    { day: 'Tuesday',   time: '10:30 – 19:00' },
    { day: 'Wednesday', time: '09:30 – 15:00' },
    { day: 'Thursday',  time: '09:30 – 19:00' },
    { day: 'Friday',    time: '09:30 – 19:00' },
    { day: 'Saturday',  time: '09:30 – 18:00' },
    { day: 'Sunday',    time: '11:00 – 16:00' },
  ];
  var dayNames  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var todayName = dayNames[new Date().getDay()];

  if (container) {
    container.innerHTML = HOURS.map(function(h) {
      var today = h.day === todayName;
      return '<div class="hours-item' + (today ? ' today' : '') + (!h.time ? ' closed' : '') + '">'
        + '<span class="day">' + h.day + (today ? ' <small style="font-size:.6rem;color:var(--brass)">Today</small>' : '') + '</span>'
        + '<span class="time">' + (h.time || 'Closed') + '</span></div>';
    }).join('');
  }

  if (todayEl) {
    var found = HOURS.find(function(h) { return h.day === todayName; });
    todayEl.textContent = found && found.time ? found.time : 'Closed today';
  }
})();

/* ══════════════════════════════════════════════════════════════════════════
   BOOKING FORM
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var state = { step: 1, service: null, date: null, time: null, name: '', email: '', phone: '', notes: '' };

  var stepEls   = document.querySelectorAll('.booking-step');
  var formSteps = document.querySelectorAll('.form-step');
  var btnNext   = document.getElementById('btn-next');
  var btnBack   = document.getElementById('btn-back');
  var btnSubmit = document.getElementById('btn-submit');
  var alertBox  = document.getElementById('booking-alert');
  var formInner = document.getElementById('booking-form-inner');
  var successEl = document.getElementById('booking-success');

  if (!btnNext) return;

  function fmtDate(s) {
    var days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = new Date(s + 'T12:00:00');
    return days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()];
  }
  function fmtTime(t) {
    var p = t.split(':'), h = parseInt(p[0]), m = parseInt(p[1]);
    return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h >= 12 ? 'pm' : 'am');
  }
  function showAlert(msg) { alertBox.className = 'alert show alert-error'; alertBox.textContent = msg; alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  function clearAlert()   { alertBox.className = 'alert'; alertBox.textContent = ''; }

  function renderSteps() {
    stepEls.forEach(function(s, i)   { s.classList.toggle('active', i + 1 === state.step); s.classList.toggle('done', i + 1 < state.step); });
    formSteps.forEach(function(s, i) { s.classList.toggle('active', i + 1 === state.step); });
    btnBack.style.display   = state.step > 1 ? 'inline-flex' : 'none';
    btnNext.style.display   = state.step < 3 ? 'inline-flex' : 'none';
    btnSubmit.style.display = state.step === 3 ? 'inline-flex' : 'none';
    clearAlert();
  }

  /* Load services from API */
  fetch('/api/services')
    .then(function(r) { return r.json(); })
    .then(function(services) {
      var grid = document.getElementById('service-select-grid');
      if (!grid) return;
      grid.innerHTML = services.map(function(s) {
        var price = typeof s.price === 'string' ? parseFloat(s.price) : s.price;
        if (Number.isNaN(price)) price = 0;
        return '<div class="service-option" data-id="' + s.id + '" data-duration="' + s.duration + '" data-name="' + s.name + '" data-price="' + price + '">'
          + '<div class="service-option-name">' + s.name + '</div>'
          + '<div class="service-option-price">£' + price.toFixed(2) + '</div>'
          + '<div class="service-option-duration">' + s.duration + ' min</div>'
          + '</div>';
      }).join('');

      /* Populate static services grid too */
      var sg = document.getElementById('services-grid');
      if (sg) {
        sg.innerHTML = services.map(function(s) {
          var price = typeof s.price === 'string' ? parseFloat(s.price) : s.price;
          if (Number.isNaN(price)) price = 0;
          return '<div class="service-card">'
            + '<div class="service-card-top"><span class="service-name">' + s.name + '</span><span class="service-price">£' + price.toFixed(2) + '</span></div>'
            + '<p class="service-desc">' + s.description + '</p>'
            + '<div class="service-duration">' + s.duration + ' min</div>'
            + '<button class="service-book-btn" aria-label="Book ' + s.name + '">Book →</button>'
            + '</div>';
        }).join('');
        sg.querySelectorAll('.service-book-btn').forEach(function(b) {
          b.addEventListener('click', function() { document.getElementById('booking').scrollIntoView({ behavior: 'smooth' }); });
        });
      }

      grid.querySelectorAll('.service-option').forEach(function(el) {
        el.addEventListener('click', function() {
          grid.querySelectorAll('.service-option').forEach(function(x) { x.classList.remove('selected'); });
          el.classList.add('selected');
          state.service = { id: +el.dataset.id, name: el.dataset.name, duration: +el.dataset.duration, price: +el.dataset.price };
          clearAlert();
        });
      });
    })
    .catch(function() {
      var grid = document.getElementById('service-select-grid');
      if (grid) grid.innerHTML = '<p class="slots-empty">Unable to load services. Please refresh.</p>';
    });

  /* Date input */
  function initDateInput() {
    var input = document.getElementById('booking-date');
    if (!input || input.dataset.ready) return;
    input.dataset.ready = '1';
    var today = new Date(); today.setHours(0,0,0,0);
    var max   = new Date(); max.setDate(max.getDate() + 60);
    input.min = today.toISOString().split('T')[0];
    input.max = max.toISOString().split('T')[0];
    input.addEventListener('change', function() {
      state.date = input.value; state.time = null;
      if (state.date && state.service) loadSlots();
    });
  }

  /* Load availability from API */
  function loadSlots() {
    var grid = document.getElementById('slots-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="slots-loading"><span class="spinner"></span>&nbsp; Checking availability…</div>';
    state.time = null;

    fetch('/api/availability?date=' + state.date + '&service_id=' + state.service.id)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.closed) { grid.innerHTML = "<p class='slots-empty'>We're closed on this day. Please choose another date.</p>"; return; }
        if (!data.slots || !data.slots.length) { grid.innerHTML = "<p class='slots-empty'>No availability on this date. Please try another day.</p>"; return; }
        grid.innerHTML = data.slots.map(function(slot) {
          return '<button class="slot-btn" data-time="' + slot + '" type="button">' + fmtTime(slot) + '</button>';
        }).join('');
        grid.querySelectorAll('.slot-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            grid.querySelectorAll('.slot-btn').forEach(function(x) { x.classList.remove('selected'); });
            btn.classList.add('selected'); state.time = btn.dataset.time; clearAlert();
          });
        });
      })
      .catch(function() { grid.innerHTML = "<p class='slots-empty'>Unable to check availability. Please try again.</p>"; });
  }

  function renderSummary() {
    document.getElementById('sum-service').textContent = state.service ? state.service.name : '—';
    document.getElementById('sum-date').textContent    = state.date    ? fmtDate(state.date) : '—';
    document.getElementById('sum-time').textContent    = state.time    ? fmtTime(state.time) : '—';
    document.getElementById('sum-price').textContent   = state.service ? '£' + state.service.price.toFixed(2) : '—';
  }

  function validate() {
    if (state.step === 1 && !state.service) { showAlert('Please select a service.'); return false; }
    if (state.step === 2 && !state.date)    { showAlert('Please select a date.'); return false; }
    if (state.step === 2 && !state.time)    { showAlert('Please select an available time slot.'); return false; }
    if (state.step === 3) {
      var name  = document.getElementById('input-name').value.trim();
      var email = document.getElementById('input-email').value.trim();
      if (name.length < 2)  { showAlert('Please enter your full name.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAlert('Please enter a valid email address.'); return false; }
      state.name  = name;
      state.email = email;
      state.phone = document.getElementById('input-phone').value.trim();
      state.notes = document.getElementById('input-notes').value.trim();
    }
    return true;
  }

  btnNext.addEventListener('click', function() {
    if (!validate()) return;
    state.step++;
    renderSteps();
    if (state.step === 2) initDateInput();
    if (state.step === 3) renderSummary();
  });

  btnBack.addEventListener('click', function() { state.step = Math.max(1, state.step - 1); renderSteps(); });

  btnSubmit.addEventListener('click', function() {
    if (!validate()) return;
    btnSubmit.disabled  = true;
    btnSubmit.innerHTML = '<span class="spinner"></span>&nbsp;Confirming…';

    fetch('/api/bookings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        customer_name:  state.name,
        customer_email: state.email,
        customer_phone: state.phone,
        service_id:     state.service.id,
        booking_date:   state.date,
        start_time:     state.time,
        notes:          state.notes,
      }),
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) {
        showAlert(res.data.error || 'Booking failed. Please try again.');
        btnSubmit.disabled  = false;
        btnSubmit.innerHTML = 'Confirm Booking';
        return;
      }
      formInner.style.display = 'none';
      successEl.style.display = 'block';
      document.getElementById('success-ref').textContent = res.data.booking_id;
      successEl.classList.add('show');
    })
    .catch(function() {
      showAlert('Network error. Please check your connection and try again.');
      btnSubmit.disabled  = false;
      btnSubmit.innerHTML = 'Confirm Booking';
    });
  });

  renderSteps();
})();

/* ══════════════════════════════════════════════════════════════════════════
   OPENING HOURS
   ══════════════════════════════════════════════════════════════════════════ */
(function() {
  var hoursList = document.getElementById('hours-list');
  if (!hoursList) return;

  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var hours = {
    0: '11:00 – 16:00',
    1: 'Closed',
    2: '10:30 – 19:00',
    3: '09:30 – 15:00',
    4: '09:30 – 19:00',
    5: '09:30 – 19:00',
    6: '09:30 – 18:00'
  };

  var html = '<div style="font-size:14px;color:var(--warm-grey);line-height:1.6">';
  days.forEach(function(day, i) {
    var h = hours[i] || 'Closed';
    html += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--muted);border-opacity:0.2">';
    html += '<span style="font-weight:500">' + day + '</span>';
    html += '<span>' + h + '</span>';
    html += '</div>';
  });
  html += '</div>';
  hoursList.innerHTML = html;
})();