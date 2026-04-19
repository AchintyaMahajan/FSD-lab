/**
 * components/OtpRibbon.jsx — Active OTP notification banner
 *
 * Shows all non-expired, non-dismissed OTPs.
 * Copies code to clipboard on click.
 * Live countdown timer updates every second.
 */
import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, X, KeyRound } from 'lucide-react';
import api from '../lib/axios';
import toast from 'react-hot-toast';

const OtpRibbon = () => {
  const [otps, setOtps] = useState([]);
  const [copied, setCopied] = useState(null);   // emailId of the just-copied OTP

  const fetchOtps = useCallback(async () => {
    try {
      const { data } = await api.get('/api/emails/otp/active');
      setOtps(data.activeOtps || []);
    } catch { /* silent */ }
  }, []);

  // Poll every 10 s; also countdown locally every second
  useEffect(() => {
    fetchOtps();
    const poll = setInterval(fetchOtps, 10_000);
    return () => clearInterval(poll);
  }, [fetchOtps]);

  // Local countdown tick
  useEffect(() => {
    const tick = setInterval(() => {
      setOtps(prev =>
        prev
          .map(o => ({ ...o, secondsRemaining: Math.max(0, o.secondsRemaining - 1) }))
          .filter(o => o.secondsRemaining > 0)
      );
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const dismiss = async (emailId) => {
    try {
      await api.post(`/api/emails/otp/dismiss?email_id=${emailId}`);
      setOtps(prev => prev.filter(o => o.emailId !== emailId));
    } catch { toast.error('Could not dismiss OTP'); }
  };

  const copy = (emailId, code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(emailId);
      toast.success(`OTP ${code} copied!`);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  if (otps.length === 0) return null;

  return (
    <div className="otp-ribbon px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
          <KeyRound size={15} />
          OTP Alert
        </div>
        {otps.map(otp => (
          <div
            key={otp.emailId}
            className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5 text-sm"
          >
            <span className="text-amber-200 font-mono text-base font-bold tracking-widest">
              {otp.otpCode}
            </span>
            <span className="text-amber-400/70 text-xs">({fmt(otp.secondsRemaining)})</span>
            <span className="text-slate-400 text-xs hidden sm:block truncate max-w-[120px]">
              {otp.senderEmail}
            </span>
            <button
              onClick={() => copy(otp.emailId, otp.otpCode)}
              className="text-amber-400 hover:text-amber-200 transition-colors"
              title="Copy OTP"
            >
              {copied === otp.emailId ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => dismiss(otp.emailId)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OtpRibbon;
