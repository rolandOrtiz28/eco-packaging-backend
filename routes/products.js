const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const logger = require('../config/logger');

// GET /products - Fetch all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    logger.info(`Fetched ${products.length} products from database`); // Log the count instead of the full array
    // Transform _id to id for the frontend
    const transformedProducts = products.map(product => {
      const transformed = {
        ...product.toObject(),
        id: product._id ? product._id.toString() : undefined,
        _id: undefined,
      };
      logger.info(`Transformed product: ${transformed.name} (ID: ${transformed.id})`); // Log a summary of each product
      return transformed;
    });
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
    logger.info(`Fetched product: ${transformedProduct.name} (ID: ${transformedProduct.id})`);
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
    logger.info(`Fetched ${transformedRelatedProducts.length} related products for product ID: ${req.params.id}`);
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
    logger.info(`Fetched ${transformedProducts.length} distributor products`);
    res.json(transformedProducts);
  } catch (err) {
    logger.error('Error fetching distributor products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;