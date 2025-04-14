const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// GET /api/settings - Get all settings (public)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find();
    const settingsMap = {};
    const numericKeys = ['taxRate', 'deliveryFee', 'freeDeliveryThreshold', 'surCharge'];
    settings.forEach(setting => {
      settingsMap[setting.key] = numericKeys.includes(setting.key) 
        ? parseFloat(setting.value) || 0 
        : setting.value;
    });
    
    res.status(200).json(settingsMap);
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Update or create a setting (admin only)
router.post('/', isAdmin, [
  body('key').notEmpty().withMessage('Key is required'),
  body('value').notEmpty().withMessage('Value is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('Validation errors in settings update:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { key, value } = req.body;
    // Convert value to number if it's a numeric setting
    const numericKeys = ['taxRate', 'deliveryFee', 'freeDeliveryThreshold', 'surCharge'];
    const parsedValue = numericKeys.includes(key) ? parseFloat(value) : value;

    if (numericKeys.includes(key) && isNaN(parsedValue)) {
      console.warn(`Invalid numeric value for ${key}:`, value);
      return res.status(400).json({ error: `Value for ${key} must be a valid number` });
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value: parsedValue },
      { upsert: true, new: true }
    );
   
    res.status(200).json(setting);
  } catch (err) {
    console.error('Error updating setting:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to update setting', details: err.message });
  }
});

module.exports = router;