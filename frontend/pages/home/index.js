// Apply a lightweight parallax/fade effect while the opening hero leaves view.
// `scrollY` is multiplied by 0.4 so the hero moves slower than page content.
document.addEventListener('scroll', () => {
  const scrollPos = window.scrollY;
  const hero = document.querySelector('.hero');
  // Ignore the first few pixels to avoid visible jitter at the top of the page.
  if (scrollPos > 10) {
     hero.style.transform = `translateY(-${scrollPos * 0.4}px)`;
     hero.style.opacity = 1 - (scrollPos / 800);
  }
});
