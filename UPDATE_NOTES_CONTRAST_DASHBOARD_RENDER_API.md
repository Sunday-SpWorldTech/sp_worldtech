# SP WorldTech Update — Contrast, Compact Dashboards, Render API Wiring

## What was updated
- Fixed the black/unreadable heading and paragraph text on dark hero sections across public pages.
- Added final CSS overrides so hero text stays white while card, form, and content text stays professional dark.
- Reduced dashboard layouts to a real application size:
  - smaller sidebars
  - smaller dashboard cards
  - tighter spacing
  - compact top bars
  - responsive mobile layout preserved
- Compact sizing added for:
  - user dashboard
  - admin/staff dashboards
  - SP Inter Banking dashboard
  - Crypto Exchange dashboard
- Improved Render environment handling:
  - CORS now accepts `CLIENT_URL`, `FRONTEND_URL`, `BACKEND_PUBLIC_URL`, and localhost preview origins.
  - Crypto Paystack callback now safely uses the first valid frontend URL instead of breaking when `CLIENT_URL` contains multiple comma-separated URLs.
  - Strowallet now accepts `STROWALLET_PUBLIC_KEY` or `STROWALLET_API_KEY` as the public/API key alias, plus `STROWALLET_SECRET_KEY`.

## What was not changed
- No fake API keys were added.
- No mock provider implementation was added.
- Existing routes, database models, and API files were preserved.
- Real provider connections still require real Render environment variables.

## Render variables to set
Set these in Render backend Environment:
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `FRONTEND_URL`
- `BACKEND_PUBLIC_URL`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`
- `LUNO_API_KEY`
- `LUNO_API_SECRET`
- `OPENWEBNINJA_API_KEY`
- `GOOGLE_AI_STUDIO_API_KEY`
- `STROWALLET_PUBLIC_KEY` or `STROWALLET_API_KEY`
- `STROWALLET_SECRET_KEY`
- `STROWALLET_PRODUCT_ENDPOINTS_JSON` when Strowallet gives exact live product endpoints
