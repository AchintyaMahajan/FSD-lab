const mongoose = require('mongoose');
const crypto   = require('crypto');

const scheduledEmailSchema = new mongoose.Schema({
  emailId: {
    type: String,
    required: true,
    unique: true,
    default: () => `sched_${crypto.randomBytes(8).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  error: {
    type: String,
    default: null,
  },
  sendAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

scheduledEmailSchema.index({ status: 1, sendAt: 1 });

module.exports = mongoose.model('ScheduledEmail', scheduledEmailSchema);
