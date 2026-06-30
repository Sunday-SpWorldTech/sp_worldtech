# CryptoCurrency Label Cleanup + SP Token Deposit/Withdraw Update — 2026-06-30

## Updated
- Replaced all visible `SP CryptoCurrency` text with clean `CryptoCurrency`.
- Rechecked old `SP Inter Banking`, `Crypto Exchanges`, duplicated Signup/Login, and `User Login` wording so the visible platform labels stay clean.
- Removed wording that looked like fake/demo transaction language while keeping provider-safety messages.
- Added SP Token deposit controls inside the user wallet panel:
  - create Paystack deposit checkout
  - verify Paystack reference
  - reveal one-time SP Token code
  - redeem SP Token into dashboard wallet balance
- Updated the withdrawal flow so each withdrawal request generates an SP Token withdrawal code for tracking and admin payout verification.
- Added SP Token history display in the user wallet panel.

## Protected
- Existing user, staff, admin, owner roles remain unchanged.
- Existing Tyna token transfer role/permission logic remains unchanged.
- GiftCards remains separate from SP Token and is still for real gift card API sales.
