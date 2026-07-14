import type { DPDashboardMetrics } from '@/types';

const FALLBACK_GAS_URL = 'https://script.google.com/macros/s/AKfycbxIVbtFPBF0p2tOc-Whn6t_ouGeJ5AJX5yf02Czpsv7tzzSTZcp9Ac-Tn1PBOTyJjmH/exec';
const LOCAL_API_BASE = 'http://localhost:3001/api';

function getGasUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const storedSettings = window.localStorage.getItem('pycrm-settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        if (settings.isOfflineMode) {
          return `${LOCAL_API_BASE}/mock-gas`;
        }
      }
    } catch (e) {}
    const stored = window.localStorage.getItem('pycrm-gas-url');
    if (stored) return stored;
  }
  return FALLBACK_GAS_URL;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export const dpSheetsApi = {
  getDashboardMetrics: async (): Promise<DPDashboardMetrics> => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getDirectPlacementDashboard&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`Metrics failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] Metrics error:', error);
      throw error;
    }
  },

  fetchAllData: async (params?: { search?: string, status?: string, bgv?: string, company?: string, experience?: string, payment?: string, yop?: string, activeProfileId?: string | null }) => {
    const gasUrl = getGasUrl();
    try {
      let url = `${gasUrl}?action=getDirectPlacementCandidates&t=${Date.now()}`;
      if (params) {
        if (params.search) url += `&search=${encodeURIComponent(params.search)}`;
        if (params.status) url += `&status=${encodeURIComponent(params.status)}`;
        if (params.bgv) url += `&bgv=${encodeURIComponent(params.bgv)}`;
        if (params.company) url += `&company=${encodeURIComponent(params.company)}`;
        if (params.experience) url += `&experience=${encodeURIComponent(params.experience)}`;
        if (params.payment) url += `&payment=${encodeURIComponent(params.payment)}`;
        if (params.yop) url += `&yop=${encodeURIComponent(params.yop)}`;
        if (params.activeProfileId) url += `&activeProfileId=${encodeURIComponent(params.activeProfileId)}`;
      }
      const response = await fetchWithTimeout(url, {}, 30000);
      if (!response.ok) throw new Error(`GAS returned ${response.status}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[dpSheetsApi] GAS fetch failed:', error);
      throw error;
    }
  },

  syncCandidates: async () => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=syncDirectPlacement&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, { method: 'POST' }, 30000);
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] Sync error:', error);
      throw error;
    }
  },

  syncBGV: async () => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=syncDirectBGV&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, { method: 'POST' }, 30000);
      if (!response.ok) throw new Error(`BGV Sync failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] BGV Sync error:', error);
      throw error;
    }
  },

  updateCandidate: async (placementId: string, updates: Record<string, unknown>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateDirectCandidate',
          placementId: placementId,
          updates: JSON.stringify(updates),
        }),
      }, 15000);
      if (!response.ok) throw new Error(`GAS update failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] update error:', error);
      throw error;
    }
  },

  updateDocumentStatus: async (payload: { placementId: string; candidateName?: string; documentType: string; received: boolean; performedBy?: string }) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateDPDocumentStatus',
          placementId: payload.placementId,
          candidateName: payload.candidateName || 'Unknown',
          documentType: payload.documentType,
          received: String(payload.received),
          performedBy: payload.performedBy || 'System'
        }),
      }, 15000);
      if (!response.ok) throw new Error(`GAS update failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] updateDocumentStatus error:', error);
      throw error;
    }
  },

  uploadDocument: async (payload: { placementId: string; candidateName: string; documentType: string; fileName: string; mimeType: string; base64Data: string; performedBy: string }) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'uploadDPDocument',
          placementId: payload.placementId,
          candidateName: payload.candidateName,
          documentType: payload.documentType,
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          base64Data: payload.base64Data,
          performedBy: payload.performedBy
        }),
      }, 30000); // 30s timeout for upload
      if (!response.ok) throw new Error(`GAS upload failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] uploadDocument error:', error);
      throw error;
    }
  },

  deleteDocument: async (payload: { placementId: string; candidateName: string; documentType: string; performedBy: string }) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'deleteDPDocument',
          placementId: payload.placementId,
          candidateName: payload.candidateName,
          documentType: payload.documentType,
          performedBy: payload.performedBy
        }),
      }, 15000);
      if (!response.ok) throw new Error(`GAS delete failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] deleteDocument error:', error);
      throw error;
    }
  },

  getPaymentsForCandidate: async (placementId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getDirectPlacementPayments&placementId=${encodeURIComponent(placementId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getPayments failed: ${response.status}`);
      const data = await response.json();
      return data.payments || [];
    } catch (error) {
      console.warn('[dpSheetsApi] getPaymentsForCandidate failed:', error);
      return [];
    }
  },

  getFinancialsForCandidate: async (placementId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getDirectPlacementFinancials&placementId=${encodeURIComponent(placementId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getFinancials failed: ${response.status}`);
      const data = await response.json();
      return data.financials || [];
    } catch (error) {
      console.warn('[dpSheetsApi] getFinancialsForCandidate failed:', error);
      return [];
    }
  },


  getDirectAdjustments: async (placementId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getDirectAdjustments&placementId=${encodeURIComponent(placementId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getDirectAdjustments failed: ${response.status}`);
      const data = await response.json();
      return data.adjustments || [];
    } catch (error) {
      console.warn('[dpSheetsApi] getDirectAdjustments failed:', error);
      return [];
    }
  },

  addDirectAdjustment: async (payload: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'addDirectAdjustment',
          ...payload
        }),
      }, 20000);

      if (!response.ok) throw new Error(`GAS addDirectAdjustment failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to add adjustment');
      return data;
    } catch (error) {
      console.error('[dpSheetsApi] addDirectAdjustment error:', error);
      throw error;
    }
  },

  updateDirectAdjustment: async (payload: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateDirectAdjustment',
          ...payload,
          updates: JSON.stringify(payload.updates || {})
        }),
      }, 20000);

      if (!response.ok) throw new Error(`GAS updateDirectAdjustment failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update adjustment');
      return data;
    } catch (error) {
      console.error('[dpSheetsApi] updateDirectAdjustment error:', error);
      throw error;
    }
  },

  deleteDirectAdjustment: async (payload: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'deleteDirectAdjustment',
          ...payload
        }),
      }, 20000);

      if (!response.ok) throw new Error(`GAS deleteDirectAdjustment failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete adjustment');
      return data;
    } catch (error) {
      console.error('[dpSheetsApi] deleteDirectAdjustment error:', error);
      throw error;
    }
  },

  getAuditLogsForCandidate: async (placementId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getDirectAuditLogs&placementId=${encodeURIComponent(placementId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getAuditLogs failed: ${response.status}`);
      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      console.warn('[dpSheetsApi] getAuditLogsForCandidate failed:', error);
      return [];
    }
  },

  addPayment: async (data: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'addDirectPayment',
        placementId: data.placementId,
        candidateName: data.candidateName,
        paymentType: data.paymentType,
        pipelineType: data.pipelineType || data.paymentType,
        amount: String(data.amount),
        paymentDate: data.paymentDate,
        remarks: data.remarks || '',
        transactionRef: data.transactionRef || '',
        notes: data.notes || '',
        userStamp: data.userStamp || 'Python HR',
        timestamp: data.timestamp || new Date().toISOString(),
      });

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 20000);

      if (!response.ok) throw new Error(`GAS addPayment failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] addPayment error:', error);
      throw error;
    }
  },

  updatePayment: async (paymentId: string, updates: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateDirectPayment',
          paymentId,
          updates: JSON.stringify(updates),
          userStamp: updates.userStamp || 'Python HR',
        }),
      }, 20000);

      if (!response.ok) throw new Error(`GAS updatePayment failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] updatePayment error:', error);
      throw error;
    }
  },

  deletePayment: async (paymentId: string, userStamp = 'Python HR') => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'deleteDirectPayment',
          paymentId,
          userStamp,
        }),
      }, 20000);

      if (!response.ok) throw new Error(`GAS deletePayment failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] deletePayment error:', error);
      throw error;
    }
  },

  updateFinancialLedger: async (placementId: string, updates: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateDirectFinancialLedger',
          placementId,
          updates: JSON.stringify(updates),
          userStamp: updates.userStamp || 'Python HR',
        }),
      }, 20000);

      if (!response.ok) throw new Error(`GAS updateLedger failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[dpSheetsApi] updateFinancialLedger error:', error);
      throw error;
    }
  },
};
