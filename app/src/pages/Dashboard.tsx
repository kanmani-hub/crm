import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, FileText, Shield, Send, ClipboardList, Clock, Pencil, Check, X, Plus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { PayloadType, TrackedStatus } from '@/types';
import TopNavigationBar from '@/components/TopNavigationBar';
import CandidateSearchPanel from '@/components/CandidateSearchPanel';
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
  const [selectedToggle, setSelectedToggle] = useState<PayloadType>('new-registration');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [contactError, setContactError] = useState('');
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewCandidate, setReviewCandidate] = useState<string | null>(null);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isContactMail = selectedToggle === 'contact-mail';

  const toggleContact = (contactEmail: string) => {
    setSelectedContacts((contacts) =>
      contacts.includes(contactEmail)
        ? contacts.filter((contact) => contact !== contactEmail)
        : [...contacts, contactEmail]
    );
    setContactError('');
  };

  const handleAddContact = () => {
    const nextEmail = newContactEmail.trim();
    if (!nextEmail) {
      setContactError('Enter a contact email to add');
      return;
    }
    if (!validateEmail(nextEmail)) {
      setContactError('Enter a valid contact email');
      return;
    }
    if (settings.contactEmails.some((contact) => contact.toLowerCase() === nextEmail.toLowerCase())) {
      setContactError('Contact already exists');
      return;
    }

    updateSettings({
      ...settings,
      contactEmails: [...settings.contactEmails, nextEmail],
    });
    setSelectedContacts((contacts) => [...contacts, nextEmail]);
    setNewContactEmail('');
    setContactError('');
    showToast('Contact added to pool');
  };

  const startEditContact = (contactEmail: string) => {
    setEditingContact(contactEmail);
    setEditingValue(contactEmail);
    setContactError('');
  };

  const cancelEditContact = () => {
    setEditingContact(null);
    setEditingValue('');
  };

  const saveEditedContact = () => {
    if (!editingContact) return;
    const nextEmail = editingValue.trim();
    if (!nextEmail) {
      setContactError('Contact email cannot be empty');
      return;
    }
    if (!validateEmail(nextEmail)) {
      setContactError('Enter a valid contact email');
      return;
    }
    const duplicate = settings.contactEmails.some(
      (contact) => contact !== editingContact && contact.toLowerCase() === nextEmail.toLowerCase()
    );
    if (duplicate) {
      setContactError('Contact already exists');
      return;
    }

    updateSettings({
      ...settings,
      contactEmails: settings.contactEmails.map((contact) =>
        contact === editingContact ? nextEmail : contact
      ),
    });
    setSelectedContacts((contacts) =>
      contacts.map((contact) => contact === editingContact ? nextEmail : contact)
    );
    cancelEditContact();
    setContactError('');
    showToast('Contact updated');
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
    if (isContactMail && selectedContacts.length === 0) {
      setContactError('Select at least one contact to share');
      return;
    }
    setEmailError('');
    setContactError('');
    setIsSending(true);

    // Simulate async dispatch
    await new Promise((r) => setTimeout(r, 800));

    addTrackedCandidate({
      candidateId: `tc_${Date.now()}`,
      status: (isContactMail ? 'contacts-sent' : 'form-pending') as TrackedStatus,
      payloadType: selectedToggle,
      email: email.trim(),
      contactCount: isContactMail ? selectedContacts.length : undefined,
      timestamp: new Date().toISOString(),
    });

    showToast(
      isContactMail
        ? `${selectedContacts.length} Contacts successfully shared with ${email.trim()}`
        : `Form link dispatched to ${email.trim()}`
    );
    setEmail('');
    if (isContactMail) {
      setSelectedContacts([]);
    }
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
    <div className="min-h-screen bg-cc-base-deep pt-20">
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
          className="text-center font-sans text-[13px] text-cc-text-mid mb-6"
        >
          Enter an email to begin a workflow
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-10"
        >
          <CandidateSearchPanel />
        </motion.div>

        {/* Push Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="max-w-[800px] mx-auto"
        >
          <div className="bg-cc-base-surface border border-cc-gridline rounded p-5 shadow-inset-glow">
            {/* Email Input */}
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cc-text-mid" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="Enter candidate email address..."
                className={`w-full h-12 bg-cc-base-elevated border rounded pl-11 pr-4 font-sans text-[15px] text-cc-text-high placeholder:text-cc-text-mid focus:outline-none transition-colors ${emailError ? 'border-cc-danger' : 'border-cc-gridline focus:border-cc-warm-primary'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(); }}
                disabled={isSending}
              />
            </div>
            {emailError && <p className="mt-1.5 micro-text text-cc-danger">{emailError}</p>}

            <AnimatePresence initial={false}>
              {isContactMail && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded border border-[rgba(91,168,124,0.18)] bg-[rgba(91,168,124,0.06)] p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="section-header">LIVE CONTACT POOL</span>
                      <span className="micro-text text-cc-text-mid">
                        {selectedContacts.length} selected
                      </span>
                    </div>

                    <div className="space-y-2">
                      {settings.contactEmails.map((contactEmail) => {
                        const isChecked = selectedContacts.includes(contactEmail);
                        const isEditing = editingContact === contactEmail;

                        return (
                          <div
                            key={contactEmail}
                            role="checkbox"
                            aria-checked={isChecked}
                            tabIndex={isEditing || isSending ? -1 : 0}
                            onClick={() => { if (!isEditing && !isSending) toggleContact(contactEmail); }}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && !isEditing && !isSending) {
                                e.preventDefault();
                                toggleContact(contactEmail);
                              }
                            }}
                            className={`flex items-center gap-2 rounded border px-3 py-2 transition-all ${
                              isChecked
                                ? 'border-cc-green bg-[rgba(91,168,124,0.14)]'
                                : 'border-cc-gridline bg-cc-base-elevated hover:border-[rgba(91,168,124,0.45)] hover:bg-[rgba(91,168,124,0.08)]'
                            } ${isEditing || isSending ? '' : 'cursor-pointer'}`}
                          >
                            <div className={`h-5 w-5 flex-shrink-0 rounded-sm border inline-flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-cc-green border-cc-green text-white'
                                : 'bg-cc-base-surface border-cc-gridline text-transparent'
                            }`}>
                              <Check size={13} />
                            </div>

                            {isEditing ? (
                              <input
                                type="email"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') saveEditedContact();
                                  if (e.key === 'Escape') cancelEditContact();
                                }}
                                className="min-w-0 flex-1 h-8 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-cc-text-high">
                                {contactEmail}
                              </span>
                            )}

                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); saveEditedContact(); }}
                                  disabled={isSending}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded text-cc-green hover:bg-[rgba(91,168,124,0.12)] transition-colors"
                                  aria-label="Save contact"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); cancelEditContact(); }}
                                  disabled={isSending}
                                  className="h-7 w-7 inline-flex items-center justify-center rounded text-cc-text-mid hover:text-cc-danger hover:bg-[rgba(201,75,75,0.1)] transition-colors"
                                  aria-label="Cancel contact edit"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); startEditContact(contactEmail); }}
                                disabled={isSending}
                                className="h-7 w-7 inline-flex items-center justify-center rounded text-cc-text-mid hover:text-cc-warm-text hover:bg-[rgba(199,178,153,0.08)] transition-colors"
                                aria-label={`Edit ${contactEmail}`}
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="email"
                        value={newContactEmail}
                        onChange={(e) => { setNewContactEmail(e.target.value); setContactError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddContact(); }}
                        placeholder="Add contact email..."
                        disabled={isSending}
                        className="min-w-0 flex-1 h-10 bg-cc-base-elevated border border-cc-gridline rounded px-3 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-mid focus:border-cc-warm-primary focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddContact}
                        disabled={isSending}
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded bg-cc-green text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] hover:brightness-110 disabled:opacity-60 transition-all"
                      >
                        <Plus size={14} />
                        Add Contact
                      </button>
                    </div>
                    {contactError && <p className="mt-2 micro-text text-cc-danger">{contactError}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                          tc.status === 'bgv-submitted' ? '#5B8FBF' :
                          tc.status === 'contacts-sent' ? '#5BA87C' : '#5BA87C',
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
                      {tc.status === 'contacts-sent' && (
                        <>
                          <StatusBadge label="CONTACTS SENT" variant="green" />
                          <StatusBadge label={`${tc.contactCount || 0} ENCLOSED`} variant="neutral" />
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
