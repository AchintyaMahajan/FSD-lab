/**
 * pages/Dashboard.jsx — Main application view
 *
 * Shows: summary cards, email list, OTP ribbon, daily stats panel,
 * email detail modal, reply composer, bulk actions, safe-delete trash.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, LogOut, FolderOpen, Settings2, Inbox,
  CheckCircle, EyeOff, Trash2, ChevronLeft, Send,
  Wand2, Mail, AlertCircle, Clock, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth }          from '../context/AuthContext';
import api                  from '../lib/axios';
import OtpRibbon            from '../components/OtpRibbon';
import DailySummaryPanel    from '../components/DailySummaryPanel';

/* ── Small sub-components ──────────────────────────────────────────────── */
const CategoryCard = ({ id, title, count, subtitle, color, onClick, isActive }) => (
  <button
    id={id}
    onClick={onClick}
    className={`glass-card p-5 text-left w-full transition-all duration-200 hover:-translate-y-1 ${isActive ? 'ring-2 ring-brand-500/50' : ''}`}
  >
    <p className="text-3xl font-bold" style={{ color }}>{count}</p>
    <p className="text-sm font-semibold text-slate-200 mt-1">{title}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
  </button>
);

const ActionBadge = ({ state }) => {
  const map = {
    needs_decision:  { label: 'Decision',  cls: 'badge-decision' },
    needs_attention: { label: 'Attention', cls: 'badge-attention' },
    ignored_safely:  { label: 'Ignored',   cls: 'badge-ignored'  },
  };
  const { label, cls } = map[state] || { label: state, cls: '' };
  return <span className={`badge ${cls}`}>{label}</span>;
};

/* ── Main component ─────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { user, logout, gmailToken, saveGmailToken } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary]               = useState({ needs_decision:0, needs_attention:0, ignored_safely:0, total:0 });
  const [emails, setEmails]                 = useState([]);
  const [buckets, setBuckets]               = useState([]);
  const [selectedEmail, setSelectedEmail]   = useState(null);
  const [viewingState, setViewingState]     = useState(null);       // 'needs_decision' | 'bucket_xxx' | null
  const [selectedIds, setSelectedIds]       = useState([]);
  const [safeDeleted, setSafeDeleted]       = useState([]);
  const [replyText, setReplyText]           = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [isSyncing, setIsSyncing]           = useState(false);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [showTrash, setShowTrash]           = useState(false);
  const [emailLimit, setEmailLimit]         = useState(10);
  const [showLimitMenu, setShowLimitMenu]   = useState(false);
  const [pendingCount, setPendingCount]     = useState(0);

  /* ── Data fetchers ──────────────────────────────────────────────────── */
  const fetchSummary = useCallback(async () => {
    try { const { data } = await api.get('/api/emails/summary'); setSummary(data); } catch { /* silent */ }
  }, []);

  const fetchBuckets = useCallback(async () => {
    try {
      const { data } = await api.get('/api/buckets?include_empty=false');
      setBuckets(data.buckets.filter(b => !b.isSystem && b.emailCount > 0));
    } catch { /* silent */ }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { data } = await api.get('/api/pending-responses');
      setPendingCount(data.pendingResponses?.length || 0);
    } catch { /* silent */ }
  }, []);

  const fetchEmails = useCallback(async (state, bucketId = null) => {
    setIsLoading(true);
    setSelectedIds([]);
    try {
      const params = bucketId ? { custom_bucket_id: bucketId } : { action_state: state };
      const { data } = await api.get('/api/emails', { params });
      setEmails(data);
      setViewingState(bucketId ? `bucket_${bucketId}` : state);
    } catch { toast.error('Failed to load emails'); }
    finally { setIsLoading(false); }
  }, []);

  const fetchSafeDeleted = useCallback(async () => {
    try { const { data } = await api.get('/api/emails/safe-deleted'); setSafeDeleted(data.emails || []); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchBuckets();
    fetchPendingCount();

    // Check if returning from Gmail OAuth (initial login or re-auth after token expiry)
    const hash   = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token  = params.get('access_token');
    if (token) {
      saveGmailToken(token);
      window.history.replaceState(null, '', window.location.pathname);
      toast.success('Gmail access refreshed! You can now sync emails.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Re-login helper (token expired) ───────────────────────────────── */
  const promptReLogin = (clearToken = true) => {
    // Clear the stale token immediately so it isn't reused
    if (clearToken) {
      sessionStorage.removeItem('gmail_access_token');
      saveGmailToken(null);
    }
    toast(
      (t) => (
        <span className="flex flex-col gap-1">
          <span className="font-semibold text-sm">Gmail token expired</span>
          <span className="text-xs text-slate-400">Your session is still active — just re-grant Gmail access.</span>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              // Redirect OAuth back to /dashboard so the token hash is caught here
              const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
              const SCOPES = [
                'email', 'profile',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.modify',
              ].join(' ');
              const redirectUri = `${window.location.origin}/dashboard`;
              window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&prompt=consent`;
            }}
            className="mt-1 btn-primary py-1 text-xs w-full justify-center"
          >
            🔄 Refresh Gmail Access
          </button>
        </span>
      ),
      { duration: 10000, icon: '⚠️' }
    );
  };

  /* ── Sync ───────────────────────────────────────────────────────────── */
  const syncEmails = async () => {
    if (!gmailToken) {
      promptReLogin();
      return;
    }
    setIsSyncing(true);
    try {
      const { data } = await api.post('/api/gmail/sync', { accessToken: gmailToken, limit: emailLimit });
      toast.success(`Synced ${data.synced} email(s) — ${data.skipped} skipped`);
      fetchSummary(); fetchBuckets(); fetchPendingCount();
      if (viewingState) {
        const [type, id] = viewingState.startsWith('bucket_') ? ['bucket', viewingState.replace('bucket_','')] : [viewingState, null];
        fetchEmails(type !== 'bucket' ? type : null, id);
      }
    } catch (err) {
      const errMsg   = err?.response?.data?.error || '';
      const details  = err?.response?.data?.details || '';
      // Detect expired / revoked Gmail token
      const isAuthErr = details.includes('401') || details.includes('403')
                     || details.includes('invalid_grant') || details.includes('Token has been expired')
                     || errMsg.includes('access token');
      if (isAuthErr) {
        promptReLogin();
      } else {
        toast.error(errMsg || 'Sync failed');
      }
    } finally { setIsSyncing(false); }
  };

  /* ── Email action ───────────────────────────────────────────────────── */
  const doAction = async (emailId, action) => {
    try {
      await api.post(`/api/emails/${emailId}/action`, { action });
      setEmails(prev => prev.filter(e => e.emailId !== emailId));
      if (selectedEmail?.emailId === emailId) setSelectedEmail(null);
      fetchSummary();
    } catch { toast.error('Action failed'); }
  };

  /* ── Bulk actions ───────────────────────────────────────────────────── */
  const doBulk = async (action) => {
    if (!selectedIds.length) return;
    try {
      const body = { emailIds: selectedIds, action, accessToken: action === 'safe_delete' ? gmailToken : null };
      const { data } = await api.post('/api/emails/bulk-action', body);
      toast.success(data.message);
      setSelectedIds([]);
      setEmails(prev => prev.filter(e => !selectedIds.includes(e.emailId)));
      fetchSummary();
      if (action === 'safe_delete') fetchSafeDeleted();
    } catch { toast.error('Bulk action failed'); }
  };

  /* ── Reply ──────────────────────────────────────────────────────────── */
  const generateReply = async () => {
    if (!selectedEmail) return;
    setIsGenerating(true);
    try {
      const { data } = await api.post('/api/emails/generate-reply', { emailId: selectedEmail.emailId, userDraft: replyText });
      setReplyText(data.generatedReply);
    } catch { toast.error('AI generation failed'); }
    finally { setIsGenerating(false); }
  };

  const sendReply = async () => {
    if (!gmailToken) { toast.error('Gmail token missing'); return; }
    try {
      await api.post('/api/emails/send-reply', { emailId: selectedEmail.emailId, replyBody: replyText, accessToken: gmailToken });
      toast.success('Reply sent!');
      setReplyText('');
      setSelectedEmail(null);
      setEmails(prev => prev.filter(e => e.emailId !== selectedEmail.emailId));
    } catch { toast.error('Failed to send reply'); }
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  /* ── Toggle email selection ─────────────────────────────────────────── */
  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(15,15,26,0.9)', backdropFilter:'blur(20px)', borderColor:'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mail size={20} className="text-brand-400" />
            <span className="font-bold gradient-text text-lg">MasterMail</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Custom dark dropdown — replaces native select */}
            <div className="relative">
              <button
                onClick={() => setShowLimitMenu(p => !p)}
                className="btn-ghost py-1.5 text-xs flex items-center gap-1.5 w-28"
              >
                <span className="flex-1 text-left">{emailLimit} emails</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showLimitMenu ? 'rotate-180' : ''}`} />
              </button>
              {showLimitMenu && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowLimitMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[7rem] rounded-xl overflow-hidden"
                    style={{ background: 'rgba(22,33,62,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  >
                    {[5, 10, 15, 20].map(n => (
                      <button
                        key={n}
                        onClick={() => { setEmailLimit(n); setShowLimitMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors
                          ${ n === emailLimit
                            ? 'text-brand-400 bg-brand-500/15 font-semibold'
                            : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                          }`}
                      >
                        {n} emails
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button id="sync-btn" onClick={syncEmails} disabled={isSyncing} className="btn-primary py-1.5 text-xs">
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing…' : 'Sync'}
            </button>

            <button onClick={() => navigate('/custom-buckets')} className="btn-ghost py-1.5 text-xs">
              <FolderOpen size={13} /> Buckets
            </button>

            <button onClick={() => navigate('/auto-response-rules')} className="btn-ghost py-1.5 text-xs relative">
              <Settings2 size={13} /> Auto-Reply
            </button>

            <button onClick={() => navigate('/pending-responses')} className="btn-ghost py-1.5 text-xs relative">
              <Clock size={13} /> Pending
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button onClick={() => { setShowTrash(true); fetchSafeDeleted(); }} className="btn-ghost py-1.5 text-xs">
              <Trash2 size={13} /> Trash
            </button>

            <button onClick={handleLogout} className="btn-ghost py-1.5 text-xs">
              <LogOut size={13} />
            </button>

            {user?.picture && (
              <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full ring-2 ring-brand-500/40" />
            )}
          </div>
        </div>
      </header>

      {/* OTP Ribbon */}
      <OtpRibbon />

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {viewingState ? (
          /* ── Email list view ──────────────────────────────────────────── */
          <div className="space-y-4 slide-up">
            <div className="flex items-center justify-between">
              <button onClick={() => setViewingState(null)} className="btn-ghost py-1.5 text-xs">
                <ChevronLeft size={14} /> Back
              </button>
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-xs text-slate-400 self-center">{selectedIds.length} selected</span>
                  <button onClick={() => doBulk('ignore')}      className="btn-ghost py-1 text-xs"><EyeOff size={12}/> Ignore</button>
                  <button onClick={() => doBulk('safe_delete')} className="btn-danger py-1 text-xs"><Trash2 size={12}/> Delete</button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : emails.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Inbox size={40} className="mx-auto mb-3 opacity-30" />
                <p>No emails in this category</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {emails.map(email => (
                  <div
                    key={email.emailId}
                    className={`glass-card p-4 cursor-pointer transition-all ${selectedEmail?.emailId === email.emailId ? 'ring-2 ring-brand-500/50' : ''}`}
                    onClick={() => { setSelectedEmail(email); setReplyText(email.draftReply || ''); }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(email.emailId)}
                        onChange={() => toggleSelect(email.emailId)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1 accent-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm text-slate-200 truncate">{email.senderName}</p>
                          <ActionBadge state={email.actionState} />
                          {email.hasOtp && <span className="badge badge-success">OTP</span>}
                          <p className="ml-auto text-xs text-slate-500 shrink-0">
                            {new Date(email.date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                        <p className="text-sm text-slate-300 font-medium truncate">{email.subject}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{email.snippet || email.body?.substring(0, 100)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Email detail / reply panel */}
            {selectedEmail && (
              <div className="glass-card p-6 slide-up space-y-4 mt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-100">{selectedEmail.subject}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">From: {selectedEmail.senderName} &lt;{selectedEmail.senderEmail}&gt;</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button onClick={() => doAction(selectedEmail.emailId,'mark_read')}              className="btn-ghost py-1 text-xs"><CheckCircle size={12}/> Read</button>
                    <button onClick={() => doAction(selectedEmail.emailId,'ignore')}                 className="btn-ghost py-1 text-xs"><EyeOff size={12}/> Ignore</button>
                    <button onClick={() => doAction(selectedEmail.emailId,'always_ignore_sender')}   className="btn-danger py-1 text-xs"><AlertCircle size={12}/> Always Ignore</button>
                    <button onClick={() => doAction(selectedEmail.emailId,'move_to_needs_decision')} className="btn-ghost py-1 text-xs text-rose-400">→ Decision</button>
                    <button onClick={() => doAction(selectedEmail.emailId,'move_to_needs_attention')} className="btn-ghost py-1 text-xs text-amber-400">→ Attention</button>
                  </div>
                </div>

                <div
                  className="text-sm text-slate-300 leading-relaxed max-h-48 overflow-y-auto p-3 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {selectedEmail.body || selectedEmail.snippet || 'No body content.'}
                </div>

                {/* Reply composer */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reply</p>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Write your reply…"
                    className="input resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={generateReply} disabled={isGenerating} className="btn-ghost py-1.5 text-xs">
                      <Wand2 size={12} className={isGenerating ? 'animate-pulse' : ''} />
                      {isGenerating ? 'Generating…' : 'AI Draft'}
                    </button>
                    <button onClick={sendReply} disabled={!replyText} className="btn-primary py-1.5 text-xs">
                      <Send size={12} /> Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Summary view ─────────────────────────────────────────────── */
          <div className="flex gap-6 slide-up">
            <div className="flex-1 space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-100">
                  <span className="gradient-text">{summary.needs_decision}</span>
                  <span className="text-slate-300 ml-2 text-2xl font-normal">email{summary.needs_decision !== 1 ? 's' : ''} need{summary.needs_decision === 1 ? 's' : ''} your decision</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">Tap a card to view emails</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CategoryCard id="card-decision"  title="Needs Decision"  count={summary.needs_decision}  color="#fb7185" onClick={() => fetchEmails('needs_decision')}  isActive={viewingState==='needs_decision'} />
                <CategoryCard id="card-attention" title="Needs Attention" count={summary.needs_attention} color="#fcd34d" onClick={() => fetchEmails('needs_attention')} isActive={viewingState==='needs_attention'} />
                <CategoryCard id="card-ignored"   title="Ignored Safely"  count={summary.ignored_safely}  color="#64748b" onClick={() => fetchEmails('ignored_safely')}  isActive={viewingState==='ignored_safely'} />
              </div>

              {buckets.length > 0 && (
                <>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Custom Buckets</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {buckets.map(b => (
                      <CategoryCard
                        key={b.bucketId}
                        id={`card-bucket-${b.bucketId}`}
                        title={b.bucketName}
                        count={b.emailCount}
                        color="#a78bfa"
                        onClick={() => fetchEmails(null, b.bucketId)}
                        isActive={viewingState === `bucket_${b.bucketId}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="w-72 shrink-0 hidden lg:block">
              <DailySummaryPanel />
            </div>
          </div>
        )}
      </main>

      {/* Trash modal */}
      {showTrash && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTrash(false)}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2"><Trash2 size={16}/> Safe Delete Bucket</h3>
            {safeDeleted.length === 0
              ? <p className="text-slate-500 text-sm text-center py-8">No items in trash</p>
              : safeDeleted.map(item => (
                  <div key={item.deleteId} className="border-b border-white/5 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{item.originalEmail?.subject || 'No subject'}</p>
                      <p className="text-xs text-slate-500">{item.originalEmail?.senderEmail} · Deletes {new Date(item.deletionTimestamp).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={async () => { await doBulk('restore'); setSafeDeleted(prev => prev.filter(x => x.deleteId !== item.deleteId)); }}
                      className="btn-ghost py-1 text-xs shrink-0"
                    >Restore</button>
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
