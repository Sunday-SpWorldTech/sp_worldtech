const DEFAULT_REALTIME_JOBS_URL = 'https://api.openwebninja.com/realtime-jobs-data/google-jobs/search';
const DEFAULT_JSEARCH_URL = 'https://api.openwebninja.com/jsearch/search-v2';
const DEFAULT_JOB_SALARY_URL = 'https://api.openwebninja.com/job-salary-data/job-salary';
const DEFAULT_COPILOT_URL = 'https://api.openwebninja.com/copilot/copilot';
const DEFAULT_GEMINI_URL = 'https://api.openwebninja.com/gemini/chat';
const DEFAULT_CHATGPT_URL = 'https://api.openwebninja.com/chatgpt/chat';

function getApiKey() {
  return process.env.OPENWEBNINJA_API_KEY || process.env.JSEARCH_API_KEY || '';
}

function endpoint(name, fallback) {
  return String(process.env[name] || fallback).trim();
}

function buildHeaders(apiKey = getApiKey(), json = false) {
  const headers = {
    Accept: 'application/json',
    'X-API-Key': apiKey,
    'x-api-key': apiKey,
    Authorization: `Bearer ${apiKey}`
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

function asList(value, defaults = []) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String).map(v => v.trim()).filter(Boolean).slice(0, 12);
  if (typeof value === 'string') return value.split(/[,;\n•]/).map(item => item.trim()).filter(Boolean).slice(0, 12);
  return defaults;
}

function first(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '');
}

function pickRows(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const direct = [
    data.jobs, data.data, data.results, data.items, data.organic_results,
    data.search_results, data.google_jobs, data.job_results, data.job_listings,
    data.result?.jobs, data.result?.data, data.result?.results, data.data?.jobs,
    data.data?.results, data.data?.items, data.data?.job_results, data.data?.google_jobs
  ].find(Array.isArray);
  if (direct) return direct;
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object') {
      const nested = pickRows(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function moneyRange(min, max, currency = 'USD', period = '') {
  const m1 = Number(min || 0);
  const m2 = Number(max || 0);
  if (!m1 && !m2) return '';
  const format = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(Number(n || 0));
  const label = m1 && m2 ? `${format(m1)} - ${format(m2)}` : format(m2 || m1);
  return period ? `${label} / ${period}` : label;
}

function normalizeJob(raw = {}, index = 0, source = 'openwebninja') {
  const job = raw.job || raw;
  const title = first(job.job_title, job.title, job.name, job.position, job.role) || '';
  const company = first(job.employer_name, job.company_name, job.company, job.employer, job.organization, job.publisher) || 'Hiring company';
  const locationParts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  const location = job.job_is_remote || job.remote
    ? 'Remote'
    : first(job.location, job.job_location, job.detected_extensions?.location, locationParts.join(', '), job.address) || 'Remote / Flexible';
  const applyOptions = job.apply_options || job.job_apply_options || [];
  const applyLink = first(
    job.job_apply_link,
    job.apply_link,
    job.apply_url,
    job.url,
    job.job_url,
    job.job_google_link,
    job.link,
    applyOptions?.[0]?.link,
    applyOptions?.[0]?.url
  ) || '';
  const description = first(job.job_description, job.description, job.snippet, job.summary, job.highlights) || `${title || 'Job'} opportunity from ${company}.`;
  const salaryMin = first(job.job_min_salary, job.salary_min, job.min_salary, job.extracted_salary?.min, job.salary?.min);
  const salaryMax = first(job.job_max_salary, job.salary_max, job.max_salary, job.extracted_salary?.max, job.salary?.max);
  const salaryCurrency = first(job.job_salary_currency, job.salary_currency, job.currency, job.extracted_salary?.currency) || 'USD';
  const salaryPeriod = first(job.job_salary_period, job.salary_period, job.extracted_salary?.period) || '';
  const salaryAmount = Number(salaryMax || salaryMin || job.salary_amount || job.salaryAmount || job.amount || 0);
  const salary = first(job.salary, job.job_salary, job.compensation, moneyRange(salaryMin, salaryMax, salaryCurrency, salaryPeriod)) || 'Salary not disclosed';
  const skills = asList(first(job.job_required_skills, job.skills, job.required_skills, job.tags), ['Communication', 'Professional delivery']);
  const responsibilities = asList(first(job.job_highlights?.Responsibilities, job.responsibilities, job.job_responsibilities), []);
  const requirements = asList(first(job.job_highlights?.Qualifications, job.requirements, job.qualifications, job.job_requirements), skills);
  const benefits = asList(first(job.job_highlights?.Benefits, job.benefits), []);
  const postedRaw = first(job.job_posted_at_datetime_utc, job.posted_at, job.date, job.detected_extensions?.posted_at);
  const timestamp = first(job.job_posted_at_timestamp, job.posted_at_timestamp);
  const expiresRaw = first(job.job_offer_expiration_datetime_utc, job.expiration_date, job.valid_through, job.closing_date);
  const sourceName = source === 'realtime' ? 'openwebninja_realtime_jobs_data' : source === 'jsearch' ? 'openwebninja_jsearch' : 'openwebninja_job_research_api';
  return {
    externalId: first(job.job_id, job.id, job.job_key, job.cache_id, `${sourceName}-${title}-${company}-${location}-${index}`),
    title,
    company,
    description,
    shortDescription: String(description || '').length > 240 ? `${String(description).slice(0, 240)}...` : String(description || ''),
    responsibilities,
    requirements,
    skills,
    benefits,
    category: first(job.job_publisher, job.publisher, job.category, job.source, 'Remote Tech Jobs'),
    companyLogo: first(job.employer_logo, job.company_logo, job.thumbnail) || '',
    companyInfo: first(job.employer_website, job.company_website, job.via) || '',
    clientEmail: first(job.employer_email, job.client_email) || '',
    clientContact: first(job.employer_contact, job.client_contact) || '',
    location,
    country: first(job.job_country, job.country) || '',
    workMode: job.job_is_remote || job.remote || /remote|work from home|wfh/i.test(`${location} ${title}`) ? 'Remote' : (/hybrid/i.test(location) ? 'Hybrid' : 'On-site'),
    employmentType: first(job.job_employment_type, job.employment_type, job.job_type, job.schedule_type, 'Full-time'),
    experienceLevel: job.job_required_experience?.required_experience_in_months
      ? `${Math.ceil(Number(job.job_required_experience.required_experience_in_months) / 12)}+ years`
      : first(job.experience_level, job.job_experience_level, job.detected_extensions?.experience, 'Not specified'),
    salary,
    salaryAmount,
    fullAmount: salaryAmount || Number(process.env.OPENWEBNINJA_DEFAULT_JOB_AMOUNT || process.env.DEFAULT_JOB_FULL_AMOUNT || 0),
    applyLink,
    postedAt: postedRaw ? new Date(postedRaw) : (timestamp ? new Date(Number(timestamp) * 1000) : undefined),
    closingDate: expiresRaw ? new Date(expiresRaw) : undefined,
    dueDate: expiresRaw ? new Date(expiresRaw) : undefined,
    source: sourceName,
    status: 'open'
  };
}

async function requestJson(url, { method = 'GET', params = {}, body = null, timeoutMs = 18000 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('OPENWEBNINJA_API_KEY is missing. Add it in Render Environment Variables before using real jobs.');
    err.statusCode = 503;
    throw err;
  }
  const target = new URL(url);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') target.searchParams.set(key, String(value));
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      method,
      headers: buildHeaders(apiKey, Boolean(body)),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || data.error || data.detail || `OpenWebNinja request failed with ${response.status}`);
      err.statusCode = response.status;
      err.raw = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRealtimeJobs({ query = 'developer jobs in chicago', limit = 20 } = {}) {
  const data = await requestJson(endpoint('OPENWEBNINJA_REALTIME_JOBS_URL', DEFAULT_REALTIME_JOBS_URL), {
    params: { query }
  });
  return pickRows(data).slice(0, limit).map((job, index) => normalizeJob(job, index, 'realtime')).filter(job => job.title && job.externalId);
}

async function fetchJSearchJobs({ query = 'developer jobs in chicago', country = '', language = 'en', limit = 20, remote = false } = {}) {
  const params = { query, language, num_pages: 1 };
  if (country) params.country = String(country).toLowerCase();
  if (remote) params.work_from_home = 'true';
  const data = await requestJson(endpoint('OPENWEBNINJA_JSEARCH_URL', DEFAULT_JSEARCH_URL), { params });
  return pickRows(data).slice(0, limit).map((job, index) => normalizeJob(job, index, 'jsearch')).filter(job => job.title && job.externalId);
}

async function fetchJobSalary({ jobTitle = 'nodejs developer', location = 'New York' } = {}) {
  const data = await requestJson(endpoint('OPENWEBNINJA_JOB_SALARY_URL', DEFAULT_JOB_SALARY_URL), {
    params: { job_title: jobTitle, location }
  });
  return data;
}

async function fetchRemoteTechJobs({ query = 'remote software developer jobs', limit = 20, country = '', language = 'en' } = {}) {
  return fetchJSearchJobs({ query, limit, country, language, remote: true });
}

async function fetchCombinedJobs({ query = 'developer jobs in chicago', limit = 25, country = '', remote = false } = {}) {
  const perProvider = Math.max(limit, 10);
  const results = await Promise.allSettled([
    fetchRealtimeJobs({ query, limit: perProvider }),
    fetchJSearchJobs({ query, country, limit: perProvider, remote })
  ]);
  const jobs = [];
  for (const result of results) {
    if (result.status === 'fulfilled') jobs.push(...result.value);
  }
  const seen = new Set();
  return jobs.filter(job => {
    const key = `${job.source}:${job.externalId || job.title}:${job.company}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function extractText(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  const direct = data.answer || data.reply_text || data.response || data.message || data.text || data.output || data.content ||
    data.choices?.[0]?.message?.content || data.data?.answer || data.data?.reply_text || data.data?.response || data.data?.message || data.data?.text || data.data?.content || data.result?.answer || data.result?.message || data.result?.content || '';
  if (direct && typeof direct === 'string') return direct;
  if (direct && typeof direct === 'object') return extractText(direct);
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object') {
      const nested = extractText(value);
      if (nested) return nested;
    }
  }
  return '';
}

async function callJobAI({ provider = 'copilot', message = '', context = 'jobs' } = {}) {
  const providers = {
    copilot: endpoint('OPENWEBNINJA_COPILOT_URL', DEFAULT_COPILOT_URL),
    gemini: endpoint('OPENWEBNINJA_GEMINI_URL', DEFAULT_GEMINI_URL),
    chatgpt: endpoint('OPENWEBNINJA_CHATGPT_URL', DEFAULT_CHATGPT_URL)
  };
  const endpointUrl = providers[String(provider).toLowerCase()] || providers.copilot;
  const prompt = `You are SP WorldTech Job Assistant. Help users understand job requirements, write professional applications, and draft admin-reviewed outreach. Do not promise guaranteed jobs or guaranteed payment. Context: ${context}. Request: ${message}`;
  const data = await requestJson(endpointUrl, {
    method: 'POST',
    body: { prompt, message: prompt, input: prompt, query: prompt, context, provider }
  });
  const content = extractText(data);
  if (!content) throw new Error('OpenWebNinja AI returned an empty job assistant response.');
  return { content, provider, raw: data };
}

module.exports = {
  getApiKey,
  buildHeaders,
  normalizeJob,
  fetchRealtimeJobs,
  fetchJSearchJobs,
  fetchRemoteTechJobs,
  fetchCombinedJobs,
  fetchJobSalary,
  callJobAI
};
