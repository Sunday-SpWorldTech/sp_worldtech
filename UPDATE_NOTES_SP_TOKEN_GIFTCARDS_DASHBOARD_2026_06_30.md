# SP Token GiftCards and Dashboard Layout Update — 2026-06-30

## Completed
- Added a real backend-ready SP Token GiftCards module.
- Added one-time-use voucher model with hashed voucher code storage.
- Added Paystack checkout creation for published NGN and USD voucher prices.
- Added Paystack payment verification before a voucher token is revealed.
- Added voucher redemption route that credits the logged-in user wallet balance once only.
- Added transaction records for SP Token wallet credit and SP WorldTech transaction fee.
- Added admin wallet fee accounting through the existing SystemWallet model.
- Added GiftCards page to the frontend with premium SP WorldTech/Razer-Gold-style visual design using SP WorldTech branding only.
- Added GiftCards button to public navigation and the user dashboard.
- Added GiftCards panel inside the user dashboard.
- Renamed visible navigation/page labels:
  - SP Inter Banking → Banking
  - Crypto Exchanges → CryptoCurrency
- Fixed user dashboard panel containers so active panels display full-width instead of half-page.
- Reduced navigation/top-button text sizes for a more professional platform look.
- Updated sitemap with /giftcards.html.

## Backend routes added
- GET /api/giftcards/catalog
- POST /api/giftcards/checkout
- POST /api/giftcards/verify/:reference
- POST /api/giftcards/redeem
- GET /api/giftcards/mine

## Important production notes
- Paystack must be configured with PAYSTACK_SECRET_KEY on Render before users can buy SP Token vouchers.
- SP_TOKEN_FEE_PERCENT defaults to 3 if not configured.
- Vouchers are one-time-use; after redemption, status changes to redeemed and the same code cannot fund wallet again.
- International deposit/withdrawal availability still depends on provider support, KYC, Paystack, Strowallet, Luno, bank payout rules, and country regulations.
