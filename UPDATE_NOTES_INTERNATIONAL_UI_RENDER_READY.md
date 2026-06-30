# SP WorldTech International UI/UX + Render API Readiness Update

This update upgrades the platform UI/UX with a bolder international fintech color system and adds a live API readiness layer for Render deployment.

## Main improvements
- Added bold SP WorldTech international colors across public pages and dashboards.
- Added role product center tiles for Jobs, Academy, SP Wallet Banking, and Crypto Exchange dashboards.
- Added live Render API readiness cards that show whether MongoDB, OpenWeb Ninja, Strowallet, Paystack, and Luno are connected.
- Frontend now supports Render backend URL overrides without exposing API keys.
- Added `/api/platform/bootstrap` for role-based dashboard products.
- Kept all API keys backend-only.
- Kept real API behavior: no fake products, no fake balances, no fake job acceptance, no fake crypto/banking success.

## Required Render environment variables
```env
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=https://spworldtech.com,https://www.spworldtech.com
OPENWEBNINJA_API_KEY=
OPENWEBNINJA_BASE_URL=https://api.openwebninja.com
STROWALLET_PUBLIC_KEY=
STROWALLET_SECRET_KEY=
STROWALLET_BASE_URL=
LUNO_API_KEY=
LUNO_API_SECRET=
LUNO_API_BASE_URL=https://api.luno.com/api/1
CRYPTO_MARKUP_PERCENT=3
CRYPTO_DEFAULT_CURRENCY=NGN
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
OPERATIONS_SETUP_CODE=
```

## Deployment behavior
- Before environment variables are added, pages show "Waiting for Render .env" instead of fake products.
- After environment variables are added, real products load through backend routes according to the logged-in role.
- User calculator creates user access and opens the user dashboard.
- Admin/staff calculators use protected operations access and route to their dashboards.
