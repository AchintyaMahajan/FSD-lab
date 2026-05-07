/**
 * pages/PrivacyPolicy.jsx — Privacy Policy page (required for Google OAuth verification)
 */
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6 slide-up">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 text-xs">
          <ChevronLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-600 shadow-lg shadow-brand-900/50">
            <Shield size={20} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Privacy Policy</h1>
        </div>

        <div className="glass-card p-5 sm:p-8 space-y-6 text-slate-300 text-sm leading-relaxed">
          <p className="text-xs text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">1. Introduction</h2>
            <p>
              MasterMail ("we", "us", or "our") is an AI-powered email management application that helps users triage, organize, and respond to their Gmail inbox. This Privacy Policy explains how we collect, use, store, and protect your information when you use our service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">2. Information We Collect</h2>
            <p>When you use MasterMail, we collect the following data:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li><strong className="text-slate-300">Google Account Information:</strong> Name, email address, and profile picture via Google OAuth 2.0</li>
              <li><strong className="text-slate-300">Email Data:</strong> Email metadata (sender, subject, date, snippet) and body content synced from your Gmail account</li>
              <li><strong className="text-slate-300">OTP Codes:</strong> One-Time Password codes detected from your emails for quick-access display</li>
              <li><strong className="text-slate-300">Account Credentials:</strong> If using email/password login, your email and securely hashed password</li>
              <li><strong className="text-slate-300">Payment Information:</strong> Payment data is processed by Razorpay; we do not store card details</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">3. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li><strong className="text-slate-300">Gmail Read Access:</strong> To sync, read, and classify your emails into triage categories (Needs Decision, Needs Attention, Ignored Safely) using AI</li>
              <li><strong className="text-slate-300">Gmail Send Access:</strong> To send email replies you compose or approve through the app</li>
              <li><strong className="text-slate-300">Gmail Modify Access:</strong> To mark emails as read and manage email state after you take action</li>
              <li><strong className="text-slate-300">AI Processing:</strong> Email content is sent to Google Gemini AI for classification and reply generation; this data is not stored by the AI service</li>
              <li><strong className="text-slate-300">OTP Detection:</strong> To extract and display time-sensitive OTP codes for quick access</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">4. Data Storage & Security</h2>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li>Your data is stored in a secure MongoDB database</li>
              <li>Passwords are hashed using bcrypt before storage</li>
              <li>Gmail access tokens are stored temporarily in your browser session and are never persisted on our servers</li>
              <li>All communication between the app and our servers uses HTTPS encryption</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">5. Data Sharing</h2>
            <p>We do <strong className="text-slate-100">not</strong> sell, trade, or share your personal data with third parties, except:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li><strong className="text-slate-300">Google Gemini AI:</strong> Email content is processed for classification (not stored by the AI)</li>
              <li><strong className="text-slate-300">Razorpay:</strong> Payment processing for Pro plan subscriptions</li>
              <li><strong className="text-slate-300">Legal Requirements:</strong> If required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">6. Data Retention & Deletion</h2>
            <p>
              Email data is stored as long as your account is active. Emails moved to "Safe Delete" are permanently removed after 7 days. You may request complete account and data deletion by contacting us at the email below.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">7. Your Rights</h2>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li>Access, update, or delete your personal data at any time</li>
              <li>Revoke Gmail access via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">Google Account permissions</a></li>
              <li>Request complete data deletion by contacting us</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">8. Google API Services Disclosure</h2>
            <p>
              MasterMail's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, contact us at:{' '}
              <a href="mailto:achintya2005.work@gmail.com" className="text-brand-400 hover:text-brand-300 underline">
                achintya2005.work@gmail.com
              </a>
            </p>
          </section>
        </div>

        <footer className="text-center text-xs text-slate-600 pb-6">
          © {new Date().getFullYear()} MasterMail. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
