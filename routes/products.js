const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');
const logger = require('../config/logger');
const multer = require('multer');
const { cloudinary, storage } = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');
const sendEmail = require('../utils/sendEmail');

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
router.get('/', async (req, res) => {
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
  '/',
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
    body('inStock').optional().isBoolean().withMessage('In stock must be a boolean'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, price, bulkPrice, moq, pcsPerCase, category, tags, featured, inStock, isEcoFriendly, isBestSeller, isTrending, isTopRated, isCustomizable, details } = req.body;

      const imageUrls = req.files.map(file => file.path);

      if (imageUrls.length === 0) {
        return res.status(400).json({ error: 'At least one image is required to create a product' });
      }

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
        inStock: inStock === 'true',
        isEcoFriendly: isEcoFriendly === 'true',
        isBestSeller: isBestSeller === 'true',
        isTrending: isTrending === 'true',
        isTopRated: isTopRated === 'true',
        isCustomizable: isCustomizable === 'true',
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
  '/:id',
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
    body('inStock').optional().isBoolean().withMessage('In stock must be a boolean'),
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

      const { name, description, price, bulkPrice, moq, pcsPerCase, category, tags, featured, inStock, isEcoFriendly, isBestSeller, isTrending, isTopRated, isCustomizable, details, existingImages, mainImageIndex } = req.body;

      if (name) product.name = name;
      if (description) product.description = description;
      if (price) product.price = parseFloat(price);
      if (bulkPrice) product.bulkPrice = parseFloat(bulkPrice);
      if (moq) product.moq = parseInt(moq);
      if (pcsPerCase) product.pcsPerCase = parseInt(pcsPerCase);
      if (category) product.category = category;
      if (tags) product.tags = tags.split(',').map(tag => tag.trim());
      if (featured !== undefined) product.featured = featured === 'true';
      if (inStock !== undefined) product.inStock = inStock === 'true';
      if (isEcoFriendly !== undefined) product.isEcoFriendly = isEcoFriendly === 'true';
      if (isBestSeller !== undefined) product.isBestSeller = isBestSeller === 'true';
      if (isTrending !== undefined) product.isTrending = isTrending === 'true';
      if (isTopRated !== undefined) product.isTopRated = isTopRated === 'true';
      if (isCustomizable !== undefined) product.isCustomizable = isCustomizable === 'true';
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
        // Do not set product.image to null; retain the existing image
        // If there are no images (existing or new), ensure at least one image remains
        if (!product.image) {
          return res.status(400).json({ error: 'At least one image is required. Please upload an image or retain an existing one.' });
        }
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
  '/:id',
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

      // Plain text version for fallback
      const plainText = `
Dear ${quote.name},

Thank you for your quote request for ${quote.productName}.

${replyMessage}

If you have any further questions, feel free to reach out.

Best regards,
Eco Packaging Team

Contact Us:
176 Central Ave Suite 9 Farmingdale
New York, NY 11735
United States
Phone: +1 (516) 360-9888
Email: contact@ecologicsolutions.nyc
`;

      // HTML version with branding
      const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Response to Your Quote Request</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap');
          body {
            margin: 0;
            padding: 0;
            font-family: 'Open Sans', Arial, sans-serif;
            background-color: #ffffff;
            line-height: 1.6;
            color: #333333;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid #eeeeee;
          }
          .header {
            background-color: #ffffff;
            padding: 25px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
          }
          .logo {
            max-width: 180px;
            height: auto;
          }
          .content {
            padding: 30px;
            background-color: #ffffff;
          }
          .footer {
            background-color: #f9f9f9;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #f0f0f0;
          }
          h1 {
            color: #25553d; /* Primary brand color for headings */
            font-size: 22px;
            margin-top: 0;
            margin-bottom: 20px;
            font-weight: 600;
          }
          p {
            font-size: 15px;
            margin: 0 0 18px;
            color: #555555;
          }
          .highlight {
            color: #4d93a6; /* Accent color for emphasis */
            font-weight: 600;
          }
          a {
            color: #4d93a6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .divider {
            border-top: 1px solid #e0e0e0;
            margin: 25px 0;
          }
          .signature {
            margin-top: 25px;
          }
          .contact-info {
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <img src="https://res.cloudinary.com/rolandortiz/image/upload/v1744909042/bagstoryCustom/Logo_ilqcyn.png" alt="Eco Packaging Solutions" class="logo" />
          </div>
          
          <!-- Content -->
          <div class="content">
            <h1>Dear Roland Ortiz,</h1>
            
            <p>Thank you for your interest in <span class="highlight">Wine Vest Bag (1/2 Two Bottle Wine Bag)</span>. We appreciate the opportunity to serve your sustainable packaging needs.</p>
            
            <div class="divider"></div>
            
            <p>Test</p>
            
            <div class="divider"></div>
            
            <p>Should you require any additional information or have further questions, our team is here to assist you.</p>
            
            <div class="signature">
              <p><strong>Best regards,</strong></p>
              <p>The Eco Packaging Solutions Team</p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="contact-info">
              <p>176 Central Ave Suite 9, Farmingdale<br>
              New York, NY 11735, United States</p>
              
              <p>Phone: <a href="tel:+15163609888">+1 (516) 360-9888</a><br>
              Email: <a href="mailto:contact@ecologicsolutions.nyc">contact@ecologicsolutions.nyc</a></p>
              
              <p style="margin-top: 15px;">
                <a href="https://www.ecologicsolutions.nyc">Visit our website</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;

      // Debug logging
      console.log('Sending email to:', quote.email);
      console.log('HTML Content:', htmlContent);

      // Send email with both plain text and HTML versions
      await sendEmail(
        quote.email,
        `Response to Your Quote Request for ${quote.productName}`,
        plainText,
        htmlContent
      );

      // Update quote status to 'responded'
      quote.status = 'responded';
      await quote.save();

      // Update lead status if applicable
      if (req.user && req.user.role === 'admin') {
        const lead = await Lead.findOne({ email: quote.email, source: 'Chat Widget' });
        if (lead) {
          lead.status = 'Contacted';
          await lead.save();
          console.log(`Lead status updated to Contacted for email: ${quote.email}`);
        }
      }

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