const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  ignoredSenders: {
    type: [String],   // Email addresses that should always be ignored
    default: [],
  },
  alwaysShowSenders: {
    type: [String],   // Email addresses always treated as important
    default: [],
  },
  emailLimit: {
    type: Number,
    default: 10,
    min: 5,
    max: 20,
  },
});

userPreferencesSchema.index({ userId: 1 });

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
