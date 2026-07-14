export type PipelineType = 'registration' | 'course' | 'document' | 'placement';

export type BGVStatus = 'pending' | 'submitted' | 'cleared';

export type TrackedStatus = 'form-pending' | 'bgv-submitted' | 'contacts-sent' | 'cleared';

export type LogType = 'financial' | 'structural' | 'bgv';

export type PayloadType = 'new-registration' | 'bgv-form' | 'contact-mail' | 'direct-placement-form' | 'direct-bgv-form';

export interface Adjustment {
  id: string;
  amount: number;
  label: string;
  reason: string;
  createdAt: string;
  userStamp: string;
}

export interface FinancialPipeline {
  pipelineType: PipelineType;
  baseFee: number;
  adjustments: Adjustment[];
  paidToDate: number;
}

export interface AuditLogEntry {
  id: string;
  candidateId: string;
  logType: LogType;
  description: string;
  reason?: string;
  userStamp: string;
  timestamp: string;
}

export interface DocumentStatus {
  offerLetter: boolean;
  appraisals: boolean;
  payslips: boolean;
  relievingLetter: boolean;
  counterOffer: boolean;
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  batchName: string;
  dateOfBirth?: string;
  address?: string;
  branch: string;
  course: string;
  dateOfJoining?: string;
  currentStatus: 'active' | 'inactive' | 'completed';
  bgvStatus: BGVStatus;
  bgvSubmittedAt?: string;
  bgvDob?: string;
  bgvFatherName?: string;
  bgvAddress?: string;
  bgvAlternateContactNumber?: string;
  bgvPincode?: string;
  bgvCourseName?: string;
  bgvBatch?: string;
  bgvDocumentAmount?: string;
  
  updatedAt?: string;
  placed: boolean;
  placedCompany?: string;
  pastEmployment: string[];
  documentsReceived: DocumentStatus;
  documentsApplied: DocumentStatus;
  financials: FinancialPipeline[];
  trackedStatus?: TrackedStatus;
  trackedAt?: string;
}

export interface TrackedCandidate {
  candidateId: string;
  status: TrackedStatus;
  payloadType: PayloadType;
  email: string;
  name?: string;
  contactCount?: number;
  timestamp: string;
}

export interface PaymentRecord {
  id: string;           // paymentId
  candidateId: string;
  candidateName: string;
  paymentType: string;  // "Registration" | "Course Fee" | "Document Fee" | "Placement Fee"
  amount: number;
  paymentDate: string;
  remarks?: string;
  createdAt: string;
  // Legacy / compat fields
  pipelineType?: PipelineType;
  transactionRef?: string;
  notes?: string;
  timestamp?: string;
  userStamp?: string;
}

export interface FilterChip {
  id: string;
  label: string;
  type: string;
  value: string;
  active: boolean;
}

export interface AppSettings {
  bgvTeamEmail: string;
  hrCCEmail: string;
  gasWebAppUrl: string;
  orgName: string;
  contactEmails: string[];
  courses: string[];
  branches: string[];
  isOfflineMode?: boolean;
  googleSheetLinks: {
    candidateMaster: string;
    registrations: string;
    bgvResponses: string;
    financials: string;
    auditLogs: string;
    settings: string;
    registrationForm?: string;
    bgvForm?: string;
    dpRegistrationForm?: string;
    dpBgvForm?: string;
  };
}

export interface DashboardMetrics {
  success?: boolean;
  totalCandidates: number;
  newJoinees: number;
  bgvPending: number;
  bgvCompleted: number;
  placedCount: number;
  revenue: number;
  paymentsReceived: number;
  pendingDues: number;
  documentsPending: number;
  addedToday: number;
  timestamp?: string;
}

export * from './dp';

