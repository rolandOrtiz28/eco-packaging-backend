const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const dbUrl = process.env.NODE_ENV === 'production' ? process.env.DB_URL : process.env.DB_URL_DEV;
    logger.info(`Connecting to MongoDB at: ${dbUrl}`); // Debug log
    if (!dbUrl) {
      throw new Error('Database URL is undefined. Check DB_URL or DB_URL_DEV in .env');
    }
    await mongoose.connect(dbUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ MongoDB Connected');
  } catch (err) {
    logger.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;