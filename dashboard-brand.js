(() => {
  const overviewLink = document.querySelector('[data-view="overview"]');
  const pageTitle = document.querySelector('[data-page-title]');

  overviewLink?.addEventListener('click', () => {
    window.requestAnimationFrame(() => {
      if (pageTitle) pageTitle.textContent = 'My Bizomedia Studio';
    });
  });
})();
