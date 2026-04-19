/**
 * components/DailySummaryPanel.jsx — Right panel with today's stats
 */
import { useEffect, useState } from 'react';
import { TrendingUp, Inbox, Eye, EyeOff, Trash2, Clock, Layers } from 'lucide-react';
import api from '../lib/axios';

const Stat = ({ icon: Icon, label, value, color = 'text-slate-300' }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <Icon size={14} className={color} />
      {label}
    </div>
    <span className={`font-semibold text-sm ${color}`}>{value}</span>
  </div>
);

const DailySummaryPanel = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/api/summary/daily')
      .then(r => setSummary(r.data))
      .catch(() => {});
  }, []);

  if (!summary) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-3 bg-white/5 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  // Always use the browser's local clock — backend date string can be off by a day
  // when toISOString() converts UTC in non-UTC timezones like IST (UTC+5:30)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="glass-card p-5 space-y-1 slide-up">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-brand-400" />
        <h3 className="font-semibold text-sm text-slate-200">Today's Summary</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">{today}</p>

      <Stat icon={Inbox}  label="Total received"  value={summary.totalReceived}   color="text-slate-300" />
      <Stat icon={Eye}    label="Important"        value={summary.importantCount}  color="text-brand-400" />
      <Stat icon={EyeOff} label="Auto-ignored"     value={summary.ignoredCount}    color="text-slate-500" />
      <Stat icon={Trash2} label="Deleted"          value={summary.deletedCount}    color="text-rose-400" />
      <Stat icon={Clock}  label="Pending replies"  value={summary.pendingReplies}  color="text-amber-400" />

      {Object.keys(summary.byBucket || {}).filter(k => !['needs_decision','needs_attention','ignored_safely'].includes(k)).length > 0 && (
        <>
          <p className="text-xs text-slate-500 pt-3 pb-1 font-semibold uppercase tracking-wider">By Bucket</p>
          {Object.entries(summary.byBucket)
            .filter(([k]) => !['needs_decision','needs_attention','ignored_safely'].includes(k))
            .map(([name, count]) => (
              <Stat key={name} icon={Layers} label={name} value={count} color="text-violet-400" />
            ))
          }
        </>
      )}
    </div>
  );
};

export default DailySummaryPanel;
