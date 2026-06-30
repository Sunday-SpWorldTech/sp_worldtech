# SP WorldTech AI, Job Dashboard, Academy Dashboard Update

This update adds backend-connected AI agent routes and separate user dashboards for Jobs and Academy while preserving the existing Banking/SP Wallet and Crypto Exchange sections.

## New frontend pages
- `frontend/job-dashboard.html` — separate Job dashboard with real backend job search, remote job search, application submission, application status, and Job AI widget.
- `frontend/academy-dashboard.html` — separate Academy dashboard with courses and Academy AI Tutor.

## New frontend scripts
- `frontend/assets/job-academy-dashboard.js` — dashboard logic for job search, remote jobs, job applications, course loading, and Academy AI Tutor.
- `frontend/assets/ai-agent.js` — reusable SP WorldTech AI widget for website knowledge, banking/Strowallet help, crypto/Luno support, and user support escalation.
- `frontend/assets/admin-staff-ai.js` — admin/staff AI draft helper for support replies, API-team messages, client messages, and complaint summaries.

## Backend routes added
- `POST /api/ai/chat`
- `POST /api/ai/academy`
- `POST /api/ai/support`
- `POST /api/ai/admin-message`
- `POST /api/ai/job-client-message`
- `GET /api/jobs/search`
- `GET /api/jobs/remote`
- `POST /api/jobs/apply`
- `GET /api/admin/job-applications`
- `PATCH /api/admin/job-applications/:id/status`

## Backend files added
- `backend/routes/aiRoutes.js`
- `backend/routes/adminJobApplications.js`
- `backend/controllers/aiController.js`
- `backend/services/openWebNinjaAIService.js`
- `backend/models/AIChatHistory.js`
- `backend/models/AdminAIDraft.js`
- `backend/models/StudentAISession.js`

## Existing pages updated
- `frontend/dashboard.html` now links Jobs and Academy to their own separate dashboards, like Banking and Crypto Exchange.
- `frontend/banking.html` now includes SP Wallet AI Help for Strowallet/banking questions and ticket escalation.
- `frontend/crypto-exchange.html` now includes Luno/Crypto Support AI.
- `frontend/admin.html` includes Admin AI Assistant for draft messages.
- `frontend/staff.html` includes Staff AI Assistant for support replies.
- `frontend/sitemap.xml` includes the new dashboard pages.

## Required environment variables
Set these on Render/backend only. Never place keys in frontend files.

```env
OPENWEBNINJA_API_KEY=
OPENWEBNINJA_AI_URL=https://api.openwebninja.com/copilot/copilot
OPENWEBNINJA_COPILOT_URL=https://api.openwebninja.com/copilot/copilot
OPENWEBNINJA_CHATGPT_URL=
OPENWEBNINJA_GEMINI_URL=
```

Existing Luno, Paystack, Strowallet, MongoDB, JWT, and client URL variables must remain configured.

## Safety behavior
- AI drafts messages only. Admin/staff must review before sending.
- Sensitive support issues involving payments, wallets, withdrawals, banking, cards, KYC, Luno, crypto, API failures, and complaints are escalated into support tickets.
- The AI does not approve banking/card requests, move funds, create accounts/cards, process crypto, approve withdrawals, promise jobs, or claim payment/client acceptance.
- Frontend calls backend routes only. API keys stay on the backend.
