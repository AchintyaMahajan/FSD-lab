/**
 * routes/summary.js — Daily statistics for the summary panel
 *
 * GET /api/summary/daily → today's email statistics
 */

const express       = require('express');
const authMiddleware = require('../middleware/auth');
const { Email, SafeDelete, PendingAutoResponse, CustomBucket } = require('../models');

const router = express.Router();

// ── GET /api/summary/daily ────────────────────────────────────────────────
router.get('/daily', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const base = { userId, date: { $gte: todayStart } };

  const [
    totalReceived,
    needsDecision,
    needsAttention,
    ignoredSafely,
    deletedCount,
    pendingReplies,
  ] = await Promise.all([
    Email.countDocuments(base),
    Email.countDocuments({ ...base, actionState: 'needs_decision',  isRead: false }),
    Email.countDocuments({ ...base, actionState: 'needs_attention', isRead: false }),
    Email.countDocuments({ ...base, actionState: 'ignored_safely' }),
    SafeDelete.countDocuments({ userId, deletedAt: { $gte: todayStart } }),
    PendingAutoResponse.countDocuments({ userId, status: 'pending' }),
  ]);

  // Per-bucket email counts
  const customBuckets = await CustomBucket.find({ userId });
  const byBucket = { needs_decision: needsDecision, needs_attention: needsAttention, ignored_safely: ignoredSafely };

  await Promise.all(customBuckets.map(async (b) => {
    const count = await Email.countDocuments({ ...base, customBucketId: b.bucketId, isRead: false });
    if (count > 0) byBucket[b.bucketName] = count;
  }));

  return res.json({
    date:           todayStart.toISOString().split('T')[0],
    totalReceived,
    autoCategorized: totalReceived,
    importantCount:  needsDecision + needsAttention,
    ignoredCount:    ignoredSafely,
    deletedCount,
    pendingReplies,
    byBucket,
  });
});

module.exports = router;
