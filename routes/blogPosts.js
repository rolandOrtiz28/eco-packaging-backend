const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const logger = require('../config/logger');
const { cloudinary } = require('../config/cloudinary'); // Use the configured instance
const multer = require('multer');
const sanitizeHtml = require('sanitize-html');

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) return cb(null, true);
    cb(new Error('Only JPEG/PNG images are allowed'));
  }
});

// Middleware to check if user is admin using session
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  logger.warn('Unauthorized access attempt to admin route', { user: req.user });
  return res.status(403).json({ error: 'Unauthorized: Admin access required' });
};

// GET /api/blog-posts - List all blog posts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag, published } = req.query;
    const query = {};
    if (category) query.categories = category;
    if (tag) query.tags = tag;
    if (published !== undefined) query.published = published === 'true';

    logger.info(`Fetching blog posts with query: ${JSON.stringify(query)}`);
    const blogPosts = await BlogPost.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ date: -1 });

    const total = await BlogPost.countDocuments(query);

    const transformedBlogPosts = blogPosts.map(post => ({
      ...post.toObject(),
      id: post._id.toString(),
      _id: undefined
    }));

    logger.info(`Fetched ${transformedBlogPosts.length} blog posts`);
    res.json({ posts: transformedBlogPosts, total });
  } catch (err) {
    logger.error(`Error fetching blog posts: ${err.message || JSON.stringify(err)}`, { stack: err.stack || 'No stack trace available' });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blog-posts/:slug - Fetch a single blog post
router.get('/:slug', async (req, res) => {
  try {
    logger.info(`Fetching blog post with slug: ${req.params.slug}`);
    const blogPost = await BlogPost.findOne({ slug: req.params.slug });
    if (!blogPost) {
      logger.warn(`Blog post with slug ${req.params.slug} not found`);
      return res.status(404).json({ error: 'Blog post not found' });
    }
    const transformedBlogPost = {
      ...blogPost.toObject(),
      id: blogPost._id.toString(),
      _id: undefined,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blogPost.title,
        description: blogPost.metaDescription,
        author: { '@type': 'Person', name: blogPost.author },
        datePublished: blogPost.date,
        image: blogPost.images.map(img => img.url),
        keywords: blogPost.keywords.join(', ')
      }
    };
    logger.info(`Fetched blog post: ${transformedBlogPost.title} (slug: ${transformedBlogPost.slug})`);
    res.json(transformedBlogPost);
  } catch (err) {
    logger.error(`Error fetching blog post with slug ${req.params.slug}: ${err.message || JSON.stringify(err)}`, { stack: err.stack || 'No stack trace available' });
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blog-posts/related-posts/:slug - Fetch related blog posts
router.get('/related-posts/:slug', async (req, res) => {
  try {
    logger.info(`Fetching related posts for blog post slug: ${req.params.slug}`);
    const currentPost = await BlogPost.findOne({ slug: req.params.slug });
    if (!currentPost) {
      logger.warn(`Blog post with slug ${req.params.slug} not found`);
      return res.status(404).json({ error: 'Blog post not found' });
    }
    const relatedPosts = await BlogPost.find({
      slug: { $ne: req.params.slug },
      categories: { $in: currentPost.categories },
      published: true
    }).limit(3);
    const transformedRelatedPosts = relatedPosts.map(post => ({
      ...post.toObject(),
      id: post._id.toString(),
      _id: undefined
    }));
    logger.info(`Fetched ${transformedRelatedPosts.length} related posts for slug: ${req.params.slug}`);
    res.json(transformedRelatedPosts);
  } catch (err) {
    logger.error(`Error fetching related posts for slug ${req.params.slug}: ${err.message || JSON.stringify(err)}`, { stack: err.stack || 'No stack trace available' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/blog-posts - Create a new blog post (Admin only)
router.post(
  '/',
  isAdmin,
  upload.array('images', 5),
  async (req, res) => {
    try {
      logger.info(`Creating blog post with slug: ${req.body.slug}`);
      const existingSlug = await BlogPost.findOne({ slug: req.body.slug });
      if (existingSlug) {
        return res.status(400).json({ error: 'Slug already exists' });
      }

      // Log the request body for debugging
      logger.info(`Request body: ${JSON.stringify(req.body, null, 2)}`);

      // Upload images to Cloudinary
      const images = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const result = await new Promise((resolve, reject) => {
              cloudinary.uploader.upload_stream(
                {
                  folder: 'BagStory', // Use the same folder as config/cloudinary.js
                  format: 'jpg',
                  resource_type: 'image'
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              ).end(file.buffer);
            });
            images.push({
              url: result.secure_url,
              altText: req.body[`altText_${file.originalname}`] || 'Blog image'
            });
          } catch (uploadErr) {
            logger.error(`Failed to upload image to Cloudinary: ${uploadErr.message || JSON.stringify(uploadErr)}`, { stack: uploadErr.stack });
            throw new Error('Failed to upload images to Cloudinary');
          }
        }
      }

      // Parse array fields from FormData
      const categories = req.body.categories ? JSON.parse(req.body.categories) : [];
      const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
      const keywords = req.body.keywords ? JSON.parse(req.body.keywords) : [];

      const blogPost = new BlogPost({
        title: req.body.title,
        titleTag: req.body.titleTag,
        slug: req.body.slug,
        metaDescription: req.body.metaDescription,
        content: sanitizeHtml(req.body.content, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
          allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] }
        }),
        excerpt: req.body.excerpt,
        images,
        categories,
        tags,
        keywords,
        author: req.body.author,
        date: new Date(req.body.date),
        readTime: parseInt(req.body.readTime),
        published: req.body.published === 'true'
      });

      await blogPost.save();
      const transformedBlogPost = {
        ...blogPost.toObject(),
        id: blogPost._id.toString(),
        _id: undefined
      };

      logger.info(`Created blog post: ${transformedBlogPost.title} (slug: ${transformedBlogPost.slug})`);
      res.status(201).json(transformedBlogPost);
    } catch (err) {
      logger.error(`Error creating blog post: ${err.message || JSON.stringify(err)}`, { stack: err.stack || 'No stack trace available' });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /api/blog-posts/:slug - Update a blog post (Admin only)
router.put(
  '/:slug',
  isAdmin,
  upload.array('images', 5),
  async (req, res) => {
    try {
      logger.info(`Updating blog post with slug: ${req.params.slug}`);
      const blogPost = await BlogPost.findOne({ slug: req.params.slug });
      if (!blogPost) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Check slug uniqueness if changed
      if (req.body.slug && req.body.slug !== req.params.slug) {
        const existingSlug = await BlogPost.findOne({ slug: req.body.slug });
        if (existingSlug) {
          return res.status(400).json({ error: 'Slug already exists' });
        }
      }

      // Handle image updates
      let images = blogPost.images;
      if (req.files && req.files.length > 0) {
        // Optionally delete old images from Cloudinary
        for (const img of blogPost.images) {
          const publicId = img.url.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
        images = [];
        for (const file of req.files) {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                folder: 'BagStory',
                format: 'jpg',
                resource_type: 'image'
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(file.buffer);
          });
          images.push({
            url: result.secure_url,
            altText: req.body[`altText_${file.originalname}`] || 'Blog image'
          });
        }
      }

      // Parse array fields from FormData
      const categories = req.body.categories ? JSON.parse(req.body.categories) : blogPost.categories;
      const tags = req.body.tags ? JSON.parse(req.body.tags) : blogPost.tags;
      const keywords = req.body.keywords ? JSON.parse(req.body.keywords) : blogPost.keywords;

      blogPost.set({
        title: req.body.title,
        titleTag: req.body.titleTag,
        slug: req.body.slug,
        metaDescription: req.body.metaDescription,
        content: sanitizeHtml(req.body.content, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
          allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] }
        }),
        excerpt: req.body.excerpt,
        images,
        categories,
        tags,
        keywords,
        author: req.body.author,
        date: new Date(req.body.date),
        readTime: parseInt(req.body.readTime),
        published: req.body.published === 'true'
      });

      await blogPost.save();
      const transformedBlogPost = {
        ...blogPost.toObject(),
        id: blogPost._id.toString(),
        _id: undefined
      };

      logger.info(`Updated blog post: ${transformedBlogPost.title} (slug: ${transformedBlogPost.slug})`);
      res.json(transformedBlogPost);
    } catch (err) {
      logger.error(`Error updating blog post with slug ${req.params.slug}: ${err.message || JSON.stringify(err)}`, { stack: err.stack || 'No stack trace available' });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/blog-posts/:slug - Delete a blog post (Admin only)
router.delete(
  '/:slug',
  isAdmin,
  async (req, res) => {
    try {
      logger.info(`Deleting blog post with slug: ${req.params.slug}`);
      const blogPost = await BlogPost.findOne({ slug: req.params.slug });
      if (!blogPost) {
        return res.status(404).json({ error: 'Blog post not found' });
      }

      // Log image URLs for debugging
      logger.info(`Images for blog post: ${JSON.stringify(blogPost.images)}`);

      // Delete images from Cloudinary
      for (const img of blogPost.images) {
        try {
          const publicId = img.url.split('/').slice(-2).join('/').split('.')[0];
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            logger.info(`Deleted image from Cloudinary: ${publicId}`);
          } else {
            logger.warn(`Invalid publicId for image URL: ${img.url}`);
          }
        } catch (cloudinaryErr) {
          logger.error(`Failed to delete image from Cloudinary for URL ${img.url}: ${cloudinaryErr.message || JSON.stringify(cloudinaryErr)}`, { stack: cloudinaryErr.stack });
        }
      }

      await blogPost.deleteOne();
      logger.info(`Deleted blog post with slug: ${req.params.slug}`);
      res.json({ message: 'Blog post deleted' });
    } catch (err) {
      logger.error(`Error deleting blog post with slug ${req.params.slug}: ${err.message || JSON.stringify(err)}`, { stack: err.stack || 'No stack trace available' });
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;