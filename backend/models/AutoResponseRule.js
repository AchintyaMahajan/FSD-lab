const mongoose = require('mongoose');
const crypto   = require('crypto');

const autoResponseRuleSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
    default: () => `ar_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  instruction: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
    // Example: "If someone wishes me happy birthday, respond with 'Thank you!'"
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Queried during every email sync
autoResponseRuleSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('AutoResponseRule', autoResponseRuleSchema);
