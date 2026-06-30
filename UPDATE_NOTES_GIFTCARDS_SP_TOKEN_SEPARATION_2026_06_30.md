# SP Token and GiftCards Separation Update — 2026-06-30

## Corrected business meaning
- SP Token is now treated as the balance token generated during wallet deposit/withdrawal workflows.
- GiftCards is now a separate professional marketplace page for selling real digital gift cards through a connected provider API.

## Backend changes
- Added `/api/sp-token` routes for the existing Paystack → SP Token → wallet balance flow.
- Updated `/api/giftcards` so it no longer creates SP Token vouchers.
- Added real-provider-ready GiftCard API service using environment variables:
  - `GIFT_CARD_API_BASE_URL`
  - `GIFT_CARD_API_KEY`
  - `GIFT_CARD_CATALOG_PATH`
  - `GIFT_CARD_ORDER_PATH`
- Added `GiftCardOrder` model for real gift card purchases through API.

## Frontend changes
- Rebuilt `giftcards.html` as a real GiftCards marketplace page.
- Dashboard GiftCards panel now explains real gift card API sales.
- Wallet panel now explains SP Token separately as deposit/withdrawal balance token.

## Safety
- No provider demo cards were hard-coded.
- Gift card orders require live API credentials before real sales.
- Existing backend roles and Tyna balance/token forwarding files were not removed.
