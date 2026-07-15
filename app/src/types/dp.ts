export type DPBGVStatus = 'pending' | 'submitted' | 'cleared';

export interface DPDocumentStatus {
  offerLetter: boolean;
  offerLetterUrl?: string;
  relievingLetter: boolean;
  relievingLetterUrl?: string;
  pfServiceHistory: boolean;
  pfServiceHistoryUrl?: string;
  payslip: boolean;
  payslipUrl?: string;
}

export type DPAdjustmentType = "ADDITIONAL_CHARGE" | "DISCOUNT" | "WAIVER" | "REFUND";

export interface DPAdjustment {
  adjustmentId: string;
  placementId: string;
  candidateName: string;
  pipelineType: string;
  adjustmentType: DPAdjustmentType | string;
  amount: number;
  reason: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DPFinancialPipeline {
  pipelineType: string;
  baseFee: number;
  adjustments: DPAdjustment[];
  paidToDate: number;
  netPayable?: number;
  pendingDues?: number;
  overpaidAmount?: number;
  paymentStatus?: 'Pending' | 'Partial' | 'Paid';
}

export interface DPCandidate {
  placementId: string;
  fullName: string;
  mobileNumber: string;
  yearOfPassing: string;
  currentlyWorking: string;
  experienceType: string;
  companyName: string;
  designation: string;
  ctc: string;

  // Documents
  documents: DPDocumentStatus;
  offerLetter?: boolean;
  relievingLetter?: boolean;
  pfServiceHistory?: boolean;
  payslip?: boolean;

  // BGV
  bgvStatus: DPBGVStatus;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  state?: string;
  college?: string;
  verificationStatus?: string;
  policeVerification?: string;
  fatherName?: string;
  alternateContact?: string;
  address?: string;
  pincode?: string;
  courseName?: string;
  batch?: string;
  documentAmount?: string;
  bgvSubmittedAt?: string;
  motherName?: string;
  aadhaar?: string;
  pan?: string;
  emergencyContact?: string;
  education?: string;
  experience?: string;
  company?: string;
  salary?: string;
  referenceName?: string;
  referencePhone?: string;
  referenceCompany?: string;
  documentStatus?: string;

  // Tracking
  candidateStatus: 'active' | 'inactive' | 'completed';
  trackedStatus?: string;
  trackedAt?: string;
  createdAt: string;
  updatedAt: string;
  remarks?: string;

  // Financials injected client-side
  financials: DPFinancialPipeline[];
}

export type DPDocumentType = "offerLetter" | "relievingLetter" | "pfServiceHistory" | "payslip";

export interface DPPaymentRecord {
  id: string;
  placementId: string;
  candidateName: string;
  paymentType: string;
  amount: number;
  paymentDate: string;
  remarks?: string;
  createdAt: string;
  pipelineType?: string;
  transactionRef?: string;
  notes?: string;
  timestamp?: string;
  userStamp?: string;
}

export interface DPAuditLogEntry {
  auditId: string;
  timestamp: string;
  placementId: string;
  candidateName: string;
  module: string;
  action: string;
  description: string;
  oldValue: string;
  newValue: string;
  user: string;
  // For backwards compatibility in UI if needed
  id?: string;
  logType?: 'financial' | 'structural' | 'bgv';
  reason?: string;
  userStamp?: string;
}

export interface DPDashboardMetrics {
  success?: boolean;
  totalCandidates: number;
  bgvPending: number;
  bgvCompleted: number;
  revenue: number;
  paymentsReceived: number;
  pendingDues: number;
  addedToday: number;
  timestamp?: string;
}
