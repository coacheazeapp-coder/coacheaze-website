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
      t.closest('.try-tabs').classList.add('touched');
      demoTabs.forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
      document.querySelectorAll('.demo').forEach(function (d) { d.classList.toggle('on', d.id === 'demo-' + t.dataset.demo); });
      if (t.dataset.demo === 'checkin') placeMap();
    });
  });

  // 1) Group photo: coach aims, taps Mark attendance, every face ticked
  var shot = document.getElementById('shot');
  if (shot) {
    // face centres in the 1080 x 1140 photo
    var FACES = [
      ['Kabir', 225, 360], ['Aarav', 357, 322], ['Rohan', 500, 310], ['Ishaan', 613, 310], ['Diya', 735, 330], ['Meera', 840, 342], ['Anaya', 925, 378],
      ['Vihaan', 380, 560], ['Arjun', 535, 595], ['Reyansh', 680, 615], ['Saanvi', 800, 580], ['Tara', 925, 610]
    ];
    var facesEl = document.getElementById('faces'), roll = document.getElementById('roll');
    FACES.forEach(function (f) {
      var b = document.createElement('span'); b.className = 'fbox';
      b.style.left = (f[1] / 1080 * 100) + '%'; b.style.top = (f[2] / 1140 * 100) + '%';
      b.innerHTML = '<b>' + f[0] + '</b><em>✓</em>'; facesEl.appendChild(b);
      var r = document.createElement('span'); r.innerHTML = '<i></i>' + f[0]; roll.appendChild(r);
    });
    var snapBtn = document.getElementById('snap'), shooting = false;
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var confetti = function () {
      var c = document.getElementById('confetti'); c.innerHTML = '';
      var cols = ['#14c6b4', '#ff7a59', '#ffc542', '#7cc6fe', '#a99bff', '#ffffff'];
      for (var i = 0; i < 36; i++) {
        var d = document.createElement('i');
        d.style.left = (Math.random() * 100) + '%'; d.style.background = cols[i % cols.length];
        d.style.animationDelay = (Math.random() * .35) + 's';
        d.style.setProperty('--fy', (shot.offsetHeight * (.6 + Math.random() * .5)) + 'px');
        d.style.setProperty('--fr', (Math.random() * 900 - 450) + 'deg');
        c.appendChild(d);
      }
    };
    snapBtn.addEventListener('click', async function () {
      if (shooting) return; shooting = true; snapBtn.classList.add('used');
      var boxes = facesEl.querySelectorAll('.fbox'), names = roll.querySelectorAll('span'), st = document.getElementById('faceStatus');
      shot.classList.remove('done', 'press'); document.getElementById('confetti').innerHTML = '';
      boxes.forEach(function (b) { b.classList.remove('seen', 'ok'); }); names.forEach(function (n) { n.classList.remove('on'); });
      st.className = 'demo-status'; st.textContent = 'Coach points the camera at the team…';
      shot.classList.add('aim'); await sleep(900);
      shot.classList.add('press'); st.textContent = 'Mark attendance ✓';
      await sleep(250);
      var fl = document.getElementById('flash'), sc = document.getElementById('scan');
      fl.classList.remove('go'); sc.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); sc.classList.add('go');
      shot.classList.remove('aim');
      st.textContent = 'Recognising faces…';
      var t0 = performance.now();
      boxes.forEach(function (b, i) { setTimeout(function () { b.classList.add('seen'); }, 150 + i * 70); });
      await sleep(700);
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].classList.add('ok'); names[i].classList.add('on');
        await sleep(120);
      }
      shot.classList.add('done'); confetti();
      st.className = 'demo-status good';
      st.textContent = '✓ All 12 present in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s. Parents get a notification.';
      snapBtn.textContent = '↻ Do it again'; shooting = false;
    });
  }

  // 2) Coach check-in: he runs to where you point, then takes a selfie
  var map = document.getElementById('map'), coach = document.getElementById('coach'), cimg = document.getElementById('coachImg');
  var R = 0, cx = 0, cy = 0, px = 0, py = 0, placed = false, runT = null, tick = null;
  function placeMap() {
    if (!map || !map.offsetWidth) return;
    var w = map.offsetWidth, h = map.offsetHeight;
    cx = w * .5; cy = h * .58; R = Math.min(w, h) * .26;
    var z = document.getElementById('zone');
    z.style.left = cx + 'px'; z.style.top = cy + 'px'; z.style.width = z.style.height = (R * 2) + 'px';
    var c = document.getElementById('centre'); c.style.left = cx + 'px'; c.style.top = cy + 'px';
    if (!placed) { px = w * .14; py = h * .42; placed = true; coach.classList.add('idle'); }
    coach.style.transitionDuration = '0ms'; coach.style.left = px + 'px'; coach.style.top = py + 'px';
    showDist(px, py);
  }
  function metresAt(x, y) { return Math.round(Math.hypot(x - cx, y - cy) / R * 150); }
  function showDist(x, y) {
    var m = metresAt(x, y), d = document.getElementById('dist');
    d.innerHTML = m + ' m<small>from City Sports Centre</small>';
    d.style.color = m <= 150 ? '#0b6f66' : '#121735';
  }
  // Stop beside a café, home, park or the centre pin instead of on top of it: nearest clear spot wins
  function clearOfPlaces(x, y) {
    var mr = map.getBoundingClientRect(), cw = coach.offsetWidth + 4, ch = coach.offsetHeight, w = map.offsetWidth, h = map.offsetHeight;
    var boxes = [].map.call(map.querySelectorAll('.place, .centre, .dist, .hint'), function (el) {
      var r = el.getBoundingClientRect();
      return { l: r.left - mr.left - 6, r: r.right - mr.left + 6, t: r.top - mr.top - 6, b: r.bottom - mr.top + 6 };
    });
    var clear = function (px, py) {
      if (px < cw / 2 || px > w - cw / 2 || py < h * .3 || py > h - 4) return false;
      return boxes.every(function (q) { return !(px + cw / 2 > q.l && px - cw / 2 < q.r && py > q.t && py - ch < q.b); });
    };
    if (clear(x, y)) return [x, y];
    var cands = [];
    boxes.forEach(function (q) {
      cands.push([q.r + cw / 2, y], [q.l - cw / 2, y], [x, q.t - 1], [x, q.b + ch + 1]);
    });
    cands.slice().forEach(function (c) { boxes.forEach(function (q) { cands.push([q.r + cw / 2, c[1]], [q.l - cw / 2, c[1]]); }); });
    // dropped inside the 150 m ring: stay inside it if at all possible
    var inside = metresAt(x, y) <= 150, best = null, bd = Infinity;
    cands.forEach(function (c) {
      var d = Math.hypot(c[0] - x, c[1] - y) + (inside && metresAt(c[0], c[1]) > 150 ? 1e5 : 0);
      if (d < bd && clear(c[0], c[1])) { bd = d; best = c; }
    });
    return best || [x, y];
  }
  function runTo(x, y) {
    if (!map) return;
    var w = map.offsetWidth, h = map.offsetHeight;
    x = Math.min(Math.max(x, 24), w - 24); y = Math.min(Math.max(y, h * .3), h - 6);
    var fit = clearOfPlaces(x, y); x = fit[0]; y = fit[1];
    var cs = getComputedStyle(coach), sx = parseFloat(cs.left), sy = parseFloat(cs.top);
    coach.style.transitionDuration = '0ms'; coach.style.left = sx + 'px'; coach.style.top = sy + 'px';
    var dist = Math.hypot(x - sx, y - sy), ms = Math.min(2400, Math.max(450, dist * 5.5));
    clearTimeout(runT); cancelAnimationFrame(tick);
    cimg.src = 'assets/img/coach-run.png'; coach.classList.remove('selfie', 'idle', 'snapping');
    coach.classList.toggle('left', x < sx); coach.classList.add('running');
    var st = document.getElementById('checkStatus'); st.className = 'demo-status'; st.textContent = '🏃 On his way…';
    var tg = document.getElementById('target'); tg.style.left = x + 'px'; tg.style.top = y + 'px'; tg.classList.add('on');
    void coach.offsetWidth;
    coach.style.transitionDuration = ms + 'ms'; coach.style.left = x + 'px'; coach.style.top = y + 'px';
    var loop = function () { var c2 = getComputedStyle(coach); showDist(parseFloat(c2.left), parseFloat(c2.top)); tick = requestAnimationFrame(loop); };
    loop();
    runT = setTimeout(function () {
      cancelAnimationFrame(tick); px = x; py = y; showDist(x, y); tg.classList.remove('on');
      coach.classList.remove('running', 'left'); cimg.src = 'assets/img/coach-selfie.png'; coach.classList.add('selfie');
      st.textContent = '🤳 Taking a check-in selfie…';
      runT = setTimeout(function () {
        coach.classList.add('snapping');
        var m = metresAt(x, y), t = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
        st.classList.remove('pop'); void st.offsetWidth;
        if (m <= 150) { st.className = 'demo-status good pop'; st.textContent = '✓ Face verified · ' + m + ' m from the centre · Checked in at ' + t + ' · On time'; }
        else { st.className = 'demo-status bad pop'; st.textContent = '✕ Face verified, but he is ' + m + ' m away. Check-in works only within 150 m.'; }
      }, 700);
    }, ms);
  }
  if (map) {
    var dragging = false;
    var at = function (e) { var r = map.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    var tgt = document.getElementById('target');
    map.addEventListener('pointerdown', function (e) {
      dragging = true; map.setPointerCapture(e.pointerId);
      var p = at(e); tgt.style.left = p[0] + 'px'; tgt.style.top = p[1] + 'px'; tgt.classList.add('on'); showDist(p[0], p[1]);
    });
    map.addEventListener('pointermove', function (e) {
      if (!dragging) return; var p = at(e); tgt.style.left = p[0] + 'px'; tgt.style.top = p[1] + 'px'; showDist(p[0], p[1]);
    });
    map.addEventListener('pointerup', function (e) { if (!dragging) return; dragging = false; var p = at(e); runTo(p[0], p[1]); });
    window.addEventListener('resize', placeMap);
    placeMap();
    document.getElementById('checkinBtn').addEventListener('click', function () { this.classList.add('used'); runTo(cx + R * .6, cy + R * .55); });
  }

  // 3) Time-saved calculator + the plan that fits
  var ids = ['cStudents', 'cBatches', 'cCoaches', 'cCentres'];
  var PLANS = [
    { name: 'Rising', s: 25, c: 5, ce: 2, price: 999 },
    { name: 'Champion', s: 85, c: 15, ce: 3, price: 2499 },
    { name: 'Legend', s: 250, c: Infinity, ce: 10, price: 4249 },
    { name: 'Royals', s: Infinity, c: Infinity, ce: Infinity, price: 6049 }
  ];
  function countTo(id, to, pre) {
    var el = document.getElementById(id); if (!el) return;
    var from = +el.dataset.v || 0, k = 0; el.dataset.v = to;
    clearInterval(el._t);
    el._t = setInterval(function () { k++; el.textContent = pre + Math.round(from + (to - from) * k / 14).toLocaleString('en-IN'); if (k >= 14) clearInterval(el._t); }, 25);
  }
  function calc() {
    var v = ids.map(function (id) { var el = document.getElementById(id); return el ? +el.value : 0; });
    if (!document.getElementById('cStudents')) return;
    ids.forEach(function (id, i) {
      var el = document.getElementById(id);
      el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
      document.getElementById('v' + id.slice(1)).textContent = v[i];
    });
    var st = v[0], ba = v[1], co = v[2], ce = v[3];
    // register + chasing absentees 10 min per session; fee reminders, receipts and parent calls 12 min per student a month;
    // attendance, late marks and salary sheet 90 min per coach a month; reports 60 min per centre a month
    var hr = Math.round(ba * 4.33 * 10 / 60 + st * 12 / 60 + co * 1.5 + ce);
    var p = PLANS.filter(function (x) { return st <= x.s && co <= x.c && ce <= x.ce; })[0];
    var val = hr * 500;
    countTo('hours', hr, '');
    countTo('pSessions', Math.round(hr / 1.5), '');
    countTo('pEvenings', Math.max(1, Math.round(hr / 3)), '');
    countTo('pMsgs', st * 4 + co * 8, '');
    countTo('pPages', Math.round(ba * 4.33), '');
    countTo('pValue', val, '₹');
    document.getElementById('pTimes').textContent = Math.max(1, Math.round(val / p.price)) + '×';
    document.getElementById('hoursSub').textContent = 'That’s about ' + Math.max(1, Math.round(hr / 4.33)) + ' hours every week, back on court.';
    document.getElementById('planName').textContent = p.name;
    document.getElementById('planPrice').textContent = '₹' + p.price.toLocaleString('en-IN') + '/month';
  }
  ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener('input', calc); });
  calc();

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
