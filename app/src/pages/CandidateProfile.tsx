import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

import { useStore } from '@/store/useStore';
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
    updateFinancialPipeline,
    addPaymentRecord,
    addAuditLog,
    showToast,
    settings,
    globalEditMode,
    toggleGlobalEdit,
    setActiveProfileId,
  } = useStore();
  const candidate = id ? getCandidateById(id) : undefined;

  useEffect(() => {
    if (id) setActiveProfileId(id);
    return () => setActiveProfileId(null);
  }, [id, setActiveProfileId]);

  const [activePipeline, setActivePipeline] = useState<PipelineType>('registration');
  const [newCompany, setNewCompany] = useState('');
  const [bgvConfirmOpen, setBgvConfirmOpen] = useState(false);
  const [pendingBgvValue, setPendingBgvValue] = useState<BGVStatus>('pending');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState<PipelineType>('registration');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

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
  };

  const handleTogglePlaced = (value: string) => {
    const placed = value === 'YES';
    if (!placed) {
      updateCandidate(candidate.id, { placed: false, placedCompany: undefined });
    } else {
      updateCandidate(candidate.id, { placed: true });
    }
    showToast('Placement status updated');
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

  const handleToggleDocReceived = (key: keyof DocumentStatus) => {
    updateCandidate(candidate.id, {
      documentsReceived: { ...candidate.documentsReceived, [key]: !candidate.documentsReceived[key] },
    });
    showToast('Document updated');
  };

  const handleToggleDocApplied = (key: keyof DocumentStatus) => {
    updateCandidate(candidate.id, {
      documentsApplied: { ...candidate.documentsApplied, [key]: !candidate.documentsApplied[key] },
    });
    showToast('Document updated');
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

  const handleSavePayment = () => {
    const amount = Number(paymentAmount);
    if (!paymentType) {
      setPaymentError('Select a payment type');
      return;
    }
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      setPaymentError('Enter a valid payment amount');
      return;
    }

    const targetPipeline = candidate.financials.find((f) => f.pipelineType === paymentType);
    if (!targetPipeline) {
      setPaymentError('Payment bucket not found');
      return;
    }

    const timestamp = new Date().toISOString();
    const typeLabel = paymentTypes.find((type) => type.type === paymentType)?.label || paymentType;
    updateFinancialPipeline(candidate.id, paymentType, {
      paidToDate: targetPipeline.paidToDate + amount,
    });
    addPaymentRecord({
      id: `pay_${Date.now()}`,
      candidateId: candidate.id,
      pipelineType: paymentType,
      amount,
      transactionRef: paymentRef.trim() || undefined,
      notes: paymentNotes.trim() || undefined,
      timestamp,
      userStamp: 'Python HR',
    });
    addAuditLog({
      id: `log_${Date.now()}`,
      candidateId: candidate.id,
      logType: 'financial',
      description: `Python HR logged a payment of ${formatCurrency(amount)} for ${typeLabel}.${paymentRef.trim() ? ` (Ref: ${paymentRef.trim()})` : ''}`,
      reason: paymentNotes.trim() || undefined,
      userStamp: 'Python HR',
      timestamp,
    });

    setActivePipeline(paymentType);
    setPaymentAmount('');
    setPaymentRef('');
    setPaymentNotes('');
    setPaymentError('');
    setShowPaymentForm(false);
    showToast(`Payment logged for ${typeLabel}`);
  };

  const activePipelineData = candidate.financials.find((f) => f.pipelineType === activePipeline);
  const activeTab = pipelineTabs.find((t) => t.type === activePipeline)!;

  const profileFields = [
    { label: 'Full Name', field: 'fullName', type: 'text' as const },
    { label: 'Email Address', field: 'email', type: 'text' as const },
    { label: 'Phone Number', field: 'phone', type: 'text' as const },
    { label: 'Date of Birth', field: 'dateOfBirth', type: 'date' as const },
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
                candidate.bgvStatus === 'in-review' ? 'bg-[rgba(91,143,191,0.1)] text-[#5B8FBF]' :
                'bg-[rgba(91,168,124,0.1)] text-[#5BA87C]'
              }`}>
                <InlinePencilEditor
                  value={candidate.bgvStatus === 'pending' ? 'PENDING' : candidate.bgvStatus === 'in-review' ? 'IN REVIEW' : 'CLEARED'}
                  onSave={(v) => handleUpdateBgv(v.toLowerCase().replace(' ', '-'))}
                  type="select"
                  options={['PENDING', 'IN REVIEW', 'CLEARED']}
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
                {/* Address */}
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-cc-text-mid w-[140px] flex-shrink-0 pt-0.5">
                    Address
                  </span>
                  <InlinePencilEditor
                    value={candidate.address || '--'}
                    onSave={(v) => handleUpdateField('address', v)}
                  />
                </div>
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
                received={candidate.documentsReceived}
                applied={candidate.documentsApplied}
                onToggleReceived={handleToggleDocReceived}
                onToggleApplied={handleToggleDocApplied}
              />
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

                      <div className="mt-2">
                        <label className="micro-text text-cc-text-mid block mb-1">Transaction / Ref ID</label>
                        <input
                          type="text"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder="TXN12345"
                          className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none"
                        />
                      </div>

                      <div className="mt-2">
                        <label className="micro-text text-cc-text-mid block mb-1">Notes / Remarks</label>
                        <textarea
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
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
                          className="flex-1 h-9 bg-cc-green text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded hover:brightness-110 transition-all"
                        >
                          Save Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPaymentForm(false); setPaymentError(''); }}
                          className="h-9 px-3 border border-cc-gridline rounded font-mono text-[10px] uppercase tracking-[0.06em] text-cc-text-mid hover:text-cc-warm-text transition-colors"
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
