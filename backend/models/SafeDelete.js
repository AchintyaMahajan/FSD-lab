const mongoose = require('mongoose');
const crypto   = require('crypto');

const safeDeleteSchema = new mongoose.Schema({
  deleteId: {
    type: String,
    required: true,
    unique: true,
    default: () => `del_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  emailId: {
    type: String,
    required: true,
  },
  originalEmail: {
    type: Object,   // Full snapshot of the Email document at delete time
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
  deletionTimestamp: {
    type: Date,   // Permanent deletion scheduled for 7 days after deletedAt
    required: true,
  },
  isRestored: {
    type: Boolean,
    default: false,
  },
  gmailTrashed: {
    type: Boolean,   // Whether the email was also moved to Gmail Trash
    default: false,
  },
});

safeDeleteSchema.index({ userId: 1, isRestored: 1 });
// Cleanup cron job uses this index to find expired items
safeDeleteSchema.index({ deletionTimestamp: 1 });

module.exports = mongoose.model('SafeDelete', safeDeleteSchema);
