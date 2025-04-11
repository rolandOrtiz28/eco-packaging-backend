const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const logger = require('../config/logger');
const { body, validationResult } = require('express-validator');

// GET /user/:id - Fetch user profile with orders
router.get('/:id', async (req, res) => {
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

// PUT /:id - Update user profile
router.put('/:id', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('phone')
    .optional({ checkFalsy: true }) // Allow empty strings, null, undefined
    .matches(/^\+?\d{10,15}$/) // Custom regex: optional +, 10-15 digits
    .withMessage('Invalid phone number'),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('zipCode').optional().trim(),
  body('country').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in user update:', errors.array().map(e => e.msg));
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    logger.info(`Updating user with ID: ${req.params.id}`);
    const { email, ...updateData } = req.body;

    // Log the incoming data for debugging
    logger.debug(`Update data: ${JSON.stringify(req.body)}`);

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        logger.warn(`Email already in use: ${email}`);
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Ensure only authorized user can update their profile
    if (req.user._id.toString() !== req.params.id) {
      logger.warn(`Unauthorized update attempt by user ${req.user._id} on user ${req.params.id}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      logger.warn(`User with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Updated user: ${updatedUser.email} (ID: ${updatedUser._id})`);
    res.json(updatedUser);
  } catch (err) {
    logger.error(`Error updating user with ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;