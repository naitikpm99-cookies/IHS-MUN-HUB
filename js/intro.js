(function () {
  var showIntro = false;
  try {
    showIntro = !sessionStorage.getItem('dxb-mun-intro-seen');
    if (showIntro) sessionStorage.setItem('dxb-mun-intro-seen', 'true');
  } catch (error) {
    console.warn('Intro could not access session storage; it may appear again on reload.', error);
    showIntro = true;
  }

  if (!showIntro || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.documentElement.classList.add('intro-enabled');
  document.addEventListener('DOMContentLoaded', function () {
    var screen = document.getElementById('intro-screen');
    var skip = document.getElementById('intro-skip');
    var main = document.querySelector('main');
    var nav = document.querySelector('.nav');
    if (!screen || !skip || !main || !nav) return;

    var dismissed = false;
    var finishTimer;
    var previousOverflow = document.body.style.overflow;
    screen.setAttribute('aria-hidden', 'false');
    main.inert = true;
    nav.inert = true;
    document.body.style.overflow = 'hidden';
    skip.focus();

    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(finishTimer);
      document.removeEventListener('keydown', onKeydown);
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

    skip.addEventListener('click', dismiss);
    function onKeydown(event) {
      if (event.key === 'Escape' && !dismissed) {
        event.preventDefault();
        dismiss();
      }
    }
    document.addEventListener('keydown', onKeydown);
    finishTimer = setTimeout(dismiss, 2700);
  });
})();
