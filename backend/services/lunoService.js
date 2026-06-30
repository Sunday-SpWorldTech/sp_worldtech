const LUNO_BASE_URL = process.env.LUNO_API_BASE_URL || 'https://api.luno.com/api/1';
function keyId() { return process.env.LUNO_API_KEY_ID || process.env.LUNO_API_KEY || ''; }
function keySecret() { return process.env.LUNO_API_KEY_SECRET || process.env.LUNO_API_SECRET || ''; }

function credentialsReady() {
  return Boolean(keyId() && keySecret());
}

function authHeader() {
  return 'Basic ' + Buffer.from(`${keyId()}:${keySecret()}`).toString('base64');
}

async function lunoRequest(path, { method = 'GET', query = {}, body = null, requireAuth = true } = {}) {
  if (requireAuth && !credentialsReady()) {
    return { attempted: false, configured: false, message: 'Crypto market service is not available yet.' };
  }
  const url = new URL(`${LUNO_BASE_URL}${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const headers = { Accept: 'application/json' };
  if (requireAuth) headers.Authorization = authHeader();
  let requestBody;
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    requestBody = new URLSearchParams(body).toString();
  }
  const response = await fetch(url, { method, headers, body: requestBody });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Crypto market request failed with ${response.status}`);
  return { attempted: true, configured: true, data };
}

async function getMarkets() {
  return lunoRequest('/tickers', { requireAuth: false });
}

async function getTicker(pair) {
  if (!pair) return getMarkets();
  return lunoRequest('/ticker', { query: { pair }, requireAuth: false });
}

async function getBalances() {
  return lunoRequest('/balance');
}

async function getTransactions(asset, options = {}) {
  return lunoRequest('/listtransactions', { query: { asset, ...options } });
}

async function getFundingAddress(asset) {
  return lunoRequest('/funding_address', { query: { asset } });
}

async function createMarketOrder({ pair, type, counterVolume, baseVolume }) {
  const body = { pair, type };
  if (counterVolume) body.counter_volume = String(counterVolume);
  if (baseVolume) body.base_volume = String(baseVolume);
  return lunoRequest('/marketorder', { method: 'POST', body });
}

async function requestWithdrawal({ type, amount, beneficiaryId, fast = false }) {
  return lunoRequest('/withdrawals', { method: 'POST', body: { type, amount: String(amount), beneficiary_id: beneficiaryId, fast: String(Boolean(fast)) } });
}

module.exports = { credentialsReady, getMarkets, getTicker, getBalances, getTransactions, getFundingAddress, createMarketOrder, requestWithdrawal };
