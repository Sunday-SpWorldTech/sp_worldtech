# Products Google Search Readiness Patch

Updated the public products indexing setup.

- Confirmed public products are included in `frontend/sitemap.xml`.
- Kept these public product/service pages indexable: products, banking, crypto exchange, Nigeria virtual account, USA bank account, USA virtual card, Nigeria virtual card, physical card, airtime, data subscription, bills/utility, and client payments.
- Added internal links from `products.html` to the individual product pages so Google can crawl them from the public website.
- Added Bills & Utility Payments to the public Products page.
- Removed protected dashboard modules `user-banking.html` and `user-crypto-exchange.html` from the sitemap.
- Added `noindex, nofollow` and robots.txt blocks for protected user dashboard modules.
- Kept `robots.txt` allowing public pages and pointing to `https://spworldtech.com/sitemap.xml`.

Important: This makes the pages ready for Google Search, but Google indexing still depends on deployment, domain verification, Search Console submission, and Google crawl timing.
