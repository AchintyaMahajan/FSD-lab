import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Brain, Zap, Shield, CheckCircle2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Dynamically load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      toast('Please login first to upgrade', { icon: '👋' });
      navigate('/login');
      return;
    }
    if (user.plan === 'pro') {
      toast.success('You are already on the Pro plan!');
      return;
    }

    try {
      setLoading(true);
      // 1. Create order on backend
      const { data: order } = await api.post('/api/payment/create-order');

      // 2. Open Razorpay Checkout
      const options = {
        key: order.keyId || RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'MasterMail Pro',
        description: 'Upgrade to MasterMail Pro Plan',
        image: 'https://cdn-icons-png.flaticon.com/512/732/732200.png', // Placeholder logo
        order_id: order.orderId,
        handler: async function (response) {
          try {
            // 3. Verify payment on backend
            const verifyRes = await api.post('/api/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success('Payment successful! Welcome to Pro. 🎉');
              // Update user plan in context
              setUser(prev => ({ ...prev, plan: 'pro' }));
              navigate('/dashboard');
            }
          } catch (err) {
            toast.error(err.response?.data?.error || 'Payment verification failed.');
          }
        },
        prefill: {
          name: order.userName || user.name,
          email: order.userEmail || user.email,
        },
        theme: {
          color: '#6366f1', // brand-500
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate checkout.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Brain, title: "AI Triage", desc: "Automatically classifies emails into Needs Decision, Needs Attention, or Ignored Safely using Google Gemini." },
    { icon: Zap, title: "OTP Detection", desc: "Instantly surfaces OTP codes with a live countdown — no more hunting through emails." },
    { icon: Shield, title: "Smart Buckets", desc: "Create custom rules to auto-route emails from specific senders or subjects into unified views." },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 selection:bg-brand-500/30 font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0d1117]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg bg-brand-600 shadow-lg shadow-brand-900/50">
              <Mail size={16} className="text-white sm:hidden" />
              <Mail size={18} className="text-white hidden sm:block" />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-violet-400">
              MasterMail
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="text-xs sm:text-sm font-medium hover:text-white transition-colors">
                Dashboard
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="text-xs sm:text-sm font-medium hover:text-white transition-colors hidden sm:block">
                Log In
              </button>
            )}
            <button
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="bg-brand-600 hover:bg-brand-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-lg hover:shadow-brand-500/25"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-4">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white">
            Your Inbox, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">Intelligently Sorted.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-400 leading-relaxed">
            Stop drowning in emails. MasterMail uses advanced AI to triage your messages, highlight what matters, and automatically handle the noise.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/login')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold text-base sm:text-lg transition-all shadow-[0_0_40px_rgba(79,70,229,0.3)] hover:shadow-[0_0_60px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2"
            >
              Start for free <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold text-base sm:text-lg transition-all flex items-center justify-center"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Supercharge your email workflow</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to regain control of your time and focus on what actually requires your attention.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#161b22] border border-white/5 hover:border-brand-500/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <f.icon size={24} className="text-brand-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Simple, transparent pricing</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your needs. Upgrade anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-3xl bg-[#161b22] border border-white/5 flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Basic</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-white">₹0</span>
                  <span className="text-slate-500">/forever</span>
                </div>
                <p className="text-slate-400">Perfect to get a feel of AI email management.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  'AI Triage (50 emails/day)',
                  'OTP Detection',
                  'Basic Dashboard',
                  'Standard Gmail Sync'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="w-full py-4 rounded-xl font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                {user ? 'Go to Dashboard' : 'Get Started for Free'}
              </button>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#1c2130] to-[#161b22] border border-brand-500/30 relative flex flex-col shadow-2xl shadow-brand-900/20">
              <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-brand-500 to-violet-500 rounded-full text-xs font-bold text-white shadow-lg">
                MOST POPULAR
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">Pro</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-white">₹199</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="text-slate-400">For power users who want total automation.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  'Unlimited AI Triage',
                  'Auto-Response Rules',
                  'Custom Smart Buckets',
                  'Priority Support',
                  'Everything in Free'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 size={18} className="text-brand-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : (user?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 border-t border-white/5 mt-12 space-y-3 px-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <button onClick={() => navigate('/privacy')} className="hover:text-slate-300 transition-colors">
            Privacy Policy
          </button>
          <span className="text-slate-700">•</span>
          <button onClick={() => navigate('/terms')} className="hover:text-slate-300 transition-colors">
            Terms of Service
          </button>
        </div>
        <p className="text-xs">© {new Date().getFullYear()} MasterMail. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
