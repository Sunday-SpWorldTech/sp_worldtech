# GiftCards Recheck Deploy Ready — 2026-06-30

Scope: GiftCards only. Jobs, banking, crypto, SP Token job payout, hidden worker percentage rule, Tyna Systems balance forwarding, and role/auth logic were not changed.

## Rechecked and fixed

- GiftCards OpenWebNinja service now supports more API response shapes, including nested `data.shopping_results`, `data.product_results`, `organic_results`, `items`, `products`, and deeper product arrays.
- Added request timeout protection for GiftCards marketplace search so a slow provider does not freeze the page after deploy.
- Product normalization now supports more common marketplace fields: `asin`, `item_id`, `product_id`, `sale_price`, `offers[0].price`, `imageUrl`, and nested image URLs.
- Wallet checkout remains USD/NGN only, matching the existing SP WorldTech wallet balances.
- GiftCards page now starts search only when the search form exists, so the script is safe on deploy.
- Empty product result message now guides users to search real gift-card keywords.
- Staff portal now includes GiftCards order management, matching admin role flow.
- GiftCards API status message now clearly reads from Render environment callback configuration.

## Confirmed flow

User deposits with SP Token Voucher → user redeems voucher into wallet balance → user searches GiftCards with OpenWebNinja callbacks → user buys using wallet balance → order is saved as processing → admin/staff completes, fails, cancels, or adds fulfilment note.

## Required Render environment variables

OPENWEBNINJA_API_KEY
OPENWEBNINJA_ECOMMERCE_URL=https://api.openwebninja.com/realtime-ecommerce-data/amazon/search
OPENWEBNINJA_PRODUCT_SEARCH_URL=https://api.openwebninja.com/realtime-product-search/search-light-v2
OPENWEBNINJA_AMAZON_URL=https://api.openwebninja.com/realtime-amazon-data/search
OPENWEBNINJA_WALMART_URL=https://api.openwebninja.com/real-time-walmart-data/search
OPENWEBNINJA_EBAY_URL=https://api.openwebninja.com/real-time-ebay-data/search
GIFT_CARD_DEFAULT_QUERY=gift card
OPENWEBNINJA_GIFTCARD_TIMEOUT_MS=12000

## Checks run

- Node syntax check: backend/services/giftCardProviderService.js
- Node syntax check: backend/controllers/giftCardController.js
- Node syntax check: frontend/assets/giftcards.js
- Node syntax check: frontend/assets/staff.js
- Backend require smoke test for GiftCards service/controller/routes/model
- Mock OpenWebNinja response parser test for nested product response
