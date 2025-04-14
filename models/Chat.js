const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: String, required: true, enum: ['user', 'bot', 'admin'] },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  smsNotified: { type: Boolean, default: false }, // Track SMS notifications
});

module.exports = mongoose.model('Chat', chatSchema);