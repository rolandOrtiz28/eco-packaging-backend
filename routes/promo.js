const express = require('express');
const router = express.Router();
const PromoCode = require('../models/PromoCode');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// POST /api/promo - Create a new promo code (admin only)
router.post('/', isAdmin, [
  body('code').notEmpty().withMessage('Promo code is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('minOrderValue').isFloat({ min: 0 }).withMessage('Minimum order value must be a positive number'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Max discount must be a positive number'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').isISO8601().withMessage('End date must be a valid date'),
  body('usageLimit').optional().isInt({ min: 1 }).withMessage('Usage limit must be a positive integer'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in create promo code:', errors.array()); // Add logging
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { code, discountType, discountValue, minOrderValue, maxDiscount, startDate, endDate, usageLimit } = req.body;

    const existingPromo = await PromoCode.findOne({ code });
    if (existingPromo) {
      console.error(`Promo code already exists: ${code}`); // Add logging
      return res.status(400).json({ error: 'Promo code already exists' });
    }

    const promoCode = new PromoCode({
      code,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      isActive: true,
    });

    await promoCode.save();
    res.status(201).json(promoCode);
  } catch (err) {
    console.error('Error creating promo code:', err.message, err.stack); // Add detailed logging
    res.status(500).json({ error: 'Failed to create promo code', details: err.message });
  }
});

// GET /api/promo - Get all promo codes (admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const promoCodes = await PromoCode.find();
    res.status(200).json(promoCodes);
  } catch (err) {
    console.error('Error fetching promo codes:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

router.put('/:id', isAdmin, [
    body('code').notEmpty().withMessage('Promo code is required'),
    body('discountType').isIn(['percentage', 'fixed']).withMessage('Discount type must be percentage or fixed'),
    body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
    body('minOrderValue').isFloat({ min: 0 }).withMessage('Minimum order value must be a positive number'),
    body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Max discount must be a positive number'),
    body('startDate').isISO8601().withMessage('Start date must be a valid date'),
    body('endDate').isISO8601().withMessage('End date must be a valid date'),
    body('usageLimit').optional().isInt({ min: 1 }).withMessage('Usage limit must be a positive integer'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('Validation errors in update promo code:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      const { id } = req.params;
      const { code, discountType, discountValue, minOrderValue, maxDiscount, startDate, endDate, usageLimit, isActive } = req.body;
  
      const promoCode = await PromoCode.findById(id);
      if (!promoCode) {
        logger.error(`Promo code not found: ${id}`);
        return res.status(404).json({ error: 'Promo code not found' });
      }
  
      // Check if the new code is already in use by another promo code
      const existingPromo = await PromoCode.findOne({ code, _id: { $ne: id } });
      if (existingPromo) {
        logger.error(`Promo code already exists: ${code}`);
        return res.status(400).json({ error: 'Promo code already exists' });
      }
  
      promoCode.code = code;
      promoCode.discountType = discountType;
      promoCode.discountValue = discountValue;
      promoCode.minOrderValue = minOrderValue;
      promoCode.maxDiscount = maxDiscount || null;
      promoCode.startDate = startDate;
      promoCode.endDate = endDate;
      promoCode.usageLimit = usageLimit || null;
      promoCode.isActive = isActive;
  
      await promoCode.save();
      logger.info(`Promo code updated: ${id}`);
      res.status(200).json(promoCode);
    } catch (err) {
      logger.error('Error updating promo code:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to update promo code', details: err.message });
    }
  });

// POST /api/promo/apply - Apply a promo code (public)
router.post('/apply', [
    body('code').notEmpty().withMessage('Promo code is required'),
    body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal must be a positive number'),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('Validation errors in apply promo code:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      logger.info('Applying promo code with request body:', req.body);
      const { code, subtotal } = req.body;
  
      const promoCode = await PromoCode.findOne({ code, isActive: true });
  
      if (!promoCode) {
        logger.error(`Invalid or inactive promo code: ${code}`);
        return res.status(400).json({ error: 'Invalid or inactive promo code' });
      }
  
      const currentDate = new Date();
      const startDate = new Date(promoCode.startDate);
      const endDate = new Date(promoCode.endDate);
  
      if (currentDate < startDate) {
        logger.error(`Promo code is not yet valid: ${code}, Valid from: ${startDate}`);
        return res.status(400).json({ error: 'Promo code is not yet valid' });
      }
      if (currentDate > endDate) {
        logger.error(`Promo code has expired: ${code}, Expired on: ${endDate}`);
        return res.status(400).json({ error: 'Promo code has expired' });
      }
  
      if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
        logger.error(`Promo code usage limit reached: ${code}`);
        return res.status(400).json({ error: 'Promo code usage limit reached' });
      }
  
      if (subtotal < promoCode.minOrderValue) {
        logger.error(`Minimum order value not met for promo code ${code}: Subtotal ${subtotal}, Required ${promoCode.minOrderValue}`);
        return res.status(400).json({ error: `Minimum order value of $${promoCode.minOrderValue} required` });
      }
  
      let discount = 0;
      if (promoCode.discountType === 'percentage') {
        discount = (promoCode.discountValue / 100) * subtotal;
        if (promoCode.maxDiscount && discount > promoCode.maxDiscount) {
          discount = promoCode.maxDiscount;
        }
      } else {
        discount = promoCode.discountValue;
      }
  
      // Increment used count
      promoCode.usedCount += 1;
      await promoCode.save();
  
      res.status(200).json({ discount });
    } catch (err) {
      logger.error('Error applying promo code:', err.message, err.stack);
      res.status(500).json({ error: 'Failed to apply promo code' });
    }
  });

module.exports = router;