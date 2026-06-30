# SP WorldTech OpenWebNinja Jobs Recheck — 2026-06-30

Scope: Jobs module only. Banking, crypto, gift cards, wallet, and product flows were not redesigned or changed.

## Rechecked and fixed

- Rechecked backend job routes and controllers for syntax errors.
- Rechecked frontend job scripts used by public jobs page, user dashboard, and admin/staff dashboard.
- Hardened OpenWebNinja response parsing so Real-Time Jobs Data and JSearch can work with different callback response shapes such as `jobs`, `data.jobs`, `result.jobs`, `results`, `items`, `google_jobs`, and `job_results`.
- Hardened AI response parsing for Copilot, Gemini, and ChatGPT style responses.
- Added safer public job detail handling for invalid IDs and external IDs.
- Added safer save/unsave job handling for MongoDB IDs and OpenWebNinja external IDs.
- Updated homepage job preview JavaScript so it does not crash on pages that do not have the job preview section.
- Updated homepage job preview to show real company/location/salary values from OpenWebNinja job data.
- Confirmed job module files pass Node syntax checks.
- Confirmed backend job/application routes and services can be required successfully after npm install.

## OpenWebNinja APIs used for jobs

- Real-Time Jobs Data: `https://api.openwebninja.com/realtime-jobs-data/google-jobs/search`
- JSearch: `https://api.openwebninja.com/jsearch/search-v2`
- Job Salary Data: `https://api.openwebninja.com/job-salary-data/job-salary`
- Copilot: `https://api.openwebninja.com/copilot/copilot`
- Gemini: `https://api.openwebninja.com/gemini/chat`
- ChatGPT: `https://api.openwebninja.com/chatgpt/chat`

## Required Render backend environment variables

```env
OPENWEBNINJA_API_KEY=your_openwebninja_key
OPENWEBNINJA_REALTIME_JOBS_URL=https://api.openwebninja.com/realtime-jobs-data/google-jobs/search
OPENWEBNINJA_JSEARCH_URL=https://api.openwebninja.com/jsearch/search-v2
OPENWEBNINJA_JOB_SALARY_URL=https://api.openwebninja.com/job-salary-data/job-salary
OPENWEBNINJA_COPILOT_URL=https://api.openwebninja.com/copilot/copilot
OPENWEBNINJA_GEMINI_URL=https://api.openwebninja.com/gemini/chat
OPENWEBNINJA_CHATGPT_URL=https://api.openwebninja.com/chatgpt/chat
OPENWEBNINJA_JOB_QUERY=developer jobs in chicago
OPENWEBNINJA_JOB_SYNC_LIMIT=25
```

## Test checklist after deploying to Render

1. Open `/jobs.html` and confirm public jobs load.
2. Search `developer jobs in chicago` and confirm jobs appear.
3. Log in as a user and open dashboard `#jobs-panel`.
4. Upload a PDF/DOC resume and submit one application.
5. Open admin dashboard and confirm the application appears.
6. Generate an AI client message from admin job management.
7. Confirm saved jobs and applications display inside user dashboard.

## Security note

Do not put the OpenWebNinja API key in frontend files. Keep it only in Render backend environment variables. If the key was shared publicly, rotate/regenerate it in OpenWebNinja and update Render.
