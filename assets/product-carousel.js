(function () {
  function slideWidth(track) {
    return track.clientWidth || 0;
  }

  function activeIndex(track, dotCount) {
    var w = slideWidth(track);
    if (!w || dotCount < 1) return 0;
    var i = Math.round(track.scrollLeft / w);
    if (i < 0) i = 0;
    if (i > dotCount - 1) i = dotCount - 1;
    return i;
  }

  function setDots(dots, i) {
    dots.forEach(function (d, j) {
      var on = j === i;
      d.classList.toggle('is-active', on);
      d.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.product-carousel').forEach(function (root) {
    var scroller = root.querySelector('.product-carousel__viewport--carousel');
    var dots = root.querySelectorAll('.product-carousel__dot');
    if (!scroller || dots.length === 0) return;

    var scrollTick;
    scroller.addEventListener(
      'scroll',
      function () {
        if (scrollTick) cancelAnimationFrame(scrollTick);
        scrollTick = requestAnimationFrame(function () {
          setDots(dots, activeIndex(scroller, dots.length));
        });
      },
      { passive: true }
    );

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        var w = slideWidth(scroller);
        if (!w) return;
        scroller.scrollTo({ left: i * w, behavior: 'smooth' });
      });
    });

    window.addEventListener('resize', function () {
      setDots(dots, activeIndex(scroller, dots.length));
    });

    setDots(dots, activeIndex(scroller, dots.length));
  });
})();
