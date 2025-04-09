const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  case: String,
  pricePerUnit: mongoose.Schema.Types.Mixed, // Can be a number or string ("Contact office")
});

const detailsSchema = new mongoose.Schema({
  size: String,
  color: String,
  material: String,
  pricing: [pricingSchema],
  useCase: String,
  note: String,
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  bulkPrice: { type: Number, required: true },
  moq: { type: Number, required: true },
  pcsPerCase: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  tags: [String],
  featured: { type: Boolean, default: false },
  details: detailsSchema,
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);