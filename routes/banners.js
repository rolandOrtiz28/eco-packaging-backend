const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const { cloudinary, storage } = require('../config/cloudinary');
const logger = require('../config/logger');

// Multer setup for Cloudinary
const upload = multer({ storage });

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  logger.warn('Unauthorized access attempt to admin route', { user: req.user });
  return res.status(403).json({ error: 'Unauthorized: Admin access required' });
};

// GET /banners - Fetch all banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    const transformedBanners = banners.map(banner => ({
      ...banner.toObject(),
      id: banner._id.toString(),
      _id: undefined,
    }));
    logger.info(`Fetched ${banners.length} banners from database`);
    res.json(transformedBanners);
  } catch (err) {
    logger.error('Error fetching banners:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /banners - Create a new banner (Admin only)
router.post(
  '/',
  isAdmin,
  upload.single('image'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('isActive').isBoolean().withMessage('IsActive must be a boolean'),
    body('titleColor').optional().isIn(['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco']).withMessage('Invalid title color'),
    body('subtitleColor').optional().isIn(['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco']).withMessage('Invalid subtitle color'),
    body('ctaColor').optional().isIn(['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco']).withMessage('Invalid CTA color'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in banner creation', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let imageUrl = '';
      if (req.file) {
        imageUrl = req.file.path;
      } else {
        logger.warn('No image provided for banner creation');
        return res.status(400).json({ error: 'Banner image is required' });
      }

      const banner = new Banner({
        title: req.body.title,
        subtitle: req.body.subtitle,
        image: imageUrl,
        ctaText: req.body.ctaText,
        ctaLink: req.body.ctaLink,
        bgColor: req.body.bgColor,
        titleColor: req.body.titleColor || 'light',
        subtitleColor: req.body.subtitleColor || 'light',
        ctaColor: req.body.ctaColor || 'light',
        isActive: req.body.isActive === 'true',
      });

      await banner.save();
      logger.info(`Created new banner: ${banner.title} (ID: ${banner._id})`);
      req.app.get('io').emit('new-banner');
      const transformedBanner = {
        ...banner.toObject(),
        id: banner._id.toString(),
        _id: undefined,
      };
      res.status(201).json(transformedBanner);
    } catch (err) {
      logger.error('Error creating banner:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

// PUT /banners/:id - Update a banner (Admin only)
router.put(
  '/:id',
  isAdmin,
  upload.single('image'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('isActive').isBoolean().withMessage('IsActive must be a boolean'),
    body('titleColor').optional().isIn(['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco']).withMessage('Invalid title color'),
    body('subtitleColor').optional().isIn(['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco']).withMessage('Invalid subtitle color'),
    body('ctaColor').optional().isIn(['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco']).withMessage('Invalid CTA color'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors in banner update', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const banner = await Banner.findById(req.params.id);
      if (!banner) {
        logger.warn(`Banner with ID ${req.params.id} not found`);
        return res.status(404).json({ error: 'Banner not found' });
      }

      let imageUrl = banner.image;
      if (req.file) {
        imageUrl = req.file.path;
      }

      banner.title = req.body.title;
      banner.subtitle = req.body.subtitle;
      banner.image = imageUrl;
      banner.ctaText = req.body.ctaText;
      banner.ctaLink = req.body.ctaLink;
      banner.bgColor = req.body.bgColor;
      banner.titleColor = req.body.titleColor || banner.titleColor || 'light';
      banner.subtitleColor = req.body.subtitleColor || banner.subtitleColor || 'light';
      banner.ctaColor = req.body.ctaColor || banner.ctaColor || 'light';
      banner.isActive = req.body.isActive === 'true';

      await banner.save();
      logger.info(`Updated banner: ${banner.title} (ID: ${banner._id})`);
      const transformedBanner = {
        ...banner.toObject(),
        id: banner._id.toString(),
        _id: undefined,
      };
      res.json(transformedBanner);
    } catch (err) {
      logger.error('Error updating banner:', err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  }
);

// DELETE /banners/:id - Delete a banner (Admin only)
router.delete(
  '/:id',
  isAdmin,
  async (req, res) => {
    try {
      const banner = await Banner.findByIdAndDelete(req.params.id);
      if (!banner) {
        logger.warn(`Banner with ID ${req.params.id} not found`);
        return res.status(404).json({ error: 'Banner not found' });
      }
      logger.info(`Deleted banner with ID: ${req.params.id}`);
      res.json({ message: 'Banner deleted successfully' });
    } catch (err) {
      logger.error(`Error deleting banner with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.get('/test', (req, res) => {
  res.json({ message: 'Banners route working' });
});


module.exports = router;