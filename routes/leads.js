const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { body, validationResult } = require('express-validator');

// POST /contact - Submit contact form
router.post('/contact', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('message').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in contact form:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    console.log('Submitting contact form:', req.body);
    const { name, email, message } = req.body;
    const lead = new Lead({
      name,
      email,
      source: 'Contact Form',
      date: new Date().toISOString().split('T')[0],
      message,
    });
    await lead.save();
    res.status(201).json({ message: 'Contact form submitted' });
  } catch (err) {
    console.error('Error submitting contact form:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /quote - Submit quote request
router.post('/quote', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('message').trim().notEmpty().withMessage('Message is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in quote request:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    console.log('Submitting quote request:', req.body);
    const { name, email, message } = req.body;
    const lead = new Lead({
      name,
      email,
      source: 'Quote Request',
      date: new Date().toISOString().split('T')[0],
      message,
    });
    await lead.save();
    res.status(201).json({ message: 'Quote request submitted' });
  } catch (err) {
    console.error('Error submitting quote request:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /leads - Fetch all leads (for admin)
router.get('/leads', async (req, res) => {
  try {
    console.log('Fetching all leads');
    const leads = await Lead.find();
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/leads/clear', async (req, res) => {
  try {
    await Lead.deleteMany({});
    res.json({ message: 'All leads cleared successfully' });
  } catch (err) {
    console.error('Error clearing leads:', err.message, err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;