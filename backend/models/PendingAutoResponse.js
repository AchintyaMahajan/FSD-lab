const mongoose = require('mongoose');
const crypto   = require('crypto');

const pendingAutoResponseSchema = new mongoose.Schema({
  responseId: {
    type: String,
    required: true,
    unique: true,
    default: () => `par_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  emailId: {
    type: String,
    required: true,
  },
  ruleId: {
    type: String,
    required: true,
  },
  matchedInstruction: {
    type: String,   // Copy of the rule text that triggered this
    required: true,
  },
  generatedReply: {
    type: String,   // AI-generated draft
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'discarded'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Dashboard badge & pending-responses page both filter by status
pendingAutoResponseSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PendingAutoResponse', pendingAutoResponseSchema);
