(function () {
  const productCenters = [
    { title: 'Jobs', href: './dashboard.html#jobs-panel', desc: 'Search opportunities and track applications.' },
    { title: 'Academy', href: './dashboard.html#academy-panel', desc: 'Learn with courses, lessons and AI tutor support.' },
    { title: 'Banking', href: './banking.html', desc: 'Manage wallet, accounts, cards and bills.' },
    { title: 'CryptoCurrency', href: './crypto-exchange.html', desc: 'View markets, buy, sell and track crypto activity.' }
  ];
  function renderProductCenters() {
    if (document.querySelector('[data-product-centers]')) return;
    const isDashboard = /dashboard|banking|crypto|academy|jobs|admin|staff/i.test(location.pathname);
    if (!isDashboard) return;
    const el = document.createElement('section');
    el.className = 'product-center-strip';
    el.setAttribute('data-product-centers', 'true');
    el.innerHTML = productCenters.map(item => `<a class="product-center-tile" href="${item.href}"><span>${item.title}</span><strong>Open Dashboard</strong><small>${item.desc}</small></a>`).join('');
    const target = document.querySelector('.dashboard-topbar, .sp-page-hero, .banking-hero, .crypto-hero, main');
    if (target && target.tagName === 'MAIN') target.prepend(el);
    else if (target) target.insertAdjacentElement('afterend', el);
  }
  document.addEventListener('DOMContentLoaded', renderProductCenters);
})();
