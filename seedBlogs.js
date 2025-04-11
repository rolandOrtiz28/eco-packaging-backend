require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const BlogPost = require('./models/BlogPost');

// Ensure NODE_ENV is set to development for seeding
process.env.NODE_ENV = 'development';

// Hardcoded blog post data with corrected tags
const blogPostsData = [
  {
    title: "The Environmental Impact of Sustainable Packaging",
    titleTag: "Sustainable Packaging Impact on Environment Guide",
    slug: "environmental-impact-sustainable-packaging",
    metaDescription: "Discover how sustainable packaging reduces your business's carbon footprint and supports a healthier planet with eco-friendly solutions.",
    excerpt: "Learn how eco-friendly packaging can reduce your carbon footprint.",
    content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sustainable packaging is key to reducing environmental harm...</p>",
    images: [
      {
        url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
        altText: "Sustainable packaging materials"
      }
    ],
    keywords: ["sustainable packaging", "eco-friendly", "carbon footprint"],
    categories: ["Sustainability", "Business"],
    tags: ["eco-friendly", "carbon-footprint", "sustainability"], // Corrected to be an array of strings
    author: "Emma Rodriguez",
    date: new Date("2025-03-15"),
    readTime: 6,
    published: true
  },
  {
    title: "How to Choose the Right Packaging for Your Business",
    titleTag: "Guide to Choose the Right Packaging for Business",
    slug: "choose-right-packaging-business",
    metaDescription: "A guide to selecting packaging solutions that align with your brand values and meet customer expectations for sustainability.",
    excerpt: "Guide to picking packaging that fits your brand and customers.",
    content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Choosing the right packaging involves...</p>",
    images: [
      {
        url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80",
        altText: "Packaging options for businesses"
      }
    ],
    keywords: ["packaging selection", "branding", "sustainability"],
    categories: ["Business", "Guides"],
    tags: ["packaging", "branding", "business"], // Corrected
    author: "Michael Chen",
    date: new Date("2025-03-02"),
    readTime: 8,
    published: true
  },
  {
    title: "The Rise of Non-Woven Bags in Retail",
    titleTag: "Rise of Non-Woven Bags in Retail Trends Guide",
    slug: "rise-non-woven-bags-retail",
    metaDescription: "Explore the popularity of non-woven bags in retail and their benefits for sustainability, retailers, and consumers alike.",
    excerpt: "Non-woven bags are gaining traction in retail—here’s why.",
    content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Non-woven bags are transforming retail...</p>",
    images: [
      {
        url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
        altText: "Non-woven shopping bags"
      }
    ],
    keywords: ["non-woven bags", "retail trends", "sustainability"],
    categories: ["Trends", "Retail"],
    tags: ["non-woven", "retail", "trends"], // Corrected
    author: "Sarah Johnson",
    date: new Date("2025-02-18"),
    readTime: 5,
    published: true
  },
  {
    title: "5 Ways Custom Packaging Enhances Brand Recognition",
    titleTag: "5 Ways Custom Packaging Boosts Brand Recognition",
    slug: "custom-packaging-brand-recognition",
    metaDescription: "Learn how custom packaging can boost brand visibility and create a memorable customer experience with these five strategies.",
    excerpt: "Boost your brand with these 5 custom packaging tips.",
    content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Custom packaging can elevate your brand...</p>",
    images: [
      {
        url: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=800&q=80",
        altText: "Custom branded packaging"
      }
    ],
    keywords: ["custom packaging", "brand recognition", "marketing"],
    categories: ["Marketing", "Branding"],
    tags: ["custom", "branding", "recognition"], // Corrected
    author: "James Wilson",
    date: new Date("2025-02-05"),
    readTime: 7,
    published: true
  },
  {
    title: "Navigating Packaging Regulations for International Markets",
    titleTag: "Packaging Regulations for Global Markets Guide",
    slug: "packaging-regulations-international-markets",
    metaDescription: "Understand and comply with packaging regulations for global markets with this guide to international expansion.",
    excerpt: "Guide to packaging rules for international business growth.",
    content: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Navigating international regulations...</p>",
    images: [
      {
        url: "https://images.unsplash.com/photo-1555252322-ec8b2b2b8456?auto=format&fit=crop&w=800&q=80",
        altText: "Global packaging compliance"
      }
    ],
    keywords: ["packaging regulations", "international markets", "compliance"],
    categories: ["International", "Compliance"],
    tags: ["regulations", "international", "compliance"], // Corrected
    author: "Olivia Martinez",
    date: new Date("2025-01-20"),
    readTime: 9,
    published: true
  }
];

// Seed only the BlogPost collection
const seedBlogs = async () => {
  try {
    await connectDB();

    // Drop all indexes on the blogposts collection to resolve duplicate index issue
    await BlogPost.collection.dropIndexes();
    logger.info('Dropped all indexes on blogposts collection');

    // Clear existing blog posts
    await BlogPost.deleteMany({});
    logger.info('Existing blog posts deleted');

    // Insert new blog post data
    await BlogPost.insertMany(blogPostsData);
    logger.info('Blog posts seeded successfully');

    process.exit(0);
  } catch (err) {
    logger.error('Error seeding blog posts:', err);
    process.exit(1);
  }
};

seedBlogs();