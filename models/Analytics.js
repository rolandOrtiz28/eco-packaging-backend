const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  pageUrl: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  userIp: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);