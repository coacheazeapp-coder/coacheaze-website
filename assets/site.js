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

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
