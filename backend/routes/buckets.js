/**
 * routes/buckets.js — Custom bucket management
 *
 * GET    /api/buckets                     → list all buckets with counts
 * POST   /api/buckets                     → create bucket
 * PUT    /api/buckets/:bucketId           → update bucket
 * DELETE /api/buckets/:bucketId           → delete bucket + its rules
 * POST   /api/buckets/rules               → create bucket rule
 * GET    /api/buckets/:bucketId/rules     → get rules for bucket
 * DELETE /api/buckets/rules/:ruleId       → delete rule
 */

const express = require('express');
const authMiddleware  = require('../middleware/auth');
const { CustomBucket, BucketRule, Email } = require('../models');

const router = express.Router();

// ── GET /api/buckets ──────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const includeEmpty = req.query.include_empty !== 'false';

  // Hard-coded system buckets (not stored in DB)
  const systemBuckets = [
    { bucketId: 'system_urgent',     bucketName: 'Urgent',      isSystem: true, isPinned: false, sortOrder: 10 },
    { bucketId: 'system_read_later', bucketName: 'Read Later',  isSystem: true, isPinned: false, sortOrder: 20 },
    { bucketId: 'system_ignored',    bucketName: 'Ignored',     isSystem: true, isPinned: false, sortOrder: 30 },
  ];

  let customBuckets = await CustomBucket.find({ userId }).select('-_id -__v');

  // Email count per bucket
  const counts = {};
  await Promise.all(customBuckets.map(async (b) => {
    counts[b.bucketId] = await Email.countDocuments({ userId, customBucketId: b.bucketId, isRead: false, isIgnored: false });
  }));

  if (!includeEmpty) customBuckets = customBuckets.filter(b => counts[b.bucketId] > 0);

  const formatted = customBuckets.map(b => ({
    bucketId: b.bucketId, bucketName: b.bucketName, description: b.description,
    isSystem: false, isPinned: b.isPinned, sortOrder: b.isPinned ? 0 : b.sortOrder,
    emailCount: counts[b.bucketId] || 0,
  }));

  const all = [...systemBuckets.map(b => ({ ...b, emailCount: 0 })), ...formatted];
  all.sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; return a.sortOrder - b.sortOrder; });

  return res.json({ buckets: all });
});

// ── POST /api/buckets ─────────────────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { bucketName, description, isPinned = false } = req.body;
  const { userId } = req.user;

  if (!bucketName?.trim()) return res.status(400).json({ error: 'bucketName is required' });

  const exists = await CustomBucket.findOne({ userId, bucketName: bucketName.trim() });
  if (exists) return res.status(409).json({ error: 'A bucket with that name already exists' });

  const bucket = await CustomBucket.create({
    userId, bucketName: bucketName.trim(), description: description?.trim() || null,
    isPinned, sortOrder: isPinned ? 0 : 100,
  });

  return res.status(201).json({ message: 'Bucket created', bucket });
});

// ── PUT /api/buckets/:bucketId ────────────────────────────────────────────
router.put('/:bucketId', authMiddleware, async (req, res) => {
  const { bucketName, description, isPinned } = req.body;
  const { userId } = req.user;

  const bucket = await CustomBucket.findOne({ bucketId: req.params.bucketId, userId });
  if (!bucket) return res.status(404).json({ error: 'Bucket not found' });

  if (bucketName  !== undefined) bucket.bucketName  = bucketName.trim();
  if (description !== undefined) bucket.description = description?.trim() || null;
  if (isPinned    !== undefined) { bucket.isPinned = isPinned; bucket.sortOrder = isPinned ? 0 : 100; }

  await bucket.save();
  return res.json({ message: 'Bucket updated', bucket });
});

// ── DELETE /api/buckets/:bucketId ─────────────────────────────────────────
router.delete('/:bucketId', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const { bucketId } = req.params;

  const bucket = await CustomBucket.findOne({ bucketId, userId });
  if (!bucket) return res.status(404).json({ error: 'Bucket not found' });

  const ruleResult = await BucketRule.deleteMany({ bucketId, userId });
  await CustomBucket.deleteOne({ bucketId });

  return res.json({ message: `Bucket and ${ruleResult.deletedCount} rule(s) deleted` });
});

// ── POST /api/buckets/rules ───────────────────────────────────────────────
router.post('/rules', authMiddleware, async (req, res) => {
  const { bucketId, ruleType, ruleValue } = req.body;
  const { userId } = req.user;

  if (!bucketId || !ruleType || !ruleValue) {
    return res.status(400).json({ error: 'bucketId, ruleType, and ruleValue are required' });
  }

  const bucket = await CustomBucket.findOne({ bucketId, userId });
  if (!bucket) return res.status(404).json({ error: 'Bucket not found' });

  const rule = await BucketRule.create({ userId, bucketId, ruleType, ruleValue: ruleValue.trim().toLowerCase() });
  return res.status(201).json({ message: 'Rule created', rule });
});

// ── GET /api/buckets/:bucketId/rules ──────────────────────────────────────
router.get('/:bucketId/rules', authMiddleware, async (req, res) => {
  const rules = await BucketRule.find({ bucketId: req.params.bucketId, userId: req.user.userId }).select('-_id -__v');
  return res.json({ rules });
});

// ── DELETE /api/buckets/rules/:ruleId ─────────────────────────────────────
router.delete('/rules/:ruleId', authMiddleware, async (req, res) => {
  const result = await BucketRule.deleteOne({ ruleId: req.params.ruleId, userId: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Rule not found' });
  return res.json({ message: 'Rule deleted' });
});

module.exports = router;
