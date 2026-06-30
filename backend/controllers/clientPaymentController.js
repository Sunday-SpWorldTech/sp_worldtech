const ClientPayment = require('../models/ClientPayment');
const SystemWallet = require('../models/SystemWallet');
const Transaction = require('../models/Transaction');
const { initializePaystackPayment } = require('../services/paystackService');

async function ensureSystemWallet() {
  let wallet = await SystemWallet.findOne({ name: 'admin_wallet' });
  if (!wallet) wallet = await SystemWallet.create({ name: 'admin_wallet' });
  return wallet;
}

function makeReference() {
  return `SPWT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

exports.createClientPayment = async (req, res) => {
  try {
    const { clientName, clientEmail, projectTitle, paymentType = 'advance', amount, currency = process.env.CLIENT_PAYMENT_CURRENCY || 'NGN', notes } = req.body;
    if (!clientName || !projectTitle || !amount) return res.status(400).json({ message: 'Provide client name, project title, and amount.' });
    const paystackReference = makeReference();
    const payment = await ClientPayment.create({ clientName, clientEmail, projectTitle, paymentType, amount: Number(amount), currency, notes, paystackReference, status: 'pending' });
    const checkout = await initializePaystackPayment({
      email: clientEmail || process.env.ADMIN_PAYMENT_EMAIL || 'support@spworldtech.com',
      amount: Number(amount),
      currency,
      reference: paystackReference,
      callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
      metadata: { paymentId: String(payment._id), clientName, projectTitle, paymentType }
    });
    if (checkout.attempted && checkout.data?.authorization_url) {
      payment.status = 'checkout_created';
      await payment.save();
    }
    res.status(201).json({
      message: checkout.attempted ? 'Secure checkout created for client payment.' : checkout.message,
      payment,
      checkoutUrl: checkout.data?.authorization_url || '',
      accessCode: checkout.data?.access_code || ''
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markClientPaymentSettled = async (req, res) => {
  try {
    const payment = await ClientPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const fee = Number(req.body.paystackFee || payment.paystackFee || 0);
    const settled = Math.max(0, Number(req.body.settledAmount || payment.amount || 0) - fee);
    payment.status = 'settled';
    payment.paystackFee = fee;
    payment.settledAmount = settled;
    payment.paystackReference = req.body.paystackReference || payment.paystackReference;
    await payment.save();
    const wallet = await ensureSystemWallet();
    if (payment.currency === 'NGN') wallet.adminNgnBalance += settled;
    else wallet.adminUsdBalance += settled;
    await wallet.save();
    await Transaction.create({ type: 'client_paystack_settlement', amount: settled, currency: payment.currency, wallet: 'admin', description: `Client payment settled for ${payment.projectTitle}`, meta: { paymentId: payment._id, paystackFee: fee, paymentType: payment.paymentType } });
    res.json({ message: 'Client payment settled to admin system wallet after processing charges.', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.listClientPayments = async (_req, res) => {
  const payments = await ClientPayment.find().sort({ createdAt: -1 }).limit(100);
  res.json({ payments });
};
