import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import { useDPStore } from '@/store/useDPStore';
import type { DPBGVStatus } from '@/types/dp';
import TopNavigationBar from '@/components/TopNavigationBar';
import Toast from '@/components/Toast';
import InlinePencilEditor from '@/components/InlinePencilEditor';
import FinancialCard from '@/components/FinancialCard';
import DocumentVault from '@/components/DocumentVault';
import ChangesSidebar from '@/components/ChangesSidebar';
import ModalWindow from '@/components/ModalWindow';
import PaymentModal from '@/components/PaymentModal';

const pipelineTabs = [
  { type: 'registration', label: 'REGISTRATION', accent: '#B85C3D' },
  { type: 'course', label: 'COURSE FEE', accent: '#C9A84C' },
  { type: 'document', label: 'DOCUMENT', accent: '#5BA87C' },
  { type: 'placement', label: 'PLACEMENT', accent: '#5B8FBF' },
];

export default function DPCandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const {
    candidates,
    updateCandidate,
    showToast,
    globalEditMode,
    toggleGlobalEdit,
    setActiveProfileId,
    loadPaymentsForCandidate,
    loadAuditLogs,
    isFetchingData,
    toggleDocumentStatus,
    uploadDocument,
    deleteDocument,
    fetchInitialData,
  } = useDPStore();
  
  const candidate = candidates.find(c => c.placementId === id);

  useEffect(() => {
    if (id) {
      setActiveProfileId(id);
      if (candidate && !isFetchingData) {
        loadPaymentsForCandidate(id);
      }
    }
    return () => setActiveProfileId(null);
  }, [id, setActiveProfileId, !!candidate, isFetchingData, loadPaymentsForCandidate]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchInitialData(true, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchInitialData]);

  const [activePipeline, setActivePipeline] = useState('registration');
  const [bgvConfirmOpen, setBgvConfirmOpen] = useState(false);
  const [pendingBgvValue, setPendingBgvValue] = useState<DPBGVStatus>('pending');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  if (!candidate) {
    return (
      <div className="min-h-screen bg-cc-base-deep pt-20 flex items-center justify-center">
        <TopNavigationBar />
        <div className="text-center">
          <p className="font-sans text-lg text-cc-text-mid">Candidate not found</p>
          <Link to="/dp" className="text-cc-warm-primary hover:underline mt-2 inline-block text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateField = async (field: keyof typeof candidate, value: any) => {
    if (!candidate) return;
    try {
      await updateCandidate(candidate.placementId, { [field]: value });
      showToast('Field updated successfully');
      loadAuditLogs(candidate.placementId);
    } catch (e) {
      showToast('Error updating field');
    }
  };

  const handleUpdateBgv = (value: string) => {
    const newStatus = value as DPBGVStatus;
    if (newStatus === 'cleared' && normalizedBGVStatus !== 'CLEARED') {
      setPendingBgvValue(newStatus);
      setBgvConfirmOpen(true);
      return;
    }
    handleUpdateField('bgvStatus', newStatus);
  };

  const confirmBgvClearance = async () => {
    if (!candidate) return;
    try {
      await updateCandidate(candidate.placementId, { bgvStatus: pendingBgvValue });
      showToast(`BGV Status updated to ${pendingBgvValue}`);
      setBgvConfirmOpen(false);
      loadAuditLogs(candidate.placementId);
    } catch (e) {
      showToast('Error updating BGV Status');
    }
  };

  const handleTogglePlaced = (value: string) => {
    const placed = value === 'YES';
    if (!placed) {
      handleUpdateField('candidateStatus', 'active');
    } else {
      handleUpdateField('candidateStatus', 'completed');
    }
  };

  const handleToggleDocReceived = async (key: any) => {
    let actualKey = key;
    if (key === 'appraisals') actualKey = 'pfServiceHistory';
    if (key === 'payslips') actualKey = 'payslip';
    
    const currentVal = Boolean(candidate[actualKey as keyof typeof candidate]);
    const newStatus = !currentVal;
    
    try {
      await toggleDocumentStatus(candidate.placementId, actualKey, newStatus, 'System');
    } catch (error) {
      console.error('Failed to update DP document status:', error);
    }
  };

  const handleUploadDoc = async (key: any, file: File) => {
    let actualKey = key;
    if (key === 'appraisals') actualKey = 'pfServiceHistory';
    if (key === 'payslips') actualKey = 'payslip';
    try {
      await uploadDocument(candidate.placementId, actualKey, file, 'System');
    } catch (error) {
      console.error('Failed to upload DP document:', error);
    }
  };

  const handleDeleteDoc = async (key: any) => {
    let actualKey = key;
    if (key === 'appraisals') actualKey = 'pfServiceHistory';
    if (key === 'payslips') actualKey = 'payslip';
    try {
      await deleteDocument(candidate.placementId, actualKey, 'System');
    } catch (error) {
      console.error('Failed to delete DP document:', error);
    }
  };

  const activePipelineData = candidate.financials?.find((f) => f.pipelineType === activePipeline);
  const activeTab = pipelineTabs.find((t) => t.type === activePipeline)!;
  const normalizedBGVStatus = String(candidate.bgvStatus || "PENDING").trim().toUpperCase();

  const profileFields = [
    { label: 'Full Name', field: 'fullName', type: 'text' as const },
    { label: 'Mobile Number', field: 'mobileNumber', type: 'text' as const },
    { label: 'Alt Contact', field: 'alternateContact', type: 'text' as const },
    { label: 'Date of Birth', field: 'dateOfBirth', type: 'date' as const },
    { label: 'Father Name', field: 'fatherName', type: 'text' as const },
    { label: 'Address', field: 'address', type: 'text' as const },
    { label: 'Pincode', field: 'pincode', type: 'text' as const },
    { label: 'Year of Passing', field: 'yearOfPassing', type: 'text' as const },
    { label: 'Experience Type', field: 'experienceType', type: 'select' as const, options: ['fresher', 'experienced'] },
    { label: 'Current Working', field: 'currentlyWorking', type: 'select' as const, options: ['yes', 'no'] },
    { label: 'Company Name', field: 'companyName', type: 'text' as const },
    { label: 'Designation', field: 'designation', type: 'text' as const },
    { label: 'CTC', field: 'ctc', type: 'text' as const },
  ];

  const docs = candidate.documents || { offerLetterUrl: '', relievingLetterUrl: '', pfServiceHistoryUrl: '', payslipUrl: '' };
  const isTruthy = (val: any) => val === true || val === 'TRUE' || val === 'true';

  const receivedCompat = {
    offerLetter: isTruthy(candidate.offerLetter),
    appraisals: isTruthy(candidate.pfServiceHistory),
    payslips: isTruthy(candidate.payslip),
    relievingLetter: isTruthy(candidate.relievingLetter),
    counterOffer: false
  };
  
  const fileUrls = {
    offerLetter: (docs as any).offerLetterUrl,
    appraisals: (docs as any).pfServiceHistoryUrl,
    payslips: (docs as any).payslipUrl,
    relievingLetter: (docs as any).relievingLetterUrl,
  };

  return (
    <div className="min-h-screen bg-cc-base-deep pt-20">
      <TopNavigationBar />
      <Toast />
      <ChangesSidebar mode="dp" />

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
          <Link to="/dp" className="hover:text-cc-warm-text transition-colors">Direct Placement Dashboard</Link>
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
                normalizedBGVStatus === 'PENDING' ? 'bg-[rgba(201,168,76,0.1)] text-[#C9A84C]' :
                normalizedBGVStatus === 'SUBMITTED' ? 'bg-[rgba(91,143,191,0.1)] text-[#5B8FBF]' :
                normalizedBGVStatus === 'REJECTED' ? 'bg-[rgba(235,87,87,0.1)] text-[#EB5757]' :
                'bg-[rgba(91,168,124,0.1)] text-[#5BA87C]'
              }`}>
                <InlinePencilEditor
                  value={normalizedBGVStatus}
                  onSave={(v) => handleUpdateBgv(v.toLowerCase().replace(' ', '-'))}
                  type="select"
                  options={['PENDING', 'SUBMITTED', 'CLEARED', 'REJECTED']}
                />
              </span>
            </div>

            {/* Placed */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-cc-text-mid">Placed:</span>
              <span className={`font-mono text-[13px] font-semibold px-3 py-1 rounded-sm ${
                candidate.candidateStatus === 'completed' ? 'bg-[rgba(91,168,124,0.1)] text-[#5BA87C]' : 'bg-cc-base-elevated-strong text-cc-text-low'
              }`}>
                <InlinePencilEditor
                  value={candidate.candidateStatus === 'completed' ? 'YES' : 'NO'}
                  onSave={handleTogglePlaced}
                  type="select"
                  options={['YES', 'NO']}
                />
              </span>
            </div>
            
            {/* Placement ID */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-medium text-cc-text-mid">Placement ID:</span>
              <span className="font-mono text-[13px] font-semibold px-3 py-1 rounded-sm bg-cc-base-elevated-strong text-cc-text-high">
                {candidate.placementId}
              </span>
            </div>
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
                      onSave={(v) => handleUpdateField(f.field as any, v)}
                      type={f.type}
                      options={f.options}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Document Vault */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <DocumentVault
                mode="dp"
                received={receivedCompat as any}
                applied={{ offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false } as any}
                onToggleReceived={handleToggleDocReceived}
                onToggleApplied={() => {}}
                fileUrls={fileUrls as any}
                onUpload={handleUploadDoc}
                onDelete={handleDeleteDoc}
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const BGV_FORM_URL = ""; // TODO: Add BGV Form URL here
                        const PLACEMENT_ID_ENTRY_ID = ""; // TODO: Add Entry ID here
                        if (!BGV_FORM_URL || !PLACEMENT_ID_ENTRY_ID) {
                          alert("BGV Form URL is not configured yet.");
                          return;
                        }
                        const prefilledUrl = `${BGV_FORM_URL}?usp=pp_url&entry.${PLACEMENT_ID_ENTRY_ID}=${encodeURIComponent(candidate?.placementId || '')}`;
                        window.open(prefilledUrl, '_blank');
                      }}
                      className="px-3 py-1 bg-cc-brand text-black font-sans text-xs font-semibold rounded hover:bg-white transition-colors"
                    >
                      Send BGV Form
                    </button>
                    <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.07em] px-2.5 py-1 rounded-sm ${
                      normalizedBGVStatus === 'PENDING'
                        ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C]'
                        : normalizedBGVStatus === 'SUBMITTED'
                          ? 'bg-[rgba(91,143,191,0.12)] text-[#5B8FBF]'
                          : normalizedBGVStatus === 'REJECTED'
                            ? 'bg-[rgba(235,87,87,0.12)] text-[#EB5757]'
                            : 'bg-[rgba(91,168,124,0.12)] text-[#5BA87C]'
                    }`}>
                      {normalizedBGVStatus}
                    </span>
                  </div>
                </div>

                {(normalizedBGVStatus === 'SUBMITTED' || normalizedBGVStatus === 'CLEARED' || normalizedBGVStatus === 'REJECTED') ? (
                  <div className="space-y-2.5">
                    {[
                      { label: 'Submitted At', value: candidate.bgvSubmittedAt },
                      { label: 'Date of Birth', value: candidate.dateOfBirth },
                      { label: 'Gender', value: candidate.gender },
                      { label: 'Father Name', value: candidate.fatherName },
                      { label: 'Mother Name', value: candidate.motherName },
                      { label: 'Aadhaar', value: candidate.aadhaar },
                      { label: 'PAN', value: candidate.pan },
                      { label: 'Alternate Contact', value: candidate.alternateContact },
                      { label: 'Emergency Contact', value: candidate.emergencyContact },
                      { label: 'Address', value: candidate.address },
                      { label: 'City', value: candidate.city },
                      { label: 'State', value: candidate.state },
                      { label: 'Pincode', value: candidate.pincode },
                      { label: 'Education', value: candidate.education },
                      { label: 'College', value: candidate.college },
                      { label: 'Course', value: candidate.courseName },
                      { label: 'Batch', value: candidate.batch },
                      { label: 'Experience', value: candidate.experience },
                      { label: 'Company', value: candidate.company },
                      { label: 'Designation', value: candidate.designation },
                      { label: 'Salary', value: candidate.salary },
                      { label: 'Reference Name', value: candidate.referenceName },
                      { label: 'Reference Phone', value: candidate.referencePhone },
                      { label: 'Reference Company', value: candidate.referenceCompany },
                      { label: 'Document Status', value: candidate.documentStatus },
                      { label: 'Verification Status', value: candidate.verificationStatus },
                      { label: 'Police Verification', value: candidate.policeVerification },
                      { label: 'Document Amount', value: candidate.documentAmount ? `₹${candidate.documentAmount}` : undefined },
                    ]
                    .filter(f => f.value !== undefined && f.value !== null && String(f.value).trim() !== '' && String(f.value).trim() !== '--')
                    .map(({ label, value }) => (
                      <div key={label} className="flex items-start gap-2">
                        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-cc-text-mid w-[140px] flex-shrink-0 pt-0.5">
                          {label}
                        </span>
                        <span className="font-sans text-[13px] text-cc-text-high break-words">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-[13px] text-cc-text-low">
                    {normalizedBGVStatus === 'PENDING'
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
                    setShowPaymentForm((open) => !open);
                  }}
                  className="inline-flex items-center gap-1.5 rounded bg-cc-base-elevated border border-cc-gridline px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-cc-warm-text hover:border-cc-warm-primary transition-colors"
                >
                  <Plus size={13} />
                  Add Payment
                </button>
              </div>

              <PaymentModal 
                mode="dp" 
                isOpen={showPaymentForm} 
                onClose={() => setShowPaymentForm(false)} 
                candidateId={candidate.placementId} 
                candidateName={candidate.fullName} 
                defaultPipeline={activePipeline as any} 
              />

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
              {activePipelineData ? (
                <motion.div
                  key={activePipeline}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <FinancialCard
                    candidateId={candidate.placementId}
                    pipeline={activePipelineData as any}
                    accentColor={activeTab.accent}
                    mode="dp"
                  />
                </motion.div>
              ) : (
                <div className="flex flex-col justify-center items-center h-48 border border-dashed border-cc-gridline rounded-sm bg-cc-base-surface text-cc-text-mid">
                  <p className="font-mono text-xs uppercase tracking-wider">No fee configuration found</p>
                  <p className="text-sm mt-1">This candidate's fee structure is being loaded.</p>
                  <button
                    onClick={() => loadPaymentsForCandidate(candidate.placementId)}
                    className="mt-3 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] bg-cc-warm-primary text-white rounded hover:bg-cc-warm-primary-hover transition-colors"
                  >
                    Reload Financials
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
