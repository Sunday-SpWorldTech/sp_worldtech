# SP WorldTech

SP WorldTech is a professional digital platform with job research API integration, academy pages, banking request workflows, AI assistance, support chat, and backend-ready API structure.

## Main folders
- `frontend/` public pages and dashboards
- `backend/` Node.js API server
- `database/` schema notes

## Local setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Open the frontend through the backend or deploy the frontend separately on Render.

## Environment variables
Set real production keys only in Render Environment Variables. Do not commit real keys to GitHub.

Required backend variables:
```bash
MONGODB_URI=
JWT_SECRET=
OPENWEBNINJA_API_KEY=
GOOGLE_AI_STUDIO_API_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
STROWALLET_PUBLIC_KEY=
STROWALLET_SECRET_KEY=
STROWALLET_BASE_URL=https://strowallet.com
STROWALLET_MODE=live
# Optional: after Strowallet confirms exact product routes, add STROWALLET_PRODUCT_ENDPOINTS_JSON in Render only.
FRONTEND_URL=https://spworldtech.com
BACKEND_PUBLIC_URL=https://sp-worldtech-backend.onrender.com
```

## OpenWeb Ninja jobs
Jobs must come from the OpenWeb Ninja Job Research API through the backend. There is no static job fallback. The empty message appears only when the live API returns no jobs or the API request fails.

## Strowallet banking flow
Banking forms submit to the backend and are saved in MongoDB. The backend only attempts provider submission when real Strowallet keys and official provider configuration exist in Render. The frontend never exposes Strowallet keys.

## Gift cards
Gift card pages are frontend-ready for a future real backend/provider API. They do not create successful transactions until a real provider API is connected.
