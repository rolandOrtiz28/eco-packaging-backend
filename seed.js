require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./config/logger');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const BlogPost = require('./models/BlogPost');
const User = require('./models/User');

// Ensure NODE_ENV is set to development for seeding
process.env.NODE_ENV = 'development';

// Hardcoded data from api.js
const productsData = [
  {
    name: "Wine Vest Bag (1/2 Two Bottle Wine Bag)",
    description: "A premium non-woven bag designed for carrying one or two wine bottles. Ideal for wine and liquor stores.",
    price: 0.10,
    bulkPrice: 0.09,
    moq: 50,
    pcsPerCase: 1000,
    image: "https://images.unsplash.com/photo-1542456870-7c27d91a7631?auto=format&fit=crop&w=800&q=80",
    category: "Wine Bags",
    tags: ["wine", "vest", "non-woven"],
    featured: true,
    details: {
      size: "19.5H x 8W x 4GW inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (1000pcs)", pricePerUnit: 0.10 },
        { case: "6 to 50 (1000pcs)", pricePerUnit: 0.09 },
        { case: "50+ (1000pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Wine & Liquor Bags",
    },
  },
  {
    name: "Small Vest Bag (1/10 Small)",
    description: "A small non-woven vest bag, perfect for beer, snacks, and deli items.",
    price: 0.10,
    bulkPrice: 0.09,
    moq: 50,
    pcsPerCase: 1000,
    image: "https://images.unsplash.com/photo-1593443601238-67e54a7db53f?auto=format&fit=crop&w=800&q=80",
    category: "Vest Bags",
    tags: ["small", "vest", "non-woven"],
    featured: true,
    details: {
      size: "16H x 8W x 4GW inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (1000pcs)", pricePerUnit: 0.10 },
        { case: "6 to 50 (1000pcs)", pricePerUnit: 0.09 },
        { case: "50+ (1000pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Beer, Snacks, Deli",
    },
  },
  {
    name: "Medium Vest Bag (1/8 Medium)",
    description: "A medium-sized non-woven vest bag, suitable for deli and supermarket use.",
    price: 0.11,
    bulkPrice: 0.09,
    moq: 50,
    pcsPerCase: 1000,
    image: "https://images.unsplash.com/photo-1572163064776-36c7d5bb7a3b?auto=format&fit=crop&w=800&q=80",
    category: "Vest Bags",
    tags: ["medium", "vest", "non-woven"],
    featured: true,
    details: {
      size: "18H x 10W x 5GW inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (1000pcs)", pricePerUnit: 0.11 },
        { case: "6 to 50 (1000pcs)", pricePerUnit: 0.09 },
        { case: "50+ (1000pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Fit 6 pack perfectly, Deli, Liquor Store",
    },
  },
  {
    name: "Large Vest Bag (1/6 Medium Duty)",
    description: "A large non-woven vest bag, ideal for deli and supermarket use.",
    price: 0.12,
    bulkPrice: 0.10,
    moq: 50,
    pcsPerCase: 600,
    image: "https://images.unsplash.com/photo-1602830364173-fdfb9f43402b?auto=format&fit=crop&w=800&q=80",
    category: "Vest Bags",
    tags: ["large", "vest", "non-woven"],
    featured: true,
    details: {
      size: "22H x 11.8W x 7GW inches",
      color: "Black/White/Green/Yellow",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (600pcs)", pricePerUnit: 0.12 },
        { case: "6 to 50 (600pcs)", pricePerUnit: 0.10 },
        { case: "50+ (600pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Deli & Supermarkets",
    },
  },
  {
    name: "Large+ Vest Bag (1/6 Plus, A Bit Larger)",
    description: "A slightly larger non-woven vest bag, perfect for mini marts and supermarkets.",
    price: 0.13,
    bulkPrice: 0.11,
    moq: 50,
    pcsPerCase: 500,
    image: "https://images.unsplash.com/photo-1602830364173-fdfb9f43402b?auto=format&fit=crop&w=800&q=80",
    category: "Vest Bags",
    tags: ["large", "vest", "non-woven"],
    featured: false,
    details: {
      size: "22.5H x 13W x 7GW inches",
      color: "Black/White",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (500pcs)", pricePerUnit: 0.13 },
        { case: "6 to 50 (500pcs)", pricePerUnit: 0.11 },
        { case: "50+ (500pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Mini Mart, Supermarkets",
    },
  },
  {
    name: "2X-Large Vest Bag (1/4 XX-Large)",
    description: "An extra-large non-woven vest bag, suitable for supermarkets and 99 cent stores.",
    price: 0.20,
    bulkPrice: 0.18,
    moq: 50,
    pcsPerCase: 400,
    image: "https://images.unsplash.com/photo-1602830364173-fdfb9f43402b?auto=format&fit=crop&w=800&q=80",
    category: "Vest Bags",
    tags: ["xx-large", "vest", "non-woven"],
    featured: false,
    details: {
      size: "23.5H x 18.7W x 7GW inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (400pcs)", pricePerUnit: 0.20 },
        { case: "6 to 50 (400pcs)", pricePerUnit: 0.18 },
        { case: "50+ (400pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Supermarkets, 99 Cent Stores",
    },
  },
  {
    name: "Jumbo Size (Supersized Jumbo)",
    description: "A jumbo-sized non-woven bag, perfect for wholesalers.",
    price: 0.21,
    bulkPrice: 0.19,
    moq: 50,
    pcsPerCase: 1500,
    image: "https://images.unsplash.com/photo-1572163064776-36c7d5bb7a3b?auto=format&fit=crop&w=800&q=80",
    category: "Tote Bags",
    tags: ["jumbo", "non-woven"],
    featured: false,
    details: {
      size: "29H x 18W x 7GW inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (1500pcs)", pricePerUnit: 0.21 },
        { case: "6 to 50 (1500pcs)", pricePerUnit: 0.19 },
        { case: "50+ (1500pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "99 Cent Store, Wholesaler, Supermarket",
    },
  },
  {
    name: "Heavy Duty Large Vest Bag (1/6 Large)",
    description: "A heavy-duty non-woven vest bag, designed to support up to 50 lbs, ideal for heavy products.",
    price: 0.16,
    bulkPrice: 0.135,
    moq: 50,
    pcsPerCase: 500,
    image: "https://images.unsplash.com/photo-1602830364173-fdfb9f43402b?auto=format&fit=crop&w=800&q=80",
    category: "Vest Bags",
    tags: ["heavy-duty", "vest", "non-woven"],
    featured: false,
    details: {
      size: "22H x 11.8W x 7D inches",
      color: "White",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (500pcs)", pricePerUnit: 0.16 },
        { case: "6 to 50 (500pcs)", pricePerUnit: 0.135 },
        { case: "50+ (500pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Heavy duty, supports 50 lbs",
    },
  },
  {
    name: "Die Cut Handle Bag",
    description: "A non-woven bag with die-cut handles, suitable for book stores, game stores, and medical offices.",
    price: 0.11,
    bulkPrice: 0.10,
    moq: 50,
    pcsPerCase: 1000,
    image: "https://images.unsplash.com/photo-1593443601238-67e54a7db53f?auto=format&fit=crop&w=800&q=80",
    category: "Specialty Bags",
    tags: ["die-cut", "non-woven"],
    featured: true,
    details: {
      size: "15H x 11W inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (1000pcs)", pricePerUnit: 0.11 },
        { case: "6 to 50 (1000pcs)", pricePerUnit: 0.10 },
        { case: "50+ (1000pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Book Store, Game Shops",
    },
  },
  {
    name: "2 Bottle Wine Tote Bag",
    description: "A non-woven tote bag designed to carry two wine bottles, perfect for liquor stores.",
    price: 0.18,
    bulkPrice: 0.17,
    moq: 50,
    pcsPerCase: 400,
    image: "https://images.unsplash.com/photo-1542456870-7c27d91a7631?auto=format&fit=crop&w=800&q=80",
    category: "Wine Bags",
    tags: ["wine", "tote", "non-woven"],
    featured: false,
    details: {
      size: "14H x 8W x 4D inches",
      color: "Grey",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (400pcs)", pricePerUnit: 0.18 },
        { case: "6 to 50 (400pcs)", pricePerUnit: 0.17 },
        { case: "50+ (400pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Liquor Stores",
    },
  },
  {
    name: "Large 1/6 Tote Bag",
    description: "A large non-woven tote bag, ideal for grocery stores, delis, and retail.",
    price: 0.22,
    bulkPrice: 0.20,
    moq: 50,
    pcsPerCase: 300,
    image: "https://images.unsplash.com/photo-1572163064776-36c7d5bb7a3b?auto=format&fit=crop&w=800&q=80",
    category: "Tote Bags",
    tags: ["large", "tote", "non-woven"],
    featured: false,
    details: {
      size: "14H x 11.5W x 7D inches",
      color: "Grey",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (300pcs)", pricePerUnit: 0.22 },
        { case: "6 to 50 (300pcs)", pricePerUnit: 0.20 },
        { case: "50+ (300pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Grocery/Deli",
    },
  },
  {
    name: "Jumbo Grocery Tote Bag",
    description: "A jumbo non-woven tote bag, perfect for everyday grocery shopping.",
    price: 0.25,
    bulkPrice: 0.23,
    moq: 50,
    pcsPerCase: 300,
    image: "https://images.unsplash.com/photo-1572163064776-36c7d5bb7a3b?auto=format&fit=crop&w=800&q=80",
    category: "Tote Bags",
    tags: ["jumbo", "tote", "non-woven"],
    featured: false,
    details: {
      size: "15H x 14W x 8GW inches",
      color: "Black",
      material: "Premium Non Woven",
      pricing: [
        { case: "1 to 5 (300pcs)", pricePerUnit: 0.25 },
        { case: "6 to 50 (300pcs)", pricePerUnit: 0.23 },
        { case: "50+ (300pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Retail/Supermarket",
    },
  },
  {
    name: "Thermal Insulated Tote Bag",
    description: "A thermal insulated non-woven tote bag, ideal for lunch carriers and delivery.",
    price: 3.50,
    bulkPrice: 3.00,
    moq: 50,
    pcsPerCase: 100,
    image: "https://images.unsplash.com/photo-1605733513597-a8f8341084e6?auto=format&fit=crop&w=800&q=80",
    category: "Specialty Bags",
    tags: ["thermal", "tote", "non-woven"],
    featured: false,
    details: {
      size: "15H x 13W x 10D inches",
      color: "Black/White/Green/Yellow",
      material: "Premium Non Woven",
      note: "Patented smart fabric multi layered and coated thermal film bag",
      pricing: [
        { case: "1 to 5 (100pcs)", pricePerUnit: 3.50 },
        { case: "6 to 50 (100pcs)", pricePerUnit: 3.00 },
        { case: "50+ (100pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Lunch, Delivery, Groceries",
    },
  },
  {
    name: "Heavy Duty Grocery Tote Bag",
    description: "A heavy-duty reusable non-woven tote bag, perfect for everyday grocery shopping.",
    price: 2.50,
    bulkPrice: 2.00,
    moq: 50,
    pcsPerCase: 100,
    image: "https://images.unsplash.com/photo-1572163064776-36c7d5bb7a3b?auto=format&fit=crop&w=800&q=80",
    category: "Tote Bags",
    tags: ["heavy-duty", "tote", "non-woven"],
    featured: false,
    details: {
      size: "15H x 13W x 10D inches",
      color: "Black",
      material: "Premium Non Woven",
      note: "PVC board on bottom, hand stitched",
      pricing: [
        { case: "1 to 5 (100pcs)", pricePerUnit: 2.50 },
        { case: "6 to 50 (100pcs)", pricePerUnit: 2.00 },
        { case: "50+ (100pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Everyday shopping bag",
    },
  },
  {
    name: "6 Bottle Wine Bag",
    description: "A non-woven bag designed to carry six wine bottles, ideal for liquor stores.",
    price: 2.00,
    bulkPrice: 2.00,
    moq: 50,
    pcsPerCase: 100,
    image: "https://images.unsplash.com/photo-1542456870-7c27d91a7631?auto=format&fit=crop&w=800&q=80",
    category: "Wine Bags",
    tags: ["wine", "non-woven"],
    featured: false,
    details: {
      size: "15H x 11W x 8.5GW inches",
      color: "Black/Red Burgundy",
      material: "Premium Non Woven",
      note: "6 bottle carrier with separator and PVC board, Hand Stitched",
      pricing: [
        { case: "1 (100pcs)", pricePerUnit: 2.00 },
        { case: "50+ (100pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Liquor Store",
    },
  },
  {
    name: "Mylar Film Gift Bag",
    description: "A mylar film gift bag with ribbon, perfect for gifting.",
    price: 0.60,
    bulkPrice: 0.50,
    moq: 50,
    pcsPerCase: 5000,
    image: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=800&q=80",
    category: "Gift Bags",
    tags: ["mylar", "gift", "non-woven"],
    featured: false,
    details: {
      size: "20H x 9.5W inches",
      color: "White Flash",
      material: "PVC Film",
      note: "Ribbon not included",
      pricing: [
        { case: "1 to 5 (5000pcs)", pricePerUnit: 0.60 },
        { case: "6 to 50 (5000pcs)", pricePerUnit: 0.50 },
        { case: "50+ (5000pcs)", pricePerUnit: "Contact office" },
      ],
      useCase: "Wine Gift Bag",
    },
  },
];

const blogPostsData = [
  {
    title: "The Environmental Impact of Sustainable Packaging",
    excerpt: "Discover how eco-friendly packaging solutions can significantly reduce your business's carbon footprint and contribute to a healthier planet.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    date: "2025-03-15",
    author: "Emma Rodriguez",
    readTime: 6,
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
    categories: ["Sustainability", "Business"],
    tags: ["eco-friendly", "carbon-footprint", "sustainability"],
  },
  {
    title: "How to Choose the Right Packaging for Your Business",
    excerpt: "A comprehensive guide to selecting packaging solutions that align with your brand values and meet customer expectations.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    date: "2025-03-02",
    author: "Michael Chen",
    readTime: 8,
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=800&q=80",
    categories: ["Business", "Guides"],
    tags: ["packaging", "branding", "business"],
  },
  {
    title: "The Rise of Non-Woven Bags in Retail",
    excerpt: "Exploring the growing popularity of non-woven bags and their benefits for retailers and consumers alike.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    date: "2025-02-18",
    author: "Sarah Johnson",
    readTime: 5,
    image: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
    categories: ["Trends", "Retail"],
    tags: ["non-woven", "retail", "trends"],
  },
  {
    title: "5 Ways Custom Packaging Enhances Brand Recognition",
    excerpt: "Learn how personalized packaging can significantly boost your brand visibility and create a memorable customer experience.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    date: "2025-02-05",
    author: "James Wilson",
    readTime: 7,
    image: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=800&q=80",
    categories: ["Marketing", "Branding"],
    tags: ["custom", "branding", "recognition"],
  },
  {
    title: "Navigating Packaging Regulations for International Markets",
    excerpt: "A guide to understanding and complying with packaging regulations when expanding your business globally.",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    date: "2025-01-20",
    author: "Olivia Martinez",
    readTime: 9,
    image: "https://images.unsplash.com/photo-1555252322-ec8b2b2b8456?auto=format&fit=crop&w=800&q=80",
    categories: ["International", "Compliance"],
    tags: ["regulations", "international", "compliance"],
  },
];

const usersData = [
  {
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    phone: "+1 (555) 123-4567",
    address: "123 Admin St",
    city: "Admin City",
    state: "CA",
    zipCode: "90001",
    country: "US",
    password: process.env.ADMIN_PASSWORD, // Use the password from .env
  },
  {
    name: "Regular User",
    email: "user@example.com",
    role: "user",
    phone: "+1 (555) 987-6543",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
  },
];

// Seed the database
const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany({});
    await BlogPost.deleteMany({});
    await User.deleteMany({});

    // Insert new data
    await Product.insertMany(productsData);
    await BlogPost.insertMany(blogPostsData);
    await User.insertMany(usersData);

    logger.info('Database seeded successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();