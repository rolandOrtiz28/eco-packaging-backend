const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true }, // e.g., 10 for 10% or $10
  minOrderValue: { type: Number, default: 0 }, // Minimum order value to apply the promo
  maxDiscount: { type: Number, default: null }, // Optional max discount for percentage discounts
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null }, // Max number of uses, null for unlimited
  usedCount: { type: Number, default: 0 }, // Number of times used
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoCodeSchema);