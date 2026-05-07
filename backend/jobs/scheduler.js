const cron = require('node-cron');
const { ScheduledEmail, Session } = require('../models');
const { buildGmailClient } = require('../services/gmailService');

// Helper to build raw email
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

const processScheduledEmails = async () => {
  try {
    const now = new Date();
    const pendingEmails = await ScheduledEmail.find({
      status: 'pending',
      sendAt: { $lte: now },
    });

    if (pendingEmails.length === 0) return;

    console.log(`[JOB] Found ${pendingEmails.length} scheduled email(s) to send.`);

    for (const email of pendingEmails) {
      try {
        // Find an active session with a gmail access token for this user
        const session = await Session.findOne({ 
          userId: email.userId, 
          gmailAccessToken: { $ne: null } 
        }).sort({ createdAt: -1 });

        if (!session) {
          throw new Error('No active Gmail session found for user');
        }

        const gmail = buildGmailClient(session.gmailAccessToken);
        const raw = buildRawEmail(email.to, email.subject, email.body);

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw },
        });

        email.status = 'sent';
        await email.save();
        console.log(`[JOB] Scheduled email ${email.emailId} sent successfully.`);
      } catch (err) {
        console.error(`[JOB] Failed to send scheduled email ${email.emailId}:`, err.message);
        email.status = 'failed';
        email.error = err.message;
        await email.save();
      }
    }
  } catch (err) {
    console.error('[JOB] processScheduledEmails error:', err.message);
  }
};

const startSchedulerJob = () => {
  // Run every minute
  cron.schedule('* * * * *', processScheduledEmails);
  console.log('⏰  Scheduled email job started (runs every minute)');
};

module.exports = { startSchedulerJob };
