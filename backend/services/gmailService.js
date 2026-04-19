/**
 * services/gmailService.js — Gmail API helpers
 *
 * Exports:
 *   buildGmailClient(accessToken)          → gmail API instance
 *   parseGmailMessage(message)             → { subject, senderName, senderEmail, body, date }
 *   extractMessageBody(payload)            → raw HTML or plain-text string
 *   stripHtml(html)                        → plain text
 *   detectOTP(subject, body)               → { hasOtp, otpCode }
 *   extractSubjectKeywords(subject)        → string[]
 */

const { google }  = require('googleapis');
const cheerio     = require('cheerio');

// ── Build authenticated Gmail client ─────────────────────────────────────
const buildGmailClient = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
};

// ── Parse a raw Gmail message object ─────────────────────────────────────
const parseGmailMessage = (message) => {
  const headers = {};
  if (message.payload?.headers) {
    for (const h of message.payload.headers) {
      headers[h.name.toLowerCase()] = h.value;
    }
  }

  const subject = headers['subject'] || 'No Subject';
  const from    = headers['from']    || '';
  const dateStr = headers['date']    || '';

  // "John Doe <john@example.com>" → name and email
  let senderName  = from;
  let senderEmail = from.toLowerCase();

  const emailMatch = from.match(/<(.+?)>/);
  if (emailMatch) {
    senderEmail = emailMatch[1].toLowerCase();
    senderName  = from.substring(0, from.indexOf('<')).trim().replace(/^"|"$/g, '');
  }

  const rawBody  = extractMessageBody(message.payload);
  const body     = stripHtml(rawBody);

  return {
    subject,
    senderName:  senderName || senderEmail,
    senderEmail: senderEmail.trim(),
    body,
    date: new Date(dateStr),
  };
};

// ── Recursively extract the best body part ────────────────────────────────
const extractMessageBody = (payload) => {
  if (!payload) return '';

  // Direct plain text
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    // Prefer plain text in parts
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    // Fall back to HTML
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      // Recurse into multipart
      const nested = extractMessageBody(part);
      if (nested) return nested;
    }
  }

  // Direct HTML fallback
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return '';
};

// ── Strip HTML tags using cheerio ────────────────────────────────────────
const stripHtml = (html) => {
  if (!html) return '';
  try {
    const $ = cheerio.load(html);
    return $.text().replace(/\s+/g, ' ').trim();
  } catch {
    // Fallback: naive regex strip
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

// ── OTP detector ─────────────────────────────────────────────────────────
const detectOTP = (subject, body) => {
  const combined = `${subject} ${body}`.toLowerCase();

  const keywords = [
    'otp', 'verification code', 'security code', 'login code',
    'one-time password', 'one time password', '2fa', 'two-factor',
    'verify your', 'confirm your', 'authentication code',
    'temporary password', 'access code',
  ];

  const hasKeyword = keywords.some(kw => combined.includes(kw));
  if (!hasKeyword) return { hasOtp: false, otpCode: null };

  const patterns = [
    /(?:otp|code|pin|verification)[:\s]+(\d{4,8})/i,
    /(\d{4,8})\s+(?:is your|is the)\s+(?:otp|code|pin|verification)/i,
    /(?:use|enter|code)[:\s]+(\d{4,8})/i,
    /\b(\d{6})\b/,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match?.[1] && match[1].length >= 4 && match[1].length <= 8) {
      return { hasOtp: true, otpCode: match[1] };
    }
  }

  return { hasOtp: false, otpCode: null };
};

// ── Subject keyword extractor (for AI learning records) ──────────────────
const STOP_WORDS = new Set([
  're', 'fw', 'fwd', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'up',
  'your', 'you', 'me', 'my', 'i', 'we', 'our', 'us', 'this', 'that',
]);

const extractSubjectKeywords = (subject) =>
  subject
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 5);

module.exports = {
  buildGmailClient,
  parseGmailMessage,
  extractMessageBody,
  stripHtml,
  detectOTP,
  extractSubjectKeywords,
};
