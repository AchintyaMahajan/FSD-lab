/**
 * pages/AutoResponseRules.jsx — Natural language auto-response rule management
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, ToggleLeft, ToggleRight, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import api   from '../lib/axios';

const AutoResponseRules = () => {
  const navigate = useNavigate();
  const [rules, setRules]         = useState([]);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading]     = useState(false);

  const load = useCallback(async () => {
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
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to create rule'); }
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
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-6 slide-up">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5 text-xs">
          <ChevronLeft size={14} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          <Bot size={22} className="text-brand-400" />
          <h1 className="text-2xl font-bold gradient-text">Auto-Response Rules</h1>
        </div>

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
      </div>
    </div>
  );
};

export default AutoResponseRules;
