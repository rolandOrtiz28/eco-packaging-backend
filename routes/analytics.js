const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// POST /analytics/visit - Log page visit
router.post('/analytics/visit', async (req, res) => {
  try {
    console.log('Logging page visit:', req.body);
    const { pageUrl } = req.body;
    const userIp = req.ip;
    const visit = new Analytics({ pageUrl, userIp });
    await visit.save();
    res.status(201).json({ message: 'Visit logged' });
  } catch (err) {
    console.error('Error logging visit:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /analytics/visits - Fetch all visits (for admin)
router.get('/analytics/visits', async (req, res) => {
  try {
    console.log('Fetching all visits');
    const visits = await Analytics.find();
    res.json(visits);
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /analytics/summary - Fetch aggregated analytics data
router.get('/analytics/summary', async (req, res) => {
  try {
    console.log('Fetching analytics summary');
    const totalVisits = await Analytics.countDocuments();
    const visitsByPage = await Analytics.aggregate([
      { $group: { _id: '$pageUrl', visits: { $sum: 1 } } },
      { $project: { name: '$_id', visits: 1, _id: 0 } },
    ]);
    const visitsByTime = await Analytics.aggregate([
      { $group: { _id: { $dayOfWeek: '$timestamp' }, visits: { $sum: 1 } } },
      { $project: { name: { $arrayElemAt: [['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], { $subtract: ['$_id', 1] }] }, visits: 1, _id: 0 } },
    ]);
    res.json({
      totalVisits,
      visitsByPage,
      visitsByTime,
      conversionRate: 3.8, // Placeholder
      leadsCount: 0, // Placeholder
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;