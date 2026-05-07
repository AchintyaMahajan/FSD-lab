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
const bcrypt     = require('bcryptjs');
const nodemailer = require('nodemailer');

const { User, Session, OTP } = require('../models');
const authMiddleware    = require('../middleware/auth');

const router   = express.Router();
const gClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Transporter will be created dynamically inside the route so it picks up the latest .env without a restart!

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
        plan:    user.plan,
      },
      sessionToken,
    });
  } catch (err) {
    console.error('[auth/google]', err.message);
    return res.status(401).json({ error: 'Google authentication failed', details: err.message });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
    });

    return res.json({ message: 'Registration successful. You can now log in.' });
  } catch (err) {
    console.error('[auth/register]', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(code, salt);

    // Remove any existing OTP for this email
    await OTP.deleteOne({ email: email.toLowerCase() });

    await OTP.create({
      email: email.toLowerCase(),
      code: hashedCode,
    });

    // Send email
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      try {
        const dynamicTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await dynamicTransporter.sendMail({
          from: `"MasterMail" <${process.env.SMTP_EMAIL}>`,
          to: user.email,
          subject: 'Your MasterMail Login Code',
          text: `Your login code is: ${code}\nIt will expire in 10 minutes.`,
        });
      } catch (smtpErr) {
        console.error('[SMTP Error] Failed to send email:', smtpErr.message);
        console.warn(`[FALLBACK] The OTP for ${user.email} is: ${code}`);
      }
    } else {
      console.warn(`[WARNING] SMTP not configured! The OTP for ${user.email} is: ${code}`);
    }

    return res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase() });
    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP expired or invalid' });
    }

    const isMatch = await bcrypt.compare(code, otpRecord.code);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Clean up OTP
    await OTP.deleteOne({ email: email.toLowerCase() });

    // Issue Session
    user.lastLogin = new Date();
    await user.save();

    const sessionToken = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      sessionToken,
      userId:           user.userId,
      gmailAccessToken: null, // They must connect Gmail later
      expiresAt,
    });

    res.cookie('session_token', sessionToken, SESSION_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      user: {
        userId:  user.userId,
        email:   user.email,
        name:    user.name,
        picture: user.picture,
        plan:    user.plan,
      },
      sessionToken,
    });
  } catch (err) {
    console.error('[auth/verify-otp]', err.message);
    return res.status(500).json({ error: 'OTP verification failed' });
  }
});


// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const { userId, email, name, picture, plan } = req.user;
  return res.json({ userId, email, name, picture, plan });
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
