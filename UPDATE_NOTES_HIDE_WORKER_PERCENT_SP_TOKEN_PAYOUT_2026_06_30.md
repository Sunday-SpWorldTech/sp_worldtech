# SP WorldTech Jobs Recheck - Hide Worker Percentage + Confirm SP Token Voucher Flow

Date: 2026-06-30
Scope: Jobs payout display and worker-facing data only.

## Confirmed payout flow

Client pays SP WorldTech/Admin.
Admin reviews and accepts the worker application.
The backend automatically issues an SP Token job payout voucher to the worker.
The worker redeems the SP Token voucher into USD/NGN wallet balance.
The worker withdraws or uses the redeemed wallet balance.

## Fixes applied

- Removed worker-facing percentage wording from public pages, jobs pages, dashboard copy, and terms/pricing copy.
- Workers now see only an approved payout amount / SP Token voucher payout language.
- Workers no longer receive `userPercent` or `adminPercent` from public/user job APIs.
- Application submit response now returns a sanitized application object.
- User application list remains sanitized and hides full client amount, admin amount, transaction charge, userPercent, and adminPercent.
- Admin/staff dashboard language now says internal payout / voucher payout instead of public percentage split.
- Public client payment page no longer exposes worker percentage split.

## Backend checks completed

- Node syntax check passed for job, application, staff, wallet, SP Token, and job service files.
- Backend controller/service require smoke test passed.

## Important rule

Workers must never see the internal percentage allocation. They should only see the SP Token voucher payout amount issued to them and their wallet balance after redemption.
