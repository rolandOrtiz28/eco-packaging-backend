const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, required: true },
  author: { type: String, required: true },
  readTime: { type: Number, required: true },
  image: { type: String, required: true },
  categories: [String],
  tags: [String],
}, { timestamps: true });

module.exports = mongoose.model('BlogPost', blogPostSchema);