/**
 * middleware/planCheck.js — Plan-gating middleware
 *
 * Usage: router.post('/create', requireAuth, requirePro, handler)
 */


/**
 * Blocks free-plan users from accessing Pro-only routes.
 * Attach AFTER requireAuth so req.user is already populated.
 */
const requirePro = async (req, res, next) => {
  try {
    // req.user is already the full User doc attached by authMiddleware
    if (!req.user) return res.status(401).json({ error: 'User not found.' });

    if (req.user.plan !== 'pro') {
      return res.status(403).json({
        error:    'Pro plan required.',
        code:     'UPGRADE_REQUIRED',
        message:  'This feature is only available on the MasterMail Pro plan. Upgrade to unlock it.',
        upgradeUrl: '/pricing',
      });
    }

    next();
  } catch (err) {
    console.error('[planCheck] error:', err.message);
    res.status(500).json({ error: 'Failed to verify plan.' });
  }
};

module.exports = { requirePro };
