const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function (v) {
        if (this.key === 'taxRate') {
          return typeof v === 'object' && typeof v.value === 'number' && v.value >= 0;
        }
        return (
          typeof v === 'object' &&
          typeof v.value === 'number' &&
          v.value >= 0 &&
          ['flat', 'percentage'].includes(v.type)
        );
      },
      message: props => `Invalid value for ${props.path}: ${JSON.stringify(props.value)}`,
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);