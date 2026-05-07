const express = require('express');
const authMiddleware = require('../middleware/auth');
const { callGeminiAI } = require('../services/geminiService');
const { buildGmailClient } = require('../services/gmailService');
const { ScheduledEmail } = require('../models');

const router = express.Router();

// ── POST /api/compose/generate ───────────────────────────────────────────
router.post('/generate', authMiddleware, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const systemPrompt = `You are a professional email assistant. Generate an email draft based on the user's prompt. Provide only the email body content, without the subject line or "Subject:" prefix. Make it professional and ready to send.`;
    const draft = await callGeminiAI('generate', prompt, systemPrompt);
    return res.json({ draft });
  } catch (err) {
    console.error('[compose/generate]', err.message);
    return res.status(500).json({ error: 'Failed to generate email draft' });
  }
});

// Helper function to build a raw email string for Gmail API
const buildRawEmail = (to, subject, body) => {
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(rawEmail).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// ── POST /api/compose/send ───────────────────────────────────────────────
router.post('/send', authMiddleware, async (req, res) => {
  const { to, subject, body, accessToken } = req.body;
  if (!to || !subject || !body || !accessToken) {
    return res.status(400).json({ error: 'Missing required fields or access token' });
  }

  try {
    const gmail = buildGmailClient(accessToken);
    const raw = buildRawEmail(to, subject, body);

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return res.json({ message: 'Email sent successfully', gmailMessageId: response.data.id });
  } catch (err) {
    console.error('[compose/send]', err.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

// ── POST /api/compose/schedule ───────────────────────────────────────────
router.post('/schedule', authMiddleware, async (req, res) => {
  const { to, subject, body, sendAt } = req.body;
  if (!to || !subject || !body || !sendAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const scheduleDate = new Date(sendAt);
    if (isNaN(scheduleDate.getTime()) || scheduleDate < new Date()) {
      return res.status(400).json({ error: 'Invalid or past send date' });
    }

    const scheduled = await ScheduledEmail.create({
      userId: req.user.userId,
      to,
      subject,
      body,
      sendAt: scheduleDate,
    });

    return res.json({ message: 'Email scheduled successfully', emailId: scheduled.emailId });
  } catch (err) {
    console.error('[compose/schedule]', err.message);
    return res.status(500).json({ error: 'Failed to schedule email' });
  }
});

// ── GET /api/compose/scheduled ───────────────────────────────────────────
router.get('/scheduled', authMiddleware, async (req, res) => {
  try {
    const scheduled = await ScheduledEmail.find({ 
      userId: req.user.userId, 
      status: 'pending' 
    }).sort({ sendAt: 1 });
    
    return res.json({ scheduled });
  } catch (err) {
    console.error('[compose/get-scheduled]', err.message);
    return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
});

// ── DELETE /api/compose/scheduled/:id ────────────────────────────────────
router.delete('/scheduled/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ScheduledEmail.findOneAndDelete({
      emailId: id,
      userId: req.user.userId,
      status: 'pending'
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Scheduled email not found or already sent' });
    }

    return res.json({ message: 'Scheduled email cancelled successfully' });
  } catch (err) {
    console.error('[compose/delete-scheduled]', err.message);
    return res.status(500).json({ error: 'Failed to cancel scheduled email' });
  }
});

module.exports = router;
