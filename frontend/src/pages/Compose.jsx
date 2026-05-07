import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Sparkles, Clock, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

const Compose = () => {
  const navigate = useNavigate();
  const { gmailToken } = useAuth();
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendAt, setSendAt] = useState(null);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const fetchScheduled = async () => {
    try {
      const { data } = await api.get('/api/compose/scheduled');
      setScheduledEmails(data.scheduled || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handleCancelScheduled = async (id) => {
    try {
      await api.delete(`/api/compose/scheduled/${id}`);
      toast.success('Scheduled email cancelled');
      fetchScheduled();
    } catch {
      toast.error('Failed to cancel scheduled email');
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const { data } = await api.post('/api/compose/generate', { prompt: aiPrompt });
      setBody(data.draft);
      toast.success('Draft generated!');
      setShowAiPrompt(false);
      setAiPrompt('');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to generate draft');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendNow = async () => {
    if (!to || !subject || !body) {
      return toast.error('Please fill all required fields');
    }
    if (!gmailToken) {
      return toast.error('Gmail access token is missing. Please sync your inbox from the dashboard first.');
    }
    
    setIsSending(true);
    try {
      await api.post('/api/compose/send', { 
        to, subject, body, accessToken: gmailToken 
      });
      toast.success('Email sent successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!to || !subject || !body || !sendAt) {
      return toast.error('Please fill all fields, including the schedule date/time');
    }

    const scheduleDate = new Date(sendAt);
    if (scheduleDate <= new Date()) {
      return toast.error('Schedule time must be in the future');
    }

    setIsScheduling(true);
    try {
      await api.post('/api/compose/schedule', { 
        to, subject, body, sendAt 
      });
      toast.success('Email scheduled successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to schedule email');
    } finally {
      setIsScheduling(false);
      fetchScheduled();
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6 slide-up">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost py-1.5 text-xs">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-100">Compose Email</h1>
          </div>
        </div>

        <div className="glass-card p-6 space-y-5">
          {/* To & Subject */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="input text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject"
                className="input text-base font-medium"
              />
            </div>
          </div>

          {/* AI Generator Toggle */}
          <div className="pt-2 border-t border-white/5">
            <button 
              onClick={() => setShowAiPrompt(!showAiPrompt)}
              className="btn-ghost text-xs text-brand-400 hover:text-brand-300 border-brand-500/30"
            >
              <Sparkles size={14} /> Generate with AI
            </button>
            
            {showAiPrompt && (
              <div className="mt-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg space-y-3">
                <p className="text-xs text-brand-200">Describe what you want to write:</p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Write a professional email asking for next Friday off..."
                  className="input resize-none h-20 text-sm"
                />
                <button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="btn-primary text-xs w-full justify-center py-2"
                >
                  {isGenerating ? 'Generating...' : 'Generate Draft'}
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              className="input min-h-[250px] resize-y text-base leading-relaxed p-4"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            
            {/* Schedule block */}
            <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5 w-full sm:flex-1 sm:min-w-[280px]">
              <CalendarClock size={18} className="text-slate-400 ml-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <DatePicker
                  selected={sendAt}
                  onChange={(date) => setSendAt(date)}
                  showTimeSelect
                  timeFormat="h:mm aa"
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="MMMM d, yyyy h:mm aa"
                  minDate={new Date()}
                  placeholderText="Select date and time"
                  className="bg-transparent text-sm text-slate-200 outline-none w-full border-none cursor-pointer placeholder-slate-500"
                  wrapperClassName="w-full"
                />
              </div>
              <button 
                onClick={handleSchedule}
                disabled={isScheduling || !sendAt}
                className="btn-ghost py-1.5 text-xs shrink-0 whitespace-nowrap bg-white/5"
              >
                <Clock size={14} /> {isScheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>

            {/* Send block */}
            <button 
              onClick={handleSendNow}
              disabled={isSending}
              className="btn-primary py-3 px-8 shadow-lg shadow-brand-500/20 w-full sm:w-auto sm:shrink-0 justify-center"
            >
              <Send size={16} /> {isSending ? 'Sending...' : 'Send Now'}
            </button>
          </div>

        </div>
      </div>

      {/* Scheduled Emails Sidebar / List */}
      <div className="max-w-3xl mx-auto mt-6 space-y-4 slide-up">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider pl-1">Scheduled Emails</h2>
        {scheduledEmails.length === 0 ? (
          <div className="glass-card p-6 text-center text-slate-500">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No scheduled emails.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {scheduledEmails.map(email => (
              <div key={email.emailId} className="glass-card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-attention">Pending</span>
                    <span className="text-xs text-slate-400">
                      Sends {new Date(email.sendAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-slate-200 truncate">To: {email.to}</p>
                  <p className="text-xs text-slate-400 truncate">Sub: {email.subject}</p>
                </div>
                <button 
                  onClick={() => handleCancelScheduled(email.emailId)}
                  className="btn-danger py-1.5 px-3 text-xs shrink-0"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Compose;
