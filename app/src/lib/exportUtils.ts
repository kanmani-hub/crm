/**
 * Excel (.xlsx) generation and download utilities
 * Uses the SheetJS (xlsx) library to produce real Excel workbooks.
 */
import * as XLSX from 'xlsx';

/**
 * Triggers a browser download of an ArrayBuffer as an .xlsx file.
 */
function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  const wbOut = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Standard candidate data export as Excel
 */
export function exportCandidatesToExcel(candidates: any[]): void {
  const rows = candidates.map(c => ({
    'Candidate ID': c.id,
    'Full Name': c.fullName,
    'Email': c.email,
    'Phone': c.phone,
    'Batch Name': c.batchName,
    'Date of Birth': c.dateOfBirth || '',
    'Address': c.address || '',
    'Branch': c.branch,
    'Course': c.course,
    'Date of Joining': c.dateOfJoining || '',
    'Current Status': c.currentStatus,
    'BGV Status': c.bgvStatus,
    'Placed': c.placed ? 'YES' : 'NO',
    'Placed Company': c.placedCompany || '',
    'Past Employment': (c.pastEmployment || []).join(' | ')
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns based on header + data width
  const colWidths = Object.keys(rows[0] || {}).map(key => {
    const maxLen = Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length));
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');

  downloadExcel(wb, `pycrm_candidates_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Financial ledger export as Excel
 */
export function exportFinancialLedgerToExcel(candidates: any[]): void {
  const rows = candidates.map(c => {
    let totalBase = 0;
    let totalNet = 0;
    let totalPaid = 0;
    let totalDues = 0;

    const pipelineData: Record<string, { base: number; paid: number; dues: number }> = {};

    ['registration', 'course', 'document', 'placement'].forEach(type => {
      const pipeline = c.financials.find((f: any) => f.pipelineType === type) || {
        baseFee: 0, paidToDate: 0, adjustments: []
      };

      const adjustmentsSum = (pipeline.adjustments || []).reduce((sum: number, a: any) => sum + a.amount, 0);
      const netPayable = Math.max(0, pipeline.baseFee + adjustmentsSum);
      const dues = Math.max(0, netPayable - pipeline.paidToDate);

      pipelineData[type] = {
        base: pipeline.baseFee,
        paid: pipeline.paidToDate,
        dues: dues
      };

      totalBase += pipeline.baseFee;
      totalNet += netPayable;
      totalPaid += pipeline.paidToDate;
      totalDues += dues;
    });

    return {
      'Candidate ID': c.id,
      'Full Name': c.fullName,
      'Email': c.email,
      'Branch': c.branch,
      'Course': c.course,
      'Registration Fee - Base': pipelineData.registration.base,
      'Registration Fee - Paid': pipelineData.registration.paid,
      'Registration Fee - Dues': pipelineData.registration.dues,
      'Course Fee - Base': pipelineData.course.base,
      'Course Fee - Paid': pipelineData.course.paid,
      'Course Fee - Dues': pipelineData.course.dues,
      'Document Fee - Base': pipelineData.document.base,
      'Document Fee - Paid': pipelineData.document.paid,
      'Document Fee - Dues': pipelineData.document.dues,
      'Placement Fee - Base': pipelineData.placement.base,
      'Placement Fee - Paid': pipelineData.placement.paid,
      'Placement Fee - Dues': pipelineData.placement.dues,
      'Total Fees Base': totalBase,
      'Total Net Payable': totalNet,
      'Total Paid': totalPaid,
      'Total Outstanding Dues': totalDues
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = Object.keys(rows[0] || {}).map(key => {
    const maxLen = Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length));
    return { wch: Math.min(maxLen + 2, 30) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Financial Ledger');

  downloadExcel(wb, `pycrm_financial_ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Audit log export as Excel
 */
export function exportAuditLogsToExcel(logs: any[], getCandidateName: (id: string) => string): void {
  const rows = logs.map(l => ({
    'Log ID': l.id,
    'Candidate ID': l.candidateId,
    'Candidate Name': getCandidateName(l.candidateId),
    'Log Type': l.logType,
    'Description': l.description,
    'Reason Given': l.reason || '',
    'Actioned By': l.userStamp,
    'Timestamp': l.timestamp
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = Object.keys(rows[0] || {}).map(key => {
    const maxLen = Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length));
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

  downloadExcel(wb, `pycrm_audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ---- Legacy aliases for backward compatibility ----
export const exportCandidatesToCSV = exportCandidatesToExcel;
export const exportFinancialLedgerToCSV = exportFinancialLedgerToExcel;
export const exportAuditLogsToCSV = exportAuditLogsToExcel;
