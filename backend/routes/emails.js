/**
 * routes/emails.js — Email read, filter, actions, OTP, reply, safe-delete
 *
 * GET    /api/emails/summary              → counts by action state
 * GET    /api/emails                      → filtered email list
 * GET    /api/emails/otp/active           → active OTP notifications
 * POST   /api/emails/otp/dismiss          → dismiss OTP (?email_id=)
 * GET    /api/emails/safe-deleted         → emails in 7-day trash bucket
 * POST   /api/emails/generate-reply       → AI draft reply
 * POST   /api/emails/send-reply           → send via Gmail API
 * POST   /api/emails/bulk-action          → bulk safe_delete / ignore / restore
 * GET    /api/emails/:emailId             → single email
 * POST   /api/emails/:emailId/action      → take action + record feedback
 * PATCH  /api/emails/:emailId/draft       → save draft reply
 * POST   /api/emails/:emailId/add-sender-to-bucket → quick bucket assignment
 */

const express = require('express');
const crypto  = require('crypto');

const authMiddleware = require('../middleware/auth');
const {
  Email, UserPreferences, IgnoredSender,
  UserFeedback, SafeDelete, CustomBucket, BucketRule,
} = require('../models');
const { buildGmailClient }  = require('../services/gmailService');
const { callGeminiAI }      = require('../services/geminiService');
const { extractSubjectKeywords } = require('../services/gmailService');

const router = express.Router();

// ── GET /api/emails/summary ───────────────────────────────────────────────
router.get('/summary', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const base = { userId, isRead: false, isIgnored: false };

  const [nd, na, is_] = await Promise.all([
    Email.countDocuments({ ...base, actionState: 'needs_decision' }),
    Email.countDocuments({ ...base, actionState: 'needs_attention' }),
    Email.countDocuments({ userId, actionState: 'ignored_safely' }),
  ]);

  return res.json({ needs_decision: nd, needs_attention: na, ignored_safely: is_, total: nd + na + is_ });
});

// ── GET /api/emails/otp/active ────────────────────────────────────────────
router.get('/otp/active', authMiddleware, async (req, res) => {
  const now = new Date();
  const otps = await Email.find({
    userId: req.user.userId, hasOtp: true, otpDismissed: false, otpExpiresAt: { $gt: now },
  }).select('emailId otpCode senderEmail subject otpDetectedAt otpExpiresAt');

  return res.json({
    activeOtps: otps.map(e => ({
      emailId: e.emailId, otpCode: e.otpCode, senderEmail: e.senderEmail,
      subject: e.subject, detectedAt: e.otpDetectedAt, expiresAt: e.otpExpiresAt,
      secondsRemaining: Math.max(0, Math.floor((e.otpExpiresAt - now) / 1000)),
    })),
  });
});

// ── POST /api/emails/otp/dismiss ─────────────────────────────────────────
router.post('/otp/dismiss', authMiddleware, async (req, res) => {
  const { email_id } = req.query;
  await Email.updateOne({ emailId: email_id, userId: req.user.userId }, { otpDismissed: true });
  return res.json({ message: 'OTP dismissed' });
});

// ── GET /api/emails/safe-deleted ─────────────────────────────────────────
router.get('/safe-deleted', authMiddleware, async (req, res) => {
  const items = await SafeDelete.find({ userId: req.user.userId, isRestored: false })
    .sort({ deletedAt: -1 });
  return res.json({ emails: items, count: items.length });
});

// ── POST /api/emails/generate-reply ──────────────────────────────────────
router.post('/generate-reply', authMiddleware, async (req, res) => {
  const { emailId, userDraft = '' } = req.body;
  const email = await Email.findOne({ emailId, userId: req.user.userId });
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const systemPrompt = `You are a professional email assistant. Generate a polite, concise, professional reply.`;
  let prompt = `Original Email:\nFrom: ${email.senderName} <${email.senderEmail}>\nSubject: ${email.subject}\nBody: ${email.body.substring(0, 1000)}\n\nGenerate a professional reply.`;
  if (userDraft) prompt += `\n\nUser's draft or context: ${userDraft}`;

  const reply = await callGeminiAI('generate', prompt, systemPrompt);
  await Email.updateOne({ emailId }, { draftReply: reply });
  return res.json({ generatedReply: reply });
});

// ── POST /api/emails/send-reply ───────────────────────────────────────────
router.post('/send-reply', authMiddleware, async (req, res) => {
  const { emailId, replyBody, accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'accessToken is required' });

  const email = await Email.findOne({ emailId, userId: req.user.userId });
  if (!email) return res.status(404).json({ error: 'Email not found' });

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

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded, threadId: email.threadId },
  });

  await Email.updateOne({ emailId }, { isRead: true, draftReply: null });
  return res.json({ message: 'Reply sent successfully', gmailMessageId: response.data.id });
});

// ── POST /api/emails/bulk-action ─────────────────────────────────────────
router.post('/bulk-action', authMiddleware, async (req, res) => {
  const { emailIds, action, accessToken } = req.body;
  const { userId } = req.user;

  if (!emailIds?.length) return res.status(400).json({ error: 'No emails selected' });

  let processed = 0, gmailTrashed = 0;

  if (action === 'safe_delete') {
    let gmail = null;
    if (accessToken) {
      try { gmail = buildGmailClient(accessToken); } catch (e) { /* continue without Gmail */ }
    }
    const deletionTimestamp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (const emailId of emailIds) {
      const email = await Email.findOne({ emailId, userId });
      if (!email) continue;

      if (gmail && email.gmailId) {
        try { await gmail.users.messages.trash({ userId: 'me', id: email.gmailId }); gmailTrashed++; }
        catch (e) { console.error('Gmail trash failed:', e.message); }
      }
      await SafeDelete.create({ userId, emailId, originalEmail: email.toObject(), deletionTimestamp, gmailTrashed: !!gmail });
      await Email.updateOne({ emailId }, { actionState: 'ignored_safely', isIgnored: true });
      processed++;
    }
    const msg = `${processed} email(s) moved to trash${gmailTrashed ? ` (${gmailTrashed} also moved to Gmail Trash)` : ''}`;
    return res.json({ message: msg, processed, gmailTrashed });
  }

  if (action === 'ignore') {
    const result = await Email.updateMany({ emailId: { $in: emailIds }, userId }, { isIgnored: true, actionState: 'ignored_safely' });
    return res.json({ message: `${result.modifiedCount} email(s) ignored`, processed: result.modifiedCount });
  }

  if (action === 'restore') {
    for (const emailId of emailIds) {
      await SafeDelete.updateOne({ emailId, userId }, { isRestored: true });
      await Email.updateOne({ emailId }, { actionState: 'needs_attention', isIgnored: false });
      processed++;
    }
    return res.json({ message: `${processed} email(s) restored`, processed });
  }

  return res.status(400).json({ error: 'Invalid action. Use: safe_delete, ignore, restore' });
});

// ── GET /api/emails ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const { action_state, custom_bucket_id } = req.query;

  const query = { userId };
  if (custom_bucket_id)  query.customBucketId = custom_bucket_id;
  else if (action_state) query.actionState    = action_state;

  const emails = await Email.find(query).select('-_id -__v').sort({ date: -1 }).limit(100);
  return res.json(emails);
});

// ── GET /api/emails/:emailId ──────────────────────────────────────────────
router.get('/:emailId', authMiddleware, async (req, res) => {
  const email = await Email.findOne({ emailId: req.params.emailId, userId: req.user.userId }).select('-_id -__v');
  if (!email) return res.status(404).json({ error: 'Email not found' });
  return res.json(email);
});

// ── POST /api/emails/:emailId/action ─────────────────────────────────────
router.post('/:emailId/action', authMiddleware, async (req, res) => {
  const { emailId } = req.params;
  const { action }  = req.body;
  const { userId }  = req.user;

  const email = await Email.findOne({ emailId, userId });
  if (!email) return res.status(404).json({ error: 'Email not found' });

  // Record feedback for move/ignore actions
  const recordFeedback = async (userAction) => {
    const senderEmail  = email.senderEmail.toLowerCase();
    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : '';
    await UserFeedback.create({
      userId, senderEmail, senderDomain,
      subjectKeywords: extractSubjectKeywords(email.subject),
      originalState: email.actionState,
      userAction,
    });
  };

  switch (action) {
    case 'mark_read':
    case 'read':
      await Email.updateOne({ emailId }, { isRead: true });
      return res.json({ message: 'Email marked as read' });

    case 'ignore':
      await recordFeedback('ignored_safely');
      await Email.updateOne({ emailId }, { isIgnored: true, actionState: 'ignored_safely' });
      return res.json({ message: 'Email ignored' });

    case 'always_ignore_sender':
      await recordFeedback('always_ignore');
      await UserPreferences.updateOne({ userId }, { $addToSet: { ignoredSenders: email.senderEmail } }, { upsert: true });
      await IgnoredSender.findOneAndUpdate({ userId, senderEmail: email.senderEmail }, { userId, senderEmail: email.senderEmail }, { upsert: true });
      await Email.updateMany({ userId, senderEmail: email.senderEmail }, { isIgnored: true, actionState: 'ignored_safely' });
      return res.json({ message: `All emails from ${email.senderEmail} will be ignored` });

    case 'always_show_sender':
      await recordFeedback('always_important');
      await UserPreferences.updateOne({ userId }, { $addToSet: { alwaysShowSenders: email.senderEmail }, $pull: { ignoredSenders: email.senderEmail } }, { upsert: true });
      await IgnoredSender.deleteOne({ userId, senderEmail: email.senderEmail });
      return res.json({ message: `Emails from ${email.senderEmail} will be marked important` });

    case 'move_to_needs_decision':
    case 'move_to_needs_attention':
    case 'move_to_ignored_safely': {
      const newState = action.replace('move_to_', '');
      await recordFeedback(newState);
      await Email.updateOne({ emailId }, { actionState: newState });
      return res.json({ message: `Email moved to ${newState}` });
    }

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
});

// ── PATCH /api/emails/:emailId/draft ─────────────────────────────────────
router.patch('/:emailId/draft', authMiddleware, async (req, res) => {
  const { draftReply } = req.body;
  await Email.updateOne({ emailId: req.params.emailId, userId: req.user.userId }, { draftReply });
  return res.json({ message: 'Draft updated' });
});

// ── POST /api/emails/:emailId/add-sender-to-bucket ───────────────────────
router.post('/:emailId/add-sender-to-bucket', authMiddleware, async (req, res) => {
  const { emailId } = req.params;
  const { bucketId, newBucketName } = req.body;
  const { userId }  = req.user;

  const email = await Email.findOne({ emailId, userId });
  if (!email) return res.status(404).json({ error: 'Email not found' });

  const senderEmail = email.senderEmail.toLowerCase();
  let finalBucketId, bucketName;

  if (newBucketName && !bucketId) {
    let bucket = await CustomBucket.findOne({ userId, bucketName: newBucketName });
    if (!bucket) bucket = await CustomBucket.create({ userId, bucketName: newBucketName, description: `Emails from ${senderEmail}` });
    finalBucketId = bucket.bucketId;
    bucketName    = bucket.bucketName;
  } else if (bucketId) {
    const bucket  = await CustomBucket.findOne({ bucketId });
    finalBucketId = bucketId;
    bucketName    = bucket?.bucketName || 'Custom';
  } else {
    return res.status(400).json({ error: 'Provide bucketId or newBucketName' });
  }

  // Upsert rule
  const existing = await BucketRule.findOne({ userId, ruleType: 'sender_email', ruleValue: senderEmail });
  if (existing) {
    await BucketRule.updateOne({ ruleId: existing.ruleId }, { bucketId: finalBucketId });
  } else {
    await BucketRule.create({ userId, bucketId: finalBucketId, ruleType: 'sender_email', ruleValue: senderEmail });
  }

  await Email.updateOne({ emailId }, { customBucketId: finalBucketId, domainBucket: bucketName });
  return res.json({ message: `Future emails from ${senderEmail} will go to '${bucketName}'`, bucketId: finalBucketId, bucketName });
});

module.exports = router;
