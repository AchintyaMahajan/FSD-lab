import React from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PlanBadge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isPro = user.plan === 'pro';

  if (isPro) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold tracking-wide"
        title="MasterMail Pro Plan"
      >
        <Zap size={12} className="fill-current" />
        PRO
      </div>
    );
  }

  return (
    <button 
      onClick={() => navigate('/#pricing')}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold tracking-wide hover:bg-slate-700 hover:text-slate-300 transition-colors"
      title="Upgrade to Pro"
    >
      <ShieldCheck size={12} />
      FREE
    </button>
  );
};

export default PlanBadge;
