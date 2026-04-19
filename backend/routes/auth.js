/**
 * routes/auth.js — Authentication routes
 *
 * POST /api/auth/google  → Verify Google ID token, create/login user, issue session
 * GET  /api/auth/me      → Return current user from session cookie
 * POST /api/auth/logout  → Invalidate session and clear cookie
 */

const express    = require('express');
const crypto     = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const { User, Session } = require('../models');
const authMiddleware    = require('../middleware/auth');

const router   = express.Router();
const gClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Cookie helper ─────────────────────────────────────────────────────────
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,   // 7 days in ms
  path:     '/',
};

// ── POST /api/auth/google ─────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential, accessToken } = req.body;

    // We need at least one of these
    const token = accessToken || credential;
    if (!token) {
      return res.status(400).json({ error: 'Google access token or credential is required' });
    }

    let email, name, picture;

    // Strategy 1: Try verifying as a Google ID token (Google One Tap / GSI button)
    // Strategy 2: Use as access_token to call userinfo endpoint (implicit OAuth flow)
    try {
      const ticket = await gClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email   = payload.email;
      name    = payload.name;
      picture = payload.picture;
    } catch {
      // Fallback: treat token as an OAuth2 access_token → call Google userinfo
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userInfoRes.ok) {
        const errText = await userInfoRes.text();
        throw new Error(`Google userinfo failed (${userInfoRes.status}): ${errText}`);
      }

      const userInfo = await userInfoRes.json();
      email   = userInfo.email;
      name    = userInfo.name;
      picture = userInfo.picture;
    }

    if (!email) {
      return res.status(400).json({ error: 'Could not extract email from Google token' });
    }

    // 2. Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      user.lastLogin = new Date();
      if (name)    user.name    = name;
      if (picture) user.picture = picture;
      await user.save();
    } else {
      user = await User.create({
        email:   email.toLowerCase(),
        name:    name    || email,
        picture: picture || null,
      });
    }

    // 3. Create a new session
    const sessionToken = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      sessionToken,
      userId:           user.userId,
      gmailAccessToken: accessToken || null,
      expiresAt,
    });

    // 4. Set HTTP-only session cookie
    res.cookie('session_token', sessionToken, SESSION_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      user: {
        userId:  user.userId,
        email:   user.email,
        name:    user.name,
        picture: user.picture,
      },
      sessionToken,
    });
  } catch (err) {
    console.error('[auth/google]', err.message);
    return res.status(401).json({ error: 'Google authentication failed', details: err.message });
  }
});


// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const { userId, email, name, picture } = req.user;
  return res.json({ userId, email, name, picture });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await Session.deleteOne({ sessionToken: req.session.sessionToken });

    res.clearCookie('session_token', { path: '/' });
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[auth/logout]', err.message);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
