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
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
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
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { key, value } = req.body;
    const setting = await Settings.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    res.status(200).json(setting);
  } catch (err) {
    console.error('Error updating setting:', err.message);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

module.exports = router;