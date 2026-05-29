import type { Candidate, AuditLogEntry, PaymentRecord, AppSettings, TrackedCandidate } from '../types';

const API_BASE = 'http://localhost:3001/api';

export const sheetsApi = {
  /**
   * Fetch all initial data on mount
   */
  fetchAllData: async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      if (!response.ok) throw new Error('Failed to fetch data');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Generic append function
   */
  appendRow: async (sheetName: string, values: any[]) => {
    try {
      const response = await fetch(`${API_BASE}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, values }),
      });
      if (!response.ok) throw new Error(`Failed to append to ${sheetName}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Generic update function by ID (assumes ID is column A)
   */
  updateRow: async (sheetName: string, id: string, values: any[]) => {
    try {
      const response = await fetch(`${API_BASE}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName, id, values }),
      });
      if (!response.ok) throw new Error(`Failed to update ${sheetName}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Convenience methods specific to schemas
  appendAuditLog: async (log: AuditLogEntry) => {
    return sheetsApi.appendRow('Tab3_System_Audit_Logs', [
      log.id,
      log.candidateId,
      log.logType,
      log.description,
      log.reason || '',
      log.userStamp,
      log.timestamp
    ]);
  },
  
  appendRegistration: async (data: any) => {
    return sheetsApi.appendRow('Tab4_Registration_Responses', [
      `reg_${Date.now()}`,
      data.fullName,
      data.email,
      data.phone,
      data.dob || '',
      data.address || '',
      data.course,
      data.branch,
      data.token || '',
      new Date().toISOString(),
      'FALSE', // processed
      '' // candidateId (blank until HR processes)
    ]);
  },

  appendBGV: async (data: any) => {
    return sheetsApi.appendRow('Tab5_BGV_Responses', [
      `bgv_${Date.now()}`,
      data.candidateId || '',
      data.aadhar,
      data.address,
      data.emergencyContact,
      JSON.stringify(data.companies || []),
      data.documents.offerLetter,
      data.documents.appraisals,
      data.documents.payslips,
      data.documents.relievingLetter,
      data.documents.counterOffer,
      new Date().toISOString(),
      'FALSE', // processed
      'FALSE', // sent to vendor
      '', // vendor sent at
      data.token || ''
    ]);
  }
};
