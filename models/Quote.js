const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String, required: true },
  quantity: { type: Number, required: true },
  message: { type: String },
  status: { type: String, enum: ['pending', 'responded', 'closed'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quote', quoteSchema);