# SP WorldTech Database Notes

## users
- fullName
- email
- password
- role: user | admin | social_worker | client
- googleId

## jobs
- title
- description
- category
- fullAmount
- userVisibleAmount
- dueDate
- source
- status

## applications
- user
- job
- status
- userVisibleAmount

## wallets
- user
- usdBalance
- ngnBalance
- visibleEarnings
- productRequests[]

## withdrawals
- user
- amount
- channel
- status

## messages
- sender
- senderName
- senderRole
- message
