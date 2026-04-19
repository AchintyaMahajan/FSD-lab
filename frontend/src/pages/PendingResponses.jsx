/**
 * pages/PendingResponses.jsx — Review and approve AI-generated auto-replies
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, X, Check, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import api   from '../lib/axios';
import { useAuth } from '../context/AuthContext';

const PendingResponses = () => {
  const navigate = useNavigate();
  const { gmailToken } = useAuth();
  const [responses, setResponses] = useState([]);
  const [editing, setEditing]     = useState({});   // { responseId: editedText }
  const [loading, setLoading]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/api/pending-responses'); setResponses(data.pendingResponses || []); }
    catch { toast.error('Failed to load pending responses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const send = async (responseId) => {
    try {
      await api.post(`/api/pending-responses/${responseId}/send`, {
        editedReply: editing[responseId] || undefined,
        accessToken: gmailToken || undefined,
      });
      toast.success('Auto-response sent!');
      setResponses(prev => prev.filter(r => r.responseId !== responseId));
    } catch { toast.error('Failed to send — check Gmail token'); }
  };

  const discard = async (responseId) => {
    try {
      await api.post(`/api/pending-responses/${responseId}/discard`);
      toast.success('Response discarded');
      setResponses(prev => prev.filter(r => r.responseId !== responseId));
    } catch { toast.error('Discard failed'); }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-6 slide-up">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5 text-xs">
          <ChevronLeft size={14} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          <Bot size={22} className="text-brand-400" />
          <h1 className="text-2xl font-bold gradient-text">Pending Auto-Responses</h1>
        </div>

        {!gmailToken && (
          <div className="glass-card p-4 border border-rose-500/20 bg-rose-500/5">
            <p className="text-sm text-rose-300/80">No Gmail token found — sending will be skipped. Log in again to restore Gmail access.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : responses.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Check size={40} className="mx-auto mb-3 opacity-30" />
            <p>No pending responses — all clear!</p>
          </div>
        ) : (
          responses.map(r => (
            <div key={r.responseId} className="glass-card p-5 space-y-4">
              {/* Original email summary */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Original Email</p>
                <p className="text-sm font-medium text-slate-200">{r.email?.subject || 'No subject'}</p>
                <p className="text-xs text-slate-500">From: {r.email?.senderEmail}</p>
              </div>

              {/* Matched instruction */}
              <div className="text-xs text-amber-400/80 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                <span className="font-semibold">Matched rule:</span> {r.matchedInstruction}
              </div>

              {/* Editable reply */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">AI Draft Reply</p>
                <textarea
                  value={editing[r.responseId] ?? r.generatedReply}
                  onChange={e => setEditing(prev => ({ ...prev, [r.responseId]: e.target.value }))}
                  rows={4}
                  className="input resize-none text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => discard(r.responseId)} className="btn-danger py-1.5 text-xs">
                  <X size={12} /> Discard
                </button>
                <button onClick={() => send(r.responseId)} className="btn-primary py-1.5 text-xs">
                  <Send size={12} /> Send Reply
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingResponses;
