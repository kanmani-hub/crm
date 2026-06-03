import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, FileText, Shield, Send, ClipboardList, Clock, Pencil, Check, X, Plus, Download, Database, RefreshCw, CloudDownload } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { PayloadType, TrackedStatus } from '@/types';
import TopNavigationBar from '@/components/TopNavigationBar';
import CandidateSearchPanel from '@/components/CandidateSearchPanel';
import Toast from '@/components/Toast';
import ModalWindow from '@/components/ModalWindow';
import StatusBadge from '@/components/StatusBadge';
import { exportCandidatesToExcel, exportFinancialLedgerToExcel, exportAuditLogsToExcel } from '@/lib/exportUtils';
import { sheetsApi } from '@/services/sheetsApi';

const toggles: { type: PayloadType; label: string; icon: typeof FileText; color: string }[] = [
  { type: 'new-registration', label: 'NEW REG FORM', icon: FileText, color: '#B85C3D' },
  { type: 'bgv-form', label: 'BGV FORM', icon: Shield, color: '#5B8FBF' },
  { type: 'contact-mail', label: 'CONTACT MAIL', icon: Mail, color: '#5BA87C' },
];

export default function Dashboard() {
  const {
    candidates, auditLogs, trackedCandidates, settings,
    updateSettings, addTrackedCandidate, updateTrackedStatus, showToast,
    fetchInitialData, triggerSync,
    syncStatus, lastSyncTimestamp, lastSyncResult, dataSource,
  } = useStore();
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const submitToGoogleWindow = (toEmail: string, ccEmail: string, formType: string, formLink: string) => {
    if (!settings.gasWebAppUrl) {
      throw new Error('MISSING_GAS_URL');
    }

    const GAS_WINDOW_NAME = 'pycrm_google_send';
    const sendWindow = window.open('', GAS_WINDOW_NAME);
    
    if (!sendWindow) {
      throw new Error('POPUP_BLOCKED');
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = settings.gasWebAppUrl;
    form.target = GAS_WINDOW_NAME;
    form.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;';

    const addField = (key: string, value: string) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    };

    addField('to', toEmail);
    addField('cc', ccEmail);
    addField('formType', formType);
    addField('formLink', formLink);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (form.parentNode) form.remove();
    }, 1000);
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

    try {
      if (selectedToggle === 'new-registration') {
        const formLink = 'https://forms.gle/LfD5SxxYXDqFGMwn6';

        submitToGoogleWindow(
          email.trim(), 
          settings.hrCCEmail, 
          'Registration', 
          formLink
        );
        showToast('Google opened in new tab to dispatch mail.');
      } else if (selectedToggle === 'bgv-form') {
        const formLink = settings.googleSheetLinks.bgvResponses || 'https://forms.gle/LfD5SxxYXDqFGMwn6'; 

        submitToGoogleWindow(
          email.trim(), 
          settings.hrCCEmail, 
          'BGV', 
          formLink
        );
        showToast('Google opened in new tab to dispatch BGV mail.');
      } else {
        // Simulate async dispatch for other types
        await new Promise((r) => setTimeout(r, 800));
        showToast(
          isContactMail
            ? `${selectedContacts.length} Contacts successfully shared with ${email.trim()}`
            : `${selectedToggle} link dispatched to ${email.trim()}`
        );
      }

      addTrackedCandidate({
        candidateId: `tc_${Date.now()}`,
        status: (selectedToggle === 'bgv-form' ? 'bgv-submitted' : isContactMail ? 'contacts-sent' : 'form-pending') as TrackedStatus,
        payloadType: selectedToggle,
        email: email.trim(),
        contactCount: isContactMail ? selectedContacts.length : undefined,
        timestamp: new Date().toISOString(),
      });

      setEmail('');
      if (isContactMail) {
        setSelectedContacts([]);
      }
    } catch (err: any) {
      if (err.message === 'MISSING_GAS_URL') {
        showToast('Please configure Google Apps Script URL in Settings.', 'error');
      } else if (err.message === 'POPUP_BLOCKED') {
        showToast('Popup blocked. Please allow popups to send mail.', 'error');
      } else {
        showToast('Failed to dispatch mail.', 'error');
      }
    } finally {
      setIsSending(false);
    }
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

  const handleSyncGoogleSheet = async () => {
    // Use the registration Google Sheet URL from settings, or the form link
    const sheetUrl = settings.googleSheetLinks?.registrations || '';
    
    if (!sheetUrl) {
      showToast('Please configure the Google Sheet URL in Settings > Sheet Links > Registrations', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await sheetsApi.syncGoogleSheet(sheetUrl);
      if (result.imported > 0) {
        showToast(`Successfully synced ${result.imported} new candidate(s) from Google Sheets!`);
        // Refresh data
        await fetchInitialData();
      } else {
        showToast(`No new candidates to import (${result.total} total rows checked)`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync from Google Sheets', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const result = await triggerSync();
      if (result && result.synced > 0) {
        showToast(`Synced ${result.synced} new candidate${result.synced > 1 ? 's' : ''} from Google Form!`);
      } else if (result) {
        showToast('Data refreshed — no new entries found', 'info');
      } else {
        showToast('Data refreshed successfully');
      }
    } catch {
      showToast('Failed to refresh data', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      + ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

      <div className="max-w-[1360px] mx-auto px-4 lg:px-8 py-10">
        {/* Page Title & Subtitle */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-mono text-[clamp(1.75rem,3.5vw,2.5rem)] font-light leading-tight tracking-[-0.03em] text-cc-text-high"
          >
            COMMAND CENTER
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-sans text-[13px] text-cc-text-mid mt-2"
          >
            Enter an email to begin a workflow or search candidate profiles below.
          </motion.p>
          {/* Sync status strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cc-gridline bg-cc-base-surface"
          >
            {/* Source chip */}
            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              dataSource === 'gas' ? 'bg-cc-green' :
              dataSource === 'local' ? 'bg-cc-blue' : 'bg-cc-text-low'
            }`} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-cc-text-mid">
              {dataSource === 'gas' ? 'Live · Google Sheets' :
               dataSource === 'local' ? 'Local Server' : 'Demo Data'}
            </span>
            {lastSyncTimestamp && (
              <>
                <span className="text-cc-gridline">·</span>
                <span className="font-mono text-[10px] text-cc-text-low">
                  Last sync {formatSyncTime(lastSyncTimestamp)}
                </span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <span className="text-cc-gridline">·</span>
                <RefreshCw size={10} className="animate-spin text-cc-warm-text" />
                <span className="font-mono text-[10px] text-cc-warm-text">Syncing...</span>
              </>
            )}
          </motion.div>
        </div>

        {/* Global Prominent Search Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-8 w-full max-w-[1000px] mx-auto"
        >
          <CandidateSearchPanel />
        </motion.div>

        {/* Two-Column Widescreen Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10 items-start">
          {/* Main Action Console (Left Column) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Push Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cc-gridline/50">
                  <Send size={15} className="text-cc-warm-text" />
                  <span className="section-header">DISPATCH NEW WORKFLOW</span>
                </div>
                
                {/* Email Input */}
                <div className="relative mt-2">
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
                <div className="flex flex-wrap items-center gap-3 mt-5">
                  {toggles.map((t) => {
                    const Icon = t.icon;
                    const isActive = selectedToggle === t.type;
                    return (
                      <button
                        key={t.type}
                        onClick={() => setSelectedToggle(t.type)}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded font-mono text-[10px] font-medium tracking-[0.06em] uppercase transition-all duration-200"
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
                    className="flex items-center gap-2 h-10 px-8 bg-cc-warm-primary text-white font-mono text-[11px] font-semibold uppercase tracking-[0.08em] rounded hover:bg-cc-warm-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(184,92,61,0.25)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all"
                  >
                    <Send size={14} />
                    {isSending ? 'SENDING...' : 'SEND'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Data Export Center */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cc-gridline/50">
                  <Database size={15} className="text-cc-warm-text" />
                  <span className="section-header">DATA EXPORT CENTER</span>
                </div>

                <p className="font-sans text-[13px] text-cc-text-mid mb-4">
                  Download standard candidate roster, financial pipelines ledger, and system security audit trail as Excel spreadsheets.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      exportCandidatesToExcel(candidates);
                      showToast('Candidate roster Excel download started');
                    }}
                    className="flex items-center justify-center gap-2 h-10 px-4 bg-cc-base-elevated border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider text-cc-text-high hover:border-cc-warm-primary hover:text-cc-warm-primary transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    Export Candidates
                  </button>
                  <button
                    onClick={() => {
                      exportFinancialLedgerToExcel(candidates);
                      showToast('Financial ledger Excel download started');
                    }}
                    className="flex items-center justify-center gap-2 h-10 px-4 bg-cc-base-elevated border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider text-cc-text-high hover:border-cc-warm-primary hover:text-cc-warm-primary transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    Export Finances
                  </button>
                  <button
                    onClick={() => {
                      const getCandidateName = (id: string) => {
                        const c = candidates.find(cand => cand.id === id);
                        return c ? c.fullName : 'System / Unknown';
                      };
                      exportAuditLogsToExcel(auditLogs, getCandidateName);
                      showToast('Audit trail Excel download started');
                    }}
                    className="flex items-center justify-center gap-2 h-10 px-4 bg-cc-base-elevated border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider text-cc-text-high hover:border-cc-warm-primary hover:text-cc-warm-primary transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    Export Audit Logs
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Google Sheets Sync Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-cc-gridline/50">
                  <div className="flex items-center gap-2.5">
                    <CloudDownload size={15} className="text-cc-warm-text" />
                    <span className="section-header">GOOGLE SHEETS SYNC</span>
                  </div>
                  {/* Live sync status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono text-[9px] uppercase tracking-wider ${
                    syncStatus === 'syncing'  ? 'border-cc-gold/40 bg-cc-gold/10 text-cc-gold' :
                    syncStatus === 'success'  ? 'border-cc-green/40 bg-cc-green/10 text-cc-green' :
                    syncStatus === 'error'    ? 'border-cc-danger/40 bg-cc-danger/10 text-cc-danger' :
                    'border-cc-gridline bg-cc-base-elevated text-cc-text-low'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      syncStatus === 'syncing' ? 'bg-cc-gold animate-pulse' :
                      syncStatus === 'success' ? 'bg-cc-green' :
                      syncStatus === 'error'   ? 'bg-cc-danger' : 'bg-cc-text-low'
                    }`} />
                    {syncStatus === 'syncing' ? 'Syncing...' :
                     syncStatus === 'success' ? 'Synced' :
                     syncStatus === 'error'   ? 'Sync Error' : 'Idle'}
                  </span>
                </div>

                <p className="font-sans text-[13px] text-cc-text-mid mb-4">
                  Syncs new candidates from <strong className="text-cc-text-high">PyCRM_New_Joinee</strong> sheet into Master_Candidates automatically on load and every 30 seconds.
                </p>

                {/* Sync stats row */}
                {lastSyncResult && (
                  <div className="flex items-center gap-4 mb-4 p-3 rounded bg-cc-base-elevated border border-cc-gridline/50">
                    <div className="text-center">
                      <p className="font-mono text-base font-light text-cc-green">{lastSyncResult.synced}</p>
                      <p className="font-mono text-[9px] text-cc-text-low uppercase tracking-wider">New Added</p>
                    </div>
                    <div className="w-px h-8 bg-cc-gridline" />
                    <div className="text-center">
                      <p className="font-mono text-base font-light text-cc-text-mid">{lastSyncResult.skipped}</p>
                      <p className="font-mono text-[9px] text-cc-text-low uppercase tracking-wider">Duplicates</p>
                    </div>
                    <div className="w-px h-8 bg-cc-gridline" />
                    <div className="text-center">
                      <p className="font-mono text-base font-light text-cc-text-high">{lastSyncResult.total}</p>
                      <p className="font-mono text-[9px] text-cc-text-low uppercase tracking-wider">Total Rows</p>
                    </div>
                    {lastSyncTimestamp && (
                      <div className="ml-auto text-right">
                        <p className="font-mono text-[10px] text-cc-text-low">Last sync</p>
                        <p className="font-mono text-[10px] text-cc-text-mid">{formatSyncTime(lastSyncTimestamp)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSyncGoogleSheet}
                    disabled={isSyncing || syncStatus === 'syncing'}
                    className="flex items-center gap-2 h-10 px-6 bg-[#5B8FBF] text-white font-mono text-[10px] font-semibold uppercase tracking-wider rounded hover:brightness-110 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(91,143,191,0.25)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    <CloudDownload size={14} className={isSyncing ? 'animate-pulse' : ''} />
                    {isSyncing ? 'SYNCING...' : 'SYNC FROM SHEET URL'}
                  </button>

                  <button
                    onClick={handleRefreshData}
                    disabled={isRefreshing || syncStatus === 'syncing'}
                    className="flex items-center gap-2 h-10 px-4 bg-cc-base-elevated border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider text-cc-text-high hover:border-cc-warm-primary hover:text-cc-warm-primary disabled:opacity-60 transition-all cursor-pointer"
                  >
                    <RefreshCw size={13} className={isRefreshing || syncStatus === 'syncing' ? 'animate-spin' : ''} />
                    {isRefreshing ? 'SYNCING...' : 'SYNC & REFRESH'}
                  </button>
                </div>

                {dataSource === 'mock' && (
                  <p className="mt-3 micro-text text-cc-gold">
                    ⚠ Showing demo data. Configure GAS URL in Settings or check your Google Apps Script deployment.
                  </p>
                )}
                {dataSource === 'gas' && (
                  <p className="mt-3 micro-text text-cc-green">
                    ✓ Live data from Google Sheets · {candidates.length} candidates loaded
                  </p>
                )}
                {syncStatus === 'error' && dataSource !== 'mock' && (
                  <p className="mt-3 micro-text text-cc-danger">
                    ✕ Last sync failed. Check GAS deployment and network.
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Tracked Candidates (Right Sidebar Column) */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl flex flex-col backdrop-blur-md h-[468px]">
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-cc-gridline/50">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={15} className="text-cc-warm-text" />
                    <span className="section-header">TRACKED CANDIDATES</span>
                  </div>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-semibold ${trackedCandidates.length > 0 ? 'bg-cc-warm-primary text-white' : 'bg-cc-base-elevated-strong text-cc-text-low'}`}>
                    {trackedCandidates.length}
                  </span>
                </div>

                {/* List container scrollable */}
                <div className="flex-1 overflow-y-auto pr-1 -mr-2">
                  {trackedCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                      <ClipboardList size={40} className="text-cc-text-low mb-3 opacity-60" />
                      <p className="font-sans text-[13px] text-cc-text-mid">No tracked candidates</p>
                      <p className="micro-text text-cc-text-low mt-1">Enter an email above to start tracking</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {trackedCandidates.map((tc) => (
                          <motion.div
                            key={tc.candidateId}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            className="bg-cc-base-elevated border border-cc-gridline/50 rounded p-3 hover:border-cc-warm-primary/50 transition-all flex flex-col gap-2 relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-sans text-[13px] font-semibold text-cc-text-high truncate flex-1 leading-snug">
                                {tc.name || tc.email}
                              </p>
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                                style={{
                                  backgroundColor:
                                    tc.status === 'form-pending' ? '#C9A84C' :
                                    tc.status === 'bgv-submitted' ? '#5B8FBF' :
                                    tc.status === 'contacts-sent' ? '#5BA87C' : '#5BA87C',
                                }}
                              />
                            </div>
                            
                            {tc.name && (
                              <p className="micro-text text-cc-text-low truncate -mt-1 leading-none">
                                {tc.email}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 mt-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {tc.status === 'form-pending' && (
                                  <StatusBadge label="FORM PENDING" variant="amber" />
                                )}
                                {tc.status === 'bgv-submitted' && (
                                  <StatusBadge label="IN REVIEW" variant="blue" />
                                )}
                                {tc.status === 'contacts-sent' && (
                                  <>
                                    <StatusBadge label="SENT" variant="green" />
                                    <StatusBadge label={`${tc.contactCount || 0} ITEMS`} variant="neutral" />
                                  </>
                                )}
                                {tc.status === 'cleared' && (
                                  <StatusBadge label="CLEARED" variant="green" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {tc.status === 'bgv-submitted' && (
                                  <button
                                    onClick={() => handleReview(tc.candidateId)}
                                    className="px-2 py-0.5 bg-cc-blue text-white font-mono text-[9px] font-semibold uppercase rounded hover:brightness-110 transition-all cursor-pointer"
                                  >
                                    REVIEW
                                  </button>
                                )}
                                <div className="flex items-center gap-1 text-cc-text-low micro-text">
                                  <Clock size={10} />
                                  <span>{getRelativeTime(tc.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
