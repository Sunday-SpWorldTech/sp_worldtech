const GiftCardOrder = require('../models/GiftCardOrder');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const giftCardProvider = require('../services/giftCardProviderService');

async function ensureWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

function normalizeCurrency(currency = 'USD') {
  const value = String(currency || 'USD').toUpperCase();
  return value === 'NGN' ? 'NGN' : 'USD';
}

function debitWallet(wallet, currency, amount) {
  const value = Number(amount || 0);
  if (!value || value <= 0) throw new Error('Enter a valid GiftCard amount.');
  if (currency === 'NGN') {
    if (Number(wallet.ngnBalance || 0) < value) throw new Error('Insufficient NGN wallet balance. Deposit first with SP Token Voucher, redeem it into wallet balance, then buy GiftCards.');
    wallet.ngnBalance = Number((Number(wallet.ngnBalance || 0) - value).toFixed(2));
    return;
  }
  if (Number(wallet.usdBalance || 0) < value) throw new Error('Insufficient USD wallet balance. Deposit first with SP Token Voucher, redeem it into wallet balance, then buy GiftCards.');
  wallet.usdBalance = Number((Number(wallet.usdBalance || 0) - value).toFixed(2));
}

function creditWallet(wallet, currency, amount) {
  const value = Number(amount || 0);
  if (currency === 'NGN') wallet.ngnBalance = Number((Number(wallet.ngnBalance || 0) + value).toFixed(2));
  else wallet.usdBalance = Number((Number(wallet.usdBalance || 0) + value).toFixed(2));
}

function isAdminOrOwner(role) { return ['admin', 'owner'].includes(role); }

exports.status = (_req, res) => {
  res.json({
    ready: giftCardProvider.isConfigured(),
    mode: 'openwebninja_marketplace_search_wallet_order',
    providers: giftCardProvider.configuredProviders(),
    requiredEnv: [
      'OPENWEBNINJA_API_KEY',
      'OPENWEBNINJA_ECOMMERCE_URL',
      'OPENWEBNINJA_PRODUCT_SEARCH_URL',
      'OPENWEBNINJA_AMAZON_URL',
      'OPENWEBNINJA_WALMART_URL',
      'OPENWEBNINJA_EBAY_URL'
    ],
    message: giftCardProvider.isConfigured()
      ? 'GiftCards marketplace is connected to OpenWebNinja callbacks on Render. Users buy with redeemed wallet balance.'
      : 'GiftCards marketplace needs OPENWEBNINJA_API_KEY and GiftCards callback URLs in Render Environment before live product search.'
  });
};

exports.getCatalog = async (req, res) => {
  try {
    const catalog = await giftCardProvider.getCatalog({
      country: req.query.country,
      brand: req.query.brand,
      query: req.query.query || req.query.q,
      provider: req.query.provider
    });
    res.json({ ready: true, ...catalog });
  } catch (error) {
    res.status(giftCardProvider.isConfigured() ? 502 : 503).json({ ready: false, message: error.message, products: [] });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const providerProductId = String(req.body.providerProductId || '').trim();
    const provider = String(req.body.provider || 'manual').trim();
    const brand = String(req.body.brand || req.body.title || '').trim();
    const productTitle = String(req.body.productTitle || req.body.title || brand || 'GiftCard').trim();
    const productUrl = String(req.body.productUrl || '').trim();
    const image = String(req.body.image || '').trim();
    const country = String(req.body.country || 'Global').trim();
    const deliveryEmail = String(req.body.deliveryEmail || req.user.email || '').trim();
    const currency = normalizeCurrency(req.body.currency);
    const amount = Number(req.body.amount || 0);
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const totalAmount = Number((amount * quantity).toFixed(2));
    if (!providerProductId || !brand || !country || !amount || amount <= 0) throw new Error('Choose a valid GiftCard product, country and amount.');

    const wallet = await ensureWallet(req.user._id);
    debitWallet(wallet, currency, totalAmount);
    await wallet.save();

    const order = await GiftCardOrder.create({
      user: req.user._id,
      provider,
      providerProductId,
      productTitle,
      productUrl,
      image,
      brand,
      country,
      amount,
      currency,
      quantity,
      totalAmount,
      deliveryEmail,
      status: 'processing',
      providerReference: `SP-GIFT-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      providerResponse: { source: 'wallet_balance_purchase', note: 'User paid from dashboard wallet balance. Admin/staff fulfilment pending.' }
    });

    const providerResponse = await giftCardProvider.createOrder({
      productId: providerProductId,
      provider,
      brand,
      productTitle,
      country,
      amount,
      currency,
      quantity,
      deliveryEmail,
      customer: { id: String(req.user._id), email: req.user.email },
      reference: String(order._id)
    });

    order.providerResponse = { ...(order.providerResponse || {}), providerResponse };
    order.providerReference = providerResponse.reference || providerResponse.id || providerResponse.orderId || order.providerReference;
    order.status = String(providerResponse.status || '').toLowerCase().includes('fail') ? 'failed' : 'processing';

    if (order.status === 'failed') creditWallet(wallet, currency, totalAmount);
    await wallet.save();
    await order.save();

    await Transaction.create({
      user: req.user._id,
      type: 'gift_card_purchase',
      amount: totalAmount,
      currency,
      direction: 'debit',
      wallet: 'user',
      description: `${brand} GiftCard purchase paid from wallet balance`,
      status: order.status === 'failed' ? 'failed' : 'completed',
      meta: { orderId: order._id, providerReference: order.providerReference, providerProductId, provider }
    });

    res.status(201).json({ message: 'GiftCard order created successfully. Wallet balance was debited and the order is ready for admin/staff processing.', order, wallet });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.myOrders = async (req, res) => {
  const orders = await GiftCardOrder.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ orders });
};

exports.adminOrders = async (req, res) => {
  if (!['admin', 'owner', 'staff'].includes(req.user.role)) return res.status(403).json({ message: 'Admin or staff access required.' });
  const status = String(req.query.status || '').trim();
  const filter = status ? { status } : {};
  const orders = await GiftCardOrder.find(filter).populate('user', 'fullName email phone').sort({ createdAt: -1 }).limit(100);
  res.json({ orders, adminView: isAdminOrOwner(req.user.role) });
};

exports.updateOrderStatus = async (req, res) => {
  try {
    if (!['admin', 'owner', 'staff'].includes(req.user.role)) return res.status(403).json({ message: 'Admin or staff access required.' });
    const allowed = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    const status = String(req.body.status || '').toLowerCase();
    if (!allowed.includes(status)) throw new Error('Choose a valid GiftCard order status.');
    const order = await GiftCardOrder.findById(req.params.id).populate('user', 'fullName email');
    if (!order) return res.status(404).json({ message: 'GiftCard order not found.' });
    const previousStatus = order.status;
    order.status = status;
    order.fulfillmentNote = String(req.body.fulfillmentNote || order.fulfillmentNote || '').trim();
    order.fulfillmentCodeMasked = String(req.body.fulfillmentCodeMasked || order.fulfillmentCodeMasked || '').trim();
    order.updatedBy = req.user._id;

    if (['failed', 'cancelled'].includes(status) && !['failed', 'cancelled'].includes(previousStatus) && !order.refundedAt) {
      const wallet = await ensureWallet(order.user._id || order.user);
      creditWallet(wallet, order.currency, order.totalAmount);
      await wallet.save();
      order.refundedAt = new Date();
      await Transaction.create({
        user: order.user._id || order.user,
        type: 'gift_card_refund',
        amount: order.totalAmount,
        currency: order.currency,
        direction: 'credit',
        wallet: 'user',
        description: `${order.brand} GiftCard order ${status}; wallet balance restored`,
        status: 'completed',
        meta: { orderId: order._id, previousStatus, status }
      });
    }

    await order.save();
    res.json({ message: 'GiftCard order updated successfully.', order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
