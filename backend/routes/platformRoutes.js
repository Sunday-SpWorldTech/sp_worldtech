const router = require('express').Router();
const { protect } = require('../middleware/auth');

function integrationStatus() {
  const paystackKey = String(process.env.PAYSTACK_SECRET_KEY || '');
  const openWebReady = Boolean(process.env.OPENWEBNINJA_API_KEY || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY);
  const strowalletReady = Boolean((process.env.STROWALLET_PUBLIC_KEY || process.env.STROWALLET_API_KEY) && process.env.STROWALLET_SECRET_KEY);
  const lunoReady = Boolean(process.env.LUNO_API_KEY && process.env.LUNO_API_SECRET);
  return {
    database: { ready: Boolean(process.env.MONGODB_URI), requiredEnv: 'MONGODB_URI' },
    openWebNinja: { ready: openWebReady, requiredEnv: 'Secure recruitment setup' },
    strowallet: { ready: strowalletReady, requiredEnv: 'Secure wallet setup' },
    paystack: { ready: Boolean(/^sk_(live|test)_/.test(paystackKey)), requiredEnv: 'Secure payment setup' },
    luno: { ready: lunoReady, requiredEnv: 'Secure crypto setup' },
    cryptoExchange: { ready: lunoReady && Boolean(/^sk_(live|test)_/.test(paystackKey)), markupPercent: Number(process.env.CRYPTO_MARKUP_PERCENT || 3) }
  };
}

const roleProducts = {
  user: [
    { name: 'Job Dashboard', href: '/job-dashboard.html', api: 'openWebNinja' },
    { name: 'Academy Dashboard', href: '/academy-dashboard.html', api: 'openWebNinja' },
    { name: 'Banking Banking', href: '/banking.html', api: 'strowallet' },
    { name: 'CryptoCurrency', href: '/crypto-exchange.html', api: 'luno' }
  ],
  staff: [
    { name: 'Support Tickets', href: '/staff.html#support', api: 'openWebNinja' },
    { name: 'Academy Support', href: '/staff.html#academy', api: 'openWebNinja' },
    { name: 'Banking Support', href: '/staff.html#banking', api: 'strowallet' }
  ],
  admin: [
    { name: 'Admin Dashboard', href: '/admin.html', api: 'database' },
    { name: 'Crypto Management', href: '/admin.html#crypto', api: 'luno' },
    { name: 'Job Applications', href: '/admin.html#jobs', api: 'openWebNinja' },
    { name: 'Banking Operations', href: '/admin.html#banking', api: 'strowallet' }
  ],
  owner: [
    { name: 'Owner Control Center', href: '/admin.html', api: 'database' },
    { name: 'All Integrations', href: '/admin.html#integrations', api: 'all' }
  ]
};

router.get('/bootstrap', protect, (req, res) => {
  const role = req.user.role || 'user';
  res.json({
    brand: 'SP WorldTech — The World 🌎 Web, Applications & Software Solutions',
    user: { id: req.user._id, fullName: req.user.fullName, email: req.user.email, role },
    integrations: integrationStatus(),
    products: roleProducts[role] || roleProducts.user
  });
});

module.exports = router;
