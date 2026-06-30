# SP WorldTech API Dashboard Fix - 2026-06-27

## What was updated

1. OpenWeb Ninja integration
- Added configurable endpoint variables for JSearch, Remote Jobs, AI Answers, Copilot, and Gemini.
- Kept JSearch default at `https://api.openwebninja.com/jsearch/search-v2` with `x-api-key` authentication.
- Remote Jobs now uses a separate backend function and separate env variable `OPENWEBNINJA_REMOTE_JOBS_URL`.
- Because OpenWeb Ninja's public Remote Jobs page currently shows the JSearch `search-v2` code sample with `work_from_home=true`, the default remote endpoint remains JSearch remote mode. If your OpenWeb Ninja portal gives a newer Remote Jobs endpoint, paste it into `OPENWEBNINJA_REMOTE_JOBS_URL` on Render without changing code.

2. AI Academy integration
- OpenWeb Ninja AI service now supports separate provider endpoints:
  - `OPENWEBNINJA_AI_ANSWERS_URL`
  - `OPENWEBNINJA_COPILOT_URL`
  - `OPENWEBNINJA_GEMINI_URL`
- Gemini default endpoint is `https://api.openwebninja.com/gemini/chat`.
- Copilot default endpoint is `https://api.openwebninja.com/copilot/copilot`.

3. Luno crypto integration
- Added support for Luno's two-key naming:
  - `LUNO_API_KEY_ID`
  - `LUNO_API_KEY_SECRET`
- Old aliases still work:
  - `LUNO_API_KEY`
  - `LUNO_API_SECRET`

4. One professional user dashboard
- Dashboard navigation now keeps Jobs, Academy, Banking/Cards, Crypto, Wallet, Applications, and Support inside one dashboard experience.
- Added a Crypto panel inside `dashboard.html` so users do not have to leave the dashboard to see markets and calculate quotes.

5. Security
- API keys still stay backend-only.
- Frontend calls only your backend `/api/...` routes.

## Required Render environment variables

Set these in Render backend environment:

```env
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=https://spworldtech.com,https://www.spworldtech.com
FRONTEND_URL=https://spworldtech.com
BACKEND_PUBLIC_URL=https://your-render-backend-url.onrender.com

OPENWEBNINJA_API_KEY=
OPENWEBNINJA_JSEARCH_URL=https://api.openwebninja.com/jsearch/search-v2
OPENWEBNINJA_REMOTE_JOBS_URL=https://api.openwebninja.com/jsearch/search-v2
OPENWEBNINJA_AI_ANSWERS_URL=https://api.openwebninja.com/ai-answers/answer
OPENWEBNINJA_COPILOT_URL=https://api.openwebninja.com/copilot/copilot
OPENWEBNINJA_GEMINI_URL=https://api.openwebninja.com/gemini/chat

PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
PAYSTACK_CALLBACK_URL=https://spworldtech.com/crypto-exchange.html

LUNO_API_KEY_ID=
LUNO_API_KEY_SECRET=
LUNO_API_BASE_URL=https://api.luno.com/api/1
CRYPTO_MARKUP_PERCENT=3
CRYPTO_DEFAULT_CURRENCY=NGN

STROWALLET_PUBLIC_KEY=
STROWALLET_SECRET_KEY=
STROWALLET_BASE_URL=https://strowallet.com
STROWALLET_MODE=live
STROWALLET_PRODUCT_ENDPOINTS_JSON=
STROWALLET_WEBHOOK_URL=
```

## Important Strowallet note

The project cannot guess Strowallet's exact product endpoints. Your two Strowallet keys are supported, but you must add the real endpoints in Render as JSON:

```json
{
  "virtual_account": "/REAL_ENDPOINT_FROM_STROWALLET",
  "virtual_card": "/REAL_ENDPOINT_FROM_STROWALLET",
  "transfer": "/REAL_ENDPOINT_FROM_STROWALLET",
  "airtime": "/REAL_ENDPOINT_FROM_STROWALLET",
  "data": "/REAL_ENDPOINT_FROM_STROWALLET",
  "bill_payment": "/REAL_ENDPOINT_FROM_STROWALLET"
}
```

If Strowallet has only public key and secret key, that is fine. The missing piece is the exact route/path for each product from their API documentation.
