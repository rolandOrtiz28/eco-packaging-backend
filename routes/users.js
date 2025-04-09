const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const logger = require('../config/logger');

// GET /user/:id - Fetch user profile with orders
router.get('/user/:id', async (req, res) => {
    try {
      logger.info(`Fetching user with ID: ${req.params.id}`);
      const user = await User.findById(req.params.id);
      if (!user) {
        logger.warn(`User with ID ${req.params.id} not found`);
        return res.status(404).json({ error: 'User not found' });
      }
      const orders = await Order.find({ userId: req.params.id });
      logger.info(`Fetched user: ${user.email} (ID: ${user._id}) with ${orders.length} orders`);
      res.json({ ...user.toObject(), orders });
    } catch (err) {
      logger.error(`Error fetching user with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  });

// PUT /user/:id - Update user profile
router.put('/user/:id', async (req, res) => {
  try {
    console.log(`Updating user with ID: ${req.params.id}`);
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUser) {
      console.warn(`User with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updatedUser);
  } catch (err) {
    console.error(`Error updating user with ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;