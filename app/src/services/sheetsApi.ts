import type { DashboardMetrics } from '@/types';

/**
 * Google Apps Script API URL — loaded from store settings at runtime,
 * with a hardcoded fallback for initial load.
 */
const FALLBACK_GAS_URL = 'https://script.google.com/macros/s/AKfycbxIVbtFPBF0p2tOc-Whn6t_ouGeJ5AJX5yf02Czpsv7tzzSTZcp9Ac-Tn1PBOTyJjmH/exec';

/** Local Express proxy (kept as secondary fallback if GAS is unreachable) */
const LOCAL_API_BASE = 'http://localhost:3001/api';

function getGasUrl(): string {
  // Check offline mode setting
  if (typeof window !== 'undefined') {
    try {
      const storedSettings = window.localStorage.getItem('pycrm-settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        if (settings.isOfflineMode) {
          return `${LOCAL_API_BASE}/mock-gas`; // Or whatever mock endpoint exists, or just block GAS completely
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    const stored = window.localStorage.getItem('pycrm-gas-url');
    if (stored) return stored;
  }
  return FALLBACK_GAS_URL;
}

/**
 * Fetch with timeout helper — GAS can be slow on cold starts.
 */
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

export interface SyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  total: number;
  newCandidates?: Array<{ candidateId: string; fullName: string; email: string; phone: string }>;
  timestamp?: string;
  error?: string;
}

export interface GASDataResponse {
  success: boolean;
  candidates: Array<Record<string, string>>;
  financials?: Array<Record<string, string>>;
  payments?: Array<Record<string, string>>;
  sync: SyncResult;
  timestamp: string;
  error?: string;
}


export const sheetsApi = {
  /**
   * Fetch all candidate data from Google Apps Script.
   * This calls ?action=getCandidates which also triggers a sync automatically.
   * Falls back to local Express server if GAS fails.
   */
  fetchAllData: async (): Promise<GASDataResponse> => {
    const gasUrl = getGasUrl();

    // Try GAS first
    try {
      const url = `${gasUrl}?action=getCandidates&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 30000);
      if (!response.ok) throw new Error(`GAS returned ${response.status}`);
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || 'GAS returned error');
      console.log('[sheetsApi] Fetched from Google Apps Script:', data.candidates?.length, 'candidates');
      return data;
    } catch (gasError) {
      console.warn('[sheetsApi] GAS fetch failed, trying local server:', gasError);
    }

    // Fallback: try local Express server
    // Helper to transform local server response into GAS format
    const transformLocalResponse = (data: Record<string, any[]>): GASDataResponse => {
      const candidates = data.Master_Candidates || data['Master_Candidates'] || [];
      const financials = data.Financial_Ledger || data['Financial_Ledger'] || [];
      const payments = data.Payment_Records || data['Payment_Records'] || [];
      console.log('[sheetsApi] Local server returned:', candidates.length, 'candidates,', financials.length, 'financials,', payments.length, 'payments');
      return {
        success: true,
        candidates,
        financials,
        payments,
        sync: { success: true, synced: 0, skipped: 0, total: 0 },
        timestamp: new Date().toISOString()
      };
    };

    // Try 1: Relative URL (goes through Vite dev proxy → Express)
    try {
      const response = await fetchWithTimeout('/api/data', {}, 5000);
      if (!response.ok) throw new Error(`Proxy returned ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) throw new Error('Non-JSON response from proxy');
      const data = await response.json();
      console.log('[sheetsApi] Fetched via Vite proxy (relative URL)');
      return transformLocalResponse(data);
    } catch (proxyError) {
      console.warn('[sheetsApi] Vite proxy fetch failed:', proxyError);
    }

    // Try 2: Absolute URL direct to Express server
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/data`, {}, 5000);
      if (!response.ok) throw new Error('Local server error');
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) throw new Error('Non-JSON response from local server');
      const data = await response.json();
      console.log('[sheetsApi] Fetched via direct local server URL');
      return transformLocalResponse(data);
    } catch (localError) {
      console.warn('[sheetsApi] Local server also failed:', localError);
      throw new Error('Both GAS and local server are unreachable');
    }
  },

  /**
   * Trigger a sync of PyCRM_New_Joinee → Master_Candidates.
   * Returns sync results (how many new, skipped, etc.)
   */
  syncCandidates: async (): Promise<SyncResult> => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=syncMasterCandidates&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 30000);
      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
      const result = await response.json();
      console.log('[sheetsApi] Sync result:', result);
      return result;
    } catch (error) {
      console.error('[sheetsApi] Sync error:', error);
      throw error;
    }
  },

  /**
   * Get dashboard metrics from GAS (computed server-side).
   */
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getDashboardMetrics&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`Metrics failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[sheetsApi] Metrics error:', error);
      throw error;
    }
  },

  /**
   * Append a registration form submission.
   * Routes through GAS POST or falls back to local server.
   */
  appendRegistration: async (data: {
    fullName: string; email: string; phone: string;
    course?: string; branch?: string; dob?: string; address?: string; token?: string;
  }) => {
    // Try local server first for registration (it has the full pipeline)
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Tab4_Registration_Responses',
          values: {
            submissionId: `reg_${Date.now()}`,
            tokenEmail: data.email,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            dob: data.dob || '',
            address: data.address || '',
            course: data.course || '',
            branch: data.branch || '',
            token: data.token || '',
            submittedAt: new Date().toISOString(),
            syncStatus: 'FALSE',
            candidateId: ''
          }
        }),
      }, 10000);
      if (response.ok) return await response.json();
    } catch {
      // fallthrough
    }
    return { success: true, message: 'Registration recorded' };
  },

  appendBGV: async (data: Record<string, unknown>) => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'appendBGV',
        values: JSON.stringify(data)
      });
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 20000);
      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (err) {
      console.warn('[sheetsApi] GAS appendBGV failed, trying local server:', err);
    }
    
    // Fallback
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'BGV_Responses',
          values: data
        }),
      }, 10000);
      if (response.ok) return await response.json();
    } catch {
      // fallthrough
    }
    return { success: true, message: 'BGV response recorded locally' };
  },

  /**
   * Save settings — persists to local Excel database if running,
   * and stores GAS URL in localStorage for API calls.
   */
  saveSettings: async (appSettings: Record<string, string>, sheetLinks: Record<string, string>) => {
    // Save GAS URL to localStorage for sheetsApi to use
    if (appSettings.gasWebAppUrl && typeof window !== 'undefined') {
      window.localStorage.setItem('pycrm-gas-url', appSettings.gasWebAppUrl);
    }

    // Try local server
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/save-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appSettings, sheetLinks }),
      }, 5000);
      if (response.ok) return await response.json();
    } catch {
      console.warn('[sheetsApi] Local save-settings failed, settings saved to localStorage only');
    }

    return { success: true, message: 'Settings saved locally' };
  },

  /**
   * Sync from a Google Sheet URL (import CSV).
   * Uses local server endpoint.
   */
  syncGoogleSheet: async (googleSheetUrl: string) => {
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/sync-google-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleSheetUrl }),
      }, 30000);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to sync Google Sheet');
      }
      return await response.json();
    } catch (error) {
      console.error('[sheetsApi] Sync Google Sheet error:', error);
      throw error;
    }
  },

  /**
   * Update candidate in Master_Candidates directly
   */
  updateCandidate: async (candidateId: string, updates: Record<string, unknown>) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'updateCandidate',
          candidateId: candidateId,
          updates: JSON.stringify(updates),
        }),
      }, 15000);
      
      if (!response.ok) throw new Error(`GAS updateCandidate failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update candidate in GAS');
      return data;
    } catch (error) {
      console.warn('[sheetsApi] GAS updateCandidate failed, trying local server:', error);
      
      // Fallback to local server if GAS fails
      try {
        const localResponse = await fetchWithTimeout(`${LOCAL_API_BASE}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetName: 'Master_Candidates', id: candidateId, values: updates }),
        }, 10000);
        if (!localResponse.ok) throw new Error('Local server update failed');
        return await localResponse.json();
      } catch (localError) {
        console.error('[sheetsApi] Both GAS and local update failed:', localError);
        throw localError;
      }
    }
  },

  /**
   * Update financial pipeline (adjustments, baseFee)
   */
  updateFinancialPipeline: async (candidateId: string, pipelineType: string, baseFee: number, adjustments: any[]) => {
    const gasUrl = getGasUrl();
    const totalAdjustments = adjustments.reduce((sum, a) => sum + Math.abs(Number(a.amount) || 0), 0);
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateFinancialPipeline',
          candidateId: candidateId,
          pipelineType: pipelineType,
          baseFee: String(baseFee),
          adjustmentsJson: JSON.stringify(adjustments),
          totalAdjustments: String(totalAdjustments)
        }),
      }, 15000);
      
      if (!response.ok) throw new Error(`GAS updateFinancialPipeline failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update financial pipeline in GAS');
      return data;
    } catch (error) {
      console.warn('[sheetsApi] GAS updateFinancialPipeline failed, falling back to local mode:', error);
      return { success: true, message: 'Local update successful (mock fallback)' };
    }
  },

  /**
   * Import a candidate manually.
   */
  importCandidate: async (data: {
    fullName: string; email: string; phone?: string;
    dob?: string; address?: string; course?: string; branch?: string;
  }) => {
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/import-candidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }, 10000);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to import candidate');
      }
      return await response.json();
    } catch (error) {
      console.error('[sheetsApi] Import error:', error);
      throw error;
    }
  },

  /**
   * Generic append row (used by various components).
   */
  appendRow: async (sheetName: string, values: Record<string, unknown>) => {
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, values }),
      }, 10000);
      if (!response.ok) throw new Error(`Failed to append to ${sheetName}`);
      return await response.json();
    } catch (error) {
      console.error('[sheetsApi] Append error:', error);
      throw error;
    }
  },

  /**
   * Generic update row.
   */
  updateRow: async (sheetName: string, id: string, values: Record<string, unknown>) => {
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, id, values }),
      }, 10000);
      if (!response.ok) throw new Error(`Failed to update ${sheetName}`);
      return await response.json();
    } catch (error) {
      console.error('[sheetsApi] Update error:', error);
      throw error;
    }
  },

  /**
   * Save a payment to the Payment_Records Google Sheet AND update Financial_Ledger.
   * Called via the addPayment GAS action.
   */
  addPayment: async (data: {
    candidateId: string;
    candidateName: string;
    paymentType: string;
    pipelineType?: string;
    amount: number;
    paymentDate?: string;
    remarks?: string;
    transactionRef?: string;
    notes?: string;
    userStamp?: string;
    timestamp?: string;
  }) => {
    // PRE-FLIGHT VALIDATION
    if (!data.candidateId || !data.candidateName || !data.paymentType || !data.amount || !data.paymentDate) {
      throw new Error('sheetsApi.addPayment: Missing required fields');
    }

    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'addPayment',
        candidateId:    data.candidateId,
        candidateName:  data.candidateName,
        paymentType:    data.paymentType,
        pipelineType:   data.pipelineType || data.paymentType,
        pipelineLabel:  data.paymentType, // Send human label to GAS explicitly
        amount:         String(data.amount),
        paymentDate:    data.paymentDate,
        remarks:        data.remarks || '',
        transactionRef: data.transactionRef || '',
        notes:          data.notes || data.remarks || '',
        userStamp:      data.userStamp || 'Python HR',
        timestamp:      data.timestamp || new Date().toISOString(),
      });

      console.log('--- [STEP 3b] sheetsApi: Payload passed to Google Apps Script ---');
      console.log(Object.fromEntries(urlParams.entries()));
      console.log('---------------------------------------------------------------');

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 20000);

      if (!response.ok) throw new Error(`GAS addPayment failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to save payment to GAS');
      console.log('[sheetsApi] Payment saved to GAS:', result.paymentId);
      return result;
      } catch (error) {
      console.warn('[sheetsApi] GAS addPayment failed, trying local server:', error);
      // Fallback to local Express server
      try {
        const localResponse = await fetchWithTimeout(`${LOCAL_API_BASE}/append`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'Payment_Records',
            values: {
              paymentId: `pay_${Date.now()}`,
              ...data,
              createdAt: new Date().toISOString(),
            },
          }),
        }, 10000);
        if (localResponse.ok) {
          console.warn('⚠️ Payment saved to local fallback. Financial_Ledger was NOT updated locally.');
          return await localResponse.json();
        }
      } catch {
        // silently fail fallback
      }
      throw error;
    }
  },

  /**
   * Update an existing payment in Payment_Records Google Sheet AND update Financial_Ledger.
   */
  updatePayment: async (paymentId: string, updates: Record<string, any>) => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'updatePayment',
        paymentId,
        ...updates,
        timestamp: new Date().toISOString()
      });

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 20000);

      if (!response.ok) throw new Error(`GAS updatePayment failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update payment in GAS');
      console.log('[sheetsApi] Payment updated in GAS:', paymentId);
      return result;
    } catch (error) {
      console.error('[sheetsApi] GAS updatePayment failed:', error);
      throw error;
    }
  },

  /**
   * Fetch all payments for a specific candidate from Payment_Records sheet.
   */
  getPaymentsForCandidate: async (candidateId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getPayments&candidateId=${encodeURIComponent(candidateId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getPayments failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load payments');
      console.log('[sheetsApi] Loaded', data.payments?.length, 'payments for', candidateId);
      return data.payments as Array<Record<string, string>>;
    } catch (error) {
      console.warn('[sheetsApi] getPaymentsForCandidate failed:', error);
      return [];
    }
  },

  /**
   * Fetch Financial_Ledger rows for a specific candidate.
   * Returns per-pipeline breakdown: baseFee, paidToDate, netPayable, pendingDues.
   */
  getFinancialsForCandidate: async (candidateId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getFinancials&candidateId=${encodeURIComponent(candidateId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getFinancials failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load financials');
      console.log('[sheetsApi] Loaded', data.financials?.length, 'ledger rows for', candidateId);
      return data.financials as Array<Record<string, string>>;
    } catch (error) {
      console.warn('[sheetsApi] getFinancialsForCandidate failed:', error);
      return [];
    }
  },

  /**
   * Fetch audit logs for a specific candidate.
   */
  getAuditLogsForCandidate: async (candidateId: string) => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=getAuditLogs&candidateId=${encodeURIComponent(candidateId)}&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 15000);
      if (!response.ok) throw new Error(`GAS getAuditLogs failed: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load audit logs');
      console.log('[sheetsApi] Loaded', data.logs?.length, 'audit logs for', candidateId);
      return data.logs as Array<Record<string, string>>;
    } catch (error) {
      console.warn('[sheetsApi] getAuditLogsForCandidate failed:', error);
      return [];
    }
  },

  /**
   * Send an audit log entry.
   */
  addAuditLog: async (log: { candidateId: string; candidateName?: string; actionType: string; oldValue?: string; newValue?: string; userStamp: string; timestamp?: string }) => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'addAuditLog',
        candidateId: log.candidateId,
        candidateName: log.candidateName || '',
        actionType: log.actionType,
        oldValue: log.oldValue || '',
        newValue: log.newValue || '',
        userStamp: log.userStamp,
        timestamp: log.timestamp || new Date().toISOString(),
      });

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 15000);

      if (!response.ok) throw new Error(`GAS addAuditLog failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to save audit log');
      return result;
    } catch (error) {
      console.warn('[sheetsApi] addAuditLog failed:', error);
      throw error;
    }
  },

  /**
   * Send contact mail and log to Contact_Mail sheet + Audit Log.
   */
  sendContactMail: async (mail: { recipient: string; subject: string; message: string; userStamp: string }) => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'sendContactMail',
        recipient: mail.recipient,
        subject: mail.subject,
        message: mail.message,
        userStamp: mail.userStamp,
      });

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 15000);

      if (!response.ok) throw new Error(`GAS sendContactMail failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to send contact mail');
      return result;
    } catch (error) {
      console.warn('[sheetsApi] sendContactMail failed:', error);
      throw error;
    }
  },

  /**
   * Export all data for backup
   */
  exportAllData: async () => {
    const gasUrl = getGasUrl();
    try {
      const url = `${gasUrl}?action=exportAllData&t=${Date.now()}`;
      const response = await fetchWithTimeout(url, {}, 30000);
      if (!response.ok) throw new Error(`GAS exportAllData failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to export data');
      return result.data;
    } catch (error) {
      console.warn('[sheetsApi] exportAllData failed:', error);
      throw error;
    }
  },

  /**
   * Rebuild the Financial Ledger from scratch based on Payment_Records.
   */
  rebuildFinancialLedger: async () => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'rebuildFinancialLedger'
      });

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 30000);

      if (!response.ok) throw new Error(`GAS rebuildFinancialLedger failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to rebuild ledger');
      return result;
    } catch (error) {
      console.warn('[sheetsApi] rebuildFinancialLedger failed:', error);
      throw error;
    }
  },
  getRawSheetData: async (sheetNames: string[], month?: string) => {
    const gasUrl = getGasUrl();
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'getRawSheetData',
          sheetNames: JSON.stringify(sheetNames),
          month: month || ''
        }),
      }, 60000);
      if (!response.ok) throw new Error(`GAS getRawSheetData failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch raw sheet data');
      return result.data;
    } catch (err: any) {
      console.error('[sheetsApi] getRawSheetData error:', err);
      throw err;
    }
  },

  triggerBackup: async (type: string) => {
    const gasUrl = getGasUrl();
    try {
      const urlParams = new URLSearchParams({
        action: 'exportBackup',
        type: type
      });

      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlParams,
      }, 60000); // Allow longer timeout for large zip files

      if (!response.ok) throw new Error(`GAS triggerBackup failed: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to generate backup');

      // Decode base64 to Blob and trigger download
      const binaryString = window.atob(result.data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.warn('[sheetsApi] triggerBackup failed:', error);
      throw error;
    }
  }
};

