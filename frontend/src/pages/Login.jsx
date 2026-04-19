/**
 * pages/Login.jsx — Google OAuth login page
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Zap, Shield, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  'email', 'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

const Feature = ({ icon: Icon, title, desc }) => (
  <div className="flex gap-3 items-start">
    <div className="p-2 rounded-lg bg-brand-600/20 border border-brand-500/20 mt-0.5 shrink-0">
      <Icon size={16} className="text-brand-400" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
  </div>
);

const Login = () => {
  const { user, setUser, saveGmailToken } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

  // Handle Gmail OAuth token in URL hash (after redirect back)
  useEffect(() => {
    const hash   = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token  = params.get('access_token');
    const idToken = params.get('id_token');

    if (token || idToken) {
      // Clean URL immediately
      window.history.replaceState(null, '', window.location.pathname);
      handleOAuthCallback(token, idToken);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOAuthCallback = async (accessToken, idToken) => {
    try {
      const { data } = await api.post('/api/auth/google', {
        credential:  idToken   || accessToken,
        accessToken: accessToken || null,
      });
      setUser(data.user);
      if (accessToken) saveGmailToken(accessToken);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleLogin = () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
      toast.error('Google Client ID is not configured in .env');
      return;
    }
    const redirectUri = `${window.location.origin}/login`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=consent`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left — branding */}
        <div className="space-y-8 fade-in">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2.5 rounded-xl bg-brand-600 shadow-lg shadow-brand-900/50">
                <Mail size={22} className="text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">MasterMail</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-100 leading-tight">
              Take control of<br />your inbox.
            </h1>
            <p className="mt-3 text-slate-400 text-base leading-relaxed">
              AI-powered email intelligence that triages your Gmail into actionable decisions — automatically.
            </p>
          </div>

          <div className="space-y-4">
            <Feature icon={Brain}  title="AI Triage"     desc="Automatically classifies emails into Needs Decision, Needs Attention, or Ignored Safely." />
            <Feature icon={Zap}    title="OTP Detection" desc="Instantly surfaces OTP codes with a live countdown — no more hunting through emails." />
            <Feature icon={Shield} title="Smart Buckets"  desc="Create custom rules to auto-route emails from specific senders or subjects." />
          </div>
        </div>

        {/* Right — login card */}
        <div className="glass-card p-8 space-y-6 fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">Get started</h2>
            <p className="text-sm text-slate-500">Sign in with your Google account</p>
          </div>

          <button
            id="google-login-btn"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-slate-800 bg-white hover:bg-slate-100 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            {/* Google SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-1.8 13.7-4.8l-6.4-5.2C29.4 35.6 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.7 39.7 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.4 5.2C41.5 35.4 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-slate-600 leading-relaxed px-4">
            By signing in you grant MasterMail read, send, and modify access to your Gmail — required for email sync and replies.
          </p>

          <div className="border-t border-white/5 pt-4 text-center">
            <p className="text-xs text-slate-600">
              Your emails are never stored on external servers. All AI processing uses your own Gemini API key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
