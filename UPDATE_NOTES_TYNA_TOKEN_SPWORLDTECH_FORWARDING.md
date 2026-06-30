# SP WorldTech Tyna Systems Token Forwarding Update

This update connects SP WorldTech to the secure Tyna Systems developer token flow without changing existing roles, login routes, payment split rules, academy, jobs, banking, crypto, or dashboard permissions.

## Added

- `backend/models/TynaTokenConnection.js`
- `backend/models/TynaBalanceTransferLog.js`
- `backend/routes/tynaBalanceRoutes.js`
- Registered `/api/tyna-balance` in `backend/server.js`
- Admin dashboard panel for connecting a Tyna Systems transfer token
- Backend-only token encryption using `SPWORLDTECH_TYNA_TOKEN_ENCRYPTION_SECRET`
- Backend verification against Tyna Systems `/api/dev-token/verify`
- Backend transfer against Tyna Systems `/api/dev-token/transfer`
- Automatic credit to SP WorldTech admin wallet after verified transfer
- Transfer history and transaction logs

## Preserved

- No user/admin/staff/owner roles were changed.
- No calculator access flow was changed.
- No hidden backend deduction logic was removed or exposed.
- No public dashboard text was added for hidden internal deduction.
- No fake/mock balance was added.

## Render environment variables to add on SP WorldTech backend

```env
TYNA_VERIFY_URL=https://tynasystems-backend.onrender.com/api/dev-token/verify
TYNA_TRANSFER_URL=https://tynasystems-backend.onrender.com/api/dev-token/transfer
TYNA_INTERNAL_API_KEY=use_the_same_private_key_set_on_tyna_systems
SPWORLDTECH_TYNA_TOKEN_ENCRYPTION_SECRET=use_a_long_random_secret_here
```

## Use flow

1. Generate token from Tyna Systems developer dashboard.
2. Open SP WorldTech admin/owner dashboard.
3. Paste token in the Tyna Systems Secure Balance Token panel.
4. SP WorldTech verifies the token through backend only.
5. If Tyna Systems has approved balance, it is auto-forwarded to SP WorldTech admin wallet and logged.
