const mongoose = require('mongoose');
const crypto   = require('crypto');

const bucketRuleSchema = new mongoose.Schema({
  ruleId: {
    type: String,
    required: true,
    unique: true,
    default: () => `rule_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  bucketId: {
    type: String,
    required: true,
  },
  ruleType: {
    type: String,
    enum: ['sender_email', 'sender_domain', 'subject_contains'],
    required: true,
  },
  ruleValue: {
    type: String,
    required: true,
    lowercase: true,   // Always stored lowercase for case-insensitive matching
    trim: true,
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

// Used during email sync rule-matching
bucketRuleSchema.index({ userId: 1, isActive: 1 });
bucketRuleSchema.index({ userId: 1, ruleType: 1, ruleValue: 1 });

module.exports = mongoose.model('BucketRule', bucketRuleSchema);
