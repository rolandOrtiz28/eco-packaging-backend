require('dotenv').config();
const logger = require('./config/logger');

const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URL_DEV, { useNewUrlParser: true, useUnifiedTopology: true });
logger.info('Connected to MongoDB');

const Settings = require('./models/Settings');

async function removeTypeField() {
  try {
    const settings = await Settings.find();
    let updatedCount = 0;

    for (const setting of settings) {
      if ('type' in setting) {
        await Settings.updateOne(
          { _id: setting._id },
          { $unset: { type: "" } }
        );
        updatedCount++;
        console.log(`Removed 'type' field from setting: ${setting.key}`);
      }
    }

    if (updatedCount > 0) {
      console.log(`Successfully removed 'type' field from ${updatedCount} documents.`);
    } else {
      console.log('No documents needed updating.');
    }
  } catch (err) {
    console.error('Error removing type field:', err);
  } finally {
    mongoose.disconnect();
  }
}

removeTypeField();