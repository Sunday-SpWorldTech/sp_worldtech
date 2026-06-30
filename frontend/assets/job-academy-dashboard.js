(function () {
  const service_BASE = window.APP_CONFIG.service_BASE_URL;
  const token = localStorage.getItem('spworldtech_user_token');
  const user = JSON.parse(localStorage.getItem('spworldtech_user_profile') || 'null');
  const headers = () => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });
  const $ = (id) => document.getElementById(id);
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function request(path, options = {}) {
    if (!token) throw new Error('Please login from UserAccess before using this dashboard.');
    const res = await window.spFetch(path, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'SP WorldTech could not complete this request right now.');
    return data;
  }
  function set(id, html) { const el=$(id); if(el) el.innerHTML=html; }
  function text(id, value) { const el=$(id); if(el) el.textContent=value; }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }

  async function loadJobs(query='remote software developer jobs') {
    text('jobStatus', 'Loading SP WorldTech job opportunities...');
    try {
      const data = await request(`/jobs/search?q=${encodeURIComponent(query)}&limit=40`);
      const jobs = data.jobs || [];
      text('jobStatus', `${jobs.length} jobs loaded. Apply inside SP WorldTech for admin review.`);
      set('jobList', jobs.length ? jobs.map(job => `<article class="sp-dashboard-card"><div class="icon">💼</div><h3>${esc(job.title)}</h3><p>${esc(job.shortDescription || job.description || '').slice(0,260)}</p><div class="job-meta">${esc(job.company || 'Hiring Company')} · ${esc(job.location || 'Remote')} · ${esc(job.salary || 'Salary not disclosed')}</div><form class="job-apply-form" data-job="${job._id}"><input type="file" name="resume" accept=".pdf,.doc,.docx,.txt" required><textarea name="coverLetter" placeholder="Cover letter / why you fit"></textarea><input name="portfolioUrl" placeholder="Portfolio URL"><input name="skills" placeholder="Skills, comma separated"><button class="primary" type="submit">Apply for Job</button></form></article>`).join('') : '<div class="sp-dashboard-card">No jobs found. Try another search.</div>');
      document.querySelectorAll('.job-apply-form').forEach(form => form.addEventListener('submit', applyJob));
    } catch (e) { text('jobStatus', e.message); }
  }
  async function loadRemote() {
    text('jobStatus', 'Searching live remote jobs through SP WorldTech...');
    try {
      const q = $('jobSearchInput')?.value || 'remote software developer jobs';
      const data = await request(`/jobs/remote?q=${encodeURIComponent(q)}&limit=20`);
      text('jobStatus', `${(data.jobs || []).length} remote jobs loaded through SP WorldTech recruitment service.`);
      set('jobList', (data.jobs || []).map(job => `<article class="sp-dashboard-card"><div class="icon">🌍</div><h3>${esc(job.title)}</h3><p>${esc(job.shortDescription || job.description || '').slice(0,260)}</p><div class="job-meta">${esc(job.company)} · ${esc(job.location)} · ${esc(job.salary)}</div><p class="status-text">Review details and apply through SP WorldTech when the job matches your profile.</p></article>`).join('') || '<div class="sp-dashboard-card">No remote jobs found for this search. Try another keyword.</div>');
    } catch (e) { text('jobStatus', e.message); }
  }
  async function applyJob(e) {
    e.preventDefault();
    const fd = new FormData(e.target); const file = fd.get('resume');
    try {
      const dataUrl = await fileToDataUrl(file);
      const data = await request('/jobs/apply'.replace('/jobs/apply','/applications'), { method:'POST', body: JSON.stringify({ jobId:e.target.dataset.job, resume:{ filename:file.name, mimeType:file.type, size:file.size, dataUrl }, coverLetter:fd.get('coverLetter'), portfolioUrl:fd.get('portfolioUrl'), skills:fd.get('skills') }) });
      alert(data.message || 'Application submitted'); loadApplications();
    } catch (err) { alert(err.message); }
  }
  async function loadApplications() {
    try { const data = await request('/applications/me'); set('applicationList', (data.applications || []).map(app => `<div class="sp-dashboard-card"><h3>${esc(app.job?.title || 'Job Application')}</h3><p>Status: <strong>${esc(app.status)}</strong></p><p>Resume: ${esc(app.resume?.filename || 'Stored securely')}</p><p>SP WorldTech admin reviews before client outreach.</p></div>`).join('') || '<div class="sp-dashboard-card">No applications yet.</div>'); } catch(e){ set('applicationList', `<div class="sp-dashboard-card">${esc(e.message)}</div>`); }
  }
  async function loadAcademy() {
    try {
      const data = await request('/academy/me');
      const courses = data.courses || [];
      set('courseGrid', courses.map(c => `<article class="sp-dashboard-card"><div class="icon">${c.icon || '🎓'}</div><h3>${esc(c.title)}</h3><p>${esc(c.skill || c.level || '')}</p><a class="primary plain-anchor-btn" href="./${esc(c.page || 'academy.html')}">Open Course</a></article>`).join(''));
      const select = $('courseSelect'); if (select) select.innerHTML = courses.map(c => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('');
    } catch(e){ set('courseGrid', `<div class="sp-dashboard-card">${esc(e.message)}</div>`); }
  }
  async function askAcademy(e) {
    e.preventDefault();
    const fd = new FormData(e.target); text('academyAiOutput','Generating with SP WorldTech AI...');
    try { const data = await request('/ai/academy', { method:'POST', body: JSON.stringify({ courseId:fd.get('courseId'), promptType:fd.get('promptType'), topic:fd.get('topic'), message:fd.get('message') || fd.get('topic') }) }); text('academyAiOutput', data.answer || data.content || 'No AI response.'); }
    catch(err) { text('academyAiOutput', err.message); }
  }
  document.addEventListener('DOMContentLoaded', () => {
    text('dashName', user?.fullName ? `Welcome, ${user.fullName}` : 'SP WorldTech User Dashboard');
    $('jobSearchForm')?.addEventListener('submit', e => { e.preventDefault(); loadJobs(new FormData(e.target).get('q') || 'remote software developer jobs'); });
    $('remoteJobsBtn')?.addEventListener('click', loadRemote);
    $('academyAskForm')?.addEventListener('submit', askAcademy);
    if ($('jobList')) { loadJobs(); loadApplications(); }
    if ($('courseGrid')) loadAcademy();
  });
})();
