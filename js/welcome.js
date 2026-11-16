// DXB MUN welcome show (homepage): a slow, tense build-up in black and white, then the reveal.
// Countdown intervals tighten, a low drone and riser build the tension, and every hit is a hard cut. Beats are synthesised.
(function () {
  if (!window.DXB || !DXB.configured || !DXB.configured()) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = reduce ? 0.4 : 1, base = null, busy = false;

  DXB.poll(function () {
    DXB.api('GET', '/api/welcome').then(function (s) {
      if (base === null) { base = s.seq; return; }
      if (s.seq > base) { base = s.seq; if (!busy) play(); }
    }).catch(function () {});
  }, 2000);

  var ac = null;
  function ctx() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  function beat(level) {
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    g.gain.setValueAtTime(level || 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.36);
  }
  // a low drone that swells under the countdown
  function drone(ms) {
    var a = ctx(); if (!a) return null;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sine'; o.frequency.value = 55;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + ms / 1000 * 0.6);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + ms / 1000 + 0.2);
    return o;
  }
  // a rising riser that builds into the reveal
  function riser(ms) {
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(900, t + ms / 1000);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + ms / 1000 * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000 + 0.05);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + ms / 1000 + 0.1);
  }

  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  function play() {
    busy = true;
    var root = mk('div', 'wz'), grain = mk('canvas', 'wz-grain'), flash = mk('div', 'wz-flash'), streak = mk('div', 'wz-streak');
    var bTop = mk('div', 'wz-bar top'), bBot = mk('div', 'wz-bar bot'), stage = mk('div', 'wz-stage');
    var prog = mk('div', 'wz-prog'), bar = mk('i'), hint = mk('p', 'wz-hint', 'Esc');
    var scan = mk('div', 'wz-scan'), tc = mk('div', 'wz-tc', '00:00:00:00'), live = mk('div', 'wz-live', 'LIVE');
    prog.appendChild(bar);
    [grain, flash, streak, stage, bTop, bBot, scan, mk('div', 'wz-crt'), mk('div', 'wz-roll'), tc, live, prog, hint].forEach(function (n) { root.appendChild(n); });
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add('on', 'power'); });

    var g = grain.getContext('2d'), W = 0, H = 0, frame = 0, alive = true, total = 26000;
    var noise = document.createElement('canvas'); noise.width = noise.height = 128;
    var nctx = noise.getContext('2d'), t0 = performance.now();
    function size() { W = grain.width = root.clientWidth; H = grain.height = root.clientHeight; }
    size(); window.addEventListener('resize', size);
    function grainLoop() {
      if (!alive) return;
      if (frame++ % 2 === 0) {
        var id = nctx.createImageData(128, 128);
        for (var i = 0; i < id.data.length; i += 4) { var v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        nctx.putImageData(id, 0, 0);
      }
      g.clearRect(0, 0, W, H); g.fillStyle = g.createPattern(noise, 'repeat'); g.fillRect(0, 0, W, H);
      bar.style.width = Math.min(100, (performance.now() - t0) / total * 100).toFixed(2) + '%';
      var ms = performance.now() - t0, fr = Math.floor((ms % 1000) / 1000 * 25), sec = Math.floor(ms / 1000);
      tc.textContent = ['00', ('0' + Math.floor(sec / 60)).slice(-2), ('0' + (sec % 60)).slice(-2), ('0' + fr).slice(-2)].join(':');
      requestAnimationFrame(grainLoop);
    }
    requestAnimationFrame(grainLoop);

    function hit() { restart(flash, 'hit'); restart(streak, 'hit'); beat(0.85); }
    function cut(node) { stage.replaceChildren(node); restart(stage, 'push'); }
    function silence() { stage.replaceChildren(); }
    function anim(el, frames, ms, delay) { if (el.animate) el.animate(frames, { duration: Math.max(1, ms * T), delay: (delay || 0) * T, fill: 'both', easing: 'cubic-bezier(.2,.8,.2,1)' }); }

    function num(n) { cut(mk('div', 'wz-num', String(n))); hit(); }
    function track(text) {
      var el = mk('div', 'wz-track', text); cut(el);
      anim(el, [{ letterSpacing: '.8em', opacity: 0, filter: 'blur(14px)' }, { letterSpacing: '.02em', opacity: 1, filter: 'blur(0px)' }], 1800);
      restart(streak, 'hit'); beat(0.5);
    }
    function heartbeat(lines) {
      var wrap = mk('div', 'wz-lines');
      lines.forEach(function (l, i) {
        var s = mk('div', 'wz-line', l); wrap.appendChild(s);
        if (s.animate) s.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 900 * T, delay: i * 900 * T, fill: 'both' });
      });
      cut(wrap);
      beat(0.7); setTimeout(function () { if (alive) beat(0.45); }, 260 * T);
      setTimeout(function () { if (alive) { beat(0.7); } }, 900 * T);
      setTimeout(function () { if (alive) { beat(0.45); } }, 1160 * T);
    }
    function welcome() {
      var el = mk('div', 'wz-welcome', 'WELCOME'); cut(el);
      if (el.animate) el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1200 * T, fill: 'both', easing: 'cubic-bezier(.7,0,.2,1)' });
      hit();
    }
    function final() {
      var el = mk('div', 'wz-final');
      el.appendChild(document.createTextNode('DXB '));
      el.appendChild(mk('span', 'acc', 'MUN'));
      cut(el);
      anim(el, [{ transform: 'scale(1.22)', letterSpacing: '.14em', opacity: 0 }, { transform: 'scale(1)', letterSpacing: '.04em', opacity: 1 }], 2400);
      hit();
    }

    // the build-up: a drone under a dark room, then the countdown speeds up
    drone(7600);
    var steps = [
      [1800, function () { num(5); }], [3400, function () { num(4); }], [4800, function () { num(3); }],
      [6000, function () { num(2); }], [7000, function () { num(1); }],
      [8100, function () { silence(); riser(2100); }],
      [10400, function () { track('DELEGATES'); }],
      [13200, function () { silence(); }],
      [13800, function () { heartbeat(['ARE YOU', 'READY?']); }],
      [16400, function () { silence(); }],
      [16900, function () { welcome(); }],
      [19600, function () { final(); }],
      [24800, function () { root.classList.add('out'); }]
    ];
    steps.forEach(function (s) { setTimeout(function () { if (alive) s[1](); }, s[0] * T); });

    function onKey(e) { if (e.key === 'Escape') finish(); }
    document.addEventListener('keydown', onKey);
    function finish() {
      if (!alive) return;
      alive = false;
      document.removeEventListener('keydown', onKey);
      root.classList.add('off');
      setTimeout(function () { root.classList.remove('on'); }, 560);
      setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); busy = false; }, 1100);
    }
    setTimeout(finish, total * T);
  }
})();