// DXB MUN – menu, section highlighting and the committee showcase

// Mobile menu
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

// Highlight the nav link of the section on screen
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

// Committee showcase: click a tile or use the arrows
var rail = document.getElementById('rail');
var btns = [].slice.call(rail.querySelectorAll('button'));
var cur = 0;

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
}

btns.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
document.getElementById('prev').addEventListener('click', function () { show(cur - 1); });
document.getElementById('next').addEventListener('click', function () { show(cur + 1); });

// Schedule: switch between the days
var tabs = [].slice.call(document.querySelectorAll('.tabs button'));
tabs.forEach(function (t) {
  t.addEventListener('click', function () {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on);
      document.getElementById('day-' + x.dataset.day).hidden = !on;
    });
  });
});
