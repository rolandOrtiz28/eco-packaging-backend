const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  pricePerCase: { type: Number, required: true },
  name: { type: String, required: true },
  moq: { type: Number, required: true },
  pcsPerCase: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing' },
  items: [itemSchema],
  total: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  paymentId: { type: String, required: true },
  paymentStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  paymentMethod: { type: String, enum: ['paypal', 'stripe'], required: true }, // Added paymentMethod
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);