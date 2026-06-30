const mongoose = require('mongoose');

const cryptoMarketCacheSchema = new mongoose.Schema({
  pair: { type: String, required: true, uppercase: true, unique: true },
  baseAsset: String,
  quoteAsset: String,
  bid: Number,
  ask: Number,
  lastTrade: Number,
  rolling24HourVolume: Number,
  raw: Object,
  fetchedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('CryptoMarketCache', cryptoMarketCacheSchema);
