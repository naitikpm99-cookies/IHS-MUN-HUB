/* IHS MUN HUB - main script */


/* ---------- 1. Mobile menu ---------- */

const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

function setMenu(open) {
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
}

// Tapping the burger button opens or closes the menu
burger.addEventListener('click', () => {
  setMenu(!nav.classList.contains('open'));
});

// Tapping a link inside the menu closes it
nav.addEventListener('click', (event) => {
  if (event.target.tagName === 'A') {
    setMenu(false);
  }
});


/* ---------- 2. Header shadow after scrolling ---------- */

const header = document.querySelector('.top');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 10);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();


/* ---------- 3. Fade elements in as they scroll into view ---------- */

const revealTargets = document.querySelectorAll('.card, .conf > *, .head, .join .wrap > *');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealTargets.forEach((element) => {
    element.classList.add('reveal');
    observer.observe(element);
  });
}
