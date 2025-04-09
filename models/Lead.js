const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  source: { type: String, enum: ['Contact Form', 'Quote Request', 'Chat Widget'], required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['New', 'Contacted', 'Qualified', 'Converted'], default: 'New' },
  message: { type: String }, // For contact form or chat messages
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);