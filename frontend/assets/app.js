const service_BASE = (window.APP_CONFIG && window.APP_CONFIG.service_BASE_URL) || 'https://sp-worldtech-backend.onrender.com/api';
const tokenKey = 'spworldtech_user_token';
const userKey = 'spworldtech_user_profile';

const state = {
  token: localStorage.getItem(tokenKey),
  user: JSON.parse(localStorage.getItem(userKey) || 'null'),
  previewJobs: []
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

function openAuth(type) {
  window.location.href = type === 'signup' ? './signup.html' : './login.html';
}

function closeAuth() {
  const overlay = $('authOverlay');
  if (overlay) overlay.classList.add('hidden');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await (window.spFetch ? window.spFetch(path, { ...options, headers }) : fetch(`${service_BASE}${path}`, { ...options, headers }));
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0, 80) || res.statusText}`); }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function saveAuth(payload) {
  state.token = payload.token;
  state.user = payload.user;
  localStorage.setItem(tokenKey, payload.token);
  localStorage.setItem(userKey, JSON.stringify(payload.user));
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  $('userDashboardSection').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPreviewJobs(jobs) {
  const target = $('publicJobsPreview');
  if (!target) return;
  target.innerHTML = jobs.slice(0, 9).map(job => `
    <article class="info-card">
      <h3 class="job-title">${esc(job.title)}</h3>
      <p>${esc(job.shortDescription || job.description || '').slice(0, 220)}</p>
      <div class="job-meta">${esc(job.company || 'Hiring Company')} · ${esc(job.location || 'Remote')} · ${esc(job.salary || 'Salary not disclosed')}</div>
      <a class="secondary plain-anchor-btn" href="./jobs.html?job=${encodeURIComponent(job._id || job.externalId || '')}">View Job</a>
    </article>
  `).join('');
}

function renderDashboardJobs(jobs) {
  $('jobsCount').textContent = jobs.length;
  $('dashboardJobs').innerHTML = jobs.length ? jobs.map(job => `
    <div class="job-card">
      <h4 class="job-title">${job.title}</h4>
      <p>${job.description}</p>
      <div class="job-meta">Category: ${job.category}</div>
      <div class="job-meta">Due: ${new Date(job.dueDate).toLocaleDateString()} · Approved payout: ${money(job.userVisibleAmount)}</div>
      <button class="primary" data-apply-job="${job._id}">Apply for Job</button>
    </div>
  `).join('') : '<div class="mini-card">No jobs available right now.</div>';

  document.querySelectorAll('[data-apply-job]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const result = await request('/applications', {
          method: 'POST',
          body: JSON.stringify({ jobId: btn.dataset.applyJob })
        });
        setStatus('withdrawStatus', result.message);
        await loadDashboard();
      } catch (error) {
        setStatus('withdrawStatus', error.message, true);
      }
    });
  });
}

function renderApplications(applications) {
  $('applicationsCount').textContent = applications.length;
  $('applicationsList').innerHTML = applications.length ? applications.map(app => `
    <div class="application-card">
      <strong>${app.job?.title || 'Job'}</strong>
      <div class="job-meta">Status: ${app.status}</div>
      <div class="job-meta">Approved SP Token payout: ${money(app.userVisibleAmount)} · Redeem voucher into your wallet balance before withdrawal</div>
      ${app.status === 'applied' ? `<button class="primary" data-submit-app="${app._id}">Submit Job Done</button>` : ''}
      ${app.status === 'under_review' ? '<div class="job-meta">Waiting for staff approval before wallet payment.</div>' : ''}
      ${app.status === 'approved' || app.status === 'Accepted' ? '<div class="job-meta">SP Token payout voucher issued. Open Wallet and redeem it into your balance.</div>' : ''}
    </div>
  `).join('') : '<div class="mini-card">No applications yet.</div>';

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
  $('messagesCount').textContent = messages.length;
  $('chatMessages').innerHTML = messages.length ? messages.map(msg => `
    <div class="chat-bubble ${msg.senderRole === 'user' ? 'user' : 'staff'}">
      <strong>${msg.senderName}</strong>
      <p>${msg.message}</p>
    </div>
  `).join('') : '<div class="mini-card">No messages yet.</div>';
}

async function loadDashboard() {
  if (!state.token || !state.user) return;
  try {
    const [jobsData, walletData, appsData, chatData] = await Promise.all([
      request('/jobs?limit=100'),
      request('/wallet/me'),
      request('/applications/me'),
      request('/chat/me')
    ]);

    const wallet = walletData.wallet || { usdBalance: 0, ngnBalance: 0, visibleEarnings: 0 };
    $('userDashboardSection').classList.remove('hidden');
    $('dashboardWelcome').textContent = `Welcome, ${state.user.fullName}`;
    $('walletUsd').textContent = money(wallet.usdBalance, 'USD');
    $('walletNgn').textContent = money(wallet.ngnBalance, 'NGN');
    $('visibleEarnings').textContent = money(wallet.visibleEarnings, 'USD');
    renderDashboardJobs(jobsData.jobs || []);
    renderApplications(appsData.applications || []);
    renderChat(chatData.messages || []);
  } catch (error) {
    setStatus('loginStatus', error.message, true);
  }
}

async function loadPublicJobs() {
  const target = $('publicJobsPreview');
  if (!target) return;
  try {
    const data = await request('/jobs/public?limit=9');
    state.previewJobs = data.jobs || [];
    renderPreviewJobs(state.previewJobs);
  } catch (error) {
    target.innerHTML = `<div class="mini-card">Jobs unavailable: ${esc(error.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPublicJobs();
  ['openJoinBtn','openJoinBtnMobile','heroJoinBtn','jobsJoinBtn'].forEach(id => $(id)?.addEventListener('click', (e) => { e.preventDefault?.(); openAuth('signup'); }));
  ['openLoginBtn','openLoginBtnMobile','heroLoginBtn'].forEach(id => $(id)?.addEventListener('click', (e) => { e.preventDefault?.(); openAuth('login'); }));
  $('closeAuthBtn')?.addEventListener('click', closeAuth);
  $('mobileMenuBtn')?.addEventListener('click', () => $('mobileMenu').classList.toggle('hidden'));
  document.querySelectorAll('[data-auth-switch]').forEach(btn => btn.addEventListener('click', () => openAuth(btn.dataset.authSwitch)));
  $('logoutBtn')?.addEventListener('click', logout);
  $('refreshDashboardBtn')?.addEventListener('click', loadDashboard);

  $('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const payload = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.get('fullName'),
          email: form.get('email'),
          password: form.get('password')
        })
      });
      saveAuth(payload);
      setStatus('signupStatus', 'Signup successful. Dashboard unlocked.');
      closeAuth();
      window.location.href = './dashboard.html';
    } catch (error) {
      setStatus('signupStatus', error.message, true);
    }
  });

  $('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const payload = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
      });
      saveAuth(payload);
      setStatus('loginStatus', 'Login successful.');
      closeAuth();
      window.location.href = './dashboard.html';
    } catch (error) {
      setStatus('loginStatus', error.message, true);
    }
  });

  $('withdrawForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await request('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(form.get('amount')), channel: form.get('channel'), currency: form.get('currency') || 'USD' })
      });
      setStatus('withdrawStatus', data.message);
      e.target.reset();
      await loadDashboard();
    } catch (error) {
      setStatus('withdrawStatus', error.message, true);
    }
  });

  $('cardRequestForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await request('/wallet/product-request', {
        method: 'POST',
        body: JSON.stringify({
          productType: form.get('productType'),
          firstName: (state.user?.fullName || 'SP').split(' ')[0] || 'SP',
          lastName: (state.user?.fullName || 'WorldTech User').split(' ').slice(1).join(' ') || 'WorldTech User',
          phone: '0000000000',
          country: 'Nigeria'
        })
      });
      setStatus('cardRequestStatus', data.message);
      e.target.reset();
    } catch (error) {
      setStatus('cardRequestStatus', error.message, true);
    }
  });

  $('chatForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      await request('/chat/send', {
        method: 'POST',
        body: JSON.stringify({ message: form.get('message') })
      });
      e.target.reset();
      await loadDashboard();
    } catch (error) {
      setStatus('withdrawStatus', error.message, true);
    }
  });

  $('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    setStatus('contactStatus', 'Message recorded. Connect live email delivery for production use.');
    e.target.reset();
  });

  $('helpBtn')?.addEventListener('click', () => setStatus('loginStatus', 'Use email login or contact support@spworldtech.com'));
});
