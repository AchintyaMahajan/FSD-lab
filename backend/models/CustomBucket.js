const mongoose = require('mongoose');
const crypto   = require('crypto');

const customBucketSchema = new mongoose.Schema({
  bucketId: {
    type: String,
    required: true,
    unique: true,
    default: () => `bucket_${crypto.randomBytes(6).toString('hex')}`,
  },
  userId: {
    type: String,
    required: true,
  },
  bucketName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    default: null,
    maxlength: 200,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isSystem: {
    type: Boolean,
    default: false,   // Always false for user-created buckets
  },
  sortOrder: {
    type: Number,
    default: 100,     // Pinned buckets are set to 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

customBucketSchema.index({ userId: 1 });
// Prevent duplicate bucket names per user
customBucketSchema.index({ userId: 1, bucketName: 1 }, { unique: true });

module.exports = mongoose.model('CustomBucket', customBucketSchema);
