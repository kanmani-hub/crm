import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, FileText, Shield, Send, ClipboardList, Clock, Plus, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { PayloadType, TrackedStatus } from '@/types';
import TopNavigationBar from '@/components/TopNavigationBar';
import Toast from '@/components/Toast';
import ModalWindow from '@/components/ModalWindow';
import StatusBadge from '@/components/StatusBadge';

const toggles: { type: PayloadType; label: string; icon: typeof FileText; color: string }[] = [
  { type: 'new-registration', label: 'NEW REG FORM', icon: FileText, color: '#B85C3D' },
  { type: 'bgv-form', label: 'BGV FORM', icon: Shield, color: '#5B8FBF' },
  { type: 'contact-mail', label: 'CONTACT MAIL', icon: Mail, color: '#5BA87C' },
];

export default function Dashboard() {
  const { trackedCandidates, settings, updateSettings, addTrackedCandidate, updateTrackedStatus, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedToggle, setSelectedToggle] = useState<PayloadType>('new-registration');
  const [isSending, setIsSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewCandidate, setReviewCandidate] = useState<string | null>(null);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSelectContact = (contactEmail: string) => {
    setSelectedContact(contactEmail);
    setEmail(contactEmail);
    setEmailError('');
  };

  const handleAddContact = () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setEmailError('Enter an email to add');
      return;
    }
    if (!validateEmail(nextEmail)) {
      setEmailError('Please enter a valid email');
      return;
    }
    if (settings.contactEmails.some((contact) => contact.toLowerCase() === nextEmail.toLowerCase())) {
      setSelectedContact(nextEmail);
      showToast('Contact already available', 'info');
      return;
    }

    updateSettings({
      ...settings,
      contactEmails: [...settings.contactEmails, nextEmail],
    });
    setSelectedContact(nextEmail);
    setEmailError('');
    showToast('Contact email added');
  };

  const handleSend = async () => {
    if (!email.trim()) {
      setEmailError('Please enter an email address');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    setEmailError('');
    setIsSending(true);

    // Simulate async dispatch
    await new Promise((r) => setTimeout(r, 800));

    addTrackedCandidate({
      candidateId: `tc_${Date.now()}`,
      status: 'form-pending' as TrackedStatus,
      payloadType: selectedToggle,
      email: email.trim(),
      timestamp: new Date().toISOString(),
    });

    showToast(`Form link dispatched to ${email.trim()}`);
    setSelectedContact('');
    setEmail('');
    setIsSending(false);
  };

  const handleReview = (candidateId: string) => {
    setReviewCandidate(candidateId);
    setReviewModalOpen(true);
  };

  const handleSendBGV = () => {
    if (reviewCandidate) {
      updateTrackedStatus(reviewCandidate, 'cleared');
      showToast('BGV request dispatched');
    }
    setReviewModalOpen(false);
    setReviewCandidate(null);
  };

  const getRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const reviewCandidateData = reviewCandidate
    ? trackedCandidates.find((t) => t.candidateId === reviewCandidate)
    : null;

  return (
    <div className="min-h-screen bg-cc-base-deep pt-14">
      <TopNavigationBar />
      <Toast />

      {/* BGV Review Modal */}
      <ModalWindow
        isOpen={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setReviewCandidate(null); }}
        title="BGV REVIEW"
        maxWidth="560px"
        footer={
          <>
            <button
              onClick={() => { setReviewModalOpen(false); setReviewCandidate(null); }}
              className="px-5 py-2 font-mono text-[11px] font-medium uppercase tracking-wider border border-cc-gridline rounded text-cc-text-mid hover:text-cc-warm-text hover:border-cc-warm-text transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={handleSendBGV}
              className="px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider bg-cc-blue text-white rounded hover:brightness-110 transition-all"
            >
              SEND TO BGV TEAM
            </button>
          </>
        }
      >
        {reviewCandidateData && (
          <div className="space-y-4">
            <p className="text-cc-text-mid">Review background verification data for:</p>
            <p className="font-sans text-base font-semibold text-cc-text-high">
              {reviewCandidateData.name || reviewCandidateData.email}
            </p>
            <p className="micro-text text-cc-text-mid">{reviewCandidateData.email}</p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-cc-base-elevated rounded p-4"
            >
              <span className="section-header">PERSONAL INFORMATION</span>
              <div className="mt-3 space-y-2">
                <div className="flex gap-2"><span className="micro-text text-cc-text-mid w-28">Full Name</span><span className="text-[13px]">{reviewCandidateData.name || 'Not provided'}</span></div>
                <div className="flex gap-2"><span className="micro-text text-cc-text-mid w-28">Email</span><span className="text-[13px]">{reviewCandidateData.email}</span></div>
                <div className="flex gap-2"><span className="micro-text text-cc-text-mid w-28">Phone</span><span className="text-[13px]">+91 98765 43210</span></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-cc-base-elevated rounded p-4"
            >
              <span className="section-header">EMPLOYMENT HISTORY</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {['TCS', 'Infosys'].map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 bg-[rgba(199,178,153,0.08)] border border-[rgba(199,178,153,0.15)] rounded-sm px-2 py-0.5 font-mono text-[10px] text-cc-warm-text">{c}</span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-cc-base-elevated rounded p-4"
            >
              <span className="section-header">DOCUMENTS SUBMITTED</span>
              <div className="mt-3 space-y-1.5">
                {[
                  { label: 'Offer Letter', checked: true },
                  { label: 'Appraisals', checked: false },
                  { label: 'Payslips', checked: true },
                  { label: 'Relieving Letter', checked: true },
                  { label: 'Counter Offer', checked: false },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${doc.checked ? 'bg-cc-green border-cc-green' : 'bg-cc-base-elevated border-cc-gridline'}`}>
                      {doc.checked && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                    <span className={`text-[13px] ${doc.checked ? 'text-cc-text-high' : 'text-cc-text-low line-through'}`}>{doc.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </ModalWindow>

      <div className="max-w-[960px] mx-auto px-4 lg:px-6 py-10">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-2"
        >
          <h1 className="font-mono text-[clamp(1.75rem,3vw,2.25rem)] font-light leading-tight tracking-[-0.02em] text-cc-text-high">
            COMMAND CENTER
          </h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center font-sans text-[13px] text-cc-text-mid mb-10"
        >
          Enter an email to begin a workflow
        </motion.p>

        {/* Push Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="max-w-[800px] mx-auto"
        >
          <div className="bg-cc-base-surface border border-cc-gridline rounded p-5 shadow-inset-glow">
            {/* Contact Selector */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-cc-warm-text" />
                  <span className="section-header">CONTACT EMAIL</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddContact}
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-cc-gridline bg-cc-base-elevated font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-cc-warm-text hover:border-cc-warm-primary disabled:opacity-50 transition-colors"
                >
                  <Plus size={13} />
                  ADD
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                <select
                  value={selectedContact}
                  onChange={(e) => handleSelectContact(e.target.value)}
                  disabled={isSending}
                  className="h-10 bg-cc-base-elevated border border-cc-gridline rounded px-3 font-sans text-[13px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none transition-colors"
                >
                  <option value="">Select saved contact</option>
                  {settings.contactEmails.map((contact) => (
                    <option key={contact} value={contact}>
                      {contact}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-2">
                  {settings.contactEmails.map((contact) => {
                    const isActive = email.trim().toLowerCase() === contact.toLowerCase();
                    return (
                      <button
                        key={contact}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        disabled={isSending}
                        className={`max-w-full rounded-sm border px-2.5 py-1 font-mono text-[10px] transition-colors ${
                          isActive
                            ? 'border-cc-warm-primary bg-[rgba(184,92,61,0.14)] text-cc-warm-text'
                            : 'border-[rgba(91,143,191,0.15)] bg-[rgba(91,143,191,0.08)] text-cc-text-mid hover:text-cc-warm-text'
                        }`}
                      >
                        <span className="block truncate">{contact}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cc-text-mid" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSelectedContact(''); setEmailError(''); }}
                placeholder="Edit or enter recipient email address..."
                className={`w-full h-12 bg-cc-base-elevated border rounded pl-11 pr-4 font-sans text-[15px] text-cc-text-high placeholder:text-cc-text-mid focus:outline-none transition-colors ${emailError ? 'border-cc-danger' : 'border-cc-gridline focus:border-cc-warm-primary'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
                disabled={isSending}
              />
            </div>
            {emailError && <p className="mt-1.5 micro-text text-cc-danger">{emailError}</p>}

            {/* Toggles + Send */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {toggles.map((t) => {
                const Icon = t.icon;
                const isActive = selectedToggle === t.type;
                return (
                  <button
                    key={t.type}
                    onClick={() => setSelectedToggle(t.type)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded font-mono text-[10px] font-medium tracking-[0.06em] uppercase transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? t.color : '#22262E',
                      border: `1px solid ${isActive ? t.color : '#2A3038'}`,
                      color: isActive ? '#FFFFFF' : '#8A9AAD',
                    }}
                  >
                    <Icon size={16} />
                    {t.label}
                  </button>
                );
              })}

              <div className="flex-1" />

              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-2 h-10 px-7 bg-cc-warm-primary text-white font-mono text-[11px] font-semibold uppercase tracking-[0.08em] rounded hover:bg-cc-warm-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(184,92,61,0.25)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all"
              >
                <Send size={14} />
                {isSending ? 'SENDING...' : 'SEND'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tracked Candidates List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="max-w-[800px] mx-auto mt-6"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="section-header">TRACKED CANDIDATES</span>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-semibold ${trackedCandidates.length > 0 ? 'bg-cc-warm-primary text-white' : 'bg-cc-base-elevated-strong text-cc-text-low'}`}>
              {trackedCandidates.length}
            </span>
          </div>

          {/* List */}
          <div className="bg-cc-base-surface border border-cc-gridline rounded shadow-inset-glow">
            {trackedCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <ClipboardList size={48} className="text-cc-text-low mb-3" />
                <p className="font-sans text-[13px] text-cc-text-mid">No tracked candidates</p>
                <p className="micro-text text-cc-text-low mt-1">Enter an email above to begin tracking</p>
              </div>
            ) : (
              <AnimatePresence>
                {trackedCandidates.map((tc) => (
                  <motion.div
                    key={tc.candidateId}
                    layout
                    initial={{ opacity: 0, maxHeight: 0 }}
                    animate={{ opacity: 1, maxHeight: 80 }}
                    exit={{ opacity: 0, maxHeight: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center px-4 py-3 border-b border-[rgba(42,48,56,0.5)] last:border-b-0 hover:bg-cc-base-elevated transition-colors group"
                  >
                    {/* Status Dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mr-3"
                      style={{
                        backgroundColor:
                          tc.status === 'form-pending' ? '#C9A84C' :
                          tc.status === 'bgv-submitted' ? '#5B8FBF' : '#5BA87C',
                      }}
                    />

                    {/* Candidate Info */}
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-sans text-[13px] font-medium text-cc-text-high truncate max-w-[200px]">
                        {tc.name || tc.email}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {tc.status === 'form-pending' && (
                        <StatusBadge label="FORM PENDING" variant="amber" />
                      )}
                      {tc.status === 'bgv-submitted' && (
                        <>
                          <StatusBadge label="REVIEW & SEND" variant="blue" />
                          <button
                            onClick={() => handleReview(tc.candidateId)}
                            className="px-3 py-1 bg-cc-blue text-white font-mono text-[10px] font-semibold uppercase rounded hover:brightness-110 transition-all"
                          >
                            REVIEW
                          </button>
                        </>
                      )}
                      {tc.status === 'cleared' && (
                        <StatusBadge label="CLEARED" variant="green" />
                      )}
                      <div className="flex items-center gap-1 text-cc-text-low micro-text">
                        <Clock size={10} />
                        {getRelativeTime(tc.timestamp)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
