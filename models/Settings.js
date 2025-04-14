// models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, enum: ['flat', 'percentage'], default: 'flat' },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);