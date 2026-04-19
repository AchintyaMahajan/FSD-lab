const mongoose = require('mongoose');
const crypto   = require('crypto');

const userFeedbackSchema = new mongoose.Schema({
  feedbackId: {
    type: String,
    required: true,
    unique: true,
    default: () => `fb_${crypto.randomBytes(6).toString('hex')}`,
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
  senderDomain: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  subjectKeywords: {
    type: [String],   // Extracted meaningful words from the subject
    default: [],
  },
  originalState: {
    type: String,   // What the AI classified this email as
    required: true,
  },
  userAction: {
    type: String,   // What the user actually moved it to
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// getLearningContext() queries by sender and domain
userFeedbackSchema.index({ userId: 1, senderEmail: 1 });
userFeedbackSchema.index({ userId: 1, senderDomain: 1 });
userFeedbackSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserFeedback', userFeedbackSchema);
