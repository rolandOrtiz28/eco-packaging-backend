const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Middleware to check if user is admin (assuming you have this)
const isAdmin = (req, res, next) => {
  console.log('isAdmin middleware (leads.js):', {
    isAuthenticated: req.isAuthenticated(),
    user: req.user,
    role: req.user?.role,
  });
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  console.warn('Unauthorized access attempt to leads route', { user: req.user });
  return res.status(403).json({ error: 'Access denied. Admin only.' });
};

// GET /leads - Fetch all leads (for admin)
router.get('/', isAdmin, async (req, res) => {
  try {
    console.log('Fetching all leads');
    const leads = await Lead.find();
    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /leads/clear - Clear all leads
router.delete('/clear', isAdmin, async (req, res) => {
  try {
    await Lead.deleteMany({});
    res.json({ message: 'All leads cleared successfully' });
  } catch (err) {
    console.error('Error clearing leads:', err.message, err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /leads/users - Fetch all users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /leads/:id/status - Update lead status
router.put('/:id/status', isAdmin, [
  body('status').isIn(['New', 'Contacted', 'Qualified', 'Converted']).withMessage('Invalid status'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { status } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    lead.status = status;
    await lead.save();

    res.json(lead);
  } catch (err) {
    console.error('Error updating lead status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;