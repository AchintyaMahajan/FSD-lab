/**
 * pages/AutoResponseRules.jsx — Natural language auto-response rule management
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, ToggleLeft, ToggleRight, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import api   from '../lib/axios';
import { useAuth } from '../context/AuthContext';

const AutoResponseRules = () => {
  const navigate = useNavigate();
  const [rules, setRules]         = useState([]);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading]     = useState(false);
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';

  const load = useCallback(async () => {
    if (!isPro) return;
    try { const { data } = await api.get('/api/auto-response/rules'); setRules(data.rules); }
    catch { toast.error('Failed to load rules'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!instruction.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/auto-response/rules', { instruction: instruction.trim() });
      toast.success('Rule created!');
      setInstruction('');
      load();
    } catch (err) {
      if (err?.response?.data?.code === 'UPGRADE_REQUIRED') {
        toast.error('Pro plan required to create rules. Click FREE badge to upgrade!', { duration: 4000 });
      } else {
        toast.error(err?.response?.data?.error || 'Failed to create rule');
      }
    }
    finally { setLoading(false); }
  };

  const remove = async (ruleId) => {
    try { await api.delete(`/api/auto-response/rules/${ruleId}`); setRules(prev => prev.filter(r => r.ruleId !== ruleId)); toast.success('Rule deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const toggle = async (ruleId) => {
    try {
      const { data } = await api.patch(`/api/auto-response/rules/${ruleId}/toggle`);
      setRules(prev => prev.map(r => r.ruleId === ruleId ? { ...r, isActive: data.isActive } : r));
    } catch { toast.error('Toggle failed'); }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-6 slide-up">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5 text-xs">
          <ChevronLeft size={14} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          <Bot size={22} className="text-brand-400" />
          <h1 className="text-2xl font-bold gradient-text">Auto-Response Rules</h1>
        </div>

        {!isPro ? (
          <div className="glass-card p-12 text-center space-y-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-2">
              <Bot size={32} className="text-brand-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Pro Feature Locked</h2>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
              Unlock AI Auto-Response Rules by upgrading to the Pro plan. Let MasterMail draft and queue replies for you automatically.
            </p>
            <button 
              onClick={() => navigate('/#pricing')}
              className="btn-primary mt-4 py-3 px-6"
            >
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <>
            <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-300/80">
                Rules are matched by AI during email sync. If an email matches, a draft reply is generated and held for your approval in <strong>Pending Responses</strong>.
              </p>
            </div>

            {/* Create form */}
            <div className="glass-card p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-300">New Rule</p>
              <textarea
                id="rule-instruction-input"
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                rows={3}
                placeholder={'Example: "If someone asks for my portfolio, reply with a link to my website."'}
                className="input resize-none"
              />
              <button id="create-rule-btn" onClick={create} disabled={loading || !instruction.trim()} className="btn-primary text-sm">
                <Plus size={14} /> {loading ? 'Creating…' : 'Create Rule'}
              </button>
            </div>

            {/* Rule list */}
            {rules.length === 0
              ? <p className="text-center text-slate-500 py-12">No rules yet. Create one above!</p>
              : rules.map(r => (
                  <div key={r.ruleId} className="glass-card p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 leading-relaxed">{r.instruction}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggle(r.ruleId)} title={r.isActive ? 'Disable' : 'Enable'}
                        className={`transition-colors ${r.isActive ? 'text-brand-400' : 'text-slate-600'}`}>
                        {r.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button onClick={() => remove(r.ruleId)} className="btn-danger p-1.5"><Trash2 size={13}/></button>
                    </div>
                  </div>
                ))
            }
          </>
        )}
      </div>
    </div>
  );
};

export default AutoResponseRules;
