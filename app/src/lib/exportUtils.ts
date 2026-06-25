import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function exportMultiSheetExcel(sheets: Record<string, any[]>, filename: string) {
  const workbook = XLSX.utils.book_new();
  
  for (const [sheetName, data] of Object.entries(sheets)) {
    if (data && data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31)); // Max 31 chars
    } else {
      // Create empty sheet if no data
      const worksheet = XLSX.utils.json_to_sheet([{}]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
    }
  }
  
  XLSX.writeFile(workbook, filename);
}
