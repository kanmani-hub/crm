import { create } from 'zustand';
import type { Candidate, TrackedCandidate, AppSettings, PipelineType, AuditLogEntry, PaymentRecord } from '@/types';
import { sheetsApi, type SyncResult } from '@/services/sheetsApi';

type ThemeMode = 'command' | 'sunny';
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

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
  themeMode: ThemeMode;
  globalEditMode: boolean;
  sidebarOpen: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  isAuthenticated: boolean;
  user: { email: string; name: string } | null;
  loginError: string | null;
  isFetchingData: boolean;
  // ── New sync-state fields ──
  syncStatus: SyncStatus;
  lastSyncTimestamp: string | null;
  lastSyncResult: SyncResult | null;
  dataSource: 'gas' | 'local' | 'mock';
  dashboardMetrics: DashboardMetrics | null;

  // Actions
  setSearchQuery: (q: string) => void;
  toggleFilter: (filter: string) => void;
  setBranchFilter: (branch: string) => void;
  setCourseFilter: (course: string) => void;
  setPlacementFilter: (placement: string) => void;
  clearSearchQuery: () => void;
  toggleThemeMode: () => void;
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
  login: (email: string, password: string) => boolean;
  logout: () => void;
  fetchInitialData: () => Promise<void>;
  syncCandidates: () => Promise<SyncResult | null>;
  refreshDashboard: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// MOCK / FALLBACK DATA
// ─────────────────────────────────────────────────────────────

const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

const getInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'command';
  return window.localStorage.getItem('pycrm-theme-mode') === 'sunny' ? 'sunny' : 'command';
};

const createDefaultFinancials = (): Candidate['financials'] => [
  { pipelineType: 'registration', baseFee: 0, adjustments: [], paidToDate: 0 },
  { pipelineType: 'course', baseFee: 30000, adjustments: [], paidToDate: 0 },
  { pipelineType: 'document', baseFee: 25000, adjustments: [], paidToDate: 0 },
  { pipelineType: 'placement', baseFee: 100000, adjustments: [], paidToDate: 0 },
];

// Mock data has been permanently removed per requirements.
const defaultSettings: AppSettings = {
  bgvTeamEmail: 'bgv-team@pythonhr.com',
  hrCCEmail: 'hr@pythonhr.com',
  gasWebAppUrl: 'https://script.google.com/macros/s/AKfycbxIVbtFPBF0p2tOc-Whn6t_ouGeJ5AJX5yf02Czpsv7tzzSTZcp9Ac-Tn1PBOTyJjmH/exec',
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
};

const loadSavedSettings = (): AppSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const saved = localStorage.getItem('pycrm-settings');
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (err) {
    console.warn('Failed to parse saved settings', err);
  }
  return defaultSettings;
};

// ─────────────────────────────────────────────────────────────
// GAS → Candidate mapper
// Converts a raw GAS row object (all strings) into a typed Candidate.
// ─────────────────────────────────────────────────────────────
function mapGasRowToCandidate(row: Record<string, string>): Candidate {
  const toBool = (v: string) => String(v).toLowerCase() === 'true';

  const financials: Candidate['financials'] = createDefaultFinancials();
  // If GAS ever sends financial data, we'd map it here.
  // For now, we use defaults since financials live in a separate sheet.

  return {
    id: row.candidateId || `c_${Math.random().toString(36).slice(2)}`,
    fullName: row.fullName || '',
    email: row.email || '',
    phone: row.phone || '',
    batchName: row.batchName || 'Batch 1',
    dateOfBirth: row.dateOfBirth || '',
    address: row.address || '',
    branch: row.branch || 'Online',
    course: row.course || 'Python Core',
    dateOfJoining: row.dateOfJoining || '',
    currentStatus: (row.currentStatus as Candidate['currentStatus']) || 'active',
    bgvStatus: (row.bgvStatus as Candidate['bgvStatus']) || 'pending',
    placed: toBool(row.placed),
    placedCompany: row.placedCompany || undefined,
    pastEmployment: [],
    documentsReceived: {
      offerLetter: false, appraisals: false, payslips: false,
      relievingLetter: false, counterOffer: false,
    },
    documentsApplied: {
      offerLetter: false, appraisals: false, payslips: false,
      relievingLetter: false, counterOffer: false,
    },
    trackedStatus: (row.trackedStatus as Candidate['trackedStatus']) || undefined,
    trackedAt: row.trackedAt || undefined,
    financials,
  };
}

// ─────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────
export const useStore = create<AppState>((set, get) => ({
  candidates: [],
  trackedCandidates: [],
  auditLogs: [],
  paymentRecords: [],
  activeProfileId: null,
  searchQuery: '',
  activeFilters: [],
  branchFilter: 'all',
  courseFilter: 'all',
  placementFilter: 'all',
  settings: loadSavedSettings(),
  themeMode: getInitialThemeMode(),
  globalEditMode: false,
  sidebarOpen: false,
  toastMessage: null,
  toastType: 'success',
  isAuthenticated: typeof window !== 'undefined' ? localStorage.getItem('pycrm_auth') === 'true' : false,
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pycrm_user') || 'null') : null,
  loginError: null,
  isFetchingData: false,
  syncStatus: 'idle',
  lastSyncTimestamp: null,
  lastSyncResult: null,
  dataSource: 'gas',
  dashboardMetrics: null,

  // ─── Data fetching ──────────────────────────────────────────
  fetchInitialData: async () => {
    // Avoid concurrent fetches
    if (get().isFetchingData) return;
    set({ isFetchingData: true, syncStatus: 'syncing' });

    try {
      const response = await sheetsApi.fetchAllData();

      if (response.success && Array.isArray(response.candidates) && response.candidates.length > 0) {
        // Filter out completely empty rows (GAS can return them)
        const validRows = response.candidates.filter(
          (row) => row.candidateId || row.fullName || row.email
        );

        const mappedCandidates = validRows.map(mapGasRowToCandidate);

        // Build tracked list from candidates that have trackedStatus
        const trackedFromCandidates: TrackedCandidate[] = mappedCandidates
          .filter((c) => c.trackedStatus)
          .map((c) => ({
            candidateId: c.id,
            status: c.trackedStatus!,
            payloadType: 'new-registration' as const,
            email: c.email,
            name: c.fullName,
            timestamp: c.trackedAt || new Date().toISOString(),
          }));

        // Merge with existing tracked list (keep items dispatched from Push Panel)
        const existingTracked = get().trackedCandidates;
        const existingIds = new Set(trackedFromCandidates.map((t) => t.candidateId));
        const manualTracked = existingTracked.filter((t) => !existingIds.has(t.candidateId));
        const mergedTracked = [...trackedFromCandidates, ...manualTracked];

        set({
          candidates: mappedCandidates,
          trackedCandidates: mergedTracked,
          syncStatus: 'success',
          lastSyncTimestamp: response.timestamp || new Date().toISOString(),
          lastSyncResult: response.sync || null,
          dataSource: 'gas',
          isFetchingData: false,
        });

        if (response.sync && response.sync.synced > 0) {
          get().showToast(
            `✓ ${response.sync.synced} new candidate${response.sync.synced > 1 ? 's' : ''} synced from Google Form`,
            'success'
          );
        }

        console.log('[store] Loaded', mappedCandidates.length, 'candidates from GAS');
        return;
      }

      // GAS returned success=true but no candidates — fall through to mock
      console.warn('[store] GAS returned no candidates, keeping current data');
      set({ syncStatus: 'success', lastSyncTimestamp: new Date().toISOString(), isFetchingData: false });

    } catch (err) {
      // Completely removed fallback to mock data per requirements
      set({ syncStatus: 'error', isFetchingData: false });

      set({ syncStatus: 'error', isFetchingData: false });
    }
  },

  // ─── Manual sync trigger ────────────────────────────────────
  syncCandidates: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const result = await sheetsApi.syncCandidates();
      // After sync, refresh the full data
      await get().fetchInitialData();
      await get().refreshDashboard();
      set({ lastSyncResult: result });
      return result;
    } catch (err) {
      set({ syncStatus: 'error' });
      console.error('[store] syncCandidates failed:', err);
      return null;
    }
  },

  refreshDashboard: async () => {
    try {
      const metrics = await sheetsApi.getDashboardMetrics();
      if (metrics && metrics.success) {
        set({ dashboardMetrics: metrics });
      }
    } catch (err) {
      console.error('[store] refreshDashboard failed:', err);
    }
  },

  // ─── Search & filter ────────────────────────────────────────
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

  // ─── Theme ──────────────────────────────────────────────────
  toggleThemeMode: () => set((s) => {
    const next = s.themeMode === 'sunny' ? 'command' : 'sunny';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pycrm-theme-mode', next);
    }
    return { themeMode: next };
  }),

  // ─── UI flags ───────────────────────────────────────────────
  setActiveProfileId: (id) => set({ activeProfileId: id, sidebarOpen: false }),
  toggleGlobalEdit: () => set((s) => ({ globalEditMode: !s.globalEditMode })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  showToast: (message, type = 'success') => set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),

  // ─── Tracked candidates ─────────────────────────────────────
  addTrackedCandidate: (tc) => set((s) => ({
    trackedCandidates: [tc, ...s.trackedCandidates],
  })),
  updateTrackedStatus: (candidateId, status) => set((s) => ({
    trackedCandidates: s.trackedCandidates.map((t) =>
      t.candidateId === candidateId ? { ...t, status } : t
    ),
  })),

  // ─── Candidate mutations ─────────────────────────────────────
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

  // ─── Settings ───────────────────────────────────────────────
  updateSettings: (settings) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pycrm-gas-url', settings.gasWebAppUrl);
      window.localStorage.setItem('pycrm-settings', JSON.stringify(settings));
    }
    set({ settings });
  },

  // ─── Financial & logs ───────────────────────────────────────
  addPaymentRecord: (payment) => set((s) => ({
    paymentRecords: [payment, ...s.paymentRecords],
  })),
  addAuditLog: (log) => set((s) => ({
    auditLogs: [log, ...s.auditLogs],
  })),

  // ─── Selectors ──────────────────────────────────────────────
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
        (sanitizedPhone && c.phone.replace(/[^\d]/g, '').includes(sanitizedPhone)) ||
        c.branch.toLowerCase().includes(q) ||
        c.course.toLowerCase().includes(q)
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

  // ─── Auth ────────────────────────────────────────────────────
  login: (email, password) => {
    if (email.trim().toLowerCase() === 'admin@pythonhr.com' && password === 'admin123') {
      const userData = { email: email.trim().toLowerCase(), name: 'Python HR Admin' };
      if (typeof window !== 'undefined') {
        localStorage.setItem('pycrm_auth', 'true');
        localStorage.setItem('pycrm_user', JSON.stringify(userData));
      }
      set({ isAuthenticated: true, user: userData, loginError: null });
      return true;
    }
    set({ loginError: 'Invalid email or password' });
    return false;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pycrm_auth');
      localStorage.removeItem('pycrm_user');
    }
    set({ isAuthenticated: false, user: null, loginError: null });
  },
}));
