const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');
const paypal = require('@paypal/checkout-server-sdk');

// PayPal Configuration
const environment = process.env.NODE_ENV === 'production'
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// POST /checkout - Handle PayPal payment confirmation and store order
router.post('/checkout', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in checkout:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Processing checkout:', req.body);
    const { userId, items, total, paymentId } = req.body;

    // Verify PayPal payment
    const request = new paypal.orders.OrdersGetRequest(paymentId);
    const payment = await paypalClient.execute(request);

    if (payment.result.status !== 'COMPLETED') {
      console.warn('Payment not completed:', payment.result.status);
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Generate a unique order ID (e.g., ECO-XXXX)
    const orderCount = await Order.countDocuments();
    const orderId = `ECO-${String(orderCount + 1).padStart(4, '0')}`;

    const newOrder = new Order({
      userId,
      orderId,
      date: new Date().toISOString().split('T')[0],
      items,
      total,
    });

    await newOrder.save();
    console.log(`Order created: ${orderId}`);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error processing checkout:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;