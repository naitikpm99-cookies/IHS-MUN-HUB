// Intro (see .intro in css/home.css): colour burst, then DXB MUN with a 0-100 counter (pure CSS).
// Plays once per visit, never for "reduce motion", click to skip.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('dxbmun_intro') === '1'; } catch (e) {}
  if (reduce || seen) { root.classList.add('no-intro'); return; }
  try { sessionStorage.setItem('dxbmun_intro', '1'); } catch (e) {}
  root.classList.add('has-intro', 'intro-lock');

  var ended = false;
  function end() {
    if (ended) return;
    ended = true;
    root.classList.remove('intro-lock');
    var el = document.querySelector('.intro');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  setTimeout(end, 7000); // safety net

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.querySelector('.intro');
    if (!el) return end();
    el.addEventListener('click', end);
    el.addEventListener('animationend', function (e) { if (e.target.className === 'l0') end(); });
  });
})();