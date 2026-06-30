const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const walletRoutes = require('./routes/walletRoutes');
const chatRoutes = require('./routes/chatRoutes');
const staffRoutes = require('./routes/staffRoutes');
const academyRoutes = require('./routes/academyRoutes');
const clientPaymentRoutes = require('./routes/clientPaymentRoutes');
const bankingRoutes = require('./routes/bankingRoutes');
const cryptoRoutes = require('./routes/crypto');
const adminCryptoRoutes = require('./routes/adminCrypto');
const aiRoutes = require('./routes/aiRoutes');
const platformRoutes = require('./routes/platformRoutes');
const adminJobApplicationRoutes = require('./routes/adminJobApplications');
const tynaBalanceRoutes = require('./routes/tynaBalanceRoutes');
const giftCardRoutes = require('./routes/giftCardRoutes');
const spTokenRoutes = require('./routes/spTokenRoutes');
const { ensureJobs } = require('./services/jobService');

dotenv.config();
const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.BACKEND_PUBLIC_URL,
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]
  .flatMap((value) => String(value || '').split(','))
  .map((item) => item.trim().replace(/\/$/, ''))
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(String(origin).replace(/\/$/, ''))) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
};
const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'SP WorldTech API', uptime: process.uptime(), ts: Date.now() }));
app.get('/api/integrations/status', (_req, res) => {
  const paystackKey = String(process.env.PAYSTACK_SECRET_KEY || '');
  res.json({
    database: { ready: Boolean(process.env.MONGODB_URI), requiredEnv: 'MONGODB_URI' },
    openWebNinja: { ready: Boolean(process.env.OPENWEBNINJA_API_KEY || process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY), requiredEnv: 'OPENWEBNINJA_API_KEY' },
    strowallet: { ready: Boolean((process.env.STROWALLET_PUBLIC_KEY || process.env.STROWALLET_API_KEY) && process.env.STROWALLET_SECRET_KEY), requiredEnv: 'STROWALLET_PUBLIC_KEY + STROWALLET_SECRET_KEY' },
    paystack: { ready: Boolean(/^sk_(live|test)_/.test(paystackKey)), requiredEnv: 'PAYSTACK_SECRET_KEY' },
    luno: { ready: Boolean((process.env.LUNO_API_KEY_ID || process.env.LUNO_API_KEY) && (process.env.LUNO_API_KEY_SECRET || process.env.LUNO_API_SECRET)), requiredEnv: 'LUNO_API_KEY_ID + LUNO_API_KEY_SECRET' },
    cryptoExchange: { ready: Boolean((process.env.LUNO_API_KEY_ID || process.env.LUNO_API_KEY) && (process.env.LUNO_API_KEY_SECRET || process.env.LUNO_API_SECRET) && /^sk_(live|test)_/.test(paystackKey)), markupPercent: Number(process.env.CRYPTO_MARKUP_PERCENT || 3) },
    spToken: { ready: Boolean(/^sk_(live|test)_/.test(paystackKey)), feePercent: Number(process.env.SP_TOKEN_FEE_PERCENT || 3), requiredEnv: 'PAYSTACK_SECRET_KEY' },
    giftCards: { ready: Boolean(process.env.OPENWEBNINJA_API_KEY), requiredEnv: 'OPENWEBNINJA_API_KEY + OpenWebNinja GiftCards callback URLs' }
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/client-payments', clientPaymentRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/admin/crypto', adminCryptoRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/admin/job-applications', adminJobApplicationRoutes);
app.use('/api/tyna-balance', tynaBalanceRoutes);
app.use('/api/giftcards', giftCardRoutes);
app.use('/api/sp-token', spTokenRoutes);

// Always return JSON for missing API routes, so the frontend never receives plain text "Not Found".
app.use('/api', (req, res) => {
  res.status(404).json({
    ok: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Check the frontend API path or backend route registration.'
  });
});

const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    if (/\.(html)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    if (/\.(js|css|png|jpg|jpeg|webp|svg|ico)$/i.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));
app.get('/', (_req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/staff', (_req, res) => res.redirect('/staff.html'));
app.get('/admin', (_req, res) => res.redirect('/admin.html'));
app.get('/user-calculator', (_req, res) => res.redirect('/login.html'));
app.get('/user-calculator.html', (_req, res) => res.redirect('/login.html'));
app.get('/job-dashboard', (_req, res) => res.redirect('/dashboard.html#jobs-panel'));
app.get('/job-dashboard.html', (_req, res) => res.redirect('/dashboard.html#jobs-panel'));
app.get('/academy-dashboard', (_req, res) => res.redirect('/dashboard.html#academy-panel'));
app.get('/academy-dashboard.html', (_req, res) => res.redirect('/dashboard.html#academy-panel'));
app.get('/user-banking', (_req, res) => res.redirect('/dashboard.html#products-panel'));
app.get('/user-banking.html', (_req, res) => res.redirect('/dashboard.html#products-panel'));
app.get('/user-crypto-exchange', (_req, res) => res.redirect('/dashboard.html#crypto-panel'));
app.get('/user-crypto-exchange.html', (_req, res) => res.redirect('/dashboard.html#crypto-panel'));
app.get('/pricing', (_req, res) => res.sendFile(path.join(frontendPath, 'pricing.html')));
const pageRoutes = ['about', 'jobs', 'services', 'products', 'how-it-works', 'support', 'faq', 'privacy-policy', 'terms', 'contact', 'technology', 'dashboard', 'login', 'signup', 'academy', 'certificate', 'banking', 'client-payments', 'portfolio', 'admin', 'staff', 'admin-calculator', 'staff-calculator', 'user-calculator', 'crypto-exchange', 'giftcards', 'user-banking', 'user-crypto-exchange', 'job-dashboard', 'academy-dashboard', 'us-bank-account', 'us-virtual-card', 'ng-virtual-account', 'ng-virtual-card', 'physical-card', 'airtime', 'data-subscription', 'bills-utility', 'academy-html-foundations', 'academy-html', 'academy-css-professional-ui', 'academy-css', 'academy-javascript-core', 'academy-javascript', 'academy-git-github', 'academy-react', 'academy-node-express-api', 'academy-node', 'academy-express', 'academy-mongodb-backend', 'academy-mongodb', 'academy-python', 'academy-django', 'academy-c', 'academy-cpp', 'academy-csharp', 'academy-csharp-dotnet', 'academy-dotnet', 'academy-ai-prompt-engineering', 'academy-premium-school-1', 'academy-premium-school-2', 'academy-premium-school-3'];
pageRoutes.forEach((page) => {
  app.get(`/${page}`, (_req, res) => res.sendFile(path.join(frontendPath, `${page}.html`)));
  app.get(`/${page}.html`, (_req, res) => res.sendFile(path.join(frontendPath, `${page}.html`)));
});

app.get('/review', (_req, res) => res.sendFile(path.join(__dirname, '..', 'review.html')));
app.get('/review.html', (_req, res) => res.sendFile(path.join(__dirname, '..', 'review.html')));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add it in Render Environment before deployment.');
    await connectDB(process.env.MONGODB_URI);
    server.listen(PORT, '0.0.0.0', () => console.log(`SP WorldTech server running on port ${PORT}`));
    // Do not block dashboard/login startup while external job APIs warm up.
    ensureJobs().catch((error) => console.warn('Background job sync skipped:', error.message));
  } catch (error) {
    console.error('Server start failed:', error.message);
    process.exit(1);
  }
}

start();
