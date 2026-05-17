import { create } from 'zustand';
import type { Candidate, TrackedCandidate, AppSettings, PipelineType, AuditLogEntry, PaymentRecord } from '@/types';

interface AppState {
  candidates: Candidate[];
  trackedCandidates: TrackedCandidate[];
  auditLogs: AuditLogEntry[];
  paymentRecords: PaymentRecord[];
  activeProfileId: string | null;
  searchQuery: string;
  activeFilters: string[];
  branchFilter: string;
  courseFilter: string;
  placementFilter: string;
  settings: AppSettings;
  globalEditMode: boolean;
  sidebarOpen: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  // Actions
  setSearchQuery: (q: string) => void;
  toggleFilter: (filter: string) => void;
  setBranchFilter: (branch: string) => void;
  setCourseFilter: (course: string) => void;
  setPlacementFilter: (placement: string) => void;
  clearSearchQuery: () => void;
  setActiveProfileId: (id: string | null) => void;
  toggleGlobalEdit: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  addTrackedCandidate: (tc: TrackedCandidate) => void;
  updateTrackedStatus: (candidateId: string, status: TrackedCandidate['status']) => void;
  updateCandidate: (id: string, updates: Partial<Candidate>) => void;
  updateFinancialPipeline: (candidateId: string, pipelineType: PipelineType, updates: Partial<Candidate['financials'][0]>) => void;
  updateSettings: (settings: AppSettings) => void;
  addPaymentRecord: (payment: PaymentRecord) => void;
  addAuditLog: (log: AuditLogEntry) => void;
  getCandidateById: (id: string) => Candidate | undefined;
  getFilteredCandidates: () => Candidate[];
}

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const createDefaultFinancials = (): Candidate['financials'] => [
  { pipelineType: 'registration', baseFee: 0, adjustments: [], paidToDate: 0 },
  { pipelineType: 'course', baseFee: 30000, adjustments: [], paidToDate: 0 },
  { pipelineType: 'document', baseFee: 25000, adjustments: [], paidToDate: 0 },
  { pipelineType: 'placement', baseFee: 100000, adjustments: [], paidToDate: 0 },
];

const mockCandidates: Candidate[] = [
  {
    id: 'c1',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@email.com',
    phone: '+91 98765 43210',
    batchName: 'Batch 4',
    dateOfBirth: '1995-03-15',
    address: '42, MG Road, Bangalore, Karnataka 560001',
    branch: 'Bangalore',
    course: 'Full Stack',
    dateOfJoining: '2025-01-10',
    currentStatus: 'active',
    bgvStatus: 'pending',
    placed: false,
    pastEmployment: ['TCS', 'Infosys'],
    documentsReceived: { offerLetter: true, appraisals: true, payslips: false, relievingLetter: true, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: false, payslips: true, relievingLetter: false, counterOffer: false },
    financials: createDefaultFinancials(),
  },
  {
    id: 'c2',
    fullName: 'Priya Patel',
    email: 'priya.patel@email.com',
    phone: '+91 87654 32109',
    batchName: 'Batch 5',
    dateOfBirth: '1997-08-22',
    address: '15, Park Street, Mumbai, Maharashtra 400001',
    branch: 'Online',
    course: 'Python Core',
    dateOfJoining: '2025-02-05',
    currentStatus: 'active',
    bgvStatus: 'in-review',
    placed: false,
    pastEmployment: ['Cognizant', 'Wipro'],
    documentsReceived: { offerLetter: true, appraisals: false, payslips: true, relievingLetter: false, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false },
    financials: createDefaultFinancials(),
  },
  {
    id: 'c3',
    fullName: 'Amit Kumar',
    email: 'amit.kumar@email.com',
    phone: '+91 76543 21098',
    batchName: 'Batch 3',
    dateOfBirth: '1993-11-05',
    address: '78, Salt Lake, Kolkata, West Bengal 700091',
    branch: 'Chennai',
    course: 'Python Core',
    dateOfJoining: '2024-12-01',
    currentStatus: 'active',
    bgvStatus: 'cleared',
    placed: true,
    placedCompany: 'Google India',
    pastEmployment: ['HCL', 'Tech Mahindra', 'Accenture'],
    documentsReceived: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: true },
    documentsApplied: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: true },
    financials: createDefaultFinancials(),
  },
  {
    id: 'c4',
    fullName: 'Sneha Reddy',
    email: 'sneha.reddy@email.com',
    phone: '+91 65432 10987',
    batchName: 'Batch 6',
    dateOfBirth: '1996-06-18',
    address: '33, Jubilee Hills, Hyderabad, Telangana 500033',
    branch: 'Bangalore',
    course: 'Full Stack',
    dateOfJoining: '2025-03-01',
    currentStatus: 'active',
    bgvStatus: 'pending',
    placed: false,
    pastEmployment: ['Capgemini'],
    documentsReceived: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    financials: createDefaultFinancials(),
  },
  {
    id: 'c5',
    fullName: 'Vikram Iyer',
    email: 'vikram.iyer@email.com',
    phone: '+91 54321 09876',
    batchName: 'Batch 4',
    dateOfBirth: '1994-01-30',
    address: '91, Anna Nagar, Chennai, Tamil Nadu 600040',
    branch: 'Chennai',
    course: 'Full Stack',
    dateOfJoining: '2025-01-20',
    currentStatus: 'active',
    bgvStatus: 'cleared',
    placed: true,
    placedCompany: 'Microsoft India',
    pastEmployment: ['IBM', 'Deloitte'],
    documentsReceived: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false },
    financials: createDefaultFinancials(),
  },
  {
    id: 'c6',
    fullName: 'Neha Gupta',
    email: 'neha.gupta@email.com',
    phone: '+91 43210 98765',
    batchName: 'Batch 7',
    dateOfBirth: '1998-04-12',
    address: '55, Rajouri Garden, Delhi, 110027',
    branch: 'Online',
    course: 'Python Core',
    dateOfJoining: '2025-03-10',
    currentStatus: 'active',
    bgvStatus: 'pending',
    placed: false,
    pastEmployment: [],
    documentsReceived: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    documentsApplied: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    financials: createDefaultFinancials(),
  },
];

const mockTracked: TrackedCandidate[] = [
  { candidateId: 'c4', status: 'form-pending', payloadType: 'new-registration', email: 'sneha.reddy@email.com', name: 'Sneha Reddy', timestamp: minsAgo(5) },
  { candidateId: 'c2', status: 'bgv-submitted', payloadType: 'bgv-form', email: 'priya.patel@email.com', name: 'Priya Patel', timestamp: minsAgo(45) },
  { candidateId: 'c6', status: 'form-pending', payloadType: 'bgv-form', email: 'neha.gupta@email.com', name: 'Neha Gupta', timestamp: minsAgo(120) },
];

const mockLogs: AuditLogEntry[] = [
  {
    id: 'l1',
    candidateId: 'c1',
    logType: 'structural',
    description: 'Applied discount: Corporate Waiver (-Rs.2,000)',
    reason: 'Branch Manager approved early-bird corporate waiver',
    userStamp: 'HR-A',
    timestamp: '2025-01-10T10:30:00Z',
  },
  {
    id: 'l2',
    candidateId: 'c1',
    logType: 'financial',
    description: 'Payment received: Rs.4,500 for Registration',
    userStamp: 'HR-A',
    timestamp: '2025-01-15T14:20:00Z',
  },
  {
    id: 'l3',
    candidateId: 'c1',
    logType: 'structural',
    description: 'Updated base fee: Registration from Rs.5,000 to Rs.4,500',
    reason: 'Negotiated discount with candidate family',
    userStamp: 'HR-B',
    timestamp: '2025-02-01T09:15:00Z',
  },
  {
    id: 'l4',
    candidateId: 'c1',
    logType: 'bgv',
    description: 'BGV status changed to Pending',
    userStamp: 'HR-A',
    timestamp: '2025-01-20T11:00:00Z',
  },
  {
    id: 'l5',
    candidateId: 'c1',
    logType: 'financial',
    description: 'Payment received: Rs.25,000 for Course Fee',
    userStamp: 'HR-A',
    timestamp: '2025-02-10T16:45:00Z',
  },
];

const defaultSettings: AppSettings = {
  bgvTeamEmail: 'bgv-team@pythonhr.com',
  orgName: 'Python HR',
  contactEmails: [
    'recruiter1@company.com',
    'leads@branch.com',
    'placements@pythonhr.com',
  ],
  courses: ['Python Core', 'Full Stack', 'Data Science', 'Machine Learning', 'Web Development', 'Other'],
  branches: ['Chennai', 'Bangalore', 'Online'],
  googleSheetLinks: {
    candidateMaster: '',
    registrations: '',
    bgvResponses: '',
    financials: '',
    auditLogs: '',
    settings: '',
  },
  emailNotifications: true,
  bgvAlerts: true,
};

export const useStore = create<AppState>((set, get) => ({
  candidates: mockCandidates,
  trackedCandidates: mockTracked,
  auditLogs: mockLogs,
  paymentRecords: [],
  activeProfileId: null,
  searchQuery: '',
  activeFilters: [],
  branchFilter: 'all',
  courseFilter: 'all',
  placementFilter: 'all',
  settings: defaultSettings,
  globalEditMode: false,
  sidebarOpen: false,
  toastMessage: null,
  toastType: 'success',

  setSearchQuery: (q) => set({ searchQuery: q }),
  clearSearchQuery: () => set({ searchQuery: '' }),
  toggleFilter: (filter) => set((s) => ({
    activeFilters: s.activeFilters.includes(filter)
      ? s.activeFilters.filter((f) => f !== filter)
      : [...s.activeFilters, filter],
  })),
  setBranchFilter: (branch) => set({ branchFilter: branch }),
  setCourseFilter: (course) => set({ courseFilter: course }),
  setPlacementFilter: (placement) => set({ placementFilter: placement }),
  setActiveProfileId: (id) => set({ activeProfileId: id, sidebarOpen: false }),
  toggleGlobalEdit: () => set((s) => ({ globalEditMode: !s.globalEditMode })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  showToast: (message, type = 'success') => set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),
  addTrackedCandidate: (tc) => set((s) => ({
    trackedCandidates: [tc, ...s.trackedCandidates],
  })),
  updateTrackedStatus: (candidateId, status) => set((s) => ({
    trackedCandidates: s.trackedCandidates.map((t) =>
      t.candidateId === candidateId ? { ...t, status } : t
    ),
  })),
  updateCandidate: (id, updates) => set((s) => ({
    candidates: s.candidates.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),
  updateFinancialPipeline: (candidateId, pipelineType, updates) => set((s) => ({
    candidates: s.candidates.map((c) => {
      if (c.id !== candidateId) return c;
      return {
        ...c,
        financials: c.financials.map((f) =>
          f.pipelineType === pipelineType ? { ...f, ...updates } : f
        ),
      };
    }),
  })),
  updateSettings: (settings) => set({ settings }),
  addPaymentRecord: (payment) => set((s) => ({
    paymentRecords: [payment, ...s.paymentRecords],
  })),
  addAuditLog: (log) => set((s) => ({
    auditLogs: [log, ...s.auditLogs],
  })),
  getCandidateById: (id) => get().candidates.find((c) => c.id === id),
  getFilteredCandidates: () => {
    const { candidates, trackedCandidates, searchQuery, activeFilters, branchFilter, courseFilter, placementFilter } = get();
    let results = [...candidates];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const sanitizedPhone = searchQuery.replace(/[^\d]/g, '');
      results = results.filter((c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/[^\d]/g, '').includes(sanitizedPhone) ||
        c.batchName.toLowerCase().includes(q)
      );
    }

    if (activeFilters.includes('form-pending')) {
      const pendingIds = new Set(
        trackedCandidates
          .filter((tracked) => tracked.status === 'form-pending')
          .map((tracked) => tracked.candidateId)
      );
      results = results.filter((c) => c.trackedStatus === 'form-pending' || pendingIds.has(c.id));
    }
    if (activeFilters.includes('bgv-cleared')) {
      results = results.filter((c) => c.bgvStatus === 'cleared');
    }
    if (activeFilters.includes('has-dues')) {
      results = results.filter((c) => {
        return c.financials.some((f) => {
          const netPayable = f.baseFee + f.adjustments.reduce((sum, a) => sum + a.amount, 0);
          const pending = netPayable - f.paidToDate;
          return pending > 0;
        });
      });
    }

    if (branchFilter !== 'all') {
      results = results.filter((c) => c.branch === branchFilter);
    }
    if (courseFilter !== 'all') {
      results = results.filter((c) => c.course === courseFilter);
    }
    if (placementFilter === 'placed') {
      results = results.filter((c) => c.placed);
    }
    if (placementFilter === 'training') {
      results = results.filter((c) => !c.placed);
    }

    return results;
  },
}));
