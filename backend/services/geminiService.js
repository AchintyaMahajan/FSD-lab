/**
 * services/geminiService.js — Google Gemini AI integration
 *
 * Exports:
 *   callGeminiAI(taskType, prompt, systemPrompt)   → string
 *   classifyEmailWithAI(userId, subject, senderEmail, body) → { domainBucket, actionState }
 *   getLearningContext(userId, senderEmail)         → string
 *   generateAutoResponse(email, instruction)        → string
 *   matchAutoResponseRules(userId, parsedEmail)     → rule | null
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { UserPreferences, UserFeedback, AutoResponseRule } = require('../models');

// Models confirmed available for this API key
const MODEL_LITE = 'gemini-2.5-flash';   // fast classification
const MODEL_FULL = 'gemini-2.5-flash';   // reply generation

// ── Core AI caller ────────────────────────────────────────────────────────
const callGeminiAI = async (taskType, prompt, systemPrompt = '') => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY is not set in environment');

  const genAI     = new GoogleGenerativeAI(apiKey);
  const modelName = taskType === 'classify' ? MODEL_LITE : MODEL_FULL;
  // v1beta is required for gemini-2.5-x and gemini-2.0-x models
  const model     = genAI.getGenerativeModel(
    { model: modelName },
    { apiVersion: 'v1beta' }
  );

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  const result     = await model.generateContent(fullPrompt);
  return result.response.text();
};

// ── Learning context builder ──────────────────────────────────────────────
const getLearningContext = async (userId, senderEmail) => {
  const email  = senderEmail.toLowerCase();
  const domain = email.includes('@') ? email.split('@')[1] : '';

  // Check explicit user preferences first
  const prefs = await UserPreferences.findOne({ userId });
  if (prefs) {
    if (prefs.ignoredSenders.includes(email))     return 'USER_RULE: Always ignore this sender';
    if (prefs.alwaysShowSenders.includes(email))  return 'USER_RULE: Always show as important';
  }

  const contextParts = [];

  // Sender-level feedback (last 3 actions)
  const senderFeedback = await UserFeedback.find({ userId, senderEmail: email })
    .sort({ createdAt: -1 })
    .limit(3);

  if (senderFeedback.length > 0) {
    const actions       = senderFeedback.map(f => f.userAction);
    const uniqueActions = [...new Set(actions)];
    if (uniqueActions.length === 1) {
      contextParts.push(`User always moves emails from ${email} to: ${actions[0]}`);
    }
  }

  // Domain-level feedback (last 5 actions)
  const domainFeedback = await UserFeedback.find({ userId, senderDomain: domain })
    .sort({ createdAt: -1 })
    .limit(5);

  if (domainFeedback.length >= 2) {
    const actions      = domainFeedback.map(f => f.userAction);
    const actionCounts = {};
    actions.forEach(a => { actionCounts[a] = (actionCounts[a] || 0) + 1; });
    const most = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
    if (most[1] >= 2) {
      contextParts.push(`User typically marks emails from ${domain} domain as: ${most[0]}`);
    }
  }

  return contextParts.join(' | ');
};

// ── Email classifier ──────────────────────────────────────────────────────
const classifyEmailWithAI = async (userId, subject, senderEmail, body) => {
  const learningContext = await getLearningContext(userId, senderEmail);

  // Honour explicit user rules without burning AI tokens
  if (learningContext.startsWith('USER_RULE:')) {
    if (learningContext.toLowerCase().includes('ignore'))    return { domainBucket: 'General', actionState: 'ignored_safely' };
    if (learningContext.toLowerCase().includes('important')) return { domainBucket: 'General', actionState: 'needs_decision' };
  }

  const systemPrompt = `Classify this email into one of: URGENT, READ_LATER, IGNORE.
URGENT     = Needs an immediate decision or action from the recipient.
READ_LATER = Important but not urgent; informational.
IGNORE     = Can be safely skipped (newsletters, promos, automated notifications).
Return ONLY the label — no explanation.`;

  let prompt = `Subject: ${subject}\nFrom: ${senderEmail}\nBody: ${body.substring(0, 300)}`;
  if (learningContext) prompt += `\n\nUser behaviour context: ${learningContext}`;

  const result = await callGeminiAI('classify', prompt, systemPrompt);
  const label  = result.trim().toUpperCase();

  const stateMap = { URGENT: 'needs_decision', READ_LATER: 'needs_attention', IGNORE: 'ignored_safely' };
  return { domainBucket: 'General', actionState: stateMap[label] || 'needs_attention' };
};

// ── Auto-response rule matcher ────────────────────────────────────────────
const matchAutoResponseRules = async (userId, parsedEmail) => {
  const rules = await AutoResponseRule.find({ userId, isActive: true });
  if (rules.length === 0) return null;

  const rulesText    = rules.map(r => `${r.ruleId}: ${r.instruction}`).join('\n');
  const systemPrompt = `You are matching emails to user-defined auto-response rules.
Return the rule_id that best matches, or "NONE" if no rule clearly fits.
Return ONLY the rule_id or "NONE", nothing else.`;

  const prompt = `Email Subject: ${parsedEmail.subject}
Email From: ${parsedEmail.senderEmail}
Email Body: ${parsedEmail.body.substring(0, 500)}

Available Rules:\n${rulesText}`;

  const result    = await callGeminiAI('classify', prompt, systemPrompt);
  const matchedId = result.trim();

  if (matchedId === 'NONE') return null;
  return rules.find(r => r.ruleId === matchedId) || null;
};

// ── Auto-response generator ───────────────────────────────────────────────
const generateAutoResponse = async (email, instruction) => {
  const systemPrompt = `Generate a concise, professional reply email based on the user's instruction. Keep the tone appropriate.`;
  const prompt = `Original Email:
From: ${email.senderName} <${email.senderEmail}>
Subject: ${email.subject}
Body: ${email.body.substring(0, 500)}

User's instruction for reply: ${instruction}

Generate the reply:`;

  return callGeminiAI('generate', prompt, systemPrompt);
};

module.exports = { callGeminiAI, classifyEmailWithAI, getLearningContext, matchAutoResponseRules, generateAutoResponse };
