// routes/receipts.js
const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// POST /api/receipts - Save a receipt and email it to the user
router.post('/', async (req, res) => {
  try {
    const { userId, orderId, receipt } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newReceipt = new Receipt({ userId, orderId, receipt });
    await newReceipt.save();

    // Send email to the user
    await sendEmail(
      user.email,
      `Order Receipt - ${orderId}`,
      receipt
    );

    res.status(201).json({ message: 'Receipt saved and emailed' });
  } catch (err) {
    console.error('Error saving receipt:', err.message);
    res.status(500).json({ error: 'Failed to save receipt' });
  }
});

// GET /api/receipts - Get all receipts (admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const receipts = await Receipt.find().populate('userId', 'email name');
    res.status(200).json(receipts);
  } catch (err) {
    console.error('Error fetching receipts:', err.message);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

module.exports = router;