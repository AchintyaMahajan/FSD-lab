/**
 * db.js — MongoDB connection manager using Mongoose
 *
 * Reads MONGO_URL and DB_NAME from environment variables.
 * Call connectDB() once at server startup (in index.js).
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    const dbName  = process.env.DB_NAME || 'mastermail';

    if (!mongoUrl) {
      throw new Error('MONGO_URL is not defined in environment variables.');
    }

    const conn = await mongoose.connect(mongoUrl, {
      dbName,
      // Mongoose 8+ has these on by default, but stated explicitly for clarity:
      serverSelectionTimeoutMS: 10_000,   // 10s to find a server
      socketTimeoutMS: 45_000,            // 45s for query timeout
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host} / ${dbName}`);

    // Graceful shutdown hooks
    process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌  MongoDB connection failed:', error.message);
    process.exit(1);   // Crash early so the problem is obvious
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️   ${signal} received — closing MongoDB connection…`);
  await mongoose.connection.close();
  console.log('🔌  MongoDB disconnected. Exiting.');
  process.exit(0);
};

module.exports = connectDB;
