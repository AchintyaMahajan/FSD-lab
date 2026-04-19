const mongoose = require('mongoose');
const crypto   = require('crypto');

const emailSchema = new mongoose.Schema({
  emailId: {
    type: String,
    required: true,
    unique: true,
    default: () => `email_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  gmailId: {
    type: String,   // Gmail message ID — used for API operations
    required: true,
  },
  threadId: {
    type: String,   // Gmail thread ID — used when sending replies
    required: true,
  },
  subject: {
    type: String,
    default: 'No Subject',
  },
  senderName: {
    type: String,
    default: 'Unknown',
  },
  senderEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  snippet: {
    type: String,   // Short preview provided by Gmail API
    default: '',
  },
  body: {
    type: String,   // Full plain-text body (HTML stripped)
    default: '',
  },
  date: {
    type: Date,
    required: true,
  },

  // ── Classification ───────────────────────────────────────────
  domainBucket: {
    type: String,
    default: 'General',
  },
  actionState: {
    type: String,
    enum: ['needs_decision', 'needs_attention', 'ignored_safely'],
    default: 'needs_attention',
  },
  customBucketId: {
    type: String,   // Points to a custom_buckets document
    default: null,
  },

  // ── Status flags ─────────────────────────────────────────────
  isRead: {
    type: Boolean,
    default: false,
  },
  isIgnored: {
    type: Boolean,
    default: false,
  },

  // ── OTP detection ────────────────────────────────────────────
  hasOtp: {
    type: Boolean,
    default: false,
  },
  otpCode: {
    type: String,
    default: null,
  },
  otpDetectedAt: {
    type: Date,
    default: null,
  },
  otpExpiresAt: {
    type: Date,
    default: null,
  },
  otpDismissed: {
    type: Boolean,
    default: false,
  },

  // ── Draft reply (user work-in-progress) ──────────────────────
  draftReply: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for all common query patterns
emailSchema.index({ userId: 1, date: -1 });
emailSchema.index({ userId: 1, actionState: 1 });
emailSchema.index({ userId: 1, customBucketId: 1 });
emailSchema.index({ userId: 1, senderEmail: 1 });
emailSchema.index({ userId: 1, gmailId: 1 }, { unique: true });  // Prevent duplicate sync
emailSchema.index({ userId: 1, hasOtp: 1, otpDismissed: 1 });   // OTP ribbon query

module.exports = mongoose.model('Email', emailSchema);
