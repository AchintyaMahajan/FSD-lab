/**
 * routes/pendingResponses.js — Pending auto-responses awaiting user approval
 *
 * GET    /api/pending-responses                        → list pending items
 * POST   /api/pending-responses/:responseId/send      → approve & send
 * POST   /api/pending-responses/:responseId/discard   → discard draft
 */

const express       = require('express');
const authMiddleware = require('../middleware/auth');
const { PendingAutoResponse, Email } = require('../models');
const { buildGmailClient } = require('../services/gmailService');

const router = express.Router();

// ── GET /api/pending-responses ────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const pending = await PendingAutoResponse.find({ userId: req.user.userId, status: 'pending' })
    .sort({ createdAt: -1 });

  // Enrich with email data
  const enriched = await Promise.all(pending.map(async (p) => {
    const email = await Email.findOne({ emailId: p.emailId }).select('-_id -__v');
    return {
      responseId:         p.responseId,
      email,
      matchedInstruction: p.matchedInstruction,
      generatedReply:     p.generatedReply,
      createdAt:          p.createdAt,
    };
  }));

  return res.json({ pendingResponses: enriched });
});

// ── POST /api/pending-responses/:responseId/send ──────────────────────────
router.post('/:responseId/send', authMiddleware, async (req, res) => {
  const { editedReply, accessToken } = req.body;
  const { userId } = req.user;

  const pending = await PendingAutoResponse.findOne({ responseId: req.params.responseId, userId });
  if (!pending) return res.status(404).json({ error: 'Pending response not found' });

  const email = await Email.findOne({ emailId: pending.emailId });
  if (!email)   return res.status(404).json({ error: 'Original email not found' });

  const replyBody = editedReply || pending.generatedReply;

  if (accessToken) {
    const gmail = buildGmailClient(accessToken);
    const rawEmail = [
      `To: ${email.senderEmail}`,
      `Subject: Re: ${email.subject}`,
      `In-Reply-To: ${email.gmailId}`,
      `References: ${email.gmailId}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      replyBody,
    ].join('\r\n');

    const encoded = Buffer.from(rawEmail).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded, threadId: email.threadId },
    });
  }

  await PendingAutoResponse.updateOne({ responseId: pending.responseId }, { status: 'sent' });
  await Email.updateOne({ emailId: email.emailId }, { isRead: true });

  return res.json({ message: 'Auto-response sent' });
});

// ── POST /api/pending-responses/:responseId/discard ───────────────────────
router.post('/:responseId/discard', authMiddleware, async (req, res) => {
  const result = await PendingAutoResponse.updateOne(
    { responseId: req.params.responseId, userId: req.user.userId },
    { status: 'discarded' },
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Pending response not found' });
  return res.json({ message: 'Response discarded' });
});

module.exports = router;
