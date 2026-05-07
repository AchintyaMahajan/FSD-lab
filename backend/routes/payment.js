/**
 * routes/payment.js — Razorpay payment gateway
 *
 * POST /api/payment/create-order  → Create a Razorpay order
 * POST /api/payment/verify        → Verify signature & upgrade plan
 */

const express       = require('express');
const crypto        = require('crypto');
const Razorpay      = require('razorpay');
const router        = express.Router();
const User          = require('../models/User');
const authMiddleware = require('../middleware/auth');

// ── Razorpay instance ────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// PRO plan price in paise (₹199 = 19900 paise)
const PRO_PRICE_PAISE = parseInt(process.env.PRO_PRICE_PAISE || '19900', 10);

// ── POST /api/payment/create-order ───────────────────────────────────────────
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.plan === 'pro') {
      return res.status(400).json({ error: 'You are already on the Pro plan.' });
    }

    const options = {
      amount:   PRO_PRICE_PAISE,
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        email:  user.email,
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      keyId:     process.env.RAZORPAY_KEY_ID,
      userEmail: user.email,
      userName:  user.name,
    });
  } catch (err) {
    console.error('[PAYMENT] create-order error:', err);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────────────
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    // Verify HMAC-SHA256 signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature. Possible fraud attempt.' });
    }

    // Upgrade user to Pro
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        plan:               'pro',
        planActivatedAt:    new Date(),
        razorpayPaymentId:  razorpay_payment_id,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Payment verified! You are now on the Pro plan. 🎉',
      plan:    user.plan,
    });
  } catch (err) {
    console.error('[PAYMENT] verify error:', err.message);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

// ── GET /api/payment/status ───────────────────────────────────────────────────
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('plan planActivatedAt');
    res.json({ plan: user.plan, activatedAt: user.planActivatedAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan status.' });
  }
});

module.exports = router;
