const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Lead = require('../models/Lead');
const Quote = require('../models/Quote');
const Order = require('../models/Order');
const User = require('../models/User');

// POST /analytics/visit - Log page visit
router.post('/visit', async (req, res) => {
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

// GET /visits - Fetch all visits (for admin)
router.get('/visits', async (req, res) => {
  try {
    console.log('Fetching all visits');
    const visits = await Analytics.find();
    res.json(visits);
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /summary - Fetch aggregated analytics data
// GET /summary - Fetch aggregated analytics data
router.get('/summary', async (req, res) => {
  try {
    console.log('Fetching analytics summary');

    // Get current and previous month's date ranges (adjust for UTC)
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
    const currentMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    const previousMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0));
    const previousMonthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999));

    // Log the date ranges for debugging
    console.log('Current Month Range:', currentMonthStart, 'to', currentMonthEnd);
    console.log('Previous Month Range:', previousMonthStart, 'to', previousMonthEnd);

    // Current month data
    const currentTotalVisits = await Analytics.countDocuments({
      timestamp: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const currentLeadsCount = await Lead.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const currentQuoteRequests = await Quote.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const currentTotalUsers = await User.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const currentTotalOrders = await Order.countDocuments({
      paymentStatus: 'COMPLETED',
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });

    // Previous month data
    const previousTotalVisits = await Analytics.countDocuments({
      timestamp: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });
    const previousLeadsCount = await Lead.countDocuments({
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });
    const previousQuoteRequests = await Quote.countDocuments({
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });
    const previousTotalUsers = await User.countDocuments({
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });
    const previousTotalOrders = await Order.countDocuments({
      paymentStatus: 'COMPLETED',
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });

    // Log the counts for debugging
    console.log('Current Quote Requests:', currentQuoteRequests);
    console.log('Previous Quote Requests:', previousQuoteRequests);

    // Lifetime data (for overall metrics)
    const totalVisits = await Analytics.countDocuments();
    const leadsCount = await Lead.countDocuments();
    const quoteRequests = await Quote.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments({ paymentStatus: 'COMPLETED' });

    // Calculate conversion rates for current month
    const currentLeadConversionRate = currentTotalVisits > 0 ? Math.min((currentLeadsCount / currentTotalVisits) * 100, 100) : 0;
    const currentTotalPotentialCustomers = currentLeadsCount + currentTotalUsers;
    const currentSalesConversionRate = currentTotalPotentialCustomers > 0 ? Math.min((currentTotalOrders / currentTotalPotentialCustomers) * 100, 100) : 0;

    // Calculate conversion rates for previous month
    const previousLeadConversionRate = previousTotalVisits > 0 ? Math.min((previousLeadsCount / previousTotalVisits) * 100, 100) : 0;
    const previousTotalPotentialCustomers = previousLeadsCount + previousTotalUsers;
    const previousSalesConversionRate = previousTotalPotentialCustomers > 0 ? Math.min((previousTotalOrders / previousTotalPotentialCustomers) * 100, 100) : 0;

    // Calculate percentage changes
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) {
        if (current === 0) return 0; // No change if both are 0
        return 100; // If previous is 0 and current is positive, show 100% increase
      }
      return ((current - previous) / previous) * 100;
    };

    const totalVisitsChange = calculatePercentageChange(currentTotalVisits, previousTotalVisits).toFixed(1);
    const leadsCountChange = calculatePercentageChange(currentLeadsCount, previousLeadsCount).toFixed(1);
    const quoteRequestsChange = calculatePercentageChange(currentQuoteRequests, previousQuoteRequests).toFixed(1);
    const leadConversionRateChange = calculatePercentageChange(currentLeadConversionRate, previousLeadConversionRate).toFixed(1);
    const salesConversionRateChange = calculatePercentageChange(currentSalesConversionRate, previousSalesConversionRate).toFixed(1);

    // Aggregate visits by page (lifetime)
    const visitsByPage = await Analytics.aggregate([
      { $group: { _id: '$pageUrl', visits: { $sum: 1 } } },
      { $project: { name: '$_id', visits: 1, _id: 0 } },
    ]);

    // Aggregate visits by time (day of week, lifetime)
   // Aggregate visits by time (daily visits for the last 30 days)
const visitsByTime = await Analytics.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    },
  },
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
      visits: { $sum: 1 },
    },
  },
  {
    $project: {
      name: '$_id',
      visits: 1,
      _id: 0,
    },
  },
  { $sort: { name: 1 } },
]);
    // Aggregate conversions (leads) by month (lifetime)
    const conversions = await Lead.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          name: {
            $concat: [
              { $arrayElemAt: [['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], { $subtract: ['$_id.month', 1] }] },
              ' ',
              { $toString: '$_id.year' },
            ],
          },
          value: 1,
          _id: 0,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.json({
      totalVisits,
      leadsCount,
      quoteRequests,
      leadConversionRate: currentLeadConversionRate,
      salesConversionRate: currentSalesConversionRate,
      totalVisitsChange,
      leadsCountChange,
      quoteRequestsChange,
      leadConversionRateChange,
      salesConversionRateChange,
      visitsByPage,
      visitsByTime,
      conversions,
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;