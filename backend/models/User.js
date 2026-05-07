const mongoose = require('mongoose');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => `user_${crypto.randomBytes(6).toString('hex')}`,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  picture: {
    type: String,   // Google profile picture URL
    default: null,
  },
  password: {
    type: String,   // Hashed password for email auth (null for Google users)
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  planActivatedAt: {
    type: Date,
    default: null,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
  },
});

// email unique:true above already creates this index — no explicit index needed

module.exports = mongoose.model('User', userSchema);
