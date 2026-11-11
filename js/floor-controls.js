// DXB MUN – floor timer controls on the chair dashboard. What the chair starts here shows live on the committee screen.
(function () {
  if (!document.getElementById('fl-status') || !window.DXBFloor) return;
  var F = DXBFloor, el = DXB.el;
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clocks = { speaker: F.Clock(), caucus: F.Clock(), general: F.Clock() };
  var S = null, pending = null, orderKey = '', modKey = '';
  var wMin, wSec, watcher;

  /* ---------- the minutes / seconds wheels ---------- */
  function makeWheel(root, count, onChange) {
    var inner = root.querySelector('.fl-wheel-in'), STEP = 22, RAD = 150, PX = 40;
    var pos = 0, target = 0, raf = 0, idle = 0, drag = null, last = 0, items = [];
    for (var i = 0; i < count; i++) { var o = el('div', { class: 'fl-wheel-opt', text: ('0' + i).slice(-2) }); inner.appendChild(o); items.push(o); }
    function mod(a) { return ((a % count) + count) % count; }
    function render() {
      items.forEach(function (o, i) {
        var d = mod(i - pos); if (d > count / 2) d -= count;
        if (Math.abs(d) > 4) { o.style.visibility = 'hidden'; return; }
        o.style.visibility = 'visible';
        o.style.transform = 'rotateX(' + (-d * STEP) + 'deg) translateZ(' + RAD + 'px)';
        o.style.opacity = Math.max(0, 1 - Math.abs(d) * 0.2);
        o.classList.toggle('is-selected', Math.abs(d) < 0.5);
      });
    }
    function frame() {
      raf = 0;
      if (reduce) pos = target; else pos += (target - pos) * 0.2;
      var settled = Math.abs(target - pos) < 0.002;
      if (settled) pos = target;
      render();
      var v = mod(Math.round(pos));
      if (v !== last) { last = v; onChange(v); }
      if (!settled) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    root.addEventListener('wheel', function (e) {
      e.preventDefault();
      target += Math.max(-1.5, Math.min(1.5, (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) / 110));
      clearTimeout(idle); idle = setTimeout(function () { target = Math.round(target); kick(); }, 140); kick();
    }, { passive: false });
    root.addEventListener('pointerdown', function (e) { drag = { y: e.clientY, t: target, id: e.pointerId, moved: false }; });
    root.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dy) > 6) { drag.moved = true; try { root.setPointerCapture(drag.id); } catch (x) {} root.classList.add('drag'); }
      if (drag.moved) { target = drag.t - dy / PX; kick(); }
    });
    function end() { if (!drag) return; drag = null; root.classList.remove('drag'); target = Math.round(target); kick(); }
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); target = Math.round(target) + (e.key === 'ArrowDown' ? 1 : -1); kick(); }
    });
    render();
    return { set: function (v) { target = Math.round(pos) + (function () { var d = mod(v - Math.round(pos)); return d > count / 2 ? d - count : d; })(); kick(); } };
  }

  /* ---------- picking a time ---------- */
  var mins = 1, secs = 0;
  function setTime(total) {
    wMin.set(Math.floor(total / 60)); wSec.set(total % 60); mins = Math.floor(total / 60); secs = total % 60; markPreset();
  }
  function markPreset() {
    var d = mins * 60 + secs;
    [].forEach.call(document.querySelectorAll('.fl-preset'), function (b) { var on = +b.dataset.d === d; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
  }
  function openPicker(p) {
    pending = p;
    $('fl-picker').hidden = false;
    $('fl-picker-label').textContent = p.kind === 'general' ? '2 · General timer duration' : p.mode === 'unmoderated_caucus' ? '2 · Total caucus time' : '2 · Time per speech';
    $('fl-total').hidden = !(p.kind === 'fmt' && p.mode === 'moderated_caucus');
    $('fl-confirm').textContent = p.kind === 'general' ? 'Start timer' : 'Start ' + F.NAMES[p.mode];
    setMsg('');
  }
  function closePicker() { pending = null; $('fl-picker').hidden = true; }

  function setMsg(t) { $('fl-msg').textContent = t || ''; }
  function send(url, body, ok) {
    setMsg('');
    return DXB.api('POST', url, body).then(function (r) {
      if (ok) DXB.toast(ok);
      return watcher.reload().then(function () { return r; });
    }).catch(function (e) { setMsg(e.message); return null; });
  }

  function confirmPicker() {
    var d = mins * 60 + secs, p = pending, url, body;
    if (!p) return;
    if (d < 1) { setMsg('Choose a time greater than zero.'); return; }
    if (p.kind === 'general') { url = '/api/floor/general'; body = { action: 'start', duration: d }; }
    else {
      url = '/api/floor/session';
      if (p.mode === 'gsl') body = { mode: 'gsl', duration: d };
      else if (p.mode === 'moderated_caucus') body = { mode: p.mode, duration: d, total: Math.round(+$('fl-total-min').value) * 60 };
      else body = { mode: p.mode, total: d };
    }
    send(url, body, p.kind === 'general' ? 'Timer started' : F.NAMES[p.mode] + ' started').then(function (r) { if (r) closePicker(); });
  }

  /* ---------- drawing the state ---------- */
  function onState(s) {
    S = s; F.syncClocks(s, clocks);
    var ss = s.session, txt = 'No speaking format is active.';
    if (ss) {
      txt = F.NAMES[ss.mode] + ' is active';
      if (ss.mode === 'gsl') txt += ' · ' + F.format(ss.duration) + ' per speech.';
      else if (ss.mode === 'moderated_caucus') txt += ' · ' + F.format(ss.total_duration) + ' total, ' + F.format(ss.duration) + ' per speech.';
      else txt += ' · ' + F.format(ss.total_duration) + ' total.';
      if (s.session_finished) txt = F.NAMES[ss.mode] + ': the caucus time is up.';
    }
    $('fl-status').textContent = txt;
    $('fl-end').hidden = !ss;
    $('fl-stop').hidden = !s.timer;
    drawOrder(); drawModerated();
    tick();
  }

  function drawOrder() {
    var ss = S.session, show = !!(ss && ss.mode === 'gsl');
    $('fl-order').hidden = !show;
    if (!show) return;
    var key = JSON.stringify([S.queue, S.eligible, S.timer && S.timer.user]);
    if (key === orderKey) return;
    orderKey = key;
    var list = $('fl-order-list'), sel = $('fl-add-select');
    list.replaceChildren(); sel.replaceChildren();
    if (!S.queue.length) list.appendChild(el('p', { class: 'empty', text: 'No speakers on the list yet.' }));
    S.queue.forEach(function (q, i) {
      list.appendChild(el('div', { class: 'fl-row' + (S.timer && S.timer.user === q.user ? ' is-now' : '') }, [
        el('span', { class: 'fl-n', text: ('0' + (i + 1)).slice(-2) }),
        el('b', { text: q.country }),
        el('span', { class: 'fl-row-acts' }, [
          el('button', { class: 'btn xs', type: 'button', text: 'Start timer', onclick: function () { send('/api/floor/speaker', { user: q.user }); } }),
          el('button', { class: 'btn ghost xs', type: 'button', 'aria-label': 'Move ' + q.country + ' up', text: '↑', disabled: i === 0 ? true : null, onclick: function () { send('/api/floor/queue', { action: 'move', id: q.id, direction: 'up' }); } }),
          el('button', { class: 'btn ghost xs', type: 'button', 'aria-label': 'Move ' + q.country + ' down', text: '↓', disabled: i === S.queue.length - 1 ? true : null, onclick: function () { send('/api/floor/queue', { action: 'move', id: q.id, direction: 'down' }); } }),
          el('button', { class: 'btn danger xs', type: 'button', text: 'Remove', onclick: function () { send('/api/floor/queue', { action: 'remove', id: q.id }); } })
        ])
      ]));
    });
    S.eligible.forEach(function (d) { sel.appendChild(el('option', { value: d.id, text: d.country })); });
    $('fl-add').disabled = !S.eligible.length; $('fl-add-all').disabled = !S.eligible.length;
    sel.disabled = !S.eligible.length;
  }

  function drawModerated() {
    var ss = S.session, show = !!(ss && ss.mode === 'moderated_caucus' && !S.session_finished);
    $('fl-mod').hidden = !show;
    if (!show) return;
    var key = JSON.stringify(S.delegates);
    if (key === modKey) return;
    modKey = key;
    var sel = $('fl-mod-select'), keep = sel.value;
    sel.replaceChildren();
    S.delegates.forEach(function (d) { sel.appendChild(el('option', { value: d.id, text: d.country })); });
    if (keep) sel.value = keep;
    $('fl-mod-go').disabled = !S.delegates.length;
  }

  // everything that counts down is redrawn four times a second
  function tick() {
    if (!S) return;
    var t = S.timer, ss = S.session, g = S.general_timer, sp = clocks.speaker.get(), gr = clocks.general.get();
    $('fl-now').textContent = t ? t.country + ' · ' + (sp > 0 ? F.format(sp) + ' left' : 'time is up') : 'No active speaker timer.';
    var cl = $('fl-caucus-line');
    cl.hidden = !(ss && ss.total_duration);
    if (!cl.hidden) cl.textContent = clocks.caucus.get() > 0 ? 'Caucus time left: ' + F.format(clocks.caucus.get()) : 'The caucus time is up.';
    $('fl-gen-clock').textContent = g ? F.format(gr) : '--:--';
    $('fl-gen-state').textContent = g ? (g.running && gr > 0 ? 'Running' : gr > 0 ? 'Paused' : 'Time is up') : 'No timer is active.';
    $('fl-gen-pause').hidden = !(g && g.running && gr > 0);
    $('fl-gen-resume').hidden = !(g && !g.running && gr > 0);
    $('fl-gen-reset').hidden = !g;
  }

  /* ---------- wiring ---------- */
  wMin = makeWheel($('fl-min'), 60, function (v) { mins = v; markPreset(); });
  wSec = makeWheel($('fl-sec'), 60, function (v) { secs = v; markPreset(); });
  setTime(60);
  [].forEach.call(document.querySelectorAll('.fl-preset'), function (b) { b.addEventListener('click', function () { setTime(+b.dataset.d); }); });
  [].forEach.call(document.querySelectorAll('[data-fmt]'), function (b) { b.addEventListener('click', function () { openPicker({ kind: 'fmt', mode: b.dataset.fmt }); }); });
  $('fl-gen-setup').addEventListener('click', function () { openPicker({ kind: 'general' }); });
  $('fl-confirm').addEventListener('click', confirmPicker);
  $('fl-cancel').addEventListener('click', closePicker);
  $('fl-end').addEventListener('click', function () { send('/api/floor/session/end', {}, 'Speaking format ended'); });
  $('fl-stop').addEventListener('click', function () { send('/api/floor/speaker/stop', {}); });
  $('fl-gen-pause').addEventListener('click', function () { send('/api/floor/general', { action: 'pause' }); });
  $('fl-gen-resume').addEventListener('click', function () { send('/api/floor/general', { action: 'resume' }); });
  $('fl-gen-reset').addEventListener('click', function () { send('/api/floor/general', { action: 'reset' }); });
  $('fl-add').addEventListener('click', function () { if ($('fl-add-select').value) send('/api/floor/queue', { action: 'add', id: $('fl-add-select').value }); });
  $('fl-add-all').addEventListener('click', function () { send('/api/floor/queue', { action: 'add_all' }).then(function (r) { if (r) DXB.toast(r.added + ' delegate' + (r.added === 1 ? '' : 's') + ' added'); }); });
  $('fl-mod-go').addEventListener('click', function () { if ($('fl-mod-select').value) send('/api/floor/speaker', { user: $('fl-mod-select').value }); });

  watcher = F.watch(onState, 2500);
  setInterval(tick, 250);
})();
