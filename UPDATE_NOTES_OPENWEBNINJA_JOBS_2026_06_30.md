# SP WorldTech OpenWebNinja Jobs Update — 2026-06-30

Updated the Jobs module only. Banking, crypto, gift cards, wallet, academy and other sections were not intentionally changed.

## OpenWebNinja job APIs wired

Backend job service now supports the callbacks provided:

- Real-Time Jobs Data: `https://api.openwebninja.com/realtime-jobs-data/google-jobs/search`
- JSearch: `https://api.openwebninja.com/jsearch/search-v2`
- Job Salary Data: `https://api.openwebninja.com/job-salary-data/job-salary`
- Copilot: `https://api.openwebninja.com/copilot/copilot`
- Gemini: `https://api.openwebninja.com/gemini/chat`
- ChatGPT: `https://api.openwebninja.com/chatgpt/chat`

## Backend routes added / improved

- `GET /api/jobs/public` loads public jobs and syncs OpenWebNinja results into MongoDB.
- `GET /api/jobs/search` loads authenticated user dashboard jobs with MongoDB IDs so users can apply.
- `GET /api/jobs/live` fetches live jobs from Real-Time Jobs Data + JSearch and stores them.
- `GET /api/jobs/remote` fetches remote jobs from JSearch and stores them.
- `GET /api/jobs/salary` fetches salary data by job title and location.
- `POST /api/jobs/assistant` uses Copilot/Gemini/ChatGPT for job assistance.
- `POST /api/jobs/apply` and `POST /api/applications` keep applications inside SP WorldTech for admin review.

## Dashboard behavior fixed

- User dashboard job search now calls `/api/jobs/search` instead of returning temporary live results with no MongoDB `_id`.
- This makes Submit Application and Save Job work with real stored job records.
- Resume upload JSON limit increased to 15MB for normal resume files.

## Required Render environment variables

Set these in Render backend Environment:

```env
OPENWEBNINJA_API_KEY=your_real_openwebninja_key
OPENWEBNINJA_REALTIME_JOBS_URL=https://api.openwebninja.com/realtime-jobs-data/google-jobs/search
OPENWEBNINJA_JSEARCH_URL=https://api.openwebninja.com/jsearch/search-v2
OPENWEBNINJA_REMOTE_JOBS_URL=https://api.openwebninja.com/jsearch/search-v2
OPENWEBNINJA_JOB_SALARY_URL=https://api.openwebninja.com/job-salary-data/job-salary
OPENWEBNINJA_COPILOT_URL=https://api.openwebninja.com/copilot/copilot
OPENWEBNINJA_GEMINI_URL=https://api.openwebninja.com/gemini/chat
OPENWEBNINJA_CHATGPT_URL=https://api.openwebninja.com/chatgpt/chat
OPENWEBNINJA_JOB_QUERY=developer jobs in chicago
OPENWEBNINJA_JOB_SYNC_LIMIT=25
```

Do not put the API key inside frontend files.
