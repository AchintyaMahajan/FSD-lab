/**
 * pages/TermsOfService.jsx — Terms of Service page (required for Google OAuth verification)
 */
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6 slide-up">
        <button onClick={() => navigate(-1)} className="btn-ghost py-1.5 text-xs">
          <ChevronLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-600 shadow-lg shadow-brand-900/50">
            <FileText size={20} className="text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Terms of Service</h1>
        </div>

        <div className="glass-card p-5 sm:p-8 space-y-6 text-slate-300 text-sm leading-relaxed">
          <p className="text-xs text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">1. Acceptance of Terms</h2>
            <p>
              By accessing or using MasterMail ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">2. Description of Service</h2>
            <p>
              MasterMail is an AI-powered email management tool that integrates with your Gmail account to provide intelligent email triage, OTP detection, auto-response capabilities, and email composition features. The Service requires access to your Gmail account through Google OAuth 2.0.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">3. Account & Access</h2>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li>You may sign up using Google OAuth or email/password with OTP verification</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must grant Gmail permissions for the Service to function</li>
              <li>You may revoke Gmail access at any time through your Google Account settings</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li>Use the Service for any unlawful purpose or to send spam</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service to violate any applicable laws or regulations</li>
              <li>Share your account access with unauthorized users</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">5. AI-Generated Content</h2>
            <p>
              MasterMail uses AI (Google Gemini) to classify emails and generate reply drafts. AI-generated content is provided as suggestions only. You are fully responsible for reviewing and approving any emails sent through the Service, including auto-responses.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">6. Subscription & Payments</h2>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li>The Service offers a free Basic plan and a paid Pro plan</li>
              <li>Pro plan payments are processed securely through Razorpay</li>
              <li>Pricing is displayed in Indian Rupees (₹) and may be subject to change</li>
              <li>Pro features include unlimited AI triage, custom buckets, and auto-response rules</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">7. Data & Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <a href="/privacy" className="text-brand-400 hover:text-brand-300 underline">Privacy Policy</a>.
              We take the security of your email data seriously and implement appropriate technical measures to protect it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">8. Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. We do not guarantee that the AI classification will be 100% accurate, that OTP detection will catch every code, or that the Service will be uninterrupted or error-free.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, MasterMail and its developers shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service, including but not limited to missed emails, incorrect classifications, or data loss.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time for violation of these terms. You may also terminate your account at any time by revoking Gmail access and contacting us for data deletion.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">12. Contact</h2>
            <p>
              For questions about these Terms, contact us at:{' '}
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

export default TermsOfService;
