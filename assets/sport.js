// Sport landing pages: rally on the court, roll call, rate a player, with/without story, mini calculator.
(function () {
  var S = window.SPORT || {};
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  // Court: count the rally, tap to speed it up
  var court = document.getElementById('court');
  if (court) {
    var n = 0, sc = court.querySelector('.score b'), ball = court.querySelector('.ball');
    ball.addEventListener('animationiteration', function (e) { if (e.animationName === 'rallyX') { n++; sc.textContent = n; } });
    court.addEventListener('click', function () { court.classList.toggle('fast'); });
  }

  // Roll call: snap the batch, then tap a player to mark them absent
  var chips = document.getElementById('chips'), snap = document.getElementById('rollBtn'), rs = document.getElementById('rollStatus');
  if (chips && snap) {
    (S.players || []).forEach(function (p) {
      var b = document.createElement('button'); b.className = 'chip'; b.type = 'button';
      b.innerHTML = '<span class="av">' + p[0] + '</span>' + p + '<span class="tk">✓</span>';
      chips.appendChild(b);
    });
    var all = chips.querySelectorAll('.chip'), busy = false, marked = false;
    var count = function () {
      var on = chips.querySelectorAll('.chip.on').length, off = chips.querySelectorAll('.chip.off');
      return { on: on, off: off };
    };
    snap.addEventListener('click', async function () {
      if (busy) return; busy = true; snap.classList.add('used');
      all.forEach(function (c) { c.classList.remove('on', 'off'); });
      rs.className = 's-status'; rs.textContent = '📸 Recognising faces…';
      var t0 = performance.now();
      for (var i = 0; i < all.length; i++) { all[i].classList.add('on'); await sleep(110); }
      rs.className = 's-status good';
      rs.textContent = '✓ ' + all.length + ' of ' + all.length + ' present in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s. Parents notified. Now tap a player to mark them absent.';
      snap.textContent = '↻ Snap again'; busy = false; marked = true;
    });
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c || busy) return;
      if (!marked) { rs.className = 's-status warn'; rs.textContent = 'Tap “Snap the batch” first. One photo marks everyone.'; return; }
      c.classList.toggle('off'); c.classList.toggle('on', !c.classList.contains('off'));
      var k = count(), name = c.textContent.replace('✓', '').slice(1);
      if (c.classList.contains('off')) {
        rs.className = 's-status warn';
        rs.textContent = k.on + ' of ' + all.length + ' present. ' + name + '’s parent gets: “' + name + ' missed today’s ' + S.name.toLowerCase() + ' session.”';
      } else {
        rs.className = 's-status good'; rs.textContent = k.on + ' of ' + all.length + ' present. ' + name + ' marked present again.';
      }
    });
  }

  // Rate a player: stars push a live note to the parent's phone
  var skillsEl = document.getElementById('skills'), notes = document.getElementById('notes');
  if (skillsEl && notes) {
    var vals = (S.skills || []).map(function (_, i) { return [3, 2, 4, 3, 2][i % 5]; }), badgeShown = false;
    var avgEl = document.getElementById('avg'), badge = document.getElementById('badge');
    var draw = function () {
      skillsEl.querySelectorAll('.skill').forEach(function (row, i) {
        row.querySelectorAll('button').forEach(function (b, j) { b.classList.toggle('lit', j < vals[i]); });
      });
      var a = vals.reduce(function (x, y) { return x + y; }, 0) / vals.length;
      avgEl.textContent = a.toFixed(1) + ' / 5';
      if (a >= 4 && !badgeShown) { badgeShown = true; badge.classList.add('show'); push('🏅 <b>' + S.player + '</b> unlocked the <b>' + S.badge + '</b> badge!'); }
    };
    var push = function (html) {
      var d = document.createElement('div'); d.className = 'pnote';
      d.innerHTML = html + '<small>CoachEaze · just now</small>';
      notes.insertBefore(d, notes.firstChild);
      while (notes.children.length > 4) notes.removeChild(notes.lastChild);
    };
    (S.skills || []).forEach(function (s, i) {
      var row = document.createElement('div'); row.className = 'skill';
      var st = '<div class="stars">';
      for (var j = 1; j <= 5; j++) st += '<button type="button" aria-label="' + s + ' ' + j + ' of 5" data-i="' + i + '" data-v="' + j + '">★</button>';
      row.innerHTML = '<span>' + s + '</span>' + st + '</div>';
      skillsEl.appendChild(row);
    });
    skillsEl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.dataset.i, v = +b.dataset.v, up = v > vals[i]; vals[i] = v; draw();
      push((up ? '📈 ' : '⭐ ') + S.player + '’s <b>' + S.skills[i] + '</b> rated <b>' + v + '/5</b> by Coach ' + S.coach + '.');
    });
    draw();
  }

  // Story: without / with CoachEaze
  var tl = document.getElementById('timeline');
  if (tl) {
    var meter = document.getElementById('meter'), moodTxt = document.getElementById('moodTxt');
    var show = function (mode) {
      document.querySelectorAll('[data-mode]').forEach(function (t) { t.setAttribute('aria-selected', t.dataset.mode === mode ? 'true' : 'false'); });
      tl.innerHTML = '';
      S.story[mode].forEach(function (m, i) {
        var d = document.createElement('div'); d.className = 'moment'; d.style.animationDelay = (i * .08) + 's';
        d.innerHTML = '<time>' + m[0] + '</time><i>' + m[1] + '</i><p>' + m[2] + '</p>'; tl.appendChild(d);
      });
      var bad = mode === 'without';
      meter.style.width = bad ? '88%' : '18%';
      meter.style.background = bad ? 'linear-gradient(90deg,#ffc542,#ff5f6d)' : 'linear-gradient(90deg,#14c6b4,#10b981)';
      moodTxt.textContent = bad ? 'Coach stress level: through the roof 😩' : 'Coach stress level: chilled 😎';
    };
    document.querySelectorAll('[data-mode]').forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.mode); }); });
    show('without');
  }

  // Mini calculator
  var ms = document.getElementById('mStudents'), mb = document.getElementById('mBatches');
  if (ms && mb) {
    var PLANS = [['Rising', 25, 999], ['Champion', 85, 2499], ['Legend', 250, 4249], ['Royals', 1e9, 6049]];
    var calc = function () {
      [ms, mb].forEach(function (el) { el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%'); });
      var st = +ms.value, ba = +mb.value, co = Math.max(1, Math.round(st / 15));
      document.getElementById('vmS').textContent = st; document.getElementById('vmB').textContent = ba;
      var hr = Math.round(ba * 4.33 * 10 / 60 + st * 12 / 60 + co * 1.5 + 1), val = hr * 500;
      var p = PLANS.filter(function (x) { return st <= x[1]; })[0];
      document.getElementById('mHours').textContent = hr;
      document.getElementById('mVal').textContent = '₹' + val.toLocaleString('en-IN');
      document.getElementById('mPlan').textContent = p[0] + ' (₹' + p[2].toLocaleString('en-IN') + '/month)';
      document.getElementById('mTimes').textContent = Math.max(1, Math.round(val / p[2])) + '×';
    };
    [ms, mb].forEach(function (el) { el.addEventListener('input', calc); });
    calc();
  }
})();
