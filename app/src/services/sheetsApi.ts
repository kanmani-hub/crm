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
  appendRow: async (sheetName: string, values: any) => {
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
  updateRow: async (sheetName: string, id: string, values: any) => {
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
    return sheetsApi.appendRow('Tab3_System_Audit_Logs', {
      logId: log.id,
      candidateId: log.candidateId,
      logType: log.logType,
      description: log.description,
      reason: log.reason || '',
      userStamp: log.userStamp,
      timestamp: log.timestamp
    });
  },
  
  appendRegistration: async (data: any) => {
    return sheetsApi.appendRow('Tab4_Registration_Responses', {
      submissionId: `reg_${Date.now()}`,
      tokenEmail: data.email,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      dob: data.dob || '',
      address: data.address || '',
      course: data.course,
      branch: data.branch,
      token: data.token || '',
      submittedAt: new Date().toISOString(),
      syncStatus: 'FALSE',
      candidateId: ''
    });
  },

  appendBGV: async (data: any) => {
    return sheetsApi.appendRow('Tab5_BGV_Responses', {
      responseId: `bgv_${Date.now()}`,
      candidateId: data.candidateId || '',
      fullName: data.fullName || '',
      email: data.email || '',
      phone: data.phone || '',
      aadhar: data.aadhar,
      currentAddress: data.address,
      emergencyContact: data.emergencyContact,
      offerLetter: data.documents.offerLetter,
      appraisals: data.documents.appraisals,
      payslips: data.documents.payslips,
      relievingLetter: data.documents.relievingLetter,
      counterOffer: data.documents.counterOffer,
      submittedAt: new Date().toISOString(),
      reviewStatus: 'in-review',
      token: data.token || '',
      companies: data.companies || [] // will be parsed/inserted relationally in backend
    });
  }
};
