document.addEventListener('scroll', () => {
  const scrollPos = window.scrollY;
  const hero = document.querySelector('.hero');
  if (scrollPos > 10) {
     hero.style.transform = `translateY(-${scrollPos * 0.4}px)`;
     hero.style.opacity = 1 - (scrollPos / 800);
  }
});