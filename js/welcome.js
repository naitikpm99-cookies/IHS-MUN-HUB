// DXB MUN welcome show (homepage). The admin presses play; the homepage sees the new press and runs the show once.
// Canvas light and grid, kinetic type, a synthesised beat on every count (no audio files, no licences needed).
(function () {
  if (!window.DXB || !DXB.configured || !DXB.configured()) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var base = null, busy = false, T = reduce ? 0.35 : 1;      // reduced motion: same beats, much calmer
  var C = { black: '#0B0707', maroon: '#7A1425', fire: '#FF5A36', gold: '#F2B705', cream: '#FFF1D0' };

  DXB.poll(function () {
    DXB.api('GET', '/api/welcome').then(function (s) {
      if (base === null) { base = s.seq; return; }
      if (s.seq > base) { base = s.seq; if (!busy) play(); }
    }).catch(function () {});
  }, 2000);

  // ---- sound: a kick on each beat, built from a sine sweep (silent if the browser blocks audio) ----
  var ac = null;
  function kick(level) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      g.gain.setValueAtTime(level || 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.32);
    } catch (e) {}
  }

  function play() {
    busy = true;
    var root = mk('div', 'wz'), cv = mk('canvas', 'wz-canvas'), flash = mk('div', 'wz-flash'),
        stage = mk('div', 'wz-stage'), prog = mk('div', 'wz-prog'), bar = mk('i', ''), hint = mk('p', 'wz-hint');
    hint.textContent = 'Esc to close'; prog.appendChild(bar);
    root.appendChild(cv); root.appendChild(flash); root.appendChild(stage); root.appendChild(prog); root.appendChild(hint);
    document.body.appendChild(root);
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
    function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);

    var scene = { bg: C.black, bgTo: C.black, grid: 0, rays: 0, sweep: -1, ringAt: -1e9, ringRad: 0.22 };
    var dust = []; for (var i = 0; i < 110; i++) dust.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.9, s: Math.random() });
    var t0 = performance.now(), alive = true, total = 13200;

    function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function mix(a, b, k) { var A = hexRGB(a), B = hexRGB(b); return 'rgb(' + A.map(function (v, j) { return Math.round(v + (B[j] - v) * k); }).join(',') + ')'; }

    function draw(now) {
      if (!alive) return;
      var t = now - t0;
      // background colour eases toward its target
      var tgt = hexRGB(scene.bgTo); scene.bgArr = (scene.bgArr || hexRGB(C.black)).map(function (v, j) { return v + (tgt[j] - v) * 0.05; });
      scene.bg = 'rgb(' + scene.bgArr.map(Math.round).join(',') + ')';
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = scene.bg; ctx.fillRect(0, 0, W, H);
      // rays from the centre
      if (scene.rays > 0.01) {
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t / 9000);
        ctx.globalCompositeOperation = 'lighter';
        for (var r = 0; r < 18; r++) {
          ctx.rotate(Math.PI * 2 / 18);
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.lineTo(Math.max(W, H) * 1.2, -Math.max(W, H) * 0.05); ctx.lineTo(Math.max(W, H) * 1.2, Math.max(W, H) * 0.05);
          ctx.closePath(); ctx.fillStyle = 'rgba(242,183,5,' + (0.05 * scene.rays).toFixed(3) + ')'; ctx.fill();
        }
        ctx.restore();
      }
      // swiss grid that draws itself in
      if (scene.grid > 0.01) {
        ctx.strokeStyle = 'rgba(242,183,5,' + (0.12 * scene.grid).toFixed(3) + ')'; ctx.lineWidth = 1;
        for (var gx = 1; gx < 12; gx++) { var x = Math.round(W * gx / 12) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * scene.grid); ctx.stroke(); }
        for (var gy = 1; gy < 8; gy++) { var y = Math.round(H * gy / 8) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * scene.grid, y); ctx.stroke(); }
      }
      // a shockwave ring on each beat
      var rage = (now - scene.ringAt) / 720;
      if (rage >= 0 && rage < 1) {
        ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * (scene.ringRad + rage * 0.9), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,241,208,' + (0.9 * (1 - rage)).toFixed(3) + ')'; ctx.lineWidth = 2 + 10 * (1 - rage); ctx.stroke();
      }
      // one gold light sweeps across for DELEGATES
      if (scene.sweep >= 0 && scene.sweep <= 1) {
        var sx = -W * 0.3 + W * 1.6 * scene.sweep;
        var g = ctx.createLinearGradient(sx - 220, 0, sx + 220, 0);
        g.addColorStop(0, 'rgba(242,183,5,0)'); g.addColorStop(0.5, 'rgba(242,183,5,0.28)'); g.addColorStop(1, 'rgba(242,183,5,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      }
      // drifting embers, always
      ctx.globalCompositeOperation = 'lighter';
      for (var d = 0; d < dust.length; d++) {
        var p = dust[d];
        p.y -= 0.00022 * p.z * (1 + scene.rays); if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        ctx.fillStyle = 'rgba(255,' + (150 + Math.round(90 * p.s)) + ',60,' + (0.12 + 0.25 * p.z).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 0.6 + 2.2 * p.z, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      bar.style.width = Math.min(100, t / total * 100).toFixed(2) + '%';
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // ---- text: each stage swaps in with its own motion, the old one is cleared ----
    var cur = null;
    function anim(el, frames, ms, delay) { if (el.animate) el.animate(frames, { duration: Math.max(1, ms * T), delay: (delay || 0) * T, fill: 'both', easing: 'cubic-bezier(.2,.8,.2,1)' }); }
    function chars(text, cls) {
      var wrap = mk('span', cls);
      text.split('').forEach(function (ch, k) { var s = mk('span', 'wz-ch'); s.textContent = ch === ' ' ? '\u00a0' : ch; s.style.setProperty('--k', k); wrap.appendChild(s); });
      return wrap;
    }
    function setStage(node) {
      if (cur) { var old = cur; cur = null; old.style.transition = 'opacity .15s'; old.style.opacity = '0'; setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 160); }
      cur = node; stage.appendChild(node);
    }
    function count(n) {
      var el = mk('div', 'wz-big', String(n));
      setStage(el);
      anim(el, [{ transform: 'scale(2.6)', opacity: 0, filter: 'blur(14px)' }, { transform: 'scale(.96)', opacity: 1, filter: 'blur(0px)', offset: .55 }, { transform: 'scale(1)', opacity: 1, filter: 'blur(0px)' }], 520);
      flashNow(0.55);
      scene.ringAt = performance.now(); scene.grid = Math.min(1, scene.grid + 0.2); scene.rays = 0;
      kick(0.7);
    }
    function flashNow(a) { anim(flash, [{ opacity: a }, { opacity: 0 }], 260); }

    function word(text, kind) {
      var el = chars(text, 'wz-word wz-' + kind);
      setStage(el);
      var list = el.querySelectorAll('.wz-ch');
      for (var k = 0; k < list.length; k++) {
        var side = k % 2 ? 1 : -1;
        list[k].animate([{ transform: 'translateX(' + side * 70 + 'vw) skewX(' + side * -18 + 'deg)', opacity: 0, filter: 'blur(10px)' }, { transform: 'none', opacity: 1, filter: 'blur(0px)' }],
          { duration: 760 * T, delay: k * 42 * T, fill: 'both', easing: 'cubic-bezier(.16,.9,.2,1)' });
      }
    }
    function lines(parts) {
      var el = mk('div', 'wz-word wz-lines');
      parts.forEach(function (p, i) {
        var row = mk('span', 'wz-line'); var inner = mk('span', 'wz-in', p); row.appendChild(inner); el.appendChild(row);
        anim(inner, [{ transform: 'translateY(115%)' }, { transform: 'none' }], 700, i * 150);
      });
      setStage(el);
    }
    function welcome() {
      var el = chars('WELCOME', 'wz-word wz-welcome');
      setStage(el);
      var list = el.querySelectorAll('.wz-ch');
      for (var k = 0; k < list.length; k++) {
        list[k].animate([{ transform: 'translateY(-160%) rotate(-12deg)', opacity: 0 }, { transform: 'translateY(6%) rotate(2deg)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }],
          { duration: 820 * T, delay: k * 70 * T, fill: 'both', easing: 'cubic-bezier(.3,1.3,.5,1)' });
      }
    }
    function final() {
      var el = mk('div', 'wz-big wz-final', 'DXB MUN');
      setStage(el);
      anim(el, [{ transform: 'scale(1.7)', opacity: 0, letterSpacing: '.4em' }, { transform: 'scale(1)', opacity: 1, letterSpacing: '.03em' }], 1500);
      el.animate([{ backgroundPosition: '0% 50%' }, { backgroundPosition: '200% 50%' }], { duration: 2600 * T, iterations: Infinity, delay: 1200 * T });
      scene.rays = 1; scene.bgTo = C.black; scene.grid = 1;
      scene.ringAt = performance.now(); flashNow(0.8); kick(0.9);
    }

    // ---- the show, in time ----
    var steps = [
      [0, function () { scene.bgTo = C.black; count(5); }],
      [1000, function () { count(4); }],
      [2000, function () { count(3); }],
      [3000, function () { count(2); }],
      [4000, function () { count(1); }],
      [5000, function () { scene.bgTo = C.maroon; scene.sweep = 0; anim(root, [{}, {}], 1); word('DELEGATES', 'word-big'); kick(0.8); sweepRun(); }],
      [6600, function () { scene.bgTo = C.black; lines(['ARE YOU', 'READY?']); kick(0.7); }],
      [8300, function () { scene.bgTo = C.black; welcome(); kick(0.8); }],
      [9900, function () { final(); }]
    ];
    steps.forEach(function (s) { setTimeout(function () { if (alive) s[1](); }, s[0] * T); });
    function sweepRun() { var t1 = performance.now(), dur = 1100 * T; (function f(now) { var k = (now - t1) / dur; scene.sweep = Math.min(1, k); if (k < 1 && alive) requestAnimationFrame(f); else scene.sweep = -1; })(t1); }
    // (time is scaled for reduced motion; the sequence length is the same)

    function finish() {
      if (!alive) return;
      alive = false;
      window.removeEventListener('resize', size);
      document.removeEventListener('keydown', onKey);
      root.style.transition = 'opacity .9s'; root.style.opacity = '0';
      setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); busy = false; }, 950);
    }
    function onKey(e) { if (e.key === 'Escape') finish(); }
    document.addEventListener('keydown', onKey);
    setTimeout(finish, total * T);
    requestAnimationFrame(function () { root.classList.add('on'); });
  }

  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
})();