// DXB MUN – menu, section highlighting, committee showcase, schedule and motion effects

document.documentElement.classList.add('js');
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine = window.matchMedia('(pointer: fine)').matches;

// ---------- Mobile menu ----------
var burger = document.getElementById('burger');
var links = document.getElementById('links');
burger.addEventListener('click', function () {
  var open = links.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
links.addEventListener('click', function (e) {
  if (e.target.tagName === 'A') {
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
  }
});

// ---------- Highlight the nav link of the section on screen ----------
var anchors = [].slice.call(links.querySelectorAll('a'));
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        anchors.forEach(function (a) {
          a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('main section').forEach(function (s) { io.observe(s); });
}

// ---------- Committee showcase: tiles, arrows, search, keyboard and swipe ----------
var rail = document.getElementById('rail');
var btns = [].slice.call(rail.querySelectorAll('button'));
var cur = 0;
var swapEls = ['cm-idx', 'cm-a', 'cm-n'].map(function (id) { return document.getElementById(id); });

function show(i) {
  cur = (i + btns.length) % btns.length;
  var b = btns[cur];
  btns.forEach(function (x) { x.removeAttribute('aria-current'); });
  b.setAttribute('aria-current', 'true');
  document.getElementById('cm-a').textContent = b.dataset.a;
  document.getElementById('cm-n').textContent = b.dataset.n;
  document.getElementById('cm-idx').textContent = ('0' + (cur + 1)).slice(-2) + ' / ' + btns.length;
  rail.scrollTop = b.offsetTop - rail.clientHeight / 2 + b.offsetHeight / 2;
  rail.scrollLeft = b.offsetLeft - rail.clientWidth / 2 + b.offsetWidth / 2;
  if (!reduce) {
    swapEls.forEach(function (el, k) {
      el.classList.remove('swap');
      void el.offsetWidth;
      el.style.animationDelay = (k * 50) + 'ms';
      el.classList.add('swap');
    });
  }
}

// move to the next / previous committee that is not hidden by the search
function step(dir) {
  var n = btns.length, i = cur;
  for (var k = 0; k < n; k++) {
    i = (i + dir + n) % n;
    if (!btns[i].hidden) { show(i); return; }
  }
}

btns.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
document.getElementById('prev').addEventListener('click', function () { step(-1); });
document.getElementById('next').addEventListener('click', function () { step(1); });

var search = document.getElementById('cm-search');
var none = document.getElementById('cm-none');
search.addEventListener('input', function () {
  var q = search.value.trim().toLowerCase();
  var first = -1;
  btns.forEach(function (b, i) {
    var ok = !q || b.dataset.a.toLowerCase().indexOf(q) > -1 || b.dataset.n.toLowerCase().indexOf(q) > -1;
    b.hidden = !ok;
    if (ok && first < 0) first = i;
  });
  none.hidden = first > -1;
  if (first > -1 && btns[cur].hidden) show(first);
});

// left / right arrow keys change the committee while that section is on screen
var cmSec = document.getElementById('committees');
document.addEventListener('keydown', function (e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  var r = cmSec.getBoundingClientRect();
  if (!(r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
});

// swipe the committee name on a phone
var cmCopy = cmSec.querySelector('.copy');
var sx = null;
cmCopy.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
cmCopy.addEventListener('touchend', function (e) {
  if (sx === null) return;
  var dx = e.changedTouches[0].clientX - sx;
  sx = null;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
}, { passive: true });

// ---------- Schedule: day tabs (click or arrow keys) and pin-able rows ----------
var tabs = [].slice.call(document.querySelectorAll('.tabs button'));
function pick(t) {
  tabs.forEach(function (x) {
    var on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    document.getElementById('day-' + x.dataset.day).hidden = !on;
  });
}
tabs.forEach(function (t, i) {
  t.tabIndex = i === 0 ? 0 : -1;
  t.addEventListener('click', function () { pick(t); });
  t.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    var n = tabs[(i + d + tabs.length) % tabs.length];
    pick(n);
    n.focus();
  });
});
document.querySelectorAll('.day tbody tr').forEach(function (tr) {
  tr.addEventListener('click', function () { tr.classList.toggle('pin'); });
});

// ---------- Scroll progress bar and back-to-top button ----------
var bar = document.createElement('div');
bar.className = 'progress';
bar.setAttribute('aria-hidden', 'true');
document.body.appendChild(bar);

var toTop = document.createElement('a');
toTop.className = 'totop';
toTop.href = '#home';
toTop.setAttribute('aria-label', 'Back to top');
toTop.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
document.body.appendChild(toTop);

var ticking = false;
function onScroll() {
  var h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
  toTop.classList.toggle('show', window.scrollY > window.innerHeight * 0.6);
  ticking = false;
}
window.addEventListener('scroll', function () {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

// ---------- Sections fade up as you scroll to them ----------
if ('IntersectionObserver' in window && !reduce) {
  var ro = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.sec h2:not(.cm-a), .about, .railwrap, .tabs, .row, footer').forEach(function (el) {
    el.classList.add('rv');
    ro.observe(el);
  });
}

// ---------- Hero title: letters pop in and lift when you hover them ----------
var h1 = document.querySelector('h1');
if (h1 && !reduce) {
  var text = h1.textContent.trim();
  var idx = 0;
  h1.setAttribute('aria-label', text);
  h1.textContent = '';
  text.split(' ').forEach(function (word, wi) {
    if (wi) h1.appendChild(document.createTextNode(' '));
    var w = document.createElement('span');
    w.className = 'w';
    w.setAttribute('aria-hidden', 'true');
    word.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', idx++);
      s.textContent = ch;
      w.appendChild(s);
    });
    h1.appendChild(w);
  });
}

// ---------- Mouse glow and hero photo parallax (mouse users only) ----------
if (fine && !reduce) {
  var glow = document.createElement('div');
  glow.className = 'glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);
  var heroPhoto = document.querySelector('.hero .photo');
  var mx = 0, my = 0, raf = 0;
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      glow.style.transform = 'translate(' + (mx - 260) + 'px,' + (my - 260) + 'px)';
      if (heroPhoto) {
        var px = (mx / window.innerWidth - 0.5) * -18;
        var py = (my / window.innerHeight - 0.5) * -12;
        heroPhoto.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(1.06)';
      }
    });
  });
}
