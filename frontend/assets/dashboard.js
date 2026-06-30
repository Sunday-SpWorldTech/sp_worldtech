const service_BASE = window.APP_CONFIG.service_BASE_URL;
const DASHBOARD_REQUEST_TIMEOUT_MS = 10000;
const DASHBOARD_CACHE_KEY = 'spworldtech_dashboard_last_snapshot';
const tokenKey = 'spworldtech_user_token';
const userKey = 'spworldtech_user_profile';

const state = {
  token: localStorage.getItem(tokenKey),
  user: JSON.parse(localStorage.getItem(userKey) || 'null'),
  academyCourses: [],
  loading: false
};

const $ = (id) => document.getElementById(id);

function esc(value = '') { return String(value ?? '').replace(/[&<>'\"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount || 0));
}

function setStatus(id, message, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? '#b91c1c' : '#0f766e';
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHTML(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || DASHBOARD_REQUEST_TIMEOUT_MS));
  let res;
  try {
    res = await (window.spFetch ? window.spFetch(path, { ...options, headers, signal: controller.signal }) : fetch(`${service_BASE}${path}`, { ...options, headers, signal: controller.signal }));
  } catch (error) {
    throw new Error(error.name === 'AbortError' ? 'Request timeout after 10 seconds. Backend may be waking up; dashboard will keep showing available data.' : error.message);
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_error) {
    const apiUrl = window.spApiUrl ? window.spApiUrl(path) : `${service_BASE}${path}`;
    throw new Error(`Platform returned non-JSON response from ${apiUrl}: ${text.slice(0, 80) || res.statusText}`);
  }
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

function logout() {
  ['spworldtech_user_token','spworldtech_user_profile'].forEach(k => localStorage.removeItem(k));
  sessionStorage.setItem('spworldtech_logout_message', 'You have logged out securely from SP WorldTech UserAccess.');
  window.location.href = './login.html?logout=1';
}


function hydrateSidebarSession() {
  const user = state.user || {};
  const name = user.name || user.fullName || user.username || 'UserAccess';
  const email = user.email || user.username || 'Secure dashboard session';
  setText('dashboardSidebarName', name);
  setText('dashboardSidebarEmail', email);
}

function showAuthRequired() {
  $('authRequired')?.classList.remove('hidden');
  $('overview')?.classList.add('hidden');
}

function showDashboardReady() {
  $('authRequired')?.classList.add('hidden');
  $('overview')?.classList.remove('hidden');
}

function showDashboardSection(sectionId = 'overview') {
  const panelMap = {
    overview: 'dashboardOverviewPanel',
    'jobs-panel': 'jobs-panel',
    'academy-panel': 'academy-panel',
    'wallet-panel': 'wallet-panel',
    'giftcards-panel': 'giftcards-panel',
    'products-panel': 'products-panel',
    'crypto-panel': 'crypto-panel',
    'applications-panel': 'applications-panel',
    'support-panel': 'support-panel'
  };
  const targetId = panelMap[sectionId] || 'dashboardOverviewPanel';
  document.querySelectorAll('.dashboard-switch-panel').forEach(panel => panel.classList.add('hidden'));
  $(targetId)?.classList.remove('hidden');
  document.querySelectorAll('[data-dashboard-section]').forEach(link => link.classList.toggle('active', link.dataset.dashboardSection === sectionId));
}

function setupDashboardNavigation() {
  document.querySelectorAll('[data-dashboard-section]').forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const sectionId = link.dataset.dashboardSection;
      showDashboardSection(sectionId);
      history.pushState({ sectionId }, '', `#${sectionId}`);
    });
  });
  const hash = window.location.hash.replace('#', '');
  showDashboardSection(hash || 'overview');
  window.addEventListener('hashchange', () => showDashboardSection(window.location.hash.replace('#', '') || 'overview'));
  window.addEventListener('popstate', () => showDashboardSection(window.location.hash.replace('#', '') || 'overview'));
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadCryptoPanel() {
  if (!$('cryptoMarketsList')) return;
  try {
    const data = await request('/crypto/markets');
    const markets = data.markets || [];
    setText('cryptoProviderStatus', data.configured ? 'Live' : 'Not configured');
    setText('cryptoMarketCount', markets.length);
    setHTML('cryptoMarketsList', markets.length ? markets.slice(0, 12).map(m => `<div class="mini-card"><strong>${esc(m.pair)}</strong><div class="job-meta">Ask: ${esc(m.ask || m.lastTrade || 0)} · Bid: ${esc(m.bid || 0)}</div></div>`).join('') : `<div class="mini-card">${esc(data.message || 'No market prices loaded yet.')}</div>`);
  } catch (error) {
    setText('cryptoProviderStatus', 'Unavailable');
    setHTML('cryptoMarketsList', `<div class="mini-card">Crypto unavailable: ${esc(error.message)}</div>`);
  }
}

function setupCryptoPanel() {
  const form = $('cryptoQuoteForm');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const fd = new FormData(form);
      const data = await request('/crypto/calculate', { method: 'POST', body: JSON.stringify({ pair: fd.get('pair'), amount: fd.get('amount') }) });
      $('cryptoQuoteOutput').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      $('cryptoQuoteOutput').textContent = error.message;
    }
  });
}

function writeSpTokenOutput(data) {
  const out = $('spTokenOutput');
  if (!out) return;
  out.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

async function loadSpTokenHistory() {
  const list = $('spTokenHistoryList');
  if (!list || !state.token) return;
  try {
    const data = await request('/sp-token/mine');
    const vouchers = data.vouchers || [];
    list.innerHTML = vouchers.length ? vouchers.map(v => {
      const canRedeem = v.purpose === 'job_payout' && v.status === 'active' && v.claimCode;
      return `<div class="mini-card"><strong>${esc((v.purpose || 'deposit').replace('_',' ').toUpperCase())} SP Token</strong><div class="job-meta">${esc(v.currency)} ${Number(v.amount || 0).toLocaleString()} · Status: ${esc(v.status)} · Code: ${esc(v.codeMasked || 'Not revealed yet')}</div>${canRedeem ? `<div class="job-meta"><strong>Redeem code:</strong> ${esc(v.claimCode)}</div><button class="primary" data-redeem-token="${esc(v.claimCode)}">Redeem This Job Token</button>` : ''}</div>`;
    }).join('') : '<div class="mini-card">No SP Token deposit, job payout, or withdrawal records yet.</div>';
    document.querySelectorAll('[data-redeem-token]').forEach(btn => btn.addEventListener('click', async () => {
      try {
        const data = await request('/sp-token/redeem', { method: 'POST', body: JSON.stringify({ code: btn.dataset.redeemToken }) });
        writeSpTokenOutput(data);
        setStatus('withdrawStatus', data.message);
        await loadSpTokenHistory();
        await loadDashboard();
      } catch (error) { setStatus('withdrawStatus', error.message, true); writeSpTokenOutput(error.message); }
    }));
  } catch (error) {
    list.innerHTML = `<div class="mini-card">SP Token history unavailable: ${esc(error.message)}</div>`;
  }
}

function setupSpTokenForms() {
  $('spTokenDepositForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await request('/sp-token/deposit/checkout', { method: 'POST', body: JSON.stringify({ amount: Number(form.get('amount')), currency: form.get('currency'), callbackUrl: `${location.origin}${location.pathname}#wallet-panel` }) });
      writeSpTokenOutput(data);
      setStatus('withdrawStatus', data.message);
      if (data.authorizationUrl) window.open(data.authorizationUrl, '_blank', 'noopener');
      await loadSpTokenHistory();
    } catch (error) { setStatus('withdrawStatus', error.message, true); writeSpTokenOutput(error.message); }
  });

  $('spTokenVerifyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const ref = encodeURIComponent(form.get('reference'));
      const data = await request(`/sp-token/deposit/verify/${ref}`, { method: 'POST' });
      writeSpTokenOutput(data);
      setStatus('withdrawStatus', data.message);
      await loadSpTokenHistory();
    } catch (error) { setStatus('withdrawStatus', error.message, true); writeSpTokenOutput(error.message); }
  });

  $('spTokenRedeemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await request('/sp-token/redeem', { method: 'POST', body: JSON.stringify({ code: form.get('code') }) });
      writeSpTokenOutput(data);
      setStatus('withdrawStatus', data.message);
      e.target.reset();
      await loadSpTokenHistory();
      await loadDashboard();
    } catch (error) { setStatus('withdrawStatus', error.message, true); writeSpTokenOutput(error.message); }
  });
}

function renderDashboardJobs(jobs) {
  setText('jobsCount', jobs.length);
  setHTML('dashboardJobs', jobs.length ? jobs.map(job => `
    <div class="job-card dashboard-apply-card">
      <h4 class="job-title">${esc(job.title)}</h4>
      <p>${esc(job.shortDescription || job.description || '').slice(0, 240)}</p>
      <div class="job-meta">Company: ${esc(job.company || 'SP WorldTech')} · Location: ${esc(job.location || 'Remote')} · ${esc(job.salary || 'Salary not disclosed')}</div>
      <div class="job-meta">${esc(job.workMode || 'Remote')} · ${esc(job.employmentType || 'Full-time')} · ${esc(job.experienceLevel || 'Not specified')}</div>
      <form class="job-application-form" data-application-form="${job._id}">
        <input type="file" name="resume" accept=".pdf,.doc,.docx,.txt" required />
        <textarea name="coverLetter" placeholder="Optional cover letter"></textarea>
        <input name="portfolioUrl" placeholder="Optional portfolio URL" />
        <input name="skills" placeholder="Optional skills, comma separated" />
        <button class="primary" type="submit">Submit Application</button>
        <button class="secondary" type="button" data-save-job="${job._id}">Save Job</button>
      </form>
      <div class="job-meta">Applications are stored for SP WorldTech review only. Documents are not sent automatically to clients.</div>
    </div>`).join('') : '<div class="mini-card">No jobs available right now.</div>');

  document.querySelectorAll('[data-application-form]').forEach(form => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const fd = new FormData(form);
        const file = fd.get('resume');
        if (!file || !file.name) throw new Error('Please upload your resume.');
        const result = await request('/applications', { method: 'POST', body: JSON.stringify({
          jobId: form.dataset.applicationForm,
          resume: { filename: file.name, mimeType: file.type, size: file.size, dataUrl: await fileToDataUrl(file) },
          coverLetter: fd.get('coverLetter') || '',
          portfolioUrl: fd.get('portfolioUrl') || '',
          skills: fd.get('skills') || ''
        }) });
        setStatus('withdrawStatus', result.message);
        await loadDashboard();
      } catch (error) { setStatus('withdrawStatus', error.message, true); }
    });
  });
  document.querySelectorAll('[data-save-job]').forEach(btn => btn.addEventListener('click', async () => {
    try { const result = await request(`/jobs/${btn.dataset.saveJob}/save`, { method: 'POST' }); setStatus('withdrawStatus', result.message); await loadSavedJobs(); }
    catch (error) { setStatus('withdrawStatus', error.message, true); }
  }));
}

async function loadRemoteJobs(query = 'remote software developer jobs') {
  try {
    const data = await request(`/jobs/search?q=${encodeURIComponent(query)}&limit=30&remote=true`);
    renderDashboardJobs(data.jobs || []);
    await loadSavedJobs();
  } catch (error) {
    setStatus('withdrawStatus', `Jobs unavailable: ${error.message}`, true);
    setHTML('dashboardJobs', `<div class="mini-card">Jobs unavailable: ${esc(error.message)}</div>`);
  }
}

async function loadSavedJobs() {
  try {
    const data = await request('/jobs/saved/me');
    setHTML('savedJobsList', (data.savedJobs || []).length ? data.savedJobs.map(item => `<div class="mini-card"><strong>${esc(item.job?.title || 'Saved Job')}</strong><div class="job-meta">${esc(item.job?.company || '')} · ${esc(item.job?.location || 'Remote')}</div><button class="danger" data-remove-saved-job="${item.job?._id}">Remove</button></div>`).join('') : '<div class="mini-card">No saved jobs yet.</div>');
    document.querySelectorAll('[data-remove-saved-job]').forEach(btn => btn.addEventListener('click', async () => { await request(`/jobs/${btn.dataset.removeSavedJob}/save`, { method: 'DELETE' }); await loadSavedJobs(); }));
  } catch (error) { setHTML('savedJobsList', `<div class="mini-card">Saved jobs unavailable: ${esc(error.message)}</div>`); }
}

function renderApplications(applications) {
  setText('applicationsCount', applications.length);
  setHTML('applicationsList', applications.length ? applications.map(app => `
    <div class="application-card">
      <strong>${app.job?.title || 'Job'}</strong>
      <div class="job-meta">Status: ${app.status}</div>
      <div class="job-meta">Approved SP Token payout: ${money(app.userVisibleAmount)} · Redeem voucher into your wallet balance before withdrawal</div>
      <div class="job-meta">Resume: ${app.resume?.filename || 'Stored securely'}</div>
      ${app.status === 'Submitted' ? `<button class="primary" data-submit-app="${app._id}">Move to Under Review</button>` : ''}
      ${app.status === 'Under Review' ? '<div class="job-meta">SP WorldTech is reviewing before any client outreach.</div>' : ''}
      ${app.status === 'Accepted' ? '<div class="job-meta">Application accepted.</div>' : ''}
    </div>
  `).join('') : '<div class="mini-card">No applications yet.</div>');

  document.querySelectorAll('[data-submit-app]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const result = await request(`/applications/${btn.dataset.submitApp}/submit`, { method: 'POST' });
        setStatus('withdrawStatus', result.message);
        await loadDashboard();
      } catch (error) {
        setStatus('withdrawStatus', error.message, true);
      }
    });
  });
}

function renderChat(messages = []) {
  setText('messagesCount', messages.length);
  setHTML('chatMessages', messages.length ? messages.map(msg => `
    <div class="chat-bubble ${msg.senderRole === 'user' ? 'user' : 'staff'}"><strong>${msg.senderName}</strong><p>${msg.message}</p></div>
  `).join('') : '<div class="mini-card">No messages yet.</div>');
}

function renderProductRequests(requests = []) {
  const el = $('productRequestsList');
  if (!el) return;
  el.innerHTML = requests.length ? requests.map(item => `
    <div class="mini-card product-request-history">
      <strong>${item.productType}</strong>
      <div class="job-meta">Service: SP WorldTech · Status: ${item.status}</div>
      <div class="job-meta">Fee: ${item.feeCurrency === 'USD' ? '$' : '₦'}${Number(item.feeAmount || 0).toLocaleString()}</div>
      <div class="job-meta">${item.providerMessage || 'Request saved for SP WorldTech review.'}</div>
    </div>
  `).join('') : '<div class="mini-card">No Banking product requests yet.</div>';
}

function renderAcademy(data = {}) {
  state.academyCourses = data.courses || [];
  const progressMap = new Map((data.progress || []).map(item => [item.courseId, item]));
  setText('certificatesCount', (data.certificates || []).length);
  setHTML('dashboardAcademyCourses', state.academyCourses.map(course => {
    const progress = progressMap.get(course.id) || {};
    const percent = course.lessons ? Math.round(((progress.completedLessons || 0) / course.lessons) * 100) : 0;
    const done = progress.status === 'completed';
    return `<article class="info-card academy-course-card">
      <a class="course-card-open" href="./${course.page || `academy-course.html?course=${course.id}`}"><div class="course-icon">${course.icon}</div><h3>${course.title}</h3><p>${course.skill}</p></a>
      <div class="job-meta">${course.level} · ${course.lessons} lessons · ${percent}% complete</div>
      <div class="course-actions"><a class="secondary plain-anchor-btn" href="./${course.page || `academy-course.html?course=${course.id}`}">Open Course</a><button class="secondary" data-complete-course="${course.id}">Mark Completed</button><button class="primary" data-issue-cert="${course.id}" ${done ? '' : 'disabled'}>Certificate</button></div>
    </article>`;
  }).join(''));
  const select = $('aiTutorCourseSelect');
  if (select) select.innerHTML = '<option value="">Choose course</option>' + state.academyCourses.map(c => `<option value="${c.id}">${c.icon} ${c.title}</option>`).join('');
  setHTML('certificatesList', (data.certificates || []).length ? `<h3>My Certificates</h3>` + data.certificates.map(c => `<div class="mini-card"><strong>${c.courseTitle}</strong><div class="job-meta">Certificate ID: ${c.certificateId}</div><a class="secondary plain-anchor-btn" href="./certificate.html?id=${encodeURIComponent(c.certificateId)}">Verify / View</a></div>`).join('') : '<div class="mini-card">No certificates issued yet.</div>');

  document.querySelectorAll('[data-complete-course]').forEach(btn => btn.addEventListener('click', async () => {
    const course = state.academyCourses.find(c => c.id === btn.dataset.completeCourse);
    await request('/academy/progress', { method: 'POST', body: JSON.stringify({ courseId: course.id, completedLessons: course.lessons, quizScore: 90, assignmentSubmitted: true, finalProjectSubmitted: true }) });
    await loadAcademy();
  }));
  document.querySelectorAll('[data-issue-cert]').forEach(btn => btn.addEventListener('click', async () => {
    const data = await request('/academy/certificate', { method: 'POST', body: JSON.stringify({ courseId: btn.dataset.issueCert }) });
    setStatus('withdrawStatus', data.message);
    await loadAcademy();
  }));
}

async function loadAcademy() {
  try { renderAcademy(await request('/academy/me')); }
  catch (error) {
    setHTML('dashboardAcademyCourses', `<div class="mini-card">Academy unavailable: ${esc(error.message)}</div>`);
    setStatus('withdrawStatus', error.message, true);
  }
}


function ensureDashboardLoader() {
  if (document.getElementById('dashboardFastLoader')) return document.getElementById('dashboardFastLoader');
  const loader = document.createElement('div');
  loader.id = 'dashboardFastLoader';
  loader.className = 'dashboard-fast-loader hidden';
  loader.innerHTML = '<div class="dashboard-fast-loader-card"><div class="loader-pulse"></div><strong>Loading live dashboard</strong><span>Fast mode active · 10s request protection · cached data remains visible.</span></div>';
  document.body.appendChild(loader);
  return loader;
}
function setDashboardBusy(isBusy, message = '') {
  state.loading = Boolean(isBusy);
  const loader = ensureDashboardLoader();
  loader.classList.toggle('hidden', !isBusy);
  const refreshBtn = $('refreshDashboardBtn');
  if (refreshBtn) {
    refreshBtn.disabled = Boolean(isBusy);
    refreshBtn.textContent = isBusy ? 'Loading...' : 'Refresh';
  }
  if (message) setStatus('withdrawStatus', message, false);
}
function saveDashboardSnapshot(snapshot = {}) {
  try { localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), snapshot })); } catch (_error) {}
}
function loadDashboardSnapshot() {
  try { return JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || 'null'); } catch (_error) { return null; }
}
function warmBackendFast() {
  if (!window.spFetch) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  window.spFetch('/health', { signal: controller.signal }).catch(() => null).finally(() => clearTimeout(timeout));
}

async function loadDashboard() {
  if (!state.token || !state.user) { showAuthRequired(); return; }
  if (state.loading) return;
  showDashboardReady();
  setText('dashboardWelcome', `Welcome, ${state.user.fullName || 'User'}`);
  const cached = loadDashboardSnapshot();
  if (cached?.snapshot?.wallet) {
    const wallet = cached.snapshot.wallet;
    setText('walletUsd', money(wallet.usdBalance, 'USD'));
    setText('walletNgn', money(wallet.ngnBalance, 'NGN'));
    setText('visibleEarnings', money(wallet.visibleEarnings, 'USD'));
    setText('visibleEarningsSummary', money(wallet.visibleEarnings, 'USD'));
  }
  warmBackendFast();
  setDashboardBusy(true, 'Loading dashboard live data...');
  const walletPromise = request('/wallet/me', { timeoutMs: 10000 })
    .then(walletData => {
      const wallet = walletData.wallet || { usdBalance: 0, ngnBalance: 0, visibleEarnings: 0 };
      setText('walletUsd', money(wallet.usdBalance, 'USD'));
      setText('walletNgn', money(wallet.ngnBalance, 'NGN'));
      setText('visibleEarnings', money(wallet.visibleEarnings, 'USD'));
      setText('visibleEarningsSummary', money(wallet.visibleEarnings, 'USD'));
      renderProductRequests(walletData.productRequests || []);
      saveDashboardSnapshot({ wallet });
    })
    .catch(error => { setStatus('withdrawStatus', `Wallet unavailable: ${error.message}`, true); renderProductRequests([]); });

  const applicationPromise = request('/applications/me', { timeoutMs: 10000 })
    .then(data => renderApplications(data.applications || []))
    .catch(error => setHTML('applicationsList', `<div class="mini-card">Applications unavailable: ${esc(error.message)}</div>`));

  const chatPromise = request('/chat/me', { timeoutMs: 10000 })
    .then(data => renderChat(data.messages || []))
    .catch(error => setHTML('chatMessages', `<div class="mini-card">Support unavailable: ${esc(error.message)}</div>`));

  const backgroundLoads = [loadRemoteJobs(), loadAcademy(), loadCryptoPanel(), loadSpTokenHistory()];
  await Promise.allSettled([walletPromise, applicationPromise, chatPromise, ...backgroundLoads]);
  setDashboardBusy(false, 'Dashboard updated.');
}

function setupOneDashboardShortcuts() {
  const productSelect = document.querySelector('#cardRequestForm select[name="productType"]');
  document.querySelectorAll('[data-product-type]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showDashboardSection('products-panel');
      history.pushState({ sectionId: 'products-panel' }, '', '#products-panel');
      if (productSelect) productSelect.value = link.dataset.productType || '';
      document.getElementById('cardRequestForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateSidebarSession();
  ensureDashboardLoader();
  setupDashboardNavigation();
  setupCryptoPanel();
  setupSpTokenForms();
  setupOneDashboardShortcuts();
  $('logoutBtn')?.addEventListener('click', logout);
  $('refreshDashboardBtn')?.addEventListener('click', loadDashboard);

  $('remoteJobSearchForm')?.addEventListener('submit', async (e) => { e.preventDefault(); const form = new FormData(e.target); await loadRemoteJobs(form.get('q') || 'remote software developer jobs'); });

  $('aiTutorForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const form = new FormData(e.target); const out = $('aiTutorOutput'); out.textContent = 'Generating academic content...';
    try { const data = await request('/academy/tutor', { method: 'POST', body: JSON.stringify({ courseId: form.get('courseId'), topic: form.get('topic'), promptType: form.get('promptType') }) }); out.textContent = data.content || JSON.stringify(data, null, 2); } catch (error) { out.textContent = error.message; }
  });

  $('withdrawForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const form = new FormData(e.target);
    try { const data = await request('/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount: Number(form.get('amount')), channel: form.get('channel'), currency: form.get('currency') || 'USD' }) }); setStatus('withdrawStatus', data.message); writeSpTokenOutput(data); e.target.reset(); await loadSpTokenHistory(); await loadDashboard(); } catch (error) { setStatus('withdrawStatus', error.message, true); writeSpTokenOutput(error.message); }
  });

  $('cardRequestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const form = new FormData(e.target);
    try { const data = await request('/wallet/product-request', { method: 'POST', body: JSON.stringify(Object.fromEntries(form.entries())) }); setStatus('cardRequestStatus', data.message); e.target.reset(); await loadDashboard(); } catch (error) { setStatus('cardRequestStatus', error.message, true); }
  });

  $('chatForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const form = new FormData(e.target);
    try { await request('/chat/send', { method: 'POST', body: JSON.stringify({ message: form.get('message') }) }); e.target.reset(); await loadDashboard(); } catch (error) { setStatus('withdrawStatus', error.message, true); }
  });

  loadDashboard();
});
