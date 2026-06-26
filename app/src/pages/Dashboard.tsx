import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, FileText, Shield, Send, Pencil, Check, X, Plus, Download, Database, RefreshCw, Users, UserPlus, IndianRupee, FileCheck, Calendar, Activity, CheckCircle, Clock as ClockIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { PayloadType, TrackedStatus } from '@/types';
import TopNavigationBar from '@/components/TopNavigationBar';
import CandidateSearchPanel from '@/components/CandidateSearchPanel';
import Toast from '@/components/Toast';
import ModalWindow from '@/components/ModalWindow';
import { exportMultiSheetExcel, exportToExcel } from '@/lib/exportUtils';
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
    fetchInitialData, refreshDashboard, loadAuditLogs,
    syncStatus, lastSyncTimestamp, dataSource, isFetchingData, user, getCalculatedDashboardMetrics
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
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewCandidate, setReviewCandidate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportBackup = async (type: 'candidates' | 'finances' | 'audit' | 'registration' | 'bgv' | 'full') => {
    setIsExporting(true);
    showToast(`Generating backup. Please wait...`, 'info');
    try {
      const data = await sheetsApi.exportAllData();
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const suffix = `${yyyy}_${mm}`;
      
      switch (type) {
        case 'candidates':
          exportToExcel(data.candidates, `Candidates_${suffix}.xlsx`, 'Candidates');
          break;
        case 'finances':
          exportMultiSheetExcel({ Payment_Records: data.payments, Financial_Ledger: data.financials }, `Finances_${suffix}.xlsx`);
          break;
        case 'audit':
          exportToExcel(data.auditLogs, `AuditLogs_${suffix}.xlsx`, 'Audit_Logs');
          break;
        case 'bgv':
          exportToExcel(data.bgv, `BGV_Responses_${suffix}.xlsx`, 'BGV_Responses');
          break;
        case 'full':
          exportMultiSheetExcel({
            Master_Candidates: data.candidates,
            Registration_Responses: data.registrations,
            Payment_Records: data.payments,
            Financial_Ledger: data.financials,
            System_Audit_Logs: data.auditLogs,
            BGV_Responses: data.bgv
          }, `FullCRMBackup_${suffix}.xlsx`);
          break;
      }
      showToast('Backup downloaded successfully!');
    } catch (err) {
      showToast('Failed to generate backup.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Load candidates on mount (cached if within TTL)
  useEffect(() => {
    fetchInitialData();
    refreshDashboard();
  }, [fetchInitialData, refreshDashboard]);

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

    const formData = new URLSearchParams();
    formData.append('to', toEmail);
    formData.append('cc', ccEmail);
    formData.append('formType', formType);
    formData.append('formLink', formLink);

    // Using no-cors mode prevents the browser from blocking the request due to CORS
    // It silently sends the POST request to Google Apps Script in the background.
    fetch(settings.gasWebAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    }).catch(err => console.error("Error dispatching email:", err));
  };

  const handleSend = async () => {
    if (!isContactMail) {
      if (!email.trim()) {
        setEmailError('Please enter an email address');
        return;
      }
      if (!validateEmail(email)) {
        setEmailError('Please enter a valid email');
        return;
      }
    }
    
    if (isContactMail) {
      if (selectedContacts.length === 0) {
        setContactError('Select at least one contact to send mail to');
        return;
      }
      if (!contactSubject.trim() || !contactMessage.trim()) {
        setContactError('Subject and message are required for contact mail');
        return;
      }
    }

    setEmailError('');
    setContactError('');
    setIsSending(true);

    try {
      if (isContactMail) {
        // Send actual mail through backend for each contact
        for (const recipient of selectedContacts) {
          await sheetsApi.sendContactMail({
            recipient,
            subject: contactSubject,
            message: contactMessage,
            userStamp: user?.name || 'Python HR'
          });
        }
        
        showToast(`${selectedContacts.length} Contact mail(s) successfully sent`);
        
        addTrackedCandidate({
          candidateId: `tc_${Date.now()}`,
          status: 'contacts-sent',
          payloadType: 'contact-mail',
          email: selectedContacts.join(', '),
          contactCount: selectedContacts.length,
          timestamp: new Date().toISOString(),
        });
        
        // Refresh audit logs to show the new mail
        loadAuditLogs();

        setSelectedContacts([]);
        setContactSubject('');
        setContactMessage('');
      } else if (selectedToggle === 'new-registration') {
        const formLink = settings.googleSheetLinks.registrationForm || 'https://forms.gle/LfD5SxxYXDqFGMwn6';

        submitToGoogleWindow(
          email.trim(), 
          settings.hrCCEmail, 
          'Registration', 
          formLink
        );
        showToast('Registration link dispatched invisibly in the background.');
        
        addTrackedCandidate({
          candidateId: `tc_${Date.now()}`,
          status: 'form-pending',
          payloadType: 'new-registration',
          email: email.trim(),
          timestamp: new Date().toISOString(),
        });
        setEmail('');
      } else if (selectedToggle === 'bgv-form') {
        const formLink = settings.googleSheetLinks.bgvForm || 'https://forms.gle/LfD5SxxYXDqFGMwn6'; 

        submitToGoogleWindow(
          email.trim(), 
          settings.hrCCEmail, 
          'BGV', 
          formLink
        );
        showToast('BGV link dispatched invisibly in the background.');
        
        addTrackedCandidate({
          candidateId: `tc_${Date.now()}`,
          status: 'bgv-submitted',
          payloadType: 'bgv-form',
          email: email.trim(),
          timestamp: new Date().toISOString(),
        });
        setEmail('');
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
              onClick={() => {
                if (reviewCandidate) {
                  updateTrackedStatus(reviewCandidate, 'cleared');
                  showToast('BGV request dispatched');
                }
                setReviewModalOpen(false);
                setReviewCandidate(null);
              }}
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
            {syncStatus === 'syncing' ? (
              <>
                <span className="text-cc-gridline">·</span>
                <RefreshCw size={10} className="animate-spin text-cc-warm-text" />
                <span className="font-mono text-[10px] text-cc-warm-text">Syncing...</span>
              </>
            ) : (
              <>
                <span className="text-cc-gridline">·</span>
                <button 
                  onClick={() => { fetchInitialData(true); refreshDashboard(true); }}
                  className="font-mono text-[10px] text-cc-text-mid hover:text-cc-warm-text flex items-center gap-1 transition-colors"
                  title="Manual Refresh"
                >
                  <RefreshCw size={10} />
                  Refresh
                </button>
              </>
            )}
          </motion.div>
        </div>

        {/* 10 KPI CARDS */}
        {(() => {
           const metrics = getCalculatedDashboardMetrics();
           return (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.1 }}
               className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-[1360px] mx-auto"
             >
               {[
                 { label: 'Total Candidates', value: metrics.totalCandidates, icon: Users, color: 'text-cc-blue' },
                 { label: 'New Joinees', value: metrics.newJoinees, icon: UserPlus, color: 'text-cc-green' },
                 { label: 'Placed Candidates', value: metrics.placedCount, icon: CheckCircle, color: 'text-cc-green' },
                 { label: 'Revenue Received', value: `₹${(metrics.revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-cc-text-high' },
                 { label: 'Pending Dues', value: `₹${(metrics.pendingDues || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-cc-danger' },
               ].map((kpi, idx) => {
                 const Icon = kpi.icon;
              return (
                <div key={idx} className="bg-cc-base-elevated border border-cc-gridline rounded-md p-4 flex items-center gap-3 hover:border-cc-warm-primary transition-colors">
                  <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-cc-base-surface border border-cc-gridline/50`}>
                    <Icon size={16} className={kpi.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="micro-text text-cc-text-mid truncate leading-none uppercase">{kpi.label}</p>
                    <p className="text-xl font-mono text-cc-text-high mt-1.5 leading-none">{kpi.value}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
          );
        })()}

        {/* Global Prominent Search Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-4 w-full max-w-[1000px] mx-auto"
        >
          <CandidateSearchPanel />
          {/* Candidate load status strip */}
          <div className="mt-2 flex items-center gap-3 px-1">
            {isFetchingData ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-cc-warm-text">
                <RefreshCw size={10} className="animate-spin" />
                Loading candidates from Google Sheets...
              </span>
            ) : candidates.length === 0 ? (
              <>
                <span className="font-mono text-[10px] text-cc-danger">
                  ⚠ No candidates loaded — check GAS URL in Settings
                </span>
                <button
                  onClick={() => fetchInitialData()}
                  className="font-mono text-[10px] text-cc-warm-text underline hover:no-underline"
                >
                  Retry
                </button>
              </>
            ) : (
              <span className="font-mono text-[10px] text-cc-text-low">
                {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} loaded
              </span>
            )}
          </div>
        </motion.div>

        {/* Single-Column Dashboard Layout */}
        <div className="w-full max-w-[1000px] mx-auto mt-10">
          {/* Main Action Console */}
          <div className="w-full space-y-8">
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
                
                {/* Email Input (hidden for Contact Mail) */}
                {!isContactMail && (
                  <>
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
                  </>
                )}

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
                        
                        <div className="mt-4 pt-4 border-t border-[rgba(91,168,124,0.18)]">
                           <div className="space-y-3">
                              <div>
                                <input
                                  type="text"
                                  value={contactSubject}
                                  onChange={(e) => { setContactSubject(e.target.value); setContactError(''); }}
                                  placeholder="Subject..."
                                  disabled={isSending}
                                  className="w-full h-10 bg-cc-base-elevated border border-cc-gridline rounded px-3 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-mid focus:border-cc-warm-primary focus:outline-none transition-colors"
                                />
                              </div>
                              <div>
                                <textarea
                                  value={contactMessage}
                                  onChange={(e) => { setContactMessage(e.target.value); setContactError(''); }}
                                  placeholder="Message..."
                                  disabled={isSending}
                                  className="w-full h-24 resize-none bg-cc-base-elevated border border-cc-gridline rounded p-3 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-mid focus:border-cc-warm-primary focus:outline-none transition-colors"
                                />
                              </div>
                           </div>
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

            {/* Backup Center */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cc-gridline/50">
                  <Database size={15} className="text-cc-warm-text" />
                  <span className="section-header">BACKUP CENTER</span>
                </div>

                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Candidates */}
                  <div className="bg-cc-base-elevated border border-cc-gridline rounded p-4">
                    <h3 className="font-mono text-[13px] text-cc-text-high mb-2">Candidates</h3>
                    <p className="font-sans text-[12px] text-cc-text-mid mb-4">Export all candidate profiles.</p>
                    <button
                      onClick={() => handleExportBackup('candidates')}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-cc-base-surface text-cc-text-high border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider hover:bg-cc-gridline disabled:opacity-50 transition-all"
                    >
                      <Users size={13} /> Export Candidates
                    </button>
                  </div>

                  {/* Export Finances */}
                  <div className="bg-cc-base-elevated border border-cc-gridline rounded p-4">
                    <h3 className="font-mono text-[13px] text-cc-text-high mb-2">Finances</h3>
                    <p className="font-sans text-[12px] text-cc-text-mid mb-4">Export payment records & ledger.</p>
                    <button
                      onClick={() => handleExportBackup('finances')}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-cc-base-surface text-cc-text-high border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider hover:bg-cc-gridline disabled:opacity-50 transition-all"
                    >
                      <IndianRupee size={13} /> Export Finances
                    </button>
                  </div>

                  {/* Export Audit Logs */}
                  <div className="bg-cc-base-elevated border border-cc-gridline rounded p-4">
                    <h3 className="font-mono text-[13px] text-cc-text-high mb-2">Audit Logs</h3>
                    <p className="font-sans text-[12px] text-cc-text-mid mb-4">Export system audit trails.</p>
                    <button
                      onClick={() => handleExportBackup('audit')}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-cc-base-surface text-cc-text-high border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider hover:bg-cc-gridline disabled:opacity-50 transition-all"
                    >
                      <Activity size={13} /> Export Audit Logs
                    </button>
                  </div>


                  {/* Export Full CRM Backup */}
                  <div className="md:col-span-2 bg-cc-base-elevated border border-cc-gridline rounded p-4 border-l-4 border-l-cc-warm-primary">
                    <h3 className="font-mono text-[13px] text-cc-text-high mb-2">Full CRM Backup</h3>
                    <p className="font-sans text-[12px] text-cc-text-mid mb-4">Complete backup of all sheets.</p>
                    <button
                      onClick={() => handleExportBackup('full')}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-cc-warm-primary text-white rounded font-mono text-[10px] font-semibold uppercase tracking-wider hover:bg-cc-warm-primary-hover disabled:opacity-50 transition-all"
                    >
                      <Database size={13} /> Export Full CRM Backup
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Change Log Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cc-gridline/50">
                  <Activity size={15} className="text-cc-warm-text" />
                  <span className="section-header">SYSTEM CHANGE LOG</span>
                </div>
                
                <div className="overflow-x-auto">
                  {auditLogs && auditLogs.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-cc-gridline">
                          <th className="py-2 px-3 font-mono text-[10px] font-semibold uppercase text-cc-text-mid">Date & Time</th>
                          <th className="py-2 px-3 font-mono text-[10px] font-semibold uppercase text-cc-text-mid">Candidate</th>
                          <th className="py-2 px-3 font-mono text-[10px] font-semibold uppercase text-cc-text-mid">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.slice(0, 15).map((log) => {
                          const dt = new Date(log.timestamp);
                          const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                          const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                          // Check if description has "Candidate Updated" or if we have candidateId to map name
                          let candidateName = '-';
                          const candidate = candidates.find(c => c.id === log.candidateId);
                          if (candidate) candidateName = candidate.fullName;
                          else if (log.candidateId === 'N/A') candidateName = log.reason || log.description.split(' ')[0] || '-'; // Hack for contact mail where candidate is N/A
                          
                          return (
                            <tr key={log.id} className="border-b border-cc-gridline/50 hover:bg-cc-base-elevated transition-colors">
                              <td className="py-2 px-3 font-sans text-[12px] text-cc-text-mid whitespace-nowrap">
                                <span className="text-cc-text-high">{dateStr}</span> <span className="text-cc-text-low text-[11px]">{timeStr}</span>
                              </td>
                              <td className="py-2 px-3 font-sans text-[13px] font-medium text-cc-text-high">{candidateName}</td>
                              <td className="py-2 px-3 font-sans text-[13px] text-cc-text-mid">{log.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center border rounded border-cc-gridline border-dashed">
                      <p className="font-sans text-[13px] text-cc-text-mid">No system changes recorded yet.</p>
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
