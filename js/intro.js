(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('intro-enabled');
  document.addEventListener('DOMContentLoaded', function () {
    var screen = document.getElementById('intro-screen');
    var title = document.getElementById('intro-title');
    var main = document.querySelector('main');
    var nav = document.querySelector('.nav');
    if (!screen || !title || !main || !nav) return;

    var dismissed = false;
    var finishTimer;
    var previousOverflow = document.body.style.overflow;
    screen.setAttribute('aria-hidden', 'false');
    main.inert = true;
    nav.inert = true;
    document.body.style.overflow = 'hidden';
    title.focus();

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(finishTimer);
      screen.classList.add('is-leaving');
      setTimeout(function () {
        screen.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('intro-enabled');
        main.inert = false;
        nav.inert = false;
        document.body.style.overflow = previousOverflow;
        nav.querySelector('.logo').focus();
      }, 600);
    }

    finishTimer = setTimeout(dismiss, reduceMotion ? 1200 : 2700);
  });
})();
