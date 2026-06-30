function last4(value = '') {
  const clean = String(value || '').replace(/\s+/g, '');
  return clean ? clean.slice(-4) : '';
}

function buildSafeProductRequestPayload(request) {
  return {
    productType: request.productType,
    firstName: request.firstName,
    lastName: request.lastName,
    phone: request.phone,
    dateOfBirth: request.dateOfBirth,
    country: request.country,
    state: request.state,
    city: request.city,
    address: request.address,
    postalCode: request.postalCode,
    identityType: request.identityType,
    identityNumberLast4: last4(request.identityNumber),
    network: request.network,
    dataPlan: request.dataPlan,
    billPhone: request.billPhone,
    provider: 'strowallet'
  };
}

function getKeys() {
  return {
    publicKey: process.env.STROWALLET_PUBLIC_KEY || process.env.STROWALLET_API_KEY || '',
    secretKey: process.env.STROWALLET_SECRET_KEY || ''
  };
}

function normalizeBaseUrl() {
  return (process.env.STROWALLET_BASE_URL || 'https://strowallet.com').replace(/\/$/, '');
}

function configuredEndpointMap() {
  try {
    if (!process.env.STROWALLET_PRODUCT_ENDPOINTS_JSON) return {};
    const parsed = JSON.parse(process.env.STROWALLET_PRODUCT_ENDPOINTS_JSON);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function serviceKey(productType = '') {
  const lower = String(productType || '').toLowerCase();
  if (lower.includes('virtual bank') || lower.includes('virtual account') || lower.includes('account')) return 'virtual_account';
  if (lower.includes('card')) return 'virtual_card';
  if (lower.includes('transfer')) return 'transfer';
  if (lower.includes('airtime')) return 'airtime';
  if (lower.includes('data')) return 'data';
  if (lower.includes('bill') || lower.includes('utility') || lower.includes('electricity') || lower.includes('cable')) return 'bill_payment';
  return '';
}

function resolveEndpoint(productType) {
  const key = serviceKey(productType);
  if (!key) return '';

  const map = configuredEndpointMap();
  return map[key] ? String(map[key]) : '';
}

function buildProviderPayload(rawRequest) {
  const { publicKey, secretKey } = getKeys();
  const accountName = [rawRequest.firstName, rawRequest.lastName].filter(Boolean).join(' ').trim();
  const backendUrl = String(process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
  const webhook = process.env.STROWALLET_WEBHOOK_URL || (backendUrl ? `${backendUrl}/api/wallet/strowallet/webhook` : '');

  const basePayload = {
    public_key: publicKey,
    secret_key: secretKey,
    email: rawRequest.customerEmail,
    customer_email: rawRequest.customerEmail,
    name: accountName,
    account_name: accountName,
    first_name: rawRequest.firstName,
    last_name: rawRequest.lastName,
    phone: rawRequest.phone,
    dob: rawRequest.dateOfBirth,
    date_of_birth: rawRequest.dateOfBirth,
    country: rawRequest.country,
    state: rawRequest.state,
    city: rawRequest.city,
    address: rawRequest.address,
    postal_code: rawRequest.postalCode,
    identity_type: rawRequest.identityType,
    identity_number: rawRequest.identityNumber,
    webhook_url: webhook,
    mode: process.env.STROWALLET_MODE || 'live'
  };

  if (/airtime/i.test(rawRequest.productType)) {
    return { public_key: publicKey, secret_key: secretKey, phone: rawRequest.billPhone || rawRequest.phone, network: rawRequest.network, amount: rawRequest.amount || rawRequest.providerAmount || 0 };
  }
  if (/data/i.test(rawRequest.productType)) {
    return { public_key: publicKey, secret_key: secretKey, phone: rawRequest.billPhone || rawRequest.phone, network: rawRequest.network, plan: rawRequest.dataPlan, data_plan: rawRequest.dataPlan };
  }
  if (/transfer/i.test(rawRequest.productType)) {
    return { ...basePayload, amount: rawRequest.amount || 0, narration: rawRequest.narration || 'SP WorldTech fund transfer request' };
  }
  return basePayload;
}

async function submitToStrowallet(rawRequest) {
  const { publicKey, secretKey } = getKeys();
  const baseUrl = normalizeBaseUrl();
  const endpoint = resolveEndpoint(rawRequest.productType);

  if (!publicKey || !secretKey) {
    return {
      attempted: false,
      status: 'pending_configuration',
      message: 'Banking service is not available yet.'
    };
  }

  if (!endpoint) {
    return {
      attempted: false,
      status: 'pending_provider_endpoint',
      message: 'This Banking service is not available yet. Please check back shortly.'
    };
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const payload = buildProviderPayload(rawRequest);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${secretKey}`,
        'x-api-key': publicKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { attempted: true, status: 'failed', message: data.message || data.error || `Banking request failed with ${response.status}`, response: data };
    }

    return {
      attempted: true,
      status: 'submitted_to_provider',
      reference: data.reference || data.id || data.data?.reference || data.data?.id || data.account_number,
      message: data.message || 'Request submitted for secure provider processing.',
      response: data
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { submitToStrowallet, buildSafeProductRequestPayload, last4, resolveEndpoint };
