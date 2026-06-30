const OPENWEBNINJA_DEFAULTS = {
  ecommerce: 'https://api.openwebninja.com/realtime-ecommerce-data/amazon/search',
  productSearch: 'https://api.openwebninja.com/realtime-product-search/search-light-v2',
  amazon: 'https://api.openwebninja.com/realtime-amazon-data/search',
  walmart: 'https://api.openwebninja.com/real-time-walmart-data/search',
  ebay: 'https://api.openwebninja.com/real-time-ebay-data/search'
};

function apiKey() {
  return process.env.OPENWEBNINJA_API_KEY || process.env.GIFT_CARD_OPENWEBNINJA_API_KEY || '';
}

function endpoint(name) {
  const envMap = {
    ecommerce: process.env.OPENWEBNINJA_ECOMMERCE_URL,
    productSearch: process.env.OPENWEBNINJA_PRODUCT_SEARCH_URL,
    amazon: process.env.OPENWEBNINJA_AMAZON_URL,
    walmart: process.env.OPENWEBNINJA_WALMART_URL,
    ebay: process.env.OPENWEBNINJA_EBAY_URL
  };
  return String(envMap[name] || OPENWEBNINJA_DEFAULTS[name] || '').trim();
}

function isConfigured() {
  return Boolean(apiKey() && endpoint('ecommerce') && endpoint('productSearch'));
}

function configuredProviders() {
  return Object.keys(OPENWEBNINJA_DEFAULTS).filter((name) => Boolean(endpoint(name)));
}

function headers() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-API-Key': apiKey()
  };
}

function looksLikeProduct(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  return Boolean(
    item.title || item.name || item.product_title || item.product_id || item.asin || item.item_id ||
    item.price || item.extracted_price || item.current_price || item.thumbnail || item.image || item.url || item.link
  );
}

function collectProductArrays(value, depth = 0, found = []) {
  if (!value || depth > 5) return found;
  if (Array.isArray(value)) {
    if (value.some(looksLikeProduct)) found.push(value.filter((item) => item && typeof item === 'object'));
    value.forEach((item) => collectProductArrays(item, depth + 1, found));
    return found;
  }
  if (typeof value !== 'object') return found;
  Object.keys(value).forEach((key) => {
    if (/products|items|results|organic|shopping|offers|data|search/i.test(key)) collectProductArrays(value[key], depth + 1, found);
  });
  return found;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const direct = [
    value.products,
    value.items,
    value.results,
    value.data?.products,
    value.data?.items,
    value.data?.results,
    value.result?.products,
    value.result?.items,
    value.result?.results,
    value.search_results,
    value.product_results,
    value.organic_results,
    value.shopping_results,
    value.offers,
    value.data?.search_results,
    value.data?.product_results,
    value.data?.organic_results,
    value.data?.shopping_results
  ];
  for (const candidate of direct) if (Array.isArray(candidate) && candidate.length) return candidate;
  const deep = collectProductArrays(value);
  return deep.sort((a, b) => b.length - a.length)[0] || [];
}

function firstText(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function parseMoney(raw) {
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object') return parseMoney(raw.value || raw.amount || raw.current || raw.raw || raw.display || raw.price);
  const text = String(raw || '').replace(/,/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function inferCurrency(item = {}) {
  const text = `${item.currency || ''} ${item.price || ''} ${item.extracted_price || ''} ${item.current_price || ''} ${item.price_symbol || ''}`.toUpperCase();
  if (text.includes('NGN') || text.includes('₦')) return 'NGN';
  // The current SP WorldTech wallet supports USD and NGN purchases. Marketplace currencies are normalized to USD for checkout.
  return 'USD';
}

function normalizeProduct(item = {}, provider = 'openwebninja', index = 0) {
  const id = firstText(
    item.product_id,
    item.asin,
    item.item_id,
    item.id,
    item.offer_id,
    item.url,
    item.link,
    `${provider}-${index}`
  );
  const title = firstText(item.title, item.name, item.product_title, item.heading, item.description, 'Digital GiftCard Product');
  const brand = firstText(item.brand, item.store, item.source, provider, 'Marketplace');
  const price = parseMoney(item.extracted_price || item.price || item.current_price || item.price_raw || item.sale_price || item.buying_options?.[0]?.price || item.offers?.[0]?.price);
  return {
    provider,
    providerProductId: `${provider}:${id}`,
    externalId: id,
    brand,
    title,
    name: title,
    description: firstText(item.snippet, item.description, item.subtitle, item.condition, 'Available from OpenWebNinja marketplace search.'),
    image: firstText(item.thumbnail, item.image, item.image_url, item.product_image, item.imageUrl, item.images?.[0], item.images?.[0]?.url),
    url: firstText(item.url, item.link, item.product_url, item.offer_url),
    amount: price || 0,
    currency: inferCurrency(item),
    rating: item.rating || item.reviews_rating || '',
    reviews: item.reviews || item.reviews_count || '',
    raw: item
  };
}

async function fetchProvider(provider, query, limit = 10) {
  const url = endpoint(provider);
  if (!url || !apiKey()) return [];
  const params = new URLSearchParams();
  if (provider === 'productSearch') params.set('q', query);
  else params.set('query', query);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENWEBNINJA_GIFTCARD_TIMEOUT_MS || 12000));
  try {
    const response = await fetch(`${url}?${params.toString()}`, { method: 'GET', headers: headers(), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || `${provider} search failed with status ${response.status}`);
    return asArray(data).slice(0, limit).map((item, index) => normalizeProduct(item, provider, index));
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`${provider} search timed out`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchProducts({ query = 'gift card', provider = 'all', limit = 24 } = {}) {
  if (!apiKey()) throw new Error('OpenWebNinja API key is not configured. Add OPENWEBNINJA_API_KEY in Render Environment.');
  const providers = provider && provider !== 'all' ? [provider] : configuredProviders();
  const settled = await Promise.allSettled(providers.map((name) => fetchProvider(name, query, Math.ceil(limit / Math.max(1, providers.length)))));
  const products = [];
  const errors = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') products.push(...result.value);
    else errors.push(`${providers[index]}: ${result.reason.message}`);
  });
  const seen = new Set();
  const unique = products.filter((item) => {
    const key = `${item.providerProductId}|${item.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
  return { products: unique, errors, providers };
}

async function getCatalog({ country, brand, query, provider } = {}) {
  const q = firstText(query, brand, country ? `gift card ${country}` : '', process.env.GIFT_CARD_DEFAULT_QUERY, 'gift card');
  return searchProducts({ query: q, provider: provider || 'all', limit: 30 });
}

async function createOrder(payload) {
  // OpenWebNinja product/search APIs are used to discover and validate marketplace products.
  // The SP WorldTech order is fulfilled internally by admin/staff or by a future issuing provider.
  return {
    id: payload.reference,
    reference: payload.reference,
    status: 'processing',
    provider: payload.provider || 'spworldtech_wallet_order',
    message: 'GiftCard order received. Admin/staff should process fulfilment and update status.',
    productId: payload.productId,
    deliveryEmail: payload.deliveryEmail
  };
}

module.exports = { isConfigured, configuredProviders, getCatalog, searchProducts, createOrder };
