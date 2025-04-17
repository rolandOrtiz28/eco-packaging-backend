const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  ctaText: {
    type: String,
    trim: true
  },
  ctaLink: {
    type: String,
    trim: true
  },
  bgColor: {
    type: String,
    trim: true
  },
  titleColor: {
    type: String,
    enum: ['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco'],
    default: 'light'
  },
  subtitleColor: {
    type: String,
    enum: ['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco'],
    default: 'light'
  },
  ctaColor: {
    type: String,
    enum: ['light', 'dark', 'gradient-white-to-eco', 'gradient-black-to-eco'],
    default: 'light'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Banner', bannerSchema);