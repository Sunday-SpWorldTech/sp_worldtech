# SP WorldTech GiftCards OpenWebNinja Wallet + Roles Update - 2026-06-30

Updated GiftCards only.

## API callbacks added
- Real-Time E-commerce Data: `OPENWEBNINJA_ECOMMERCE_URL`
- Real-Time Product Search: `OPENWEBNINJA_PRODUCT_SEARCH_URL`
- Real-Time Amazon Data: `OPENWEBNINJA_AMAZON_URL`
- Real-Time Walmart Data: `OPENWEBNINJA_WALMART_URL`
- Real-Time eBay Data: `OPENWEBNINJA_EBAY_URL`

## User flow
1. User deposits/funds wallet using SP Token Voucher flow.
2. User redeems SP Token Voucher into wallet balance.
3. User searches GiftCards marketplace products through OpenWebNinja callbacks.
4. User buys selected GiftCard with wallet balance.
5. GiftCard order is saved with processing status.
6. User sees order history/status.

## Admin/staff flow
- Admin/staff can view GiftCard orders.
- Admin/staff can update order status: pending, processing, completed, failed, cancelled.
- Failed/cancelled orders refund the user's wallet balance automatically once.

## Unchanged
- Jobs API and payout voucher flow.
- Worker hidden percentage rule.
- Banking and crypto logic.
- Tyna Systems token balance forward.
- Existing roles/auth structure.

## Render env required
```env
OPENWEBNINJA_API_KEY=your_key
OPENWEBNINJA_ECOMMERCE_URL=https://api.openwebninja.com/realtime-ecommerce-data/amazon/search
OPENWEBNINJA_PRODUCT_SEARCH_URL=https://api.openwebninja.com/realtime-product-search/search-light-v2
OPENWEBNINJA_AMAZON_URL=https://api.openwebninja.com/realtime-amazon-data/search
OPENWEBNINJA_WALMART_URL=https://api.openwebninja.com/real-time-walmart-data/search
OPENWEBNINJA_EBAY_URL=https://api.openwebninja.com/real-time-ebay-data/search
```
