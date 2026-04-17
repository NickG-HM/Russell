(function () {
  var nav = document.getElementById('russells-nav-overlay');
  var cart = document.getElementById('russells-cart-overlay');
  var toggle = document.getElementById('russells-nav-menu-toggle');
  if (!nav || !toggle) return;

  function setNavOpen(open) {
    nav.classList.toggle('expanded', open);
    nav.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open && cart && cart.classList.contains('expanded')) {
      cart.classList.remove('expanded');
    }
  }

  function closeNav() {
    setNavOpen(false);
  }

  toggle.addEventListener('click', function () {
    setNavOpen(!nav.classList.contains('expanded'));
  });

  nav.querySelectorAll('.close, .close-outside').forEach(function (el) {
    el.addEventListener('click', closeNav);
  });

  nav.querySelectorAll('a.mobile-header-menu-item').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeNav();
      if (cart && cart.classList.contains('expanded')) cart.classList.remove('expanded');
    }
  });
})();
