/**
 * index.js — MasterMail Backend Entry Point
 *
 * Boot order:
 *  1. Load environment variables (.env)
 *  2. Connect to MongoDB
 *  3. Create Express app with middleware
 *  4. Mount route placeholders (to be filled as you build each feature)
 *  5. Start scheduled jobs
 *  6. Listen on PORT
 */

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');

const connectDB           = require('./config/db');
const { startCleanupJobs } = require('./jobs/cleanup');

// ── App ────────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 8001;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,   // Allow cookies to be sent cross-origin
}));

app.use(express.json());
app.use(cookieParser());

// ── Health check (no auth required) ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes (mount here as you build each feature module) ──────────────
app.use('/api/auth',              require('./routes/auth'));
app.use('/api/gmail',             require('./routes/gmail'));
app.use('/api/emails',            require('./routes/emails'));
app.use('/api/buckets',           require('./routes/buckets'));
app.use('/api/auto-response',     require('./routes/autoResponse'));
app.use('/api/pending-responses', require('./routes/pendingResponses'));
app.use('/api/senders',           require('./routes/senders'));
app.use('/api/summary',           require('./routes/summary'));

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Boot ───────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();           // 1. Establish MongoDB connection
  startCleanupJobs();          // 2. Start cron jobs

  app.listen(PORT, () => {
    console.log(`🚀  MasterMail backend running on http://localhost:${PORT}`);
    console.log(`🌍  Accepting requests from: ${process.env.FRONTEND_URL}`);
    console.log(`📦  Node env: ${process.env.NODE_ENV}`);
  });
};

start();
