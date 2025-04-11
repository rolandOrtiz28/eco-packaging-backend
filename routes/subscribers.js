const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail');

router.post('/', [
  body('email').isEmail().withMessage('Invalid email'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { email } = req.body;
    const subscriber = new Subscriber({ email });
    await subscriber.save();

    // Send confirmation email
    await sendEmail(
      email,
      "Welcome to Eco Packaging!",
      "Thank you for subscribing to our newsletter! Stay tuned for updates and offers."
    );

    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Error subscribing:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const subscribers = await Subscriber.find();
    res.json(subscribers);
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;