# SP Token Paid Job Payout + Wallet Withdrawal Update - 2026-06-30

Scope: Jobs payout, SP Token voucher redemption, and wallet withdrawal flow only.
Banking, crypto, gift cards marketplace, and OpenWebNinja job search integrations were not changed.

## New flow

Admin accepts a user's job application
↓
Backend creates an active SP Token voucher with purpose `job_payout`
↓
User sees the job payout voucher in dashboard wallet history
↓
User redeems the SP Token voucher
↓
Voucher amount credits the user's USD wallet balance
↓
User can withdraw from wallet balance or use the balance for platform services

## Backend changes

- `SpTokenVoucher` now supports purpose `job_payout`.
- `SpTokenVoucher` supports `claimCode`, `application`, and `issuedBy` fields for admin-issued job payout vouchers.
- `Application` now tracks `payoutVoucher`, `payoutVoucherStatus`, and `payoutVoucherIssuedAt`.
- Admin application acceptance no longer credits user balance directly.
- Admin application acceptance now issues an SP Token job payout voucher.
- SP Token redemption now verifies the voucher belongs to the logged-in user.
- SP Token redemption updates related application payout status to `redeemed`.
- Wallet withdrawal now deducts from redeemed wallet balance (`usdBalance` / `ngnBalance`) instead of visible earnings.
- Rejected withdrawals now refund the correct wallet balance.
- `Withdrawal` now stores currency.

## Frontend changes

- User dashboard wallet section explains paid job → SP Token voucher → wallet balance → withdrawal.
- User SP Token history displays active job payout claim codes.
- User can click “Redeem This Job Token” from wallet history.
- Withdrawal form supports USD and NGN balance withdrawals.
- Admin application button now says “Accept + Issue SP Token Voucher”.
- Admin status message shows the generated SP Token code after approval.
- Admin application list shows payout voucher status.

## Important rule

A job is not paid into spendable balance until the user redeems the SP Token voucher.
This prevents accidental direct credits and keeps paid job settlement traceable.
