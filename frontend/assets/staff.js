
function installOperationsGate() {
  const auth = document.getElementById('staffAuthSection');
  const dashboard = document.getElementById('staffDashboardSection');
  if (localStorage.getItem(staffTokenKey)) {
    auth?.classList.add('hidden');
  } else {
    auth?.classList.remove('hidden');
    dashboard?.classList.add('hidden');
  }
}
function isAdminOrOwner() { return ['admin', 'owner'].includes(staffState.staff?.role); }

function applyStaffRolePrivacy() {
  const role = staffState.staff?.role;
  if (role && !isAdminOrOwner()) {
    ['adminRevenuePanel','adminUsdBalance','adminJobRevenue','adminTransactionCharges','adminProductFees','staffTransactionsList','withdrawalsList','pendingWithdrawalsCount'].forEach(id => {
      const el = document.getElementById(id); if (el) el.closest('.panel, .summary-card, .stat-box, .mini-card')?.classList.add('staff-safe-hide');
    });
  }
}
function generateClientMessage({clientName='Client', jobTitle='your project', messageType='welcome'}) {
  const greetings = {
    welcome: `Dear ${clientName},\n\nWelcome to SP WorldTech. Thank you for trusting us with ${jobTitle}. Our team is ready to serve you with professional communication, clear project updates, and quality delivery.`,
    thank_you: `Dear ${clientName},\n\nThank you for choosing SP WorldTech for ${jobTitle}. We appreciate your confidence in our team and we are committed to delivering excellent results.`,
    payment_confirmation: `Dear ${clientName},\n\nWe confirm your payment record for ${jobTitle}. Our operations team will review the project details and continue the next step professionally.`,
    project_update: `Dear ${clientName},\n\nThis is a professional update from SP WorldTech regarding ${jobTitle}. We are reviewing the current task board and will continue serving you with clear progress and reliable support.`
  };
  return (greetings[messageType] || greetings.welcome) + `\n\nBest regards,\nSP WorldTech Support Team`;
}

const STAFF_service_BASE = window.APP_CONFIG.service_BASE_URL;
const STAFF_REQUEST_TIMEOUT_MS = 10000;
let staffLoadInProgress = false;
const dashboardRole = document.body.dataset.dashboardRole === 'admin' ? 'admin' : 'staff';
const staffTokenKey = `spworldtech_${dashboardRole}_token`;
const staffProfileKey = `spworldtech_${dashboardRole}_profile`;
const calculatorPage = dashboardRole === 'admin' ? './admin-calculator.html' : './staff-calculator.html';

const staffState = {
  token: localStorage.getItem(staffTokenKey),
  staff: JSON.parse(localStorage.getItem(staffProfileKey) || 'null')
};

const $$ = (id) => document.getElementById(id);

function esc(value = '') { return String(value ?? '').replace(/[&<>'\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount || 0));
}

async function staffRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (staffState.token) headers.Authorization = `Bearer ${staffState.token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || STAFF_REQUEST_TIMEOUT_MS));
  let res;
  try {
    res = await (window.spFetch ? window.spFetch(path, { ...options, headers, signal: controller.signal }) : fetch(`${STAFF_service_BASE}${path}`, { ...options, headers, signal: controller.signal }));
  } catch (error) {
    throw new Error(error.name === 'AbortError' ? 'Request timeout after 10 seconds. Backend may be waking up; try Refresh again.' : error.message);
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0, 80) || res.statusText}`); }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function setStaffStatus(message, isError = false) {
  const el = $$('staffLoginStatus');
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#b91c1c' : '#0f766e';
}

function saveStaffAuth(payload) {
  staffState.token = payload.token;
  staffState.staff = payload.user;
  localStorage.setItem(staffTokenKey, payload.token);
  localStorage.setItem(staffProfileKey, JSON.stringify(payload.user));
}

function logoutStaff() {
  localStorage.removeItem(staffTokenKey);
  localStorage.removeItem(staffProfileKey);
  staffState.token = null;
  staffState.staff = null;
  $$('staffDashboardSection')?.classList.add('hidden');
  $$('staffAuthSection')?.classList.remove('hidden');
  sessionStorage.setItem('spworldtech_logout_message', 'Secure logout completed. Open calculator access again when ready.');
  window.location.href = `${calculatorPage}?logout=1`;
}



function renderTynaTokenStatus(payload = {}) {
  const status = document.getElementById('tynaTokenStatus');
  const list = document.getElementById('tynaTransfersList');
  if (!status || !list) return;
  if (!isAdminOrOwner()) {
    document.getElementById('tynaTokenForwardPanel')?.classList.add('staff-safe-hide');
    return;
  }
  const connection = payload.connection;
  if (!payload.connected || !connection) {
    status.textContent = 'No Tyna Systems token connected yet. Connected tokens stay active for lifetime.';
  } else {
    status.textContent = `Connected · Status: active · Lifetime connection · Tyna Developer ID: ${connection.tynaDeveloperId || 'Available'} · Last checked: ${money(connection.lastBalanceChecked || 0, connection.currency || 'NGN')} · Last forwarded: ${money(connection.lastForwardedAmount || 0, connection.currency || 'NGN')}${connection.lastReference ? ` · Ref: ${connection.lastReference}` : ''}`;
  }
  const transfers = payload.recentTransfers || [];
  list.innerHTML = transfers.length ? transfers.map(item => `
    <div class="mini-card">
      <strong>${esc(item.sourcePlatform || 'Tyna Systems')} → ${esc(item.destinationPlatform || 'SP WorldTech Admin Wallet')}</strong>
      <div class="job-meta">${money(item.amount || 0, item.currency || 'NGN')} · ${esc(item.status || 'success')} · Ref: ${esc(item.reference || '')}</div>
      <div class="job-meta">${new Date(item.createdAt || Date.now()).toLocaleString()}</div>
    </div>
  `).join('') : '<div class="mini-card">No Tyna Systems transfer history yet.</div>';
}

async function loadTynaTokenStatus() {
  if (!document.getElementById('tynaTokenForwardPanel') || !isAdminOrOwner()) return;
  try {
    const data = await staffRequest('/tyna-balance/status');
    renderTynaTokenStatus(data);
  } catch (error) {
    const status = document.getElementById('tynaTokenStatus');
    if (status) status.textContent = error.message;
  }
}

function renderTransactions(transactions = []) {
  const target = $$('staffTransactionsList');
  if (!target) return;
  target.innerHTML = transactions.length ? transactions.map(tx => `
    <div class="mini-card">
      <strong>${tx.type.replaceAll('_', ' ')}</strong>
      <div class="job-meta">${tx.wallet} wallet · ${money(tx.amount, tx.currency || 'USD')} · ${tx.status}</div>
      <div class="job-meta">${tx.description || ''}</div>
    </div>
  `).join('') : '<div class="mini-card">No transactions yet.</div>';
}

function renderStaffJobs(jobs) {
  const isAdmin = isAdminOrOwner();
  $$('staffJobsList').innerHTML = jobs.length ? jobs.map(job => `
    <div class="job-card">
      <strong>${job.title}</strong>
      <div class="job-meta">Category: ${job.category}</div>
      <div class="job-meta">${isAdmin ? `Full client amount: ${money(job.fullAmount)} · Worker voucher payout: ${money(job.userVisibleAmount)} · Admin revenue: ${money(job.adminAmount || 0)}` : `Worker payout values are hidden from support view`}</div>
      ${isAdmin ? `<div class="job-meta">Transaction charge: ${money(job.transactionChargeAmount || 0)} (${job.transactionChargePercent || 0}%)</div>` : ''}
      <div class="job-meta">Status: ${job.status || 'open'}</div>
    </div>
  `).join('') : '<div class="mini-card">No jobs found.</div>';
}

function renderApplications(apps) {
  const isAdmin = isAdminOrOwner();
  const query = (document.getElementById('adminApplicationSearch')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('adminApplicationStatusFilter')?.value || '';
  const filtered = apps.filter(app => {
    const haystack = `${app.user?.fullName || ''} ${app.user?.email || ''} ${app.job?.title || ''} ${app.job?.company || ''}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!statusFilter || app.status === statusFilter);
  });
  $$('staffApplicationsList').innerHTML = filtered.length ? filtered.map(app => `
    <div class="application-card admin-application-card">
      <strong>${esc(app.user?.fullName || 'User')} - ${esc(app.job?.title || 'Job')}</strong>
      <div class="job-meta">Email: ${esc(app.user?.email || 'Not available')} · Status: <strong>${esc(app.status)}</strong></div>
      <div class="job-meta">Company: ${esc(app.job?.company || 'Company')} · Location: ${esc(app.job?.location || 'Remote')}</div>
      ${isAdmin ? `<div class="job-meta">Full client amount: ${money(app.fullAmount || app.job?.fullAmount || 0)} · Worker SP Token voucher: ${money(app.userVisibleAmount)} · Admin revenue: ${money(app.adminAmount || 0)} · Payout: ${esc(app.payoutVoucherStatus || 'not_issued')}</div>` : `<div class="job-meta">Support view only: payment and revenue values are hidden.</div>`}
      <div class="job-doc-grid">
        ${app.resume?.dataUrl ? `<a class="secondary plain-anchor-btn" href="${app.resume.dataUrl}" download="${esc(app.resume.filename || 'resume')}">Review Resume</a>` : '<span class="job-meta">No resume file</span>'}
        ${app.coverLetter ? `<details><summary>Cover Letter</summary><p>${esc(app.coverLetter)}</p></details>` : '<span class="job-meta">No cover letter</span>'}
        ${app.portfolioUrl ? `<a class="secondary plain-anchor-btn" target="_blank" rel="noopener" href="${esc(app.portfolioUrl)}">Open Portfolio</a>` : '<span class="job-meta">No portfolio</span>'}
        ${app.skills?.length ? `<div class="job-meta">Skills: ${app.skills.map(esc).join(', ')}</div>` : ''}
      </div>
      ${isAdmin ? `<div class="inline-form"><select data-status-select="${app._id}"><option>Submitted</option><option>Under Review</option><option>Contacting Client</option><option>Client Responded</option><option>Interview</option><option>Accepted</option><option>Rejected</option><option>Closed</option></select><input data-status-note="${app._id}" placeholder="Optional note" /><button class="secondary" data-change-status="${app._id}">Change Status</button></div>` : ''}
      ${isAdmin ? `<button class="primary" data-ai-message-app="${app._id}">Generate AI Contact Client Message</button><button class="primary" data-approve-app="${app._id}">Accept + Issue SP Token Voucher</button><button class="danger" data-reject-app="${app._id}">Reject</button>` : ''}
      ${app.statusHistory?.length ? `<details><summary>Application history</summary>${app.statusHistory.map(item => `<div class="job-meta">${esc(item.status)} · ${new Date(item.changedAt || Date.now()).toLocaleString()} ${item.note ? `· ${esc(item.note)}` : ''}</div>`).join('')}</details>` : ''}
    </div>
  `).join('') : '<div class="mini-card">No applications match the current filters.</div>';

  document.querySelectorAll('[data-approve-app]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      const data = await staffRequest(`/staff/applications/${btn.dataset.approveApp}/approve`, { method: 'POST' });
      setStaffStatus(`${data.message}${data.spToken?.code ? ' Code: ' + data.spToken.code : ''}`);
      await loadStaffDashboard();
    } catch (error) { setStaffStatus(error.message, true); }
  }));
  document.querySelectorAll('[data-reject-app]').forEach(btn => btn.addEventListener('click', async () => { try { await staffRequest(`/staff/applications/${btn.dataset.rejectApp}/reject`, { method: 'POST' }); await loadStaffDashboard(); } catch (error) { setStaffStatus(error.message, true); } }));
  document.querySelectorAll('[data-change-status]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      const status = document.querySelector(`[data-status-select="${btn.dataset.changeStatus}"]`)?.value;
      const note = document.querySelector(`[data-status-note="${btn.dataset.changeStatus}"]`)?.value;
      await staffRequest(`/staff/applications/${btn.dataset.changeStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
      await loadStaffDashboard();
    } catch (error) { setStaffStatus(error.message, true); }
  }));
  document.querySelectorAll('[data-ai-message-app]').forEach(btn => btn.addEventListener('click', async () => {
    try { await staffRequest(`/jobs/applications/${btn.dataset.aiMessageApp}/ai-message`, { method: 'POST' }); setStaffStatus('AI message generated for admin review. It was not sent automatically.'); await loadStaffDashboard(); }
    catch (error) { setStaffStatus(error.message, true); }
  }));
}

function renderClientContacts(contacts = []) {
  const target = $$('clientContactsList');
  if (!target) return;
  target.innerHTML = contacts.length ? contacts.map(item => `
    <div class="mini-card">
      <strong>${esc(item.company || item.clientName || 'Client')}</strong>
      <div class="job-meta">Job: ${esc(item.jobTitle || item.job?.title || 'Job')} · Contact: ${esc(item.contactInfo || 'Unavailable')}</div>
      <div class="job-meta">Status: ${esc(item.status)} · Contact date: ${item.contactDate ? new Date(item.contactDate).toLocaleDateString() : 'Not contacted'}</div>
      <div class="job-meta">Notes: ${esc(item.notes || '')}</div>
    </div>`).join('') : '<div class="mini-card">No client tracking records yet.</div>';
}

function renderAIMessages(messages = []) {
  const target = $$('aiMessagesList');
  if (!target) return;
  target.innerHTML = messages.length ? messages.map(item => `
    <div class="mini-card ai-message-box">
      <strong>${esc(item.subject)}</strong>
      <div class="job-meta">Recipient: ${esc(item.recipient || 'Manual outreach required')} · Status: ${esc(item.status)}</div>
      <textarea data-ai-message-body="${item._id}">${esc(item.message)}</textarea>
      <button class="secondary" data-save-ai-message="${item._id}">Save Edited Message</button>
      <p class="job-meta">Admin must copy/send this manually. AI never sends automatically and no applicant documents are included.</p>
    </div>`).join('') : '<div class="mini-card">No AI client messages generated yet.</div>';
  document.querySelectorAll('[data-save-ai-message]').forEach(btn => btn.addEventListener('click', async () => {
    try {
      const message = document.querySelector(`[data-ai-message-body="${btn.dataset.saveAiMessage}"]`)?.value || '';
      await staffRequest(`/jobs/ai-messages/${btn.dataset.saveAiMessage}`, { method: 'PATCH', body: JSON.stringify({ message, status: 'Edited' }) });
      setStaffStatus('AI message saved. Send manually only after approval.');
      await loadStaffDashboard();
    } catch (error) { setStaffStatus(error.message, true); }
  }));
}

function renderJobLogs(logs = [], notifications = []) {
  const notices = $$('jobNotificationsList');
  const activity = $$('jobActivityLogsList');
  if (notices) notices.innerHTML = notifications.length ? notifications.map(n => `<div class="mini-card"><strong>${esc(n.title)}</strong><div class="job-meta">${esc(n.message || '')} · ${new Date(n.createdAt).toLocaleString()}</div></div>`).join('') : '<div class="mini-card">No job notifications yet.</div>';
  if (activity) activity.innerHTML = logs.length ? logs.map(log => `<div class="mini-card"><strong>${esc(log.action)}</strong><div class="job-meta">${esc(log.job?.title || 'Job module')} · ${esc(log.message || '')} · ${new Date(log.createdAt).toLocaleString()}</div></div>`).join('') : '<div class="mini-card">No job activity logs yet.</div>';
}


function renderWithdrawals(withdrawals) {
  const isAdmin = isAdminOrOwner();
  $$('withdrawalsList').innerHTML = withdrawals.length ? withdrawals.map(item => `
    <div class="mini-card">
      <strong>${item.user?.fullName || 'User'}</strong>
      <div class="job-meta">Amount: ${money(item.amount)}</div>
      <div class="job-meta">Channel: ${item.channel}</div>
      <div class="job-meta">Status: ${item.status}</div>
      ${isAdmin && item.status === 'pending' ? `<button class="primary" data-approve-withdrawal="${item._id}">Approve Withdrawal</button><button class="danger" data-reject-withdrawal="${item._id}">Reject & Restore</button>` : ''}
    </div>
  `).join('') : '<div class="mini-card">No withdrawal requests.</div>';

  document.querySelectorAll('[data-approve-withdrawal]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await staffRequest(`/staff/withdrawals/${btn.dataset.approveWithdrawal}/approve`, { method: 'POST' });
        await loadStaffDashboard();
      } catch (error) { setStaffStatus(error.message, true); }
    });
  });

  document.querySelectorAll('[data-reject-withdrawal]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await staffRequest(`/staff/withdrawals/${btn.dataset.rejectWithdrawal}/reject`, { method: 'POST' });
        await loadStaffDashboard();
      } catch (error) { setStaffStatus(error.message, true); }
    });
  });
}


function renderProductRequests(requests = []) {
  const target = $$('staffProductRequestsList');
  if (!target) return;
  target.innerHTML = requests.length ? requests.map(item => `
    <div class="mini-card">
      <strong>${item.productType}</strong>
      <div class="job-meta">User: ${item.user?.fullName || 'User'} · ${item.user?.email || ''}</div>
      <div class="job-meta">Service: SP WorldTech · Status: ${item.status}</div>
      <div class="job-meta">Fee: ${item.feeCurrency === 'USD' ? '$' : '₦'}${Number(item.feeAmount || 0).toLocaleString()}</div>
      <div class="job-meta">Country: ${item.country || 'Not provided'} · Phone: ${item.phone || item.billPhone || 'Not provided'}</div>
      ${item.network ? `<div class="job-meta">Network: ${item.network} · Plan: ${item.dataPlan || 'Airtime'}</div>` : ''}
    </div>
  `).join('') : '<div class="mini-card">No product requests yet.</div>';
}

function renderStaffChat(messages) {
  $$('staffChatMessages').innerHTML = messages.length ? messages.map(msg => `
    <div class="chat-bubble ${msg.senderRole === 'user' ? 'user' : 'staff'}">
      <strong>${msg.senderName}</strong>
      <p>${msg.message}</p>
    </div>
  `).join('') : '<div class="mini-card">No chat messages.</div>';
}


function setAdminLiveStatus(message = 'Live operations connected') {
  const el = document.getElementById('adminLiveStatusText');
  if (el) el.textContent = message;
  const time = document.getElementById('adminLastUpdated');
  if (time) time.textContent = new Date().toLocaleTimeString();
}
function setStaffRefreshBusy(isBusy) {
  const btn = $$('refreshStaffBtn');
  if (btn) { btn.disabled = Boolean(isBusy); btn.textContent = isBusy ? 'Loading...' : 'Refresh'; }
}
function debounce(fn, wait = 450) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

async function loadStaffDashboard() {
  if (!staffState.token || !staffState.staff) return;
  if (staffLoadInProgress) return;
  staffLoadInProgress = true;
  setStaffRefreshBusy(true);
  setAdminLiveStatus('Loading live operations...');
  let data;
  try {
    data = await staffRequest('/staff/dashboard', { timeoutMs: 10000 });
  } catch (error) {
    setAdminLiveStatus('Connection waiting. Existing dashboard stays open.');
    throw error;
  } finally {
    staffLoadInProgress = false;
    setStaffRefreshBusy(false);
  }
  $$('staffAuthSection').classList.add('hidden');
  $$('staffDashboardSection').classList.remove('hidden');
  $$('staffWelcome').textContent = `Welcome, ${staffState.staff.fullName}`;
  $$('staffRoleText').textContent = `Signed in as ${String(staffState.staff.role || '').replace('_', ' ')}`;
  $$('staffUsersCount').textContent = data.stats?.users || 0;
  $$('staffJobsCount').textContent = data.stats?.jobs || 0;
  $$('staffApplicationsCount').textContent = data.stats?.applications || 0;
  $$('pendingWithdrawalsCount').textContent = data.stats?.pendingWithdrawals || 0;
  $$('productRequestsCount').textContent = data.stats?.productRequests || 0;
  $$('adminUsdBalance').textContent = money(data.systemWallet?.adminUsdBalance || 0, 'USD');
  $$('adminJobRevenue').textContent = money(data.systemWallet?.jobRevenueUsd || 0, 'USD');
  $$('adminTransactionCharges').textContent = money(data.systemWallet?.transactionChargesUsd || 0, 'USD');
  if ($$('adminProductFees')) $$('adminProductFees').textContent = `${money(data.systemWallet?.productFeeUsd || 0, 'USD')} / ${money(data.systemWallet?.productFeeNgn || 0, 'NGN')}`;
  renderTransactions(data.transactions || []);
  renderStaffJobs(data.jobs || []);
  renderApplications(data.applications || []);
  renderClientContacts(data.clientContacts || []);
  renderAIMessages(data.aiMessages || []);
  renderJobLogs(data.jobActivityLogs || [], data.jobNotifications || []);
  renderWithdrawals(data.withdrawals || []);
  renderProductRequests(data.productRequests || []);
  renderGiftCardOrders(data.giftCardOrders || []);
  renderStaffChat(data.messages || []);
  loadGiftCardOrdersForAdmin();
  applyStaffRolePrivacy();
  loadTynaTokenStatus();
  setAdminLiveStatus('Live operations connected');
  if (staffState.staff?.role === 'owner') {
    try {
      const settings = await staffRequest('/staff/platform-settings');
      const box = document.getElementById('ownerPlatformSettings');
      if (box) {
        box.classList.remove('hidden');
        box.innerHTML = `<h3>Owner / Super Admin Platform Settings</h3><p>${settings.jobSource}</p><div class="cards-grid compact-academy-grid">${Object.entries(settings.integrations || {}).map(([name, ok]) => `<div class="mini-card"><strong>${name}</strong><div class="job-meta">${ok ? 'Configured' : 'Not configured'}</div></div>`).join('')}</div>`;
      }
    } catch (error) { setStaffStatus(error.message, true); }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  installOperationsGate();
  if (staffState.token && staffState.staff) loadStaffDashboard().catch(err => setStaffStatus(err.message, true));


  $$('staffLogoutBtn')?.addEventListener('click', logoutStaff);

  document.getElementById('tynaTokenConnectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('tynaTokenStatus');
    const token = document.getElementById('tynaTransferTokenInput')?.value || '';
    try {
      const data = await staffRequest('/tyna-balance/connect-token', { method: 'POST', body: JSON.stringify({ token }) });
      if (status) status.textContent = data.message || 'Tyna Systems token connected.';
      e.target.reset();
      await loadStaffDashboard();
    } catch (error) {
      if (status) status.textContent = error.message;
      setStaffStatus(error.message, true);
    }
  });
  document.getElementById('manualForwardTynaBtn')?.addEventListener('click', async () => {
    const status = document.getElementById('tynaTokenStatus');
    try {
      const data = await staffRequest('/tyna-balance/auto-forward', { method: 'POST', body: JSON.stringify({}) });
      if (status) status.textContent = data.message || 'Auto-forward request completed.';
      await loadStaffDashboard();
    } catch (error) {
      if (status) status.textContent = error.message;
      setStaffStatus(error.message, true);
    }
  });
  document.getElementById('refreshTynaTokenBtn')?.addEventListener('click', () => loadTynaTokenStatus());
  $$('refreshStaffBtn')?.addEventListener('click', () => loadStaffDashboard().catch(err => setStaffStatus(err.message, true)));
  $$('aiClientMessageForm')?.addEventListener('submit', (e) => {
    e.preventDefault(); const form = new FormData(e.target);
    const out = document.getElementById('aiClientMessageOutput');
    if (out) out.textContent = generateClientMessage({ clientName: form.get('clientName') || 'Client', jobTitle: form.get('jobTitle') || 'your project', messageType: form.get('messageType') || 'welcome' });
  });
  $$('adminApplicationSearch')?.addEventListener('input', debounce(() => loadStaffDashboard().catch(err => setStaffStatus(err.message, true)), 500));
  $$('adminApplicationStatusFilter')?.addEventListener('change', () => loadStaffDashboard().catch(err => setStaffStatus(err.message, true)));
  $$('staffChatForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await staffRequest('/chat/staff-reply', {
        method: 'POST',
        body: JSON.stringify({ message: form.get('message') })
      });
      e.target.reset();
      await loadStaffDashboard();
    } catch (error) {
      setStaffStatus(error.message, true);
    }
  });
});

function renderGiftCardOrders(orders = []) {
  const target = document.getElementById('adminGiftCardOrdersList');
  if (!target) return;
  const canUpdate = ['admin', 'owner', 'staff'].includes(staffState.staff?.role);
  target.innerHTML = orders.length ? orders.map(order => `
    <div class="mini-card">
      <strong>${esc(order.productTitle || order.brand || 'GiftCard Order')}</strong>
      <div class="job-meta">User: ${esc(order.user?.fullName || 'User')} · ${esc(order.user?.email || '')}</div>
      <div class="job-meta">Amount: ${money(order.totalAmount || 0, order.currency || 'USD')} · Qty: ${Number(order.quantity || 1).toLocaleString()} · Status: <strong>${esc(order.status || 'processing')}</strong></div>
      <div class="job-meta">Provider: ${esc(order.provider || 'openwebninja')} · Ref: ${esc(order.providerReference || 'waiting')}</div>
      ${order.productUrl ? `<a class="secondary plain-anchor-btn" href="${esc(order.productUrl)}" target="_blank" rel="noopener">Open Source Product</a>` : ''}
      ${canUpdate ? `<form class="gift-admin-status-form" data-gift-order-form="${order._id}">
        <select name="status">
          ${['processing','completed','failed','cancelled','pending'].map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
        <input name="fulfillmentCodeMasked" placeholder="Masked code/reference e.g. RZ••••1234" value="${esc(order.fulfillmentCodeMasked || '')}" />
        <textarea name="fulfillmentNote" placeholder="Fulfilment note for internal/user order status">${esc(order.fulfillmentNote || '')}</textarea>
        <button class="primary" type="submit">Update GiftCard Order</button>
      </form>` : ''}
    </div>
  `).join('') : '<div class="mini-card">No GiftCard orders yet.</div>';
  document.querySelectorAll('[data-gift-order-form]').forEach(form => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    try {
      await staffRequest(`/giftcards/orders/${form.dataset.giftOrderForm}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: fd.get('status'), fulfillmentNote: fd.get('fulfillmentNote'), fulfillmentCodeMasked: fd.get('fulfillmentCodeMasked') })
      });
      setStaffStatus('GiftCard order updated successfully.');
      await loadStaffDashboard();
    } catch (error) { setStaffStatus(error.message, true); }
  }));
}

async function loadGiftCardOrdersForAdmin() {
  const target = document.getElementById('adminGiftCardOrdersList');
  if (!target || !staffState.token) return;
  try {
    const data = await staffRequest('/giftcards/orders/admin', { timeoutMs: 10000 });
    renderGiftCardOrders(data.orders || []);
  } catch (error) {
    target.innerHTML = `<div class="mini-card">${esc(error.message)}</div>`;
  }
}
