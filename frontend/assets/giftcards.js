const giftBase = window.APP_CONFIG?.service_BASE_URL || '/api';
const giftTokenKey = 'spworldtech_user_token';
const token = localStorage.getItem(giftTokenKey);
const $ = (id) => document.getElementById(id);
let selectedGiftProduct = null;

function esc(value='') { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }
function money(amount, currency='USD') {
  const safeCurrency = String(currency || 'USD').toUpperCase() === 'NGN' ? 'NGN' : 'USD';
  try { return new Intl.NumberFormat('en-US', { style:'currency', currency: safeCurrency }).format(Number(amount || 0)); }
  catch (_) { return `${safeCurrency} ${Number(amount || 0).toLocaleString()}`; }
}
function setStatus(id, message, isError=false) { const el=$(id); if(el){ el.textContent=message; el.style.color=isError?'#b91c1c':'#0f766e'; } }
async function api(path, options={}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await (window.spFetch ? window.spFetch(path, { ...options, headers }) : fetch(`${giftBase}${path}`, { ...options, headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}
function requireLogin() { if (!token) throw new Error('Login first. Fund your wallet with SP Token Voucher, redeem it, then buy GiftCards.'); }

async function loadStatus() {
  try {
    const data = await api('/giftcards/status');
    if ($('giftApiStatus')) $('giftApiStatus').innerHTML = `<div class="mini-card"><strong>GiftCards API</strong><div class="job-meta">${esc(data.message)}</div><div class="job-meta">Providers: ${esc((data.providers || []).join(', ') || 'waiting')}</div></div>`;
  } catch (error) {
    if ($('giftApiStatus')) $('giftApiStatus').innerHTML = `<div class="mini-card"><strong>GiftCards API</strong><div class="job-meta">${esc(error.message)}</div></div>`;
  }
}

function fillOrderForm(product) {
  selectedGiftProduct = product;
  const form = $('giftCardOrderForm');
  if (!form) return;
  form.providerProductId.value = product.providerProductId || '';
  form.provider.value = product.provider || 'openwebninja';
  form.brand.value = product.brand || product.title || 'GiftCard';
  form.productTitle.value = product.title || product.name || product.brand || 'GiftCard';
  form.productUrl.value = product.url || '';
  form.image.value = product.image || '';
  if (Number(product.amount || 0) > 0) form.amount.value = Number(product.amount || 0).toFixed(2);
  else if (!form.amount.value) form.amount.value = '';
  form.currency.value = String(product.currency || '').toUpperCase() === 'NGN' ? 'NGN' : 'USD';
  setStatus('giftCardStatus', `${product.title || product.brand} selected. Confirm amount and place order using wallet balance.`);
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderProducts(products = []) {
  const target = $('giftProductsList');
  if (!target) return;
  if (!products.length) {
    target.innerHTML = '<div class="mini-card">No GiftCard products returned yet. Try: Amazon gift card, Razer Gold, Steam gift card, Apple gift card, or change provider.</div>';
    return;
  }
  target.innerHTML = products.map((p, index) => `
    <article class="mini-card gift-product-card">
      ${p.image ? `<img class="gift-product-image" src="${esc(p.image)}" alt="${esc(p.title || p.brand)}" loading="lazy"/>` : ''}
      <strong>${esc(p.title || p.brand || 'GiftCard Product')}</strong>
      <div class="job-meta">${esc(p.provider || 'marketplace')} · ${esc(p.brand || 'GiftCard')} · ${p.amount ? money(p.amount, p.currency || 'USD') : 'Price from marketplace'}</div>
      <div class="job-meta">${esc((p.description || '').slice(0, 140))}</div>
      <div class="dashboard-actions">
        <button class="primary" data-select-gift="${index}" type="button">Select GiftCard</button>
        ${p.url ? `<a class="secondary plain-anchor-btn" href="${esc(p.url)}" target="_blank" rel="noopener">View Source</a>` : ''}
      </div>
    </article>
  `).join('');
  document.querySelectorAll('[data-select-gift]').forEach(btn => btn.addEventListener('click', () => fillOrderForm(products[Number(btn.dataset.selectGift)])));
}

async function searchGiftCards(event) {
  event?.preventDefault();
  const form = $('giftSearchForm');
  const fd = form ? new FormData(form) : new FormData();
  const query = fd.get('query') || 'gift card';
  const provider = fd.get('provider') || 'all';
  const target = $('giftProductsList');
  if (target) target.innerHTML = '<div class="mini-card">Searching live GiftCard marketplace...</div>';
  try {
    const data = await api(`/giftcards/catalog?query=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}`);
    renderProducts(data.products || []);
    if (data.errors?.length) setStatus('giftSearchStatus', `Some providers did not respond: ${data.errors.join(' | ')}`, true);
    else setStatus('giftSearchStatus', `Showing ${(data.products || []).length} live marketplace results.`);
  } catch (error) {
    if (target) target.innerHTML = `<div class="mini-card">${esc(error.message)}</div>`;
    setStatus('giftSearchStatus', error.message, true);
  }
}

async function loadOrders() {
  if (!token || !$('giftOrdersHistory')) { if ($('giftOrdersHistory')) $('giftOrdersHistory').innerHTML = '<div class="mini-card">Login to view your GiftCard orders.</div>'; return; }
  try {
    const data = await api('/giftcards/orders/mine');
    $('giftOrdersHistory').innerHTML = (data.orders || []).length ? data.orders.map(o => `<div class="mini-card"><strong>${esc(o.productTitle || o.brand)} · ${esc(o.country)}</strong><div class="job-meta">${money(o.totalAmount || 0, o.currency || 'USD')} · ${esc(o.status)}</div><div class="job-meta">Ref: ${esc(o.providerReference || 'waiting')}</div>${o.fulfillmentNote ? `<div class="job-meta">Note: ${esc(o.fulfillmentNote)}</div>` : ''}</div>`).join('') : '<div class="mini-card">No GiftCard orders yet.</div>';
  } catch (error) { $('giftOrdersHistory').innerHTML = `<div class="mini-card">${esc(error.message)}</div>`; }
}

document.addEventListener('DOMContentLoaded', () => {
  loadStatus(); loadOrders();
  if ($('giftSearchForm')) searchGiftCards();
  $('giftSearchForm')?.addEventListener('submit', searchGiftCards);
  $('giftCardOrderForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      requireLogin();
      const fd = new FormData(event.currentTarget);
      const payload = Object.fromEntries(fd.entries());
      payload.amount = Number(payload.amount);
      payload.quantity = Number(payload.quantity || 1);
      if (!payload.providerProductId && selectedGiftProduct?.providerProductId) payload.providerProductId = selectedGiftProduct.providerProductId;
      const data = await api('/giftcards/orders', { method: 'POST', body: JSON.stringify(payload) });
      setStatus('giftCardStatus', data.message || 'GiftCard order created.');
      await loadOrders();
    } catch (error) { setStatus('giftCardStatus', error.message, true); }
  });
});
