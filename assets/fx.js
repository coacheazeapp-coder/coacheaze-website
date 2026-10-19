// Sport pages: a live field with players, a different mini-game per sport, and the roll-call photo scene.
// The arcade games are drawn on canvas (no libraries), with a photo-like finish. window.SPORT.key picks the sport.
(function () {
  var S = window.SPORT || {}, KEY = S.key || 'badminton';
  var PI = Math.PI, TAU = PI * 2;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var FONT = '"Barlow Condensed", "Barlow", system-ui, sans-serif';
  function shade(hex, p) {
    var n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(function (x) { return Math.round(clamp(p < 0 ? x * (1 + p) : x + (255 - x) * p, 0, 255)); });
    return 'rgb(' + c.join(',') + ')';
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(ctx, s, x, y, size, col, o) {
    o = o || {}; ctx.font = (o.w || 800) + ' ' + size + 'px ' + FONT; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.stroke; ctx.strokeStyle = o.sc || 'rgba(10,15,44,.9)'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }

  // ── Photo-like finish: turf/court grain, sunlight from above, lens vignette ──
  var GRAIN = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), d = g.createImageData(128, 128);
    for (var i = 0; i < d.data.length; i += 4) { var v = 128 + (Math.random() - .5) * 255 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); return c;
  })();
  var grainPat = null;
  function grain(ctx) { return grainPat || (grainPat = ctx.createPattern(GRAIN, 'repeat')); }
  function finish(ctx, W, H) {
    ctx.save();
    var lg = ctx.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, 'rgba(255,240,205,.12)'); lg.addColorStop(.45, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.14)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    var rg = ctx.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .38, W / 2, H * .55, Math.max(W, H) * .78);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.34)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .07; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = grain(ctx); ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── Stage: sizes the canvas, runs the loop only while on screen ─────
  function stage(cv, W, H, frame) {
    var ctx = cv.getContext('2d'), st = { W: W, H: H, scale: 1, ui: 1, dpr: 1, vis: true };
    function size() {
      var w = cv.clientWidth || W; st.dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.scale = w / W; st.ui = clamp(.78 / st.scale, 1, 2.1);
      cv.width = Math.round(w * st.dpr); cv.height = Math.round(w * H / W * st.dpr);
    }
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(cv); else window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { st.vis = e[0].isIntersecting; }).observe(cv);
    var last = performance.now(), t = 0;
    (function loop(now) {
      var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (st.vis) { t += dt; ctx.setTransform(st.dpr * st.scale, 0, 0, st.dpr * st.scale, 0, 0); frame(ctx, t, dt, st); finish(ctx, W, H); }
      requestAnimationFrame(loop);
    })(last);
    st.local = function (ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; };
    return st;
  }

  // ── Camera: field coords (u along, v depth 0 far → 1 near, h height) to screen ──
  function cam(top, bot, wt, wb, cx, sk) {
    sk = sk || 0;
    var c = {
      p: function (u, v, h) { var w = wt + (wb - wt) * v; return [cx + (u - .5) * w + (v - 1) * sk, top + (bot - top) * v - (h || 0) * w / wb]; },
      k: function (v) { return (wt + (wb - wt) * v) / wb; }
    };
    return c;
  }
  function sub(c, u0, u1, v0, v1) {
    return { p: function (u, v, h) { return c.p(u0 + u * (u1 - u0), v0 + v * (v1 - v0), h); }, k: function (v) { return c.k(v0 + v * (v1 - v0)); } };
  }
  function poly(ctx, c, pts, fill) {
    ctx.beginPath(); pts.forEach(function (q, i) { var p = c.p(q[0], q[1], q[2]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function Lines(ctx, c) {
    return {
      seg: function (u1, v1, u2, v2) { var a = c.p(u1, v1), b = c.p(u2, v2); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); },
      box: function (u1, v1, u2, v2) { this.seg(u1, v1, u2, v1); this.seg(u2, v1, u2, v2); this.seg(u2, v2, u1, v2); this.seg(u1, v2, u1, v1); },
      ell: function (uc, vc, ru, rv, a0, a1) {
        for (var i = 0; i <= 48; i++) { var a = a0 + (a1 - a0) * i / 48, p = c.p(uc + Math.cos(a) * ru, vc + Math.sin(a) * rv); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      }
    };
  }

  // ── Arena backdrop: sky or hall, floodlights, a crowd that cheers ───
  var CROWD = ['#ff7a59', '#ffc542', '#14c6b4', '#7cc6fe', '#a99bff', '#ffffff', '#ef4444', '#22c55e', '#f472b6', '#fde047'];
  var excite = 0;
  function makeCrowd(W, top, bottom) {
    var a = [];
    for (var r = 0; r < 4; r++) {
      var y = top + (bottom - top) * (r + .55) / 4, n = Math.round(W / (10 - r));
      for (var i = 0; i < n; i++) a.push({ x: (i + Math.random() * .7) * W / n, y: y, r: 3 + r * .55, c: CROWD[Math.random() * CROWD.length | 0], p: Math.random() * TAU, j: Math.random() < .14 });
    }
    return a;
  }
  function backdrop(ctx, W, hz, t, indoor, crowd) {
    var g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, indoor ? '#141a40' : '#0c1442'); g.addColorStop(1, indoor ? '#283372' : '#2f56a8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 2);
    [.12, .5, .88].forEach(function (fx, i) {
      if (indoor === false && i === 1) return;
      var x = W * fx, y = indoor ? 10 : 26, gl = ctx.createRadialGradient(x, y, 2, x, y, 150);
      gl.addColorStop(0, 'rgba(255,250,225,.95)'); gl.addColorStop(.12, 'rgba(255,245,205,.4)'); gl.addColorStop(1, 'rgba(255,245,205,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - 150, y - 150, 300, 300);
      if (!indoor) { ctx.fillStyle = '#e8ecf6'; rr(ctx, x - 16, y - 8, 32, 14, 3); ctx.fill(); ctx.fillStyle = '#5b6694'; ctx.fillRect(x - 1.5, y + 6, 3, hz - 80 - y); }
      else { ctx.fillStyle = '#fffbe6'; rr(ctx, x - 22, y - 4, 44, 6, 3); ctx.fill(); }
    });
    var top = hz - 82; ctx.fillStyle = indoor ? '#1f2858' : '#18214d'; ctx.fillRect(0, top, W, 82);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; for (var r = 0; r < 4; r++) ctx.fillRect(0, top + r * 17 + 14, W, 2);
    var amp = 1 + excite * 5;
    crowd.forEach(function (c) {
      var b = Math.sin(t * (c.j ? 8 : 2.2) + c.p) * (c.j ? 2.5 : .8) * amp, y = c.y - Math.abs(b) * (excite > 0 ? 1 : 0) + (excite > 0 ? 0 : b);
      ctx.fillStyle = c.c; ctx.fillRect(c.x - c.r, y + c.r * .5, c.r * 2, c.r * 1.6);
      ctx.fillStyle = '#e8b48a'; ctx.beginPath(); ctx.arc(c.x, y, c.r * .8, 0, TAU); ctx.fill();
      if (excite > .2 && c.j) { ctx.strokeStyle = '#e8b48a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(c.x - c.r, y + c.r); ctx.lineTo(c.x - c.r * 1.6, y - c.r * 1.6); ctx.moveTo(c.x + c.r, y + c.r); ctx.lineTo(c.x + c.r * 1.6, y - c.r * 1.6); ctx.stroke(); }
    });
    ctx.fillStyle = '#0a0f2c'; ctx.fillRect(0, hz - 15, W, 15);
    var ads = ['CoachEaze', (S.academy || 'Academy').toUpperCase(), 'ONE PHOTO · ALL MARKED', 'CoachEaze'];
    for (var i = 0; i < 5; i++) {
      var x = ((i * 220 - t * 26) % 1100 + 1100) % 1100 - 120;
      txt(ctx, ads[i % ads.length], x, hz - 3.5, 11.5, i % 2 ? '#7cc6fe' : '#00ff88', { align: 'center' });
    }
  }

  // ── Fields ──────────────────────────────────────────────────────────
  var FIELDS = {
    badminton: { out: '#2a4f8f', fill: '#1f8a5b', indoor: true, net: 66, netLo: .5, lines: function (L) { L.box(0, 0, 1, 1); L.seg(0, .08, 1, .08); L.seg(0, .92, 1, .92); L.seg(.38, 0, .38, 1); L.seg(.62, 0, .62, 1); L.seg(.05, 0, .05, 1); L.seg(.95, 0, .95, 1); L.seg(0, .5, .38, .5); L.seg(.62, .5, 1, .5); } },
    tennis: { out: '#2b5b98', fill: '#3878c6', indoor: false, net: 38, netLo: 0, lines: function (L) { L.box(0, 0, 1, 1); L.seg(0, .12, 1, .12); L.seg(0, .88, 1, .88); L.seg(.27, .12, .27, .88); L.seg(.73, .12, .73, .88); L.seg(.27, .5, .73, .5); L.seg(0, .5, .015, .5); L.seg(.985, .5, 1, .5); } },
    volleyball: { out: '#2b5fa8', fill: '#e8913f', indoor: true, net: 104, netLo: .64, lines: function (L) { L.box(0, 0, 1, 1); L.seg(.33, 0, .33, 1); L.seg(.67, 0, .67, 1); L.seg(.5, 0, .5, 1); } },
    kabaddi: { out: '#b83a35', fill: '#e9a23b', indoor: true, lines: function (L) { L.box(0, 0, 1, 1); L.seg(.3, 0, .3, 1); L.seg(.7, 0, .7, 1); L.seg(.22, 0, .22, 1); L.seg(.78, 0, .78, 1); L.seg(0, .07, 1, .07); L.seg(0, .93, 1, .93); L.seg(.5, 0, .5, 1); L.seg(.5, 0, .5, 1); } },
    football: { out: '#27803f', fill: '#2e9a4f', stripe: '#35a957', indoor: false, goals: 40, lines: function (L) { L.box(0, 0, 1, 1); L.seg(.5, 0, .5, 1); L.ell(.5, .5, .08, .17, 0, TAU); L.box(0, .22, .15, .78); L.box(.85, .22, 1, .78); L.box(0, .37, .05, .63); L.box(.95, .37, 1, .63); } },
    hockey: { out: '#1a4c84', fill: '#1f72bd', stripe: '#2479c6', indoor: false, goals: 34, lines: function (L) { L.box(0, 0, 1, 1); L.seg(.5, 0, .5, 1); L.seg(.25, 0, .25, 1); L.seg(.75, 0, .75, 1); L.ell(0, .5, .15, .4, -PI / 2, PI / 2); L.ell(1, .5, .15, .4, PI / 2, PI * 1.5); } },
    cricket: { out: '#26763b', fill: '#37a052', stripe: '#3eaa5a', indoor: false, lines: function (L) { L.ell(.5, .5, .52, .56, 0, TAU); } },
    swimming: { out: '#d5e6ef', fill: '#1ea2dc', indoor: true }
  };
  function field(ctx, c, key, t, o) {
    var F = FIELDS[key]; o = o || {};
    if (!o.noOut) poly(ctx, c, [[-.1, -.1], [1.1, -.1], [1.1, 1.14], [-.1, 1.14]], F.out);
    if (key === 'cricket') {
      ctx.beginPath(); Lines(ctx, c).ell(.5, .5, .55, .6, 0, TAU); ctx.fillStyle = F.fill; ctx.fill();
    } else poly(ctx, c, [[0, 0], [1, 0], [1, 1], [0, 1]], F.fill);
    if (F.stripe) {
      var off = o.scroll || 0;
      for (var i = -1; i < 12; i++) {
        var u0 = i * .1 - (off % .2), u1 = u0 + .1; if (((i % 2) + 2) % 2) continue;
        u0 = clamp(u0, 0, 1); u1 = clamp(u1, 0, 1); if (u1 <= u0) continue;
        if (key === 'cricket') { ctx.save(); ctx.beginPath(); Lines(ctx, c).ell(.5, .5, .55, .6, 0, TAU); ctx.clip(); poly(ctx, c, [[u0, -.1], [u1, -.1], [u1, 1.1], [u0, 1.1]], F.stripe); ctx.restore(); }
        else poly(ctx, c, [[u0, 0], [u1, 0], [u1, 1], [u0, 1]], F.stripe);
      }
    }
    if (key === 'swimming') { pool(ctx, c, t, o.lanes || 6); return; }
    // Depth + surface: the far end recedes into haze, the near end is lit; a
    // fine grain makes grass/court read as a real surface.
    var a0 = c.p(.5, 0), a1 = c.p(.5, 1), dg = ctx.createLinearGradient(0, a0[1], 0, a1[1]);
    dg.addColorStop(0, 'rgba(10,20,40,.26)'); dg.addColorStop(.55, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(255,255,230,.07)');
    ctx.save(); ctx.beginPath();
    if (key === 'cricket') Lines(ctx, c).ell(.5, .5, .55, .6, 0, TAU);
    else [[-.1, -.1], [1.1, -.1], [1.1, 1.14], [-.1, 1.14]].forEach(function (q, i) { var pp = c.p(q[0], q[1]); i ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1]); });
    ctx.closePath(); ctx.fillStyle = dg; ctx.fill();
    ctx.globalAlpha = F.indoor ? .05 : .09; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = grain(ctx); ctx.fill();
    ctx.restore();
    if (key === 'cricket') {
      poly(ctx, c, [[.2, .43], [.8, .43], [.8, .57], [.2, .57]], '#d6b97f');
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2; ctx.beginPath(); var Lc = Lines(ctx, c); Lc.seg(.26, .43, .26, .57); Lc.seg(.74, .43, .74, .57); Lc.seg(.2, .45, .26, .45); Lc.seg(.2, .55, .26, .55); Lc.seg(.74, .45, .8, .45); Lc.seg(.74, .55, .8, .55); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([6, 6]); ctx.beginPath(); Lc.ell(.5, .5, .3, .36, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); Lc.ell(.5, .5, .52, .56, 0, TAU); ctx.stroke();
      return;
    }
    if (o.plain) {
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2.2; ctx.beginPath(); var Lp = Lines(ctx, c); Lp.seg(-.1, 0, 1.1, 0); Lp.seg(-.1, 1, 1.1, 1);
      for (var d = 0; d < 8; d++) { var du = d * .16 - ((o.scroll || 0) % .16); Lp.seg(du, .5, du + .04, .5); }
      ctx.stroke(); return;
    }
    ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = 2.2; ctx.beginPath(); F.lines(Lines(ctx, c)); ctx.stroke();
    if (key === 'kabaddi') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); Lines(ctx, c).seg(.5, 0, .5, 1); ctx.stroke(); }
  }
  function pool(ctx, c, t, n) {
    var L = Lines(ctx, c), i;
    for (i = 0; i < 14; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (.1 + .06 * Math.sin(t * 1.5 + i)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (var j = 0; j <= 30; j++) { var u = j / 30, v = (i + .5) / 14 + Math.sin(u * 14 + t * 2 + i) * .008, p = c.p(u, v); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    for (i = 1; i < n; i++) {
      var v = i / n;
      for (var k = 0; k < 40; k++) { ctx.strokeStyle = k % 2 ? '#ffffff' : '#ef4444'; ctx.beginPath(); L.seg(k / 40, v, (k + 1) / 40, v); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(10,40,90,.35)'; ctx.lineWidth = 3; ctx.beginPath(); for (i = 0; i < n; i++) { var vm = (i + .5) / n; L.seg(.04, vm, .96, vm); } ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); L.box(0, 0, 1, 1); ctx.stroke();
  }
  function net(ctx, c, u, h, lo, v0, v1) {
    var a = c.p(u, v0), b = c.p(u, v1), at = c.p(u, v0, h), bt = c.p(u, v1, h), al = c.p(u, v0, h * lo), bl = c.p(u, v1, h * lo);
    ctx.strokeStyle = '#d7dbe8'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(at[0], at[1] - 3); ctx.moveTo(b[0], b[1]); ctx.lineTo(bt[0], bt[1] - 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(al[0], al[1]); ctx.lineTo(bl[0], bl[1]); ctx.lineTo(bt[0], bt[1]); ctx.lineTo(at[0], at[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    for (var i = 0; i <= 24; i++) { var q = i / 24, t1 = c.p(u, lerp(v0, v1, q), h), b1 = c.p(u, lerp(v0, v1, q), h * lo); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(b1[0], b1[1]); }
    for (var j = 1; j < 4; j++) { var hh = lerp(h * lo, h, j / 4), p1 = c.p(u, v0, hh), p2 = c.p(u, v1, hh); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); }
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(at[0], at[1]); ctx.lineTo(bt[0], bt[1]); ctx.stroke();
  }
  function goalSide(ctx, c, u, h, dir) {
    var v0 = .43, v1 = .57, d = .035 * dir;
    var P = function (uu, vv, hh) { return c.p(uu, vv, hh); };
    ctx.fillStyle = 'rgba(255,255,255,.14)'; poly(ctx, c, [[u, v0, h], [u + d, v0, h * .7], [u + d, v1, h * .7], [u, v1, h]]); ctx.fill();
    poly(ctx, c, [[u + d, v0, 0], [u + d, v1, 0], [u + d, v1, h * .7], [u + d, v0, h * .7]]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath();
    for (var i = 0; i <= 8; i++) { var vv = lerp(v0, v1, i / 8), a = P(u, vv, h), b = P(u + d, vv, h * .7), g = P(u + d, vv, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(g[0], g[1]); }
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.beginPath(); var g0 = P(u, v0, 0), t0 = P(u, v0, h), t1 = P(u, v1, h), g1 = P(u, v1, 0);
    ctx.moveTo(g0[0], g0[1]); ctx.lineTo(t0[0], t0[1]); ctx.lineTo(t1[0], t1[1]); ctx.lineTo(g1[0], g1[1]); ctx.stroke();
  }
  function stumps(ctx, c, u, v, k, fall) {
    for (var i = -1; i <= 1; i++) {
      var g = c.p(u, v + i * .012), s = c.k(v) * k, a = (fall || 0) * (i * .5 + 1) * .9;
      ctx.save(); ctx.translate(g[0], g[1]); ctx.rotate(a);
      ctx.strokeStyle = '#f3e3b8'; ctx.lineWidth = 2.6 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -21 * s); ctx.stroke(); ctx.restore();
    }
    var tp = c.p(u, v, 21 * c.k(v) * k / c.k(v) * (fall ? 1 : 1)), s2 = c.k(v) * k;
    ctx.strokeStyle = '#c8961e'; ctx.lineWidth = 2 * s2; ctx.beginPath();
    var fl = fall || 0; ctx.moveTo(tp[0] - 4 * s2 + fl * 18, tp[1] - 22 * s2 - fl * 30); ctx.lineTo(tp[0] + 4 * s2 + fl * 26, tp[1] - 22 * s2 - fl * 22); ctx.stroke();
  }

  // ── People ──────────────────────────────────────────────────────────
  var SKIN = ['#f1c9a0', '#e0ac69', '#c68642', '#8d5524', '#b07a50', '#d9a066'];
  var HAIR = ['#1b1b1b', '#2b1a10', '#3b2414', '#111111', '#4a2f1b'];
  var KITS = ['#3b5bdb', '#ff7a59', '#14c6b4', '#ffc542', '#a99bff', '#ef4444', '#22c55e', '#f97316', '#0ea5e9', '#ec4899', '#8b5cf6', '#84cc16'];
  var BASE = { lean: .05, hl: .06, kl: .02, hr: -.06, kr: -.14, al: -.15, el: .15, ar: .15, er: .45 };
  function P(o) { var r = {}, k; for (k in BASE) r[k] = BASE[k]; for (k in o) r[k] = o[k]; return r; }
  function mixP(a, b, t) { var o = {}; for (var k in a) o[k] = lerp(a[k], b[k] == null ? a[k] : b[k], t); return o; }
  function kf(list, x) {
    if (x <= list[0][0]) return list[0][1];
    for (var i = 1; i < list.length; i++) if (x <= list[i][0]) return mixP(list[i - 1][1], list[i][1], ease((x - list[i - 1][0]) / (list[i][0] - list[i - 1][0])));
    return list[list.length - 1][1];
  }
  var POSE = {
    stand: P({}),
    ready: P({ lean: .32, hl: .55, kl: -.25, hr: -.3, kr: -.75, al: .8, el: 1.5, ar: 1.2, er: 2.3 }),
    crouch: P({ lean: .62, hl: .95, kl: -.35, hr: .2, kr: -.75, al: 1.25, el: 1.05, ar: 1.35, er: 1.15 }),
    keeper: P({ lean: .1, hl: .35, kl: -.05, hr: .35, kr: -.05, al: 1.35, el: 2.1, ar: 1.35, er: 2.1 }),
    phone: P({ lean: .02, al: .9, el: 2.1, ar: .9, er: 2.1 }),
    phoneUp: P({ lean: -.05, al: 1.75, el: 2.25, ar: 1.75, er: 2.25 }),
    bat: P({ lean: .38, hl: .25, kl: .05, hr: -.15, kr: -.3, al: .55, el: .05, ar: .55, er: .05 }),
    batUp: P({ lean: .3, hl: .25, kl: .05, hr: -.15, kr: -.3, al: 1.7, el: 3.5, ar: 1.7, er: 3.5 }),
    batHit: P({ lean: .5, hl: .55, kl: .2, hr: -.35, kr: -.5, al: .9, el: 1.1, ar: .9, er: 1.1 }),
    batEnd: P({ lean: .2, hl: .55, kl: .2, hr: -.35, kr: -.5, al: 2.6, el: 3.0, ar: 2.6, er: 3.0 }),
    over0: P({ lean: -.12, hl: .35, kl: .1, hr: -.25, kr: -.45, al: 2.5, el: 2.7, ar: 3.5, er: -.6 }),
    over1: P({ lean: .05, hl: .2, kl: .05, hr: -.2, kr: -.35, al: 1.4, el: 1.2, ar: 2.95, er: 3.05 }),
    over2: P({ lean: .42, hl: .5, kl: -.1, hr: -.35, kr: -.7, al: .2, el: .4, ar: 1.0, er: .45 }),
    fore0: P({ lean: .2, hl: .4, kl: -.1, hr: -.3, kr: -.6, al: 1.2, el: 1.4, ar: -1.2, er: -1.5 }),
    fore1: P({ lean: .3, hl: .45, kl: -.15, hr: -.3, kr: -.65, al: .5, el: .8, ar: .9, er: 1.5 }),
    fore2: P({ lean: .2, hl: .45, kl: -.15, hr: -.3, kr: -.65, al: -.3, el: .1, ar: 2.3, er: 3.0 }),
    bump: P({ lean: .35, hl: .6, kl: -.3, hr: -.25, kr: -.8, al: 1.0, el: 1.05, ar: 1.0, er: 1.05 }),
    set: P({ lean: 0, hl: .35, kl: -.15, hr: -.2, kr: -.55, al: 2.75, el: 3.3, ar: 2.75, er: 3.3 }),
    block: P({ lean: 0, hl: .05, kl: .05, hr: -.05, kr: -.05, al: 3.05, el: 3.1, ar: 3.05, er: 3.1 }),
    stick: P({ lean: .5, hl: .5, kl: -.2, hr: -.3, kr: -.7, al: .95, el: .25, ar: .95, er: .25 }),
    kick0: P({ lean: -.05, hl: .05, kl: 0, hr: -.9, kr: -1.9, al: 1.1, el: 1.2, ar: -.6, er: -.4 }),
    kick1: P({ lean: .1, hl: .05, kl: 0, hr: 1.15, kr: 1.05, al: 1.1, el: 1.4, ar: -.9, er: -.6 })
  };
  function run(ph, lean, arms) {
    var s = Math.sin(ph), o = P({ lean: lean == null ? .28 : lean });
    o.hl = s * .75; o.kl = o.hl - (.35 + Math.max(0, -s) * 1.1); o.hr = -s * .75; o.kr = o.hr - (.35 + Math.max(0, s) * 1.1);
    if (arms !== false) { o.al = -s * .85; o.el = o.al + 1.4; o.ar = s * .85; o.er = o.ar + 1.4; }
    return o;
  }
  var EX = {
    jack: function (ph) { var s = (1 - Math.cos(ph * TAU)) / 2; return { front: 1, lift: Math.sin(ph * TAU * 2) > 0 ? Math.abs(Math.sin(ph * TAU)) * 4 : 0, pose: P({ lean: 0, hl: lerp(.04, .38, s), kl: lerp(.04, .38, s), hr: lerp(.04, .38, s), kr: lerp(.04, .38, s), al: lerp(.3, 2.85, s), el: lerp(.35, 3.0, s), ar: lerp(.3, 2.85, s), er: lerp(.35, 3.0, s) }) }; },
    squat: function (ph) { var s = (1 - Math.cos(ph * TAU)) / 2; return { pose: P({ lean: lerp(.05, .55, s), hl: lerp(.05, 1.35, s), kl: lerp(0, -.6, s), hr: lerp(-.03, 1.3, s), kr: lerp(-.05, -.65, s), al: lerp(.1, 1.55, s), el: lerp(.2, 1.55, s), ar: lerp(.1, 1.55, s), er: lerp(.2, 1.55, s) }) }; },
    stretch: function (ph) { var s = (1 - Math.cos(ph * TAU)) / 2; return { pose: P({ lean: lerp(.1, 1.35, s), hl: -.25, kl: -.25, hr: -.25, kr: -.25, al: lerp(2.9, .15, s), el: lerp(3.0, .05, s), ar: lerp(2.9, .1, s), er: lerp(3.0, 0, s) }) }; },
    knees: function (ph) { var s = Math.sin(ph * TAU), o = P({ lean: -.05 }); o.hl = Math.max(0, s) * 1.5; o.kl = o.hl > .1 ? -.1 : 0; o.hr = Math.max(0, -s) * 1.5; o.kr = o.hr > .1 ? -.1 : 0; o.al = -s * .9; o.el = o.al + 1.6; o.ar = s * .9; o.er = o.ar + 1.6; return { pose: o, lift: Math.abs(s) * 3 }; },
    lunge: function (ph) { var s = (1 - Math.cos(ph * TAU)) / 2; return { pose: P({ lean: .02, hl: lerp(-.2, -.75, s), kl: lerp(-.2, -1.6, s), hr: lerp(.2, 1.1, s), kr: lerp(.2, -.1, s), al: .15, el: 1.9, ar: .15, er: 1.9 }) }; },
    circles: function (ph) { var a = ph * TAU; return { front: 1, pose: P({ lean: 0, hl: .12, kl: .12, hr: .12, kr: .12, al: 1.57 + Math.sin(a) * .3, el: 1.57 + Math.sin(a + .6) * .4, ar: 1.57 + Math.sin(a) * .3, er: 1.57 + Math.sin(a + .6) * .4 }) }; },
    skip: function (ph) { var b = Math.abs(Math.sin(ph * TAU)); return { front: 1, lift: b * 6, rope: ph, pose: P({ lean: 0, hl: .05, kl: .1, hr: .05, kr: .1, al: .5, el: 1.1, ar: .5, er: 1.1 }) }; },
    plank: function (ph) { return { rot: -1.38, pose: P({ lean: 0, hl: 0, kl: 0, hr: 0, kr: 0, al: 1.38 + Math.sin(ph * TAU) * .05, el: 2.9, ar: 1.38, er: 2.9 }) }; }
  };

  function fig(ctx, x, y, k, o) {
    var f = o.face || 1, p = o.pose || POSE.stand, s = k, front = !!o.front;
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    var sh = ctx.createRadialGradient(2 * s, 0, 0, 2 * s, 0, 15 * s); sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(2 * s, 0, 15 * s, 4 * s, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -(o.lift || 0) * s);
    if (o.rot) ctx.rotate(o.rot * f);
    var T = 14 * s, SH = 14 * s, UA = 10.5 * s, FA = 10 * s, TOR = 19 * s;
    var ext = function (a1, a2) { return T * Math.cos(a1) + SH * Math.cos(a2); };
    var hy = o.rot ? -ext(p.hl, p.kl) : -Math.max(ext(p.hl, p.kl), ext(p.hr, p.kr)), hx = 0;
    var dirx = function (side) { return front ? side : f; };
    function limb(jx, jy, a1, a2, l1, l2, side) {
      var d = dirx(side), kx = jx + l1 * Math.sin(a1) * d, ky = jy + l1 * Math.cos(a1);
      return [jx, jy, kx, ky, kx + l2 * Math.sin(a2) * d, ky + l2 * Math.cos(a2)];
    }
    function draw(pts, col, w) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.lineTo(pts[2], pts[3]); ctx.lineTo(pts[4], pts[5]); ctx.stroke(); }
    function part(pts, col, w, frac) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.lineTo(lerp(pts[0], pts[2], frac), lerp(pts[1], pts[3], frac)); ctx.stroke(); }
    var sx = hx + TOR * Math.sin(p.lean) * (front ? 0 : f), sy = hy - TOR * Math.cos(p.lean);
    var lo = front ? 4.2 * s : 0, ao = front ? 7.5 * s : 0;
    var Ll = limb(hx - lo, hy, p.hl, p.kl, T, SH, -1), Rl = limb(hx + lo, hy, p.hr, p.kr, T, SH, 1);
    var La = limb(sx - ao, sy + 2 * s, p.al, p.el, UA, FA, -1), Ra = limb(sx + ao, sy + 2 * s, p.ar, p.er, UA, FA, 1);
    var skin = o.skin || SKIN[1], dsk = shade(skin, -.2), kit = o.kit || '#3b5bdb', dkit = shade(kit, -.25), shorts = o.shorts || '#1d2547', shoe = '#26304f';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // back leg + arm
    draw(Ll, front ? skin : dsk, 5.4 * s); part(Ll, shorts, 8 * s, .45);
    ctx.fillStyle = shoe; ctx.beginPath(); ctx.arc(Ll[4], Ll[5], 3.3 * s, 0, TAU); ctx.fill();
    if (!front) { draw(La, dsk, 4.6 * s); part(La, dkit, 6.4 * s, .4); }
    // torso
    ctx.strokeStyle = kit; ctx.lineWidth = (front ? 15 : 12.5) * s; ctx.beginPath(); ctx.moveTo(hx, hy - 3 * s); ctx.lineTo(sx, sy + 3 * s); ctx.stroke();
    ctx.strokeStyle = shorts; ctx.lineWidth = (front ? 14 : 11) * s; ctx.beginPath(); ctx.moveTo(hx, hy - 1 * s); ctx.lineTo(hx, hy + 1.5 * s); ctx.stroke();
    if (o.num && !front) txt(ctx, o.num, lerp(hx, sx, .55) - 0 * f, lerp(hy, sy, .55) + 3 * s, 8 * s, 'rgba(255,255,255,.9)', { align: 'center' });
    // front leg
    draw(Rl, skin, 5.4 * s); part(Rl, shorts, 8 * s, .45);
    ctx.fillStyle = shoe; ctx.beginPath(); ctx.arc(Rl[4], Rl[5], 3.3 * s, 0, TAU); ctx.fill();
    if (front) { draw(La, skin, 4.6 * s); part(La, kit, 6.4 * s, .4); }
    // head
    var hcx = sx + 8.5 * s * Math.sin(p.lean) * (front ? 0 : f), hcy = sy - 8.5 * s * Math.cos(p.lean), hr = 7 * s;
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hcx, hcy, hr, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(hcx, hcy); if (!front) ctx.scale(f, 1);
    ctx.fillStyle = o.cap || o.hair || HAIR[0]; ctx.beginPath();
    if (front && o.back) ctx.arc(0, 0, hr * 1.04, 0, TAU);
    else if (front) ctx.arc(0, 0, hr * 1.05, PI * 1.02, PI * 1.98);
    else ctx.arc(0, 0, hr * 1.05, PI * .7, PI * 1.92);
    ctx.closePath(); ctx.fill();
    if (o.long) { ctx.beginPath(); ctx.ellipse(-hr * .9, hr * .5, hr * .45, hr * .9, .3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#1a1a2e';
    if (!(front && o.back)) { if (front) { ctx.beginPath(); ctx.arc(-2.6 * s, .6 * s, 1.1 * s, 0, TAU); ctx.arc(2.6 * s, .6 * s, 1.1 * s, 0, TAU); ctx.fill(); } else { ctx.beginPath(); ctx.arc(4 * s, .2 * s, 1.15 * s, 0, TAU); ctx.fill(); } }
    ctx.restore();
    // front arm + item
    draw(Ra, skin, 4.6 * s); part(Ra, kit, 6.4 * s, .4);
    if (o.item) item(ctx, o.item, Ra[4], Ra[5], (p.er + (o.ia || 0)), front ? 1 : f, s);
    if (o.phone) {
      var hx2 = (La[4] + Ra[4]) / 2, hy2 = (La[5] + Ra[5]) / 2;
      ctx.save(); ctx.translate(hx2, hy2 - 2 * s); ctx.fillStyle = '#0d1230'; rr(ctx, -4.5 * s, -8 * s, 9 * s, 15 * s, 2 * s); ctx.fill();
      ctx.fillStyle = o.phone > 1 ? '#ffffff' : '#7cc6fe'; rr(ctx, -3.4 * s, -6.8 * s, 6.8 * s, 12 * s, 1.4 * s); ctx.fill(); ctx.restore();
      o.phoneAt = [hx2, hy2];
    }
    if (o.rope != null) {
      var yc = Math.cos(o.rope * TAU) * 40 * s - 18 * s;
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(La[4], La[5]); ctx.quadraticCurveTo(0, hy + yc + 20 * s + (o.lift || 0) * s, Ra[4], Ra[5]); ctx.stroke();
    }
    ctx.restore();
    return { x: x, y: y - (o.lift || 0) * s, top: y + hcy - hr - (o.lift || 0) * s };
  }
  function item(ctx, kind, x, y, a, f, s) {
    var dx = Math.sin(a) * f, dy = Math.cos(a);
    ctx.save(); ctx.lineCap = 'round';
    if (kind === 'racquet' || kind === 'racquet2') {
      var big = kind === 'racquet2', hl = 6 * s, sl = big ? 6 * s : 9 * s, cx = x + dx * (hl + sl + (big ? 8 : 7) * s), cy = y + dy * (hl + sl + (big ? 8 : 7) * s);
      ctx.strokeStyle = '#2b2f45'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(x - dx * 2 * s, y - dy * 2 * s); ctx.lineTo(x + dx * hl, y + dy * hl); ctx.stroke();
      ctx.strokeStyle = '#d6d9e4'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.lineTo(x + dx * hl, y + dy * hl); ctx.lineTo(x + dx * (hl + sl), y + dy * (hl + sl)); ctx.stroke();
      ctx.translate(cx, cy); ctx.rotate(Math.atan2(dy, dx) - PI / 2);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.strokeStyle = big ? '#facc15' : '#ef4444'; ctx.lineWidth = 1.8 * s;
      ctx.beginPath(); ctx.ellipse(0, 0, (big ? 6.5 : 5.2) * s, (big ? 8.5 : 7) * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (kind === 'bat') {
      ctx.strokeStyle = '#2b2f45'; ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(x - dx * 2 * s, y - dy * 2 * s); ctx.lineTo(x + dx * 7 * s, y + dy * 7 * s); ctx.stroke();
      ctx.strokeStyle = '#ead6a6'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(x + dx * 8 * s, y + dy * 8 * s); ctx.lineTo(x + dx * 29 * s, y + dy * 29 * s); ctx.stroke();
    } else if (kind === 'stick') {
      var ex = x + dx * 27 * s, ey = y + dy * 27 * s;
      ctx.strokeStyle = '#1d1d2b'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(x - dx * 3 * s, y - dy * 3 * s); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3.2 * s; ctx.beginPath(); ctx.moveTo(ex - dx * 3 * s, ey - dy * 3 * s); ctx.lineTo(ex, ey); ctx.quadraticCurveTo(ex + f * 5 * s, ey + 1 * s, ex + f * 6 * s, ey - 3 * s); ctx.stroke();
    }
    ctx.restore();
  }
  function swimmer(ctx, c, u, v, k, o) {
    var p = c.p(u, v), s = c.k(v) * k, d = o.dir || 1, ph = o.ph || 0;
    ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(d, 1); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-26 * s, 0, 18 * s, 3.4 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(8,40,90,.4)'; ctx.beginPath(); ctx.ellipse(-10 * s, 1 * s, 17 * s, 4.4 * s, 0, 0, TAU); ctx.fill();
    for (var j = 0; j < 4; j++) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(-27 * s - j * 3.5 * s, -Math.abs(Math.sin(ph * 9 + j)) * 3 * s, (2.2 - j * .35) * s, 0, TAU); ctx.fill(); }
    for (var a = 0; a < 2; a++) {
      var ang = ph * 5 + a * PI, ax = Math.cos(ang) * 13 * s, ay = -Math.sin(ang) * 9 * s;
      if (ay > 2 * s) continue;
      ctx.strokeStyle = o.skin || SKIN[1]; ctx.lineWidth = 3.6 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -1 * s); ctx.lineTo(ax, ay - 1 * s); ctx.stroke();
      if (ay > -2 * s) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(ax, 0, 2.6 * s, 0, TAU); ctx.fill(); }
    }
    ctx.fillStyle = o.skin || SKIN[1]; ctx.beginPath(); ctx.arc(6 * s, -2.5 * s, 5.4 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = o.cap || '#ef4444'; ctx.beginPath(); ctx.arc(6 * s, -2.5 * s, 5.7 * s, PI * .95, PI * 2.05); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d1230'; ctx.fillRect(7.5 * s, -3.2 * s, 4 * s, 1.8 * s);
    ctx.restore();
    return { x: p[0], y: p[1] + 4 * s, top: p[1] - 12 * s };
  }
  function drawBall(ctx, c, b, kind, k) {
    var g = c.p(b.u, b.v), p = c.p(b.u, b.v, b.h), s = c.k(b.v) * (k || 1.3);
    ctx.fillStyle = 'rgba(0,0,0,' + (.28 * (1 - clamp(b.h / 260, 0, .8))) + ')'; ctx.beginPath(); ctx.ellipse(g[0], g[1], 5 * s, 1.8 * s, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(p[0], p[1]);
    if (kind === 'shuttle') {
      ctx.rotate(Math.atan2(b.vy || 0, b.vx || 1));
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(1 * s, -1.6 * s); ctx.lineTo(-7 * s, -4.2 * s); ctx.lineTo(-7 * s, 4.2 * s); ctx.lineTo(1 * s, 1.6 * s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(30,40,80,.35)'; ctx.lineWidth = .8; ctx.stroke();
      ctx.fillStyle = '#f5d48a'; ctx.beginPath(); ctx.arc(2 * s, 0, 2.3 * s, 0, TAU); ctx.fill();
    } else {
      var R = { tennis: 3.4, cricket: 3.2, football: 5.2, hockey: 3, volleyball: 5.6 }[kind] * s, col = { tennis: '#d9f441', cricket: '#c0262d', football: '#ffffff', hockey: '#ffffff', volleyball: '#ffffff' }[kind];
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.lineWidth = .9 * s;
      if (kind === 'tennis') { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(-R * .9, 0, R * .8, -.9, .9); ctx.stroke(); }
      if (kind === 'cricket') { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.moveTo(-R * .2, -R); ctx.lineTo(R * .2, R); ctx.stroke(); }
      if (kind === 'football') { ctx.fillStyle = '#1d2547'; ctx.beginPath(); ctx.arc(0, 0, R * .32, 0, TAU); ctx.fill(); for (var i = 0; i < 5; i++) { var a = i * TAU / 5 + (b.spin || 0); ctx.beginPath(); ctx.arc(Math.cos(a) * R * .78, Math.sin(a) * R * .78, R * .2, 0, TAU); ctx.fill(); } }
      if (kind === 'volleyball') { ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(-R * .6, -R * .3, R * .9, -.8, .9); ctx.stroke(); ctx.strokeStyle = '#facc15'; ctx.beginPath(); ctx.arc(R * .6, R * .2, R * .9, 2.2, 4); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(10,15,44,.35)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    return p;
  }

  // ── HUD ─────────────────────────────────────────────────────────────
  var msg = { s: '', t: 0, d: 1, col: '#fff', sub: '' };
  function say(s, col, sub, d) { msg = { s: s, col: col || '#ffffff', sub: sub || '', t: d || 1.4, d: d || 1.4 }; }
  function hud(ctx, st, t, G, playing) {
    var u = st.ui, W = st.W, H = st.H, fs = 15 * u;
    var left = G.title, right = G.score();
    ctx.font = '800 ' + fs + 'px ' + FONT; var w1 = ctx.measureText(left).width + 22 * u;
    ctx.fillStyle = 'rgba(10,15,44,.82)'; rr(ctx, 10, 10, w1, fs + 14 * u, 9 * u); ctx.fill();
    txt(ctx, left, 10 + 11 * u, 10 + fs + 3.5 * u, fs, '#ffffff');
    ctx.font = '800 ' + fs + 'px ' + FONT; var w2 = ctx.measureText(right).width + 22 * u;
    ctx.fillStyle = 'rgba(10,15,44,.82)'; rr(ctx, W - 10 - w2, 10, w2, fs + 14 * u, 9 * u); ctx.fill();
    txt(ctx, right, W - 10 - w2 / 2, 10 + fs + 3.5 * u, fs, S.s2 || '#00ff88', { align: 'center' });
    var h = playing ? G.hint : '👆 Tap to play';
    ctx.font = '800 ' + (13.5 * u) + 'px ' + FONT; var w3 = ctx.measureText(h).width + 26 * u, pulse = playing ? 1 : 1 + Math.sin(t * 5) * .04;
    ctx.save(); ctx.translate(W / 2, H - 14 - 12 * u); ctx.scale(pulse, pulse);
    ctx.fillStyle = playing ? 'rgba(255,255,255,.92)' : '#ffc542'; rr(ctx, -w3 / 2, -12 * u, w3, 24 * u, 12 * u); ctx.fill();
    txt(ctx, h, 0, 0, 13.5 * u, '#0a0f2c', { align: 'center', base: 'middle' }); ctx.restore();
    if (msg.t > 0) {
      var age = msg.d - msg.t, sc = age < .18 ? .5 + age / .18 * .6 : age < .3 ? 1.1 - (age - .18) / .12 * .1 : 1, a = clamp(msg.t / .3, 0, 1), bu = Math.min(u, 1.5);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * .4); ctx.scale(sc, sc); ctx.rotate(-.04);
      txt(ctx, msg.s, 0, 0, 58 * bu, msg.col, { align: 'center', base: 'middle', stroke: 9 * bu, w: 800 });
      if (msg.sub) txt(ctx, msg.sub, 0, 40 * bu, 20 * bu, '#ffffff', { align: 'center', base: 'middle', stroke: 6 * bu });
      ctx.restore();
    }
  }

  // ── Mini-games (one per sport) ──────────────────────────────────────
  var GAMES = {};
  var SC = 1.3;
  function sortV(list) { return list.slice().sort(function (a, b) { return a.v - b.v; }); }

  // Badminton: keep the rally going
  GAMES.badminton = function () {
    var c = cam(212, 470, 560, 790, 445, 110);
    var A = { u: .18, v: .55, tu: .18, tv: .55, sw: 1, ph: 0, kit: '#3b5bdb', skin: SKIN[2], hair: HAIR[0], face: 1 },
        B = { u: .82, v: .45, tu: .82, tv: .45, sw: 1, ph: 0, kit: '#ff7a59', skin: SKIN[1], hair: HAIR[1], face: -1, long: 1 };
    var sh, rally = 0, best = 0, wait = 0, cool = 0;
    function shot(from, u0, v0, h0) {
      var Q = from ? A : B, tu = from ? rnd(.08, .3) : rnd(.7, .92), tv = rnd(.18, .82);
      sh = { from: from, u0: u0, v0: v0, h0: h0, u1: tu, v1: tv, t: 0, d: Math.max(.55, 1.25 - rally * .035), pk: rnd(80, 160), done: false, u: u0, v: v0, h: h0 };
      Q.tu = tu + (from ? -.05 : .05); Q.tv = tv;
    }
    function hit(Pl, side) { Pl.sw = 0; rally++; best = Math.max(best, rally); if (rally % 10 === 0) { say(rally + ' shots!', '#ffc542'); excite = 1; } shot(side, sh.u, sh.v, sh.h); }
    var G = {
      title: '🏸 Keep the rally going', hint: '👆 Tap when the shuttle reaches the blue player', hz: 205, indoor: true,
      score: function () { return 'Rally ' + rally + ' · Best ' + best; },
      reset: function () { rally = 0; wait = 0; shot(1, B.u, B.v, 80); say('Your turn!', '#00ff88'); },
      ai: function () { if (sh && !sh.done && sh.from === 1 && sh.t > .84) hit(A, 0); },
      tap: function () {
        if (cool > 0) return; A.sw = 0;
        if (sh && !sh.done && sh.from === 1 && sh.t > .66) hit(A, 0); else cool = .3;
      },
      step: function (dt) {
        cool -= dt;
        [A, B].forEach(function (Pl) { Pl.u += (Pl.tu - Pl.u) * Math.min(1, dt * 3.4); Pl.v += (Pl.tv - Pl.v) * Math.min(1, dt * 3.4); Pl.ph += dt * 13; Pl.sw = Math.min(1, Pl.sw + dt / .3); Pl.moving = Math.abs(Pl.tu - Pl.u) + Math.abs(Pl.tv - Pl.v) > .02; });
        if (!sh) { shot(1, B.u, B.v, 80); }
        if (wait > 0) { wait -= dt; if (wait <= 0) shot(1, B.u, B.v, 80); return; }
        if (!sh.done) {
          var pu = sh.u, ph = sh.h;
          sh.t += dt / sh.d; var tt = Math.min(1, sh.t);
          sh.u = lerp(sh.u0, sh.u1, tt); sh.v = lerp(sh.v0, sh.v1, tt); sh.h = lerp(sh.h0, 0, tt) + sh.pk * 4 * tt * (1 - tt);
          var a = c.p(pu, sh.v, ph), b = c.p(sh.u, sh.v, sh.h); sh.vx = b[0] - a[0]; sh.vy = b[1] - a[1];
          if (sh.from === 0 && sh.t > .86) hit(B, 1);
          else if (sh.t >= 1) { sh.done = true; say(rally ? 'Out! ' + rally + ' shot rally' : 'Missed!', '#ff7a59'); rally = 0; wait = 1.3; }
        }
      },
      draw: function (ctx, t) {
        field(ctx, c, 'badminton', t); net(ctx, c, .5, 66, .5, -.02, 1.02);
        sortV([A, B]).forEach(function (Pl) {
          var pose = Pl.sw < 1 ? kf([[0, POSE.over0], [.45, POSE.over1], [1, POSE.over2]], Pl.sw) : Pl.moving ? run(Pl.ph, .25) : POSE.ready;
          if (Pl.sw >= 1 && Pl.moving) { pose.ar = 1.2; pose.er = 2.3; }
          var g = c.p(Pl.u, Pl.v); fig(ctx, g[0], g[1], c.k(Pl.v) * SC, { face: Pl.face, pose: pose, kit: Pl.kit, skin: Pl.skin, hair: Pl.hair, long: Pl.long, item: 'racquet' });
        });
        if (sh) drawBall(ctx, c, sh, 'shuttle');
      }
    };
    return G;
  };

  // Tennis: serve an ace
  GAMES.tennis = function () {
    var c = cam(212, 470, 560, 790, 445, 110), aces = 0, serves = 0, state = 'aim', st0 = 0, au = .6, av = .3, b = null, res = '', rx = { u: 1.02, v: .3 };
    var G = {
      title: '🎾 Serve an ace', hint: '👆 Tap when the target is deep in the box', hz: 205, indoor: false,
      score: function () { return 'Aces ' + aces + ' / ' + serves; },
      reset: function () { aces = 0; serves = 0; state = 'aim'; say('Your serve!', '#00ff88'); },
      ai: function (t) { if (state === 'aim' && au > .64 && au < .7 && Math.random() < .2) G.tap(); },
      tap: function () { if (state !== 'aim') return; state = 'toss'; st0 = 0; b = { tu: au, tv: av }; serves++; },
      step: function (dt, t) {
        st0 += dt;
        if (state === 'aim') { au = .5 + .32 * (.5 + .5 * Math.sin(t * 2.3)); av = .31 + .13 * Math.sin(t * 1.4); rx.u += (1.02 - rx.u) * dt * 2; rx.v += (.3 - rx.v) * dt * 2; }
        if (state === 'toss') { b.u = .02; b.v = .62; b.h = 70 + 95 * Math.sin(Math.min(1, st0 / .45) * PI / 2); if (st0 > .45) { state = 'fly'; st0 = 0; b.u0 = .03; b.h0 = 165; } }
        if (state === 'fly') {
          var q = Math.min(1, st0 / .34); b.u = lerp(b.u0, b.tu, q); b.v = lerp(.62, b.tv, q); b.h = lerp(b.h0, 0, q * q * .3 + q * .7);
          if (q >= 1) {
            var inBox = b.tu <= .73 && b.tv >= .12 && b.tv <= .5;
            if (!inBox) { res = 'fault'; say('Fault!', '#ff7a59', 'Long. Try again'); }
            else if (b.tu >= .62) { res = 'ace'; aces++; excite = 1.2; say('ACE!', '#ffc542', Math.round(rnd(168, 198)) + ' km/h'); }
            else { res = 'in'; say('In, but returned', '#ffffff', 'Aim deeper for an ace'); }
            state = 'after'; st0 = 0; b.bu = b.u; b.bv = b.v;
          }
        }
        if (state === 'after') {
          var r = st0;
          if (res === 'in' && r > .25) { var q2 = Math.min(1, (r - .25) / .6); b.u = lerp(rx.u - .03, -.1, q2); b.v = lerp(rx.v, .7, q2); b.h = 40 + 60 * Math.sin(q2 * PI); }
          else { b.u = b.bu + r * .55; b.h = Math.max(0, 45 * Math.sin(Math.min(1, r / .5) * PI)); }
          if (res === 'in') { rx.u += (b.bu + .12 - rx.u) * dt * 6; rx.v += (b.bv - rx.v) * dt * 6; }
          if (res === 'ace') { rx.v += (b.bv + .12 - rx.v) * dt * 3; }
          if (r > 1.5) { state = 'aim'; b = null; }
        }
      },
      draw: function (ctx, t) {
        field(ctx, c, 'tennis', t); net(ctx, c, .5, 38, 0, -.04, 1.04);
        if (state === 'aim') {
          var g = c.p(au, av), s = c.k(av), pulse = 1 + Math.sin(t * 8) * .12, good = au >= .62 && au <= .73;
          ctx.strokeStyle = good ? '#00ff88' : '#ffc542'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(g[0], g[1], 16 * s * pulse, 6 * s * pulse, 0, 0, TAU); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(g[0], g[1], 5 * s, 2 * s, 0, 0, TAU); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
          ctx.fillStyle = 'rgba(0,255,136,.16)'; poly(ctx, c, [[.62, .12], [.73, .12], [.73, .5], [.62, .5]]); ctx.fill();
        }
        var sp = state === 'toss' ? kf([[0, P({ lean: -.05, al: .4, el: .4, ar: -.6, er: -.4 })], [1, P({ lean: -.18, hl: .3, kl: .1, al: 2.9, el: 3.1, ar: 3.5, er: -.6 })]], st0 / .45)
          : state === 'fly' ? kf([[0, POSE.over0], [.3, POSE.over1], [1, POSE.over2]], Math.min(1, st0 / .3)) : state === 'after' ? POSE.over2 : P({ lean: .05, al: .5, el: .9, ar: .4, er: 1.2 });
        var sg = c.p(-.01, .62), rg = c.p(rx.u, rx.v);
        var rpose = state === 'after' && res === 'in' ? POSE.fore1 : state === 'after' && res === 'ace' ? run(t * 14, .4) : POSE.ready;
        fig(ctx, rg[0], rg[1], c.k(rx.v) * SC, { face: -1, pose: rpose, kit: '#ff7a59', skin: SKIN[0], hair: HAIR[4], item: 'racquet2', long: 1 });
        fig(ctx, sg[0], sg[1], c.k(.62) * SC, { face: 1, pose: sp, kit: '#3b5bdb', skin: SKIN[3], hair: HAIR[0], item: 'racquet2' });
        if (b && b.h != null) drawBall(ctx, c, b, 'tennis');
      }
    };
    return G;
  };

  // Cricket: bat an over
  GAMES.cricket = function () {
    var c = cam(212, 470, 600, 800, 440, 90), runs = 0, ball = 0, state = 'runup', st0 = 0, bw = { u: 1.12 }, b = null, out = 0, swing = 1, res = '', fall = 0, ov = 0;
    function next() { state = 'runup'; st0 = 0; bw.u = 1.12; b = null; swing = 1; fall = 0; }
    var G = {
      title: '🏏 Bat an over', hint: '👆 Tap to swing as the ball reaches the bat', hz: 205, indoor: false,
      score: function () { return 'Runs ' + runs + ' · Ball ' + Math.min(6, ball) + '/6'; },
      reset: function () { runs = 0; ball = 0; next(); say('You\'re batting!', '#00ff88'); },
      ai: function () { if (state === 'ball' && b.u < .285 + rnd(-.02, .02) && swing >= 1) G.tap(); },
      tap: function () {
        if (swing < 1) return; swing = 0;
        if (state !== 'ball') return;
        var d = Math.abs(b.u - .27);
        if (b.u > .33 || b.u < .225) return;
        state = 'hit'; st0 = 0; b.hu = b.u; b.hv = b.v; b.hh = b.h;
        if (d < .018) { res = 6; runs += 6; excite = 1.4; say('SIX!', '#ffc542', 'Into the crowd'); }
        else if (d < .036) { res = 4; runs += 4; excite = .8; say('FOUR!', '#00ff88', 'Raced to the rope'); }
        else { res = Math.random() < .5 ? 1 : 2; runs += res; say(res === 1 ? 'Quick single' : 'Two runs', '#ffffff'); }
      },
      step: function (dt) {
        st0 += dt; swing = Math.min(1, swing + dt / .38); if (fall) fall = Math.min(1, fall + dt * 2.5);
        if (state === 'runup') { bw.u = lerp(1.12, .84, Math.min(1, st0 / 1.1)); if (st0 > 1.1) { state = 'bowl'; st0 = 0; } }
        else if (state === 'bowl') { if (st0 > .3) { state = 'ball'; st0 = 0; ball++; var line = rnd(-.05, .05); b = { u: .79, v: .5, h: 62, line: line, pu: rnd(.4, .52), hs: rnd(10, 26), T: rnd(.62, .8) }; } }
        else if (state === 'ball') {
          var q = st0 / b.T; b.u = lerp(.79, .2, q); b.v = .5 + b.line * q;
          b.h = b.u > b.pu ? lerp(62, 0, (.79 - b.u) / (.79 - b.pu)) : (b.hs * (b.pu - b.u) / (b.pu - .2)) + 10 * Math.sin((b.pu - b.u) / (b.pu - .2) * PI);
          if (b.u <= .205) {
            if (Math.abs(b.line) < .028) { state = 'out'; st0 = 0; fall = .01; say('BOWLED!', '#ff7a59', 'The stumps are flying'); excite = .3; }
            else { state = 'out'; st0 = 0; say('Left alone', '#ffffff', 'Dot ball'); }
          }
        } else if (state === 'hit') {
          var r = st0;
          if (res === 6) { b.u = b.hu + r * .9; b.v = b.hv - r * .25; b.h = b.hh + r * 520 - r * r * 120; }
          else if (res === 4) { b.u = b.hu + r * 1.0; b.v = b.hv - r * .4; b.h = Math.abs(Math.sin(r * 9)) * 12 / (1 + r * 3); }
          else { b.u = b.hu + r * .45; b.v = b.hv + r * .3; b.h = Math.abs(Math.sin(r * 7)) * 18 / (1 + r * 3); }
          if (r > 1.5) after();
        } else if (state === 'out' && st0 > 1.4) after();
      },
      draw: function (ctx, t) {
        field(ctx, c, 'cricket', t);
        stumps(ctx, c, .74, .5, SC, 0);
        var ppl = [
          { u: .1, v: .5, pose: POSE.crouch, face: 1, kit: '#ff7a59', skin: SKIN[2] },
          { u: .14, v: .3, pose: POSE.crouch, face: 1, kit: '#ff7a59', skin: SKIN[4] },
          { u: .58, v: .14, pose: run(t * 3, .1, false), face: -1, kit: '#ff7a59', skin: SKIN[1] },
          { u: .86, v: .38, pose: P({ al: .1, el: .2, ar: .1, er: .2 }), face: -1, kit: '#f8fafc', skin: SKIN[3], shorts: '#1f2937' },
          { u: .62, v: .82, pose: POSE.crouch, face: -1, kit: '#ff7a59', skin: SKIN[5] }
        ];
        var bp = state === 'runup' ? run(st0 * 16, .3) : state === 'bowl' ? kf([[0, P({ lean: -.1, ar: -.6, er: -.6, al: 2.6, el: 2.8 })], [.6, P({ lean: .1, ar: -3.3, er: -3.3, al: 1.0, el: .8 })], [1, P({ lean: .5, hl: .4, kl: 0, hr: -.4, kr: -.6, ar: -5.5, er: -5.5, al: -.3, el: -.1 })]], st0 / .3) : POSE.stand;
        ppl.push({ u: bw.u, v: .45, pose: bp, face: -1, kit: '#ff7a59', skin: SKIN[0], num: '7' });
        var batPose = swing < 1 ? kf([[0, POSE.batUp], [.35, POSE.batHit], [1, POSE.batEnd]], swing) : state === 'ball' ? mixP(POSE.bat, POSE.batUp, clamp((.62 - b.u) / .2, 0, 1)) : POSE.bat;
        ppl.push({ u: .235, v: .54, pose: batPose, face: 1, kit: '#3b5bdb', skin: SKIN[3], item: 'bat', bat: 1 });
        sortV(ppl).forEach(function (q) { var g = c.p(q.u, q.v); fig(ctx, g[0], g[1], c.k(q.v) * SC, q); if (q.bat) stumps(ctx, c, .2, .5, SC, fall); });
        if (b && (state === 'ball' || state === 'hit' || state === 'out')) drawBall(ctx, c, b, 'cricket');
      }
    };
    function after() { if (ball >= 6) { ov++; say('Over: ' + runs + ' runs', '#ffc542', runs >= 20 ? 'Captain material!' : 'Go again'); runs = 0; ball = 0; } next(); }
    return G;
  };

  // Football: penalty shoot-out (camera behind the taker)
  GAMES.football = function () {
    var c = cam(208, 500, 700, 1500, 400), goals = 0, kicks = 0, state = 'aim', st0 = 0, au = .5, ah = 60, b = { u: .5, v: .5, h: 0, spin: 0 }, kp = { u: .5, side: 0, d: 0 }, res = '';
    function reset() { state = 'aim'; st0 = 0; b = { u: .5, v: .5, h: 0, spin: 0 }; kp = { u: .5, side: 0, d: 0 }; }
    var G = {
      title: '⚽ Penalty shoot-out', hint: '👆 Tap to shoot at the target', hz: 200, indoor: false,
      score: function () { return 'Goals ' + goals + ' / ' + kicks; },
      reset: function () { goals = 0; kicks = 0; reset(); say('Step up!', '#00ff88'); },
      ai: function () { if (state === 'aim' && Math.random() < .012) G.tap(); },
      tap: function () { if (state !== 'aim') return; state = 'run'; st0 = 0; b.tu = au; b.th = ah; kicks++; },
      step: function (dt, t) {
        st0 += dt;
        if (state === 'aim') { au = .5 + .135 * Math.sin(t * 1.9); ah = 62 + 52 * Math.sin(t * 2.9 + 1); kp.u = .5 + Math.sin(t * 2.2) * .02; }
        if (state === 'run' && st0 > .32) { state = 'fly'; st0 = 0; var guess = Math.random() < .55 ? Math.sign(b.tu - .5) : [-1, 0, 1][Math.random() * 3 | 0]; kp.side = guess; }
        if (state === 'fly') {
          var q = Math.min(1, st0 / .42); b.u = lerp(.5, b.tu, q); b.v = lerp(.5, 0, q); b.h = lerp(0, b.th, q) + 30 * Math.sin(q * PI) * .4; b.spin += dt * 20;
          kp.d = Math.min(1, st0 / .32); kp.u = .5 + kp.side * .075 * ease(kp.d);
          if (q >= 1) {
            var off = Math.abs(b.tu - .5);
            if (off > .121) { res = 'wide'; say(off < .128 ? 'Off the post!' : 'Wide!', '#ff7a59'); }
            else if (b.th > 112) { res = 'wide'; say('Over the bar!', '#ff7a59'); }
            else if (Math.abs(b.tu - kp.u) < (kp.side ? .055 : .045) && !(off > .095 && b.th > 82)) { res = 'save'; say('Saved!', '#ff7a59', 'The keeper guessed right'); }
            else { res = 'goal'; goals++; excite = 1.4; say('GOAL!', '#ffc542', off > .09 ? 'Top corner!' : 'Back of the net'); }
            state = 'after'; st0 = 0; b.fu = b.u; b.fh = b.h;
          }
        }
        if (state === 'after') {
          if (res === 'goal') { b.v = -.04 * Math.min(1, st0 * 5); b.h = Math.max(0, b.fh - st0 * 160); }
          else if (res === 'save') { b.u = b.fu + (b.fu - .5 || .1) * st0 * 2; b.v = st0 * .3; b.h = Math.max(0, b.fh + 40 * Math.sin(Math.min(1, st0) * PI) - st0 * 60); }
          else { b.v = -st0 * .2; b.h = b.fh + st0 * 40; }
          if (st0 > 1.6) { if (kicks >= 5) { say('You scored ' + goals + ' of 5', '#ffc542', goals >= 4 ? 'Hat-trick hero!' : 'Go again'); goals = 0; kicks = 0; } reset(); }
        }
      },
      draw: function (ctx, t) {
        poly(ctx, c, [[-.4, -.12], [1.4, -.12], [1.4, 1.1], [-.4, 1.1]], '#27803f');
        for (var i = 0; i < 12; i++) if (i % 2) poly(ctx, c, [[-.4, i / 11 - .12], [1.4, i / 11 - .12], [1.4, (i + 1) / 11 - .12], [-.4, (i + 1) / 11 - .12]], '#2f9a4d');
        ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = 2.4; ctx.beginPath(); var L = Lines(ctx, c);
        L.seg(-.4, 0, 1.4, 0); L.box(.32, 0, .68, .2); L.box(.08, 0, .92, .7); L.ell(.5, .47, .2, .3, .55, 2.6); ctx.stroke();
        ctx.fillStyle = '#fff'; var sp = c.p(.5, .5); ctx.beginPath(); ctx.ellipse(sp[0], sp[1], 4, 2, 0, 0, TAU); ctx.fill();
        // goal
        var H = 120, gl = .38, gr = .62, bk = -.07;
        ctx.fillStyle = 'rgba(255,255,255,.1)'; poly(ctx, c, [[gl, bk, 0], [gr, bk, 0], [gr, bk, H * .8], [gl, bk, H * .8]]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath();
        for (var n = 0; n <= 16; n++) { var uu = lerp(gl, gr, n / 16), a1 = c.p(uu, bk, 0), a2 = c.p(uu, bk, H * .8), a3 = c.p(uu, 0, H); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(a3[0], a3[1]); }
        for (var m = 0; m <= 6; m++) { var hh = H * .8 * m / 6, b1 = c.p(gl, bk, hh), b2 = c.p(gr, bk, hh); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); }
        ctx.stroke();
        var kg = c.p(kp.u, .015), ks = c.k(.015) * SC;
        var kpose = kp.side && state !== 'aim' && state !== 'run' ? P({ lean: 0, hl: .5, kl: .4, hr: .2, kr: .1, al: 2.8, el: 3.0, ar: 2.8, er: 3.0 }) : POSE.keeper;
        fig(ctx, kg[0], kg[1], ks, { front: 1, pose: kpose, kit: '#facc15', skin: SKIN[2], rot: kp.side * 1.25 * ease(kp.d || 0), lift: kp.side ? Math.sin((kp.d || 0) * PI) * 14 : 0 });
        if (res === 'goal' && state === 'after') drawBall(ctx, c, b, 'football');
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); var g0 = c.p(gl, 0), g1 = c.p(gl, 0, H), g2 = c.p(gr, 0, H), g3 = c.p(gr, 0); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]); ctx.lineTo(g3[0], g3[1]); ctx.stroke();
        if (state === 'aim') {
          var tp = c.p(au, 0, ah), pul = 1 + Math.sin(t * 9) * .1;
          ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tp[0], tp[1], 11 * pul, 0, TAU); ctx.moveTo(tp[0] - 17, tp[1]); ctx.lineTo(tp[0] + 17, tp[1]); ctx.moveTo(tp[0], tp[1] - 17); ctx.lineTo(tp[0], tp[1] + 17); ctx.stroke();
        }
        if (!(res === 'goal' && state === 'after')) drawBall(ctx, c, b, 'football');
        var shu = state === 'run' ? lerp(.44, .48, st0 / .32) : .44, shv = state === 'run' ? lerp(.66, .56, st0 / .32) : .66;
        var spose = state === 'run' ? run(st0 * 20, .2) : state === 'fly' || state === 'after' ? P({ lean: .1, hl: .1, kl: .1, hr: .55, kr: .3, al: 1.3, el: 1.4, ar: .9, er: 1.0 }) : POSE.stand;
        var sg = c.p(shu, shv); fig(ctx, sg[0], sg[1], c.k(shv) * SC, { front: 1, back: 1, pose: spose, kit: '#3b5bdb', skin: SKIN[2], hair: HAIR[0], num: '10' });
        var ng = c.p(shu, shv); txt(ctx, '10', ng[0], ng[1] - 32 * c.k(shv) * SC, 13 * c.k(shv) * SC, '#ffffff', { align: 'center' });
      }
    };
    return G;
  };

  // Hockey: dribble past the defenders and score
  GAMES.hockey = function () {
    var c = cam(212, 470, 560, 800, 440, 90), lanes = [.28, .5, .72], lane = 1, pv = .5, ds = [], spawn = 1, beaten = 0, best = 0, scroll = 0, state = 'run', st0 = 0, goalU = 1.3;
    function reset() { ds = []; beaten = 0; spawn = .8; state = 'run'; goalU = 1.3; }
    var G = {
      title: '🏑 Dribble past 6', hint: '👆 Tap above or below the player to dodge', hz: 205, indoor: false,
      score: function () { return 'Beaten ' + beaten + ' · Best ' + best; },
      reset: function () { reset(); say('Go, go, go!', '#00ff88'); },
      ai: function () {
        var th = ds.filter(function (d) { return d.l === lane && d.u > .27 && d.u < .55; });
        if (th.length) { var free = [0, 1, 2].filter(function (l) { return !ds.some(function (d) { return d.l === l && d.u > .2 && d.u < .6; }); }); if (free.length) { lane = free.sort(function (a, b) { return Math.abs(a - lane) - Math.abs(b - lane); })[0]; } }
      },
      tap: function (pt) {
        if (state !== 'run') return;
        var py = c.p(.27, pv)[1] - 30;
        if (pt.key === 'ArrowUp' || (pt.key == null && pt.y < py)) lane = Math.max(0, lane - 1); else lane = Math.min(2, lane + 1);
      },
      step: function (dt) {
        st0 += dt; var sp = state === 'run' ? .42 + beaten * .03 : state === 'goal' ? .2 : 0; scroll += dt * sp;
        pv += (lanes[lane] - pv) * Math.min(1, dt * 9);
        if (state === 'run') {
          spawn -= dt;
          if (spawn <= 0 && beaten + ds.length < 6) { var l = Math.random() * 3 | 0; ds.push({ u: 1.12, l: l, v: lanes[l], ph: Math.random() * 6 }); spawn = rnd(.75, 1.15); }
          ds.forEach(function (d) {
            d.u -= dt * (sp + .12); d.ph += dt * 14; d.v += (lanes[d.l] - d.v) * dt * 2;
            if (!d.passed && Math.abs(d.u - .27) < .045 && Math.abs(d.v - pv) < .1) { state = 'tackled'; st0 = 0; say('Tackled!', '#ff7a59', 'Beat ' + beaten + '. Try again'); }
            if (!d.passed && d.u < .22) { d.passed = true; beaten++; best = Math.max(best, beaten); }
          });
          ds = ds.filter(function (d) { return d.u > -.15; });
          if (beaten >= 6 && !ds.some(function (d) { return d.u > .2; })) { state = 'goal'; st0 = 0; }
        } else if (state === 'goal') {
          goalU = lerp(1.3, .98, Math.min(1, st0 / .9));
          if (st0 > 1.0 && !G.shot) { G.shot = 1; excite = 1.4; say('GOAL!', '#ffc542', 'Six beaten and scored'); }
          if (st0 > 2.6) { G.shot = 0; reset(); }
        } else if (state === 'tackled' && st0 > 1.3) reset();
      },
      draw: function (ctx, t) {
        field(ctx, c, 'hockey', t, { plain: 1, scroll: scroll });
        if (state === 'goal') { ctx.save(); goalSide(ctx, c, goalU, 34, 1); ctx.restore(); }
        var list = ds.map(function (d) { return { u: d.u, v: d.v, face: -1, pose: run(d.ph, .45), kit: '#ff7a59', skin: SKIN[(d.l + 1) % 5], item: 'stick', st: 1 }; });
        var ppose = state === 'tackled' ? P({ lean: .2 }) : run(t * 15, .45); ppose.ar = .95; ppose.er = .2; ppose.al = .9; ppose.el = .25;
        list.push({ u: .25, v: pv, face: 1, pose: ppose, kit: '#3b5bdb', skin: SKIN[3], item: 'stick', me: 1 });
        if (state === 'goal') list.push({ u: goalU - .02, v: .5, face: -1, pose: POSE.keeper, kit: '#facc15', skin: SKIN[1] });
        sortV(list).forEach(function (q) {
          var g = c.p(q.u, q.v); fig(ctx, g[0], g[1], c.k(q.v) * SC, q);
          if (q.me) {
            var bu = state === 'goal' && st0 > .7 ? lerp(.31, goalU + .02, Math.min(1, (st0 - .7) / .3)) : .31 + Math.sin(t * 15) * .006;
            drawBall(ctx, c, { u: bu, v: q.v + .01, h: 0 }, 'hockey');
          }
        });
      }
    };
    return G;
  };

  // Swimming: tap race over one length
  GAMES.swimming = function () {
    var c = cam(200, 476, 600, 860, 400), N = 4, sw, state = 'set', st0 = 0, place = 0, timer = 0, best = 0, finish = [];
    function reset() { sw = []; for (var i = 0; i < N; i++) sw.push({ x: 0, sp: 0, ai: rnd(.095, .125), ph: Math.random() * 6, you: i === 1 }); state = 'set'; st0 = 0; place = 0; timer = 0; finish = []; }
    reset();
    var G = {
      title: '🏊 Win the race', hint: '👆👆 Tap fast to swim faster', hz: 196, indoor: true,
      score: function () { return state === 'race' ? (timer.toFixed(1) + ' s') : best ? 'Best ' + best.toFixed(1) + ' s' : 'Lane 2 is you'; },
      reset: function () { reset(); },
      ai: function () { },
      user: false,
      tap: function () { G.user = true; if (state === 'race') { var y = sw[1]; y.sp = Math.min(.22, y.sp + .03); } },
      step: function (dt) {
        st0 += dt;
        if (state === 'set') { if (st0 > 1.6) { state = 'race'; st0 = 0; say('GO!', '#00ff88', '', .7); } return; }
        if (state === 'race' || state === 'done') {
          if (state === 'race') timer += dt;
          sw.forEach(function (s, i) {
            if (s.x >= 1) return;
            var v = s.you && G.user ? s.sp : s.ai * (1 + Math.sin(st0 * 2 + i) * .08);
            if (s.you && G.user) s.sp = Math.max(.02, s.sp - s.sp * 1.3 * dt);
            s.x = Math.min(1, s.x + v * dt); s.ph += dt * (1 + v * 8);
            if (s.x >= 1) { finish.push(i); if (s.you) { place = finish.length; if (G.user) best = best ? Math.min(best, timer) : timer; } }
          });
          if (state === 'race' && place) { state = 'done'; st0 = 0; var w = ['1st! 🥇', '2nd 🥈', '3rd 🥉', '4th'][place - 1]; if (place === 1) excite = 1.4; say(w, place === 1 ? '#ffc542' : '#ffffff', G.user ? timer.toFixed(1) + ' s' : 'Tap to race in lane 2'); }
          if (state === 'done' && st0 > 2.2) reset();
        }
      },
      draw: function (ctx, t) {
        field(ctx, c, 'swimming', t, { lanes: N });
        var lc = sub(c, 0, 1, 0, 1), y = c.p(0, 1.5 / 4)[1];
        ctx.fillStyle = 'rgba(255,197,66,.16)'; poly(ctx, c, [[0, .25], [1, .25], [1, .5], [0, .5]]); ctx.fill();
        for (var i = 0; i < N; i++) { var g = c.p(-.035, (i + .5) / N); txt(ctx, String(i + 1), g[0], g[1] + 6, 18 * c.k((i + .5) / N), i === 1 ? '#ffc542' : '#0a0f2c', { align: 'center' }); }
        var you = c.p(.02, .375); txt(ctx, 'YOU', you[0] + 4, you[1] - 16, 14, '#ffc542', { stroke: 4 });
        if (state === 'set') { var lab = st0 < .8 ? 'Take your marks…' : 'Get set…'; say(lab, '#ffffff', '', .3); }
        ['#ef4444', '#facc15', '#22c55e', '#a855f7'].forEach(function (cap, i) { var s = sw[i]; swimmer(ctx, c, .03 + s.x * .92, (i + .5) / N, 1.75, { ph: s.ph, cap: i === 1 ? '#3b5bdb' : cap, skin: SKIN[i] }); });
        var fl = c.p(.97, 0), fl2 = c.p(.97, 1); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fl[0], fl[1]); ctx.lineTo(fl2[0], fl2[1]); ctx.stroke(); ctx.setLineDash([]);
      }
    };
    return G;
  };

  // Kabaddi: raid, touch defenders, get back
  GAMES.kabaddi = function () {
    var c = cam(212, 470, 560, 790, 445, 110), R, D, state = 'in', st0 = 0, pts = 0, bonus = false;
    function reset() { R = { u: .5, v: .5, ph: 0, dir: 1 }; D = [.2, .4, .6, .8].map(function (v, i) { return { u: .88 + (i % 2) * .02, v: v, hv: v, ph: i, out: false }; }); state = 'in'; st0 = 0; bonus = false; }
    reset();
    function touchable() { return D.filter(function (d) { return !d.out && Math.abs(d.u - R.u) < .1 && Math.abs(d.v - R.v) < .2; }); }
    var G = {
      title: '🤼 Raid and get back', hint: '👆 Tap to touch defenders and run home', hz: 205, indoor: true,
      score: function () { return 'Points ' + pts; },
      reset: function () { pts = 0; reset(); say('Raid!', '#00ff88'); },
      ai: function () { if (state === 'in' && touchable().length >= (st0 > 2 ? 1 : 2)) G.tap(); },
      tap: function () { if (state !== 'in') return; var tt = touchable(); tt.forEach(function (d) { d.out = true; }); R.got = tt.length; state = 'back'; st0 = 0; R.dir = -1; },
      step: function (dt, t) {
        st0 += dt; R.ph += dt * (state === 'back' ? 16 : 8);
        if (state === 'in') {
          R.u = Math.min(.86, R.u + dt * .11); R.v = .5 + Math.sin(t * 1.6) * .22;
          if (R.u > .78) bonus = true;
          D.forEach(function (d) {
            d.ph += dt * 5;
            if (R.u > .68 && !d.out) { d.u += (R.u + .03 - d.u) * dt * .55; d.v += (R.v + (d.hv - .5) * .35 - d.v) * dt * .7; }
            if (!d.out && Math.abs(d.u - R.u) < .035 && Math.abs(d.v - R.v) < .12) { state = 'tackled'; st0 = 0; say('Tackled!', '#ff7a59', 'Tap sooner next time'); }
          });
        } else if (state === 'back') {
          R.u -= dt * .55; R.v += (.5 - R.v) * dt * 2;
          D.forEach(function (d) { if (!d.out) { d.u += (R.u + .02 - d.u) * dt * 1.6; d.v += (R.v - d.v) * dt * 1.2; } });
          if (R.u <= .5) { var got = R.got + (bonus ? 1 : 0); pts += got; state = 'home'; st0 = 0; if (got >= 2) excite = 1.2; say(got ? '+' + got + ' point' + (got > 1 ? 's' : '') + '!' : 'Empty raid', got ? '#ffc542' : '#ffffff', bonus ? 'Bonus line crossed' : ''); }
        } else if ((state === 'home' || state === 'tackled') && st0 > 1.5) reset();
      },
      draw: function (ctx, t) {
        field(ctx, c, 'kabaddi', t);
        var list = D.map(function (d, i) { return { u: d.u, v: d.v, face: -1, pose: d.out ? P({ lean: .1, al: .2, ar: .2 }) : mixP(POSE.crouch, run(d.ph, .62, false), .25), kit: '#ff7a59', skin: SKIN[i + 1], alpha: d.out ? .45 : 1 }; });
        var rpose = state === 'tackled' ? P({ lean: .4 }) : run(R.ph, .5); rpose.ar = 1.45; rpose.er = 1.7; if (state === 'in') { rpose.al = 1.1; rpose.el = 1.5; }
        list.push({ u: R.u, v: R.v, face: R.dir, pose: rpose, kit: '#3b5bdb', skin: SKIN[3], me: 1, rot: state === 'tackled' ? Math.min(1, st0 * 3) * 1.3 : 0 });
        sortV(list).forEach(function (q) {
          var g = c.p(q.u, q.v); fig(ctx, g[0], g[1], c.k(q.v) * SC, q);
          if (q.me && state === 'in') { var s = c.k(q.v); txt(ctx, 'Kabaddi… kabaddi…', g[0] + 10, g[1] - 92 * s, 14 * s * SC / 1.3, '#ffffff', { align: 'center', stroke: 4 }); }
          if (q.alpha < 1) { var s2 = c.k(q.v); txt(ctx, 'OUT', g[0], g[1] - 88 * s2, 13 * s2 * SC / 1.3, '#ffc542', { align: 'center', stroke: 4 }); }
        });
      }
    };
    return G;
  };

  // Volleyball: time the spike
  GAMES.volleyball = function () {
    var c = cam(212, 470, 560, 790, 445, 110), state = 'pass', st0 = 0, b = { u: .05, v: .55, h: 120 }, kills = 0, tries = 0, spk = { u: .18, v: .45, lift: 0 }, res = '', tp = .7, blk = 0, swing = 1;
    function reset() { state = 'pass'; st0 = 0; spk = { u: .18, v: .45, lift: 0 }; blk = 0; swing = 1; res = ''; }
    var G = {
      title: '🏐 Spike it', hint: '👆 Tap at the top of the jump', hz: 205, indoor: true,
      score: function () { return 'Kills ' + kills + ' / ' + tries; },
      reset: function () { kills = 0; tries = 0; reset(); say('Your attack!', '#00ff88'); },
      ai: function () { if (state === 'set' && Math.abs(st0 - tp - rnd(-.05, .05)) < .02) G.tap(); },
      tap: function () {
        swing = 0; if (state !== 'set') return;
        var d = st0 - tp; tries++; state = 'spike'; G.d = d; st0 = 0; b.su = b.u; b.sh = b.h; b.sv = b.v;
        if (Math.abs(d) < .1) { res = 'kill'; kills++; excite = 1.2; say('KILL!', '#ffc542', 'Straight down'); }
        else if (d < 0) { res = 'net'; say('Too early!', '#ff7a59', 'Into the net'); }
        else { res = 'block'; say('Blocked!', '#ff7a59', 'A bit too late'); }
        blk = .01;
      },
      step: function (dt) {
        st0 += dt; swing = Math.min(1, swing + dt / .3); if (blk) blk = Math.min(1, blk + dt * 2.5);
        if (state === 'pass') { var q = Math.min(1, st0 / .8); b.u = lerp(.05, .39, q); b.v = lerp(.7, .56, q); b.h = lerp(120, 78, q) + 90 * Math.sin(q * PI); if (q >= 1) { state = 'set'; st0 = 0; } }
        else if (state === 'set') {
          var x = st0 / tp; b.u = lerp(.39, .445, Math.min(1.4, x)); b.v = lerp(.56, .47, Math.min(1, x)); b.h = 196 - 118 * Math.pow(x - 1, 2);
          spk.u = lerp(.18, .41, Math.min(1, st0 / .55)); spk.v = lerp(.45, .47, Math.min(1, st0 / .55)); spk.lift = Math.max(0, 64 * (1 - Math.pow((st0 - tp) / .42, 2)));
          if (b.h < 0) { state = 'drop'; st0 = 0; tries++; say('Missed it!', '#ff7a59', 'Tap when the ball is at the top'); }
        } else if (state === 'spike') {
          var r = st0; spk.lift = Math.max(0, spk.lift - dt * 160);
          if (res === 'kill') { var q2 = Math.min(1, r / .3); b.u = lerp(b.su, .82, q2); b.v = lerp(b.sv, .62, q2); b.h = lerp(b.sh, 0, q2); if (q2 >= 1) { b.u += (r - .3) * .2; b.h = Math.abs(Math.sin((r - .3) * 8)) * 30 / (1 + (r - .3) * 4); } }
          else if (res === 'net') { var q3 = Math.min(1, r / .3); b.u = lerp(b.su, .495, q3); b.h = lerp(b.sh, 70, q3) - Math.max(0, r - .3) * 200; b.h = Math.max(0, b.h); }
          else { var q4 = Math.min(1, r / .25); b.u = q4 < 1 ? lerp(b.su, .5, q4) : .5 - (r - .25) * .7; b.h = q4 < 1 ? lerp(b.sh, 190, q4) : Math.max(0, 190 + (r - .25) * 120 - Math.pow((r - .25) * 9, 2) * 4); }
          if (r > 1.6) reset();
        } else if (state === 'drop' && st0 > 1.2) reset();
      },
      draw: function (ctx, t) {
        field(ctx, c, 'volleyball', t);
        var ppl = [
          { u: .39, v: .6, face: 1, pose: state === 'pass' ? POSE.set : P({ lean: .05, al: 2.4, el: 2.9, ar: 2.4, er: 2.9 }), kit: '#3b5bdb', skin: SKIN[1], long: 1 },
          { u: .12, v: .78, face: 1, pose: POSE.bump, kit: '#3b5bdb', skin: SKIN[2], long: 1 },
          { u: .82, v: .28, face: -1, pose: POSE.ready, kit: '#ff7a59', skin: SKIN[0], long: 1 },
          { u: .84, v: .74, face: -1, pose: POSE.ready, kit: '#ff7a59', skin: SKIN[4], long: 1 }
        ];
        var bl = Math.sin(blk * PI) * 40;
        ppl.push({ u: .56, v: .38, face: -1, pose: blk ? POSE.block : POSE.ready, lift: bl, kit: '#ff7a59', skin: SKIN[3], long: 1 });
        ppl.push({ u: .56, v: .58, face: -1, pose: blk ? POSE.block : POSE.ready, lift: bl, kit: '#ff7a59', skin: SKIN[2], long: 1 });
        var spose = swing < 1 ? kf([[0, POSE.over0], [.4, POSE.over1], [1, POSE.over2]], swing) : spk.lift > 4 ? POSE.over0 : state === 'set' ? run(st0 * 16, .3) : POSE.ready;
        ppl.push({ u: spk.u, v: spk.v, face: 1, pose: spose, lift: spk.lift, kit: '#3b5bdb', skin: SKIN[3], long: 1, num: '9' });
        var back = sortV(ppl);
        back.filter(function (q) { return q.u > .5; }).forEach(function (q) { var g = c.p(q.u, q.v); fig(ctx, g[0], g[1], c.k(q.v) * SC, q); });
        net(ctx, c, .5, 104, .64, -.03, 1.03);
        back.filter(function (q) { return q.u <= .5; }).forEach(function (q) { var g = c.p(q.u, q.v); fig(ctx, g[0], g[1], c.k(q.v) * SC, q); });
        drawBall(ctx, c, b, 'volleyball');
      }
    };
    return G;
  };

  function runGame(cv) {
    var G = (GAMES[KEY] || GAMES.badminton)(), crowd = null, user = false;
    var st = stage(cv, 800, 500, function (ctx, t, dt, st) {
      if (!crowd) crowd = makeCrowd(800, G.hz - 80, G.hz - 18);
      if (!user) G.ai(t);
      G.step(dt, t);
      excite = Math.max(0, excite - dt * .8); msg.t -= dt;
      ctx.fillStyle = '#0c1442'; ctx.fillRect(0, 0, 800, 500);
      backdrop(ctx, 800, G.hz, t, G.indoor, crowd);
      G.draw(ctx, t, st);
      hud(ctx, st, t, G, user);
    });
    function press(pt) {
      if (!user) { user = true; G.reset(); return; }
      G.tap(pt);
    }
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.focus({ preventScroll: true }); press(st.local(e)); });
    cv.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); press({ x: 400, y: 250, key: e.key }); }
    });
  }

  // ── Roll-call scene: the coach snaps the batch while they train ─────
  var PAIR = {
    badminton: { kind: 'racquet', ball: 'shuttle', net: 66, lo: .5, item: 'racquet', air: 120 },
    tennis: { kind: 'racquet', ball: 'tennis', net: 38, lo: 0, item: 'racquet2', air: 70, fore: 1 },
    volleyball: { kind: 'bump', ball: 'volleyball', net: 104, lo: .64, air: 200 },
    cricket: { kind: 'bat', ball: 'cricket', air: 40 },
    football: { kind: 'kick', ball: 'football', air: 0 },
    hockey: { kind: 'stick', ball: 'hockey', item: 'stick', air: 0 },
    kabaddi: { kind: 'raid' },
    swimming: { kind: 'swim' }
  };
  var EXLIST = ['jack', 'squat', 'skip', 'stretch', 'knees', 'lunge', 'circles', 'plank'];
  function rollScene(cv) {
    var W = 800, H = 470, c = cam(158, 452, 620, 880, 470, 90), court = sub(c, .3, 1.02, -.02, .9), mat = sub(c, -.06, .26, .1, .95);
    var cfg = PAIR[KEY] || PAIR.badminton, names = S.players || [], crowd = null;
    var marks = names.map(function () { return 0; }), shownAt = names.map(function () { return 0; }), boxes = [];
    var snap = { t: -1 }, phoneUp = 0, flash = 0, T = 0;
    var ex = KEY === 'swimming' ? ['jack', 'stretch', 'circles', 'squat', 'lunge', 'knees'] : KEY === 'kabaddi' ? ['squat', 'jack', 'knees', 'lunge', 'stretch', 'plank'] : ['jack', 'skip', 'squat', 'stretch', 'knees', 'lunge'];
    var people = names.map(function (n, i) {
      var o = { name: n, i: i, kit: KITS[i % KITS.length], skin: SKIN[(i * 7) % SKIN.length], hair: HAIR[i % HAIR.length], long: (i % 3 === 1) ? 1 : 0, off: Math.random() };
      if (i < 6) { o.pair = i >> 1; o.side = i & 1; } else { o.ex = ex[i - 6]; }
      return o;
    });
    var exPos = [[.25, .08], [.75, .1], [.2, .45], [.72, .5], [.28, .86], [.78, .9]];
    function draw(ctx, t, dt, st) {
      T = t; phoneUp += ((snap.t >= 0 && snap.t < 3.2 ? 1 : 0) - phoneUp) * Math.min(1, dt * 7); flash = Math.max(0, flash - dt * 2.4);
      if (snap.t >= 0) snap.t += dt;
      if (!crowd) crowd = makeCrowd(W, 150 - 80, 150 - 18);
      ctx.fillStyle = '#0c1442'; ctx.fillRect(0, 0, W, H);
      backdrop(ctx, W, 152, t, FIELDS[KEY].indoor, crowd);
      poly(ctx, c, [[-.2, -.04], [1.2, -.04], [1.2, 1.2], [-.2, 1.2]], FIELDS[KEY].out);
      field(ctx, court, KEY, t, { noOut: 1 });
      poly(ctx, mat, [[0, 0], [1, 0], [1, 1], [0, 1]], KEY === 'swimming' ? '#bcd3df' : 'rgba(10,15,44,.28)');
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); Lines(ctx, mat).box(0, 0, 1, 1); ctx.stroke();
      if (cfg.net) net(ctx, court, .5, cfg.net * .9, cfg.lo, -.02, 1.02);
      if (KEY === 'football' || KEY === 'hockey') goalSide(ctx, court, 1, FIELDS[KEY].goals * .9, 1);
      boxes = [];
      var list = [], balls = [];
      people.forEach(function (o) {
        var q = { o: o, alpha: marks[o.i] === 2 ? .38 : 1 };
        if (o.ex) {
          var pos = exPos[o.i - 6], e = EX[o.ex]((t * (o.ex === 'skip' ? 1.3 : .75) + o.off) % 1);
          q.c = mat; q.u = pos[0]; q.v = pos[1]; q.opt = { face: o.i % 2 ? -1 : 1, front: e.front, pose: e.pose, lift: e.lift, rot: e.rot, rope: e.rope };
        } else if (cfg.kind === 'swim') {
          var lane = (o.i + .5) / 6, sp = .09 + (o.i % 3) * .015, x = ((t * sp + o.off) % 2), dir = x < 1 ? 1 : -1;
          q.c = court; q.u = .05 + (x < 1 ? x : 2 - x) * .9; q.v = lane; q.swim = { dir: dir, ph: t * 1.6 + o.off * 6 };
        } else {
          var pr = o.pair, pv = [.18, .5, .82][pr], period = 1.5 + pr * .12, qn = ((t / period + pr * .37) % 2 + 2) % 2;
          var A = cfg.kind === 'racquet' || cfg.kind === 'bump' ? .2 : cfg.kind === 'raid' ? .4 : .28, B = 1 - A;
          var d = o.side ? ((qn - 1 + 1) % 2) - 1 : ((qn + 1) % 2) - 1, sw = clamp((d + .2) / .4, 0, 1), near = Math.abs(d) < .2;
          q.c = court; q.u = o.side ? B : A; q.v = pv + (o.side ? .04 : -.04); var f = o.side ? -1 : 1, pose;
          if (cfg.kind === 'racquet') pose = near ? (cfg.fore ? kf([[0, POSE.fore0], [.5, POSE.fore1], [1, POSE.fore2]], sw) : kf([[0, POSE.over0], [.5, POSE.over1], [1, POSE.over2]], sw)) : POSE.ready;
          else if (cfg.kind === 'bump') pose = near ? mixP(POSE.ready, POSE.bump, 1 - Math.abs(d) / .2) : POSE.ready;
          else if (cfg.kind === 'kick') pose = near ? kf([[0, POSE.kick0], [.55, POSE.kick1], [1, POSE.stand]], sw) : POSE.stand;
          else if (cfg.kind === 'stick') pose = near ? mixP(POSE.stick, P({ lean: .45, hl: .5, kl: -.2, hr: -.3, kr: -.7, al: .3, el: -.4, ar: .3, er: -.4 }), Math.sin(sw * PI)) : POSE.stick;
          else if (cfg.kind === 'bat') pose = o.side ? (near ? POSE.crouch : POSE.stand) : (near ? kf([[0, POSE.batUp], [.5, POSE.batHit], [1, POSE.batEnd]], sw) : POSE.bat);
          else pose = mixP(POSE.crouch, run(t * 6 + pr, .6, false), .3);
          if (cfg.kind === 'raid') { q.u += Math.sin(t * 1.5 + pr) * .06 * (o.side ? 1 : -1) + Math.sin(t * 1.5 + pr) * .05; }
          q.opt = { face: f, pose: pose, item: cfg.kind === 'bat' && !o.side ? 'bat' : cfg.item, };
          if (cfg.ball && !o.side) {
            var x2 = qn < 1 ? qn : 2 - qn, bu = lerp(A + .03, B - .03, x2), bh = cfg.air ? (cfg.kind === 'bump' ? 80 : 55) + cfg.air * 4 * x2 * (1 - x2) : 0;
            if (cfg.kind === 'bat') { bh = qn < 1 ? lerp(40, 0, Math.min(1, x2 / .6)) + (x2 > .6 ? (x2 - .6) * 50 : 0) : 20 + 60 * Math.sin(x2 * PI); }
            balls.push({ c: court, b: { u: bu, v: pv, h: bh, vx: qn < 1 ? 1 : -1, vy: (qn < 1 ? 1 : -1) * (x2 - .5) * 2, spin: t * 6 } });
          }
        }
        var g = q.c.p(q.u, q.v); q.sy = g[1]; list.push(q);
      });
      list.sort(function (a, b) { return a.sy - b.sy; });
      list.forEach(function (q) {
        var o = q.o, r;
        if (q.swim) r = swimmer(ctx, q.c, q.u, q.v, 1.15, { dir: q.swim.dir, ph: q.swim.ph, cap: o.kit, skin: o.skin, alpha: q.alpha });
        else { var g = q.c.p(q.u, q.v), opt = q.opt; opt.kit = o.kit; opt.skin = o.skin; opt.hair = o.hair; opt.long = o.long; opt.alpha = q.alpha; r = fig(ctx, g[0], g[1], q.c.k(q.v) * 1.15, opt); }
        boxes[o.i] = { x: r.x, y: r.y, top: r.top, k: q.c.k(q.v) };
      });
      balls.forEach(function (bb) { drawBall(ctx, bb.c, bb.b, cfg.ball, 1.15); });
      // the coach
      var cp = mixP(POSE.phone, POSE.phoneUp, phoneUp), co = { face: 1, pose: cp, kit: '#0a0f2c', shorts: '#2b3566', skin: SKIN[2], hair: HAIR[0], phone: flash > .3 ? 2 : 1 };
      var cr = fig(ctx, 74, 462, 1.75, co);
      txt(ctx, 'Coach ' + (S.coach || ''), 112, 458, 13 * st.ui, '#ffffff', { stroke: 4 });
      // viewfinder + flash
      if (snap.t >= 0 && snap.t < .5) {
        var a = Math.min(1, snap.t / .2); ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 4;
        var ix = 150 - 20 * a, iy = 26 - 10 * a, iw = W - 30 - ix, ih = H - 40 - iy, L = 34;
        ctx.beginPath(); ctx.moveTo(ix, iy + L); ctx.lineTo(ix, iy); ctx.lineTo(ix + L, iy); ctx.moveTo(ix + iw - L, iy); ctx.lineTo(ix + iw, iy); ctx.lineTo(ix + iw, iy + L); ctx.moveTo(ix + iw, iy + ih - L); ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix + iw - L, iy + ih); ctx.moveTo(ix + L, iy + ih); ctx.lineTo(ix, iy + ih); ctx.lineTo(ix, iy + ih - L); ctx.stroke();
        txt(ctx, '● Hold still…', ix + 14, iy + 30, 15 * st.ui, '#ff7a59', { stroke: 4 });
      }
      if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash * .85) + ')'; ctx.fillRect(0, 0, W, H); }
      if (co.phoneAt && flash > 0) { var gl = ctx.createRadialGradient(74 + co.phoneAt[0] * 1, 462 + co.phoneAt[1], 2, 74 + co.phoneAt[0], 462 + co.phoneAt[1], 60); gl.addColorStop(0, 'rgba(255,255,255,.95)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 300, 220, 170); }
      // face boxes
      boxes.forEach(function (b, i) {
        if (!marks[i] || !b) return;
        var age = Math.min(1, (t - shownAt[i]) / .25), s = b.k * 1.15, w = 34 * s, top = b.top - 6 * s, h = b.y - top + 4 * s, ok = marks[i] === 1;
        var col = ok ? '#14c6b4' : '#ff7a59', sc = 1.35 - .35 * ease(age);
        ctx.save(); ctx.translate(b.x, top + h / 2); ctx.scale(sc, sc); ctx.globalAlpha = age;
        ctx.strokeStyle = col; ctx.lineWidth = 2.4; if (!ok) ctx.setLineDash([5, 4]); rr(ctx, -w / 2, -h / 2, w, h, 6); ctx.stroke(); ctx.setLineDash([]);
        var fs = clamp(11.5 * st.ui * Math.max(.85, s), 11, 26), lab = ok ? names[i] : names[i] + ' · absent';
        ctx.font = '800 ' + fs + 'px ' + FONT; var tw = ctx.measureText(lab).width + 10;
        ctx.fillStyle = col; rr(ctx, -tw / 2, -h / 2 - fs - 6, tw, fs + 5, 4); ctx.fill();
        txt(ctx, lab, 0, -h / 2 - 4.5, fs, '#0a0f2c', { align: 'center' });
        if (ok) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(w / 2, h / 2, 7.5, 0, TAU); ctx.fill(); txt(ctx, '✓', w / 2, h / 2 + 4.5, 12, '#0a0f2c', { align: 'center' }); }
        ctx.restore();
      });
    }
    var st = stage(cv, W, H, draw);
    cv.addEventListener('pointerdown', function (e) {
      var pt = st.local(e), best = -1, bd = 1e9;
      boxes.forEach(function (b, i) { if (!b) return; var cy = (b.top + b.y) / 2, d = Math.hypot(pt.x - b.x, (pt.y - cy) * .7); if (d < bd && d < 42 * Math.max(.8, b.k)) { bd = d; best = i; } });
      if (best >= 0) { var ch = document.querySelectorAll('#chips .chip')[best]; if (ch) ch.click(); }
      else { var rb = document.getElementById('rollBtn'); if (rb && !marks.some(Boolean)) rb.click(); }
    });
    return {
      snap: function () { snap.t = 0; marks = marks.map(function () { return 0; }); return new Promise(function (r) { setTimeout(function () { flash = 1; r(); }, 420); }); },
      mark: function (i, m) { if (!marks[i] || m !== marks[i]) shownAt[i] = T; marks[i] = m; }
    };
  }

  var g = document.getElementById('game'); if (g) runGame(g);
  var rs = document.getElementById('rollScene'); if (rs) window.CE_ROLL = rollScene(rs);
})();
