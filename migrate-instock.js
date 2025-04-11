require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product'); // Adjust the path to your Product model
const logger = require('./config/logger');

// Connect to your MongoDB database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/eco-packaging', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

const migrateInStock = async () => {
  try {
    // Update all products where inStock is undefined
    const result = await Product.updateMany(
      { inStock: { $exists: false } }, // Find documents where inStock field does not exist
      { $set: { inStock: true } }     // Set inStock to true
    );

    logger.info(`Migration completed. Updated ${result.modifiedCount} products.`);
  } catch (err) {
    logger.error('Error during migration:', err);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    logger.info('Database connection closed.');
    process.exit(0);
  }
};

// Run the migration
migrateInStock();