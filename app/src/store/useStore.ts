import { create } from 'zustand';
import type { Candidate, TrackedCandidate, AppSettings, PipelineType, AuditLogEntry, PaymentRecord, DashboardMetrics } from '@/types';
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
  cacheMetadata: {
    candidates: number | null;
    metrics: number | null;
    payments: Record<string, number>;
    auditLogs: number | null;
  };
  pendingDocumentUpdates: Record<string, { documentsReceived?: import('@/types').DocumentStatus, documentsApplied?: import('@/types').DocumentStatus }>;

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
  setPendingDocumentUpdate: (candidateId: string, type: 'documentsReceived' | 'documentsApplied', data: import('@/types').DocumentStatus) => void;
  clearPendingDocumentUpdate: (candidateId: string, type: 'documentsReceived' | 'documentsApplied') => void;
  updateFinancialPipeline: (candidateId: string, pipelineType: PipelineType, updates: Partial<Candidate['financials'][0]>) => void;
  updateSettings: (settings: AppSettings) => void;
  addPaymentRecord: (payment: PaymentRecord) => Promise<{ success: boolean; error?: string }>;
  updatePaymentRecord: (paymentId: string, updates: Partial<PaymentRecord>) => Promise<{ success: boolean; error?: string }>;
  addAuditLog: (log: AuditLogEntry) => void;
  getCandidateById: (id: string) => Candidate | undefined;
  getFilteredCandidates: () => Candidate[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  fetchInitialData: (force?: boolean, isBackground?: boolean) => Promise<void>;
  syncCandidates: () => Promise<SyncResult | null>;
  refreshDashboard: (force?: boolean) => Promise<void>;
  loadPaymentsForCandidate: (candidateId: string, force?: boolean) => Promise<void>;
  loadAuditLogs: (force?: boolean) => Promise<void>;
  rebuildFinancialLedger: () => Promise<{ success: boolean; error?: string; summary?: any }>;
  
  getCalculatedDashboardMetrics: () => DashboardMetrics;
}

// ─────────────────────────────────────────────────────────────
// MOCK / FALLBACK DATA
// ─────────────────────────────────────────────────────────────

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
function mapGasRowToCandidate(rawRow: Record<string, string>): Candidate {
  const toBool = (val: any): boolean => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === '1';
  };

  // Normalize all keys to lowercase with no spaces to handle unpredictable sheet headers
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    row[cleanKey] = value;
  }

  const financials: Candidate['financials'] = createDefaultFinancials();

    const parseJsonField = (val: any, defaultVal: any) => {
      if (!val) return defaultVal;
      try {
        return { ...defaultVal, ...(typeof val === 'string' ? JSON.parse(val) : val) };
      } catch {
        return defaultVal;
      }
    };

    const parseJsonArray = (val: any, defaultVal: any[]) => {
      if (!val) return defaultVal;
      try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        return Array.isArray(parsed) ? parsed : defaultVal;
      } catch {
        return defaultVal;
      }
    };

    return {
      id: row.candidateId || row.candidateid || `c_${Math.random().toString(36).slice(2)}`,
      fullName: row.fullName || row.fullname || row.name || '',
      email: row.email || row.emailaddress || '',
      phone: row.phone || row.phonenumber || row.mobno || '',
      batchName: row.batchName || row.batchname || row.batch || 'Batch 1',
      dateOfBirth: row.dateOfBirth || row.dateofbirth || row.dob || row.bgvDob || row.bgvdob || '',
      address: row.address || '',
      branch: row.branch || 'Online',
      course: row.course || 'Python Core',
      dateOfJoining: row.dateOfJoining || row.dateofjoining || row.doj || '',
      currentStatus: (row.currentStatus as Candidate['currentStatus']) || (row.currentstatus as Candidate['currentStatus']) || 'active',
      bgvStatus: ((row.bgvStatus || row.bgvstatus || 'pending').toLowerCase() as Candidate['bgvStatus']),
      bgvSubmittedAt: row.bgvsubmittedat || row.bgvSubmittedAt || undefined,
      bgvDob: row.dateofbirth || row.dateOfBirth || row.bgvdob || undefined,
      bgvFatherName: row.fathername || row.fatherName || row.bgvfathername || undefined,
      bgvAddress: row.address || row.bgvaddress || undefined,
      bgvAlternateContactNumber: row.alternatecontactnumber || row.alternateContactNumber || row.bgvalternatecontactnumber || row.bgvalternatecontact || undefined,
      bgvPincode: row.pincode || row.bgvpincode || undefined,
      bgvCourseName: row.coursename || row.courseName || row.course || row.bgvcoursename || undefined,
      bgvBatch: row.batchname || row.batchName || row.batch || row.bgvbatch || undefined,
      bgvDocumentAmount: row.documentamount || row.documentAmount || row.bgvdocumentamount || undefined,
      placed: toBool(row.placed),
      placedCompany: row.placedcompany || undefined,
      pastEmployment: parseJsonArray(row.pastEmployment || row.pastemployment, []),
      documentsReceived: parseJsonField(row.documentsReceived || row.documentsreceived, {
        offerLetter: false, appraisals: false, payslips: false,
        relievingLetter: false, counterOffer: false,
      }),
      documentsApplied: parseJsonField(row.documentsApplied || row.documentsapplied, {
        offerLetter: false, appraisals: false, payslips: false,
        relievingLetter: false, counterOffer: false,
      }),
      trackedStatus: (row.trackedstatus as Candidate['trackedStatus']) || undefined,
      trackedAt: row.trackedat || undefined,
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
  pendingDocumentUpdates: {},
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
  cacheMetadata: {
    candidates: null,
    metrics: null,
    payments: {},
    auditLogs: null,
  },
  
  dateFilterType: 'all',
  customDateRange: null,
  dateFilterTarget: 'joining',

  // ─── Data fetching ──────────────────────────────────────────
  fetchInitialData: async (force = false, isBackground = false) => {
    // Don't block if already fetching — allow refresh calls from Dashboard mount
    if (get().isFetchingData) {
      console.log('[store] fetchInitialData skipped — already in progress');
      return;
    }

    if (!force && get().cacheMetadata.candidates) {
      const elapsed = Date.now() - get().cacheMetadata.candidates!;
      if (elapsed < 5 * 60 * 1000) {
        console.log('[store] fetchInitialData using cached data');
        return;
      }
    }

    if (isBackground) {
      set({ syncStatus: 'syncing' }); // Only show small sync indicator
    } else {
      set({ isFetchingData: true, syncStatus: 'syncing' });
    }

    // Log which URL we're hitting so users can verify Settings
    const gasUrl = typeof window !== 'undefined'
      ? (window.localStorage.getItem('pycrm-gas-url') || get().settings.gasWebAppUrl || '(none)')
      : '(server)';
    console.log('[store] fetchInitialData using GAS URL:', gasUrl);

    try {
      const response = await sheetsApi.fetchAllData();

      if (response.success && Array.isArray(response.candidates) && response.candidates.length > 0) {
        const oldCandidates = get().candidates;
        const mappedCandidates = response.candidates
          .map((row) => {
            const mapped = mapGasRowToCandidate(row);
            const oldC = oldCandidates.find(c => c.id === mapped.id);
            
            if (response.financials && response.financials.length > 0) {
              const cFinancials = response.financials.filter(r => r.candidateId === mapped.id);
              if (cFinancials.length > 0) {
                mapped.financials = mapped.financials.map(f => {
                  const r = cFinancials.find(cf => cf.pipelineType === f.pipelineType);
                  if (!r) return f;
                  const parsedBaseFee = parseFloat(r.baseFee);
                  const parsedPaidToDate = parseFloat(r.paidToDate);
                  const parsedTotalAdj = parseFloat(r.totalAdjustments) || 0;
                  
                  let adjustments = [];
                  if (r.adjustmentsJson) {
                    try { adjustments = JSON.parse(r.adjustmentsJson); } catch(e){}
                  }
                  if (adjustments.length === 0 && parsedTotalAdj !== 0) {
                    adjustments = [{ id: 'server_adj', amount: parsedTotalAdj, label: 'Server adjustment', reason: '', createdAt: '', userStamp: '' }];
                  }
                  return {
                    ...f,
                    baseFee: !isNaN(parsedBaseFee) ? parsedBaseFee : f.baseFee,
                    paidToDate: !isNaN(parsedPaidToDate) ? parsedPaidToDate : 0,
                    adjustments
                  };
                });
              } else if (oldC) {
                mapped.financials = oldC.financials;
              }
            } else if (oldC) {
              // Never wipe existing financials if response omits them
              mapped.financials = oldC.financials;
            }
            
            // Apply pending document updates
            const pendingUpdates = get().pendingDocumentUpdates[mapped.id];
            if (pendingUpdates) {
              if (pendingUpdates.documentsReceived) {
                mapped.documentsReceived = { ...mapped.documentsReceived, ...pendingUpdates.documentsReceived };
              }
              if (pendingUpdates.documentsApplied) {
                mapped.documentsApplied = { ...mapped.documentsApplied, ...pendingUpdates.documentsApplied };
              }
            }
            
            return mapped;
          })
          .filter((c) => c.fullName || c.email || c.phone);

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

        const syncResult = response.sync || null;

        // Process initial payments if returned
        const mappedPayments: PaymentRecord[] = [];
        if (response.payments && response.payments.length > 0) {
          const pipelineTypeMap: Record<string, string> = {
            'registration': 'registration', 'Registration': 'registration', 'Registration Fee': 'registration',
            'course': 'course',             'course fee': 'course',         'Course Fee': 'course',
            'document': 'document',         'document fee': 'document',     'Document Fee': 'document', 'Document': 'document',
            'placement': 'placement',       'placement fee': 'placement',   'Placement Fee': 'placement', 'Placement': 'placement',
          };
          
          response.payments.forEach((row) => {
            const pipelineKey = pipelineTypeMap[row.paymentType || ''] || row.pipelineType || 'registration';
            mappedPayments.push({
              id: row.paymentId || `pay_${Math.random().toString(36).slice(2)}`,
              candidateId: row.candidateId,
              candidateName: row.candidateName || '',
              paymentType: row.paymentType || pipelineKey,
              amount: parseFloat(row.amount) || 0,
              paymentDate: row.paymentDate || '',
              remarks: row.remarks || '',
              createdAt: row.createdAt || row.timestamp || '',
              pipelineType: pipelineKey as import('@/types').PipelineType,
              timestamp: row.createdAt || row.timestamp || '',
              userStamp: row.userStamp || 'System',
            });
          });
        }

        set((state) => ({
          candidates: mappedCandidates,
          trackedCandidates: mergedTracked,
          paymentRecords: mappedPayments,
          syncStatus: 'success',
          lastSyncTimestamp: response.timestamp || new Date().toISOString(),
          lastSyncResult: syncResult,
          dataSource: state.settings.isOfflineMode ? 'local' : 'gas',
          isFetchingData: false,
          cacheMetadata: { ...state.cacheMetadata, candidates: Date.now() },
        }));
        
        get().loadAuditLogs();


        if (syncResult && syncResult.synced > 0) {
          get().showToast(
            `✓ ${syncResult.synced} new candidate${syncResult.synced > 1 ? 's' : ''} synced from Google Form`,
            'success'
          );
        }

        console.log('[store] Loaded', mappedCandidates.length, 'candidates from GAS');
        return;
      }

      if (!response.success) {
        console.error('[store] GAS error:', response.error);
        set({ syncStatus: 'error', isFetchingData: false });
        get().showToast(`GAS Error: ${response.error || 'Unknown error'}`, 'error');
        return;
      }

      // GAS returned success=true but no candidates
      console.warn('[store] GAS returned no candidates. Response:', JSON.stringify(response).slice(0, 200));
      set({ syncStatus: 'success', lastSyncTimestamp: new Date().toISOString(), isFetchingData: false });

    } catch (err) {
      console.error('[store] fetchInitialData failed:', err);
      set({ syncStatus: 'error', isFetchingData: false });
    }
  },

  // ─── Manual sync trigger ────────────────────────────────────
  syncCandidates: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const result = await sheetsApi.syncCandidates();
      // After sync, refresh the full data (force refresh)
      await get().fetchInitialData(true);
      await get().refreshDashboard(true);
      await get().loadAuditLogs(true);
      set({ lastSyncResult: result });
      return result;
    } catch (err) {
      set({ syncStatus: 'error' });
      console.error('[store] syncCandidates failed:', err);
      return null;
    }
  },

  refreshDashboard: async (force = false) => {
    try {
      if (!force && get().cacheMetadata.metrics) {
        if (Date.now() - get().cacheMetadata.metrics! < 5 * 60 * 1000) return;
      }
      const metrics = await sheetsApi.getDashboardMetrics();
      if (metrics && metrics.success) {
        set((state) => ({ 
          dashboardMetrics: metrics,
          cacheMetadata: { ...state.cacheMetadata, metrics: Date.now() }
        }));
      }
    } catch (err) {
      console.error('[store] refreshDashboard failed:', err);
    }
  },

  rebuildFinancialLedger: async () => {
    try {
      const response = await sheetsApi.rebuildFinancialLedger();
      if (!response || !response.success) {
        return { success: false, error: response?.error || 'Failed to rebuild ledger' };
      }
      // Re-fetch data to reflect the rebuilt ledger (force refresh)
      await get().fetchInitialData(true);
      return { success: true, summary: response.summary };
    } catch (err: any) {
      console.error('[store] Error rebuilding ledger:', err);
      return { success: false, error: err.message || 'Error rebuilding ledger' };
    }
  },

  // ─── Filters & Dashboard ────────────────────────────────────────
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
  updateCandidate: (id, updates) => {
    // 1. Update local state immediately for fast UI
    set((s) => ({
      candidates: s.candidates.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));

    // 2. Fire and forget the API call to update Google Sheets / local db
    sheetsApi.updateCandidate(id, updates).catch((err) => {
      console.error('[store] Failed to save update to GAS:', err);
      // Optional: Add a toast mechanism here to alert the user of save failure
    });
  },

  setPendingDocumentUpdate: (candidateId, type, data) => set((s) => ({
    pendingDocumentUpdates: {
      ...s.pendingDocumentUpdates,
      [candidateId]: {
        ...s.pendingDocumentUpdates[candidateId],
        [type]: data
      }
    }
  })),

  clearPendingDocumentUpdate: (candidateId, type) => set((s) => {
    const nextUpdates = { ...s.pendingDocumentUpdates };
    if (nextUpdates[candidateId]) {
      nextUpdates[candidateId] = { ...nextUpdates[candidateId] };
      delete nextUpdates[candidateId][type];
      if (Object.keys(nextUpdates[candidateId]).length === 0) {
        delete nextUpdates[candidateId];
      }
    }
    return { pendingDocumentUpdates: nextUpdates };
  }),
  updateFinancialPipeline: (candidateId, pipelineType, updates) => {
    // 1. Optimistic Update (UI)
    set((s) => ({
      candidates: s.candidates.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          financials: c.financials.map((f) =>
            f.pipelineType === pipelineType ? { ...f, ...updates } : f
          ),
        };
      }),
    }));

    // 2. Persist to backend
    const state = get();
    const candidate = state.candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    const pipeline = candidate.financials.find(f => f.pipelineType === pipelineType);
    if (!pipeline) return;

    sheetsApi.updateFinancialPipeline(
      candidateId, 
      pipelineType, 
      pipeline.baseFee, 
      pipeline.adjustments
    ).then(() => {
      // Re-fetch data silently to ensure local state perfectly matches the server after save
      get().fetchInitialData(true, true);
    }).catch(err => {
      console.error('[store] Failed to save financial pipeline:', err);
    });
  },

  // ─── Settings ───────────────────────────────────────────────
  updateSettings: (settings) => {
    const previousSettings = get().settings;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pycrm-gas-url', settings.gasWebAppUrl);
      window.localStorage.setItem('pycrm-settings', JSON.stringify(settings));
    }
    set({ settings, dataSource: settings.isOfflineMode ? 'local' : 'gas' });
    
    // Auto-refresh if the connection mode changes
    if (previousSettings.isOfflineMode !== settings.isOfflineMode) {
      get().fetchInitialData();
    }
  },

  // ─── Financial & logs ───────────────────────────────────────
  addPaymentRecord: async (payment) => {
    // PRE-SAVE VALIDATION
    if (!payment.candidateId || !payment.candidateName) {
      return { success: false, error: 'Candidate ID or Name is missing.' };
    }
    if (!payment.pipelineType || !payment.paymentType) {
      return { success: false, error: 'Payment Type or Pipeline is missing.' };
    }
    if (isNaN(payment.amount) || payment.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' };
    }
    if (!payment.paymentDate) {
      return { success: false, error: 'Payment date is missing.' };
    }

    // Map payment type label to pipeline key for local state update
    const pipelineTypeMap: Record<string, string> = {
      'Registration': 'registration',
      'Registration Fee': 'registration',
      'Course Fee': 'course',
      'Document Fee': 'document',
      'Document': 'document',
      'Placement Fee': 'placement',
      'Placement': 'placement',
    };
    const mappedType = pipelineTypeMap[payment.paymentType || ''];
    const pipelineKey = payment.pipelineType || (mappedType as PipelineType) || 'registration';

    // 1. Optimistic Update (will revert if GAS fails)
    const originalCandidates = get().candidates;
    const originalPaymentRecords = get().paymentRecords;

    set((s) => ({
      paymentRecords: [payment, ...s.paymentRecords],
      candidates: s.candidates.map((c) => {
        if (c.id !== payment.candidateId) return c;
        return {
          ...c,
          financials: c.financials.map((f) => {
            if (f.pipelineType !== pipelineKey) return f;
            return { ...f, paidToDate: f.paidToDate + payment.amount };
          }),
        };
      }),
    }));

    // 2. Persist to Google Sheets
    const candidate = get().candidates.find((c) => c.id === payment.candidateId);
    
    const payload = {
      candidateId:    payment.candidateId,
      candidateName:  payment.candidateName || candidate?.fullName || '',
      paymentType:    payment.paymentType || pipelineKey,
      pipelineType:   pipelineKey,
      amount:         payment.amount,
      paymentDate:    payment.paymentDate,
      remarks:        payment.remarks || payment.notes || '',
      transactionRef: payment.transactionRef || '',
      notes:          payment.notes || payment.remarks || '',
      userStamp:      payment.userStamp || 'Python HR',
      timestamp:      payment.timestamp || new Date().toISOString(),
    };

    console.log('--- [STEP 3a] useStore: Payload passed to sheetsApi ---', payload);

    // Run the backend sync asynchronously so we don't block the UI
    (async () => {
      try {
        await sheetsApi.addPayment(payload);
        
        // 3. Post-save refresh to ensure full consistency with GAS ledger
        await get().loadPaymentsForCandidate(payment.candidateId, true);
        await get().loadAuditLogs(true);
      } catch (err: any) {
        console.error('[store] Failed to save payment to GAS:', err);
        // Revert optimistic update
        set({ candidates: originalCandidates, paymentRecords: originalPaymentRecords });
      }
    })();

    return { success: true };
  },
  updatePaymentRecord: async (paymentId, updates) => {
    const state = get();
    const existing = state.paymentRecords.find(p => p.id === paymentId);
    if (!existing) return { success: false, error: 'Payment not found locally' };

    const originalCandidates = state.candidates;
    const originalPaymentRecords = state.paymentRecords;

    const oldAmount = existing.amount;
    const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;
    const oldPipelineType = existing.pipelineType;
    
    // Map payment type label to pipeline key for local state update
    const pipelineTypeMap: Record<string, string> = {
      'Registration': 'registration', 'Registration Fee': 'registration',
      'Course Fee': 'course',
      'Document Fee': 'document', 'Document': 'document',
      'Placement Fee': 'placement', 'Placement': 'placement',
    };
    const mappedType = pipelineTypeMap[updates.paymentType || existing.paymentType || ''];
    const newPipelineType = updates.pipelineType || (mappedType as import('@/types').PipelineType) || oldPipelineType;

    // 1. Optimistic Update
    set((s) => {
      const updatedPayment = { ...existing, ...updates, pipelineType: newPipelineType as import('@/types').PipelineType };
      
      const nextCandidates = s.candidates.map((c) => {
        if (c.id !== existing.candidateId) return c;
        return {
          ...c,
          financials: c.financials.map((f) => {
            let nextPaidToDate = f.paidToDate;
            if (f.pipelineType === oldPipelineType) {
              nextPaidToDate -= oldAmount; // Remove from old
            }
            if (f.pipelineType === newPipelineType) {
              nextPaidToDate += newAmount; // Add to new
            }
            return { ...f, paidToDate: nextPaidToDate };
          }),
        };
      });

      return {
        paymentRecords: s.paymentRecords.map(p => p.id === paymentId ? updatedPayment : p),
        candidates: nextCandidates
      };
    });

    (async () => {
      try {
        await sheetsApi.updatePayment(paymentId, updates);
        
        // Refresh
        await get().loadPaymentsForCandidate(existing.candidateId, true);
        await get().loadAuditLogs(true);
      } catch (err: any) {
        console.error('[store] Failed to update payment in GAS:', err);
        // Revert optimistic update
        set({ candidates: originalCandidates, paymentRecords: originalPaymentRecords });
      }
    })();

    return { success: true };
  },

  addAuditLog: (log) => set((s) => ({
    auditLogs: [log, ...s.auditLogs],
  })),

  loadAuditLogs: async (force = false) => {
    try {
      if (!force && get().cacheMetadata.auditLogs) {
        if (Date.now() - get().cacheMetadata.auditLogs! < 5 * 60 * 1000) return;
      }
      const logs = await sheetsApi.getAuditLogsForCandidate('');
      if (logs && logs.length > 0) {
        const mappedLogs: AuditLogEntry[] = logs.map(row => {
          let logType: 'financial' | 'structural' | 'bgv' = 'structural';
          const act = (row.actionType || '').toLowerCase();
          if (act.includes('payment')) logType = 'financial';
          if (act.includes('bgv')) logType = 'bgv';
          
          let desc = row.actionType;
          
          const isJson = (str: string) => {
            try { JSON.parse(str); return true; } catch { return false; }
          };

          if (row.oldValue && row.newValue) {
            if (isJson(row.oldValue) && isJson(row.newValue)) {
              try {
                const oldObj = JSON.parse(row.oldValue);
                const newObj = JSON.parse(row.newValue);
                let changedKey = '';
                let oldVal = false;
                let newVal = false;
                for (const k in newObj) {
                  if (String(oldObj[k]) !== String(newObj[k])) {
                    changedKey = k;
                    oldVal = oldObj[k] === true || String(oldObj[k]).toLowerCase() === 'true';
                    newVal = newObj[k] === true || String(newObj[k]).toLowerCase() === 'true';
                    break;
                  }
                }
                
                if (changedKey) {
                  const labelMap: Record<string, string> = {
                    offerLetter: 'Offer Letter',
                    appraisals: 'Appraisals',
                    payslips: 'Payslips',
                    relievingLetter: 'Relieving Letter',
                    counterOffer: 'Counter Offer'
                  };
                  const label = labelMap[changedKey] || changedKey;
                  
                  let actionWord = '';
                  const lowerAction = (row.actionType || '').toLowerCase();
                  if (lowerAction.includes('received')) {
                    actionWord = 'Received';
                  } else if (lowerAction.includes('applied')) {
                    actionWord = 'Applied';
                  } else {
                    actionWord = 'Document'; // Fallback for historical 'Candidate Updated'
                  }
                  
                  if (newVal === true) {
                    desc = `${label} ${actionWord}`;
                    if (actionWord === 'Document') desc = `${label} Document Updated`;
                  } else {
                    desc = `${label} ${actionWord} Removed`;
                    if (actionWord === 'Document') desc = `${label} Document Removed`;
                  }
                } else {
                  desc += ` ${row.oldValue} → ${row.newValue}`;
                }
              } catch {
                desc += ` ${row.oldValue} → ${row.newValue}`;
              }
            } else {
              desc += ` ${row.oldValue} → ${row.newValue}`;
            }
          } else if (row.newValue) {
            desc += ` ${row.newValue}`;
          }

          return {
            id: row.auditId || `log_${Date.now()}_${Math.random()}`,
            candidateId: row.candidateId,
            logType,
            description: desc,
            reason: '',
            userStamp: row.user || 'System',
            timestamp: row.timestamp || new Date().toISOString()
          };
        });

        set((state) => ({ 
          auditLogs: mappedLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
          cacheMetadata: { ...state.cacheMetadata, auditLogs: Date.now() }
        }));
      }
    } catch (err) {
      console.warn('[store] loadAuditLogs failed:', err);
    }
  },

  // ─── Load real financials from GAS (Financial_Ledger) ──────────────
  loadPaymentsForCandidate: async (candidateId, force = false) => {
    try {
      if (!force && get().cacheMetadata.payments[candidateId]) {
        if (Date.now() - get().cacheMetadata.payments[candidateId] < 5 * 60 * 1000) {
          console.log('[store] loadPaymentsForCandidate using cached data for', candidateId);
          return;
        }
      }

      // ── PRIMARY: read from Financial_Ledger (authoritative, server-side calculated)
      const ledgerRows = await sheetsApi.getFinancialsForCandidate(candidateId);

      if (ledgerRows && ledgerRows.length > 0) {
        // Build per-pipeline financial data from the ledger
        set((s) => ({
          candidates: s.candidates.map((c) => {
            if (c.id !== candidateId) return c;
            return {
              ...c,
              financials: c.financials.map((f) => {
                // Find the matching ledger row for this pipelineType
                const row = ledgerRows.find(
                  (r) => r.pipelineType === f.pipelineType
                );
                if (!row) return f;
                
                const parsedBaseFee = parseFloat(row.baseFee);
                const baseFee = !isNaN(parsedBaseFee) ? parsedBaseFee : f.baseFee;
                
                const parsedTotalAdj = parseFloat(row.totalAdjustments);
                const totalAdj = !isNaN(parsedTotalAdj) ? parsedTotalAdj : 0;
                
                const parsedPaidToDate = parseFloat(row.paidToDate);
                const paidToDate = !isNaN(parsedPaidToDate) ? parsedPaidToDate : 0;
                
                let adjustments = [];
                if (row.adjustmentsJson) {
                  try {
                    adjustments = JSON.parse(row.adjustmentsJson);
                  } catch (e) {
                    console.warn('[store] Failed to parse adjustmentsJson', e);
                  }
                }
                
                if (adjustments.length === 0 && totalAdj !== 0) {
                  adjustments = [{ id: 'server_adj', amount: totalAdj, label: 'Server adjustment', reason: '', createdAt: '', userStamp: '' }];
                }
                
                return {
                  ...f,
                  baseFee,
                  adjustments,
                  paidToDate,
                };
              }),
            };
          }),
          cacheMetadata: { ...s.cacheMetadata, payments: { ...s.cacheMetadata.payments, [candidateId]: Date.now() } },
        }));
        console.log('[store] Financial_Ledger loaded for', candidateId, '-', ledgerRows.length, 'pipelines');
        return;
      }

      // ── FALLBACK: if ledger is empty, sum from Payment_Records directly
      const rows = await sheetsApi.getPaymentsForCandidate(candidateId);
      if (!rows || rows.length === 0) return;

      const pipelineTypeMap: Record<string, string> = {
        'registration': 'registration', 'Registration': 'registration', 'Registration Fee': 'registration',
        'course': 'course',             'course fee': 'course',         'Course Fee': 'course',
        'document': 'document',         'document fee': 'document',     'Document Fee': 'document', 'Document': 'document',
        'placement': 'placement',       'placement fee': 'placement',   'Placement Fee': 'placement', 'Placement': 'placement',
      };

      const totals: Record<string, number> = { registration: 0, course: 0, document: 0, placement: 0 };

      const paymentRecords = rows.map((row) => {
        const pipelineKey = pipelineTypeMap[row.paymentType || ''] || row.pipelineType || 'registration';
        totals[pipelineKey] = (totals[pipelineKey] || 0) + (parseFloat(row.amount) || 0);
        return {
          id: row.paymentId || `pay_${Math.random().toString(36).slice(2)}`,
          candidateId: row.candidateId || candidateId,
          candidateName: row.candidateName || '',
          paymentType: row.paymentType || pipelineKey,
          amount: parseFloat(row.amount) || 0,
          paymentDate: row.paymentDate || '',
          remarks: row.remarks || '',
          createdAt: row.createdAt || row.timestamp || '',
          pipelineType: pipelineKey as import('@/types').PipelineType,
          timestamp: row.createdAt || row.timestamp || '',
          userStamp: 'Python HR',
        };
      });

      set((s) => ({
        paymentRecords: [
          ...paymentRecords,
          ...s.paymentRecords.filter((p) => p.candidateId !== candidateId),
        ],
        candidates: s.candidates.map((c) => {
          if (c.id !== candidateId) return c;
          return {
            ...c,
            financials: c.financials.map((f) => ({
              ...f,
              paidToDate: totals[f.pipelineType] ?? f.paidToDate,
            })),
          };
        }),
        cacheMetadata: { ...s.cacheMetadata, payments: { ...s.cacheMetadata.payments, [candidateId]: Date.now() } },
      }));
    } catch (err) {
      console.error('[store] loadPaymentsForCandidate failed:', err);
    }
  },

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
        c.course.toLowerCase().includes(q) ||
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

  getCalculatedDashboardMetrics: () => {
    const { getFilteredCandidates, paymentRecords } = get();
    const filteredCandidates = getFilteredCandidates();
    
    // Revenue is calculated based on payments made by the filtered candidates
    let revenue = 0;
    const candidateIds = new Set(filteredCandidates.map(c => c.id));
    
    paymentRecords.forEach(p => {
      if (candidateIds.has(p.candidateId)) {
        revenue += p.amount;
      }
    });

    let pendingDues = 0;
    let placedCount = 0;
    let newJoinees = 0;
    let bgvPending = 0;
    let bgvCompleted = 0;
    let addedToday = 0;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    filteredCandidates.forEach(c => {
      if (c.placed) placedCount++;
      if (c.bgvStatus === 'pending' || c.bgvStatus === 'submitted') bgvPending++;
      if (c.bgvStatus === 'cleared') bgvCompleted++;
      
      const doj = c.dateOfJoining ? new Date(c.dateOfJoining) : null;
      if (doj && doj.getMonth() === now.getMonth() && doj.getFullYear() === now.getFullYear()) {
        newJoinees++;
      }
      if (c.dateOfJoining && c.dateOfJoining.startsWith(todayStr)) {
        addedToday++;
      }
      
      c.financials.forEach(f => {
        const netPayable = f.baseFee + f.adjustments.reduce((sum, a) => sum + a.amount, 0);
        const due = netPayable - f.paidToDate;
        if (due > 0) pendingDues += due;
      });
    });

    return {
      totalCandidates: filteredCandidates.length,
      newJoinees,
      bgvPending,
      bgvCompleted,
      placedCount,
      revenue,
      paymentsReceived: 0,
      pendingDues,
      documentsPending: 0,
      addedToday
    };
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
