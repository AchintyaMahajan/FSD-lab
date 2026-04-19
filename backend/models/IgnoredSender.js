const mongoose = require('mongoose');
const crypto   = require('crypto');

const ignoredSenderSchema = new mongoose.Schema({
  ignoreId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ign_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  senderEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique per user — same sender can't be ignored twice
ignoredSenderSchema.index({ userId: 1, senderEmail: 1 }, { unique: true });

module.exports = mongoose.model('IgnoredSender', ignoredSenderSchema);
