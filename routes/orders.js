const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Settings = require('../models/Settings'); // Import the Settings model
const { body, validationResult } = require('express-validator');
const paypal = require('@paypal/checkout-server-sdk');

// PayPal Configuration
const environment = process.env.NODE_ENV === 'production'
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// POST /api/order/create - Create PayPal order and return approval URL
router.post('/create', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.pcsPerCase').isInt({ min: 1 }).withMessage('pcsPerCase must be a positive integer'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'), // Add discount validation
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in create order:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Creating PayPal order:', req.body);
    const { userId, items, total, discount } = req.body;

    // Fetch tax and delivery settings directly from the database
    const taxRateSetting = await Settings.findOne({ key: 'taxRate' });
    const deliveryFeeSetting = await Settings.findOne({ key: 'deliveryFee' });
    const freeDeliveryThresholdSetting = await Settings.findOne({ key: 'freeDeliveryThreshold' });

    const settings = {
      taxRate: taxRateSetting ? taxRateSetting.value : 0.08,
      deliveryFee: deliveryFeeSetting ? deliveryFeeSetting.value : 9.99,
      freeDeliveryThreshold: freeDeliveryThresholdSetting ? freeDeliveryThresholdSetting.value : 50,
    };

    // Calculate subtotal and total on backend to verify
    const subtotal = items.reduce((sum, item) => {
      const pricePerCase = item.price;
      return sum + pricePerCase * item.quantity;
    }, 0);
    const shipping = subtotal > settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
    const tax = subtotal * settings.taxRate;
    const calculatedTotal = subtotal + shipping + tax - (discount || 0);

    if (Math.abs(calculatedTotal - total) > 0.01) {
      console.error('Total mismatch:', { calculated: calculatedTotal, received: total });
      return res.status(400).json({ error: 'Total amount mismatch' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: total.toFixed(2),
        },
      }],
      application_context: {
        return_url: `${frontendUrl}/checkout/capture`,
        cancel_url: `${frontendUrl}/checkout`,
      },
    });

    const order = await paypalClient.execute(request);
    console.log('PayPal order created:', order.result.id);

    const approvalUrl = order.result.links.find(link => link.rel === 'approve').href;

    res.status(200).json({ paypalOrderId: order.result.id, approvalUrl });
  } catch (err) {
    console.error('Error creating PayPal order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create PayPal order', details: err.message });
  }
});

// GET /api/order/capture - Capture PayPal payment after approval
router.get('/capture', async (req, res) => {
  const { token, PayerID } = req.query;

  if (!token || !PayerID) {
    console.error('Missing token or PayerID:', { token, PayerID });
    return res.status(400).json({ error: 'Missing payment approval details' });
  }

  try {
    console.log('Capturing PayPal payment:', { token, PayerID });
    const request = new paypal.orders.OrdersCaptureRequest(token);
    request.requestBody({});
    const capture = await paypalClient.execute(request);

    if (capture.result.status !== 'COMPLETED') {
      console.warn('Payment capture failed:', capture.result.status, capture.result);
      return res.status(400).json({ error: 'Payment capture failed', details: capture.result });
    }

    console.log('Payment captured successfully:', capture.result.id);
    res.status(200).json({ paymentId: capture.result.id, status: 'COMPLETED' });
  } catch (err) {
    console.error('Error capturing PayPal order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to capture payment', details: err.message });
  }
});

// POST /api/order/complete - Save order after capture
router.post('/complete', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('paypalOrderId').notEmpty().withMessage('PayPal Order ID is required'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.pcsPerCase').isInt({ min: 1 }).withMessage('pcsPerCase must be a positive integer'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'), // Add discount validation
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in complete order:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Completing order:', req.body);
    const { userId, paypalOrderId, paymentId, items, total, discount } = req.body;

    // Fetch tax and delivery settings directly from the database
    const taxRateSetting = await Settings.findOne({ key: 'taxRate' });
    const deliveryFeeSetting = await Settings.findOne({ key: 'deliveryFee' });
    const freeDeliveryThresholdSetting = await Settings.findOne({ key: 'freeDeliveryThreshold' });

    const settings = {
      taxRate: taxRateSetting ? taxRateSetting.value : 0.08,
      deliveryFee: deliveryFeeSetting ? deliveryFeeSetting.value : 9.99,
      freeDeliveryThreshold: freeDeliveryThresholdSetting ? freeDeliveryThresholdSetting.value : 50,
    };

    const subtotal = items.reduce((sum, item) => {
      const pricePerCase = item.price;
      return sum + pricePerCase * item.quantity;
    }, 0);
    const shipping = subtotal > settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
    const tax = subtotal * settings.taxRate;
    const calculatedTotal = subtotal + shipping + tax - (discount || 0);

    if (Math.abs(calculatedTotal - total) > 0.01) {
      console.error('Total mismatch in complete:', { calculated: calculatedTotal, received: total });
      return res.status(400).json({ error: 'Total amount mismatch' });
    }

    const orderCount = await Order.countDocuments();
    const orderId = `ECO-${String(orderCount + 1).padStart(4, '0')}`;

    const newOrder = new Order({
      userId,
      orderId,
      date: new Date().toISOString().split('T')[0],
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        pricePerCase: item.price,
        name: item.name,
        moq: item.moq,
        pcsPerCase: item.pcsPerCase,
      })),
      total,
      discount, // Save discount in the order
      paymentId,
      paymentStatus: 'COMPLETED',
    });

    await newOrder.save();
    console.log(`Order saved: ${orderId}`);

    res.status(201).json({ orderId, paymentId });
  } catch (err) {
    console.error('Error saving order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save order', details: err.message });
  }
});

module.exports = router;