const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleTag: { type: String, required: true }, // Removed minlength for seeding
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  metaDescription: { type: String, required: true },
  content: { type: String, required: true },
  excerpt: { type: String, required: true},
  images: [{
    url: { type: String, required: true },
    altText: { type: String, required: true }
  }],
  keywords: [{ type: String }],
  categories: [{ type: String }],
  tags: [{ type: String }],
  author: { type: String, required: true },
  date: { type: Date, required: true },
  readTime: { type: Number, required: true, min: 1 },
  published: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for performance (no slug index here, handled by unique: true)
blogPostSchema.index({ categories: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ published: 1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);