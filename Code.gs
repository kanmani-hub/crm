/**
 * PyCRM - Code.gs (Google Apps Script Backend)
 *
 * Google Form Fields: FullName, EMAIL, MOB NO, MODE, BRANCH, DOMAIN, DOB, ADDRESS, REMARKS
 *
 * Registration_Responses: submissionId, tokenEmail, FullName, email, phone, dob, address, course, branch, submittedAt, syncStatus, candidateId
 * Master_Candidates: candidateId, FullName, email, phone, batchName, dateOfBirth, address, branch, course, dateOfJoining, currentStatus, bgvStatus, placed, placedCompany, trackedStatus, trackedAt, createdAt, updatedAt
 */

var FORM_SOURCE_SHEET = 'new_joine';
var REGISTRATION_SHEET = 'Registration_Responses';
var MASTER_SHEET_NAME = 'Master_Candidates';
var PAYMENT_RECORDS_SHEET = 'Payment_Records';
var FINANCIAL_LEDGER_SHEET = 'Financial_Ledger';
var SYSTEM_AUDIT_LOGS_SHEET = 'System_Audit_Logs';
var BGV_RESPONSES_SHEET = 'new_joine_bgv';

// Direct Placement Module Sheets (completely independent)
var DP_REGISTRATION_SHEET = 'DP_Registration_Res';
var DP_MASTER_SHEET = 'Direct_Placement_Master';
var DP_BGV_SHEET = 'DP_BGV_Responses';
var DP_PAYMENT_SHEET = 'Direct_Payment_Records';
var DP_FINANCIAL_LEDGER_SHEET = 'Direct_Financial_Ledger';
var DP_ADJUSTMENT_SHEET = 'Direct_Adjustment_Records';
var DP_LEDGER_SHEET = 'Direct_Financial_Ledger';
var DP_AUDIT_LOGS_SHEET = 'Direct_System_Audit_Logs';
var DP_FORM_RESPONSES_4 = 'dp_new_joine';
var DP_FORM_RESPONSES_5 = 'dp_new_bgv';

// ============================================================
// ENTRY POINTS

// [CHANGED] Added getSheetSafe to ensure every getSheetByName logs if not found
function getSheetSafe(ss, sheetName) {
  Logger.log("Reading sheet: " + sheetName);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("Sheet not found: " + sheetName);
  }
  return sheet;
}

// ============================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
    var result;

    switch (action) {
      case 'getCandidates':
        result = {
          success: true,
          candidates: getCandidates(),
          financials: getFinancials('').financials,
          payments: getPayments('').payments,
          timestamp: new Date().toISOString()
        };
        break;
      case 'getDashboardMetrics':
        result = getDashboardMetrics();
        result.success = true;
        break;
      case 'syncMasterCandidates':
        result = syncMasterCandidates();
        break;
      case 'syncBgvResponses':
        result = syncBgvResponses();
        break;
      case 'getPayments':
        result = getPayments(e.parameter.candidateId || '');
        break;
      case 'getFinancials':
        result = getFinancials(e.parameter.candidateId || '');
        break;
      case 'getAuditLogs':
        result = getAuditLogs(e.parameter.candidateId || '');
        break;
      case 'exportAllData':
        result = exportAllData();
        break;
      case 'rebuildFinancialLedger':
        rebuildFinancialLedger();
        result = { success: true, message: 'Financial ledger rebuilt successfully' };
        break;
      case 'exportDirectAllData':
        result = exportDirectAllData();
        break;

      // ── Direct Placement GET actions ──
      case 'getDirectPlacementCandidates':
        result = { success: true, candidates: getDirectPlacementCandidates(e.parameter), timestamp: new Date().toISOString() };
        break;
      case 'getDirectPlacementCandidate':
        result = getDirectPlacementCandidate(e.parameter.placementId || '');
        break;
      case 'getDirectPlacementDashboard':
        result = getDirectPlacementDashboard();
        break;
      case 'getDirectPlacementPayments':
        result = getDirectPlacementPayments(e.parameter.placementId || '');
        break;
      case 'getDirectPlacementFinancials':
        result = getDirectPlacementFinancials(e.parameter.placementId || '');
        break;
      case 'getDirectAdjustments':
        result = getDirectAdjustments(e.parameter.placementId || '');
        break;
      case 'getDirectAuditLogs':
        result = getDirectAuditLogs(e.parameter);
        break;
      case 'syncDirectPlacement':
        result = syncDirectPlacement();
        break;
      case 'syncDirectBGV':
        result = syncDirectBGV();
        break;
      default:
        result = {
          success: true,
          candidates: getCandidates(),
          financials: getFinancials('').financials,
          metrics: getDashboardMetrics(),
          timestamp: new Date().toISOString()
        };
        break;
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || '';

    if (action === 'syncMasterCandidates') {
      var syncResult = syncMasterCandidates();
      return ContentService.createTextOutput(JSON.stringify(syncResult)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'syncBgvResponses') {
      var bgvSyncResult = syncBgvResponses();
      return ContentService.createTextOutput(JSON.stringify(bgvSyncResult)).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'rebuildFinancialLedger') {
      try {
        rebuildFinancialLedger();
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Financial ledger rebuilt successfully' })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ── Direct Placement POST actions ──
    if (action === 'syncDirectPlacement') {
      try {
        var dpSyncResult = syncDirectPlacement();
        return ContentService.createTextOutput(JSON.stringify(dpSyncResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'syncDirectBGV') {
      try {
        var dpBgvResult = syncDirectBGV();
        return ContentService.createTextOutput(JSON.stringify(dpBgvResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'getRawSheetData') {
      try {
        var sheetNamesStr = params.sheetNames || '[]';
        var sheetNames = JSON.parse(sheetNamesStr);
        var selectedMonth = params.month || '';
        
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var data = {};
        
        function isDateInSelectedMonth_(dateValue, selMonth) {
            if (!selMonth) return true;
            var parts = selMonth.split("-");
            var selectedYear = Number(parts[0]);
            var selectedMonthIndex = Number(parts[1]) - 1;

            var date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                return false;
            }

            return (
                date.getFullYear() === selectedYear &&
                date.getMonth() === selectedMonthIndex
            );
        }

        var dateColKeywords = ['createdat', 'registrationdate', 'dateofjoining', 'bgvsubmitteddate', 'submittedat', 'bgvsubmittedat', 'paymentdate', 'timestamp', 'paymentperiod'];

        for (var i = 0; i < sheetNames.length; i++) {
          var sheet = getSheetSafe(ss, sheetNames[i]);
          if (sheet) {
            var rangeData = sheet.getDataRange().getValues();
            if (rangeData.length > 0 && selectedMonth) {
               var foundDateColIdx = -1;
               var actualHeaderIdx = -1;
               for (var r = 0; r < Math.min(5, rangeData.length); r++) {
                 var row = rangeData[r];
                 for (var c = 0; c < row.length; c++) {
                    var hNorm = String(row[c]).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (dateColKeywords.indexOf(hNorm) !== -1) {
                       foundDateColIdx = c;
                       actualHeaderIdx = r;
                       break;
                    }
                 }
                 if (foundDateColIdx !== -1) break;
               }

               if (foundDateColIdx !== -1) {
                  var filteredData = [];
                  for (var r = 0; r <= actualHeaderIdx; r++) {
                     filteredData.push(rangeData[r]);
                  }
                  for (var r = actualHeaderIdx + 1; r < rangeData.length; r++) {
                     var row = rangeData[r];
                     
                     // Blank row prevention: Only include rows that have actual data
                     var hasData = false;
                     for (var c = 0; c < row.length; c++) {
                       if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== '') {
                         hasData = true;
                         break;
                       }
                     }
                     if (!hasData) continue;
                     
                     var dateValue = row[foundDateColIdx];
                     if (!dateValue || String(dateValue).trim() === '') continue;
                     
                     if (isDateInSelectedMonth_(dateValue, selectedMonth)) {
                        filteredData.push(row);
                     }
                  }
                  
                  if (filteredData.length <= actualHeaderIdx + 1) {
                    var friendlyName = String(sheetNames[0]).replace(/_/g, ' ');
                    var [y, m] = selectedMonth.split('-');
                    var monthName = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long' });
                    return ContentService.createTextOutput(JSON.stringify({ 
                      success: false, 
                      error: 'No ' + friendlyName + ' found for ' + monthName + ' ' + y + '.' 
                    })).setMimeType(ContentService.MimeType.JSON);
                  }
                  
                  rangeData = filteredData;
               }
            }
            data[sheetNames[i]] = rangeData;
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'addDirectPayment') {
      try {
        var dpPayResult = addDirectPayment(params);
        return ContentService.createTextOutput(JSON.stringify(dpPayResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('addDirectPayment ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updateDirectPayment') {
      try {
        var dpPayUpdateResult = updateDirectPayment(params);
        return ContentService.createTextOutput(JSON.stringify(dpPayUpdateResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('updateDirectPayment ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'addDirectAdjustment') {
      return ContentService.createTextOutput(JSON.stringify(addDirectAdjustment(params))).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'updateDirectAdjustment') {
      return ContentService.createTextOutput(JSON.stringify(updateDirectAdjustment(params))).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'deleteDirectAdjustment') {
      return ContentService.createTextOutput(JSON.stringify(deleteDirectAdjustment(params))).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'deleteDirectPayment') {
      try {
        var dpPayDeleteResult = deleteDirectPayment(params);
        return ContentService.createTextOutput(JSON.stringify(dpPayDeleteResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('deleteDirectPayment ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updateDirectCandidate') {
      try {
        var dpCandResult = updateDirectCandidate(params);
        return ContentService.createTextOutput(JSON.stringify(dpCandResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('updateDirectCandidate ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updateDirectFinancialLedger') {
      try {
        var dpLedgerResult = updateDirectFinancialLedger(params);
        return ContentService.createTextOutput(JSON.stringify(dpLedgerResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('updateDirectFinancialLedger ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'uploadDPDocument') {
      try {
        var dpUploadResult = uploadDPDocument(params);
        return ContentService.createTextOutput(JSON.stringify(dpUploadResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('uploadDPDocument ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'appendBGV') {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var bgvSheet = getSheetSafe(ss, BGV_RESPONSES_SHEET);
        var values = JSON.parse(params.values || '{}');
        var headers = getSheetHeaders(bgvSheet);
        
        var newRow = headers.map(function(h) {
          var key = h.trim();
          var lowerKey = key.toLowerCase();
          if (lowerKey === 'responseid' || lowerKey === 'id') return 'bgv_' + Date.now();
          if (lowerKey === 'fullname') return values.fullName || '';
          if (lowerKey === 'phone') return values.phone || '';
          if (lowerKey === 'address') return values.address || '';
          if (lowerKey === 'alternatecontactnumber' || lowerKey === 'emergencycontact') return values.emergencyContact || '';
          if (lowerKey === 'candidateid') return values.candidateId || '';
          
          // Match any remaining keys case-insensitively
          var match = Object.keys(values).find(function(k) { return k.toLowerCase() === lowerKey; });
          return match ? String(values[match]) : '';
        });
        
        bgvSheet.appendRow(newRow);
        
        // After appending, sync it to Master_Candidates
        var bgvSyncResult = syncBgvResponses();
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'BGV response recorded', syncResult: bgvSyncResult })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('appendBGV ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updateDPDocumentStatus') {
      try {
        var dpStatusResult = updateDPDocumentStatus(params);
        return ContentService.createTextOutput(JSON.stringify(dpStatusResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('updateDPDocumentStatus ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'deleteDPDocument') {
      try {
        var dpDeleteResult = deleteDPDocument(params);
        return ContentService.createTextOutput(JSON.stringify(dpDeleteResult)).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('deleteDPDocument ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'sendContactMail') {
      try {
        var recipient = (params.recipient || '').trim();
        var subject   = (params.subject   || '').trim();
        var message   = (params.message   || '').trim();
        var userStamp = (params.userStamp || 'Python HR').trim();
        var timestamp = new Date().toISOString();

        if (!recipient || !subject || !message) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'recipient, subject, and message are required' })).setMimeType(ContentService.MimeType.JSON);
        }

        // Send Email
        var mailStatus = 'Sent';
        try {
          MailApp.sendEmail({
            to: recipient,
            subject: subject,
            body: message
          });
        } catch (mailErr) {
          Logger.log('Mail send error: ' + mailErr.toString());
          mailStatus = 'Failed: ' + mailErr.toString();
        }

        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var mailCols = ['mailId', 'recipient', 'subject', 'message', 'timestamp', 'status'];
        var mailSheet = ensureSheetWithColumns(ss, 'Contact_Mail', mailCols);
        var mailHeaders = getSheetHeaders(mailSheet);
        var mailId = 'mail_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        var newMailRow = buildRowByHeaders(mailHeaders, {
          'mailId':    mailId,
          'recipient': recipient,
          'subject':   subject,
          'message':   message,
          'timestamp': timestamp,
          'status':    mailStatus
        });
        mailSheet.appendRow(newMailRow);

        // Create Audit Log entry
        logAuditToSheet(ss, 'N/A', recipient, 'Contact Mail Sent', subject, mailStatus, userStamp, timestamp);
        SpreadsheetApp.flush();

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'Contact mail recorded',
          mailId: mailId,
          status: mailStatus
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updateCandidate') {
      try {
        var updatesStr = params.updates || '{}';
        var updates = JSON.parse(updatesStr);
        var candidateId = params.candidateId || '';

        if (!candidateId) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'candidateId is required' })).setMimeType(ContentService.MimeType.JSON);
        }

        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var masterSheet = getSheetSafe(ss, MASTER_SHEET_NAME);
        if (!masterSheet) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Master_Candidates sheet not found' })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = masterSheet.getDataRange().getValues();
        if (data.length < 2) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No data in Master_Candidates' })).setMimeType(ContentService.MimeType.JSON);
        }

        var headers = data[0].map(function(h) { return String(h).trim(); });

        var targetRowIndex = -1;
        var existingCandidateName = '';
        var existingData = {};

        for (var r = 1; r < data.length; r++) {
          var rowObj = rowToObj(headers, data[r]);
          if (rowObj['candidateId'] === candidateId) {
            targetRowIndex = r + 1;
            existingCandidateName = rowObj['FullName'] || rowObj['fullName'] || '';
            existingData = rowObj;
            break;
          }
        }

        if (targetRowIndex === -1) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Candidate not found' })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var now = new Date().toISOString();
        
        // Loop over the updates map and update matching columns
        for (var key in updates) {
          // Allow passing either 'FullName' or 'fullName' from the frontend
          var headerName = key;
          if (key.toLowerCase() === 'fullname') headerName = 'FullName';
          if (key === 'dateOfBirth') headerName = 'DOB';
          if (key === 'phone') headerName = 'MOB NO';
          if (key === 'bgvStatus') headerName = 'BGV Status';
          if (key === 'branch') headerName = 'BRANCH';
          if (key === 'course') headerName = 'COURSE';
          
          var oldVal = existingData[headerName] || existingData[key] || '';
          var newVal = updates[key];
          if (typeof newVal === 'object' && newVal !== null) {
            newVal = JSON.stringify(newVal);
          }
          
          // If column doesn't exist, add it dynamically
          if (findHeaderCol(headers, headerName) === -1) {
            headers.push(headerName);
            masterSheet.getRange(1, headers.length).setValue(headerName);
          }
          
          if (String(oldVal) !== String(newVal)) {
            var actionType = 'Candidate Updated';
            if (headerName.toLowerCase() === 'bgvstatus') actionType = 'BGV Status Updated';
            if (headerName.toLowerCase() === 'placed') actionType = 'Placement Status Updated';
            if (headerName === 'documentsReceived') actionType = 'Documents Received Updated';
            if (headerName === 'documentsApplied') actionType = 'Documents Applied Updated';
            
            logAuditToSheet(ss, candidateId, existingCandidateName, actionType, oldVal, newVal, params.userStamp || 'System', now);
          }
          
          setByHeader(masterSheet, headers, targetRowIndex, headerName, newVal);
        }
        
        setByHeader(masterSheet, headers, targetRowIndex, 'updatedAt', now);
        
        SpreadsheetApp.flush();
        var finalData = masterSheet.getDataRange().getValues();
        var finalRowObj = rowToObj(headers, finalData[targetRowIndex - 1]);
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Candidate updated', candidate: finalRowObj })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updateFinancialPipeline') {
      try {
        var candidateId = params.candidateId || '';
        var pipelineType = params.pipelineType || '';
        var baseFee = params.baseFee;
        var adjustmentsJson = params.adjustmentsJson || '[]';
        var totalAdjustments = parseFloat(params.totalAdjustments) || 0;

        if (!candidateId || !pipelineType) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'candidateId and pipelineType required' })).setMimeType(ContentService.MimeType.JSON);
        }

        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var ledgerReqCols = ['ledgerId', 'candidateId', 'candidateName', 'pipelineType', 'pipelineLabel', 'baseFee', 'totalAdjustments', 'adjustmentsJson', 'netPayable', 'paidToDate', 'pendingDues', 'updatedAt'];
        var ledgerSheet = ensureSheetWithColumns(ss, FINANCIAL_LEDGER_SHEET, ledgerReqCols);

        var data = ledgerSheet.getDataRange().getValues();
        var headers = data[0].map(function(h) { return String(h).trim(); });
        var targetRow = -1;
        var existingPaid = 0;

        for (var i = 1; i < data.length; i++) {
          var obj = rowToObj(headers, data[i]);
          var rCand = String(obj['candidateId'] || '').trim();
          var rPipe = String(obj['pipelineType'] || '').trim().toLowerCase();
          if (rCand === String(candidateId).trim() && rPipe === String(pipelineType).trim().toLowerCase()) {
            targetRow = i + 1;
            existingPaid = parseFloat(obj['paidToDate']) || 0;
            break;
          }
        }

        var totalAdjustments = parseFloat(params.totalAdjustments) || 0;
        var netPayable = Math.max(0, parseFloat(baseFee) - Math.abs(totalAdjustments));
        var pendingDues = netPayable - existingPaid;
        var now = new Date().toISOString();

        if (targetRow !== -1) {
          setByHeader(ledgerSheet, headers, targetRow, 'baseFee', baseFee);
          setByHeader(ledgerSheet, headers, targetRow, 'totalAdjustments', totalAdjustments);
          setByHeader(ledgerSheet, headers, targetRow, 'adjustmentsJson', adjustmentsJson);
          setByHeader(ledgerSheet, headers, targetRow, 'netPayable', netPayable);
          setByHeader(ledgerSheet, headers, targetRow, 'pendingDues', pendingDues);
          setByHeader(ledgerSheet, headers, targetRow, 'updatedAt', now);
        } else {
          var ledgerId = 'ledger_' + candidateId + '_' + pipelineType;
          var newRow = buildRowByHeaders(headers, {
            'ledgerId': ledgerId,
            'candidateId': candidateId,
            'candidateName': '',
            'pipelineType': pipelineType,
            'pipelineLabel': pipelineType,
            'baseFee': baseFee,
            'totalAdjustments': totalAdjustments,
            'adjustmentsJson': adjustmentsJson,
            'netPayable': netPayable,
            'paidToDate': 0,
            'pendingDues': netPayable,
            'updatedAt': now
          });
          ledgerSheet.appendRow(newRow);
        }

        SpreadsheetApp.flush();
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Financial pipeline updated' })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'addAuditLog') {
      try {
        var candidateId   = (params.candidateId   || '').trim();
        var candidateName = (params.candidateName || '').trim();
        var actionType    = (params.actionType    || '').trim();
        var oldValue      = (params.oldValue      || '').trim();
        var newValue      = (params.newValue      || '').trim();
        var userStamp     = (params.userStamp     || 'System').trim();
        var timestamp     = (params.timestamp     || new Date().toISOString()).trim();

        if (!candidateId || !actionType) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'candidateId and actionType are required' })).setMimeType(ContentService.MimeType.JSON);
        }
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        logAuditToSheet(ss, candidateId, candidateName, actionType, oldValue, newValue, userStamp, timestamp);
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Audit log added' })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'addPayment') {
      try {
        var candidateId   = (params.candidateId   || '').trim();
        var candidateName = (params.candidateName || '').trim();
        var paymentType   = (params.paymentType   || '').trim();  // human label: "Course Fee"
        var pipelineType  = (params.pipelineType  || '').trim();  // key: "course"
        var pipelineLabel = (params.pipelineLabel || paymentType).trim();
        var amount        = parseFloat(params.amount || '0') || 0;
        var paymentDate   = (params.paymentDate   || '').trim();
        var remarks       = (params.remarks       || '').trim();
        var transactionRef= (params.transactionRef|| '').trim();
        var notes         = (params.notes         || remarks).trim();
        var userStamp     = (params.userStamp     || 'Python HR').trim();

        // If pipelineType key was not sent, derive it from the human label
        if (!pipelineType && paymentType) {
          var labelToKey = {
            'registration': 'registration', 'Registration': 'registration', 'Registration Fee': 'registration',
            'course fee': 'course',         'Course Fee': 'course',         'course': 'course',
            'document fee': 'document',     'Document Fee': 'document',     'document': 'document', 'Document': 'document',
            'placement fee': 'placement',   'Placement Fee': 'placement',   'placement': 'placement', 'Placement': 'placement'
          };
          pipelineType = labelToKey[paymentType] || paymentType.toLowerCase().replace(/\s+/g, '_');
        }

        // VERIFY GOOGLE APPS SCRIPT PAYLOAD
        Logger.log('--- Incoming addPayment Payload ---');
        Logger.log('candidateId: ' + candidateId);
        Logger.log('candidateName: ' + candidateName);
        Logger.log('paymentType: ' + paymentType);
        Logger.log('pipelineType: ' + pipelineType);
        Logger.log('amount: ' + amount);
        Logger.log('-----------------------------------');

        if (!candidateId) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'candidateId is required' })).setMimeType(ContentService.MimeType.JSON);
        }
        if (!paymentType) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'paymentType is required' })).setMimeType(ContentService.MimeType.JSON);
        }
        if (amount <= 0) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'amount must be greater than 0' })).setMimeType(ContentService.MimeType.JSON);
        }

        var ss = SpreadsheetApp.getActiveSpreadsheet();

        // ── 0. Validate candidateId in Master_Candidates ──
        var masterSheet = getSheetSafe(ss, MASTER_SHEET_NAME);
        if (!masterSheet) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Master_Candidates sheet not found' })).setMimeType(ContentService.MimeType.JSON);
        }
        var masterData = masterSheet.getDataRange().getValues();
        var masterHeaders = masterData[0].map(function(h) { return String(h).trim(); });
        var candidateExists = false;
        for (var mr = 1; mr < masterData.length; mr++) {
          var mObj = rowToObj(masterHeaders, masterData[mr]);
          if (String(mObj['candidateId'] || '').trim() === candidateId) {
            candidateExists = true;
            // If candidateName was missing, grab from Master
            if (!candidateName || candidateName === 'undefined') {
              candidateName = String(mObj['FullName'] || mObj['fullName'] || '').trim();
            }
            break;
          }
        }

        if (!candidateExists) {
          Logger.log('addPayment ERROR: candidateId ' + candidateId + ' not found in Master_Candidates.');
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'candidateId does not exist in Master_Candidates' })).setMimeType(ContentService.MimeType.JSON);
        }

        if (!paymentDate) {
          paymentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }

        if (!candidateId || !candidateName || !pipelineType || !pipelineLabel || amount <= 0 || !paymentDate) {
          var validationError = 'Payment validation failed: candidateId, candidateName, pipelineType, pipelineLabel, amount, and paymentDate must never be blank. Got: ' +
            'candidateId="' + candidateId + '", candidateName="' + candidateName + '", pipelineType="' + pipelineType + 
            '", pipelineLabel="' + pipelineLabel + '", amount=' + amount + ', paymentDate="' + paymentDate + '"';
          Logger.log('addPayment ERROR: ' + validationError);
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: validationError })).setMimeType(ContentService.MimeType.JSON);
        }

        // ── 1. Ensure Payment_Records sheet has all required columns ──
        var requiredColumns = [
          'paymentId','candidateId','candidateName','paymentType','pipelineType',
          'amount','paymentDate','transactionRef','notes','remarks','timestamp','userStamp','createdAt'
        ];
        var paymentSheet = ensureSheetWithColumns(ss, PAYMENT_RECORDS_SHEET, requiredColumns);

        var now          = new Date();
        var paymentId    = 'pay_' + now.getTime() + '_' + Math.floor(Math.random() * 1000);
        var paymentDate  = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        var createdAt    = now.toISOString();
        var timestamp    = (params.timestamp || createdAt).trim();

        // ── Re-read headers AFTER ensuring columns exist ──
        var prHeaders = getSheetHeaders(paymentSheet);
        Logger.log('addPayment: Payment_Records headers = ' + JSON.stringify(prHeaders));

        var newRow = buildRowByHeaders(prHeaders, {
          'paymentId':      paymentId,
          'candidateId':    candidateId,
          'candidateName':  candidateName,
          'paymentType':    paymentType,
          'pipelineType':   pipelineType,
          'amount':         amount,
          'paymentDate':    paymentDate,
          'transactionRef': transactionRef,
          'notes':          notes,
          'remarks':        remarks,
          'timestamp':      timestamp,
          'userStamp':      userStamp,
          'createdAt':      createdAt
        });
        paymentSheet.appendRow(newRow);
        SpreadsheetApp.flush();
        Logger.log('addPayment: Row appended to Payment_Records. paymentId=' + paymentId);

        // ── 2. Recalculate & upsert Financial_Ledger ─────────────
        upsertFinancialLedger(ss, candidateId, candidateName, pipelineType, paymentType);
        logAuditToSheet(ss, candidateId, candidateName, paymentType + ' Payment Added', '', '₹' + amount, userStamp, timestamp);
        SpreadsheetApp.flush();

        return ContentService.createTextOutput(JSON.stringify({
          success:   true,
          message:   'Payment saved and Financial_Ledger updated',
          paymentId: paymentId,
          createdAt: createdAt
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('addPayment ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'updatePayment') {
      try {
        var paymentId     = (params.paymentId     || '').trim();
        var paymentType   = (params.paymentType   || '').trim();
        var pipelineType  = (params.pipelineType  || '').trim();
        var amount        = params.amount !== undefined && params.amount !== '' ? parseFloat(params.amount) : undefined;
        var paymentDate   = (params.paymentDate   || '').trim();
        var remarks       = (params.remarks       || '').trim();
        var transactionRef= (params.transactionRef|| '').trim();
        var notes         = (params.notes         || remarks).trim();
        var userStamp     = (params.userStamp     || 'Python HR').trim();
        var timestamp     = (params.timestamp     || new Date().toISOString()).trim();

        if (!paymentId) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'paymentId is required' })).setMimeType(ContentService.MimeType.JSON);
        }

        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var paymentSheet = getSheetSafe(ss, PAYMENT_RECORDS_SHEET);
        if (!paymentSheet) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Payment_Records sheet not found' })).setMimeType(ContentService.MimeType.JSON);
        }

        var data = paymentSheet.getDataRange().getValues();
        var headers = data[0].map(function(h) { return String(h).trim(); });
        var targetRowIndex = -1;
        var existingData = {};

        for (var r = 1; r < data.length; r++) {
          var rowObj = rowToObj(headers, data[r]);
          if (String(rowObj['paymentId'] || '').trim() === paymentId) {
            targetRowIndex = r + 1;
            existingData = rowObj;
            break;
          }
        }

        if (targetRowIndex === -1) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Payment record not found' })).setMimeType(ContentService.MimeType.JSON);
        }

        var candidateId = String(existingData['candidateId'] || '').trim();
        var candidateName = String(existingData['candidateName'] || '').trim();
        var oldPipelineType = String(existingData['pipelineType'] || '').trim();
        var oldAmount = parseFloat(existingData['amount'] || 0);

        if (!pipelineType && paymentType) {
          var labelToKey = {
            'registration': 'registration', 'Registration': 'registration', 'Registration Fee': 'registration',
            'course fee': 'course',         'Course Fee': 'course',         'course': 'course',
            'document fee': 'document',     'Document Fee': 'document',     'document': 'document', 'Document': 'document',
            'placement fee': 'placement',   'Placement Fee': 'placement',   'placement': 'placement', 'Placement': 'placement'
          };
          pipelineType = labelToKey[paymentType] || paymentType.toLowerCase().replace(/\s+/g, '_');
        }

        var newPipelineType = pipelineType || oldPipelineType;
        var newAmount = amount !== undefined ? amount : oldAmount;
        var newPaymentType = paymentType || String(existingData['paymentType'] || '').trim();
        var newDate = paymentDate || String(existingData['paymentDate'] || '').trim();
        var newRef = transactionRef || String(existingData['transactionRef'] || '').trim();
        var newNotes = notes || String(existingData['notes'] || existingData['remarks'] || '').trim();

        // Update the row
        if (paymentType) setByHeader(paymentSheet, headers, targetRowIndex, 'paymentType', newPaymentType);
        if (pipelineType) setByHeader(paymentSheet, headers, targetRowIndex, 'pipelineType', newPipelineType);
        if (amount !== undefined) setByHeader(paymentSheet, headers, targetRowIndex, 'amount', newAmount);
        if (paymentDate) setByHeader(paymentSheet, headers, targetRowIndex, 'paymentDate', newDate);
        if (transactionRef) setByHeader(paymentSheet, headers, targetRowIndex, 'transactionRef', newRef);
        if (notes) {
          setByHeader(paymentSheet, headers, targetRowIndex, 'notes', newNotes);
          if (headers.indexOf('remarks') !== -1) {
            setByHeader(paymentSheet, headers, targetRowIndex, 'remarks', newNotes);
          }
        }
        if (headers.indexOf('updatedAt') !== -1) {
          setByHeader(paymentSheet, headers, targetRowIndex, 'updatedAt', timestamp);
        }

        SpreadsheetApp.flush();

        // Recalculate Financial Ledger
        if (oldPipelineType !== newPipelineType) {
          upsertFinancialLedger(ss, candidateId, candidateName, oldPipelineType, String(existingData['paymentType']));
        }
        upsertFinancialLedger(ss, candidateId, candidateName, newPipelineType, newPaymentType);

        var auditDesc = 'Updated Payment (was ₹' + oldAmount + ' ' + oldPipelineType + ')';
        logAuditToSheet(ss, candidateId, candidateName, auditDesc, '', '₹' + newAmount + ' ' + newPipelineType, userStamp, timestamp);
        SpreadsheetApp.flush();

        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Payment updated' })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
        Logger.log('updatePayment ERROR: ' + innerErr.toString());
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: innerErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    var to = params.to || '';
    var cc = params.cc || '';
    var formType = params.formType || 'Registration';
    var formLink = params.formLink || '';

    if (to && formLink) {
      var subject = formType === 'BGV' ? 'PyCRM: Background Verification Form' : 'PyCRM: New Candidate Registration Form';
      var htmlBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">'
        + '<h2 style="color:#B85C3D;margin-bottom:16px;">PyCRM - ' + formType + ' Form</h2>'
        + '<p style="color:#333;font-size:15px;line-height:1.6;">Hello,</p>'
        + '<p style="color:#333;font-size:15px;line-height:1.6;">Please fill out the following form at your earliest convenience:</p>'
        + '<p style="margin:24px 0;"><a href="' + formLink + '" style="display:inline-block;background:#B85C3D;color:#fff;padding:12px 32px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;">Open ' + formType + ' Form</a></p>'
        + '<p style="color:#888;font-size:12px;margin-top:32px;">- PyCRM Command Center</p>'
        + '</div>';

      var mailOptions = { to: to, subject: subject, htmlBody: htmlBody };
      if (cc) mailOptions.cc = cc;
      MailApp.sendEmail(mailOptions);

      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Email sent to ' + to })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Missing required parameters' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// GENERIC FUZZY KEY FINDER
// ============================================================

/**
 * findValue - finds a value from namedValues using normalized key matching.
 *
 * Handles all variations: "FullName", "Full Name", "FULLNAME", "FullName *", "FullName:", etc.
 * Strips spaces, special chars, lowercases, then compares.
 */
function findValue(namedValues, target) {
  var normalizedTarget = String(target).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

  for (var key in namedValues) {
    var normalizedKey = String(key).toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

    if (normalizedKey === normalizedTarget) {
      var arr = namedValues[key];
      if (Array.isArray(arr) && arr.length > 0) {
        return String(arr[0]).trim();
      }
      return String(arr).trim();
    }
  }
  return '';
}

// ============================================================
// FORM SUBMIT HANDLER (TRIGGER)
// ============================================================

function onFormSubmit(e) {
  try {
    Logger.log("onFormSubmit Triggered");

    if (!e || !e.range) {
      Logger.log("Missing event object or range. Exiting.");
      return;
    }

    var namedValues = e.namedValues || {};
    var sheetName = e.range.getSheet().getName();
    var rawSheetName = sheetName;
    var isBgvForm = false;

    // 1. Check for Direct Placement Form
    if (rawSheetName === DP_FORM_RESPONSES_4 || rawSheetName === 'dp_new_joine') {
      Logger.log("Detected Direct Placement Form: " + rawSheetName);
      syncDirectPlacement(e);
      return;
    }

    // 2. Check for Direct Placement BGV Form
    if (rawSheetName === DP_FORM_RESPONSES_5 || rawSheetName === 'dp_new_bgv') {
      Logger.log("Detected Direct Placement BGV Form: " + rawSheetName);
      syncDirectBGV(e);
      return;
    }

    // 3. Existing Training CRM Logic
    if (rawSheetName === BGV_RESPONSES_SHEET || rawSheetName === 'new_joine_bgv') {
      isBgvForm = true;
    } else {
      var bgvKeys = ["How much amount paid for document?", "Father's name", "Alternate contact number", "Course name", "Batch"];
      for (var k = 0; k < bgvKeys.length; k++) {
        if (findValue(namedValues, bgvKeys[k])) {
          isBgvForm = true;
          break;
        }
      }
    }

    if (isBgvForm) {
      Logger.log("Training CRM BGV form detected from sheet: " + rawSheetName);
      
      var b_fullName = findValue(namedValues, "Name") || findValue(namedValues, "fullName") || "";
      var b_phoneRaw = findValue(namedValues, "Contact number") || findValue(namedValues, "Contact Number") || findValue(namedValues, "phone") || findValue(namedValues, "Phone") || "";
      var b_phone = normalizePhone(b_phoneRaw);
      var b_dob = findValue(namedValues, "Date of birth") || findValue(namedValues, "Date Of Birth") || findValue(namedValues, "DOB") || findValue(namedValues, "dateOfBirth") || "";
      var b_fatherName = findValue(namedValues, "Father's name") || findValue(namedValues, "Fathers name") || findValue(namedValues, "Father Name") || findValue(namedValues, "fatherName") || "";
      
      var bgvAltContact = findValue(namedValues, "AlternateContactNumber") || findValue(namedValues, "Alternate Contact Number") || findValue(namedValues, "AlternateContact") || findValue(namedValues, "alternateContactNumber") || "";
      var b_address = findValue(namedValues, "Address") || findValue(namedValues, "ADDRESS") || findValue(namedValues, "address") || "";
      var bgvPincode = findValue(namedValues, "Pincode") || findValue(namedValues, "Pin Code") || findValue(namedValues, "PostalCode") || findValue(namedValues, "pincode") || "";
      
      var b_course = findValue(namedValues, "Course name") || findValue(namedValues, "Course Name") || findValue(namedValues, "course") || findValue(namedValues, "courseName") || "";
      var b_batch = findValue(namedValues, "Batch") || findValue(namedValues, "Batch Name") || findValue(namedValues, "batchName") || "";
      var b_docAmt = findValue(namedValues, "How much amount paid for document?") || findValue(namedValues, "Document Amount") || findValue(namedValues, "documentAmount") || "";
      var b_submittedAt = findValue(namedValues, "Timestamp") || findValue(namedValues, "submittedAt") || new Date().toISOString();
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var bgvSheet = getSheetSafe(ss, BGV_RESPONSES_SHEET);
      if (bgvSheet) {
        var bgvHeaders = getSheetHeaders(bgvSheet);
        var bgvRow = buildRowByHeaders(bgvHeaders, {
          'responseId': 'bgv_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          'fullName': b_fullName,
          'phone': b_phone,
          'dateOfBirth': b_dob,
          'fatherName': b_fatherName,
          'alternateContactNumber': bgvAltContact,
          'address': b_address,
          'pincode': bgvPincode,
          'courseName': b_course,
          'batchName': b_batch,
          'documentAmount': b_docAmt,
          'submittedAt': b_submittedAt,
          'syncStatus': 'pending'
        });
        Logger.log("Appending to BGV_Responses: " + JSON.stringify(bgvRow));
        bgvSheet.appendRow(bgvRow);
        SpreadsheetApp.flush();
      }
      syncBgvResponses();
      return;
    }


    // --- REGISTRATION FORM PROCESSING ---
    Logger.log("Detected Registration Form Submission");
    // Use findValue for ALL fields - handles any key variation
    var fullName    = findValue(namedValues, "FullName") || findValue(namedValues, "Name");
    var email       = findValue(namedValues, "EMAIL") || findValue(namedValues, "EmailAddress");
    var phone       = findValue(namedValues, "MOBNO") || findValue(namedValues, "Phone") || findValue(namedValues, "ContactNumber") || findValue(namedValues, "PhoneNumber");
    var dob         = findValue(namedValues, "DOB") || findValue(namedValues, "DateOfBirth");
    var address     = findValue(namedValues, "ADDRESS");
    var branch      = findValue(namedValues, "BRANCH");
    var course      = findValue(namedValues, "DOMAIN");
    var mode        = findValue(namedValues, "MODE");
    var remarks     = findValue(namedValues, "REMARKS");
    var submittedAt = findValue(namedValues, "Timestamp") || new Date().toISOString();

    Logger.log("FullName Found = " + fullName);
    Logger.log("Email Found = " + email);
    Logger.log("Phone Found = " + phone);
    Logger.log("DOB Found = " + dob);
    Logger.log("Address Found = " + address);
    Logger.log("Branch Found = " + branch);
    Logger.log("Course Found = " + course);
    Logger.log("Mode Found = " + mode);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = getSheetSafe(ss, REGISTRATION_SHEET);
    if (!regSheet) {
      Logger.log("ERROR: Registration_Responses sheet not found");
      return;
    }

    var submissionId = 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    // DYNAMIC HEADER MAPPING for Registration_Responses
    var regHeaders = getSheetHeaders(regSheet);
    Logger.log("Registration_Responses headers = " + JSON.stringify(regHeaders));

    var regRow = buildRowByHeaders(regHeaders, {
      'submissionId': submissionId,
      'tokenEmail': email,
      'FullName': fullName,
      'email': email,
      'phone': phone,
      'dob': dob,
      'address': address,
      'course': course,
      'branch': branch,
      'submittedAt': submittedAt,
      'syncStatus': 'pending',
      'candidateId': '',
      'batchName': mode,
      'mode': mode,
      'remarks': remarks
    });

    Logger.log("Registration row to append = " + JSON.stringify(regRow));
    regSheet.appendRow(regRow);
    Logger.log("Registration_Responses row appended. FullName=" + fullName);

    SpreadsheetApp.flush();
    syncMasterCandidates();
    syncBgvResponses();
    Logger.log("syncMasterCandidates & syncBgvResponses completed");

  } catch (err) {
    Logger.log("onFormSubmit ERROR: " + err.toString());
  }
}

// ============================================================
// CORE SYNC: Registration_Responses -> Master_Candidates
// ============================================================

function syncMasterCandidates() {
  Logger.log("syncMasterCandidates called");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regSheet = getSheetSafe(ss, REGISTRATION_SHEET);
  var masterSheet = getSheetSafe(ss, MASTER_SHEET_NAME);

  if (!regSheet || !masterSheet) {
    Logger.log("syncMaster ERROR: Required sheets not found");
    return { success: false, error: 'Required sheets not found', synced: 0, skipped: 0, total: 0 };
  }

  var regData = regSheet.getDataRange().getValues();
  if (regData.length < 2) {
    return { success: true, synced: 0, skipped: 0, total: 0, message: 'No form responses found' };
  }

  var regHeaders = regData[0].map(function(h) { return String(h).trim(); });
  var masterData = masterSheet.getDataRange().getValues();
  var masterHeaders = masterData[0].map(function(h) { return String(h).trim(); });

  Logger.log("syncMaster regHeaders = " + JSON.stringify(regHeaders));
  Logger.log("syncMaster masterHeaders = " + JSON.stringify(masterHeaders));

  // Build existing email/phone lookup from Master_Candidates
  var existingEmails = {};
  var existingPhones = {};

  for (var m = 1; m < masterData.length; m++) {
    var mRowObj = rowToObj(masterHeaders, masterData[m]);
    if (isObjEmpty(mRowObj)) continue;
    var mEmail = String(mRowObj['email'] || '').toLowerCase().trim();
    var mPhone = normalizePhone(mRowObj['phone'] || '');
    if (mEmail) existingEmails[mEmail] = m + 1;
    if (mPhone) existingPhones[mPhone] = m + 1;
  }

  var synced = 0;
  var skipped = 0;
  var newCandidates = [];
  var now = new Date().toISOString();

  for (var r = 1; r < regData.length; r++) {
    var rowObj = rowToObj(regHeaders, regData[r]);

    var status = String(rowObj['syncStatus'] || '').trim();
    if (status === 'imported' || status === 'synced') {
      continue;
    }

    // Read fields by header name - NEVER by index
    var fullName = String(rowObj['FullName'] || rowObj['fullName'] || '').trim();
    var email    = String(rowObj['email'] || rowObj['tokenEmail'] || '').trim();
    var phone    = String(rowObj['phone'] || rowObj['phoneNumber'] || rowObj['Phone Number'] || rowObj['contactNumber'] || rowObj['Contact Number'] || rowObj['MobNo'] || rowObj['Phone'] || '').trim();
    var dob      = String(rowObj['dob'] || rowObj['dateOfBirth'] || '').trim();
    var addr     = String(rowObj['address'] || '').trim();
    var branch   = String(rowObj['branch'] || '').trim();
    var course   = String(rowObj['course'] || rowObj['domain'] || '').trim();
    var batch    = String(rowObj['batchName'] || rowObj['mode'] || '').trim();

    Logger.log("syncMaster row " + r + ": FullName=" + fullName + " email=" + email + " dob=" + dob + " address=" + addr);

    // Check for duplicate in Master_Candidates
    var targetMasterRow = -1;
    if (email) {
      var normEmail = email.toLowerCase().trim();
      if (existingEmails[normEmail]) targetMasterRow = existingEmails[normEmail];
    }
    if (targetMasterRow === -1 && phone) {
      var normPhone = normalizePhone(phone);
      if (normPhone.length >= 10 && existingPhones[normPhone]) targetMasterRow = existingPhones[normPhone];
    }

    if (targetMasterRow !== -1) {
      // UPDATE existing Master row using DYNAMIC headers
      if (fullName) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'FullName', fullName);
      if (email) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'email', email);
      
      // Do not overwrite existing valid phone number unnecessarily
      if (phone) {
        var existingRowObj = rowToObj(masterHeaders, masterData[targetMasterRow - 1]);
        var existingPhone = String(existingRowObj['phone'] || '').trim();
        if (!existingPhone) {
          setByHeader(masterSheet, masterHeaders, targetMasterRow, 'phone', phone);
        }
      }
      
      if (branch) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'branch', branch);
      if (course) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'course', course);
      if (batch) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'batchName', batch);
      setByHeader(masterSheet, masterHeaders, targetMasterRow, 'updatedAt', now);

      setByHeader(regSheet, regHeaders, r + 1, 'syncStatus', 'imported');
      Logger.log("syncMaster: Updated existing Master row " + targetMasterRow + " FullName=" + fullName);
      synced++;
      continue;
    }

    // NEW candidate
    var candidateId = String(rowObj['candidateId'] || '').trim();
    if (!candidateId) {
      candidateId = 'c_' + Date.now() + r;
    }

    setByHeader(regSheet, regHeaders, r + 1, 'syncStatus', 'imported');
    setByHeader(regSheet, regHeaders, r + 1, 'candidateId', candidateId);

    // Build new Master_Candidates row using DYNAMIC headers
    var newMasterRow = buildRowByHeaders(masterHeaders, {
      'candidateId': candidateId,
      'FullName': fullName,
      'email': email,
      'phone': phone,
      'batchName': batch,
      'branch': branch,
      'course': course,
      'dateOfJoining': now.split('T')[0],
      'currentStatus': 'active',
      'bgvStatus': 'pending',
      'placed': 'FALSE',
      'placedCompany': '',
      'trackedStatus': 'form-pending',
      'trackedAt': now,
      'createdAt': now,
      'updatedAt': now
    });

    masterSheet.appendRow(newMasterRow);
    Logger.log("syncMaster: New Master row candidateId=" + candidateId + " FullName=" + fullName + " email=" + email + " dob=" + dob + " address=" + addr);

    if (email) existingEmails[email.toLowerCase().trim()] = masterSheet.getLastRow();
    if (phone) existingPhones[normalizePhone(phone)] = masterSheet.getLastRow();

    newCandidates.push({ candidateId: candidateId, fullName: fullName, email: email, phone: phone });
    synced++;
  }

  syncBgvResponses();

  Logger.log("syncMaster DONE: synced=" + synced + " skipped=" + skipped + " total=" + (regData.length - 1));

  return {
    success: true,
    synced: synced,
    skipped: skipped,
    total: regData.length - 1,
    newCandidates: newCandidates,
    timestamp: now
  };
}

// ============================================================
// DATA RETRIEVAL
// ============================================================

function getCandidates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetSafe(ss, MASTER_SHEET_NAME);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var candidates = [];

  for (var i = 1; i < data.length; i++) {
    var obj = rowToObj(headers, data[i]);
    if (isObjEmpty(obj)) continue;
    if (obj['candidateId'] || obj['FullName'] || obj['fullName']) {
      candidates.push(obj);
    }
  }

  return candidates;
}

function getDashboardMetrics() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var candidates = getCandidates();
  
  var totalCandidates = candidates.length;
  var placedCount = 0;
  var newJoinees = 0;
  var bgvPending = 0;
  var bgvCompleted = 0;
  var addedToday = 0;
  
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();
  var todayStr = now.toISOString().split('T')[0];

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    
    // Placed
    if (String(c['placed'] || '').toUpperCase() === 'TRUE') placedCount++;
    
    // BGV
    var bgv = String(c['bgvStatus'] || '').toLowerCase();
    if (bgv === 'pending') bgvPending++;
    if (bgv === 'cleared' || bgv === 'completed') bgvCompleted++;
    
    // New Joinees (Current Month)
    var dojStr = String(c['dateOfJoining'] || c['createdAt'] || '');
    if (dojStr) {
      var doj = new Date(dojStr);
      if (doj.getMonth() === currentMonth && doj.getFullYear() === currentYear) {
        newJoinees++;
      }
      if (dojStr.indexOf(todayStr) === 0) {
        addedToday++;
      }
    }
  }

  // Financials
  var revenue = 0;          // Sum of Payment_Records.amount
  var paymentsReceived = 0; // Sum of Financial_Ledger.paidToDate
  var pendingDues = 0;      // Sum of Financial_Ledger.pendingDues

  var paymentSheet = getSheetSafe(ss, PAYMENT_RECORDS_SHEET);
  if (paymentSheet) {
    var payData = paymentSheet.getDataRange().getValues();
    if (payData.length > 1) {
      var payHeaders = payData[0].map(function(h) { return String(h).trim(); });
      for (var r2 = 1; r2 < payData.length; r2++) {
        var pObj = rowToObj(payHeaders, payData[r2]);
        if (isObjEmpty(pObj)) continue;
        var rowCandId = String(pObj['candidateId'] || pObj['CandidateId'] || pObj['Candidate ID'] || '').trim();
        var rowAmount = parseFloat(pObj['amount'] || pObj['Amount'] || 0) || 0;
        // Only require candidateId and valid amount for revenue
        if (rowCandId && rowAmount > 0) {
          revenue += rowAmount;
        }
      }
    }
  }

  var ledgerSheet = getSheetSafe(ss, FINANCIAL_LEDGER_SHEET);
  if (ledgerSheet) {
    var ledgerData = ledgerSheet.getDataRange().getValues();
    if (ledgerData.length > 1) {
      var ledgerHeaders = ledgerData[0].map(function(h) { return String(h).trim(); });
      for (var r = 1; r < ledgerData.length; r++) {
        var lObj = rowToObj(ledgerHeaders, ledgerData[r]);
        if (isObjEmpty(lObj)) continue;
        paymentsReceived += parseFloat(lObj['paidToDate']  || 0) || 0;
        pendingDues      += parseFloat(lObj['pendingDues'] || 0) || 0;
      }
    }
  }

  return {
    success:          true,
    totalCandidates:  totalCandidates,
    newJoinees:       newJoinees,
    bgvPending:       bgvPending,
    bgvCompleted:     bgvCompleted,
    placedCount:      placedCount,
    revenue:          revenue,
    paymentsReceived: paymentsReceived,
    pendingDues:      pendingDues,
    documentsPending: 0, // Computed on frontend
    addedToday:       addedToday,
    timestamp:        new Date().toISOString()
  };
}

function exportAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var getSheetData = function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var obj = rowToObj(headers, data[i]);
      if (!isObjEmpty(obj)) rows.push(obj);
    }
    return rows;
  };

  return {
    success: true,
    data: {
      candidates: getSheetData(MASTER_SHEET_NAME),
      registrations: getSheetData(REGISTRATION_SHEET),
      payments: getSheetData(PAYMENT_RECORDS_SHEET),
      financials: getSheetData(FINANCIAL_LEDGER_SHEET),
      auditLogs: getSheetData(SYSTEM_AUDIT_LOGS_SHEET),
      bgv: getSheetData(BGV_RESPONSES_SHEET)
    },
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// PAYMENT RECORDS - READ
// ============================================================

function getPayments(filterCandidateId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paymentSheet = getSheetSafe(ss, PAYMENT_RECORDS_SHEET);
  if (!paymentSheet) {
    return { success: true, payments: [], timestamp: new Date().toISOString() };
  }

  var data = paymentSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { success: true, payments: [], timestamp: new Date().toISOString() };
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var payments = [];

  for (var i = 1; i < data.length; i++) {
    var obj = rowToObj(headers, data[i]);
    if (isObjEmpty(obj)) continue;
    if (filterCandidateId && obj['candidateId'] !== filterCandidateId) continue;
    payments.push(obj);
  }

  return { success: true, payments: payments, timestamp: new Date().toISOString() };
}

// ============================================================
// FINANCIAL LEDGER - UPSERT & READ
// ============================================================

/**
 * Recalculates paidToDate from Payment_Records and upserts the
 * Financial_Ledger row for a given candidateId + pipelineType.
 */
function upsertFinancialLedger(ss, candidateId, candidateName, pipelineType, pipelineLabel) {
  // Hard guard: never write a ledger row without required fields
  if (!candidateId || !pipelineType || !candidateName || !pipelineLabel) {
    Logger.log('upsertFinancialLedger SKIPPED: Missing required fields. candidateId=' + candidateId + ' candidateName=' + candidateName + ' pipelineType=' + pipelineType + ' pipelineLabel=' + pipelineLabel);
    return;
  }

  Logger.log('upsertFinancialLedger START: candidateId=' + candidateId + ' pipelineType=' + pipelineType + ' pipelineLabel=' + pipelineLabel);

  // ── Sum all payments for this candidate + pipeline ──────────
  var paymentSheet = getSheetSafe(ss, PAYMENT_RECORDS_SHEET);
  var totalPaid = 0;
  if (paymentSheet) {
    var payData = paymentSheet.getDataRange().getValues();
    if (payData.length > 1) {
      var payHeaders = payData[0].map(function(h) { return String(h).trim(); });
      for (var r = 1; r < payData.length; r++) {
        var pObj = rowToObj(payHeaders, payData[r]);
        if (isObjEmpty(pObj)) continue;
        var rowCandId     = String(pObj['candidateId']  || pObj['CandidateId'] || pObj['Candidate ID'] || '').trim();
        var rowPipeKey    = String(pObj['pipelineType'] || pObj['Pipeline Type'] || '').trim();
        var rowPipeLabel  = String(pObj['paymentType']  || pObj['Payment Type'] || '').trim();
        var rowAmount     = parseFloat(pObj['amount'] || pObj['Amount'] || 0) || 0;
        if (!rowCandId || rowAmount <= 0) continue;
        if (rowCandId !== candidateId) continue;
        // Match if pipelineType key matches OR paymentType label matches
        if (rowPipeKey === pipelineType || rowPipeLabel === pipelineLabel ||
            rowPipeKey === pipelineLabel || rowPipeLabel === pipelineType) {
          totalPaid += rowAmount;
        }
      }
    }
  }

  // ── Ensure Financial_Ledger sheet has correct columns ────────
  var requiredLedgerColumns = [
    'ledgerId','candidateId','candidateName','pipelineType','pipelineLabel',
    'baseFee','totalAdjustments','adjustmentsJson','netPayable','paidToDate','pendingDues','updatedAt'
  ];
  var ledgerSheet = ensureSheetWithColumns(ss, FINANCIAL_LEDGER_SHEET, requiredLedgerColumns);

  var ledgerHeaders = getSheetHeaders(ledgerSheet);
  var now           = new Date().toISOString();

  // ── Default fee schedule ──────────────────────────────────────
  var defaultFees = {
    'registration':  0,     'Registration':  0,
    'course':        30000, 'Course Fee':    30000,
    'document':      25000, 'Document Fee':  25000,
    'placement':     100000,'Placement Fee': 100000
  };

  var existingBaseFee     = defaultFees[pipelineType] !== undefined ? defaultFees[pipelineType]
                          : (defaultFees[pipelineLabel] !== undefined ? defaultFees[pipelineLabel] : 0);
  var existingAdjustments = 0;
  var targetRow           = -1;

  // ── Look for existing ledger row ──
  var ledgerData = ledgerSheet.getDataRange().getValues();
  if (ledgerData.length > 1) {
    var lHeaders = ledgerData[0].map(function(h) { return String(h).trim(); });
    for (var lr = 1; lr < ledgerData.length; lr++) {
      var lObj    = rowToObj(lHeaders, ledgerData[lr]);
      var lCandId = String(lObj['candidateId'] || lObj['Candidate ID'] || lObj['CandidateId'] || '').trim();
      var lPipe   = String(lObj['pipelineType'] || lObj['Pipeline Type'] || '').trim();
      if (!lCandId) continue; // Skip blank rows
      if (lCandId === candidateId && lPipe === pipelineType) {
        targetRow           = lr + 1; // 1-indexed sheet row
        existingBaseFee     = parseFloat(lObj['baseFee'] || lObj['Base Fee'] || existingBaseFee) || existingBaseFee;
        existingAdjustments = parseFloat(lObj['totalAdjustments'] || lObj['Total Adjustments'] || 0) || 0;
        break;
      }
    }
  }

  var netPayable  = Math.max(0, existingBaseFee - Math.abs(existingAdjustments));
  var pendingDues = netPayable - totalPaid;

  Logger.log('upsertFinancialLedger: netPayable=' + netPayable + ' paidToDate=' + totalPaid + ' pendingDues=' + pendingDues + ' targetRow=' + targetRow);

  if (targetRow === -1) {
    // ── INSERT: only when candidateId is confirmed non-empty ─────
    var ledgerId     = 'ledger_' + candidateId + '_' + pipelineType;
    var newLedgerRow = buildRowByHeaders(ledgerHeaders, {
      'ledgerId':         ledgerId,
      'candidateId':      candidateId,
      'candidateName':    candidateName,
      'pipelineType':     pipelineType,
      'pipelineLabel':    pipelineLabel,
      'baseFee':          existingBaseFee,
      'totalAdjustments': existingAdjustments,
      'netPayable':       netPayable,
      'paidToDate':       totalPaid,
      'pendingDues':      pendingDues,
      'updatedAt':        now
    });
    ledgerSheet.appendRow(newLedgerRow);
    Logger.log('upsertFinancialLedger: INSERT new row for candidateId=' + candidateId + ' pipelineType=' + pipelineType);
  } else {
    // ── UPDATE existing row in-place ──────────────────────────────
    setByHeader(ledgerSheet, ledgerHeaders, targetRow, 'paidToDate',       totalPaid);
    setByHeader(ledgerSheet, ledgerHeaders, targetRow, 'netPayable',       netPayable);
    setByHeader(ledgerSheet, ledgerHeaders, targetRow, 'pendingDues',      pendingDues);
    setByHeader(ledgerSheet, ledgerHeaders, targetRow, 'candidateName',    candidateName);
    setByHeader(ledgerSheet, ledgerHeaders, targetRow, 'pipelineLabel',    pipelineLabel);
    setByHeader(ledgerSheet, ledgerHeaders, targetRow, 'updatedAt',        now);
    Logger.log('upsertFinancialLedger: UPDATE row ' + targetRow + ' for candidateId=' + candidateId);
  }
}

/**
 * Ensures a sheet with the given name exists and has at least the required column headers.
 * If the sheet does not exist, creates it with those headers.
 * If the sheet exists but is missing some columns, appends the missing ones to the right.
 * Never deletes existing columns or data.
 * Returns the sheet object.
 */
function ensureDirectPlacementColumns_(sheet, requiredColumns) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    sheet.appendRow(requiredColumns);
    return sheet;
  }
  
  var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
  var headerRow = data[masterHeaderRowIdx] || [];
  
  var existingMap = {};
  headerRow.forEach(function(h, idx) {
    var key = normalizeHeader_(h);
    if (key && existingMap[key] === undefined) {
      existingMap[key] = idx;
    }
  });
  
  var toAppend = [];
  requiredColumns.forEach(function(col) {
    var key = normalizeHeader_(col);
    if (existingMap[key] === undefined) {
      toAppend.push(col);
    }
  });
  
  if (toAppend.length > 0) {
    var maxCol = sheet.getLastColumn();
    var rowToUpdate = masterHeaderRowIdx + 1; // 1-indexed for Apps Script range
    sheet.getRange(rowToUpdate, maxCol + 1, 1, toAppend.length).setValues([toAppend]);
  }
  return sheet;
}

function ensureSheetWithColumns(ss, sheetName, requiredColumns) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(requiredColumns);
    sheet.getRange(1, 1, 1, requiredColumns.length).setFontWeight('bold');
    Logger.log('ensureSheetWithColumns: Created new sheet "' + sheetName + '" with ' + requiredColumns.length + ' columns');
    return sheet;
  }

  // Sheet exists — check for missing columns and add them
  var existingHeaders = getSheetHeaders(sheet);
  var existingNorm    = existingHeaders.map(function(h) { return h.toLowerCase().replace(/[^a-z0-9]/g, ''); });
  var added = 0;
  for (var i = 0; i < requiredColumns.length; i++) {
    var reqNorm = requiredColumns[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (existingNorm.indexOf(reqNorm) === -1) {
      var newColIndex = existingHeaders.length + added + 1;
      sheet.getRange(1, newColIndex).setValue(requiredColumns[i]).setFontWeight('bold');
      added++;
      Logger.log('ensureSheetWithColumns: Added missing column "' + requiredColumns[i] + '" at col ' + newColIndex + ' to sheet "' + sheetName + '"');
    }
  }
  return sheet;
}

/**
 * Returns Financial_Ledger rows for a candidate (or all if no filter).
 */
function getFinancials(filterCandidateId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ledgerSheet = getSheetSafe(ss, FINANCIAL_LEDGER_SHEET);
  if (!ledgerSheet) {
    return { success: true, financials: [], timestamp: new Date().toISOString() };
  }

  var data = ledgerSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { success: true, financials: [], timestamp: new Date().toISOString() };
  }

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var financials = [];

  for (var i = 1; i < data.length; i++) {
    var obj = rowToObj(headers, data[i]);
    if (isObjEmpty(obj)) continue;
    if (filterCandidateId && obj['candidateId'] !== filterCandidateId) continue;
    financials.push(obj);
  }

  return { success: true, financials: financials, timestamp: new Date().toISOString() };
}

// ============================================================
// SYSTEM AUDIT LOGS - UPSERT & READ
// ============================================================

function logAuditToSheet(ss, candidateId, candidateName, actionType, oldValue, newValue, userStamp, timestamp) {
  var requiredColumns = ['logId', 'candidateId', 'logType', 'description', 'reason', 'userStamp', 'timestamp', 'auditId', 'candidateName', 'actionType', 'oldValue', 'newValue', 'user'];
  var auditSheet = ensureSheetWithColumns(ss, SYSTEM_AUDIT_LOGS_SHEET, requiredColumns);
  var headers = getSheetHeaders(auditSheet);
  
  var hasAuditData = String(candidateId || '').trim() || String(actionType || '').trim();
  if (!hasAuditData) {
    Logger.log('Audit skipped: empty audit payload');
    return;
  }
  
  var now = timestamp || new Date().toISOString();
  var generatedLogId = 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  
  var auditData = {
    logId: generatedLogId,
    candidateId: candidateId || '',
    logType: actionType || '',
    description: actionType || '',
    reason: '',
    userStamp: userStamp || 'System',
    timestamp: now,
    auditId: generatedLogId,
    candidateName: candidateName || '',
    actionType: actionType || '',
    oldValue: oldValue || '',
    newValue: newValue || '',
    user: userStamp || 'System'
  };
  
  var newRow = buildRowByHeaders(headers, auditData);
  auditSheet.appendRow(newRow);
}

function getAuditLogs(filterCandidateId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var auditSheet = getSheetSafe(ss, SYSTEM_AUDIT_LOGS_SHEET);
  if (!auditSheet) {
    return { success: true, logs: [], timestamp: new Date().toISOString() };
  }
  
  var data = auditSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { success: true, logs: [], timestamp: new Date().toISOString() };
  }
  
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var logs = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = rowToObj(headers, data[i]);
    if (isObjEmpty(obj)) continue;
    if (filterCandidateId && obj['candidateId'] !== filterCandidateId) continue;
    logs.push(obj);
  }
  
  return { success: true, logs: logs, timestamp: new Date().toISOString() };
}

// ============================================================
// UTILITIESC HELPER FUNCTIONS (NO HARDCODED INDEXES)
// ============================================================

function getSheetHeaders(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return [];
  return data[0].map(function(h) { return String(h).trim(); });
}

function rowToObj(headers, values) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    var key = String(headers[i]).trim();
    if (!key) continue;
    var val = (i < values.length) ? values[i] : '';
    if (val instanceof Date) {
      val = val.toISOString();
    } else if (val !== undefined && val !== null) {
      val = String(val);
    } else {
      val = '';
    }
    // Prevent empty duplicate columns from overwriting valid data
    if (!obj[key] || val) {
      obj[key] = val;
    }
  }
  return obj;
}

function buildRowByHeaders(headers, fieldMap) {
  var lookup = {};
  for (var key in fieldMap) {
    var norm = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    lookup[norm] = fieldMap[key];
  }

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var headerNorm = String(headers[i]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lookup.hasOwnProperty(headerNorm)) {
      row.push(lookup[headerNorm]);
    } else {
      row.push('');
    }
  }
  return row;
}

function setByHeader(sheet, headers, rowNum, headerName, value) {
  var colIndex = findHeaderCol(headers, headerName);
  if (colIndex >= 0) {
    sheet.getRange(rowNum, colIndex + 1).setValue(value);
  }
}

function findHeaderCol(headers, name) {
  var target = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (h === target) return i;
  }
  return -1;
}

function isObjEmpty(obj) {
  for (var key in obj) {
    var val = obj[key];
    if (val !== '' && val !== null && val !== undefined && String(val).trim() !== '') {
      return false;
    }
  }
  return true;
}

function normalizePhone(val) {
  var digits = String(val).replace(/\D/g, '');
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  return digits;
}

// ============================================================
// ONE-OFF DATA RECOVERY & REPAIR
// ============================================================

function rebuildFinancialLedger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var paymentSheet = getSheetSafe(ss, PAYMENT_RECORDS_SHEET);
  
  if (!paymentSheet) {
    Logger.log('rebuildFinancialLedger: Payment_Records sheet not found.');
    return { success: false, error: 'Payment_Records sheet not found' };
  }

  // ── Counters ──
  var paymentRowsScanned = 0;
  var validRowsUsed = 0;
  var rowsSkipped = 0;
  var repairedCandidateName = 0;
  var repairedPipelineLabel = 0;
  var repairedPaymentDate = 0;
  var ledgerRowsWritten = 0;

  // ── Pipeline label fallback map ──
  var pipelineTypeToLabel = {
    'registration': 'Registration Fee',
    'course':       'Course Fee',
    'document':     'Document Fee',
    'placement':    'Placement Fee'
  };

  // ── Default base fees ──
  var defaultBaseFees = {
    'registration': 0,
    'course':       30000,
    'document':     25000,
    'placement':    100000
  };

  // ── 1. Build Master_Candidates name lookup ──
  var masterNameMap = {}; // { candidateId: 'Full Name' }
  var masterSheet = getSheetSafe(ss, MASTER_SHEET_NAME);
  if (masterSheet) {
    var masterData = masterSheet.getDataRange().getValues();
    if (masterData.length > 1) {
      var masterHeaders = masterData[0].map(function(h) { return String(h).trim(); });
      for (var m = 1; m < masterData.length; m++) {
        var mObj = rowToObj(masterHeaders, masterData[m]);
        var mId = String(mObj['candidateId'] || '').trim();
        var mName = String(mObj['FullName'] || mObj['fullName'] || '').trim();
        if (mId && mName) {
          masterNameMap[mId] = mName;
        }
      }
    }
  }
  Logger.log('rebuildFinancialLedger: Loaded ' + Object.keys(masterNameMap).length + ' names from Master_Candidates.');

  // ── 2. Read Payment_Records and aggregate totals ──
  var payData = paymentSheet.getDataRange().getValues();
  var payHeaders = payData.length > 0 ? payData[0].map(function(h) { return String(h).trim(); }) : [];
  var paymentTotals = {}; // { 'candidateId|pipelineType': { total, candidateName, pipelineLabel } }

  for (var r = 1; r < payData.length; r++) {
    var pObj = rowToObj(payHeaders, payData[r]);
    if (isObjEmpty(pObj)) continue;
    paymentRowsScanned++;

    var candId   = String(pObj['candidateId'] || pObj['CandidateId'] || pObj['Candidate ID'] || '').trim();
    var pipeKey  = String(pObj['pipelineType'] || pObj['Pipeline Type'] || '').trim();
    var amount   = parseFloat(pObj['amount'] || pObj['Amount']);

    // ── Hard skip: these 3 fields are truly required ──
    if (!candId || !pipeKey || isNaN(amount) || amount <= 0) {
      Logger.log('rebuildFinancialLedger: SKIPPED row ' + (r+1) + ' (candId="' + candId + '", pipeKey="' + pipeKey + '", amount=' + amount + ')');
      rowsSkipped++;
      continue;
    }

    // ── Repair candidateName ──
    var candName = String(pObj['candidateName'] || pObj['Candidate Name'] || '').trim();
    if (!candName) {
      candName = masterNameMap[candId] || ('Unknown (' + candId + ')');
      repairedCandidateName++;
    }

    // ── Repair pipelineLabel ──
    var pipeLabel = String(pObj['paymentType'] || pObj['Payment Type'] || pObj['pipelineLabel'] || '').trim();
    if (!pipeLabel) {
      pipeLabel = pipelineTypeToLabel[pipeKey] || pipeKey;
      repairedPipelineLabel++;
    }

    // ── Repair paymentDate ──
    var paymentDate = String(pObj['paymentDate'] || pObj['Payment Date'] || pObj['PaymentDate'] || '').trim();
    if (!paymentDate) {
      var fallbackTs = String(pObj['timestamp'] || pObj['Timestamp'] || '').trim();
      var fallbackCr = String(pObj['createdAt'] || pObj['CreatedAt'] || '').trim();
      if (fallbackTs) {
        paymentDate = fallbackTs.substring(0, 10);
      } else if (fallbackCr) {
        paymentDate = fallbackCr.substring(0, 10);
      } else {
        paymentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      repairedPaymentDate++;
    }

    validRowsUsed++;

    var key = candId + '|' + pipeKey;
    if (!paymentTotals[key]) {
      paymentTotals[key] = { total: 0, candidateName: candName, pipelineLabel: pipeLabel };
    }
    paymentTotals[key].total += amount;
    // Prefer non-empty names/labels from later rows
    if (candName && candName.indexOf('Unknown') === -1) {
      paymentTotals[key].candidateName = candName;
    }
    if (pipeLabel) {
      paymentTotals[key].pipelineLabel = pipeLabel;
    }
  }

  // ── 3. Ensure Financial_Ledger sheet + columns exist ──
  var requiredLedgerColumns = [
    'ledgerId','candidateId','candidateName','pipelineType','pipelineLabel',
    'baseFee','totalAdjustments','adjustmentsJson','netPayable','paidToDate','pendingDues','updatedAt'
  ];
  var ledgerSheet = ensureSheetWithColumns(ss, FINANCIAL_LEDGER_SHEET, requiredLedgerColumns);

  // ── 4. READ existing ledger data to preserve baseFee & adjustments ──
  var lastRow = ledgerSheet.getLastRow();
  var existingLedger = {};
  if (lastRow > 1) {
    var oldData = ledgerSheet.getDataRange().getValues();
    var oldHeaders = oldData[0].map(function(h) { return String(h).trim(); });
    for (var r = 1; r < oldData.length; r++) {
      var oldObj = rowToObj(oldHeaders, oldData[r]);
      var cId = String(oldObj['candidateId']).trim();
      var pType = String(oldObj['pipelineType']).trim();
      if (cId && pType) {
        existingLedger[cId + '|' + pType] = {
          baseFee: parseFloat(oldObj['baseFee']) || 0,
          totalAdjustments: parseFloat(oldObj['totalAdjustments']) || 0,
          adjustmentsJson: String(oldObj['adjustmentsJson'] || '[]')
        };
      }
    }
    
    // Now delete all data rows
    ledgerSheet.deleteRows(2, lastRow - 1);
    Logger.log('rebuildFinancialLedger: Cleared ' + (lastRow - 1) + ' old ledger rows.');
  }

  // ── 5. Write fresh ledger rows from paymentTotals ──
  var ledgerHeaders = getSheetHeaders(ledgerSheet);
  var now = new Date().toISOString();

  // Merge any existing ledger entries that had NO payments but DID have adjustments/baseFee
  for (var k in existingLedger) {
    if (!paymentTotals[k]) {
      var parts = k.split('|');
      var cId   = parts[0];
      var pType = parts[1];
      var candName = masterNameMap[cId] || ('Unknown (' + cId + ')');
      var pipeLabel = pipelineTypeToLabel[pType] || pType;
      paymentTotals[k] = { total: 0, candidateName: candName, pipelineLabel: pipeLabel };
    }
  }

  for (var key in paymentTotals) {
    var parts = key.split('|');
    var cId   = parts[0];
    var pType = parts[1];
    var data  = paymentTotals[key];

    var oldL = existingLedger[key] || {};
    var defaultFee = defaultBaseFees[pType] !== undefined ? defaultBaseFees[pType] : 0;
    
    var baseFee         = oldL.baseFee !== undefined && oldL.baseFee > 0 ? oldL.baseFee : defaultFee;
    var totalAdjustments = oldL.totalAdjustments || 0;
    var adjustmentsJson  = oldL.adjustmentsJson || '[]';
    
    var netPayable      = Math.max(0, baseFee - Math.abs(totalAdjustments));
    var paidToDate      = data.total;
    var pendingDues     = netPayable - paidToDate;

    var newRow = buildRowByHeaders(ledgerHeaders, {
      'ledgerId':         'ledger_' + cId + '_' + pType,
      'candidateId':      cId,
      'candidateName':    data.candidateName,
      'pipelineType':     pType,
      'pipelineLabel':    data.pipelineLabel,
      'baseFee':          baseFee,
      'totalAdjustments': totalAdjustments,
      'adjustmentsJson':  adjustmentsJson,
      'netPayable':       netPayable,
      'paidToDate':       paidToDate,
      'pendingDues':      pendingDues,
      'updatedAt':        now
    });
    ledgerSheet.appendRow(newRow);
    ledgerRowsWritten++;
  }

  SpreadsheetApp.flush();

  // ── 6. Log summary ──
  Logger.log('═══════════════════════════════════════════');
  Logger.log('  rebuildFinancialLedger COMPLETE');
  Logger.log('  Payment rows scanned:              ' + paymentRowsScanned);
  Logger.log('  Valid rows used:                   ' + validRowsUsed);
  Logger.log('  Rows repaired (candidateName):     ' + repairedCandidateName);
  Logger.log('  Rows repaired (pipelineLabel):     ' + repairedPipelineLabel);
  Logger.log('  Rows repaired (paymentDate):       ' + repairedPaymentDate);
  Logger.log('  Rows skipped (missing id/pipe/amt): ' + rowsSkipped);
  Logger.log('  Ledger rows written:               ' + ledgerRowsWritten);
  Logger.log('═══════════════════════════════════════════');

  return {
    success: true,
    summary: {
      paymentRowsScanned:  paymentRowsScanned,
      validRowsUsed:       validRowsUsed,
      repairedCandidateName: repairedCandidateName,
      repairedPipelineLabel: repairedPipelineLabel,
      repairedPaymentDate: repairedPaymentDate,
      rowsSkipped:         rowsSkipped,
      ledgerRowsWritten:   ledgerRowsWritten
    }
  };
}

function fixOldData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = getSheetSafe(ss, FORM_SOURCE_SHEET);
  var regSheet = getSheetSafe(ss, REGISTRATION_SHEET);

  if (!rawSheet || !regSheet) {
    Logger.log("fixOldData: Could not find required sheets.");
    return;
  }

  var rawData = rawSheet.getDataRange().getValues();
  var regData = regSheet.getDataRange().getValues();

  if (rawData.length < 2 || regData.length < 2) return;

  var rawHeaders = rawData[0].map(function(h) { return String(h).trim(); });
  var regHeaders = regData[0].map(function(h) { return String(h).trim(); });

  var fixesApplied = 0;

  for (var i = 1; i < rawData.length; i++) {
    var rawObj = rowToObj(rawHeaders, rawData[i]);
    var rawEmail = String(rawObj['EMAIL'] || rawObj['email'] || '').toLowerCase().trim();
    var rawPhone = normalizePhone(rawObj['MOB NO'] || rawObj['phone'] || '');

    if (!rawEmail && !rawPhone) continue;

    for (var j = 1; j < regData.length; j++) {
      var regObj = rowToObj(regHeaders, regData[j]);
      var regEmail = String(regObj['email'] || regObj['tokenEmail'] || '').toLowerCase().trim();
      var regPhone = normalizePhone(regObj['phone'] || '');

      if ((rawEmail && rawEmail === regEmail) || (rawPhone && rawPhone === regPhone)) {
        var regFullName = String(regObj['FullName'] || regObj['fullName'] || '').trim();
        var rawFullName = String(rawObj['FullName'] || rawObj['fullName'] || rawObj['name'] || '').trim();
        if (!regFullName && rawFullName) {
          setByHeader(regSheet, regHeaders, j + 1, 'FullName', rawFullName);
          fixesApplied++;
        }

        var regDob = String(regObj['dob'] || regObj['DOB'] || '').trim();
        var rawDob = String(rawObj['DOB'] || rawObj['dob'] || '').trim();
        if (!regDob && rawDob) {
          setByHeader(regSheet, regHeaders, j + 1, 'dob', rawDob);
          fixesApplied++;
        }

        var regAddr = String(regObj['address'] || regObj['ADDRESS'] || '').trim();
        var rawAddr = String(rawObj['ADDRESS'] || rawObj['address'] || '').trim();
        if (!regAddr && rawAddr) {
          setByHeader(regSheet, regHeaders, j + 1, 'address', rawAddr);
          fixesApplied++;
        }

        var regBranch = String(regObj['branch'] || '').trim();
        var rawBranch = String(rawObj['BRANCH'] || rawObj['branch'] || '').trim();
        if (!regBranch && rawBranch) {
          setByHeader(regSheet, regHeaders, j + 1, 'branch', rawBranch);
          fixesApplied++;
        }
      }
    }
  }

  Logger.log("fixOldData: Applied " + fixesApplied + " fixes. Now syncing to Master...");
  syncMasterCandidates();
}

// ============================================================
// BGV SYNC: BGV_Responses -> Master_Candidates
// Matching: Contact Number (primary) -> Name+Course+Batch (fallback)
// ============================================================

function normalizeBgvHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/['"?!.,;:]/g, '')
    .replace(/[\s_\-\r\n]/g, '');
}


function syncBgvResponses(e) {
  Logger.log("BGV submission received");
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { success: false, error: 'System busy, try again later' };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Reading BGV_Responses");
    var bgvSheet = getSheetSafe(ss, BGV_RESPONSES_SHEET);
    if (!bgvSheet) {
      return { success: false, error: 'Missing BGV response sheet' };
    }

    var bgvData = bgvSheet.getDataRange().getValues();
    if (bgvData.length < 2) return { success: true, message: 'No data' };

    Logger.log("Searching Master_Candidates");
    var masterSheet = getSheetSafe(ss, MASTER_SHEET_NAME);
    if (!masterSheet) return { success: false, error: 'Missing master sheet' };
    
    // Ensure required columns
    var reqCols = ['bgvStatus', 'bgvSubmittedAt', 'bgvDob', 'bgvFatherName', 'bgvAlternateContactNumber', 'bgvAddress', 'bgvPincode', 'bgvCourseName', 'bgvBatch', 'bgvDocumentAmount'];
    var existingMasterHeaders = getSheetHeaders(masterSheet);
    var existingMasterNorm = existingMasterHeaders.map(normalizeBgvHeader);
    var added = 0;
    for (var i = 0; i < reqCols.length; i++) {
      var reqNorm = normalizeBgvHeader(reqCols[i]);
      if (existingMasterNorm.indexOf(reqNorm) === -1) {
        var newColIndex = existingMasterHeaders.length + added + 1;
        masterSheet.getRange(1, newColIndex).setValue(reqCols[i]).setFontWeight('bold');
        added++;
      }
    }
    if (added > 0) SpreadsheetApp.flush();

    var masterData = masterSheet.getDataRange().getValues();
    if (masterData.length < 2) return { success: false, error: 'No data in Master_Candidates' };
    var masterHeaders = masterData[0].map(function(h) { return String(h).trim(); });
    var masterHeadersNorm = masterHeaders.map(normalizeBgvHeader);

    // Candidate ID, Registration Number, Phone Number, Full Name
    var masterCandIdMap = {};
    var masterRegNumMap = {};
    var masterPhoneMap = {};
    var masterFullNameMap = {};
    
    var candIdIdx = masterHeadersNorm.indexOf('candidateid');
    var regNumIdx = masterHeadersNorm.indexOf('registrationnumber');
    if (regNumIdx === -1) regNumIdx = masterHeadersNorm.indexOf('regno');
    
    var phoneIdx = masterHeadersNorm.indexOf('contactnumber');
    if (phoneIdx === -1) phoneIdx = masterHeadersNorm.indexOf('phone');
    var fullNameIdx = masterHeadersNorm.indexOf('fullname');
    if (fullNameIdx === -1) fullNameIdx = masterHeadersNorm.indexOf('name');
    
    for (var m = 1; m < masterData.length; m++) {
      if (candIdIdx !== -1) {
        var cId = String(masterData[m][candIdIdx]).trim();
        if (cId) masterCandIdMap[cId] = m;
      }
      if (regNumIdx !== -1) {
        var rNum = String(masterData[m][regNumIdx]).trim();
        if (rNum) masterRegNumMap[rNum] = m;
      }
      var mPhoneRaw = phoneIdx !== -1 ? String(masterData[m][phoneIdx]) : '';
      var mPhone = normalizePhone(mPhoneRaw);
      if (mPhone && mPhone.length === 10) masterPhoneMap[mPhone] = m;
      
      var mName = fullNameIdx !== -1 ? String(masterData[m][fullNameIdx]).trim().toLowerCase().replace(/\s+/g, '') : '';
      if (mName) masterFullNameMap[mName] = m;
    }

    var bgvHeaders = bgvData[0].map(function(h) { return String(h).trim(); });
    var bgvNormHeaders = bgvHeaders.map(normalizeBgvHeader);
    var syncStatusColIdx = bgvNormHeaders.indexOf('syncstatus');
    
    var masterModified = false;
    var bgvModified = false;

    for (var r = 1; r < bgvData.length; r++) {
      var row = bgvData[r];
      var syncStatus = syncStatusColIdx !== -1 ? String(row[syncStatusColIdx] || '').trim() : '';
      if (syncStatus === 'synced' || syncStatus === 'unmatched') continue;

      function getVal(normKey) {
        var idx = bgvNormHeaders.indexOf(normKey.toLowerCase());
        if (idx !== -1) return String(row[idx] || '').trim();
        return '';
      }

      var bCandId = getVal('candidateid');
      var bRegNum = getVal('registrationnumber') || getVal('regno');
      var bName = getVal('fullname') || getVal('name');
      var bPhoneRaw = getVal('phone') || getVal('phonenumber') || getVal('contactnumber');
      var bPhone = normalizePhone(bPhoneRaw);
      
      var bDob = getVal('dateofbirth') || getVal('dob') || getVal('bgvdob');
      var bFather = getVal('fathername') || getVal('fathersname') || getVal('bgvfathername');
      var bAlt = getVal('alternatecontactnumber') || getVal('alternatecontact') || getVal('bgvalternatecontactnumber');
      var bAddress = getVal('address') || getVal('bgvaddress');
      var bPin = getVal('pincode') || getVal('zipcode') || getVal('pin') || getVal('bgvpincode');
      var bCourse = getVal('coursename') || getVal('course') || getVal('bgvcoursename');
      var bBatch = getVal('batchname') || getVal('batch') || getVal('bgvbatch');
      var bDocAmtRaw = getVal('howmuchamountpaidfordocument') || getVal('documentamount') || getVal('bgvdocumentamount');
      var bDocAmt = Number(String(bDocAmtRaw || "").replace(/,/g, "").replace(/[^\d.-]/g, "")) || 0;
      
      var submittedAtIdx = bgvNormHeaders.indexOf('timestamp');
      if (submittedAtIdx === -1) submittedAtIdx = bgvNormHeaders.indexOf('submittedat');
      var submittedAt = (submittedAtIdx !== -1 && row[submittedAtIdx]) ? String(row[submittedAtIdx]) : new Date().toISOString();
      
      var bgvResponseIdIdx = bgvNormHeaders.indexOf('responseid') !== -1 ? bgvNormHeaders.indexOf('responseid') : bgvNormHeaders.indexOf('id');
      var bgvResponseId = bgvResponseIdIdx !== -1 ? String(row[bgvResponseIdIdx]) : submittedAt;
      
      // Match candidate
      var targetRow = -1;
      if (bCandId && masterCandIdMap[bCandId]) {
        targetRow = masterCandIdMap[bCandId];
      } else if (bRegNum && masterRegNumMap[bRegNum]) {
        targetRow = masterRegNumMap[bRegNum];
      } else if (bPhone && masterPhoneMap[bPhone]) {
        targetRow = masterPhoneMap[bPhone];
      } else {
        var bNameNorm = String(bName).trim().toLowerCase().replace(/\s+/g, '');
        if (bNameNorm && masterFullNameMap[bNameNorm]) {
          targetRow = masterFullNameMap[bNameNorm];
        }
      }

      if (targetRow !== -1) {
        Logger.log("Candidate matched");
        Logger.log("Updating Master row");
        
        var updateField = function(key, val, onlyIfBlank) {
          var colIdx = masterHeadersNorm.indexOf(normalizeBgvHeader(key));
          if (colIdx !== -1 && val) {
            if (onlyIfBlank) {
              var existingVal = String(masterData[targetRow][colIdx] || '').trim();
              if (existingVal !== '') return;
            }
            masterData[targetRow][colIdx] = val;
            masterModified = true;
          }
        };

        updateField('bgvDob', bDob, false);
        updateField('bgvAddress', bAddress, false);
        updateField('bgvFatherName', bFather, false);
        updateField('bgvAlternateContactNumber', bAlt, false);
        updateField('bgvPincode', bPin, false);
        updateField('bgvCourseName', bCourse, false);
        updateField('bgvBatch', bBatch, false);
        updateField('bgvDocumentAmount', bDocAmt, false);
        
        updateField('bgvStatus', 'Submitted', false);
        updateField('bgvSubmittedAt', submittedAt, false);
        
        var updatedAtCol = masterHeadersNorm.indexOf('updatedat');
        if (updatedAtCol !== -1) {
          masterData[targetRow][updatedAtCol] = new Date().toISOString();
          masterModified = true;
        }
        
        // Document Payment Sync
        if (bDocAmt > 0) {
          var matchedCandId = candIdIdx !== -1 ? String(masterData[targetRow][candIdIdx]) : 'Cand_' + targetRow;
          var matchedCandName = fullNameIdx !== -1 ? String(masterData[targetRow][fullNameIdx]) : String(bName);
          var paymentSheet = getSheetSafe(ss, PAYMENT_RECORDS_SHEET);
          if (paymentSheet) {
            var pData = paymentSheet.getDataRange().getValues();
            var pHeaders = pData.length > 0 ? pData[0].map(function(h) { return String(h).trim(); }) : [];
            var hasPayment = false;
            for (var p = 1; p < pData.length; p++) {
               var pObj = rowToObj(pHeaders, pData[p]);
               if (String(pObj['candidateId'] || '').trim() === matchedCandId && String(pObj['pipelineType'] || '').trim() === 'document' && String(pObj['paymentId'] || '').trim() === bgvResponseId) {
                 hasPayment = true; break;
               }
            }
            if (!hasPayment && pHeaders.length > 0) {
              var newPayment = buildRowByHeaders(pHeaders, { 'paymentId': bgvResponseId, 'candidateId': matchedCandId, 'candidateName': matchedCandName, 'paymentType': 'Document Fee', 'amount': bDocAmt, 'paymentDate': submittedAt, 'pipelineType': 'document', 'transactionRef': 'BGV Payment', 'notes': 'Auto-created from BGV submission' });
              paymentSheet.appendRow(newPayment);
              SpreadsheetApp.flush();
              if (typeof upsertFinancialLedger === 'function') upsertFinancialLedger(ss, matchedCandId, matchedCandName, 'document', 'Document Fee');
            }
          }
        }

        if (syncStatusColIdx !== -1) {
          bgvData[r][syncStatusColIdx] = 'synced';
          bgvModified = true;
        }
      } else {
        Logger.log("No match found for: " + bName + " / " + bPhoneRaw);
        if (syncStatusColIdx !== -1) {
          bgvData[r][syncStatusColIdx] = 'unmatched';
          bgvModified = true;
        }
      }
    }

    if (masterModified) {
      masterSheet.getRange(1, 1, masterData.length, masterData[0].length).setValues(masterData);
      Logger.log("Master updated successfully");
    }
    
    if (bgvModified) {
      bgvSheet.getRange(1, 1, bgvData.length, bgvData[0].length).setValues(bgvData);
    }
    
    SpreadsheetApp.flush();
    
    Logger.log('BGV SYNC COMPLETE: synced=' + synced + ' unmatched=' + unmatched);
    return { success: true, message: 'BGV synced successfully', synced: synced, unmatched: unmatched };
    
  } catch (err) {
    Logger.log('syncBgvResponses ERROR: ' + err.toString());
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// DIRECT PLACEMENT CRM FUNCTIONS
// ============================================================

function generatePlacementId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetSafe(ss, DP_MASTER_SHEET);
  if (!sheet) return 'DP001';
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return 'DP001';
  
  var maxId = 0;
  var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
  var headers = data[masterHeaderRowIdx].map(function(h) { return String(h).trim(); });
  var pIdIdx = findHeaderCol(headers, 'placementId');
  
  if (pIdIdx === -1) return 'DP001';
  
  for (var i = masterHeaderRowIdx + 1; i < data.length; i++) {
    var pId = String(data[i][pIdIdx] || '').trim();
    if (pId.indexOf('DP') === 0) {
      var num = parseInt(pId.substring(2), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  
  var nextNum = maxId + 1;
  var nextIdStr = nextNum.toString();
  while (nextIdStr.length < 3) {
    nextIdStr = '0' + nextIdStr;
  }
  return 'DP' + nextIdStr;
}

function getDirectPlacementCandidates(params) {
  params = params || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetSafe(ss, DP_MASTER_SHEET);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
  
  var headerMap = getDirectPlacementHeaderMap_(sheet);
  var candidates = [];
  
  var q = (params.search || '').toLowerCase().trim();
  
  for (var i = masterHeaderRowIdx + 1; i < data.length; i++) {
    var row = data[i];
    
    // Skip completely empty rows
    if (!row.join("").trim()) continue;
    
    var obj = directPlacementRowToObj_(row, headerMap);
    
    // Always include if activeProfileId matches exactly
    if (params.activeProfileId && String(obj['placementId'] || '').trim().toLowerCase() === String(params.activeProfileId).trim().toLowerCase()) {
      candidates.push(obj);
      continue;
    }
    
    // Server-side filtering
    var matchesSearch = true;
    if (q) {
      matchesSearch = (
        String(obj['fullName'] || '').toLowerCase().indexOf(q) !== -1 ||
        String(obj['placementId'] || '').toLowerCase().indexOf(q) !== -1 ||
        String(obj['mobileNumber'] || '').toLowerCase().indexOf(q) !== -1 ||
        String(obj['companyName'] || '').toLowerCase().indexOf(q) !== -1
      );
    }
    
    var matchesStatus = !params.status || params.status === 'all' || String(obj['candidateStatus'] || '').toLowerCase() === params.status.toLowerCase();
    var matchesBgv = !params.bgv || params.bgv === 'all' || String(obj['bgvStatus'] || '').toLowerCase() === params.bgv.toLowerCase();
    var matchesCompany = !params.company || params.company === 'all' || String(obj['companyName'] || '').toLowerCase() === params.company.toLowerCase();
    var matchesExp = !params.experience || params.experience === 'all' || String(obj['experienceType'] || '').toLowerCase() === params.experience.toLowerCase();
    // note: if paymentStatus is not in master sheet, we just skip failing on it or treat it as empty string
    var matchesPayment = !params.payment || params.payment === 'all' || String(obj['paymentStatus'] || '').toLowerCase() === params.payment.toLowerCase();
    var matchesYop = !params.yop || params.yop === 'all' || String(obj['yearOfPassing'] || '') === params.yop;

    if (matchesSearch && matchesStatus && matchesBgv && matchesCompany && matchesExp && matchesPayment && matchesYop) {
      candidates.push(obj);
    }
  }
  return candidates;
}

function getDirectPlacementCandidate(placementId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheetSafe(ss, DP_MASTER_SHEET);
  if (!sheet) return { success: false, error: 'Sheet not found' };
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: false, error: 'No data' };
  
  var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
  
  var headerMap = getDirectPlacementHeaderMap_(sheet);
  
  for (var i = masterHeaderRowIdx + 1; i < data.length; i++) {
    var row = data[i];
    if (!row.join('').trim()) continue;
    
    var candidate = directPlacementRowToObj_(row, headerMap);
    if (String(candidate.placementId || '').trim() === String(placementId || '').trim()) {
      if (candidate.placementId === 'DP001') {
        Logger.log('DP HEADER ROW INDEX: ' + getDirectPlacementHeaderRowIndex_(sheet));
        Logger.log('DP HEADER MAP: ' + JSON.stringify(getDirectPlacementHeaderMap_(sheet)));
        Logger.log('DP001 BACKEND CANDIDATE: ' + JSON.stringify(candidate));
      }
      return { success: true, candidate: candidate };
    }
  }
  return { success: false, error: 'Candidate not found' };
}

function getDirectPlacementDashboard() {
  var cands = getDirectPlacementCandidates();
  var total = cands.length;
  var active = 0;
  var placed = 0;
  var bgvPending = 0;
  var bgvCompleted = 0;
  
  for (var i=0; i<cands.length; i++) {
    var cStatus = String(cands[i]['candidateStatus'] || '').trim().toLowerCase();
    var bStatus = String(cands[i]['bgvStatus'] || '').trim().toLowerCase();
    
    if (cStatus === 'active') active++;
    if (cStatus === 'completed' || cStatus === 'placed') placed++;
    if (bStatus === 'pending' || bStatus === 'submitted') bgvPending++;
    if (bStatus === 'cleared') bgvCompleted++;
  }
  
  var payments = getDirectPlacementPayments('').payments || [];
  var revenue = 0;
  for (var j=0; j<payments.length; j++) {
    revenue += parseFloat(payments[j].amount || 0);
  }
  
  var financials = getDirectPlacementFinancials('').financials || [];
  var pendingDues = 0;
  for (var k=0; k<financials.length; k++) {
    var f = financials[k];
    // Allow either 'Placement Fee' or general fallback
    var due = parseFloat(f.baseFee || 0) - parseFloat(f.paidToDate || 0);
    if (due > 0) pendingDues += due;
  }
  
  return {
    success: true,
    totalCandidates: total,
    activeCandidates: active,
    placedCount: placed,
    bgvPending: bgvPending,
    bgvCompleted: bgvCompleted,
    revenue: revenue,
    pendingDues: pendingDues
  };
}

function syncDirectPlacement() {
  Logger.log("=== START: syncDirectPlacement ===");
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    Logger.log("Could not obtain lock for syncDirectPlacement.");
    return { success: false, error: "System is busy. Please try again." };
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var dpFormSheet = getSheetSafe(ss, DP_FORM_RESPONSES_4);
    if (!dpFormSheet) {
      Logger.log("Direct Placement Registration Form sheet not found (" + DP_FORM_RESPONSES_4 + ").");
      return { success: false, error: "Direct Placement Form sheet not found." };
    }
    
    Logger.log("Detecting source sheet: " + dpFormSheet.getName());
    var formData = dpFormSheet.getDataRange().getValues();
    if (formData.length < 2) {
      Logger.log("No registration data found.");
      return { success: true, synced: 0, skipped: 0 };
    }
    
    var formHeaders = formData[0].map(function(h) { return String(h).trim(); });
    var syncColIdx = formHeaders.indexOf('syncStatus');
    if (syncColIdx === -1) {
      syncColIdx = formHeaders.length;
      dpFormSheet.getRange(1, syncColIdx + 1).setValue('syncStatus');
      formHeaders.push('syncStatus');
    }
    
    Logger.log("Detecting DP_Registration_Res log sheet");
    var regCols = ['submissionId', 'placementId', 'syncStatus', 'submittedAt', 'tokenEmail', 'fullName', 'mobileNumber', 'yearOfPassing', 'currentlyWorking', 'experienceType', 'companyName', 'designation', 'ctc', 'amountPaid', 'offerLetter', 'relievingLetter', 'pfServiceHistory', 'payslip'];
    var dpRegSheet = ensureSheetWithColumns(ss, DP_REGISTRATION_SHEET, regCols);
    
    Logger.log("Detecting master sheet: " + DP_MASTER_SHEET);
    var masterCols = ['placementId', 'fullName', 'mobileNumber', 'yearOfPassing', 'currentlyWorking', 'experienceType', 'companyName', 'designation', 'ctc', 'amountPaid', 'offerLetter', 'offerLetterUrl', 'relievingLetter', 'relievingLetterUrl', 'pfServiceHistory', 'pfServiceHistoryUrl', 'payslip', 'payslipUrl', 'bgvStatus', 'dateOfBirth', 'fatherName', 'alternateContact', 'address', 'pincode', 'courseName', 'batch', 'documentAmount', 'bgvSubmittedAt', 'candidateStatus', 'trackedStatus', 'trackedAt', 'createdAt', 'updatedAt', 'remarks'];
    var dpMasterSheet = getSheetSafe(ss, DP_MASTER_SHEET);

    if (!dpMasterSheet) {
      dpMasterSheet = ss.insertSheet(DP_MASTER_SHEET);
    }

    ensureDirectPlacementColumns_(dpMasterSheet, masterCols);
    
    var masterData = dpMasterSheet.getDataRange().getValues();
    Logger.log("Number of rows read from Master sheet: " + masterData.length);
    
    var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(dpMasterSheet);
    Logger.log("Detected header row index: " + masterHeaderRowIdx);
    
    var masterHeaders = masterData[masterHeaderRowIdx].map(function(h) { return String(h).trim(); });
    
    var existingData = [];
    var maxId = 0;
    
    for (var m = masterHeaderRowIdx + 1; m < masterData.length; m++) {
      var rowObjMaster = rowToObj(masterHeaders, masterData[m]);
      existingData.push(rowObjMaster);
      
      var pId = String(rowObjMaster['placementId'] || '').trim();
      if (pId.indexOf('DP') === 0) {
        var num = parseInt(pId.replace('DP', ''), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    Logger.log("Initial Max Placement ID parsed: " + maxId);
    
    var synced = 0;
    for (var r = 1; r < formData.length; r++) {
      var rowObj = rowToObj(formHeaders, formData[r]);
      var syncStatus = String(rowObj['syncStatus'] || '').trim().toLowerCase();
      
      if (syncStatus !== 'true' && syncStatus !== 'synced') {
        Logger.log("Processing DP Registration row " + r);
        
        function getVal(keys) {
          for (var i = 0; i < keys.length; i++) {
            var cleanTarget = keys[i].toLowerCase().replace(/[^a-z0-9]/g, '');
            for (var k in rowObj) {
              var cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanK === cleanTarget && rowObj[k]) {
                return String(rowObj[k]).trim();
              }
            }
          }
          return '';
        }
        
        var nameObj = getVal(['FullName', 'CandidateName', 'Name']);
        var emailObj = getVal(['EmailAddress', 'Email', 'TokenEmail']);
        var mobileObj = getVal(['MobileNumber', 'Mobile', 'Phone', 'ContactNumber']);
        var yopObj = getVal(['YearOfPassing', 'PassingYear', 'YOP']);
        var workingObj = getVal(['CurrentlyWorking', 'Working']);
        var expTypeObj = getVal(['ExperienceType', 'Experience', 'FresherOrExperienced', 'FresherExperienced']);
        var companyObj = getVal(['CompanyName', 'Company', 'Organization', 'CurrentCompany']);
        var desigObj = getVal(['Designation', 'Role', 'Title', 'JobTitle', 'CurrentDesignation']);
        var ctcObj = getVal(['CTC', 'CurrentCTC', 'Salary']);
        var amountPaidObj = ''; // HR adds payments manually
        var offerObj = getVal(['OfferLetter', 'Offer']);
        var relievingObj = getVal(['RelievingLetter', 'Relieving']);
        var pfObj = getVal(['PFServiceHistory', 'PF', 'ServiceHistory']);
        var payslipObj = getVal(['Payslip', 'PaySlips']);
        var submittedAt = getVal(['Timestamp', 'SubmittedAt']) || new Date().toISOString();
        
        Logger.log("Candidate mapped: " + nameObj + " | " + mobileObj);
        
        var normFormPhone = String(mobileObj || '').trim().replace(/^\+?91/, '').replace(/[\s\-]/g, '');
        var normFormName = String(nameObj || '').trim().toLowerCase().replace(/\s+/g, ' ');
        
        var matchedIdx = -1;
        for (var k = 0; k < existingData.length; k++) {
          var mRow = existingData[k];
          var mId = String(mRow['placementId'] || '').trim();
          
          if (rowObj['placementId'] && mId === String(rowObj['placementId']).trim()) {
            matchedIdx = k; break;
          }
          
          var mPhone = String(mRow['mobileNumber'] || '').trim().replace(/^\+?91/, '').replace(/[\s\-]/g, '');
          var mName = String(mRow['fullName'] || '').trim().toLowerCase().replace(/\s+/g, ' ');
          
          if (normFormPhone && normFormName && mPhone === normFormPhone && mName === normFormName) {
            matchedIdx = k; break;
          }
        }
        
        // Generate Placement ID if new
        var now = new Date().toISOString();
        var placementId = '';
        var isNew = false;
        var previousCandidateStatus = '';
        
        if (matchedIdx !== -1) {
          placementId = existingData[matchedIdx]['placementId'];
          previousCandidateStatus = existingData[matchedIdx]['candidateStatus'] || '';
          Logger.log("Duplicate detected! Matched existing record: " + placementId);
        } else {
          maxId++;
          placementId = 'DP' + ('000' + maxId).slice(-3);
          isNew = true;
          Logger.log("Generated new Placement ID: " + placementId);
        }
        
        var parseFormUpload = function(val) {
          if (!val) return { status: 'FALSE', url: '' };
          val = String(val).trim();
          if (val.indexOf('http') === 0 || val.indexOf('drive.google.com') > -1) {
            return { status: 'TRUE', url: val };
          }
          if (val.toLowerCase() === 'true' || val.toLowerCase() === 'yes') {
            return { status: 'TRUE', url: '' };
          }
          return { status: 'TRUE', url: '' };
        };

        var offerData = parseFormUpload(offerObj);
        var relievingData = parseFormUpload(relievingObj);
        var pfData = parseFormUpload(pfObj);
        var payslipData = parseFormUpload(payslipObj);

        var newMasterRow = buildRowByHeaders(masterHeaders, {
          placementId: placementId,
          fullName: nameObj,
          mobileNumber: mobileObj,
          yearOfPassing: yopObj,
          currentlyWorking: workingObj,
          experienceType: expTypeObj,
          companyName: companyObj,
          designation: desigObj,
          ctc: ctcObj,
          amountPaid: amountPaidObj,
          offerLetter: offerData.status,
          offerLetterUrl: offerData.url,
          relievingLetter: relievingData.status,
          relievingLetterUrl: relievingData.url,
          pfServiceHistory: pfData.status,
          pfServiceHistoryUrl: pfData.url,
          payslip: payslipData.status,
          payslipUrl: payslipData.url,
          createdAt: isNew ? now : (existingData[matchedIdx]['createdAt'] || now),
          updatedAt: now,
          candidateStatus: isNew ? 'Registered' : (existingData[matchedIdx]['candidateStatus'] || 'Registered')
        });
        
        if (isNew) {
          Logger.log("Inserting new row into Master Sheet for " + placementId);
          dpMasterSheet.appendRow(newMasterRow);
          existingData.push(rowToObj(masterHeaders, newMasterRow));
        } else {
          Logger.log("Updating existing row in Master Sheet for " + placementId);
          var updateRowIdx = masterHeaderRowIdx + 1 + matchedIdx + 1;
          var range = dpMasterSheet.getRange(updateRowIdx, 1, 1, newMasterRow.length);
          var currentVals = range.getValues()[0];
          for (var c = 0; c < newMasterRow.length; c++) {
            if (newMasterRow[c] !== '' && newMasterRow[c] !== undefined) {
              currentVals[c] = newMasterRow[c];
            }
          }
          range.setValues([currentVals]);
          existingData[matchedIdx] = rowToObj(masterHeaders, currentVals);
        }
        
        // Log to DP_Registration_Res
        var submissionId = 'dpsub_' + Date.now() + '_' + r;
        var newRegRow = buildRowByHeaders(regCols, {
          submissionId: submissionId,
          placementId: placementId,
          syncStatus: 'synced',
          submittedAt: submittedAt,
          tokenEmail: emailObj,
          fullName: nameObj,
          mobileNumber: mobileObj,
          yearOfPassing: yopObj,
          currentlyWorking: workingObj,
          experienceType: expTypeObj,
          companyName: companyObj,
          designation: desigObj,
          ctc: ctcObj,
          amountPaid: amountPaidObj,
          offerLetter: offerData.status,
          offerLetterUrl: offerData.url,
          relievingLetter: relievingData.status,
          relievingLetterUrl: relievingData.url,
          pfServiceHistory: pfData.status,
          pfServiceHistoryUrl: pfData.url,
          payslip: payslipData.status,
          payslipUrl: payslipData.url
        });
        dpRegSheet.appendRow(newRegRow);
        Logger.log("Wrote record into DP_Registration_Res for " + placementId);
        
        // --- 4. FINANCIAL LEDGER & 6. AUDIT LOGS ---
        upsertDirectFinancialLedger(ss, placementId, nameObj, 'registration');
        logDirectAudit(ss, placementId, nameObj, 'REGISTRATION', isNew ? 'CANDIDATE_CREATED' : 'CANDIDATE_UPDATED', isNew ? 'Candidate registered via Direct Placement Form' : 'Candidate updated via Direct Placement Form', previousCandidateStatus, 'Registered', 'System');
        
        // Mark Form Sheet as synced
        dpFormSheet.getRange(r + 1, syncColIdx + 1).setValue('synced');
        synced++;
      }
    }
    
    SpreadsheetApp.flush();
    Logger.log("=== END: syncDirectPlacement (Synced " + synced + " records) ===");
    return { success: true, synced: synced };
  } catch (e) {
    Logger.log("EXCEPTION in syncDirectPlacement: " + e.message);
    Logger.log("STACK: " + e.stack);
    return { success: false, error: e.message, stack: e.stack };
  } finally {
    lock.releaseLock();
  }
}

function getDirectPlacementPayments(placementId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_PAYMENT_SHEET);
    if (!sheet) return { success: true, payments: [] };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, payments: [] };
    
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var payments = [];
    var pIdIdx = findHeaderCol(headers, 'placementId');
    
    for (var i = 1; i < data.length; i++) {
      if (!placementId || String(data[i][pIdIdx] || '').trim() === String(placementId).trim()) {
        payments.push(rowToObj(headers, data[i]));
      }
    }
    return { success: true, payments: payments };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getDirectPlacementFinancials(placementId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_FINANCIAL_LEDGER_SHEET);
    if (!sheet) return { success: true, financials: [] };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, financials: [] };
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    var financials = [];
    var pIdIdx = findHeaderCol(headers, 'placementId');
    
    if (pIdIdx === -1) return { success: true, financials: [] };
    
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (!placementId || String(data[i][pIdIdx] || '').trim() === String(placementId).trim()) {
        var rowObj = {};
        for (var h = 0; h < headers.length; h++) {
          if (headers[h]) {
            rowObj[headers[h]] = data[i][h];
          }
        }
        financials.push(rowObj);
      }
    }
    return { success: true, financials: financials };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

function updateDirectCandidate(params) {
  try {
    var placementId = params.placementId || '';
    var updates = JSON.parse(params.updates || '{}');
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_MASTER_SHEET);
    if (!sheet) return { success: false, error: 'DP_MASTER_SHEET not found' };
    
    var data = sheet.getDataRange().getValues();
    var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = data[masterHeaderRowIdx].map(function(h) { return String(h).trim(); });
    
    var targetRow = -1;
    var existingName = '';
    
    for (var i = masterHeaderRowIdx + 1; i < data.length; i++) {
      var obj = rowToObj(headers, data[i]);
      if (String(obj['placementId']).trim() === String(placementId).trim()) {
        targetRow = i + 1;
        existingName = obj['fullName'] || '';
        break;
      }
    }
    
    if (targetRow === -1) return { success: false, error: 'Candidate not found' };
    
    var now = new Date().toISOString();
    for (var key in updates) {
      if (findHeaderCol(headers, key) === -1) {
        headers.push(key);
        sheet.getRange(masterHeaderRowIdx + 1, headers.length).setValue(key);
      }
      setByHeader(sheet, headers, targetRow, key, updates[key]);
    }
    setByHeader(sheet, headers, targetRow, 'updatedAt', now);
    
    logDirectAudit(ss, placementId, existingName, 'CANDIDATE', 'CANDIDATE_UPDATED', 'Candidate Profile Updated', '', '', params.userStamp || 'System');
    SpreadsheetApp.flush();
    
    return { success: true, message: 'Candidate updated' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function calculatePendingAmount(regFee, docFee, other, discount, paid) {
  var total = (parseFloat(regFee) || 0) + (parseFloat(docFee) || 0) + (parseFloat(other) || 0);
  total -= (parseFloat(discount) || 0);
  var pending = total - (parseFloat(paid) || 0);
  return pending;
}

function updatePaymentStatus(pending, paid) {
  var p = parseFloat(pending) || 0;
  var pd = parseFloat(paid) || 0;
  if (p <= 0 && pd > 0) return 'Completed';
  if (pd > 0) return 'Partial';
  return 'Pending';
}



function addDirectPayment(params) {
  try {
    Logger.log("addDirectPayment initiated for placementId: " + params.placementId);
    var placementId = params.placementId || '';
    var candidateName = params.candidateName || '';
    var amount = parseFloat(params.amount) || 0;
    var paymentType = params.paymentType || 'Placement Fee';
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cols = ['paymentId', 'placementId', 'candidateName', 'paymentType', 'amount', 'paymentDate', 'remarks', 'createdAt', 'userStamp', 'transactionRef'];
    var sheet = ensureSheetWithColumns(ss, DP_PAYMENT_SHEET, cols);
    var headers = getSheetHeaders(sheet);
    
    var paymentId = 'dp_pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var now = new Date().toISOString();
    
    var row = buildRowByHeaders(headers, {
      'paymentId': paymentId,
      'placementId': placementId,
      'candidateName': candidateName,
      'paymentType': paymentType,
      'amount': amount,
      'paymentDate': params.paymentDate || now.split('T')[0],
      'remarks': params.remarks || '',
      'createdAt': now,
      'userStamp': params.userStamp || 'System',
      'transactionRef': params.transactionRef || ''
    });
    
    sheet.appendRow(row);
    var readableType = String(paymentType).replace(/([A-Z])/g, ' $1').replace(/^./, function(s){ return s.toUpperCase(); }).trim();
    logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'PAYMENT_ADDED', readableType + ' Added Rs.' + amount, '', '', params.userStamp || 'System');
    
    upsertDirectFinancialLedger(ss, placementId, candidateName, params.pipelineType || 'document');
    SpreadsheetApp.flush();
    
    return { success: true, paymentId: paymentId };
  } catch (err) {
    Logger.log("addDirectPayment Error: " + err.message);
    return { success: false, error: err.message };
  }
}

function updateDirectPayment(params) {
  try {
    var paymentId = params.paymentId || '';
    var updates = JSON.parse(params.updates || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_PAYMENT_SHEET);
    if (!sheet) return { success: false, error: 'DP_PAYMENT_SHEET not found' };
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h).trim(); });
    
    var targetRow = -1;
    var placementId = '';
    var candidateName = '';
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][findHeaderCol(headers, 'paymentId')]).trim() === String(paymentId).trim()) {
        targetRow = i + 1;
        placementId = data[i][findHeaderCol(headers, 'placementId')] || '';
        candidateName = data[i][findHeaderCol(headers, 'candidateName')] || '';
        break;
      }
    }
    
    if (targetRow === -1) return { success: false, error: 'Payment not found' };
    
    for (var key in updates) {
      if (findHeaderCol(headers, key) === -1) {
        headers.push(key);
        sheet.getRange(1, headers.length).setValue(key);
      }
      setByHeader(sheet, headers, targetRow, key, updates[key]);
    }
    
    var pipelineType = updates.pipelineType || data[targetRow - 1][findHeaderCol(headers, 'pipelineType')] || 'document';
    
    logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'PAYMENT_UPDATED', 'Updated Payment ' + paymentId, '', '', params.userStamp || 'System');
    
    upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType);
    SpreadsheetApp.flush();
    return { success: true, message: 'Payment updated' };
  } catch (err) {
    Logger.log("updateDirectPayment Error: " + err.message);
    return { success: false, error: err.message };
  }
}

function deleteDirectPayment(params) {
  try {
    var paymentId = params.paymentId || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_PAYMENT_SHEET);
    if (!sheet) return { success: false, error: 'DP_PAYMENT_SHEET not found' };
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h).trim(); });
    
    var targetRow = -1;
    var placementId = '';
    var candidateName = '';
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][findHeaderCol(headers, 'paymentId')]).trim() === String(paymentId).trim()) {
        targetRow = i + 1;
        placementId = data[i][findHeaderCol(headers, 'placementId')] || '';
        candidateName = data[i][findHeaderCol(headers, 'candidateName')] || '';
        break;
      }
    }
    
    if (targetRow === -1) return { success: false, error: 'Payment not found' };
    
    var pipelineType = data[targetRow - 1][findHeaderCol(headers, 'pipelineType')] || 'document';
    
    sheet.deleteRow(targetRow);
    
    logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'PAYMENT_DELETED', 'Deleted Payment ' + paymentId, '', '', params.userStamp || 'System');
    
    upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType);
    SpreadsheetApp.flush();
    return { success: true, message: 'Payment deleted' };
  } catch (err) {
    Logger.log("deleteDirectPayment Error: " + err.message);
    return { success: false, error: err.message };
  }
}






function exportDirectAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  function getSheetData(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    
    if (sheetName === DP_MASTER_SHEET) {
      var headerMap = getDirectPlacementHeaderMap_(sheet);
      var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
      var rows = [];
      for (var i = masterHeaderRowIdx + 1; i < data.length; i++) {
        rows.push(directPlacementRowToObj_(data[i], headerMap));
      }
      return rows;
    } else {
      var headers = data[0].map(function(h) { return String(h).trim(); });
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        rows.push(rowToObj(headers, data[i]));
      }
      return rows;
    }
  }
  
  return {
    success: true,
    candidates: getSheetData(DP_MASTER_SHEET),
    registrations: getSheetData(DP_REGISTRATION_SHEET),
    bgv: getSheetData(DP_BGV_SHEET),
    payments: getSheetData(DP_PAYMENT_SHEET),
    financials: getSheetData(DP_FINANCIAL_LEDGER_SHEET),
    auditLogs: getSheetData(DP_AUDIT_LOGS_SHEET),
    timestamp: new Date().toISOString()
  };
}


// ── Direct Placement Document Management ──

function _getOrCreateDPFolder() {
  var folderName = "CRM_Direct_Placement_Documents";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function _getCandidateFolder(dpFolder, placementId) {
  var folders = dpFolder.getFoldersByName(placementId);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return dpFolder.createFolder(placementId);
  }
}

function uploadDPDocument(params) {
  try {
    var placementId = params.placementId;
    var candidateName = params.candidateName || 'Unknown';
    var docType = params.documentType;
    var fileName = params.fileName;
    var mimeType = params.mimeType;
    var base64Data = params.base64Data;
    var performedBy = params.performedBy || 'Python HR';
    
    if (!placementId || !docType || !base64Data) {
      throw new Error("Missing required fields for upload");
    }
    
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    var rootFolder = _getOrCreateDPFolder();
    var candidateFolder = _getCandidateFolder(rootFolder, placementId);
    
    var file = candidateFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = file.getUrl();
    var fileId = file.getId();
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dpMasterSheet = getSheetSafe(ss, DP_MASTER_SHEET);
    if (!dpMasterSheet) throw new Error("DP Master Sheet not found");
    
    var data = dpMasterSheet.getDataRange().getValues();
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(dpMasterSheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var pIdIdx = headers.indexOf('placementId');
    var docStatusIdx = headers.indexOf(docType);
    var docUrlIdx = headers.indexOf(docType + 'Url');
    
    if (pIdIdx === -1 || docStatusIdx === -1 || docUrlIdx === -1) {
      throw new Error("Required columns missing in DP Master Sheet");
    }
    
    var updated = false;
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][pIdIdx]).trim() === placementId) {
        dpMasterSheet.getRange(i + 1, docStatusIdx + 1).setValue('TRUE');
        dpMasterSheet.getRange(i + 1, docUrlIdx + 1).setValue(fileUrl);
        updated = true;
        break;
      }
    }
    
    if (!updated) throw new Error("Candidate not found in DP Master");
    
    var readableDocType = docType.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
    logDirectAudit(SpreadsheetApp.getActiveSpreadsheet(), placementId,  candidateName,  'DOCUMENT',  'DOCUMENT_UPLOADED',  readableDocType + ' Uploaded',  '',  'TRUE',  performedBy);
    
    return { success: true, url: fileUrl, fileId: fileId };
  } catch (err) {
    Logger.log("uploadDPDocument ERROR: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

function updateDPDocumentStatus(params) {
  try {
    var placementId = params.placementId;
    var candidateName = params.candidateName || 'Unknown';
    var docType = params.documentType;
    var status = Boolean(params.status);
    var performedBy = params.performedBy || 'Python HR';
    
    // Allowed docType values
    var allowedDocs = ['offerLetter', 'relievingLetter', 'pfServiceHistory', 'payslip'];
    if (allowedDocs.indexOf(docType) === -1) {
      throw new Error("Unknown document type");
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dpMasterSheet = getSheetSafe(ss, DP_MASTER_SHEET);
    if (!dpMasterSheet) throw new Error("DP Master Sheet not found");
    
    var data = dpMasterSheet.getDataRange().getValues();
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(dpMasterSheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var pIdIdx = headers.indexOf('placementId');
    var docStatusIdx = headers.indexOf(docType);
    
    if (pIdIdx === -1 || docStatusIdx === -1) {
      throw new Error("Required columns missing in DP Master Sheet");
    }
    
    var updated = false;
    var oldVal = false;
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][pIdIdx]).trim() === placementId) {
        var rawOld = String(data[i][docStatusIdx]).trim().toLowerCase();
        oldVal = (rawOld === 'true' || rawOld === 'yes' || rawOld === '1');
        dpMasterSheet.getRange(i + 1, docStatusIdx + 1).setValue(status);
        updated = true;
        break;
      }
    }
    
    if (!updated) throw new Error("Candidate not found");
    SpreadsheetApp.flush();
    
    var readableDocType = docType.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
    var statusText = status ? 'Received' : 'Pending';
    var oldStatusText = oldVal ? 'true' : 'false';
    var newStatusText = status ? 'true' : 'false';
    
    logDirectAudit(ss, placementId, candidateName, 'DOCUMENT', 'DOCUMENT_STATUS_UPDATED', readableDocType + ' Marked ' + statusText, oldStatusText, newStatusText, performedBy);
    
    return { success: true, placementId: placementId, docType: docType, status: status };
  } catch (err) {
    Logger.log("updateDPDocumentStatus Error: " + err.message);
    return { success: false, error: err.message };
  }
}
    
function deleteDPDocument(params) {
  try {
    var placementId = params.placementId;
    var candidateName = params.candidateName || 'Unknown';
    var docType = params.documentType;
    var performedBy = params.performedBy || 'Python HR';
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dpMasterSheet = getSheetSafe(ss, DP_MASTER_SHEET);
    if (!dpMasterSheet) throw new Error("DP Master Sheet not found");
    
    var data = dpMasterSheet.getDataRange().getValues();
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(dpMasterSheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var pIdIdx = headers.indexOf('placementId');
    var docStatusIdx = headers.indexOf(docType);
    var docUrlIdx = headers.indexOf(docType + 'Url');
    
    if (pIdIdx === -1 || docStatusIdx === -1 || docUrlIdx === -1) {
      throw new Error("Required columns missing in DP Master Sheet");
    }
    
    var updated = false;
    var fileUrl = '';
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][pIdIdx]).trim() === placementId) {
        fileUrl = String(data[i][docUrlIdx]).trim();
        dpMasterSheet.getRange(i + 1, docStatusIdx + 1).setValue('FALSE');
        dpMasterSheet.getRange(i + 1, docUrlIdx + 1).setValue('');
        updated = true;
        break;
      }
    }
    
    if (!updated) throw new Error("Candidate not found");
    
    if (fileUrl && fileUrl.indexOf('drive.google.com') > -1) {
      try {
        var fileId = fileUrl.match(/[-w]{25,}/);
        if (fileId && fileId[0]) {
          var file = DriveApp.getFileById(fileId[0]);
          file.setTrashed(true);
        }
      } catch (e) {
        Logger.log("Failed to trash file: " + e.toString());
      }
    }
    
    var readableDocType = docType.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
    logDirectAudit(SpreadsheetApp.getActiveSpreadsheet(), placementId,  candidateName,  'DOCUMENT',  'DOCUMENT_DELETED',  readableDocType + ' Deleted',  fileUrl,  '',  performedBy);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}




function processDirectBgvRow_(e, ss, namedValues, rawRowIndex, rawSheetName) {
  try {
    // 1. Dynamic Header Normalization
    function getVal(keys) {
      var normalizedNamedValues = {};
      for (var k in namedValues) {
        var normK = String(k || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        normalizedNamedValues[normK] = namedValues[k] ? namedValues[k][0] : "";
      }
      for (var i = 0; i < keys.length; i++) {
        var normKey = String(keys[i]).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normalizedNamedValues[normKey]) {
          return normalizedNamedValues[normKey];
        }
      }
      return "";
    }

    var bCandidateId = getVal(['candidateid', 'placementid']);
    var bEmail = getVal(['email', 'emailaddress']);
    var bPhone = getVal(['contactnumber', 'mobilenumber', 'mobile', 'phone', 'phonenumber', 'contactno', 'mobileno', 'phoneno', 'whatsappnumber']);
    
    var bName = getVal(['name', 'fullname', 'candidatename', 'studentname', 'yourname']);
    var bDob = getVal(['dateofbirth', 'dob']);
    var bGender = getVal(['gender', 'sex']);
    var bFather = getVal(['fathersname', 'fathername']);
    var bMother = getVal(['mothersname', 'mothername']);
    var bAadhaar = getVal(['aadhaarnumber', 'aadhaar']);
    var bPan = getVal(['pannumber', 'pan']);
    var bAddress = getVal(['address']);
    var bCity = getVal(['city']);
    var bState = getVal(['state']);
    var bPin = getVal(['pincode', 'postalcode', 'zipcode']);
    
    var bAltPhoneRaw = getVal(['alternatecontact', 'alternatecontactnumber', 'altcontact', 'altnumber', 'alternatemobile', 'alternatephone', 'alternatecontactno']);
    var bAltPhone = bAltPhoneRaw ? String(bAltPhoneRaw).trim() : "";
    var bEmergContact = getVal(['emergencycontact', 'emergencycontactnumber']);    
    var bEducation = getVal(['education', 'qualification']);
    var bCollege = getVal(['college', 'university', 'institutename']);
    var bCourse = getVal(['coursename', 'course']);
    var bBatch = getVal(['batch', 'batchname']);
    
    var bExperience = getVal(['experience', 'totalexperience']);
    var bCompany = getVal(['companyname', 'company']);
    var bDesignation = getVal(['designation', 'jobtitle']);
    var bSalary = getVal(['salary', 'ctc', 'currentctc']);
    
    var bRefName = getVal(['referencename']);
    var bRefPhone = getVal(['referencephone', 'referencecontact']);
    var bRefCompany = getVal(['referencecompany']);
    
    var bDocStatus = getVal(['documentstatus']);
    var bVerificationStatus = getVal(['verificationstatus', 'status']);
    var bPoliceVerification = getVal(['policeverification', 'pcc']);
    var bRemarks = getVal(['remarks', 'comments']);

    var offerObj = getVal(['offerletter', 'offer', 'offerletterupload']);
    var relievingObj = getVal(['relievingletter', 'relieving', 'relievingletterupload', 'uploadrelievingletter', 'relievingletterdocument', 'relievingdocument']);
    var pfObj = getVal(['pfservicehistory', 'pf', 'servicehistory']);
    var payslipObj = getVal(['payslip', 'payslips']);
    
    var parseFormUpload = function(val) {
      if (!val) return { status: '', url: '' };
      val = String(val).trim();
      if (val.indexOf('http') === 0 || val.indexOf('drive.google.com') > -1) {
        return { status: 'TRUE', url: val };
      }
      if (val.toLowerCase() === 'true' || val.toLowerCase() === 'yes') {
        return { status: 'TRUE', url: '' };
      }
      return { status: '', url: '' };
    };

    var offerData = parseFormUpload(offerObj);
    var relievingData = parseFormUpload(relievingObj);
    var pfData = parseFormUpload(pfObj);
    var payslipData = parseFormUpload(payslipObj);

    var bDocAmtRaw = getVal(['howmuchamountpaidfordocument', 'documentamount', 'documentamountpaid', 'amountpaidfordocument']);
    var bDocAmt = parseFloat(String(bDocAmtRaw).replace(/[^0-9.]/g, '')) || 0;
    var submittedAt = (namedValues['Timestamp'] && namedValues['Timestamp'][0]) ? namedValues['Timestamp'][0] : new Date().toISOString();

    // 2. Normalize Mobile Number and Name for matching
    var normBPhone = String(bPhone).trim().replace(/^\+?91/, '').replace(/[\s\-]/g, '');
    var normBName = String(bName).trim().toLowerCase().replace(/\s+/g, ' ');

    // 3. Match Existing Direct Placement Candidate
    var mSheet = getSheetSafe(ss, DP_MASTER_SHEET);
    if (!mSheet) return { success: false, error: 'Direct_Placement_Master sheet not found' };
    
    var mData = mSheet.getDataRange().getValues();
    if (mData.length < 2) return { success: false, error: 'Direct_Placement_Master is empty' };
    
    var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(mSheet);
    var headerRow = mData[masterHeaderRowIdx].map(function(h) { return String(h).trim(); });
    var headerMap = getDirectPlacementHeaderMap_(mSheet);
    
    var pIdIdx = headerMap['placementId'] !== undefined ? headerMap['placementId'] : findHeaderCol(headerRow, 'placementId');
    var mEmailIdx = headerMap['email'] !== undefined ? headerMap['email'] : findHeaderCol(headerRow, 'email');
    var mPhoneIdx = headerMap['mobileNumber'] !== undefined ? headerMap['mobileNumber'] : findHeaderCol(headerRow, 'mobileNumber');
    var mNameIdx = headerMap['fullName'] !== undefined ? headerMap['fullName'] : findHeaderCol(headerRow, 'fullName');
    
    var matchedRowIdx = -1;
    var matchedPlacementId = "";
    var matchedFullName = "";
    var previousBgvStatus = "";
    
    for (var i = masterHeaderRowIdx + 1; i < mData.length; i++) {
      var row = mData[i];
      var rowName = String(row[mNameIdx] || "").trim().toLowerCase().replace(/\s+/g, ' ');
      var rowPhone = String(row[mPhoneIdx] || "").trim().replace(/^\+?91/, '').replace(/[\s\-]/g, '');
      
      if (normBName && normBPhone && rowName === normBName && rowPhone === normBPhone) { 
        matchedRowIdx = i; 
        break; 
      }
    }
    
    var syncStatus = "Synced";
    if (matchedRowIdx !== -1) {
      matchedPlacementId = String(mData[matchedRowIdx][pIdIdx]);
      matchedFullName = String(mData[matchedRowIdx][mNameIdx]);
      previousBgvStatus = String(mData[matchedRowIdx][findHeaderCol(headerRow, 'bgvStatus')] || "PENDING");
    } else {
      syncStatus = "candidate_not_found";
    }
    
    // 4. Update DP_BGV_Responses
    var bgvCols = ['responseId', 'placementId', 'fullName', 'email', 'mobileNumber', 'dateOfBirth', 'gender', 'fatherName', 'motherName', 'aadhaar', 'pan', 'alternateContact', 'emergencyContact', 'address', 'city', 'state', 'pincode', 'education', 'college', 'courseName', 'batch', 'experience', 'company', 'designation', 'salary', 'referenceName', 'referencePhone', 'referenceCompany', 'documentStatus', 'verificationStatus', 'policeVerification', 'remarks', 'documentAmount', 'bgvStatus', 'submittedAt', 'syncStatus', 'createdAt', 'updatedAt'];
    var bgvSheet = ensureSheetWithColumns(ss, DP_BGV_SHEET, bgvCols);
    
    var stableResponseId = 'dp_bgv_' + rawSheetName + '_row_' + rawRowIndex;
    
    var bgvData = bgvSheet.getDataRange().getValues();
    var actualBgvHeaders = getSheetHeaders(bgvSheet);
    var actualRIdIdx = findHeaderCol(actualBgvHeaders, 'responseId');
    
    var existingBgvRowIdx = -1;
    if (bgvData.length > 1) {
      for (var br = 1; br < bgvData.length; br++) {
        if (String(bgvData[br][actualRIdIdx] || '') === stableResponseId) {
          existingBgvRowIdx = br + 1;
          break;
        }
      }
    }
    
    var newBgvRowObj = {
      'responseId': stableResponseId,
      'placementId': matchedPlacementId,
      'fullName': matchedFullName || bName,
      'email': bEmail,
      'mobileNumber': bPhone,
      'dateOfBirth': bDob,
      'gender': bGender,
      'fatherName': bFather,
      'motherName': bMother,
      'aadhaar': bAadhaar,
      'pan': bPan,
      'alternateContact': bAltPhone,
      'emergencyContact': bEmergContact,
      'address': bAddress,
      'city': bCity,
      'state': bState,
      'pincode': bPin,
      'education': bEducation,
      'college': bCollege,
      'courseName': bCourse,
      'batch': bBatch,
      'experience': bExperience,
      'company': bCompany,
      'designation': bDesignation,
      'salary': bSalary,
      'referenceName': bRefName,
      'referencePhone': bRefPhone,
      'referenceCompany': bRefCompany,
      'documentStatus': bDocStatus,
      'verificationStatus': bVerificationStatus,
      'policeVerification': bPoliceVerification,
      'remarks': bRemarks,
      'documentAmount': bDocAmtRaw,
      'bgvStatus': (matchedRowIdx !== -1) ? "SUBMITTED" : "",
      'submittedAt': submittedAt,
      'syncStatus': syncStatus,
      'createdAt': new Date().toISOString(),
      'updatedAt': new Date().toISOString()
    };
    if (existingBgvRowIdx !== -1) {
      for (var key in newBgvRowObj) {
        if (key === 'createdAt') continue; // don't overwrite createdAt
        setByHeader(bgvSheet, actualBgvHeaders, existingBgvRowIdx, key, newBgvRowObj[key]);
      }
    } else if (rawSheetName === DP_BGV_SHEET) {
      for (var key in newBgvRowObj) {
        if (key === 'createdAt') continue;
        setByHeader(bgvSheet, actualBgvHeaders, rawRowIndex, key, newBgvRowObj[key]);
      }
    } else {
      bgvSheet.appendRow(buildRowByHeaders(actualBgvHeaders, newBgvRowObj));
    }
    if (matchedRowIdx !== -1) {
      // 5. Update Direct_Placement_Master
      var updateFields = {
        'bgvStatus': 'SUBMITTED',
        'trackedStatus': 'bgv-submitted',
        'bgvSubmittedAt': submittedAt,
        'gender': bGender,
        'fatherName': bFather,
        'motherName': bMother,
        'aadhaar': bAadhaar,
        'pan': bPan,
        'address': bAddress,
        'city': bCity,
        'state': bState,
        'alternateContact': bAltPhone,
        'emergencyContact': bEmergContact,
        'education': bEducation,
        'college': bCollege,
        'experience': bExperience,
        'company': bCompany,
        'designation': bDesignation,
        'salary': bSalary,
        'referenceName': bRefName,
        'referencePhone': bRefPhone,
        'referenceCompany': bRefCompany,
        'documentStatus': bDocStatus,
        'verificationStatus': bVerificationStatus,
        'policeVerification': bPoliceVerification,
        'remarks': bRemarks,
        'syncStatus': 'Synced',
        'updatedAt': new Date().toISOString(),
        'dateOfBirth': bDob,
        'pincode': bPin,
        'courseName': bCourse,
        'batch': bBatch,
        'documentAmount': bDocAmt
      };
      
      if (offerData.status) {
        updateFields['offerLetter'] = offerData.status;
        updateFields['offerLetterUrl'] = offerData.url;
      }
      if (relievingData.status) {
        updateFields['relievingLetter'] = relievingData.status;
        updateFields['relievingLetterUrl'] = relievingData.url;
      }
      if (pfData.status) {
        updateFields['pfServiceHistory'] = pfData.status;
        updateFields['pfServiceHistoryUrl'] = pfData.url;
      }
      if (payslipData.status) {
        updateFields['payslip'] = payslipData.status;
        updateFields['payslipUrl'] = payslipData.url;
      }
      
      for (var field in updateFields) {
        if (updateFields[field]) {
           setByHeader(mSheet, headerRow, matchedRowIdx + 1, field, updateFields[field]);
        }
      }
      
      // Update documentAmountPaid if it exists in Master, and recalculate totalPaid
      var docPaidIdx = findHeaderCol(headerRow, 'documentAmountPaid');
      var regAmtIdx = findHeaderCol(headerRow, 'registrationAmount');
      var totalPaidIdx = findHeaderCol(headerRow, 'totalPaid');
      
      if (existingBgvRowIdx === -1) {
        logDirectAudit(ss, matchedPlacementId, matchedFullName, 'BGV', 'BGV_SUBMITTED', 'Direct Placement BGV Form Submitted', previousBgvStatus, 'SUBMITTED', 'System');
      }
    }
    
    SpreadsheetApp.flush();
    return { success: true, message: "Direct Placement BGV Synced Successfully" };
  } catch(err) {
    Logger.log("processDirectBgvRow_ ERROR: " + err.toString());
    return { success: false, error: err.toString() };
  }
}

function syncDirectBGV(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (e && e.namedValues) {
      Logger.log("syncDirectBGV: Running in Event-Driven Mode");
      return processDirectBgvRow_(e, ss, e.namedValues, e.range ? e.range.getRow() : new Date().getTime(), e.range ? e.range.getSheet().getName() : 'raw');
    } else {
      Logger.log("syncDirectBGV: Running in Manual Sync Bulk Mode");
      var bgvSheet = getSheetSafe(ss, DP_FORM_RESPONSES_5);
      if (!bgvSheet) {
        Logger.log("Direct Placement BGV Form sheet not found (" + DP_FORM_RESPONSES_5 + ").");
        return { success: false, error: "Direct Placement BGV Form sheet not found." };
      }
      
      var rawData = bgvSheet.getDataRange().getValues();
      if (rawData.length < 2) {
        return { success: true, message: "No data in BGV Form Sheet" };
      }
      
      var headers = rawData[0].map(function(h) { return String(h).trim(); });
      var syncColIdx = findHeaderCol(headers, 'syncStatus');
      if (syncColIdx === -1) {
        syncColIdx = headers.length;
        bgvSheet.getRange(1, syncColIdx + 1).setValue('syncStatus');
        headers.push('syncStatus');
      }
      
      var syncedCount = 0;
      for (var r = 1; r < rawData.length; r++) {
        if (!rawData[r].join("").trim()) continue;
        var status = String(rawData[r][syncColIdx] || '').trim().toLowerCase();
        if (status !== 'synced' && status !== 'candidate_not_found') {
          var namedVals = {};
          for (var c = 0; c < headers.length; c++) {
            namedVals[headers[c]] = [rawData[r][c]];
          }
          var result = processDirectBgvRow_(null, ss, namedVals, r + 1, bgvSheet.getName());
          if (result && result.success) {
            bgvSheet.getRange(r + 1, syncColIdx + 1).setValue('Synced');
            syncedCount++;
          }
        }
      }
      SpreadsheetApp.flush();
      return { success: true, message: "Manual BGV Sync Completed. Synced: " + syncedCount };
    }
  } catch(err) {
    Logger.log("syncDirectBGV bulk ERROR: " + err.toString());
    return { success: false, error: err.toString() };
  }
}


function sheetToCsvBlob(sheetName, fileName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  
  var data = sheet.getDataRange().getValues();
  var csvLines = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var csvRow = [];
    for (var j = 0; j < row.length; j++) {
      var cell = String(row[j] !== undefined && row[j] !== null ? row[j] : "");
      // Escape for CSV
      if (cell.indexOf(",") !== -1 || cell.indexOf('"') !== -1 || cell.indexOf("\n") !== -1 || cell.indexOf("\r") !== -1) {
        cell = '"' + cell.replace(/"/g, '""') + '"';
      }
      csvRow.push(cell);
    }
    csvLines.push(csvRow.join(","));
  }
  
  var csvString = csvLines.join("\r\n");
  return Utilities.newBlob(csvString, 'text/csv', fileName);
}

// ============================================================
// DIRECT PLACEMENT BGV FIX - SAFE HEADER MAPPER
// ============================================================
function normalizeHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getDirectPlacementHeaderRowIndex_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length > 1 && String(data[1][0] || '').trim().toLowerCase() === 'placementid') {
    return 1;
  }
  return 0;
}

function getDirectPlacementHeaderMap_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};
  
  var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
  
  var headers = data[masterHeaderRowIdx];
  var map = {};
  
  headers.forEach(function(header, index) {
    var key = normalizeHeader_(header);
    if (!key) return;
    if (map[key] === undefined) {
      map[key] = index;
    }
  });
  
  return map;
}

function getDPValue_(row, headerMap, field) {
  var key = normalizeHeader_(field);
  var index = headerMap[key];
  if (index === undefined) return '';
  var val = row[index];
  if (val instanceof Date) return val.toISOString();
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function directPlacementRowToObj_(row, headerMap) {
  return {
    placementId: getDPValue_(row, headerMap, 'placementId'),
    fullName: getDPValue_(row, headerMap, 'fullName'),
    mobileNumber: getDPValue_(row, headerMap, 'mobileNumber'),
    yearOfPassing: getDPValue_(row, headerMap, 'yearOfPassing'),
    currentlyWorking: getDPValue_(row, headerMap, 'currentlyWorking'),
    experienceType: getDPValue_(row, headerMap, 'experienceType'),
    companyName: getDPValue_(row, headerMap, 'companyName'),
    designation: getDPValue_(row, headerMap, 'designation'),
    ctc: getDPValue_(row, headerMap, 'ctc'),
    amountPaid: getDPValue_(row, headerMap, 'amountPaid'),
    
    offerLetter: getDPValue_(row, headerMap, 'offerLetter'),
    offerLetterUrl: getDPValue_(row, headerMap, 'offerLetterUrl'),
    relievingLetter: getDPValue_(row, headerMap, 'relievingLetter'),
    relievingLetterUrl: getDPValue_(row, headerMap, 'relievingLetterUrl'),
    pfServiceHistory: getDPValue_(row, headerMap, 'pfServiceHistory'),
    pfServiceHistoryUrl: getDPValue_(row, headerMap, 'pfServiceHistoryUrl'),
    payslip: getDPValue_(row, headerMap, 'payslip'),
    payslipUrl: getDPValue_(row, headerMap, 'payslipUrl'),
    
    bgvStatus: getDPValue_(row, headerMap, 'bgvStatus'),
    dateOfBirth: getDPValue_(row, headerMap, 'dateOfBirth'),
    gender: getDPValue_(row, headerMap, 'gender'),
    fatherName: getDPValue_(row, headerMap, 'fatherName'),
    motherName: getDPValue_(row, headerMap, 'motherName'),
    aadhaar: getDPValue_(row, headerMap, 'aadhaar'),
    pan: getDPValue_(row, headerMap, 'pan'),
    alternateContact: getDPValue_(row, headerMap, 'alternateContact'),
    emergencyContact: getDPValue_(row, headerMap, 'emergencyContact'),
    address: getDPValue_(row, headerMap, 'address'),
    city: getDPValue_(row, headerMap, 'city'),
    state: getDPValue_(row, headerMap, 'state'),
    pincode: getDPValue_(row, headerMap, 'pincode'),
    education: getDPValue_(row, headerMap, 'education'),
    college: getDPValue_(row, headerMap, 'college'),
    courseName: getDPValue_(row, headerMap, 'courseName'),
    batch: getDPValue_(row, headerMap, 'batch'),
    documentAmount: getDPValue_(row, headerMap, 'documentAmount'),
    bgvSubmittedAt: getDPValue_(row, headerMap, 'bgvSubmittedAt'),
    experience: getDPValue_(row, headerMap, 'experience'),
    company: getDPValue_(row, headerMap, 'company'),
    salary: getDPValue_(row, headerMap, 'salary'),
    referenceName: getDPValue_(row, headerMap, 'referenceName'),
    referencePhone: getDPValue_(row, headerMap, 'referencePhone'),
    referenceCompany: getDPValue_(row, headerMap, 'referenceCompany'),
    documentStatus: getDPValue_(row, headerMap, 'documentStatus'),
    verificationStatus: getDPValue_(row, headerMap, 'verificationStatus'),
    policeVerification: getDPValue_(row, headerMap, 'policeVerification'),
    
    candidateStatus: getDPValue_(row, headerMap, 'candidateStatus'),
    trackedStatus: getDPValue_(row, headerMap, 'trackedStatus'),
    trackedAt: getDPValue_(row, headerMap, 'trackedAt'),
    createdAt: getDPValue_(row, headerMap, 'createdAt'),
    updatedAt: getDPValue_(row, headerMap, 'updatedAt'),
    remarks: getDPValue_(row, headerMap, 'remarks')
  };
}



function getDirectAuditLogs(params) {
  try {
    var placementId = params.placementId || '';
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var auditSheet = getSheetSafe(ss, DP_AUDIT_LOGS_SHEET);
    if (!auditSheet) return { success: true, auditLogs: [] };
    
    var data = auditSheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, auditLogs: [] };
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(auditSheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var pIdIdx = findHeaderCol(headers, 'placementId');
    if (pIdIdx === -1) return { success: true, auditLogs: [] };
    
    var logs = [];
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (!placementId || String(data[i][pIdIdx]).trim() === placementId) {
        var logObj = {};
        for (var h = 0; h < headers.length; h++) {
          var key = headers[h];
          if (!key) continue;
          logObj[key] = data[i][h];
        }
        logs.push(logObj);
      }
    }
    
    logs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return { success: true, logs: logs };
  } catch (err) {
    Logger.log("getDirectAuditLogs Error: " + err.message);
    return { success: false, error: err.toString() };
  }
}

function logDirectAudit(ss, placementId, candidateName, module, action, description, oldValue, newValue, performedBy) {
  try {
    var sheetCols = ['auditId', 'placementId', 'candidateName', 'module', 'action', 'description', 'oldValue', 'newValue', 'performedBy', 'timestamp'];
    var sheet = getSheetSafe(ss, DP_AUDIT_LOGS_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(DP_AUDIT_LOGS_SHEET);
    }
    ensureDirectPlacementColumns_(sheet, sheetCols);
    
    var auditId = 'dpaud_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var now = new Date().toISOString();
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = sheet.getDataRange().getValues()[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var row = buildRowByHeaders(headers, {
      auditId: auditId,
      placementId: placementId || '',
      candidateName: candidateName || '',
      module: module || '',
      action: action || '',
      description: description || '',
      oldValue: oldValue || '',
      newValue: newValue || '',
      performedBy: performedBy || 'SYSTEM',
      timestamp: now
    });
    
    sheet.appendRow(row);
  } catch(e) {
    Logger.log("logDirectAudit error: " + e.toString());
  }
}

function generateDirectAdjustmentId_() {
  return 'DPA' + Date.now() + Math.floor(Math.random() * 1000);
}

function getDirectAdjustments(placementId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_ADJUSTMENT_SHEET);
    if (!sheet) return { success: true, adjustments: [] };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, adjustments: [] };
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    var pIdIdx = findHeaderCol(headers, 'placementId');
    if (pIdIdx === -1) return { success: true, adjustments: [] };
    
    var adjustments = [];
    var headerMap = getDirectPlacementHeaderMap_(sheet);
    
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (!placementId || String(data[i][pIdIdx]).trim() === String(placementId).trim()) {
        adjustments.push(directPlacementRowToObj_(data[i], headerMap));
      }
    }
    
    adjustments.sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return { success: true, adjustments: adjustments };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

function addDirectAdjustment(params) {
  try {
    var placementId = params.placementId || '';
    var candidateName = params.candidateName || '';
    var pipelineType = params.pipelineType || '';
    var adjustmentType = params.adjustmentType || '';
    var amount = parseFloat(params.amount) || 0;
    var reason = params.reason || '';
    var notes = params.notes || '';
    var performedBy = params.performedBy || 'System';
    
    if (!placementId) throw new Error("placementId required");
    if (amount <= 0) throw new Error("amount must be > 0");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_ADJUSTMENT_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(DP_ADJUSTMENT_SHEET);
    }
    var cols = ['adjustmentId', 'placementId', 'candidateName', 'pipelineType', 'adjustmentType', 'amount', 'reason', 'notes', 'clientMutationId', 'createdBy', 'createdAt', 'updatedAt'];
    ensureDirectPlacementColumns_(sheet, cols);
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = sheet.getDataRange().getValues()[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var adjustmentId = generateDirectAdjustmentId_();
    var now = new Date().toISOString();
    
    var clientMutationId = params.clientMutationId || '';
    
    // Check for idempotency
    if (clientMutationId) {
      var allData = sheet.getDataRange().getValues();
      var hIdx = getDirectPlacementHeaderRowIndex_(sheet);
      var cMutIdx = findHeaderCol(allData[hIdx].map(function(h){return String(h).trim();}), 'clientMutationId');
      if (cMutIdx !== -1) {
        for (var i = hIdx + 1; i < allData.length; i++) {
          if (String(allData[i][cMutIdx]).trim() === clientMutationId) {
             // Already processed, just return the existing row and recalculate ledger safely
             var existingAdj = directPlacementRowToObj_(allData[i], getDirectPlacementHeaderMap_(sheet));
             var updatedLedger = upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType);
             return {
                success: true,
                adjustmentId: existingAdj.adjustmentId,
                adjustment: existingAdj,
                financial: updatedLedger,
                auditLog: null // We skip audit log for duplicate
             };
          }
        }
      }
    }
    
    var signedAmount = amount;
    var uType = String(adjustmentType).toUpperCase().trim();
    if (uType === 'DISCOUNT' || uType === 'WAIVER' || uType === 'REFUND' || uType === 'REDUCTION') {
      signedAmount = -Math.abs(amount);
    } else {
      signedAmount = Math.abs(amount);
    }
    
    var row = buildRowByHeaders(headers, {
      adjustmentId: adjustmentId,
      placementId: placementId,
      candidateName: candidateName,
      pipelineType: pipelineType,
      adjustmentType: adjustmentType,
      amount: signedAmount, // Save as signed
      reason: reason,
      notes: notes,
      clientMutationId: clientMutationId,
      createdBy: performedBy,
      createdAt: now,
      updatedAt: now
    });
    
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    
    // Read the newly saved adjustment back
    var savedData = sheet.getDataRange().getValues();
    var savedRow = savedData[savedData.length - 1];
    var confirmedAdjustment = directPlacementRowToObj_(savedRow, getDirectPlacementHeaderMap_(sheet));
    
    // Upsert financial ledger and get updated ledger
    var updatedLedger = upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType);
    
    var auditMsg = pipelineType + ' ' + adjustmentType + ' of Rs. ' + amount + ' added';
    var confirmedAuditLog = logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'ADJUSTMENT_ADDED', auditMsg, '', adjustmentType + ':' + amount, performedBy);
    
    return { 
      success: true, 
      adjustmentId: adjustmentId,
      adjustment: confirmedAdjustment,
      financial: updatedLedger,
      auditLog: confirmedAuditLog
    };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

function updateDirectAdjustment(params) {
  try {
    var adjustmentId = params.adjustmentId;
    var placementId = params.placementId;
    var performedBy = params.performedBy || 'System';
    if (!adjustmentId || !placementId) throw new Error("adjustmentId and placementId required");
    
    var updates = JSON.parse(params.updates || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_ADJUSTMENT_SHEET);
    if (!sheet) throw new Error("Sheet not found");
    
    var data = sheet.getDataRange().getValues();
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var targetRow = -1;
    var aIdIdx = findHeaderCol(headers, 'adjustmentId');
    var oldObj = null;
    
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][aIdIdx]).trim() === adjustmentId) {
        targetRow = i + 1;
        oldObj = directPlacementRowToObj_(data[i], getDirectPlacementHeaderMap_(sheet));
        break;
      }
    }
    if (targetRow === -1) throw new Error("Adjustment not found");
    
    var now = new Date().toISOString();
    updates.updatedAt = now;
    
    for (var key in updates) {
      if (findHeaderCol(headers, key) === -1) {
        headers.push(key);
        sheet.getRange(headerRowIdx + 1, headers.length).setValue(key);
      }
      var finalVal = updates[key];
      if (key === 'amount') {
         // Re-apply sign logic if amount or type is changing
         var uType = String(updates.adjustmentType || oldObj.adjustmentType).toUpperCase().trim();
         if (uType === 'DISCOUNT' || uType === 'WAIVER' || uType === 'REFUND' || uType === 'REDUCTION') {
           finalVal = -Math.abs(updates[key]);
         } else {
           finalVal = Math.abs(updates[key]);
         }
      }
      setByHeader(sheet, headers, targetRow, key, finalVal);
    }
    
    var oldVal = oldObj.adjustmentType + ':' + oldObj.amount;
    var newVal = (updates.adjustmentType || oldObj.adjustmentType) + ':' + (updates.amount !== undefined ? updates.amount : oldObj.amount);
    var newPipelineType = updates.pipelineType || oldObj.pipelineType;
    
    var auditMsg = newPipelineType + ' Adjustment updated';
    var confirmedAuditLog = logDirectAudit(ss, placementId, oldObj.candidateName, 'FINANCE', 'ADJUSTMENT_UPDATED', auditMsg, oldVal, newVal, performedBy);
    
    if (newPipelineType !== oldObj.pipelineType) {
      upsertDirectFinancialLedger(ss, placementId, oldObj.candidateName, oldObj.pipelineType);
    }
    var updatedLedger = upsertDirectFinancialLedger(ss, placementId, oldObj.candidateName, newPipelineType);
    
    SpreadsheetApp.flush();
    var finalData = sheet.getDataRange().getValues();
    var confirmedAdjustment = directPlacementRowToObj_(finalData[targetRow - 1], getDirectPlacementHeaderMap_(sheet));
    
    return { 
      success: true, 
      message: 'Adjustment updated',
      adjustment: confirmedAdjustment,
      financial: updatedLedger,
      auditLog: confirmedAuditLog
    };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

function deleteDirectAdjustment(params) {
  try {
    var adjustmentId = params.adjustmentId;
    var placementId = params.placementId;
    var performedBy = params.performedBy || 'System';
    if (!adjustmentId || !placementId) throw new Error("adjustmentId and placementId required");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheetSafe(ss, DP_ADJUSTMENT_SHEET);
    if (!sheet) throw new Error("Sheet not found");
    
    var data = sheet.getDataRange().getValues();
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var targetRow = -1;
    var aIdIdx = findHeaderCol(headers, 'adjustmentId');
    var oldObj = null;
    
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][aIdIdx]).trim() === adjustmentId) {
        targetRow = i + 1;
        oldObj = directPlacementRowToObj_(data[i], getDirectPlacementHeaderMap_(sheet));
        break;
      }
    }
    if (targetRow === -1) throw new Error("Adjustment not found");
    
    sheet.deleteRow(targetRow);
    
    var oldVal = oldObj.adjustmentType + ':' + oldObj.amount;
    var auditMsg = oldObj.pipelineType + ' ' + oldObj.adjustmentType + ' of Rs. ' + oldObj.amount + ' deleted';
    var confirmedAuditLog = logDirectAudit(ss, placementId, oldObj.candidateName, 'FINANCE', 'ADJUSTMENT_DELETED', auditMsg, oldVal, '', performedBy);
    
    var updatedLedger = upsertDirectFinancialLedger(ss, placementId, oldObj.candidateName, oldObj.pipelineType);
    SpreadsheetApp.flush();
    
    return { 
      success: true, 
      message: 'Adjustment deleted',
      financial: updatedLedger,
      auditLog: confirmedAuditLog
    };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

// Safe numeric parser
function parseSafeDirectAmount_(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  var s = String(val).replace(/[^0-9.-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Unified Financial Calculation Engine
function calculateDirectPlacementFinancials_(baseFee, adjustmentsArr, paymentsArr) {
  var bFee = parseSafeDirectAmount_(baseFee);
  
  var totalAdjustments = 0;
  for (var i = 0; i < adjustmentsArr.length; i++) {
     totalAdjustments += parseSafeDirectAmount_(adjustmentsArr[i].amount);
  }
  
  var paidToDate = 0;
  for (var j = 0; j < paymentsArr.length; j++) {
     paidToDate += parseSafeDirectAmount_(paymentsArr[j].amount);
  }
  
  var netPayable = Math.max(0, bFee + totalAdjustments);
  var pendingDues = Math.max(0, netPayable - paidToDate);
  var overpaid = Math.max(0, paidToDate - netPayable);
  
  return {
    baseFee: bFee,
    totalAdjustments: totalAdjustments,
    netPayable: netPayable,
    paidToDate: paidToDate,
    pendingDues: pendingDues,
    overpaidAmount: overpaid
  };
}

function upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType, explicitBaseFee) {
  if (!placementId || !pipelineType) return null;
  var pt = String(pipelineType).toLowerCase();
  
  var lCols = ['placementId', 'candidateName', 'pipelineType', 'baseFee', 'netPayable', 'paidToDate', 'pendingDues', 'overpaidAmount', 'paymentStatus', 'updatedAt'];
  var lSheet = ensureSheetWithColumns(ss, DP_FINANCIAL_LEDGER_SHEET, lCols);
  
  var lData = lSheet.getDataRange().getValues();
  var lHeaderMap = getDirectPlacementHeaderMap_(lSheet);
  var lHeaders = lData[getDirectPlacementHeaderRowIndex_(lSheet)].map(function(h){ return String(h).trim(); });
  
  var targetRow = -1;
  var existingBaseFee = 0;
  
  if (lData.length > 1) {
    for (var j = 1; j < lData.length; j++) {
      if (getDPValue_(lData[j], lHeaderMap, 'placementId') === String(placementId).trim() && getDPValue_(lData[j], lHeaderMap, 'pipelineType').toLowerCase() === pt) {
        targetRow = j + 1;
        existingBaseFee = parseSafeDirectAmount_(getDPValue_(lData[j], lHeaderMap, 'baseFee'));
        break;
      }
    }
  }
  
  var hasExplicitBaseFee = explicitBaseFee !== undefined && explicitBaseFee !== null && String(explicitBaseFee).trim() !== '';
  var finalBaseFee = hasExplicitBaseFee ? parseSafeDirectAmount_(explicitBaseFee) : existingBaseFee;
  
  // Collect matching payments
  var pSheet = getSheetSafe(ss, DP_PAYMENT_SHEET);
  var matchingPayments = [];
  if (pSheet) {
    var pData = pSheet.getDataRange().getValues();
    var pMap = getDirectPlacementHeaderMap_(pSheet);
    for (var i = 1; i < pData.length; i++) {
       var pId = getDPValue_(pData[i], pMap, 'placementId');
       if (pId === String(placementId).trim()) {
          var pPt = getDPValue_(pData[i], pMap, 'pipelineType').toLowerCase();
          if (!pPt) {
             var typeStr = getDPValue_(pData[i], pMap, 'paymentType').toLowerCase();
             if (typeStr.indexOf('registration') > -1) pPt = 'registration';
             else if (typeStr.indexOf('course') > -1) pPt = 'course';
             else if (typeStr.indexOf('document') > -1) pPt = 'document';
             else if (typeStr.indexOf('placement') > -1) pPt = 'placement';
             else pPt = typeStr.replace(/fee/g, '').replace(/[^a-z]/g, '');
          }
          if (pPt === pt) {
             matchingPayments.push({ amount: getDPValue_(pData[i], pMap, 'amount') });
          }
       }
    }
  }
  
  // Collect matching adjustments
  var aSheet = getSheetSafe(ss, DP_ADJUSTMENT_SHEET);
  var matchingAdjustments = [];
  if (aSheet) {
    var aData = aSheet.getDataRange().getValues();
    var aMap = getDirectPlacementHeaderMap_(aSheet);
    for (var i = 1; i < aData.length; i++) {
       if (getDPValue_(aData[i], aMap, 'placementId') === String(placementId).trim()) {
          if (getDPValue_(aData[i], aMap, 'pipelineType').toLowerCase() === pt) {
             matchingAdjustments.push({ amount: getDPValue_(aData[i], aMap, 'amount') });
          }
       }
    }
  }
  
  var calc = calculateDirectPlacementFinancials_(finalBaseFee, matchingAdjustments, matchingPayments);
  
  var status = 'Pending';
  if (calc.pendingDues === 0 && calc.netPayable > 0) status = 'Paid';
  else if (calc.pendingDues === 0 && calc.netPayable === 0 && calc.paidToDate > 0) status = 'Paid';
  else if (calc.paidToDate > 0 && calc.pendingDues > 0) status = 'Partial';
  
  var now = new Date().toISOString();
  
  if (targetRow !== -1) {
    setByHeader(lSheet, lHeaders, targetRow, 'baseFee', calc.baseFee);
    setByHeader(lSheet, lHeaders, targetRow, 'netPayable', calc.netPayable);
    setByHeader(lSheet, lHeaders, targetRow, 'paidToDate', calc.paidToDate);
    setByHeader(lSheet, lHeaders, targetRow, 'pendingDues', calc.pendingDues);
    setByHeader(lSheet, lHeaders, targetRow, 'overpaidAmount', calc.overpaidAmount);
    setByHeader(lSheet, lHeaders, targetRow, 'paymentStatus', status);
    setByHeader(lSheet, lHeaders, targetRow, 'updatedAt', now);
  } else {
    var newRow = buildRowByHeaders(lHeaders, {
      placementId: placementId,
      candidateName: candidateName,
      pipelineType: pipelineType,
      baseFee: calc.baseFee,
      netPayable: calc.netPayable,
      paidToDate: calc.paidToDate,
      pendingDues: calc.pendingDues,
      overpaidAmount: calc.overpaidAmount,
      paymentStatus: status,
      updatedAt: now
    });
    lSheet.appendRow(newRow);
    targetRow = lSheet.getLastRow();
  }
  
  SpreadsheetApp.flush();
  
  var finalLData = lSheet.getDataRange().getValues();
  return directPlacementRowToObj_(finalLData[targetRow - 1], lHeaderMap);
}

function updateDirectFinancialLedger(params) {
  try {
    var placementId = params.placementId;
    if (!placementId) throw new Error("placementId required");
    var updates = JSON.parse(params.updates || '{}');
    var pipelineType = updates.pipelineType;
    if (!pipelineType) throw new Error("pipelineType required");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    upsertDirectFinancialLedger(ss, placementId, '', pipelineType, updates.baseFee);
    
    var oldVal = 'Base Fee Updated';
    var newVal = 'Pipeline: ' + pipelineType + ', Base Fee: ' + updates.baseFee;
    logDirectAudit(ss, placementId, '', 'FINANCE', 'BASE_FEE_UPDATED', pipelineType + ' Base Fee Updated', oldVal, newVal, params.userStamp || 'System');
    
    return { success: true };
  } catch(err) {
    return { success: false, error: err.message };
  }
}
