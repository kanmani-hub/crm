with open('Code.gs', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
# Find start of exportDirectAllData
start = -1
for i, line in enumerate(lines):
    if 'function exportDirectAllData()' in line:
        start = i
        break

if start != -1:
    new_code = '''
function getDirectAuditLogs(placementId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(DP_AUDIT_LOGS_SHEET);
    if (!sheet) return { success: true, logs: [] };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, logs: [] };
    
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var pIdIdx = findHeaderCol(headers, 'placementId');
    var logs = [];
    
    for (var i = 1; i < data.length; i++) {
      if (!placementId || String(data[i][pIdIdx] || '').trim() === String(placementId).trim()) {
        logs.push(rowToObj(headers, data[i]));
      }
    }
    
    logs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return { success: true, logs: logs };
  } catch (err) {
    Logger.log("getDirectAuditLogs Error: " + err.message);
    return { success: false, error: err.message };
  }
}

'''
    lines.insert(start, new_code)
    with open('Code.gs', 'w', encoding='utf-8') as f:
        f.writelines(lines)
