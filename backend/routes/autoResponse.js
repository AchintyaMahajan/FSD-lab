/**
 * routes/autoResponse.js — Auto-response rule management
 *
 * POST   /api/auto-response/rules                  → create rule
 * GET    /api/auto-response/rules                  → list rules
 * DELETE /api/auto-response/rules/:ruleId          → delete rule
 * PATCH  /api/auto-response/rules/:ruleId/toggle   → toggle active state
 */

const express       = require('express');
const authMiddleware = require('../middleware/auth');
const { AutoResponseRule } = require('../models');

const router = express.Router();

// ── POST /api/auto-response/rules ─────────────────────────────────────────
router.post('/rules', authMiddleware, async (req, res) => {
  const { instruction } = req.body;
  if (!instruction?.trim()) return res.status(400).json({ error: 'instruction is required' });

  const rule = await AutoResponseRule.create({ userId: req.user.userId, instruction: instruction.trim() });
  return res.status(201).json({ message: 'Rule created', rule });
});

// ── GET /api/auto-response/rules ──────────────────────────────────────────
router.get('/rules', authMiddleware, async (req, res) => {
  const rules = await AutoResponseRule.find({ userId: req.user.userId })
    .select('-_id -__v').sort({ createdAt: -1 });
  return res.json({ rules });
});

// ── DELETE /api/auto-response/rules/:ruleId ───────────────────────────────
router.delete('/rules/:ruleId', authMiddleware, async (req, res) => {
  const result = await AutoResponseRule.deleteOne({ ruleId: req.params.ruleId, userId: req.user.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Rule not found' });
  return res.json({ message: 'Rule deleted' });
});

// ── PATCH /api/auto-response/rules/:ruleId/toggle ────────────────────────
router.patch('/rules/:ruleId/toggle', authMiddleware, async (req, res) => {
  const rule = await AutoResponseRule.findOne({ ruleId: req.params.ruleId, userId: req.user.userId });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  rule.isActive = !rule.isActive;
  await rule.save();

  return res.json({ message: `Rule ${rule.isActive ? 'enabled' : 'disabled'}`, isActive: rule.isActive });
});

module.exports = router;
