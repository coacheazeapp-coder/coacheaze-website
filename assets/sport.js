// Sport landing pages: roll call, fee day, with/without story, mini calculator.
(function () {
  var S = window.SPORT || {};
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

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
      var scene = window.CE_ROLL;
      rs.className = 's-status'; rs.textContent = '📸 Coach ' + S.coach + ' takes the photo…';
      var t0 = performance.now();
      if (scene) await scene.snap();
      rs.textContent = '🔍 Recognising faces…';
      for (var i = 0; i < all.length; i++) { all[i].classList.add('on'); if (scene) scene.mark(i, 1); await sleep(80); }
      rs.className = 's-status good';
      rs.textContent = '✓ ' + all.length + ' of ' + all.length + ' present in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s. Parents notified. Now tap a player to mark them absent.';
      snap.textContent = '↻ Snap again'; busy = false; marked = true;
    });
    chips.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c || busy) return;
      if (!marked) { rs.className = 's-status warn'; rs.textContent = 'Tap “Snap the batch” first. One photo marks everyone.'; return; }
      c.classList.toggle('off'); c.classList.toggle('on', !c.classList.contains('off'));
      if (window.CE_ROLL) window.CE_ROLL.mark([].indexOf.call(all, c), c.classList.contains('off') ? 2 : 1);
      var k = count(), name = c.textContent.replace('✓', '').slice(1);
      if (c.classList.contains('off')) {
        rs.className = 's-status warn';
        rs.textContent = k.on + ' of ' + all.length + ' present. ' + name + '’s parent gets: “' + name + ' missed today’s ' + S.name.toLowerCase() + ' session.”';
      } else {
        rs.className = 's-status good'; rs.textContent = k.on + ' of ' + all.length + ' present. ' + name + ' marked present again.';
      }
    });
  }

  // Fee Day Rush: parents pay in cash/UPI, coach ticks who paid, one tap marks them all
  var feeList = document.getElementById('feeList'), feeGo = document.getElementById('feeGo');
  if (feeList && feeGo) {
    var FEE = S.fee || 3500, fmt = function (n) { return '₹' + n.toLocaleString('en-IN'); };
    var names = (S.players || []).slice(0, 8), hero = S.player || names[0];
    var state = names.map(function () { return 'due'; });          // due | came | paid
    var ticked = {}, started = false, t0 = 0, timers = [];
    var fs = document.getElementById('feeStatus'), got = document.getElementById('feeGot'),
        due = document.getElementById('feeDue'), bar = document.getElementById('feeBar'),
        pst = document.getElementById('feePst'), pdate = document.getElementById('feeDate');
    var rows = names.map(function (n, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'fee-row';
      b.innerHTML = n + '<small>' + fmt(FEE) + ' due</small>'; b.dataset.i = i; feeList.appendChild(b); return b;
    });
    var totals = function () {
      var paid = state.filter(function (s) { return s === 'paid'; }).length;
      got.textContent = fmt(paid * FEE); due.textContent = fmt((names.length - paid) * FEE);
      bar.style.width = (paid / names.length * 100) + '%';
    };
    var nTicked = function () { return Object.keys(ticked).length; };
    var over = function () { return started && timers.length === 0 && state.indexOf('came') < 0; };
    var label = function () {
      var k = nTicked();
      feeGo.textContent = k ? '✅ Mark ' + k + ' paid' : over() ? '↻ Play again' : (started ? 'Tick who paid ↑' : '▶ Start fee day');
      feeGo.disabled = started && !k && !over();
    };
    var reset = function () {
      state = names.map(function () { return 'due'; }); ticked = {}; started = false;
      rows.forEach(function (r) { r.className = 'fee-row'; r.querySelector('small').textContent = fmt(FEE) + ' due'; });
      pst.textContent = 'Due'; pst.classList.remove('ok'); pdate.textContent = 'Pay at the academy';
      feeGo.classList.remove('used'); say('', names.length + ' parents owe this month\'s fee.'); totals(); label();
    };
    var say = function (cls, txt) { fs.className = 's-status' + (cls ? ' ' + cls : ''); fs.textContent = txt; };
    feeList.addEventListener('click', function (e) {
      var r = e.target.closest('.fee-row'); if (!r) return; var i = +r.dataset.i;
      if (!started) { say('warn', 'Tap “Start fee day” first — then parents start paying.'); return; }
      if (state[i] === 'paid') return;
      if (state[i] === 'due') { say('warn', names[i] + ' hasn’t paid yet. Only tick parents who paid.'); return; }
      if (ticked[i]) { delete ticked[i]; r.classList.remove('tick'); } else { ticked[i] = 1; r.classList.add('tick'); }
      label();
    });
    feeGo.addEventListener('click', function () {
      if (over() && !nTicked()) { reset(); return; }
      if (!started) {
        started = true; t0 = performance.now(); feeGo.classList.add('used'); label();
        say('', '💬 Parents are paying at the desk… tick each one who paid.');
        // 6 of 8 pay, the hero player first so the parent's phone flips.
        var order = [0].concat(names.map(function (_, i) { return i; }).slice(1).sort(function () { return Math.random() - .5; })).slice(0, 6);
        order.forEach(function (i, k) {
          var t = setTimeout(function () {
            timers.splice(timers.indexOf(t), 1);
            if (state[i] !== 'due') return; state[i] = 'came';
            rows[i].classList.add('came');
            rows[i].querySelector('small').textContent = (k % 2 ? 'Cash' : 'UPI') + ' · paid — tick me';
            label();
          }, 500 + k * 900);
          timers.push(t);
        });
        return;
      }
      var idx = Object.keys(ticked).map(Number); if (!idx.length) return;
      idx.forEach(function (i) {
        state[i] = 'paid'; rows[i].classList.remove('tick', 'came'); rows[i].classList.add('paid');
        rows[i].querySelector('small').textContent = 'Paid ✓';
        if (names[i] === hero) {
          pst.textContent = 'Paid ✓'; pst.classList.add('ok');
          var d = new Date(); pdate.textContent = 'Paid on ' + d.getDate() + ' ' + d.toLocaleString('en-IN', { month: 'short' });
        }
      });
      ticked = {}; totals(); label();
      var paid = state.filter(function (s) { return s === 'paid'; }).length, left = names.length - paid,
          waiting = state.filter(function (s) { return s === 'came'; }).length;
      if (waiting) say('good', idx.length + ' marked paid in one tap. ' + waiting + ' more paid — tick them too.');
      else if (left) say('good', '✓ ' + paid + ' of ' + names.length + ' paid in ' + ((performance.now() - t0) / 1000).toFixed(0) + ' s. ' + left + ' still due — they see “Due” in their app, so no awkward calls.');
      else say('good', '🎉 Everyone paid. Revenue is up to date.');
    });
    totals(); label();
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
