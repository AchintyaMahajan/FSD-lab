/**
 * middleware/auth.js — Session-based authentication middleware.
 *
 * Reads the HTTP-only cookie `session_token`, looks it up in MongoDB,
 * and attaches `req.user` and `req.session` for downstream route handlers.
 *
 * Usage:
 *   const authMiddleware = require('../middleware/auth');
 *   router.get('/protected', authMiddleware, handler);
 */

const { Session, User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' });
    }

    // Find a non-expired session
    const session = await Session.findOne({
      sessionToken,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Load the associated user
    const user = await User.findOne({ userId: session.userId });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach to request for downstream handlers
    req.user    = user;
    req.session = session;

    next();
  } catch (err) {
    console.error('[authMiddleware] Error:', err.message);
    res.status(500).json({ error: 'Internal server error during auth check' });
  }
};

module.exports = authMiddleware;
