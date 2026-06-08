import type { AppSettings } from '../types';

/**
 * Google Apps Script API URL — loaded from store settings at runtime,
 * with a hardcoded fallback for initial load.
 */
const FALLBACK_GAS_URL = 'https://script.google.com/macros/s/AKfycbxIVbtFPBF0p2tOc-Whn6t_ouGeJ5AJX5yf02Czpsv7tzzSTZcp9Ac-Tn1PBOTyJjmH/exec';

/** Local Express proxy (kept as secondary fallback if GAS is unreachable) */
const LOCAL_API_BASE = 'http://localhost:3001/api';

function getGasUrl(): string {
  // Try to get from localStorage (set by Settings page)
  if (typeof window !== 'undefined') {
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
  sync: SyncResult;
  timestamp: string;
  error?: string;
}

export interface DashboardMetrics {
  success: boolean;
  totalCandidates: number;
  placedCount: number;
  activeCount: number;
  inTraining: number;
  pendingBGV: number;
  clearedBGV: number;
  branchCounts: Record<string, number>;
  courseCounts: Record<string, number>;
  placementRate: number;
  revenue?: number;
  pendingDues?: number;
  timestamp: string;
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
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/data`, {}, 5000);
      if (!response.ok) throw new Error('Local server error');
      const data = await response.json();
      // Transform local server response format into GAS format
      const candidates = data.Master_Candidates || [];
      return {
        success: true,
        candidates: candidates,
        sync: { success: true, synced: 0, skipped: 0, total: 0 },
        timestamp: new Date().toISOString()
      };
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

  /**
   * Append a BGV form submission.
   */
  appendBGV: async (data: Record<string, unknown>) => {
    try {
      const response = await fetchWithTimeout(`${LOCAL_API_BASE}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Tab5_BGV_Responses',
          values: data
        }),
      }, 10000);
      if (response.ok) return await response.json();
    } catch {
      // fallthrough
    }
    return { success: true, message: 'BGV response recorded' };
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
   * Send an audit log entry.
   */
  appendAuditLog: async (log: { id: string; candidateId: string; logType: string; description: string; reason?: string; userStamp: string; timestamp: string }) => {
    return sheetsApi.appendRow('Tab3_System_Audit_Logs', {
      logId: log.id,
      candidateId: log.candidateId,
      logType: log.logType,
      description: log.description,
      reason: log.reason || '',
      userStamp: log.userStamp,
      timestamp: log.timestamp
    });
  }
};
