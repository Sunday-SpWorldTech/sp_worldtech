const JOBS_service_BASE = window.APP_CONFIG.service_BASE_URL;
const jobsBoard = document.getElementById('jobsBoard');
const jobsBoardStatus = document.getElementById('jobsBoardStatus');
const jobPreviewModal = document.getElementById('jobPreviewModal');
const jobPreviewContent = document.getElementById('jobPreviewContent');
const closeJobPreview = document.getElementById('closeJobPreview');
const jobsFilterForm = document.getElementById('jobsFilterForm');
const resetJobFilters = document.getElementById('resetJobFilters');
const jobsPagination = document.getElementById('jobsPagination');
const jobsPaginationTop = document.getElementById('jobsPaginationTop');
let jobsCache = [];
let currentPage = 1;
let currentMeta = { page: 1, pages: 1, total: 0 };

function esc(value = '') {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function dateText(value) {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleDateString();
}

function moneyLabel(job) {
  if (job.salary) return job.salary;
  if (job.salaryAmount) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(job.salaryAmount));
  if (job.userVisibleAmount) return `Approved payout: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(job.userVisibleAmount))}`;
  return 'Salary not disclosed';
}

function buildQuery(page = 1) {
  const params = new URLSearchParams({ page, limit: 12 });
  const form = new FormData(jobsFilterForm);
  for (const [key, value] of form.entries()) {
    if (String(value || '').trim()) params.set(key, String(value).trim());
  }
  return params.toString();
}

function showSkeletons() {
  jobsBoard.innerHTML = Array.from({ length: 6 }).map(() => `<article class="job-card public-job-card skeleton-card"><div></div><div></div><div></div><div></div></article>`).join('');
}

function chipList(items = []) {
  return (items || []).slice(0, 5).map(item => `<span class="job-skill-chip">${esc(item)}</span>`).join('');
}

function renderJobs(jobs) {
  if (!jobs.length) {
    jobsBoard.innerHTML = '<div class="mini-card empty-state-card"><strong>No real jobs found.</strong><p>Try another keyword, skill, country, or posted-date filter. SP WorldTech only shows available opportunities from approved recruitment sources.</p></div>';
    return;
  }
  jobsBoard.innerHTML = jobs.map((job) => `
    <article class="job-card public-job-card professional-job-card">
      <div class="job-company-row">
        <div class="company-logo-box">${job.companyLogo ? `<img src="${esc(job.companyLogo)}" alt="${esc(job.company)} logo" />` : esc((job.company || 'SP').slice(0, 2).toUpperCase())}</div>
        <div><strong>${esc(job.company || 'Company')}</strong><div class="job-meta">${esc(job.location || 'Remote')} ${job.country ? `· ${esc(job.country)}` : ''}</div></div>
      </div>
      <h3 class="job-title">${esc(job.title)}</h3>
      <p>${esc(job.shortDescription || job.description || '').slice(0, 260)}</p>
      <div class="job-pill-row"><span>${esc(job.workMode || 'Remote')}</span><span>${esc(job.employmentType || 'Full-time')}</span><span>${esc(job.experienceLevel || 'Not specified')}</span></div>
      <div class="job-skill-row">${chipList(job.skills)}</div>
      <div class="job-meta"><strong>${esc(moneyLabel(job))}</strong></div>
      <div class="job-meta">Posted: ${dateText(job.postedAt || job.createdAt)} · Deadline: ${dateText(job.closingDate || job.dueDate)}</div>
      <div class="job-card-actions">
        <button class="primary" data-job-preview="${esc(job._id)}">View Details</button>
        <a class="secondary plain-anchor-btn" href="./login.html?next=./dashboard.html#jobs-panel">Apply</a>
        <button class="secondary" data-save-job="${esc(job._id)}">Save</button>
        <button class="secondary" data-share-job="${esc(job._id)}">Share</button>
      </div>
    </article>
  `).join('');

  document.querySelectorAll('[data-job-preview]').forEach(btn => btn.addEventListener('click', () => openPreview(jobsCache.find(item => String(item._id) === String(btn.dataset.jobPreview)))));
  document.querySelectorAll('[data-save-job]').forEach(btn => btn.addEventListener('click', () => saveJob(btn.dataset.saveJob)));
  document.querySelectorAll('[data-share-job]').forEach(btn => btn.addEventListener('click', () => shareJob(jobsCache.find(item => String(item._id) === String(btn.dataset.shareJob)))));
}

function renderPagination() {
  const markup = currentMeta.pages > 1 ? `
    <button class="secondary" ${currentMeta.page <= 1 ? 'disabled' : ''} data-page="${currentMeta.page - 1}">Previous</button>
    <span>Page ${currentMeta.page} of ${currentMeta.pages} · ${currentMeta.total} jobs</span>
    <button class="secondary" ${currentMeta.page >= currentMeta.pages ? 'disabled' : ''} data-page="${currentMeta.page + 1}">Next</button>
  ` : `<span>${currentMeta.total || jobsCache.length} real job${(currentMeta.total || jobsCache.length) === 1 ? '' : 's'} found</span>`;
  [jobsPagination, jobsPaginationTop].forEach(target => {
    if (!target) return;
    target.innerHTML = markup;
    target.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => loadJobs(Number(btn.dataset.page))));
  });
}

function detailsList(title, items = []) {
  if (!items || !items.length) return '';
  return `<h3>${title}</h3><ul class="pricing-features">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function openPreview(job) {
  if (!job) return;
  jobPreviewContent.innerHTML = `
    <span class="eyebrow dark">SP WORLDTECH JOB DETAILS</span>
    <h2>${esc(job.title)}</h2>
    <div class="job-company-row details-company-row"><div class="company-logo-box">${job.companyLogo ? `<img src="${esc(job.companyLogo)}" alt="${esc(job.company)} logo" />` : esc((job.company || 'SP').slice(0, 2).toUpperCase())}</div><div><strong>${esc(job.company || 'Company')}</strong><div class="job-meta">${esc(job.location || 'Remote')} ${job.country ? `· ${esc(job.country)}` : ''}</div></div></div>
    <div class="job-preview-stats"><div><strong>${esc(moneyLabel(job))}</strong><span>Salary</span></div><div><strong>${esc(job.employmentType || 'Full-time')}</strong><span>Employment type</span></div><div><strong>${esc(job.experienceLevel || 'Not specified')}</strong><span>Experience</span></div></div>
    <h3>Full Description</h3><p>${esc(job.description || 'No description available.')}</p>
    ${detailsList('Responsibilities', job.responsibilities)}
    ${detailsList('Requirements', job.requirements)}
    ${detailsList('Required Skills', job.skills)}
    ${detailsList('Benefits', job.benefits)}
    <h3>Company Information</h3><p>${esc(job.companyInfo || job.company || 'Company information is not available from the job source.')}</p>
    <div class="job-meta">Posted: ${dateText(job.postedAt || job.createdAt)} · Closing: ${dateText(job.closingDate || job.dueDate)}</div>
    <div class="hero-actions"><a class="primary large plain-anchor-btn" href="./login.html?next=./dashboard.html#jobs-panel">Apply inside SP WorldTech</a><button class="secondary large" data-save-job="${esc(job._id)}">Save Job</button><button class="secondary large" data-share-current>Share Job</button></div>
    <p class="status-text">SP WorldTech stores applications for internal review only. Applicant documents are never sent automatically to clients.</p>
  `;
  jobPreviewModal.classList.remove('hidden');
  jobPreviewContent.querySelector('[data-save-job]')?.addEventListener('click', () => saveJob(job._id));
  jobPreviewContent.querySelector('[data-share-current]')?.addEventListener('click', () => shareJob(job));
}

function closePreview() { jobPreviewModal.classList.add('hidden'); }

async function saveJob(jobId) {
  const token = localStorage.getItem('spworldtech_user_token');
  if (!token) { window.location.href = './login.html?next=./dashboard.html#jobs-panel'; return; }
  try {
    const res = await fetch(`${JOBS_service_BASE}/jobs/${jobId}/save`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0, 80) || res.statusText}`); }
    if (!res.ok) throw new Error(data.message || 'Unable to save job');
    jobsBoardStatus.textContent = data.message;
  } catch (error) { jobsBoardStatus.textContent = error.message; }
}

async function shareJob(job) {
  if (!job) return;
  const link = `${location.origin}${location.pathname}?job=${encodeURIComponent(job._id)}`;
  const text = `${job.title} at ${job.company || 'Company'} - ${link}`;
  if (navigator.share) { try { await navigator.share({ title: job.title, text, url: link }); return; } catch (_) {} }
  await navigator.clipboard?.writeText(text).catch(() => null);
  const shareHtml = `<div class="share-options"><a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">WhatsApp</a><a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}">Facebook</a><a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}">LinkedIn</a><a href="mailto:?subject=${encodeURIComponent(job.title)}&body=${encodeURIComponent(text)}">Email</a></div>`;
  jobsBoardStatus.innerHTML = `Job link copied. ${shareHtml}`;
}

async function loadJobs(page = 1) {
  currentPage = page;
  showSkeletons();
  jobsBoardStatus.textContent = 'Loading real job opportunities from SP WorldTech recruitment service cache...';
  try {
    const response = await fetch(`${JOBS_service_BASE}/jobs/public?${buildQuery(page)}`);
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_error) { throw new Error(`Platform returned non-JSON response: ${text.slice(0, 80) || response.statusText}`); }
    if (!response.ok) throw new Error(data.message || 'Unable to load jobs');
    jobsCache = data.jobs || [];
    currentMeta = data.meta || { page, pages: 1, total: jobsCache.length };
    jobsBoardStatus.textContent = `${currentMeta.total || jobsCache.length} real job opportunities loaded.`;
    renderJobs(jobsCache);
    renderPagination();
    const targetJob = new URLSearchParams(location.search).get('job');
    if (targetJob) openPreview(jobsCache.find(job => String(job._id) === targetJob));
  } catch (error) {
    jobsCache = [];
    currentMeta = { page: 1, pages: 1, total: 0 };
    jobsBoardStatus.textContent = `Jobs unavailable: ${error.message}`;
    jobsBoard.innerHTML = '<div class="mini-card empty-state-card"><strong>No real jobs are available right now.</strong><p>Our recruitment service is being updated. Please refresh or search again shortly.</p></div>';
    renderPagination();
  }
}

closeJobPreview?.addEventListener('click', closePreview);
jobPreviewModal?.addEventListener('click', (event) => { if (event.target === jobPreviewModal) closePreview(); });
jobsFilterForm?.addEventListener('submit', (event) => { event.preventDefault(); loadJobs(1); });
resetJobFilters?.addEventListener('click', () => { jobsFilterForm.reset(); loadJobs(1); });
document.addEventListener('DOMContentLoaded', () => loadJobs(currentPage));
