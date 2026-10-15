// CoachEaze website — small, dependency-free interactions.
(function () {
  // Mobile menu
  var btn = document.querySelector('.menu-btn'), links = document.querySelector('.nav-links');
  if (btn && links) {
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') links.classList.remove('open'); });
  }

  // Scroll reveal (+ fills skill bars when they come into view)
  var els = document.querySelectorAll('.reveal');
  var show = function (el) {
    el.classList.add('in');
    el.querySelectorAll('.bar i[data-w]').forEach(function (b) { b.style.width = b.getAttribute('data-w') + '%'; });
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(show); }

  // Streak counter counts up once
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = +el.getAttribute('data-count'), done = false;
    var run = function () {
      if (done) return; done = true;
      var n = 0, t = setInterval(function () { n++; el.textContent = n; if (n >= target) clearInterval(t); }, 110);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: .5 }).observe(el);
    } else { el.textContent = target; }
  });

  // Videos: big play button, pause the other film when one plays
  var films = document.querySelectorAll('.film');
  films.forEach(function (f) {
    var v = f.querySelector('video'), p = f.querySelector('.play');
    if (!v || !p) return;
    p.addEventListener('click', function () { v.controls = true; v.play(); });
    v.addEventListener('play', function () {
      f.classList.add('playing');
      films.forEach(function (o) { var ov = o.querySelector('video'); if (ov && ov !== v) ov.pause(); });
    });
    v.addEventListener('ended', function () { f.classList.remove('playing'); v.controls = false; });
  });

  // Role tabs
  var tabs = document.querySelectorAll('[data-role]');
  var shot = document.getElementById('role-img');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      document.querySelectorAll('.role-panel').forEach(function (p) { p.classList.toggle('on', p.id === 'role-' + t.dataset.role); });
      if (shot) {
        shot.style.opacity = 0;
        setTimeout(function () { shot.src = t.dataset.img; shot.alt = t.dataset.alt; shot.style.opacity = 1; }, 180);
      }
    });
  });

  // Pricing: monthly / yearly
  var per = document.querySelectorAll('[data-period]');
  per.forEach(function (b) {
    b.addEventListener('click', function () {
      per.forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      var yearly = b.dataset.period === 'annual';
      document.querySelectorAll('[data-m]').forEach(function (el) {
        el.textContent = Number(yearly ? el.dataset.a : el.dataset.m).toLocaleString('en-IN');
      });
      document.querySelectorAll('.per').forEach(function (el) { el.textContent = yearly ? '/year' : '/month'; });
    });
  });

  // ── Try it yourself ───────────────────────────────────────────────────
  var demoTabs = document.querySelectorAll('[data-demo]');
  demoTabs.forEach(function (t) {
    t.addEventListener('click', function () {
      demoTabs.forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      document.querySelectorAll('.demo').forEach(function (d) { d.classList.toggle('on', d.id === 'demo-' + t.dataset.demo); });
      if (t.dataset.demo === 'checkin') placeMap();
    });
  });

  // 1) Group photo: 12 players, scan, every face boxed and named
  var kidsEl = document.getElementById('kids');
  if (kidsEl) {
    var names = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Anaya', 'Ishaan', 'Saanvi', 'Vihaan', 'Tara', 'Arjun', 'Zoya'];
    var skins = ['#f1c7a3', '#d9a07a', '#c68b5e', '#a8704a', '#e8b896', '#8d5a3b'];
    var hair = ['#1d1a1a', '#2b211c', '#3a2a20', '#121212'];
    var jerseys = ['#ff7a59', '#3b5bdb', '#ffc542', '#14c6b4', '#a99bff', '#ffffff'];
    names.forEach(function (n, i) {
      var sk = skins[i % skins.length], hr = hair[i % hair.length], js = jerseys[(i * 5) % jerseys.length];
      var longHair = i % 2 === 1;
      var d = document.createElement('div'); d.className = 'kid';
      d.innerHTML = '<svg viewBox="0 0 60 80" aria-hidden="true">' +
        (longHair ? '<path d="M14 30c0-14 7-22 16-22s16 8 16 22v14H14z" fill="' + hr + '"/>' : '') +
        '<path d="M8 80c0-16 9-26 22-26s22 10 22 26z" fill="' + js + '"/>' +
        '<path d="M24 54h12v5a6 6 0 0 1-12 0z" fill="' + sk + '"/>' +
        '<circle cx="30" cy="32" r="15" fill="' + sk + '"/>' +
        '<path d="M15 30c0-10 6-16 15-16s15 6 15 16c-4-5-9-7-15-7s-11 2-15 7z" fill="' + hr + '"/>' +
        '<circle cx="24.5" cy="34" r="1.8" fill="#222"/><circle cx="35.5" cy="34" r="1.8" fill="#222"/>' +
        '<path d="M25 40c2.5 2.4 7.5 2.4 10 0" stroke="#7a3b2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
        '<text x="30" y="72" text-anchor="middle" font-size="9" font-weight="800" fill="' + (js === '#ffffff' ? '#121735' : '#fff') + '" font-family="Barlow,sans-serif">' + (i + 7) + '</text></svg>' +
        '<span class="box"></span><span class="tag">' + n + ' ✓</span>';
      kidsEl.appendChild(d);
    });
    var snap = document.getElementById('snap'), busy = false;
    snap.addEventListener('click', function () {
      if (busy) return; busy = true;
      var kids = kidsEl.querySelectorAll('.kid'), cnt = document.getElementById('faceCount'), st = document.getElementById('faceStatus');
      kids.forEach(function (k) { k.classList.remove('found'); });
      cnt.textContent = '0'; st.className = 'demo-status'; st.textContent = 'Recognising faces…';
      var fl = document.getElementById('flash'), sc = document.getElementById('scan');
      fl.classList.remove('go'); sc.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); sc.classList.add('go');
      var t0 = performance.now(), order = Array.prototype.slice.call(kids);
      order.forEach(function (k, i) {
        var row = window.innerWidth <= 620 ? Math.floor(i / 4) : Math.floor(i / 6);
        setTimeout(function () {
          k.classList.add('found'); cnt.textContent = String(+cnt.textContent + 1);
          cnt.parentNode.classList.remove('pop'); void cnt.offsetWidth; cnt.parentNode.classList.add('pop');
          if (+cnt.textContent === kids.length) {
            st.className = 'demo-status good';
            st.textContent = '✓ All 12 marked present in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' seconds';
            snap.textContent = '↻ Try again'; busy = false;
          }
        }, 450 + row * 650 + (i % 6) * 90);
      });
    });
  }

  // 2) Coach check-in: drag the pin; inside 150 m = checked in
  var map = document.getElementById('map'), coach = document.getElementById('coach');
  var R = 0, cx = 0, cy = 0, px = 0, py = 0, placed = false;
  function placeMap() {
    if (!map || !map.offsetWidth) return;
    var w = map.offsetWidth, h = map.offsetHeight;
    cx = w * .5; cy = h * .58; R = Math.min(w, h) * .26;
    var z = document.getElementById('zone');
    z.style.left = cx + 'px'; z.style.top = cy + 'px'; z.style.width = z.style.height = (R * 2) + 'px';
    var c = document.getElementById('centre'); c.style.left = cx + 'px'; c.style.top = cy + 'px';
    if (!placed) { px = w * .14; py = h * .3; placed = true; }
    px = Math.min(Math.max(px, 10), w - 10); py = Math.min(Math.max(py, 30), h - 4);
    moveCoach(px, py);
  }
  function metres() { return Math.round(Math.hypot(px - cx, py - cy) / R * 150); }
  function moveCoach(x, y) {
    px = x; py = y; coach.style.left = x + 'px'; coach.style.top = y + 'px';
    var m = metres(), d = document.getElementById('dist');
    d.innerHTML = m + ' m<small>from City Sports Centre</small>';
    d.style.color = m <= 150 ? '#0b6f66' : '#121735';
  }
  if (map) {
    var dragging = false;
    var at = function (e) { var r = map.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    map.addEventListener('pointerdown', function (e) {
      var p = at(e); dragging = true; map.setPointerCapture(e.pointerId);
      var w = map.offsetWidth, h = map.offsetHeight;
      moveCoach(Math.min(Math.max(p[0], 10), w - 10), Math.min(Math.max(p[1], 30), h - 4));
    });
    map.addEventListener('pointermove', function (e) {
      if (!dragging) return; var p = at(e), w = map.offsetWidth, h = map.offsetHeight;
      moveCoach(Math.min(Math.max(p[0], 10), w - 10), Math.min(Math.max(p[1], 30), h - 4));
    });
    map.addEventListener('pointerup', function () { dragging = false; });
    window.addEventListener('resize', placeMap);
    placeMap();
    document.getElementById('checkinBtn').addEventListener('click', function () {
      var m = metres(), st = document.getElementById('checkStatus');
      var now = new Date(), t = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
      st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop');
      if (m <= 150) { st.className = 'demo-status good pop'; st.textContent = '✓ Face verified · Checked in at ' + t + ' · On time'; }
      else { st.className = 'demo-status bad pop'; st.textContent = '✕ ' + m + ' m away. Move within 150 m of the centre to check in.'; }
    });
  }

  // 3) Time-saved calculator + the plan that fits
  var ids = ['cStudents', 'cBatches', 'cCoaches', 'cCentres'];
  var PLANS = [
    { name: 'Rising', s: 25, c: 5, ce: 2, price: 999 },
    { name: 'Champion', s: 85, c: 15, ce: 3, price: 2499 },
    { name: 'Legend', s: 250, c: Infinity, ce: 10, price: 4249 },
    { name: 'Royals', s: Infinity, c: Infinity, ce: Infinity, price: 6049 }
  ];
  function calc() {
    var v = ids.map(function (id) { var el = document.getElementById(id); return el ? +el.value : 0; });
    if (!document.getElementById('cStudents')) return;
    ids.forEach(function (id, i) {
      var el = document.getElementById(id);
      el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
      document.getElementById('v' + id.slice(1)).textContent = v[i];
    });
    var st = v[0], ba = v[1], co = v[2], ce = v[3];
    // register 5 min → 30 s per session; fees 4 min + parent updates 2 min per student a month; salary sheet 45 min per coach a month
    var h = ba * 4.33 * 4.5 / 60 + st * 6 / 60 + co * 45 / 60;
    var hr = Math.round(h);
    var el = document.getElementById('hours'), from = +el.textContent || 0, k = 0;
    clearInterval(calc.t);
    calc.t = setInterval(function () { k++; el.textContent = Math.round(from + (hr - from) * k / 12); if (k >= 12) clearInterval(calc.t); }, 25);
    document.getElementById('hoursSub').textContent = 'That’s about ' + Math.max(1, Math.round(hr / 4.33)) + ' hours every week, back on court.';
    var p = PLANS.filter(function (x) { return st <= x.s && co <= x.c && ce <= x.ce; })[0];
    document.getElementById('planName').textContent = p.name;
    document.getElementById('planPrice').textContent = '₹' + p.price.toLocaleString('en-IN') + '/month';
  }
  ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener('input', calc); });
  calc();

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
