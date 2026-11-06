// Intro (see .intro in css/home.css): colour burst, then DXB MUN with a 0-100 counter (pure CSS).
// Plays on every page load unless reduced motion is enabled.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { root.classList.add('no-intro'); return; }
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
    el.addEventListener('animationend', function (e) { if (e.target.className === 'l0') end(); });
  });
})();