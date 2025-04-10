const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Quote = require('../models/Quote'); // Import Quote model
const logger = require('../config/logger');
const multer = require('multer');
const { cloudinary, storage } = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail'); // Import your sendEmail utility

// Multer setup for Cloudinary
const upload = multer({ storage });

// Middleware to check if user is admin using session
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  logger.warn('Unauthorized access attempt to admin route', { user: req.user });
  return res.status(403).json({ error: 'Unauthorized: Admin access required' });
};

// GET /products - Fetch all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    logger.info(`Fetched ${products.length} products from database`);
    const transformedProducts = products.map(product => ({
      ...product.toObject(),
      id: product._id.toString(),
      _id: undefined,
    }));
    res.json(transformedProducts);
  } catch (err) {
    logger.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /product/:id - Fetch a single product
router.get('/product/:id', async (req, res) => {
  try {
    logger.info(`Fetching product with ID: ${req.params.id}`);
    const product = await Product.findById(req.params.id);
    if (!product) {
      logger.warn(`Product with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Product not found' });
    }
    const transformedProduct = {
      ...product.toObject(),
      id: product._id.toString(),
      _id: undefined,
    };
    res.json(transformedProduct);
  } catch (err) {
    logger.error(`Error fetching product with ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /related-products/:id - Fetch related products
router.get('/related-products/:id', async (req, res) => {
  try {
    logger.info(`Fetching related products for product ID: ${req.params.id}`);
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      logger.warn(`Product with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Product not found' });
    }
    const relatedProducts = await Product.find({
      _id: { $ne: req.params.id },
      category: currentProduct.category,
    }).limit(4);
    const transformedRelatedProducts = relatedProducts.map(product => ({
      ...product.toObject(),
      id: product._id.toString(),
      _id: undefined,
    }));
    res.json(transformedRelatedProducts);
  } catch (err) {
    logger.error(`Error fetching related products for product ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /distributor-products - Fetch products for distributors
router.get('/distributor-products', async (req, res) => {
  try {
    logger.info('Fetching distributor products');
    const products = await Product.find();
    const transformedProducts = products.map(product => ({
      ...product.toObject(),
      id: product._id.toString(),
      _id: undefined,
    }));
    res.json(transformedProducts);
  } catch (err) {
    logger.error('Error fetching distributor products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /products - Create a new product (Admin only)
router.post(
  '/products',
  isAdmin,
  upload.array('images', 5),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('bulkPrice').isFloat({ min: 0 }).withMessage('Bulk price must be a positive number'),
    body('moq').isInt({ min: 1 }).withMessage('MOQ must be a positive integer'),
    body('pcsPerCase').isInt({ min: 1 }).withMessage('Pieces per case must be a positive integer'),
    body('category').notEmpty().withMessage('Category is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, price, bulkPrice, moq, pcsPerCase, category, tags, featured, details } = req.body;

      const imageUrls = req.files.map(file => file.path);

      const parsedDetails = JSON.parse(details);
      parsedDetails.pricing = parsedDetails.pricing.map(tier => {
        const parsedPrice = parseFloat(tier.pricePerUnit);
        return {
          ...tier,
          pricePerUnit: isNaN(parsedPrice) ? tier.pricePerUnit : parsedPrice,
        };
      });

      const product = new Product({
        name,
        description,
        price: parseFloat(price),
        bulkPrice: parseFloat(bulkPrice),
        moq: parseInt(moq),
        pcsPerCase: parseInt(pcsPerCase),
        image: imageUrls[0],
        images: imageUrls,
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        featured: featured === 'true',
        details: parsedDetails,
      });

      await product.save();
      logger.info(`Created new product: ${product.name} (ID: ${product._id})`);
      const transformedProduct = {
        ...product.toObject(),
        id: product._id.toString(),
        _id: undefined,
      };
      res.status(201).json(transformedProduct);
    } catch (err) {
      logger.error('Error creating product:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /products/:id - Update a product (Admin only)
router.put(
  '/products/:id',
  isAdmin,
  upload.array('images', 5),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().notEmpty().withMessage('Description cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('bulkPrice').optional().isFloat({ min: 0 }).withMessage('Bulk price must be a positive number'),
    body('moq').optional().isInt({ min: 1 }).withMessage('MOQ must be a positive integer'),
    body('pcsPerCase').optional().isInt({ min: 1 }).withMessage('Pieces per case must be a positive integer'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        logger.warn(`Product with ID ${req.params.id} not found`);
        return res.status(404).json({ error: 'Product not found' });
      }

      const { name, description, price, bulkPrice, moq, pcsPerCase, category, tags, featured, details, existingImages, mainImageIndex } = req.body;

      if (name) product.name = name;
      if (description) product.description = description;
      if (price) product.price = parseFloat(price);
      if (bulkPrice) product.bulkPrice = parseFloat(bulkPrice);
      if (moq) product.moq = parseInt(moq);
      if (pcsPerCase) product.pcsPerCase = parseInt(pcsPerCase);
      if (category) product.category = category;
      if (tags) product.tags = tags.split(',').map(tag => tag.trim());
      if (featured !== undefined) product.featured = featured === 'true';
      if (details) {
        const parsedDetails = JSON.parse(details);
        parsedDetails.pricing = parsedDetails.pricing.map(tier => {
          const parsedPrice = parseFloat(tier.pricePerUnit);
          return {
            ...tier,
            pricePerUnit: isNaN(parsedPrice) ? tier.pricePerUnit : parsedPrice,
          };
        });
        product.details = parsedDetails;
      }

      // Handle images
      let updatedImages = existingImages ? JSON.parse(existingImages) : [];
      if (req.files && req.files.length > 0) {
        const newImageUrls = req.files.map(file => file.path);
        updatedImages = [...updatedImages, ...newImageUrls];
      }

      if (updatedImages.length > 0) {
        const mainIndex = parseInt(mainImageIndex, 10) || 0;
        product.image = updatedImages[mainIndex] || updatedImages[0];
        product.images = updatedImages;
      } else {
        product.image = null;
        product.images = [];
      }

      await product.save();
      logger.info(`Updated product: ${product.name} (ID: ${product._id})`);
      const transformedProduct = {
        ...product.toObject(),
        id: product._id.toString(),
        _id: undefined,
      };
      res.json(transformedProduct);
    } catch (err) {
      logger.error(`Error updating product with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /products/:id - Delete a product (Admin only)
router.delete(
  '/products/:id',
  isAdmin,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        logger.warn(`Product with ID ${req.params.id} not found`);
        return res.status(404).json({ error: 'Product not found' });
      }

      await Product.deleteOne({ _id: req.params.id });
      logger.info(`Deleted product with ID: ${req.params.id}`);
      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      logger.error(`Error deleting product with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post(
  '/quote',
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('company').notEmpty().withMessage('Company name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { productId, productName, name, email, phone, company, quantity, message } = req.body;

      // Save the quote to the database
      const quote = new Quote({
        productId,
        productName,
        name,
        email,
        phone,
        company,
        quantity,
        message,
      });
      await quote.save();

      // Send email to admin using sendEmail.js
      const emailText = `
        New Quote Request for ${productName}
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Company: ${company}
        Quantity: ${quantity}
        Message: ${message || 'N/A'}
        Please respond to this quote request at your earliest convenience.
      `;
      await sendEmail(
        process.env.ADMIN_EMAIL,
        `New Quote Request for ${productName}`,
        emailText
      );

      res.status(201).json({ message: 'Quote request submitted successfully' });
    } catch (err) {
      logger.error('Error submitting quote request:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /quotes - Fetch all quote requests (Admin only)
router.get(
  '/quotes',
  isAdmin,
  async (req, res) => {
    try {
      const quotes = await Quote.find().populate('productId', 'name');
      const transformedQuotes = quotes.map(quote => ({
        ...quote.toObject(),
        id: quote._id.toString(),
        _id: undefined,
      }));
      res.json(transformedQuotes);
    } catch (err) {
      logger.error('Error fetching quotes:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /quotes/:id/status - Update quote status (Admin only)
router.put(
  '/quotes/:id/status',
  isAdmin,
  [
    body('status').isIn(['pending', 'responded', 'closed']).withMessage('Invalid status'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      const quote = await Quote.findById(id);
      if (!quote) {
        logger.warn(`Quote with ID ${id} not found`);
        return res.status(404).json({ error: 'Quote not found' });
      }

      quote.status = status;
      await quote.save();

      logger.info(`Updated status of quote with ID ${id} to ${status}`);
      const transformedQuote = {
        ...quote.toObject(),
        id: quote._id.toString(),
        _id: undefined,
      };
      res.json(transformedQuote);
    } catch (err) {
      logger.error(`Error updating quote status with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /quotes/:id/reply - Send reply email to user (Admin only)
router.post(
  '/quotes/:id/reply',
  isAdmin,
  [
    body('replyMessage').notEmpty().withMessage('Reply message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { replyMessage } = req.body;

      const quote = await Quote.findById(id).populate('productId', 'name');
      if (!quote) {
        logger.warn(`Quote with ID ${id} not found`);
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Send reply email to the user
      const emailText = `
        Dear ${quote.name},

        Thank you for your quote request for ${quote.productName}.

        ${replyMessage}

        If you have any further questions, feel free to reach out.

        Best regards,
        Eco Packaging Team
      `;
      await sendEmail(
        quote.email,
        `Response to Your Quote Request for ${quote.productName}`,
        emailText
      );

      // Update quote status to 'responded'
      quote.status = 'responded';
      await quote.save();

      logger.info(`Sent reply email for quote with ID ${id}`);
      const transformedQuote = {
        ...quote.toObject(),
        id: quote._id.toString(),
        _id: undefined,
      };
      res.json(transformedQuote);
    } catch (err) {
      logger.error(`Error sending reply email for quote with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /quotes/:id - Delete a quote (Admin only)
router.delete(
  '/quotes/:id',
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const quote = await Quote.findById(id);
      if (!quote) {
        logger.warn(`Quote with ID ${id} not found`);
        return res.status(404).json({ error: 'Quote not found' });
      }

      await Quote.deleteOne({ _id: id });
      logger.info(`Deleted quote with ID: ${id}`);
      res.json({ message: 'Quote deleted successfully' });
    } catch (err) {
      logger.error(`Error deleting quote with ID ${req.params.id}:`, err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;