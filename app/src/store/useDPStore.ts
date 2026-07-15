import { create } from 'zustand';
import type {
  DPCandidate,
  DPAdjustment,
  DPAuditLogEntry,
  DPPaymentRecord,
  DPDashboardMetrics,
  DPFinancialPipeline,
  DPDocumentType,
} from '@/types/dp';
import { dpSheetsApi } from '@/services/dpSheetsApi';

// ── Default pipeline configuration for every DP candidate ──
const DEFAULT_DP_PIPELINES: DPFinancialPipeline[] = [
  { pipelineType: 'registration', baseFee: 0, adjustments: [], paidToDate: 0 },
  { pipelineType: 'course', baseFee: 0, adjustments: [], paidToDate: 0 },
  { pipelineType: 'document', baseFee: 0, adjustments: [], paidToDate: 0 },
  { pipelineType: 'placement', baseFee: 0, adjustments: [], paidToDate: 0 },
];

function hasLoadedDPFinancialData(financials: DPFinancialPipeline[] | undefined): boolean {
  if (!financials || !Array.isArray(financials)) return false;
  return financials.some((pipeline) => {
    return (
      Number(pipeline.baseFee || 0) !== 0 ||
      Number(pipeline.paidToDate || 0) !== 0 ||
      Number(pipeline.netPayable || 0) !== 0 ||
      Number(pipeline.pendingDues || 0) !== 0 ||
      Number(pipeline.overpaidAmount || 0) !== 0 ||
      (Array.isArray(pipeline.adjustments) && pipeline.adjustments.length > 0)
    );
  });
}

// ── Pipeline type label ↔ key mapping ──
const PIPELINE_TYPE_MAP: Record<string, string> = {
  'Registration Fee': 'registration',
  'Course Fee': 'course',
  'Document Fee': 'document',
  'Placement Fee': 'placement',
  'Placement Payment': 'placement',
  'registration': 'registration',
  'course': 'course',
  'document': 'document',
  'placement': 'placement',
};

interface DPState {
  candidates: DPCandidate[];
  auditLogs: DPAuditLogEntry[];
  paymentRecords: DPPaymentRecord[];
  activeProfileId: string | null;
  searchQuery: string;
  statusFilter: string;
  bgvFilter: string;
  companyFilter: string;
  experienceFilter: string;
  paymentFilter: string;
  yopFilter: string;
  globalEditMode: boolean;
  sidebarOpen: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  isFetchingData: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  dashboardMetrics: DPDashboardMetrics | null;
  
  pendingDirectMutations: Record<string, boolean>; // by placementId
  
  adjustmentsByPlacementId: Record<string, DPAdjustment[]>;
  loadDirectAdjustments: (placementId: string, force?: boolean) => Promise<void>;
  addDirectAdjustment: (payload: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  updateDirectAdjustment: (payload: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  deleteDirectAdjustment: (payload: Record<string, any>) => Promise<{ success: boolean; error?: string }>;

  
  // Actions
  setSearchQuery: (q: string) => void;
  setStatusFilter: (v: string) => void;
  setBgvFilter: (v: string) => void;
  setCompanyFilter: (v: string) => void;
  setExperienceFilter: (v: string) => void;
  setPaymentFilter: (v: string) => void;
  setYopFilter: (v: string) => void;
  clearSearchQuery: () => void;
  setActiveProfileId: (id: string | null) => void;
  toggleGlobalEdit: () => void;
  setSidebarOpen: (open: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  
  updateCandidate: (id: string, updates: Partial<DPCandidate>) => void;
  fetchInitialData: (force?: boolean, isBackground?: boolean) => Promise<void>;
  syncCandidates: () => Promise<any>;
  refreshDashboard: (force?: boolean) => Promise<void>;
  loadPaymentsForCandidate: (placementId: string, force?: boolean) => Promise<void>;
  loadAuditLogs: (placementId?: string, force?: boolean) => Promise<void>;
  addPaymentRecord: (payment: DPPaymentRecord) => Promise<{ success: boolean; error?: string }>;
  updatePaymentRecord: (paymentId: string, updates: Partial<DPPaymentRecord>) => Promise<{ success: boolean; error?: string }>;
  deletePaymentRecord: (paymentId: string) => Promise<{ success: boolean; error?: string }>;
  updateFinancialPipeline: (candidateId: string, pipelineType: string, updates: Partial<DPFinancialPipeline>) => void;
  recalculateDirectFinancialsLocally: (placementId: string, pipelineType: string) => void;
  
  toggleDocumentStatus: (placementId: string, documentType: DPDocumentType, status: boolean, performedBy: string) => Promise<void>;
  uploadDocument: (placementId: string, documentType: DPDocumentType, file: File, performedBy: string) => Promise<void>;
  deleteDocument: (placementId: string, documentType: DPDocumentType, performedBy: string) => Promise<void>;
}

function mapGasRowToDPCandidate(rawRow: Record<string, string>): DPCandidate {
  console.log('[DP STORE] RAW CANDIDATE:', rawRow);
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    row[cleanKey] = value;
  }
  console.log('[DP STORE] BGV STATUS:', row.bgvstatus);
  const toBoolean = (value: unknown): boolean => {
    if (value === true) return true;
    const normalized = String(value ?? "").trim().toLowerCase();
    return (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "1" ||
      normalized === "received"
    );
  };

  const mappedCandidate: DPCandidate = {
    placementId: row.placementid || `dp_${Math.random().toString(36).slice(2)}`,
    fullName: row.fullname || '',
    mobileNumber: row.mobilenumber || '',
    yearOfPassing: row.yearofpassing || '',
    currentlyWorking: row.currentlyworking || '',
    experienceType: row.experiencetype || '',
    companyName: row.companyname || '',
    designation: row.designation || '',
    ctc: row.ctc || '',
    offerLetter: toBoolean(row.offerletter),
    relievingLetter: toBoolean(row.relievingletter),
    pfServiceHistory: toBoolean(row.pfservicehistory),
    payslip: toBoolean(row.payslip),
    documents: {
      offerLetter: toBoolean(row.offerletter),
      offerLetterUrl: row.offerletterurl,
      relievingLetter: toBoolean(row.relievingletter),
      relievingLetterUrl: row.relievingletterurl,
      pfServiceHistory: toBoolean(row.pfservicehistory),
      pfServiceHistoryUrl: row.pfservicehistoryurl,
      payslip: toBoolean(row.payslip),
      payslipUrl: row.payslipurl,
    },
    bgvStatus: String(row.bgvstatus || 'PENDING').trim().toUpperCase() as any,
    dateOfBirth: row.dateofbirth || '',
    fatherName: row.fathername || '',
    alternateContact: row.alternatecontact || '',
    address: row.address || '',
    pincode: row.pincode || '',
    courseName: row.coursename || '',
    batch: row.batch || '',
    documentAmount: String(row.documentamount || ''),
    bgvSubmittedAt: row.bgvsubmittedat || '',
    candidateStatus: (row.candidatestatus || 'active') as any,
    trackedStatus: row.trackedstatus || '',
    trackedAt: row.trackedat || '',
    createdAt: row.createdat || '',
    updatedAt: row.updatedat || '',
    remarks: row.remarks || '',
    financials: DEFAULT_DP_PIPELINES.map(p => ({ ...p, adjustments: [] })),
  };
  console.log('[DP STORE] MAPPED CANDIDATE:', mappedCandidate);
  return mappedCandidate;
}

export const useDPStore = create<DPState>((set, get) => ({
  candidates: [],
  auditLogs: [],
  paymentRecords: [],
  activeProfileId: null,
  pendingDirectMutations: {},
  searchQuery: '',
  statusFilter: '',
  bgvFilter: '',
  companyFilter: '',
  experienceFilter: '',
  paymentFilter: '',
  yopFilter: '',
  globalEditMode: false,
  sidebarOpen: false,
  toastMessage: null,
  toastType: 'success',
  isFetchingData: false,
  syncStatus: 'idle',
  dashboardMetrics: null,

  adjustmentsByPlacementId: {},

  setSearchQuery: (q) => set({ searchQuery: q }),
  setStatusFilter: (v) => set({ statusFilter: v }),
  setBgvFilter: (v) => set({ bgvFilter: v }),
  setCompanyFilter: (v) => set({ companyFilter: v }),
  setExperienceFilter: (v) => set({ experienceFilter: v }),
  setPaymentFilter: (v) => set({ paymentFilter: v }),
  setYopFilter: (v) => set({ yopFilter: v }),
  clearSearchQuery: () => set({ searchQuery: '' }),
  setActiveProfileId: (id) => set({ activeProfileId: id, sidebarOpen: false }),
  toggleGlobalEdit: () => set((s) => ({ globalEditMode: !s.globalEditMode })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  showToast: (message, type = 'success') => set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null }),

  updateCandidate: (id, updates) => {
    set((s) => ({
      candidates: s.candidates.map((c) => (c.placementId === id ? { ...c, ...updates } : c)),
    }));
    dpSheetsApi.updateCandidate(id, updates).catch((err) => {
      console.error('[dpStore] Failed to save update:', err);
    });
  },

  fetchInitialData: async (_force = false, isBackground = false) => {
    if (get().isFetchingData) return;
    if (isBackground) {
      set({ syncStatus: 'syncing' });
    } else {
      set({ isFetchingData: true, syncStatus: 'syncing' });
    }

    try {
      const { searchQuery, statusFilter, bgvFilter, companyFilter, experienceFilter, paymentFilter, yopFilter, activeProfileId } = get();
      const response = await dpSheetsApi.fetchAllData({
        search: searchQuery,
        status: statusFilter,
        bgv: bgvFilter,
        company: companyFilter,
        experience: experienceFilter,
        payment: paymentFilter,
        yop: yopFilter,
        activeProfileId: activeProfileId
      });
      if (response.success && response.candidates) {
        const mapped = response.candidates.map(mapGasRowToDPCandidate);
        
        // Preserve deep state (financials) during polling merge intelligently
        const currentCandidates = get().candidates;
        const merged = mapped.map((newC: any) => {
          const existing = currentCandidates.find((c: any) => c.placementId === newC.placementId);
          if (!existing) {
            return newC;
          }
          
          const incomingHasFinancialData = hasLoadedDPFinancialData(newC.financials);
          const hasPendingMutation = get().pendingDirectMutations[newC.placementId];

          return {
            ...newC,
            financials: (incomingHasFinancialData && !hasPendingMutation) ? newC.financials : existing.financials
          };
        });

        set({
          candidates: merged,
          syncStatus: 'success',
          isFetchingData: false,
        });
      } else {
        set({ syncStatus: 'error', isFetchingData: false });
      }
    } catch (_err) {
      set({ syncStatus: 'error', isFetchingData: false });
    }
  },

  syncCandidates: async () => {
    set({ syncStatus: 'syncing' });
    try {
      const resultReg = await dpSheetsApi.syncCandidates();
      const resultBgv = await dpSheetsApi.syncBGV();
      await get().fetchInitialData(true);
      await get().refreshDashboard(true);
      return { registration: resultReg, bgv: resultBgv };
    } catch (_err) {
      set({ syncStatus: 'error' });
      return null;
    }
  },

  refreshDashboard: async () => {
    try {
      const metrics = await dpSheetsApi.getDashboardMetrics();
      if (metrics && metrics.success) {
        set({ dashboardMetrics: metrics });
      }
    } catch (_err) {}
  },

  // ══════════════════════════════════════════════════════
  //  LOAD PAYMENTS + FINANCIALS FOR A CANDIDATE
  // ══════════════════════════════════════════════════════

  loadDirectAdjustments: async (placementId) => {
    try {
      const adjustments = await dpSheetsApi.getDirectAdjustments(placementId);
      set((s) => ({
        adjustmentsByPlacementId: {
          ...s.adjustmentsByPlacementId,
          [placementId]: adjustments || [],
        },
      }));
    } catch (err) {
      console.error('[dpStore] loadDirectAdjustments failed:', err);
    }
  },

  addDirectAdjustment: async (payload) => {
    const tempId = `adj_temp_${Date.now()}`;
    const auditTempId = `audit_temp_adj_${Date.now()}`;
    
    try {
      // 1. Optimistic Audit Log
      const optimisticLog = {
        id: auditTempId,
        placementId: payload.placementId,
        candidateName: payload.candidateName || 'Unknown',
        moduleName: 'FINANCE',
        actionType: 'ADJUSTMENT_ADDED',
        description: `${payload.pipelineType || ''} ${payload.adjustmentType || 'DISCOUNT'} of Rs. ${payload.amount} added`,
        oldValue: '',
        newValue: `${payload.adjustmentType}:${payload.amount}`,
        userStamp: payload.userStamp || 'Python HR',
        timestamp: new Date().toISOString()
      } as unknown as DPAuditLogEntry;

      // 2. Set Pending Mutation Lock & Update Store
      set((s) => ({
        pendingDirectMutations: { ...s.pendingDirectMutations, [payload.placementId]: true },
        auditLogs: [optimisticLog, ...s.auditLogs],
        adjustmentsByPlacementId: {
          ...s.adjustmentsByPlacementId,
          [payload.placementId]: [
            ...(s.adjustmentsByPlacementId[payload.placementId] || []),
            { ...payload, amount: String(payload.amount), adjustmentId: tempId }
          ]
        }
      }));
      
      // 3. Immediately recalculate candidate financials locally
      const { recalculateDirectFinancialsLocally } = get() as any;
      if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payload.placementId, payload.pipelineType);

      // 4. Call Backend
      const apiPayload = { ...payload, clientMutationId: tempId };
      const res = await dpSheetsApi.addDirectAdjustment(apiPayload);
      
      if (res && res.success) {
        // 5. Replace temp adjustment with confirmed adjustment
        set((s) => {
          const adjs = s.adjustmentsByPlacementId[payload.placementId] || [];
          return {
            adjustmentsByPlacementId: {
              ...s.adjustmentsByPlacementId,
              [payload.placementId]: adjs.map(a => a.adjustmentId === tempId ? res.adjustment : a)
            }
          };
        });
        
        // 6. Update ledger directly with confirmed financial data
        if (res.financial) {
           set((s) => ({
             candidates: s.candidates.map(c => {
               if (c.placementId !== payload.placementId) return c;
               const newFins = [...c.financials];
               const fIdx = newFins.findIndex(f => f.pipelineType.toLowerCase() === payload.pipelineType.toLowerCase());
               if (fIdx > -1) {
                 newFins[fIdx] = { ...newFins[fIdx], ...res.financial };
               }
               return { ...c, financials: newFins };
             })
           }));
        }
        
        // 7. Replace temp audit log with confirmed log
        if (res.auditLog) {
           set((s) => ({
             auditLogs: s.auditLogs.map(l => l.id === auditTempId ? res.auditLog : l)
           }));
        }
        
        // 8. Clear Pending Lock
        set((s) => {
           const next = { ...s.pendingDirectMutations };
           delete next[payload.placementId];
           return { pendingDirectMutations: next };
        });
        
        // Background refresh dashboard
        get().refreshDashboard(true).catch(console.error);
        return { success: true };
      }
      throw new Error(res.error || 'Failed to add adjustment');
    } catch (err: any) {
      // Rollback
      set((s) => {
        const next = { ...s.pendingDirectMutations };
        delete next[payload.placementId];
        return {
          pendingDirectMutations: next,
          auditLogs: s.auditLogs.filter(l => l.id !== auditTempId),
          adjustmentsByPlacementId: {
            ...s.adjustmentsByPlacementId,
            [payload.placementId]: (s.adjustmentsByPlacementId[payload.placementId] || []).filter(a => a.adjustmentId !== tempId)
          }
        };
      });
      const { recalculateDirectFinancialsLocally } = get() as any;
      if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payload.placementId, payload.pipelineType);
      
      throw err;
    }
  },

  updateDirectAdjustment: async (payload) => {
    const auditTempId = `audit_temp_adj_upd_${Date.now()}`;
    const updates = payload.updates || {};
    
    try {
      const existingAdjs = get().adjustmentsByPlacementId[payload.placementId] || [];
      const oldAdj = existingAdjs.find(a => a.adjustmentId === payload.adjustmentId);
      if (!oldAdj) throw new Error("Adjustment not found locally");
      
      const nextAdj = { ...oldAdj, ...updates };

      const optimisticLog = {
        id: auditTempId,
        placementId: payload.placementId,
        candidateName: oldAdj.candidateName || 'Unknown',
        moduleName: 'FINANCE',
        actionType: 'ADJUSTMENT_UPDATED',
        description: `${nextAdj.pipelineType || ''} Adjustment updated`,
        oldValue: `${oldAdj.adjustmentType}:${oldAdj.amount}`,
        newValue: `${nextAdj.adjustmentType}:${nextAdj.amount}`,
        userStamp: payload.userStamp || 'Python HR',
        timestamp: new Date().toISOString()
      } as unknown as DPAuditLogEntry;

      set((s) => ({
        pendingDirectMutations: { ...s.pendingDirectMutations, [payload.placementId]: true },
        auditLogs: [optimisticLog, ...s.auditLogs],
        adjustmentsByPlacementId: {
          ...s.adjustmentsByPlacementId,
          [payload.placementId]: existingAdjs.map(a => a.adjustmentId === payload.adjustmentId ? nextAdj : a)
        }
      }));
      
      const { recalculateDirectFinancialsLocally } = get() as any;
      if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payload.placementId, nextAdj.pipelineType);

      const res = await dpSheetsApi.updateDirectAdjustment(payload);
      if (res.success) {
        set((s) => {
          const adjs = s.adjustmentsByPlacementId[payload.placementId] || [];
          return {
            adjustmentsByPlacementId: {
              ...s.adjustmentsByPlacementId,
              [payload.placementId]: adjs.map(a => a.adjustmentId === payload.adjustmentId ? res.adjustment : a)
            }
          };
        });
        
        if (res.financial) {
           set((s) => ({
             candidates: s.candidates.map(c => {
               if (c.placementId !== payload.placementId) return c;
               const newFins = [...c.financials];
               const fIdx = newFins.findIndex(f => f.pipelineType.toLowerCase() === res.financial.pipelineType.toLowerCase());
               if (fIdx > -1) newFins[fIdx] = { ...newFins[fIdx], ...res.financial };
               return { ...c, financials: newFins };
             })
           }));
        }
        
        if (res.auditLog) {
           set((s) => ({
             auditLogs: s.auditLogs.map(l => l.id === auditTempId ? res.auditLog : l)
           }));
        }
        
        set((s) => {
           const next = { ...s.pendingDirectMutations };
           delete next[payload.placementId];
           return { pendingDirectMutations: next };
        });
        
        get().refreshDashboard(true).catch(console.error);
        return { success: true };
      }
      throw new Error(res.error || 'Failed to update adjustment');
    } catch (err: any) {
      // Minimal rollback for updates would just reload
      await get().loadDirectAdjustments(payload.placementId);
      const { recalculateDirectFinancialsLocally } = get() as any;
      if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payload.placementId, payload.updates?.pipelineType || '');
      set((s) => {
         const next = { ...s.pendingDirectMutations };
         delete next[payload.placementId];
         return { pendingDirectMutations: next, auditLogs: s.auditLogs.filter(l => l.id !== auditTempId) };
      });
      return { success: false, error: err.message };
    }
  },

  deleteDirectAdjustment: async (payload) => {
    const auditTempId = `audit_temp_adj_del_${Date.now()}`;
    
    try {
      const existingAdjs = get().adjustmentsByPlacementId[payload.placementId] || [];
      const oldAdj = existingAdjs.find(a => a.adjustmentId === payload.adjustmentId);
      if (!oldAdj) throw new Error("Adjustment not found locally");

      const optimisticLog = {
        id: auditTempId,
        placementId: payload.placementId,
        candidateName: oldAdj.candidateName || 'Unknown',
        moduleName: 'FINANCE',
        actionType: 'ADJUSTMENT_DELETED',
        description: `${oldAdj.pipelineType || ''} ${oldAdj.adjustmentType || ''} of Rs. ${oldAdj.amount} deleted`,
        oldValue: `${oldAdj.adjustmentType}:${oldAdj.amount}`,
        newValue: '',
        userStamp: payload.userStamp || 'Python HR',
        timestamp: new Date().toISOString()
      } as unknown as DPAuditLogEntry;

      set((s) => ({
        pendingDirectMutations: { ...s.pendingDirectMutations, [payload.placementId]: true },
        auditLogs: [optimisticLog, ...s.auditLogs],
        adjustmentsByPlacementId: {
          ...s.adjustmentsByPlacementId,
          [payload.placementId]: existingAdjs.filter(a => a.adjustmentId !== payload.adjustmentId)
        }
      }));
      
      const { recalculateDirectFinancialsLocally } = get() as any;
      if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payload.placementId, oldAdj.pipelineType);

      const res = await dpSheetsApi.deleteDirectAdjustment(payload);
      if (res.success) {
        if (res.financial) {
           set((s) => ({
             candidates: s.candidates.map(c => {
               if (c.placementId !== payload.placementId) return c;
               const newFins = [...c.financials];
               const fIdx = newFins.findIndex(f => f.pipelineType.toLowerCase() === res.financial.pipelineType.toLowerCase());
               if (fIdx > -1) newFins[fIdx] = { ...newFins[fIdx], ...res.financial };
               return { ...c, financials: newFins };
             })
           }));
        }
        
        if (res.auditLog) {
           set((s) => ({
             auditLogs: s.auditLogs.map(l => l.id === auditTempId ? res.auditLog : l)
           }));
        }
        
        set((s) => {
           const next = { ...s.pendingDirectMutations };
           delete next[payload.placementId];
           return { pendingDirectMutations: next };
        });
        
        get().refreshDashboard(true).catch(console.error);
        return { success: true };
      }
      throw new Error(res.error || 'Failed to delete adjustment');
    } catch (err: any) {
      await get().loadDirectAdjustments(payload.placementId);
      const { recalculateDirectFinancialsLocally } = get() as any;
      if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payload.placementId, '');
      set((s) => {
         const next = { ...s.pendingDirectMutations };
         delete next[payload.placementId];
         return { pendingDirectMutations: next, auditLogs: s.auditLogs.filter(l => l.id !== auditTempId) };
      });
      return { success: false, error: err.message };
    }
  },

  loadPaymentsForCandidate: async (placementId) => {
    try {
      // 1. Load ledger rows (financial pipeline data from Direct_Financial_Ledger)
      const ledgerRows = await dpSheetsApi.getFinancialsForCandidate(placementId);

      // 2. Load payment records from Direct_Payment_Records
      const rows = await dpSheetsApi.getPaymentsForCandidate(placementId);

      // 3. Build per-pipeline paid totals from payment records
      const totals: Record<string, number> = {};
      const mappedPayments: DPPaymentRecord[] = [];

      if (rows && rows.length > 0) {
        rows.forEach((r: any) => {
          const pipelineKey = PIPELINE_TYPE_MAP[r.paymentType || ''] || r.pipelineType || 'registration';
          totals[pipelineKey] = (totals[pipelineKey] || 0) + (parseFloat(r.amount) || 0);
          mappedPayments.push({
            id: r.paymentId || `dp_pay_${Math.random().toString(36).slice(2)}`,
            placementId: r.placementId,
            candidateName: r.candidateName,
            paymentType: r.paymentType || pipelineKey,
            amount: parseFloat(r.amount) || 0,
            paymentDate: r.paymentDate || '',
            remarks: r.remarks || '',
            createdAt: r.createdAt || '',
            pipelineType: pipelineKey,
            transactionRef: r.transactionRef || '',
            notes: r.notes || r.remarks || '',
            timestamp: r.timestamp || r.createdAt || '',
            userStamp: r.userStamp || 'System',
          });
        });
      }

      // 4. Build financials: merge ledger data with defaults, then overlay paid totals
      set((s) => ({
        // Merge payment records (replace existing for this placementId)
        paymentRecords: [
          ...mappedPayments,
          ...s.paymentRecords.filter(p => p.placementId !== placementId),
        ],
        // Update candidates with financial data
        candidates: s.candidates.map((c) => {
          if (c.placementId !== placementId) return c;

          // Start from default pipelines
          let financials = DEFAULT_DP_PIPELINES.map(p => ({ ...p, adjustments: [] as any[] }));

          // Overlay ledger rows (may contain baseFee, adjustments, etc.)
          if (ledgerRows && ledgerRows.length > 0) {
            ledgerRows.forEach((r: any) => {
              const pt = r.pipelineType || 'registration';
              const existing = financials.find(f => f.pipelineType === pt);
              if (existing) {
                existing.baseFee = parseFloat(r.baseFee) || 0;
                existing.netPayable = parseFloat(r.netPayable) || 0;
                existing.pendingDues = parseFloat(r.pendingDues) || 0;
                existing.overpaidAmount = parseFloat(r.overpaidAmount) || 0;
                // DO NOT overwrite paidToDate from ledger if we are recalculating it from payments, 
                // but we map it initially.
                existing.paidToDate = parseFloat(r.paidToDate) || 0;
              } else {
                financials.push({
                  pipelineType: pt,
                  baseFee: parseFloat(r.baseFee) || 0,
                  adjustments: [],
                  paidToDate: parseFloat(r.paidToDate) || 0,
                  netPayable: parseFloat(r.netPayable) || 0,
                  pendingDues: parseFloat(r.pendingDues) || 0,
                  overpaidAmount: parseFloat(r.overpaidAmount) || 0,
                });
              }
            });
          }

          // Overlay paid totals from payment records (if we have real payments, use those for local state)
          financials = financials.map(f => ({
            ...f,
            paidToDate: totals[f.pipelineType] ?? f.paidToDate,
          }));

          return { ...c, financials };
        }),
      }));
    } catch (err) {
      console.error('[dpStore] loadPaymentsForCandidate failed:', err);
    }
  },

  // ══════════════════════════════════════════════════════
  //  LOAD AUDIT LOGS
  // ══════════════════════════════════════════════════════
  loadAuditLogs: async (placementId = '') => {
    try {
      const logs = await dpSheetsApi.getAuditLogsForCandidate(placementId);
      if (logs && logs.length > 0) {
        const mapped: DPAuditLogEntry[] = logs.map((row: any) => {
          const rawModule = String(row.category || row.module || '').trim().toUpperCase();
          const module = rawModule === 'FINANCIAL' ? 'FINANCE' : rawModule;
          
          return {
            auditId: row.logId || row.logid || row.auditId || row.auditid || `audit_${Math.random().toString(36).slice(2)}`,
            timestamp: row.timestamp || new Date().toISOString(),
            placementId: row.placementId || row.placementid || placementId,
            candidateName: row.candidateName || row.candidatename || '',
            module: module,
            action: row.action || '',
            description: row.description || '',
            oldValue: row.oldValue || row.oldvalue || '',
            newValue: row.newValue || row.newvalue || '',
            user: row.performedBy || row.performedby || row.user || row.userStamp || row.userstamp || 'System',
            id: row.logId || row.logid || row.auditId || row.auditid || `audit_${Math.random().toString(36).slice(2)}`,
            logType: (row.category || 'structural').toLowerCase().includes('financ') ? 'financial' as const : (row.category || 'structural').toLowerCase().includes('bgv') ? 'bgv' as const : 'structural' as const,
            reason: row.oldValue || row.oldvalue || '',
            userStamp: row.performedBy || row.performedby || row.user || row.userStamp || row.userstamp || 'System',
          };
        });
        set((s) => ({
          auditLogs: placementId 
            ? [
                ...s.auditLogs.filter(l => l.placementId !== placementId),
                ...mapped,
              ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            : mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        }));
      }
    } catch (_err) {}
  },

  // ══════════════════════════════════════════════════════
  //  ADD PAYMENT RECORD
  // ══════════════════════════════════════════════════════
  addPaymentRecord: async (payment) => {
    const pipelineKey = PIPELINE_TYPE_MAP[payment.paymentType || ''] || payment.pipelineType || 'registration';

    // Optimistic: add payment locally and update paidToDate
    const originalCandidates = get().candidates;
    const originalPayments = get().paymentRecords;

    const optimisticLog = {
      id: `audit_temp_${Date.now()}`,
      placementId: payment.placementId,
      candidateName: payment.candidateName,
      moduleName: 'FINANCE',
      actionType: 'PAYMENT_ADDED',
      description: `${payment.paymentType} Payment Added Rs.${payment.amount}`,
      oldValue: '',
      newValue: '',
      userStamp: payment.userStamp || 'Python HR',
      timestamp: new Date().toISOString()
    } as unknown as DPAuditLogEntry;

    set((s) => ({
      paymentRecords: [payment, ...s.paymentRecords],
      auditLogs: [optimisticLog, ...s.auditLogs],
    }));
    
    // Use the unified engine
    const { recalculateDirectFinancialsLocally } = get() as any;
    if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(payment.placementId, pipelineKey);

    // Perform API calls in the background without awaiting them here
    dpSheetsApi.addPayment({
      placementId: payment.placementId,
      candidateName: payment.candidateName,
      paymentType: payment.paymentType,
      pipelineType: pipelineKey,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      remarks: payment.remarks || payment.notes || '',
      transactionRef: payment.transactionRef || '',
      notes: payment.notes || payment.remarks || '',
      userStamp: payment.userStamp || 'Python HR',
      timestamp: payment.timestamp || new Date().toISOString(),
    }).then(() => {
      // Refresh from server quietly in the background
      return get().loadPaymentsForCandidate(payment.placementId, true);
    }).catch((err: any) => {
      console.error('[dpStore] Failed to save payment to GAS:', err);
      // Rollback on failure
      set({ candidates: originalCandidates, paymentRecords: originalPayments });
    });

    // Return immediately to stop spinner and close modal!
    return { success: true };
  },

  // ══════════════════════════════════════════════════════
  //  UPDATE PAYMENT RECORD
  // ══════════════════════════════════════════════════════
  updatePaymentRecord: async (paymentId, updates) => {
    const state = get();
    const existing = state.paymentRecords.find(p => p.id === paymentId);
    if (!existing) return { success: false, error: 'Payment not found locally' };

    const originalCandidates = state.candidates;
    const originalPayments = state.paymentRecords;

    const oldPipelineType = PIPELINE_TYPE_MAP[existing.paymentType || ''] || existing.pipelineType || 'registration';
    const newPipelineType = PIPELINE_TYPE_MAP[updates.paymentType || existing.paymentType || ''] || updates.pipelineType || oldPipelineType;
    const oldAmount = existing.amount;
    const newAmount = updates.amount ?? oldAmount;

    // Optimistic update
    set((s) => {
      const updatedPayment = { ...existing, ...updates, pipelineType: newPipelineType };
      return {
        paymentRecords: s.paymentRecords.map(p => p.id === paymentId ? updatedPayment : p),
      };
    });
    
    // Use the unified engine
    const { recalculateDirectFinancialsLocally } = get() as any;
    if (recalculateDirectFinancialsLocally) {
       recalculateDirectFinancialsLocally(existing.placementId, oldPipelineType);
       if (newPipelineType !== oldPipelineType) {
          recalculateDirectFinancialsLocally(existing.placementId, newPipelineType);
       }
    }

    // Perform API calls in the background without awaiting them here
    dpSheetsApi.updatePayment(paymentId, {
      amount: newAmount,
      paymentType: updates.paymentType || existing.paymentType,
      paymentDate: updates.paymentDate || existing.paymentDate,
      transactionRef: updates.transactionRef ?? existing.transactionRef,
      notes: updates.notes ?? existing.notes,
      remarks: updates.remarks ?? existing.remarks,
    }).then(() => {
      // Refresh from server quietly in the background
      return get().loadPaymentsForCandidate(existing.placementId, true);
    }).catch((err: any) => {
      console.error('[dpStore] Failed to update payment in GAS:', err);
      // Rollback on failure
      set({ candidates: originalCandidates, paymentRecords: originalPayments });
    });

    // Return immediately to stop spinner and close modal!
    return { success: true };
  },

  // ══════════════════════════════════════════════════════
  //  DELETE PAYMENT RECORD
  // ══════════════════════════════════════════════════════
  deletePaymentRecord: async (paymentId) => {
    const state = get();
    const existing = state.paymentRecords.find(p => p.id === paymentId);
    if (!existing) return { success: false, error: 'Payment not found locally' };

    const originalCandidates = state.candidates;
    const originalPayments = state.paymentRecords;

    const pipelineKey = PIPELINE_TYPE_MAP[existing.paymentType || ''] || existing.pipelineType || 'registration';

    // Optimistic removal
    set((s) => ({
      paymentRecords: s.paymentRecords.filter(p => p.id !== paymentId)
    }));
    
    // Use the unified engine
    const { recalculateDirectFinancialsLocally } = get() as any;
    if (recalculateDirectFinancialsLocally) recalculateDirectFinancialsLocally(existing.placementId, pipelineKey);

    try {
      await dpSheetsApi.deletePayment(paymentId);

      // Refresh from server
      await get().loadPaymentsForCandidate(existing.placementId, true);
      return { success: true };
    } catch (err: any) {
      console.error('[dpStore] Failed to delete payment in GAS:', err);
      set({ candidates: originalCandidates, paymentRecords: originalPayments });
      return { success: false, error: err.message };
    }
  },

  // ══════════════════════════════════════════════════════
  //  UPDATE FINANCIAL PIPELINE (base fee, adjustments)
  // ══════════════════════════════════════════════════════
  updateFinancialPipeline: (candidateId, pipelineType, updates) => {
    set((s) => ({
      candidates: s.candidates.map((c) => {
        if (c.placementId !== candidateId) return c;
        const newFinancials = c.financials.map((f) =>
          f.pipelineType === pipelineType ? { ...f, ...updates } : f
        );
        return { ...c, financials: newFinancials };
      }),
    }));
  },

  recalculateDirectFinancialsLocally: (placementId, pipelineType) => {
    if (!placementId) return;
    
    set((s) => {
      const candidateIndex = s.candidates.findIndex(c => c.placementId === placementId);
      if (candidateIndex === -1) return s;
      
      const candidate = s.candidates[candidateIndex];
      const newFins = [...candidate.financials];
      
      // Calculate across all pipelines if not provided, else just the one
      const pipelinesToUpdate = pipelineType ? [pipelineType] : newFins.map(f => f.pipelineType);
      
      pipelinesToUpdate.forEach(pt => {
         const fIdx = newFins.findIndex(f => f.pipelineType.toLowerCase() === pt.toLowerCase());
         if (fIdx === -1) return;
         
         const baseFee = parseFloat(String(newFins[fIdx].baseFee)) || 0;
         
         // 1. Calculate Adjustments
         const adjs = (s.adjustmentsByPlacementId[placementId] || []).filter(a => (a.pipelineType || '').toLowerCase() === pt.toLowerCase());
         let totalAdjustments = 0;
         adjs.forEach(a => {
            let amt = parseFloat(String(a.amount)) || 0;
            const uType = String(a.adjustmentType).toUpperCase().trim();
            if (uType === 'DISCOUNT' || uType === 'WAIVER' || uType === 'REFUND' || uType === 'REDUCTION') {
              amt = -Math.abs(amt);
            } else {
              amt = Math.abs(amt);
            }
            totalAdjustments += amt;
         });
         
         // 2. Calculate Payments
         const payments = (s.paymentRecords || []).filter(p => p.placementId === placementId && (p.pipelineType || '').toLowerCase() === pt.toLowerCase());
         let paidToDate = 0;
         payments.forEach(p => {
            paidToDate += (parseFloat(String(p.amount)) || 0);
         });
         
         // 3. Math
         const netPayable = Math.max(0, baseFee + totalAdjustments);
         const pendingDues = Math.max(0, netPayable - paidToDate);
         const overpaidAmount = Math.max(0, paidToDate - netPayable);
         
         let status = 'Pending';
         if (pendingDues === 0 && netPayable > 0) status = 'Paid';
         else if (pendingDues === 0 && netPayable === 0 && paidToDate > 0) status = 'Paid';
         else if (paidToDate > 0 && pendingDues > 0) status = 'Partial';
         
         newFins[fIdx] = {
           ...newFins[fIdx],
           baseFee,
           netPayable,
           paidToDate,
           pendingDues,
           overpaidAmount,
           paymentStatus: status as any
         };
      });
      
      const newCands = [...s.candidates];
      newCands[candidateIndex] = { ...candidate, financials: newFins };
      return { candidates: newCands };
    });
  },

  // ══════════════════════════════════════════════════════
  //  DOCUMENT VAULT
  // ══════════════════════════════════════════════════════
  toggleDocumentStatus: async (placementId: string, documentType: DPDocumentType, received: boolean, performedBy: string) => {
    const originalCandidates = get().candidates;
    const candidate = originalCandidates.find(c => c.placementId === placementId);
    if (!candidate) return;

    // Optimistic Update
    set((state) => ({
      candidates: state.candidates.map(c => 
        c.placementId === placementId 
          ? { ...c, [documentType]: received, documents: { ...(c.documents || {}), [documentType]: received } }
          : c
      )
    }));

    try {
      const response = await dpSheetsApi.updateDocumentStatus({
        placementId,
        candidateName: candidate.fullName || 'Unknown',
        documentType,
        received,
        performedBy
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update document status');
      }

      // Reload Audit Logs securely by placementId
      await get().loadAuditLogs(placementId, true);
    } catch (e: any) {
      console.error('[dpStore] toggleDocumentStatus Error:', e);
      // Rollback
      set({ candidates: originalCandidates });
      get().showToast(e.message || 'Error updating document status', 'error');
      throw e;
    }
  },

  uploadDocument: async (placementId: string, documentType: DPDocumentType, file: File, performedBy: string) => {
    get().showToast(`Uploading ${documentType}...`, 'info');
    
    const toBase64 = (f: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => {
        let encoded = reader.result as string;
        if (encoded.includes(',')) encoded = encoded.split(',')[1];
        resolve(encoded);
      };
      reader.onerror = reject;
    });

    try {
      const base64Data = await toBase64(file);
      const candidate = get().candidates.find(c => c.placementId === placementId);
      
      const response = await dpSheetsApi.uploadDocument({
        placementId,
        candidateName: candidate?.fullName || 'Unknown',
        documentType,
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        performedBy
      });

      if (!response.success) throw new Error(response.error);

      // Refresh candidate state partially to catch the URL and Status
      set((state) => ({
        candidates: state.candidates.map(c => 
          c.placementId === placementId 
            ? { 
                ...c, 
                documents: { 
                  ...(c.documents || {}), 
                  [documentType]: true,
                  [`${documentType}Url`]: response.url
                } 
              }
            : c
        )
      }));

      get().showToast(`${file.name} uploaded successfully`, 'success');
      await get().loadAuditLogs(placementId, true);
    } catch (e: any) {
      console.error('[dpStore] uploadDocument Error:', e);
      get().showToast(e.message || 'Error uploading document', 'error');
      throw e;
    }
  },

  deleteDocument: async (placementId: string, documentType: DPDocumentType, performedBy: string) => {
    get().showToast(`Deleting ${documentType}...`, 'info');
    try {
      const candidate = get().candidates.find(c => c.placementId === placementId);
      
      const response = await dpSheetsApi.deleteDocument({
        placementId,
        candidateName: candidate?.fullName || 'Unknown',
        documentType,
        performedBy
      });

      if (!response.success) throw new Error(response.error);

      // Refresh UI state
      set((state) => ({
        candidates: state.candidates.map(c => 
          c.placementId === placementId 
            ? { 
                ...c, 
                documents: { 
                  ...(c.documents || {}), 
                  [documentType]: false,
                  [`${documentType}Url`]: ''
                } 
              }
            : c
        )
      }));

      get().showToast(`Document deleted successfully`, 'success');
      await get().loadAuditLogs(placementId, true);
    } catch (e: any) {
      console.error('[dpStore] deleteDocument Error:', e);
      get().showToast(e.message || 'Error deleting document', 'error');
      throw e;
    }
  }
}));
