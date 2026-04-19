/**
 * routes/senders.js — Ignored sender management
 *
 * GET    /api/senders/ignored            → list ignored senders
 * POST   /api/senders/ignore             → add sender to ignore list
 * DELETE /api/senders/ignore/:ignoreId   → remove from ignore list
 */

const express       = require('express');
const authMiddleware = require('../middleware/auth');
const { IgnoredSender, UserPreferences, Email } = require('../models');

const router = express.Router();

// ── GET /api/senders/ignored ──────────────────────────────────────────────
router.get('/ignored', authMiddleware, async (req, res) => {
  const senders = await IgnoredSender.find({ userId: req.user.userId })
    .select('-_id -__v').sort({ createdAt: -1 });
  return res.json({ ignoredSenders: senders });
});

// ── POST /api/senders/ignore ──────────────────────────────────────────────
router.post('/ignore', authMiddleware, async (req, res) => {
  const { senderEmail, ignoreFuture = true } = req.body;
  const { userId } = req.user;

  if (!senderEmail?.trim()) return res.status(400).json({ error: 'senderEmail is required' });

  const email = senderEmail.toLowerCase().trim();

  // Upsert into ignored_senders collection
  const record = await IgnoredSender.findOneAndUpdate(
    { userId, senderEmail: email },
    { userId, senderEmail: email },
    { upsert: true, new: true },
  );

  // Also update preferences array
  await UserPreferences.updateOne(
    { userId },
    { $addToSet: { ignoredSenders: email } },
    { upsert: true },
  );

  // Mark all existing emails from that sender as ignored
  if (ignoreFuture) {
    await Email.updateMany({ userId, senderEmail: email }, { isIgnored: true, actionState: 'ignored_safely' });
  }

  return res.status(201).json({ message: `${email} added to ignore list`, record });
});

// ── DELETE /api/senders/ignore/:ignoreId ─────────────────────────────────
router.delete('/ignore/:ignoreId', authMiddleware, async (req, res) => {
  const { userId } = req.user;

  const record = await IgnoredSender.findOne({ ignoreId: req.params.ignoreId, userId });
  if (!record) return res.status(404).json({ error: 'Ignored sender record not found' });

  // Remove from preferences array too
  await UserPreferences.updateOne({ userId }, { $pull: { ignoredSenders: record.senderEmail } });
  await IgnoredSender.deleteOne({ ignoreId: record.ignoreId });

  return res.json({ message: `${record.senderEmail} removed from ignore list` });
});

module.exports = router;
