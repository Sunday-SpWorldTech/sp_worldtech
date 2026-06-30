const crypto = require('crypto');

function getSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY || '';
}

function isConfigured() {
  const key = getSecretKey();
  return Boolean(key && /^sk_(live|test)_/.test(key));
}

async function initializePaystackPayment({ email, amount, currency = 'NGN', reference, callbackUrl, metadata = {} }) {
  if (!isConfigured()) {
    return { attempted: false, message: 'Secure checkout is not available yet.' };
  }
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getSecretKey()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, amount: Math.round(Number(amount || 0) * 100), currency, reference, callback_url: callbackUrl, metadata })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === false) throw new Error(data.message || `Secure checkout initialization failed with ${response.status}`);
  return { attempted: true, data: data.data, message: data.message || 'Secure checkout initialized.' };
}

async function verifyPaystackTransaction(reference) {
  if (!isConfigured()) {
    throw new Error('Secure checkout is not available yet. Add PAYSTACK_SECRET_KEY in Render Environment.');
  }
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${getSecretKey()}`, Accept: 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === false) throw new Error(data.message || `Secure checkout verification failed with ${response.status}`);
  return data;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!isConfigured() || !rawBody || !signature) return false;
  const hash = crypto.createHmac('sha512', getSecretKey()).update(rawBody).digest('hex');
  return hash === signature;
}

module.exports = { initializePaystackPayment, verifyPaystackTransaction, isConfigured, verifyWebhookSignature };
