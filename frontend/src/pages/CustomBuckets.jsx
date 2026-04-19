/**
 * pages/CustomBuckets.jsx — Create and manage custom email buckets & rules
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate }   from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Pin, PinOff, Tag } from 'lucide-react';
import toast  from 'react-hot-toast';
import api    from '../lib/axios';

const RULE_TYPES = [
  { value: 'sender_email',     label: 'Sender email (exact)' },
  { value: 'sender_domain',    label: 'Sender domain' },
  { value: 'subject_contains', label: 'Subject contains' },
];

const CustomBuckets = () => {
  const navigate = useNavigate();
  const [buckets, setBuckets]       = useState([]);
  const [expanded, setExpanded]     = useState(null);   // bucketId whose rules are shown
  const [rules, setRules]           = useState({});     // { bucketId: [...] }
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const [newRuleType, setNewRuleType]   = useState('sender_email');
  const [newRuleValue, setNewRuleValue] = useState('');

  const load = useCallback(async () => {
    try { const { data } = await api.get('/api/buckets'); setBuckets(data.buckets.filter(b => !b.isSystem)); }
    catch { toast.error('Failed to load buckets'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRules = async (bucketId) => {
    if (rules[bucketId]) { setExpanded(expanded === bucketId ? null : bucketId); return; }
    try {
      const { data } = await api.get(`/api/buckets/${bucketId}/rules`);
      setRules(prev => ({ ...prev, [bucketId]: data.rules }));
      setExpanded(bucketId);
    } catch { toast.error('Failed to load rules'); }
  };

  const createBucket = async () => {
    if (!newName.trim()) return;
    try {
      await api.post('/api/buckets', { bucketName: newName.trim(), description: newDesc.trim() || null });
      toast.success('Bucket created!');
      setNewName(''); setNewDesc('');
      load();
    } catch (err) { toast.error(err?.response?.data?.error || 'Failed to create bucket'); }
  };

  const deleteBucket = async (bucketId) => {
    if (!confirm('Delete this bucket and all its rules?')) return;
    try { await api.delete(`/api/buckets/${bucketId}`); toast.success('Bucket deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const togglePin = async (bucket) => {
    try {
      await api.put(`/api/buckets/${bucket.bucketId}`, { isPinned: !bucket.isPinned });
      load();
    } catch { toast.error('Update failed'); }
  };

  const addRule = async (bucketId) => {
    if (!newRuleValue.trim()) return;
    try {
      await api.post('/api/buckets/rules', { bucketId, ruleType: newRuleType, ruleValue: newRuleValue.trim() });
      toast.success('Rule added');
      setNewRuleValue('');
      const { data } = await api.get(`/api/buckets/${bucketId}/rules`);
      setRules(prev => ({ ...prev, [bucketId]: data.rules }));
    } catch { toast.error('Failed to add rule'); }
  };

  const deleteRule = async (bucketId, ruleId) => {
    try {
      await api.delete(`/api/buckets/rules/${ruleId}`);
      setRules(prev => ({ ...prev, [bucketId]: prev[bucketId].filter(r => r.ruleId !== ruleId) }));
      toast.success('Rule deleted');
    } catch { toast.error('Failed to delete rule'); }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-6 slide-up">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5 text-xs">
          <ChevronLeft size={14} /> Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold gradient-text">Custom Buckets</h1>

        {/* Create form */}
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-300">New Bucket</p>
          <div className="flex gap-2">
            <input id="bucket-name-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Bucket name"     className="input flex-1" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="input flex-1" />
            <button id="create-bucket-btn" onClick={createBucket} className="btn-primary shrink-0"><Plus size={15} /> Create</button>
          </div>
        </div>

        {/* Bucket list */}
        {buckets.length === 0
          ? <p className="text-center text-slate-500 py-12">No custom buckets yet.</p>
          : buckets.map(b => (
              <div key={b.bucketId} className="glass-card overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Tag size={16} className="text-brand-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200">{b.bucketName}</p>
                    {b.description && <p className="text-xs text-slate-500">{b.description}</p>}
                  </div>
                  <span className="badge badge-success text-xs">{b.emailCount}</span>
                  <button onClick={() => togglePin(b)} className="btn-ghost p-1.5" title={b.isPinned ? 'Unpin' : 'Pin'}>
                    {b.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  <button onClick={() => loadRules(b.bucketId)} className="btn-ghost p-1.5 text-xs">Rules</button>
                  <button onClick={() => deleteBucket(b.bucketId)} className="btn-danger p-1.5">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Rules panel */}
                {expanded === b.bucketId && (
                  <div className="border-t border-white/5 p-4 space-y-3 bg-white/[0.02]">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auto-route rules</p>
                    {(rules[b.bucketId] || []).length === 0
                      ? <p className="text-xs text-slate-600">No rules yet.</p>
                      : rules[b.bucketId].map(r => (
                          <div key={r.ruleId} className="flex items-center gap-2 text-sm">
                            <span className="badge badge-ignored text-xs">{RULE_TYPES.find(t=>t.value===r.ruleType)?.label}</span>
                            <span className="text-slate-300 font-mono text-xs flex-1">{r.ruleValue}</span>
                            <button onClick={() => deleteRule(b.bucketId, r.ruleId)} className="text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={12}/></button>
                          </div>
                        ))
                    }
                    {/* Add rule */}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <select value={newRuleType} onChange={e => setNewRuleType(e.target.value)} className="input w-44 text-xs py-1.5">
                        {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input value={newRuleValue} onChange={e => setNewRuleValue(e.target.value)} placeholder="Value" className="input flex-1 py-1.5 text-xs" />
                      <button onClick={() => addRule(b.bucketId)} className="btn-primary py-1.5 text-xs"><Plus size={12}/> Add</button>
                    </div>
                  </div>
                )}
              </div>
            ))
        }
      </div>
    </div>
  );
};

export default CustomBuckets;
