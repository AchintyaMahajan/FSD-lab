/**
 * jobs/cleanup.js — Scheduled maintenance jobs using node-cron.
 *
 * Jobs registered here:
 *  1. Safe-delete cleanup  — runs daily at midnight
 *     Permanently deletes emails whose 7-day retention window has expired.
 *
 *  2. Session cleanup      — runs daily at 01:00
 *     Removes expired sessions not yet purged by MongoDB's TTL index
 *     (belt-and-suspenders safety net).
 *
 * Call startCleanupJobs() once at server startup (in index.js).
 */

const cron               = require('node-cron');
const { SafeDelete, Email, Session } = require('../models');

// ── 1. Safe-Delete Cleanup 
// Runs every day at 00:00
const safeDeleteCleanup = cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running safe-delete cleanup…');
  try {
    const now     = new Date();
    const expired = await SafeDelete.find({
      deletionTimestamp: { $lte: now },
      isRestored: false,
    });

    let deleted = 0;
    for (const item of expired) {
      await Email.deleteOne({ emailId: item.emailId });
      await SafeDelete.deleteOne({ deleteId: item.deleteId });
      deleted++;
    }

    console.log(`[CRON] Safe-delete cleanup: permanently deleted ${deleted} email(s).`);
  } catch (err) {
    console.error('[CRON] Safe-delete cleanup failed:', err.message);
  }
}, { scheduled: false });   // Start manually via startCleanupJobs()


//2. Session Cleanup 
// Runs every day at 01:00 — backs up MongoDB's built-in TTL index
const sessionCleanup = cron.schedule('0 1 * * *', async () => {
  console.log('[CRON] Running session cleanup…');
  try {
    const result = await Session.deleteMany({ expiresAt: { $lte: new Date() } });
    console.log(`[CRON] Session cleanup: removed ${result.deletedCount} expired session(s).`);
  } catch (err) {
    console.error('[CRON] Session cleanup failed:', err.message);
  }
}, { scheduled: false });


//Public API 
const startCleanupJobs = () => {
  safeDeleteCleanup.start();
  sessionCleanup.start();
  console.log('⏰  Scheduled cleanup jobs started (safe-delete @ 00:00, sessions @ 01:00).');
};

module.exports = { startCleanupJobs };
