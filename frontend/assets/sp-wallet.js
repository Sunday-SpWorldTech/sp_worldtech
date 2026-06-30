(function () {
  const service = window.APP_CONFIG?.service_BASE_URL || '';
  const TOKEN_KEY = 'spworldtech_user_token';
  const USER_KEY = 'spworldtech_user_profile';
  const state = { dashboard: null, transactions: [], currentBill: 'airtime', currentCard: '', currentAccount: 'nigeria' };
  const money = (amount, currency = 'NGN') => currency === 'USD' ? `$${Number(amount || 0).toFixed(2)}` : `₦${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const token = () => localStorage.getItem(TOKEN_KEY);
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const formData = (form) => Object.fromEntries(new FormData(form).entries());

  function showAlert(message, type = 'info') {
    const box = qs('#spWalletAlert');
    if (!box) return;
    box.textContent = message;
    box.className = `sp-wallet-alert ${type}`;
    setTimeout(() => box.classList.add('hidden'), 7000);
  }

  function requireLogin() {
    if (token()) return true;
    showAlert('Please login with your username, password and PIN before completing this secure banking action.', 'info');
    setTimeout(() => { window.location.href = `./login.html?next=${encodeURIComponent('./banking.html')}`; }, 900);
    return false;
  }

  async function request(path, options = {}) {
    if (!token()) throw new Error('Login required');
    const res = await window.spFetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'SP WorldTech could not complete this secure request right now.');
    return data;
  }

  function switchView(view) {
    qsa('[data-view-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.viewPanel === view));
    qsa('.sp-wallet-nav [data-view]').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
    const titleMap = { dashboard: 'Dashboard', transfer: 'Fund Transfer', bills: 'Bill Payments', cards: 'Card Issuing', 'naira-cards': 'Choose Card Type', virtual: 'Virtual Accounts', business: 'Business Operations', support: 'Support Ticket', statement: 'e-Statement' };
    qs('#spWalletPageTitle').textContent = titleMap[view] || 'Banking';
    document.body.classList.remove('sp-wallet-menu-open');
  }

  function renderTransactions(rows, target, full = false) {
    const body = qs(target);
    if (!body) return;
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="${full ? 9 : 7}">${full ? 'No results found!' : 'No transactions found'}</td></tr>`;
      return;
    }
    body.innerHTML = rows.map((trx, index) => {
      const ref = trx.meta?.reference || trx._id?.slice(-8) || '-';
      const date = new Date(trx.createdAt).toLocaleDateString();
      const amount = money(trx.amount, trx.currency);
      if (full) return `<tr><td>${index + 1}</td><td>${date}</td><td>${trx.type}</td><td>${ref}</td><td>${amount}</td><td>0</td><td>${amount}</td><td>${trx.description || '-'}</td><td><span class="sp-status ${trx.status}">${trx.status}</span></td></tr>`;
      return `<tr><td>${date}</td><td>${trx.type}</td><td>${amount}</td><td>-</td><td>${ref}</td><td>${trx.description || '-'}</td><td><span class="sp-status ${trx.status}">${trx.status}</span></td></tr>`;
    }).join('');
  }

  function renderDashboard(data) {
    state.dashboard = data;
    state.transactions = data.transactions || [];
    qs('#walletBalance').textContent = money(data.wallet?.ngnBalance || 0, 'NGN');
    qs('#usdBalance').textContent = `USD balance: ${money(data.wallet?.usdBalance || 0, 'USD')}`;
    qs('#bankFullName').value = data.user?.fullName || 'Banking User';
    qs('#spWalletAvatar').textContent = (data.user?.fullName || 'S').trim().charAt(0).toUpperCase();
    const activeAccount = (data.virtualAccounts || []).find((item) => ['approved', 'submitted_to_provider'].includes(item.status));
    qs('#bankDetailsBox').innerHTML = activeAccount ? `<strong>${activeAccount.productType}</strong><br>Reference: ${activeAccount.providerReference || 'Pending secure processing'}<br>Status: ${activeAccount.status}` : 'No virtual bank account has been created yet.';
    const va = data.virtualAccounts || [];
    qs('#virtualAccountsList').innerHTML = va.length ? va.map((item) => `<div class="sp-list-item"><strong>${item.productType}</strong><span>${item.status}</span><small>${item.providerMessage || item.providerReference || 'Waiting for SP WorldTech review'}</small></div>`).join('') : 'No virtual accounts yet.';
    renderTransactions(state.transactions.slice(0, 8), '#recentTransactions');
    renderTransactions(state.transactions, '#statementRows', true);
  }

  function renderGuestDashboard() {
    state.dashboard = null;
    state.transactions = [];
    qs('#walletBalance').textContent = money(0, 'NGN');
    qs('#usdBalance').textContent = 'Login to view your USD balance';
    qs('#bankFullName').value = 'Login to view account name';
    qs('#spWalletAvatar').textContent = 'S';
    qs('#bankDetailsBox').innerHTML = 'Public preview mode. Login with username, password and PIN to create/view real virtual account details.';
    qs('#virtualAccountsList').innerHTML = 'Login to view your Nigeria and USA virtual accounts.';
    renderTransactions([], '#recentTransactions');
    renderTransactions([], '#statementRows', true);
    const ticketBox = qs('#ticketsList');
    if (ticketBox) ticketBox.innerHTML = '<strong>No tickets loaded.</strong><p>Login to create and track support tickets.</p>';
    showAlert('Banking public page loaded. Login is required only when you want to submit a real request or view private wallet data.', 'info');
  }

  async function loadDashboard() {
    if (!token()) return renderGuestDashboard();
    try {
      const data = await request('/banking/dashboard');
      renderDashboard(data);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  }

  async function loadTickets() {
    if (!token()) return;
    try {
      const { tickets } = await request('/banking/support/tickets');
      const box = qs('#ticketsList');
      if (!tickets.length) return;
      box.className = 'sp-ticket-list';
      box.innerHTML = tickets.map((ticket) => `<article><strong>${ticket.subject}</strong><span>${ticket.status}</span><p>${ticket.message}</p><small>${new Date(ticket.createdAt).toLocaleString()} • ${ticket.category} • ${ticket.priority}</small></article>`).join('');
    } catch (error) {
      showAlert(error.message, 'error');
    }
  }

  function openModal(id) { qs(`#${id}`)?.classList.remove('hidden'); }
  function closeModal(modal) { modal.classList.add('hidden'); modal.querySelector('form')?.reset(); }

  function installEvents() {
    qsa('.sp-wallet-nav [data-view]').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.view)));
    qsa('[data-view-jump]').forEach((btn) => btn.addEventListener('click', () => switchView(btn.dataset.viewJump)));
    qs('#spWalletMenu')?.addEventListener('click', () => document.body.classList.toggle('sp-wallet-menu-open'));
    qs('#spWalletLogout')?.addEventListener('click', () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); window.location.href = './login.html'; });
    qsa('[data-modal]').forEach((btn) => btn.addEventListener('click', () => { if (!requireLogin()) return; openModal(btn.dataset.modal); }));
    qsa('.sp-cancel').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.closest('.sp-modal'))));
    qsa('.sp-modal').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); }));
    qsa('[data-action="unavailable"]').forEach((btn) => btn.addEventListener('click', () => showAlert('This service is not available yet. Please check back later.', 'info')));
    qsa('[data-bill]').forEach((btn) => btn.addEventListener('click', () => { if (!requireLogin()) return; state.currentBill = btn.dataset.bill; qs('#billModalTitle').textContent = btn.textContent.trim(); openModal('genericBillModal'); }));
    qsa('[data-card]').forEach((btn) => btn.addEventListener('click', () => { if (!requireLogin()) return; state.currentCard = btn.dataset.card; qs('#cardModalTitle').textContent = state.currentCard; openModal('cardModal'); }));
    qsa('[data-account]').forEach((btn) => btn.addEventListener('click', () => { if (!requireLogin()) return; state.currentAccount = btn.dataset.account; qs('#accountModalTitle').textContent = state.currentAccount === 'usa' ? 'USA Virtual Account - $10' : 'Nigeria Virtual Account - Free'; openModal('accountModal'); }));

    qs('#internalTransferModal form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const data = await request('/banking/transfer/internal', { method: 'POST', body: JSON.stringify(formData(e.target)) }); showAlert(data.message, 'success'); closeModal(qs('#internalTransferModal')); loadDashboard(); } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#bankTransferModal form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const data = await request('/banking/transfer/bank', { method: 'POST', body: JSON.stringify(formData(e.target)) }); showAlert(data.message, 'success'); closeModal(qs('#bankTransferModal')); loadDashboard(); } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#genericBillModal form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const data = await request(`/banking/bills/${state.currentBill}`, { method: 'POST', body: JSON.stringify(formData(e.target)) }); showAlert(data.message, 'success'); closeModal(qs('#genericBillModal')); loadDashboard(); } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#cardModal form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const payload = { ...formData(e.target), cardType: state.currentCard, cardNetwork: state.currentCard }; const data = await request('/banking/cards/request', { method: 'POST', body: JSON.stringify(payload) }); showAlert(data.message, 'success'); closeModal(qs('#cardModal')); loadDashboard(); } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#accountModal form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const data = await request(`/banking/virtual-accounts/${state.currentAccount}`, { method: 'POST', body: JSON.stringify(formData(e.target)) }); showAlert(data.message, 'success'); closeModal(qs('#accountModal')); loadDashboard(); } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#ticketModal form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const data = await request('/banking/support/tickets', { method: 'POST', body: JSON.stringify(formData(e.target)) }); showAlert(data.message, 'success'); closeModal(qs('#ticketModal')); loadTickets(); } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#statementSearch')?.addEventListener('click', async () => {
      try {
        const params = new URLSearchParams();
        if (qs('#fromDate').value) params.set('from', qs('#fromDate').value);
        if (qs('#toDate').value) params.set('to', qs('#toDate').value);
        const { transactions } = await request(`/banking/transactions?${params}`);
        state.transactions = transactions || [];
        renderTransactions(state.transactions, '#statementRows', true);
      } catch (error) { showAlert(error.message, 'error'); }
    });
    qs('#trxSearchBtn')?.addEventListener('click', () => {
      const term = qs('#trxSearch').value.trim().toLowerCase();
      const rows = term ? state.transactions.filter((trx) => JSON.stringify(trx).toLowerCase().includes(term)) : state.transactions;
      renderTransactions(rows.slice(0, 8), '#recentTransactions');
    });
    qs('#downloadCsv')?.addEventListener('click', () => {
      const rows = state.transactions.map((trx, index) => [index + 1, new Date(trx.createdAt).toLocaleString(), trx.type, trx.meta?.reference || trx._id, trx.amount, trx.currency, trx.description || '', trx.status]);
      const csv = [['Sr.No', 'Date', 'Action', 'TRX', 'Amount', 'Currency', 'Detail', 'State'], ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'sp-wallet-estatement.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    installEvents();
    loadDashboard();
    loadTickets();
  });
})();
