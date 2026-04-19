/**
 * routes/gmail.js — Gmail sync
 *
 * POST /api/gmail/sync   → Fetch, classify, detect OTP, save emails
 */

const express  = require('express');
const crypto   = require('crypto');

const authMiddleware = require('../middleware/auth');
const {
  Email, BucketRule, CustomBucket,
  UserPreferences, IgnoredSender, PendingAutoResponse,
} = require('../models');
const { buildGmailClient, parseGmailMessage, detectOTP } = require('../services/gmailService');
const { classifyEmailWithAI, matchAutoResponseRules, generateAutoResponse } = require('../services/geminiService');

const router = express.Router();

// ── Helper: check if sender is ignored for this user
const checkIfSenderIgnored = async (userId, senderEmail) => {
  const record = await IgnoredSender.findOne({ userId, senderEmail: senderEmail.toLowerCase() });
  return !!record;
};

// ── Helper: match bucket rules ────────────────────────────────────────────
const matchBucketRules = async (userId, senderEmail, subject) => {
  const rules      = await BucketRule.find({ userId, isActive: true });
  const email      = senderEmail.toLowerCase();
  const domain     = email.includes('@') ? email.split('@')[1] : '';
  const subjectLow = subject.toLowerCase();

  for (const rule of rules) {
    let matches = false;
    switch (rule.ruleType) {
      case 'sender_email':     matches = email      === rule.ruleValue; break;
      case 'sender_domain':    matches = domain     === rule.ruleValue; break;
      case 'subject_contains': matches = subjectLow.includes(rule.ruleValue); break;
    }
    if (matches) {
      const bucket = await CustomBucket.findOne({ bucketId: rule.bucketId });
      if (bucket) return { bucketId: bucket.bucketId, bucketName: bucket.bucketName };
    }
  }
  return null;
};

// ── GET /api/gmail/test-connections — Debug endpoint ─────────────────────
router.get('/test-connections', authMiddleware, async (req, res) => {
  const { accessToken } = req.query;
  const results = { gmail: null, gemini: null };

  // Test Gmail
  try {
    const gmail = buildGmailClient(accessToken);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    results.gmail = { ok: true, email: profile.data.emailAddress };
  } catch (e) {
    results.gmail = { ok: false, error: e.message };
  }

  // Test Gemini
  try {
    const { classifyEmailWithAI } = require('../services/geminiService');
    const cls = await classifyEmailWithAI(req.user.userId, 'Test subject', 'test@example.com', 'Hello world test');
    results.gemini = { ok: true, result: cls };
  } catch (e) {
    results.gemini = { ok: false, error: e.message };
  }

  return res.json(results);
});

// ── POST /api/gmail/sync ──────────────────────────────────────────────────
router.post('/sync', authMiddleware, async (req, res) => {
  const { accessToken, limit = 10 } = req.body;
  const userId = req.user.userId;

  if (!accessToken) {
    return res.status(400).json({ error: 'Gmail access token is required' });
  }

  const effectiveLimit = Math.min(Math.max(Number(limit), 5), 20);

  try {
    // ── STAGE 1: Build Gmail client & list messages ──────────────────────
    let messages = [];
    try {
      const gmail    = buildGmailClient(accessToken);
      const listResp = await gmail.users.messages.list({
        userId: 'me', q: 'is:unread', maxResults: effectiveLimit,
      });
      messages = listResp.data.messages || [];
      console.log(`[gmail/sync] Stage 1 OK — ${messages.length} unread messages`);
    } catch (e) {
      console.error('[gmail/sync] Stage 1 FAILED (Gmail list):', e.message);
      return res.status(500).json({ error: 'Gmail API error — check your access token and that Gmail API is enabled', details: e.message });
    }

    if (messages.length === 0) {
      return res.json({ message: 'No unread emails found', synced: 0, skipped: 0, autoResponseMatches: 0 });
    }

    const gmail = buildGmailClient(accessToken);
    let synced = 0, skipped = 0, autoResponseMatches = 0;

    // ── STAGE 2: Process each message ───────────────────────────────────
    for (const msg of messages) {
      if (await Email.findOne({ userId, gmailId: msg.id })) { skipped++; continue; }

      let fullMsg, parsed;
      try {
        fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        parsed  = parseGmailMessage(fullMsg.data);
      } catch (e) {
        console.error(`[gmail/sync] Stage 2 FAILED (fetch msg ${msg.id}):`, e.message);
        skipped++; continue;
      }

      const isIgnored = await checkIfSenderIgnored(userId, parsed.senderEmail);

      // Bucket rules
      let customBucketId = null, bucketName = 'General';
      if (!isIgnored) {
        try {
          const bucketMatch = await matchBucketRules(userId, parsed.senderEmail, parsed.subject);
          if (bucketMatch) { customBucketId = bucketMatch.bucketId; bucketName = bucketMatch.bucketName; }
        } catch (e) {
          console.warn('[gmail/sync] Bucket rule match failed:', e.message);
        }
      }

      // Auto-response
      if (!customBucketId && !isIgnored) {
        try {
          const autoMatch = await matchAutoResponseRules(userId, parsed);
          if (autoMatch) {
            const generatedReply = await generateAutoResponse(parsed, autoMatch.instruction);
            const newEmail = await Email.create({
              emailId: `email_${crypto.randomBytes(6).toString('hex')}`,
              userId, gmailId: msg.id, threadId: fullMsg.data.threadId,
              subject: parsed.subject, senderName: parsed.senderName,
              senderEmail: parsed.senderEmail, snippet: fullMsg.data.snippet || '',
              body: parsed.body, date: parsed.date, domainBucket: bucketName,
              actionState: 'needs_attention', customBucketId, isIgnored,
              ...detectOTP(parsed.subject, parsed.body),
            });
            await PendingAutoResponse.create({
              userId, emailId: newEmail.emailId, ruleId: autoMatch.ruleId,
              matchedInstruction: autoMatch.instruction, generatedReply, status: 'pending',
            });
            autoResponseMatches++; synced++; continue;
          }
        } catch (e) {
          console.warn('[gmail/sync] Auto-response failed:', e.message);
        }
      }

      // ── STAGE 3: AI classification ──────────────────────────────────
      let actionState = 'needs_attention';
      if (!customBucketId && !isIgnored) {
        try {
          const cls = await classifyEmailWithAI(userId, parsed.subject, parsed.senderEmail, parsed.body);
          actionState = cls.actionState;
          console.log(`[gmail/sync] AI classified "${parsed.subject}" → ${actionState}`);
        } catch (e) {
          console.warn('[gmail/sync] Stage 3 AI classification failed (using default):', e.message);
          // Don't fail entire sync — use default classification
          actionState = 'needs_attention';
        }
      }

      // OTP detection
      const otpResult = detectOTP(parsed.subject, parsed.body);

      // ── STAGE 4: Save to DB ───────────────────────────────────────────
      try {
        await Email.create({
          emailId:      `email_${crypto.randomBytes(6).toString('hex')}`,
          userId,
          gmailId:      msg.id,
          threadId:     fullMsg.data.threadId,
          subject:      parsed.subject,
          senderName:   parsed.senderName,
          senderEmail:  parsed.senderEmail,
          snippet:      fullMsg.data.snippet || '',
          body:         parsed.body,
          date:         parsed.date,
          domainBucket: bucketName,
          actionState:  isIgnored ? 'ignored_safely' : actionState,
          customBucketId,
          isIgnored,
          hasOtp:        otpResult.hasOtp,
          otpCode:       otpResult.otpCode,
          otpDetectedAt: otpResult.hasOtp ? new Date() : null,
          otpExpiresAt:  otpResult.hasOtp ? new Date(Date.now() + 10 * 60 * 1000) : null,
        });
        synced++;
      } catch(e) {
        console.error('[gmail/sync] Stage 4 DB save failed:', e.message);
        skipped++;
      }
    }

    console.log(`[gmail/sync] Complete — synced:${synced} skipped:${skipped}`);
    return res.json({ message: `Synced ${synced} new email(s)`, synced, skipped, autoResponseMatches });

  } catch (err) {
    console.error('[gmail/sync] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Gmail sync failed', details: err.message });
  }
});

module.exports = router;

