const mongoose = require('mongoose');
const crypto   = require('crypto');

const sessionSchema = new mongoose.Schema({
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    default: () => `sess_${crypto.randomBytes(16).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  gmailAccessToken: {
    type: String,   // Gmail OAuth access token (encrypt in production)
    default: null,
  },
  gmailRefreshToken: {
    type: String,   // For refreshing expired access tokens
    default: null,
  },
  tokenExpiry: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days
  },
});

// sessionToken unique:true already creates its index — keep only userId and TTL
sessionSchema.index({ userId: 1 });
// TTL index — MongoDB auto-deletes expired sessions (no cleanup cron needed)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
