require("dotenv").config();
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const paypal = require('@paypal/checkout-server-sdk');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');
const sendEmail = require('../utils/sendEmail');
const twilio = require('twilio');
const { calculateFees } = require('../utils/calculateFees');


// Function to send SMS to all admins
const sendOrderSmsToAdmins = async (orderDetails) => {
  try {
    if (!process.env.ADMIN_PHONE_NUMBERS) {
      throw new Error('ADMIN_PHONE_NUMBERS is not defined in the .env file');
    }

    const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const adminPhoneNumbers = process.env.ADMIN_PHONE_NUMBERS.split(',');

    const { orderId, userEmail, status, total, discount, items, paymentId } = orderDetails;
    const smsBody = `New Order: ${orderId}\nUser: ${userEmail}\nStatus: ${status}\nTotal: $${total.toFixed(2)}\nDiscount: $${discount.toFixed(2)}\nItems: ${items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ')}\nPayment ID: ${paymentId}`;

    for (const phoneNumber of adminPhoneNumbers) {
      try {
        await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber.trim(),
        });
        console.log(`SMS sent to ${phoneNumber} for order: ${orderId}`);
      } catch (smsErr) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, smsErr.message);
      }
    }
  } catch (twilioErr) {
    console.error('Failed to initialize Twilio or send SMS:', twilioErr.message);
    throw new Error('Failed to send SMS notifications: ' + twilioErr.message);
  }
};

// PayPal Configuration
const environment = new paypal.core.SandboxEnvironment(
  'ARWl3thZ7jIojKvDMT_abu_PK9gLQUKIsZtPOS30BH6pnrPE5eRonnxECNSgcFFDPLreS4UoX7rflFYI',
  'EEdq0U8MRvs5R1BsXrRcxlWsuJFmAJGdLDructYqnJCYjrxrPaaFqUTRzI2RNeio8byDHCHrvWFL8NuZ'
);
console.log('PayPal Sandbox Environment Initialized with Client ID:', 'ARWl3thZ7jIojKvDMT_abu_PK9gLQUKIsZtPOS30BH6pnrPE5eRonnxECNSgcFFDPLreS4UoX7rflFYI');
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Middleware to check if user is admin using session
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  logger.warn('Unauthorized access attempt to admin route', { user: req.user });
  return res.status(403).json({ error: 'Unauthorized: Admin access required' });
};

// GET /api/orders - Fetch all orders (Admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate('userId', 'email');
    const transformedOrders = orders.map(order => ({
      ...order.toObject(),
      id: order._id.toString(),
      _id: undefined,
    }));
    res.json(transformedOrders);
  } catch (err) {
    logger.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/order/create - Create PayPal order and return approval URL
router.post('/create', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.pcsPerCase').isInt({ min: 1 }).withMessage('pcsPerCase must be a positive integer'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in create order:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Creating PayPal order:', req.body);
    const { userId, items, total, discount } = req.body;

    const settingsDocs = await Settings.find();
    const settings = {};
    settingsDocs.forEach(doc => { settings[doc.key] = doc.value; });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const calculated = calculateFees(subtotal, settings, discount);

    if (Math.abs(calculated.total - total) > 0.01) {
      console.error('Total mismatch:', { calculated: calculated.total, received: total });
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
    console.error('PayPal Error Details:', err.response?.data || err.message, err.stack);
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
  body('paypalOrderId').optional().notEmpty().withMessage('PayPal Order ID is required for PayPal payments'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.pcsPerCase').isInt({ min: 1 }).withMessage('pcsPerCase must be a positive integer'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('paymentMethod').isIn(['paypal', 'stripe']).withMessage('Invalid payment method'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in complete order:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Completing order:', req.body);
    const { userId, paypalOrderId, paymentId, items, total, discount, paymentMethod } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const settingsDocs = await Settings.find();
    const settings = {};
    settingsDocs.forEach(doc => { settings[doc.key] = doc.value; });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const calculated = calculateFees(subtotal, settings, discount);

    if (Math.abs(calculated.total - total) > 0.01) {
      console.error('Total mismatch in complete:', { calculated: calculated.total, received: total });
      return res.status(400).json({ error: 'Total amount mismatch' });
    }

    // Verify PayPal payment status
    if (paymentMethod === 'paypal') {
      const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
      const order = await paypalClient.execute(request);
      if (order.result.status !== 'COMPLETED') {
        console.warn('PayPal payment not completed:', order.result.status);
        return res.status(400).json({ error: 'PayPal payment not completed' });
      }
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
      discount,
      paymentId,
      paymentStatus: 'COMPLETED',
      status: 'Processing',
      paymentMethod,
    });

    await newOrder.save();
    console.log(`Order saved: ${orderId}`);

    const lead = await Lead.findOne({ email: user.email });
    if (lead) {
      lead.orderId = newOrder._id;
      lead.status = 'Converted';
      await lead.save();
      console.log(`Lead updated with orderId: ${newOrder._id}`);
    }

    try {
      const emailBody = `
        New ${paymentMethod} Order Completed: ${orderId}
        User: ${user.email}
        Status: ${newOrder.status}
        Total: $${total.toFixed(2)}
        Discount: $${discount.toFixed(2)}
        Items: ${items.map(item => `${item.name} (Qty: ${item.quantity}, Price: $${item.price})`).join(', ')}
        Payment ID: ${paymentId}
      `;
      await sendEmail(
        process.env.ADMIN_EMAIL,
        `New ${paymentMethod} Order Completed: ${orderId}`,
        emailBody
      );
      console.log(`Email sent to admin for order: ${orderId}`);
    } catch (emailErr) {
      console.error('Failed to send email to admin:', emailErr);
    }

    try {
      await sendOrderSmsToAdmins({
        orderId,
        userEmail: user.email,
        status: newOrder.status,
        total,
        discount,
        items,
        paymentId,
      });
      console.log(`SMS sent to admins for order: ${orderId}`);
    } catch (smsErr) {
      console.error('Failed to send SMS to admins:', smsErr);
    }

    res.status(201).json({ orderId, paymentId });
  } catch (err) {
    console.error('Error saving order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save order', details: err.message });
  }
});

// POST /api/order/stripe/create - Create Stripe Payment Intent
router.post('/stripe/create', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.pcsPerCase').isInt({ min: 1 }).withMessage('pcsPerCase must be a positive integer'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in create Stripe payment:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Creating Stripe payment intent:', req.body);
    const { userId, items, total, discount } = req.body;

    const settingsDocs = await Settings.find();
    const settings = {};
    settingsDocs.forEach(doc => { settings[doc.key] = doc.value; });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const calculated = calculateFees(subtotal, settings, discount);

    console.log('Backend calculations:', calculated);

    if (Math.abs(calculated.total - total) > 0.01) {
      console.error('Total mismatch:', { calculated: calculated.total, received: total });
      return res.status(400).json({ error: 'Total amount mismatch' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'usd',
      metadata: { userId, orderType: 'ecommerce', app: 'bagstory' },
      description: `Order for user ${userId}`,
    });

    console.log('Stripe Payment Intent created:', paymentIntent.id);
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error('Stripe Error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create Stripe payment intent', details: err.message });
  }
});

// POST /api/order/stripe/complete - Complete order after Stripe payment
router.post('/stripe/complete', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('paypalOrderId').optional().notEmpty().withMessage('PayPal Order ID is required for PayPal payments'),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('items.*.pcsPerCase').isInt({ min: 1 }).withMessage('pcsPerCase must be a positive integer'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('paymentMethod').isIn(['paypal', 'stripe']).withMessage('Invalid payment method'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in complete order:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('Completing order:', req.body);
    const { userId, paypalOrderId, paymentId, items, total, discount, paymentMethod } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const settingsDocs = await Settings.find();
    const settings = {};
    settingsDocs.forEach(doc => { settings[doc.key] = doc.value; });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const calculated = calculateFees(subtotal, settings, discount);

    if (Math.abs(calculated.total - total) > 0.01) {
      console.error('Total mismatch in complete:', { calculated: calculated.total, received: total });
      return res.status(400).json({ error: 'Total amount mismatch' });
    }

    // Verify PayPal payment status
    if (paymentMethod === 'paypal') {
      const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
      const order = await paypalClient.execute(request);
      if (order.result.status !== 'COMPLETED') {
        console.warn('PayPal payment not completed:', order.result.status);
        return res.status(400).json({ error: 'PayPal payment not completed' });
      }
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
      discount,
      paymentId,
      paymentStatus: 'COMPLETED',
      status: 'Processing',
      paymentMethod,
    });

    await newOrder.save();
    console.log(`Order saved: ${orderId}`);

    const lead = await Lead.findOne({ email: user.email });
    if (lead) {
      lead.orderId = newOrder._id;
      lead.status = 'Converted';
      await lead.save();
      console.log(`Lead updated with orderId: ${newOrder._id}`);
    }

    try {
      const emailBody = `
        New ${paymentMethod} Order Completed: ${orderId}
        User: ${user.email}
        Status: ${newOrder.status}
        Total: $${total.toFixed(2)}
        Discount: $${discount.toFixed(2)}
        Items: ${items.map(item => `${item.name} (Qty: ${item.quantity}, Price: $${item.price})`).join(', ')}
        Payment ID: ${paymentId}
      `;
      await sendEmail(
        process.env.ADMIN_EMAIL,
        `New ${paymentMethod} Order Completed: ${orderId}`,
        emailBody
      );
      console.log(`Email sent to admin for order: ${orderId}`);
    } catch (emailErr) {
      console.error('Failed to send email to admin:', emailErr);
    }

    try {
      await sendOrderSmsToAdmins({
        orderId,
        userEmail: user.email,
        status: newOrder.status,
        total,
        discount,
        items,
        paymentId,
      });
      console.log(`SMS sent to admins for order: ${orderId}`);
    } catch (smsErr) {
      console.error('Failed to send SMS to admins:', smsErr);
    }

    res.status(201).json({ orderId, paymentId });
  } catch (err) {
    console.error('Error saving order:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to save order', details: err.message });
  }
});

// POST /api/order/stripe/webhook - Handle Stripe webhook events
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent succeeded:', paymentIntent.id);

      try {
        const order = await Order.findOne({ paymentId: paymentIntent.id });
        if (order) {
          order.paymentStatus = 'COMPLETED';
          await order.save();
          console.log(`Order updated for PaymentIntent ${paymentIntent.id}`);

          const user = await User.findById(order.userId);
          if (!user) {
            console.error('User not found for order:', order.userId);
            break;
          }

          const emailBody = `
            Stripe Payment Succeeded for Order: ${order.orderId}
            User: ${user.email}
            Total: $${order.total.toFixed(2)}
            Payment ID: ${paymentIntent.id}
          `;
          await sendEmail(
            process.env.ADMIN_EMAIL,
            `Stripe Payment Succeeded: ${order.orderId}`,
            emailBody
          );
          console.log(`Email sent to admin for order: ${order.orderId}`);    

          await sendOrderSmsToAdmins({
            orderId: order.orderId,
            userEmail: user.email,
            status: order.status,
            total: order.total,
            discount: order.discount,
            items: order.items,
            paymentId: paymentIntent.id,
          });
          console.log(`SMS sent to admins for order: ${order.orderId}`);
        }
      } catch (err) {
        console.error('Error processing payment_intent.succeeded:', err.message);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      console.log('PaymentIntent failed:', failedPaymentIntent.id);

      try {
        const order = await Order.findOne({ paymentId: failedPaymentIntent.id });
        if (order) {
          order.paymentStatus = 'FAILED';
          await order.save();
          console.log(`Order updated to FAILED for PaymentIntent ${failedPaymentIntent.id}`);
        }
      } catch (err) {
        console.error('Error processing payment_intent.payment_failed:', err.message);
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

// PUT /api/order/:id/status - Update order status (Admin only)
router.put(
  '/:id/status',
  isAdmin,
  [
    body('status')
      .isIn(['Processing', 'Shipped', 'Delivered', 'Cancelled'])
      .withMessage('Invalid status. Must be one of: Processing, Shipped, Delivered, Cancelled'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        logger.warn(`Order with ID ${id} not found`);
        return res.status(404).json({ error: 'Order not found' });
      }

      order.status = status;
      await order.save();

      logger.info(`Updated status of order with ID ${id} to ${status}`);
      const transformedOrder = {
        ...order.toObject(),
        id: order._id.toString(),
        _id: undefined,
      };
      res.json(transformedOrder);
    } catch (err) {
      logger.error(`Error updating order status with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/order/test-sms - Test SMS notifications
router.post('/test-sms', async (req, res) => {
  try {
    const sampleOrder = {
      orderId: 'ECO-TEST-001',
      userEmail: 'testuser@example.com',
      status: 'Processing',
      total: 99.99,
      discount: 5.00,
      items: [
        { name: 'Wine Vest Bag', quantity: 2, price: 0.1 },
        { name: 'Medium Vest Bag', quantity: 1, price: 0.11 },
      ],
      paymentId: 'PAYID-TEST123',
    };

    await sendOrderSmsToAdmins(sampleOrder);

    res.status(200).json({ message: 'SMS test triggered successfully. Check the admin phone numbers for the message.' });
  } catch (err) {
    console.error('Error in test-sms endpoint:', err.message);
    res.status(500).json({ error: 'Failed to trigger SMS test', details: err.message });
  }
});

module.exports = router;