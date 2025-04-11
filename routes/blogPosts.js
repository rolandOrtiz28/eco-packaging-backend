const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const logger = require('../config/logger');


// GET /blog-post/:id - Fetch a single blog post
router.get('/', async (req, res) => {
  try {
    logger.info('Fetching all blog posts');
    const blogPosts = await BlogPost.find();
    logger.info(`Fetched ${blogPosts.length} blog posts from database`);
    // Transform _id to id for the frontend
    const transformedBlogPosts = blogPosts.map(post => ({
      ...post.toObject(),
      id: post._id ? post._id.toString() : undefined,
      _id: undefined,
    }));
    logger.info(`Transformed ${transformedBlogPosts.length} blog posts`);
    res.json(transformedBlogPosts);
  } catch (err) {
    logger.error('Error fetching blog posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



router.get('/:id', async (req, res) => {
  try {
    logger.info(`Fetching blog post with ID: ${req.params.id}`);
    const blogPost = await BlogPost.findById(req.params.id);
    if (!blogPost) {
      logger.warn(`Blog post with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Blog post not found' });
    }
    const transformedBlogPost = {
      ...blogPost.toObject(),
      id: blogPost._id.toString(),
      _id: undefined,
    };
    logger.info(`Fetched blog post: ${transformedBlogPost.title} (ID: ${transformedBlogPost.id})`);
    res.json(transformedBlogPost);
  } catch (err) {
    logger.error(`Error fetching blog post with ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /related-posts/:id - Fetch related blog posts
router.get('/related-posts/:id', async (req, res) => {
  try {
    logger.info(`Fetching related posts for blog post ID: ${req.params.id}`);
    const currentPost = await BlogPost.findById(req.params.id);
    if (!currentPost) {
      logger.warn(`Blog post with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Blog post not found' });
    }
    const relatedPosts = await BlogPost.find({
      _id: { $ne: req.params.id },
      categories: { $in: currentPost.categories },
    }).limit(3);
    const transformedRelatedPosts = relatedPosts.map(post => ({
      ...post.toObject(),
      id: post._id.toString(),
      _id: undefined,
    }));
    logger.info(`Fetched ${transformedRelatedPosts.length} related posts for blog post ID: ${req.params.id}`);
    res.json(transformedRelatedPosts);
  } catch (err) {
    logger.error(`Error fetching related posts for blog post ID ${req.params.id}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;