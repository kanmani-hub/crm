import { create } from 'zustand';
import type { Candidate, TrackedCandidate, AppSettings, PipelineType } from '@/types';

interface AppState {
  candidates: Candidate[];
  trackedCandidates: TrackedCandidate[];
  activeProfileId: string | null;
  searchQuery: string;
  activeFilters: string[];
  settings: AppSettings;
  globalEditMode: boolean;
  sidebarOpen: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  // Actions
  setSearchQuery: (q: string) => void;
  toggleFilter: (filter: string) => void;
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
  getCandidateById: (id: string) => Candidate | undefined;
  getFilteredCandidates: () => Candidate[];
}

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

const mockCandidates: Candidate[] = [
  {
    id: 'c1',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@email.com',
    phone: '+91 98765 43210',
    dateOfBirth: '1995-03-15',
    address: '42, MG Road, Bangalore, Karnataka 560001',
    branch: 'Main Branch',
    course: 'Python Full Stack',
    dateOfJoining: '2025-01-10',
    currentStatus: 'active',
    bgvStatus: 'pending',
    placed: false,
    pastEmployment: ['TCS', 'Infosys'],
    documentsReceived: { offerLetter: true, appraisals: true, payslips: false, relievingLetter: true, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: false, payslips: true, relievingLetter: false, counterOffer: false },
    financials: [
      { pipelineType: 'registration', baseFee: 5000, adjustments: [{ id: 'a1', amount: -500, label: 'Early Bird', reason: 'Promotional discount', createdAt: '2025-01-10', userStamp: 'HR-A' }], paidToDate: 4500 },
      { pipelineType: 'course', baseFee: 45000, adjustments: [{ id: 'a2', amount: -2000, label: 'Corporate Waiver', reason: 'Branch Manager approved corporate waiver', createdAt: '2025-01-10', userStamp: 'HR-A' }], paidToDate: 25000 },
      { pipelineType: 'document', baseFee: 3000, adjustments: [], paidToDate: 3000 },
      { pipelineType: 'placement', baseFee: 15000, adjustments: [], paidToDate: 0 },
    ],
  },
  {
    id: 'c2',
    fullName: 'Priya Patel',
    email: 'priya.patel@email.com',
    phone: '+91 87654 32109',
    dateOfBirth: '1997-08-22',
    address: '15, Park Street, Mumbai, Maharashtra 400001',
    branch: 'Online',
    course: 'Data Science',
    dateOfJoining: '2025-02-05',
    currentStatus: 'active',
    bgvStatus: 'in-review',
    placed: false,
    pastEmployment: ['Cognizant', 'Wipro'],
    documentsReceived: { offerLetter: true, appraisals: false, payslips: true, relievingLetter: false, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false },
    financials: [
      { pipelineType: 'registration', baseFee: 5000, adjustments: [], paidToDate: 5000 },
      { pipelineType: 'course', baseFee: 55000, adjustments: [{ id: 'a3', amount: -3000, label: 'Scholarship', reason: 'Merit scholarship awarded', createdAt: '2025-02-05', userStamp: 'HR-B' }], paidToDate: 35000 },
      { pipelineType: 'document', baseFee: 3000, adjustments: [], paidToDate: 1500 },
      { pipelineType: 'placement', baseFee: 20000, adjustments: [], paidToDate: 0 },
    ],
  },
  {
    id: 'c3',
    fullName: 'Amit Kumar',
    email: 'amit.kumar@email.com',
    phone: '+91 76543 21098',
    dateOfBirth: '1993-11-05',
    address: '78, Salt Lake, Kolkata, West Bengal 700091',
    branch: 'Branch A',
    course: 'Machine Learning',
    dateOfJoining: '2024-12-01',
    currentStatus: 'active',
    bgvStatus: 'cleared',
    placed: true,
    placedCompany: 'Google India',
    pastEmployment: ['HCL', 'Tech Mahindra', 'Accenture'],
    documentsReceived: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: true },
    documentsApplied: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: true },
    financials: [
      { pipelineType: 'registration', baseFee: 5000, adjustments: [], paidToDate: 5000 },
      { pipelineType: 'course', baseFee: 60000, adjustments: [{ id: 'a4', amount: -5000, label: 'Corporate Discount', reason: 'Bulk enrollment discount', createdAt: '2024-12-01', userStamp: 'HR-A' }], paidToDate: 55000 },
      { pipelineType: 'document', baseFee: 3000, adjustments: [], paidToDate: 3000 },
      { pipelineType: 'placement', baseFee: 25000, adjustments: [], paidToDate: 12500 },
    ],
  },
  {
    id: 'c4',
    fullName: 'Sneha Reddy',
    email: 'sneha.reddy@email.com',
    phone: '+91 65432 10987',
    dateOfBirth: '1996-06-18',
    address: '33, Jubilee Hills, Hyderabad, Telangana 500033',
    branch: 'Main Branch',
    course: 'Web Development',
    dateOfJoining: '2025-03-01',
    currentStatus: 'active',
    bgvStatus: 'pending',
    placed: false,
    pastEmployment: ['Capgemini'],
    documentsReceived: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    financials: [
      { pipelineType: 'registration', baseFee: 5000, adjustments: [], paidToDate: 2500 },
      { pipelineType: 'course', baseFee: 35000, adjustments: [], paidToDate: 10000 },
      { pipelineType: 'document', baseFee: 3000, adjustments: [], paidToDate: 0 },
      { pipelineType: 'placement', baseFee: 15000, adjustments: [], paidToDate: 0 },
    ],
  },
  {
    id: 'c5',
    fullName: 'Vikram Iyer',
    email: 'vikram.iyer@email.com',
    phone: '+91 54321 09876',
    dateOfBirth: '1994-01-30',
    address: '91, Anna Nagar, Chennai, Tamil Nadu 600040',
    branch: 'Branch B',
    course: 'Python Full Stack',
    dateOfJoining: '2025-01-20',
    currentStatus: 'active',
    bgvStatus: 'cleared',
    placed: true,
    placedCompany: 'Microsoft India',
    pastEmployment: ['IBM', 'Deloitte'],
    documentsReceived: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false },
    documentsApplied: { offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false },
    financials: [
      { pipelineType: 'registration', baseFee: 5000, adjustments: [], paidToDate: 5000 },
      { pipelineType: 'course', baseFee: 45000, adjustments: [{ id: 'a5', amount: -1000, label: 'Referral', reason: 'Referred by existing student', createdAt: '2025-01-20', userStamp: 'HR-A' }], paidToDate: 44000 },
      { pipelineType: 'document', baseFee: 3000, adjustments: [], paidToDate: 3000 },
      { pipelineType: 'placement', baseFee: 20000, adjustments: [], paidToDate: 20000 },
    ],
  },
  {
    id: 'c6',
    fullName: 'Neha Gupta',
    email: 'neha.gupta@email.com',
    phone: '+91 43210 98765',
    dateOfBirth: '1998-04-12',
    address: '55, Rajouri Garden, Delhi, 110027',
    branch: 'Online',
    course: 'Data Science',
    dateOfJoining: '2025-03-10',
    currentStatus: 'active',
    bgvStatus: 'pending',
    placed: false,
    pastEmployment: [],
    documentsReceived: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    documentsApplied: { offerLetter: false, appraisals: false, payslips: false, relievingLetter: false, counterOffer: false },
    financials: [
      { pipelineType: 'registration', baseFee: 5000, adjustments: [], paidToDate: 5000 },
      { pipelineType: 'course', baseFee: 55000, adjustments: [], paidToDate: 15000 },
      { pipelineType: 'document', baseFee: 3000, adjustments: [], paidToDate: 0 },
      { pipelineType: 'placement', baseFee: 18000, adjustments: [], paidToDate: 0 },
    ],
  },
];

const mockTracked: TrackedCandidate[] = [
  { candidateId: 'c4', status: 'form-pending', payloadType: 'new-registration', email: 'sneha.reddy@email.com', name: 'Sneha Reddy', timestamp: minsAgo(5) },
  { candidateId: 'c2', status: 'bgv-submitted', payloadType: 'bgv-form', email: 'priya.patel@email.com', name: 'Priya Patel', timestamp: minsAgo(45) },
  { candidateId: 'c6', status: 'form-pending', payloadType: 'bgv-form', email: 'neha.gupta@email.com', name: 'Neha Gupta', timestamp: minsAgo(120) },
];

const defaultSettings: AppSettings = {
  bgvTeamEmail: 'bgv-team@pythonhr.com',
  orgName: 'Python HR',
  contactEmails: [
    'recruiter1@company.com',
    'leads@branch.com',
    'placements@pythonhr.com',
  ],
  courses: ['Python Full Stack', 'Data Science', 'Machine Learning', 'Web Development', 'Other'],
  branches: ['Main Branch', 'Online', 'Branch A', 'Branch B'],
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
  activeProfileId: null,
  searchQuery: '',
  activeFilters: [],
  settings: defaultSettings,
  globalEditMode: false,
  sidebarOpen: false,
  toastMessage: null,
  toastType: 'success',

  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleFilter: (filter) => set((s) => ({
    activeFilters: s.activeFilters.includes(filter)
      ? s.activeFilters.filter((f) => f !== filter)
      : [...s.activeFilters, filter],
  })),
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
  getCandidateById: (id) => get().candidates.find((c) => c.id === id),
  getFilteredCandidates: () => {
    const { candidates, searchQuery, activeFilters } = get();
    let results = [...candidates];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const sanitizedPhone = searchQuery.replace(/[^\d]/g, '');
      results = results.filter((c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.replace(/[^\d]/g, '').includes(sanitizedPhone)
      );
    }

    if (activeFilters.includes('form-pending')) {
      results = results.filter((c) => c.trackedStatus === 'form-pending');
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

    return results;
  },
}));
