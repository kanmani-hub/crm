import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

import { useStore } from '@/store/useStore';
import { sheetsApi } from '@/services/sheetsApi';
import type { PipelineType, BGVStatus, DocumentStatus } from '@/types';
import TopNavigationBar from '@/components/TopNavigationBar';
import Toast from '@/components/Toast';
import InlinePencilEditor from '@/components/InlinePencilEditor';
import FinancialCard from '@/components/FinancialCard';
import DocumentVault from '@/components/DocumentVault';
import ChangesSidebar from '@/components/ChangesSidebar';
import EmploymentChip from '@/components/EmploymentChip';
import ModalWindow from '@/components/ModalWindow';

const pipelineTabs: { type: PipelineType; label: string; accent: string }[] = [
  { type: 'registration', label: 'REGISTRATION', accent: '#B85C3D' },
  { type: 'course', label: 'COURSE FEE', accent: '#C9A84C' },
  { type: 'document', label: 'DOCUMENT', accent: '#5BA87C' },
  { type: 'placement', label: 'PLACEMENT', accent: '#5B8FBF' },
];

const paymentTypes: { type: PipelineType; label: string }[] = [
  { type: 'registration', label: 'Registration Fee' },
  { type: 'course', label: 'Course Fee' },
  { type: 'document', label: 'Document Fee' },
  { type: 'placement', label: 'Placement Payment' },
];

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const {
    getCandidateById,
    updateCandidate,
    addPaymentRecord,
    showToast,
    settings,
    globalEditMode,
    toggleGlobalEdit,
    setActiveProfileId,
    loadPaymentsForCandidate,
    loadAuditLogs,
    isFetchingData,
    setPendingDocumentUpdate,
    clearPendingDocumentUpdate,
  } = useStore();
  const candidate = id ? getCandidateById(id) : undefined;

  useEffect(() => {
    if (id) {
      setActiveProfileId(id);
      // Wait for any pending data loads so that we don't overwrite empty state with fetched ledger data
      if (candidate && !isFetchingData) {
        loadPaymentsForCandidate(id);
      }
    }
    return () => setActiveProfileId(null);
  }, [id, setActiveProfileId, !!candidate, isFetchingData, loadPaymentsForCandidate]);

  const [activePipeline, setActivePipeline] = useState<PipelineType>('registration');
  const [newCompany, setNewCompany] = useState('');
  const [bgvConfirmOpen, setBgvConfirmOpen] = useState(false);
  const [pendingBgvValue, setPendingBgvValue] = useState<BGVStatus>('pending');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<PipelineType>('registration');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    setPaymentType(activePipeline);
  }, [activePipeline]);

  // Local optimistic state for Document Vault to prevent polling reverts
  const pendingDocsRef = useRef<Record<string, number>>({});
  const [localDocsReceived, setLocalDocsReceived] = useState<DocumentStatus | null>(null);
  const [localDocsApplied, setLocalDocsApplied] = useState<DocumentStatus | null>(null);

  // Sync local docs with global store unless a mutation is actively pending
  useEffect(() => {
    if (!candidate) return;
    setLocalDocsReceived(prev => {
      const next = { ...candidate.documentsReceived };
      if (prev) {
        for (const k in next) {
          if (pendingDocsRef.current[`recv_${k}`]) {
            next[k as keyof DocumentStatus] = prev[k as keyof DocumentStatus];
          }
        }
      }
      return next;
    });
    setLocalDocsApplied(prev => {
      const next = { ...candidate.documentsApplied };
      if (prev) {
        for (const k in next) {
          if (pendingDocsRef.current[`apply_${k}`]) {
            next[k as keyof DocumentStatus] = prev[k as keyof DocumentStatus];
          }
        }
      }
      return next;
    });
  }, [candidate?.documentsReceived, candidate?.documentsApplied]);

  if (!candidate) {
    return (
      <div className="min-h-screen bg-cc-base-deep pt-20 flex items-center justify-center">
        <TopNavigationBar />
        <div className="text-center">
          <p className="font-sans text-lg text-cc-text-mid">Candidate not found</p>
          <Link to="/" className="text-cc-warm-primary hover:underline mt-2 inline-block text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateField = (field: string, value: string) => {
    updateCandidate(candidate.id, { [field]: value });
    showToast('Saved to database');
    setTimeout(() => loadAuditLogs(), 2000);
  };

  const handleUpdateBgv = (value: string) => {
    const newStatus = value as BGVStatus;
    if (newStatus === 'cleared' && candidate.bgvStatus !== 'cleared') {
      setPendingBgvValue(newStatus);
      setBgvConfirmOpen(true);
      return;
    }
    updateCandidate(candidate.id, { bgvStatus: newStatus });
    showToast('BGV status updated');
  };

  const confirmBgvClearance = () => {
    updateCandidate(candidate.id, { bgvStatus: pendingBgvValue });
    showToast('BGV status updated');
    setBgvConfirmOpen(false);
    setTimeout(() => loadAuditLogs(), 2000);
  };

  const handleTogglePlaced = (value: string) => {
    const placed = value === 'YES';
    if (!placed) {
      updateCandidate(candidate.id, { placed: false, placedCompany: undefined });
    } else {
      updateCandidate(candidate.id, { placed: true });
    }
    showToast('Placement status updated');
    setTimeout(() => loadAuditLogs(), 2000);
  };

  const handleAddCompany = () => {
    if (!newCompany.trim()) return;
    updateCandidate(candidate.id, {
      pastEmployment: [...candidate.pastEmployment, newCompany.trim()],
    });
    setNewCompany('');
    showToast('Company added');
  };

  const handleRemoveCompany = (index: number) => {
    updateCandidate(candidate.id, {
      pastEmployment: candidate.pastEmployment.filter((_, i) => i !== index),
    });
    showToast('Company removed');
  };
  const handleToggleDocReceived = async (key: keyof DocumentStatus) => {
    if (!candidate || !localDocsReceived) return;
    
    // 1. Capture previous state and calculate complete new document object
    const previousState = localDocsReceived[key];
    const newState = !previousState;
    const nextDocumentsReceived = { ...candidate.documentsReceived, [key]: newState };
    const versionKey = `recv_${key}`;
    const currentVersion = (pendingDocsRef.current[versionKey] || 0) + 1;
    pendingDocsRef.current[versionKey] = currentVersion;

    // 2. Register pending update globally BEFORE backend API call
    setPendingDocumentUpdate(candidate.id, 'documentsReceived', nextDocumentsReceived);

    // 3. Immediately update local React state for instantaneous UI response
    setLocalDocsReceived(nextDocumentsReceived);
    
    // Also update global Zustand store directly to maintain consistency
    updateCandidate(candidate.id, {
      documentsReceived: nextDocumentsReceived,
    });

    try {
      // 4. Await backend API directly to guarantee it completes
      const response = await sheetsApi.updateCandidate(candidate.id, {
        documentsReceived: nextDocumentsReceived,
      });
      
      // If version hasn't changed (no rapid re-clicks), handle clearing
      if (pendingDocsRef.current[versionKey] === currentVersion) {
        // Compare the backend-confirmed document state against the optimistic pending state
        if (response?.candidate?.documentsReceived) {
           let backendDocsStr = typeof response.candidate.documentsReceived === 'string' ? response.candidate.documentsReceived : JSON.stringify(response.candidate.documentsReceived);
           let expectedStr = JSON.stringify(nextDocumentsReceived);
           // Very loose verification for safety
           if (backendDocsStr.includes(String(newState))) {
             clearPendingDocumentUpdate(candidate.id, 'documentsReceived');
           } else {
             console.warn('Backend confirmation mismatch, keeping lock for next poll to fix');
           }
        } else {
           clearPendingDocumentUpdate(candidate.id, 'documentsReceived');
        }
        delete pendingDocsRef.current[versionKey];
      }
    } catch (error) {
      console.error('Document update failed:', error);
      showToast('Failed to update document', 'error');
      
      // Rollback only if we are still the active mutation
      if (pendingDocsRef.current[versionKey] === currentVersion) {
        const revertDocsReceived = { ...candidate.documentsReceived, [key]: previousState };
        setLocalDocsReceived(revertDocsReceived);
        updateCandidate(candidate.id, { documentsReceived: revertDocsReceived });
        clearPendingDocumentUpdate(candidate.id, 'documentsReceived');
        delete pendingDocsRef.current[versionKey];
      }
    }
  };

  const handleToggleDocApplied = async (key: keyof DocumentStatus) => {
    if (!candidate || !localDocsApplied) return;
    
    const previousState = localDocsApplied[key];
    const newState = !previousState;
    const nextDocumentsApplied = { ...candidate.documentsApplied, [key]: newState };
    const versionKey = `apply_${key}`;
    const currentVersion = (pendingDocsRef.current[versionKey] || 0) + 1;
    pendingDocsRef.current[versionKey] = currentVersion;

    setPendingDocumentUpdate(candidate.id, 'documentsApplied', nextDocumentsApplied);
    setLocalDocsApplied(nextDocumentsApplied);
    
    updateCandidate(candidate.id, {
      documentsApplied: nextDocumentsApplied,
    });

    try {
      const response = await sheetsApi.updateCandidate(candidate.id, {
        documentsApplied: nextDocumentsApplied,
      });
      
      if (pendingDocsRef.current[versionKey] === currentVersion) {
        if (response?.candidate?.documentsApplied) {
           let backendDocsStr = typeof response.candidate.documentsApplied === 'string' ? response.candidate.documentsApplied : JSON.stringify(response.candidate.documentsApplied);
           if (backendDocsStr.includes(String(newState))) {
             clearPendingDocumentUpdate(candidate.id, 'documentsApplied');
           }
        } else {
           clearPendingDocumentUpdate(candidate.id, 'documentsApplied');
        }
        delete pendingDocsRef.current[versionKey];
      }
    } catch (error) {
      console.error('Document update failed:', error);
      showToast('Failed to update document', 'error');
      
      if (pendingDocsRef.current[versionKey] === currentVersion) {
        const revertDocsApplied = { ...candidate.documentsApplied, [key]: previousState };
        setLocalDocsApplied(revertDocsApplied);
        updateCandidate(candidate.id, { documentsApplied: revertDocsApplied });
        clearPendingDocumentUpdate(candidate.id, 'documentsApplied');
        delete pendingDocsRef.current[versionKey];
      }
    }
  };

  const handleSavePayment = async () => {
    setPaymentError('');
    
    if (!candidate.id || !candidate.fullName) {
      setPaymentError('Candidate details missing (ID or Name). Cannot save.');
      return;
    }
    if (!paymentType) {
      setPaymentError('Select a payment type');
      return;
    }
    const amount = Number(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      setPaymentError('Enter a valid payment amount > 0');
      return;
    }
    if (!paymentDate) {
      setPaymentError('Select a payment date');
      return;
    }

    const targetPipeline = candidate.financials.find((f) => f.pipelineType === paymentType);
    if (!targetPipeline) {
      setPaymentError('Payment bucket not found');
      return;
    }

    setIsSavingPayment(true);

    try {
      // Map pipelineType key → human-readable paymentType label for Payment_Records sheet
      const paymentTypeLabels: Record<string, string> = {
        registration: 'Registration',
        course: 'Course Fee',
        document: 'Document Fee',
        placement: 'Placement Fee',
      };
      const paymentTypeLabel = paymentTypeLabels[paymentType] || paymentType;

      const timestamp = new Date().toISOString();
      const typeLabel = paymentTypes.find((type) => type.type === paymentType)?.label || paymentTypeLabel;

      console.log('--- [STEP 1] CandidateProfile: Verifying Candidate Object ---');
      console.log('candidateId:', candidate.id);
      console.log('fullName:', candidate.fullName);
      console.log('email:', candidate.email);
      console.log('--------------------------------------------------------------');

      console.log('--- [STEP 2] CandidateProfile: Payload to be sent ---');
      console.log({
        action: 'addPayment',
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        paymentType: paymentTypeLabel,
        pipelineType: paymentType,
        amount,
        paymentDate,
        transactionRef: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined
      });
      console.log('-----------------------------------------------------');

      // Now addPaymentRecord will return a success/error object
      const result = await addPaymentRecord({
        id: `pay_${Date.now()}`,
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        paymentType: paymentTypeLabel,
        pipelineType: paymentType,
        amount,
        transactionRef: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
        remarks: paymentNotes.trim() || undefined,
        timestamp,
        createdAt: timestamp,
        paymentDate,
        userStamp: 'Python HR',
      });

      if (result && result.success === false) {
        setPaymentError(result.error || 'Failed to save payment');
        return;
      }

      setActivePipeline(paymentType);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      setPaymentError('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setShowPaymentForm(false);
      showToast(`Payment logged for ${typeLabel}`);

      // We no longer rely on a timeout; useStore's addPaymentRecord triggers real reload.
    } catch (err: any) {
      setPaymentError(err.message || 'An error occurred while saving the payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const activePipelineData = candidate.financials.find((f) => f.pipelineType === activePipeline);
  const activeTab = pipelineTabs.find((t) => t.type === activePipeline)!;

  const profileFields = [
    { label: 'Full Name', field: 'fullName', type: 'text' as const },
    { label: 'Phone Number', field: 'phone', type: 'text' as const },
    { label: 'Alt Contact', field: 'bgvAlternateContact', type: 'text' as const },
    { label: 'Date of Birth', field: 'bgvDob', type: 'date' as const },
    { label: 'Father Name', field: 'bgvFatherName', type: 'text' as const },
    { label: 'Address', field: 'bgvAddress', type: 'text' as const },
    { label: 'Pincode', field: 'bgvPincode', type: 'text' as const },
    { label: 'Branch', field: 'branch', type: 'select' as const, options: settings.branches },
    { label: 'Course', field: 'course', type: 'select' as const, options: settings.courses },
    { label: 'Date of Joining', field: 'dateOfJoining', type: 'date' as const },
    { label: 'Current Status', field: 'currentStatus', type: 'select' as const, options: ['active', 'inactive', 'completed'] },
  ];

  return (
    <div className="min-h-screen bg-cc-base-deep pt-20">
      <TopNavigationBar />
      <Toast />
      <ChangesSidebar />

      {/* BGV Confirm Modal */}
      <ModalWindow
        isOpen={bgvConfirmOpen}
        onClose={() => setBgvConfirmOpen(false)}
        title="Confirm BGV Clearance"
        footer={
          <>
            <button
              onClick={() => setBgvConfirmOpen(false)}
              className="px-5 py-2 font-mono text-[11px] font-medium uppercase tracking-wider border border-cc-gridline rounded text-cc-text-mid hover:text-cc-warm-text transition-colors"
            >
              CANCEL
            </button>
            <button
              onClick={confirmBgvClearance}
              className="px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider bg-cc-green text-white rounded hover:brightness-110 transition-all"
            >
              CONFIRM
            </button>
          </>
        }
      >
        <p>Confirm BGV clearance for <strong>{candidate.fullName}</strong>?</p>
        <p className="text-cc-text-mid mt-2 text-xs">This action cannot be undone.</p>
      </ModalWindow>

      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 micro-text text-cc-text-mid mb-4"
        >
          <Link to="/" className="hover:text-cc-warm-text transition-colors">Dashboard</Link>
          <span className="text-cc-text-low">/</span>
          <Link to="/" className="hover:text-cc-warm-text transition-colors">Dashboard</Link>
          <span className="text-cc-text-low">/</span>
          <span className="text-cc-text-high">{candidate.fullName}</span>
        </motion.div>

        {/* Master Status Badges + Global Edit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            {/* BGV Status */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-cc-text-mid">BGV:</span>
              <span className={`font-mono text-[13px] font-semibold px-3 py-1 rounded-sm ${
                candidate.bgvStatus === 'pending' ? 'bg-[rgba(201,168,76,0.1)] text-[#C9A84C]' :
                candidate.bgvStatus === 'submitted' ? 'bg-[rgba(91,143,191,0.1)] text-[#5B8FBF]' :
                'bg-[rgba(91,168,124,0.1)] text-[#5BA87C]'
              }`}>
                <InlinePencilEditor
                  value={candidate.bgvStatus === 'pending' ? 'PENDING' : candidate.bgvStatus === 'submitted' ? 'SUBMITTED' : 'CLEARED'}
                  onSave={(v) => handleUpdateBgv(v.toLowerCase().replace(' ', '-'))}
                  type="select"
                  options={['PENDING', 'SUBMITTED', 'CLEARED']}
                />
              </span>
            </div>

            {/* Placed */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-cc-text-mid">Placed:</span>
              <span className={`font-mono text-[13px] font-semibold px-3 py-1 rounded-sm ${
                candidate.placed ? 'bg-[rgba(91,168,124,0.1)] text-[#5BA87C]' : 'bg-cc-base-elevated-strong text-cc-text-low'
              }`}>
                <InlinePencilEditor
                  value={candidate.placed ? 'YES' : 'NO'}
                  onSave={handleTogglePlaced}
                  type="select"
                  options={['YES', 'NO']}
                />
              </span>
            </div>

            {/* Company */}
            {candidate.placed && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-cc-text-mid">Company:</span>
                <InlinePencilEditor
                  value={candidate.placedCompany || '--'}
                  onSave={(v) => {
                    updateCandidate(candidate.id, { placedCompany: v });
                    showToast('Company updated');
                  }}
                />
              </div>
            )}
          </div>

          {/* Global Edit Toggle */}
          <button
            onClick={toggleGlobalEdit}
            className={`px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded border transition-all ${
              globalEditMode
                ? 'bg-cc-green text-white border-cc-green'
                : 'bg-cc-base-elevated border-cc-gridline text-cc-text-mid hover:text-cc-text-high'
            }`}
          >
            {globalEditMode ? 'DONE EDITING' : 'GLOBAL EDIT'}
          </button>
        </motion.div>

        {/* Two Column Layout: Profile (60%) + Financial (40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left Column - Candidate Profile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Personal Details */}
            <div className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow">
              <h2 className="section-header mb-4">CANDIDATE PROFILE</h2>
              <div className="space-y-3">
                {profileFields.map((f) => (
                  <div key={f.field} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-cc-text-mid w-[140px] flex-shrink-0">
                      {f.label}
                    </span>
                    <InlinePencilEditor
                      value={(candidate as unknown as Record<string, string>)[f.field] || '--'}
                      onSave={(v) => handleUpdateField(f.field, v)}
                      type={f.type}
                      options={f.options}
                    />
                  </div>
                ))}
              </div>

              {/* Past Employment */}
              <div className="mt-6 pt-4 border-t border-cc-gridline">
                <h3 className="section-header">PAST EMPLOYMENT</h3>
                <p className="micro-text text-cc-text-low mt-1">Add previous companies as tags</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <AnimatePresence>
                    {candidate.pastEmployment.map((company, i) => (
                      <EmploymentChip
                        key={`${company}-${i}`}
                        company={company}
                        onRemove={() => handleRemoveCompany(i)}
                      />
                    ))}
                  </AnimatePresence>
                  <div className="relative">
                    <input
                      type="text"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCompany(); }}
                      onBlur={handleAddCompany}
                      placeholder="+ Add company..."
                      className="w-[140px] h-8 bg-cc-base-elevated border border-cc-gridline rounded px-2.5 font-mono text-xs text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Document Vault */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <DocumentVault
                received={localDocsReceived || candidate.documentsReceived}
                applied={localDocsApplied || candidate.documentsApplied}
                onToggleReceived={handleToggleDocReceived}
                onToggleApplied={handleToggleDocApplied}
              />
            </motion.div>

            {/* BGV Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-header">BACKGROUND VERIFICATION</h2>
                  <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.07em] px-2.5 py-1 rounded-sm ${
                    String(candidate.bgvStatus).trim().toLowerCase() === 'pending'
                      ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C]'
                      : String(candidate.bgvStatus).trim().toLowerCase() === 'submitted'
                        ? 'bg-[rgba(91,143,191,0.12)] text-[#5B8FBF]'
                        : 'bg-[rgba(91,168,124,0.12)] text-[#5BA87C]'
                  }`}>
                    {String(candidate.bgvStatus).trim().toLowerCase() === 'pending' ? 'PENDING' : String(candidate.bgvStatus).trim().toLowerCase() === 'submitted' ? 'SUBMITTED' : 'CLEARED'}
                  </span>
                </div>

                {(String(candidate.bgvStatus).trim().toLowerCase() === 'submitted' || String(candidate.bgvStatus).trim().toLowerCase() === 'cleared') && (candidate.bgvSubmittedAt) ? (
                  <div className="space-y-2.5">
                    {(() => {
                      const formatSafeDate = (val: string | undefined) => {
                        if (!val) return undefined;
                        try {
                          const d = new Date(val);
                          if (isNaN(d.getTime())) return val;
                          return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
                        } catch {
                          return val;
                        }
                      };
                      return [
                        { label: 'Submitted At', value: formatSafeDate(candidate.bgvSubmittedAt) },
                        { label: 'Course', value: candidate.bgvCourseName },
                        { label: 'Batch', value: candidate.bgvBatch },
                        { label: 'Document Amount', value: candidate.bgvDocumentAmount ? `₹${candidate.bgvDocumentAmount}` : undefined },
                      ].map(({ label, value }) => value ? (
                        <div key={label} className="flex items-start gap-2">
                          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-cc-text-mid w-[140px] flex-shrink-0 pt-0.5">
                            {label}
                          </span>
                          <span className="font-sans text-[13px] text-cc-text-high break-words">{value}</span>
                        </div>
                      ) : null);
                    })()}
                  </div>
                ) : (
                  <p className="font-sans text-[13px] text-cc-text-low">
                    {String(candidate.bgvStatus).trim().toLowerCase() === 'pending'
                      ? 'No BGV form submitted yet.'
                      : 'BGV data will appear here after the form is submitted and synced.'}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>


          {/* Right Column - Financial Management */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow sticky top-16">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="section-header">FINANCIAL MANAGEMENT</h2>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType(activePipeline);
                    setShowPaymentForm((open) => !open);
                    setPaymentError('');
                    setPaymentDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="inline-flex items-center gap-1.5 rounded bg-cc-base-elevated border border-cc-gridline px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-cc-warm-text hover:border-cc-warm-primary transition-colors"
                >
                  <Plus size={13} />
                  Add Payment
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showPaymentForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mb-5 rounded border border-[rgba(199,168,76,0.2)] bg-[rgba(201,168,76,0.06)] p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="micro-text text-cc-text-mid block mb-1">Payment Type</label>
                          <select
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value as PipelineType)}
                            className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
                          >
                            {paymentTypes.map((type) => (
                              <option key={type.type} value={type.type}>{type.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="micro-text text-cc-text-mid block mb-1">Amount</label>
                          <input
                            type="number"
                            min="0"
                            value={paymentAmount}
                            onChange={(e) => { setPaymentAmount(e.target.value); setPaymentError(''); }}
                            placeholder="0"
                            className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="micro-text text-cc-text-mid block mb-1">Payment Date</label>
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            disabled={isSavingPayment}
                            className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="micro-text text-cc-text-mid block mb-1">Transaction / Ref ID</label>
                          <input
                            type="text"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            disabled={isSavingPayment}
                            placeholder="TXN12345"
                            className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <label className="micro-text text-cc-text-mid block mb-1">Notes / Remarks</label>
                        <textarea
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          disabled={isSavingPayment}
                          placeholder="Paid via GPay - Batch 4"
                          rows={2}
                          className="w-full bg-cc-base-elevated border border-cc-gridline rounded px-2 py-1.5 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none resize-none"
                        />
                      </div>

                      {paymentError && <p className="mt-2 micro-text text-cc-danger">{paymentError}</p>}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={handleSavePayment}
                          disabled={isSavingPayment}
                          className="flex-1 h-9 bg-cc-green text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                          {isSavingPayment ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              SAVING...
                            </>
                          ) : 'Save Payment'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPaymentForm(false); setPaymentError(''); setPaymentDate(new Date().toISOString().split('T')[0]); }}
                          disabled={isSavingPayment}
                          className="h-9 px-3 border border-cc-gridline rounded font-mono text-[10px] uppercase tracking-[0.06em] text-cc-text-mid hover:text-cc-warm-text disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pipeline Tabs */}
              <div className="flex gap-0.5 border-b border-cc-gridline -mx-6 px-6 mb-5 overflow-x-auto">
                {pipelineTabs.map((tab) => (
                  <button
                    key={tab.type}
                    onClick={() => setActivePipeline(tab.type)}
                    className={`px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.06em] whitespace-nowrap border-b-2 transition-all ${
                      activePipeline === tab.type
                        ? 'text-cc-text-high bg-cc-base-elevated'
                        : 'text-cc-text-mid hover:text-cc-warm-text border-transparent'
                    }`}
                    style={{
                      borderBottomColor: activePipeline === tab.type ? tab.accent : 'transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Financial Card */}
              {activePipelineData && (
                <motion.div
                  key={activePipeline}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <FinancialCard
                    candidateId={candidate.id}
                    pipeline={activePipelineData}
                    accentColor={activeTab.accent}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
