/**
 * PyCRM - Code.gs (Google Apps Script Backend)
 *
 * Google Form Fields: FullName, EMAIL, MOB NO, MODE, BRANCH, DOMAIN, DOB, ADDRESS, REMARKS
 *
 * Registration_Responses: submissionId, tokenEmail, FullName, email, phone, dob, address, course, branch, submittedAt, syncStatus, candidateId
 * Master_Candidates: candidateId, FullName, email, phone, batchName, dateOfBirth, address, branch, course, dateOfJoining, currentStatus, bgvStatus, placed, placedCompany, trackedStatus, trackedAt, createdAt, updatedAt
 */

var FORM_SOURCE_SHEET = 'Form responses 1';
var REGISTRATION_SHEET = 'Registration_Responses';
var MASTER_SHEET_NAME = 'Master_Candidates';
var PAYMENT_RECORDS_SHEET = 'Payment_Records';
var FINANCIAL_LEDGER_SHEET = 'Financial_Ledger';
var SYSTEM_AUDIT_LOGS_SHEET = 'System_Audit_Logs';
var BGV_RESPONSES_SHEET = 'BGV_Responses';

// Direct Placement Module Sheets (completely independent)
var DP_REGISTRATION_SHEET = 'DP_Registration_Res';
var DP_MASTER_SHEET = 'Direct_Placement_Master';
var DP_BGV_SHEET = 'DP_BGV_Responses';
var DP_PAYMENT_SHEET = 'Direct_Payment_Records';
var DP_FINANCIAL_LEDGER_SHEET = 'Direct_Financial_Ledger';
var DP_ADJUSTMENT_SHEET = 'Direct_Adjustment_Records';
var DP_AUDIT_LOGS_SHEET = 'Direct_System_Audit_Logs';

// ============================================================
// ENTRY POINTS
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
        var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
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
            
            logAuditToSheet(ss, candidateId, existingCandidateName, actionType, oldVal, newVal, params.userStamp || 'System', now);
          }
          
          setByHeader(masterSheet, headers, targetRowIndex, headerName, newVal);
        }
        
        setByHeader(masterSheet, headers, targetRowIndex, 'updatedAt', now);
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Candidate updated' })).setMimeType(ContentService.MimeType.JSON);
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
        var ledgerSheet = ss.getSheetByName(FINANCIAL_LEDGER_SHEET);
        if (!ledgerSheet) {
          return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Financial_Ledger sheet not found' })).setMimeType(ContentService.MimeType.JSON);
        }

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
        var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
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
        var paymentSheet = ss.getSheetByName(PAYMENT_RECORDS_SHEET);
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
    var namedValues = (e && e.namedValues) ? e.namedValues : {};

    Logger.log("RAW namedValues = " + JSON.stringify(namedValues));
    Logger.log("namedValues keys = " + Object.keys(namedValues).join(", "));

    var rawSheetName = e.range ? e.range.getSheet().getName() : '';
    
    var isDPRegForm = false;
    if (rawSheetName === 'Form responses 13' || rawSheetName === DP_REGISTRATION_SHEET) {
      isDPRegForm = true;
    }

    if (isDPRegForm) {
      Logger.log("Detected Direct Placement Form Submission");
      syncDirectPlacement(e);
      return; // Stop here, handled entirely by syncDirectPlacement
    }
    
    // --- DIRECT PLACEMENT BGV FORM DETECTION ---
    var normalizedKeys = Object.keys(namedValues).map(function(k) {
      return String(k || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    });
    
    var isDirectPlacementBGV = 
      normalizedKeys.indexOf("dateofbirth") !== -1 &&
      (normalizedKeys.indexOf("fathername") !== -1 || normalizedKeys.indexOf("fathersname") !== -1) &&
      normalizedKeys.indexOf("alternatecontactnumber") !== -1 &&
      normalizedKeys.indexOf("howmuchamountpaidfordocument") !== -1;
      
    if (isDirectPlacementBGV) {
      Logger.log("Direct Placement BGV form detected from sheet: " + rawSheetName);
      syncDirectBGV(e);
      return; // Stop here, do not process as Training CRM BGV or Registration
    }

    // --- TRAINING CRM BGV FORM DETECTION ---
    var isBgvForm = false;
    if (rawSheetName.toLowerCase().indexOf('bgv') !== -1 || findValue(namedValues, "FatherName") || findValue(namedValues, "DocumentAmount") || findValue(namedValues, "AmountPaidForDocument")) {
      isBgvForm = true;
    }

    if (isBgvForm) {
      Logger.log("Detected Training CRM BGV Form Submission");
      var bgvName    = findValue(namedValues, "Name") || findValue(namedValues, "FullName");
      var bgvPhone   = findValue(namedValues, "ContactNumber") || findValue(namedValues, "Phone") || findValue(namedValues, "MobNo");
      var bgvDob     = findValue(namedValues, "DateOfBirth") || findValue(namedValues, "DOB");
      var bgvFather  = findValue(namedValues, "FatherName");
      var bgvAddress = findValue(namedValues, "Address") || findValue(namedValues, "CurrentAddress");
      var bgvCourse  = findValue(namedValues, "CourseName") || findValue(namedValues, "Course");
      var bgvBatch   = findValue(namedValues, "Batch") || findValue(namedValues, "BatchName");
      var bgvDocAmt  = findValue(namedValues, "DocumentAmount") || findValue(namedValues, "Amount") || findValue(namedValues, "HowMuchAmountPaidForDocument");
      var submittedAt= findValue(namedValues, "Timestamp") || new Date().toISOString();

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var bgvTargetSheet = ensureSheetWithColumns(ss, BGV_RESPONSES_SHEET, [
        'responseId', 'fullName', 'phone', 'dateOfBirth', 'fatherName',
        'address', 'courseName', 'batchName', 'documentAmount', 'submittedAt', 'syncStatus'
      ]);
      
      var responseId = 'bgv_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var bgvHeaders = getSheetHeaders(bgvTargetSheet);
      
      var newBgvRow = buildRowByHeaders(bgvHeaders, {
        'responseId': responseId,
        'fullName': bgvName,
        'phone': bgvPhone,
        'dateOfBirth': bgvDob,
        'fatherName': bgvFather,
        'address': bgvAddress,
        'courseName': bgvCourse,
        'batchName': bgvBatch,
        'documentAmount': bgvDocAmt,
        'submittedAt': submittedAt,
        'syncStatus': 'pending'
      });
      
      bgvTargetSheet.appendRow(newBgvRow);
      Logger.log("BGV form mapped & appended to BGV_Responses. FullName=" + bgvName);
      
      SpreadsheetApp.flush();
      syncBgvResponses();
      return; // Stop here, do not process as Registration
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
    var regSheet = ss.getSheetByName(REGISTRATION_SHEET);
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regSheet = ss.getSheetByName(REGISTRATION_SHEET);
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);

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
  var sheet = ss.getSheetByName(MASTER_SHEET_NAME);
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

  var paymentSheet = ss.getSheetByName(PAYMENT_RECORDS_SHEET);
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

  var ledgerSheet = ss.getSheetByName(FINANCIAL_LEDGER_SHEET);
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
  var paymentSheet = ss.getSheetByName(PAYMENT_RECORDS_SHEET);
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
  var paymentSheet = ss.getSheetByName(PAYMENT_RECORDS_SHEET);
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
  var ledgerSheet = ss.getSheetByName(FINANCIAL_LEDGER_SHEET);
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
  var requiredColumns = ['auditId', 'candidateId', 'candidateName', 'actionType', 'oldValue', 'newValue', 'timestamp', 'user'];
  var auditSheet = ensureSheetWithColumns(ss, SYSTEM_AUDIT_LOGS_SHEET, requiredColumns);
  var headers = getSheetHeaders(auditSheet);
  
  var newRow = buildRowByHeaders(headers, {
    'auditId':       'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    'candidateId':   candidateId,
    'candidateName': candidateName,
    'actionType':    actionType,
    'oldValue':      oldValue,
    'newValue':      newValue,
    'timestamp':     timestamp,
    'user':          userStamp
  });
  auditSheet.appendRow(newRow);
}

function getAuditLogs(filterCandidateId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var auditSheet = ss.getSheetByName(SYSTEM_AUDIT_LOGS_SHEET);
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
      obj[key] = val.toISOString();
    } else if (val !== undefined && val !== null) {
      obj[key] = String(val);
    } else {
      obj[key] = '';
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
  var paymentSheet = ss.getSheetByName(PAYMENT_RECORDS_SHEET);
  
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
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
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
  var rawSheet = ss.getSheetByName(FORM_SOURCE_SHEET);
  var regSheet = ss.getSheetByName(REGISTRATION_SHEET);

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
// No Candidate ID required — aligned with real BGV Google Form.
// ============================================================

function syncBgvResponses() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bgvSheet = ss.getSheetByName(BGV_RESPONSES_SHEET);

  if (!bgvSheet) {
    Logger.log('syncBgvResponses: Missing ' + BGV_RESPONSES_SHEET + ' sheet.');
    return { success: false, error: 'Missing BGV response sheet' };
  }

  // 1. Ensure exact schema
  var requiredBgvCols = [
    'responseId', 'fullName', 'phone', 'dateOfBirth', 'fatherName',
    'address', 'courseName', 'batchName', 'documentAmount', 'submittedAt', 'syncStatus'
  ];
  bgvSheet = ensureSheetWithColumns(ss, BGV_RESPONSES_SHEET, requiredBgvCols);

  var bgvData = bgvSheet.getDataRange().getValues();
  if (bgvData.length < 2) {
    return { success: true, message: 'No BGV responses found', synced: 0, skipped: 0 };
  }

  var requiredMasterCols = [
    'bgvStatus', 'bgvSubmittedAt', 'bgvDob', 'bgvFatherName',
    'bgvAddress', 'bgvCourseName', 'bgvBatch', 'bgvDocumentAmount'
  ];
  var masterSheet = ensureSheetWithColumns(ss, MASTER_SHEET_NAME, requiredMasterCols);

  var masterData = masterSheet.getDataRange().getValues();
  if (masterData.length < 2) {
    return { success: false, error: 'No data in Master_Candidates' };
  }

  var bgvHeaders = bgvData[0].map(function(h) { return String(h).trim(); });
  var masterHeaders = masterData[0].map(function(h) { return String(h).trim(); });

  // Pre-build Master lookups
  var phoneIndex = {};
  var ncbIndex = {};
  var ncIndex = {};

  for (var m = 1; m < masterData.length; m++) {
    var mObj = rowToObj(masterHeaders, masterData[m]);
    if (isObjEmpty(mObj)) continue;

    var sheetRow = m + 1; // 1-indexed

    var mPhone = normalizePhone(mObj['phone'] || '');
    if (mPhone && mPhone.length >= 7) {
      if (!phoneIndex[mPhone]) phoneIndex[mPhone] = [];
      phoneIndex[mPhone].push(sheetRow);
    }

    var mName   = String(mObj['FullName'] || mObj['fullName'] || '').trim().toLowerCase();
    var mCourse = String(mObj['course'] || '').trim().toLowerCase();
    var mBatch  = String(mObj['batchName'] || '').trim().toLowerCase();
    
    // Index Name + Course
    if (mName && mCourse) {
      var ncKey = mName + '|' + mCourse;
      if (!ncIndex[ncKey]) ncIndex[ncKey] = [];
      ncIndex[ncKey].push(sheetRow);
    }

    // Only index for fallback if all 3 are present
    if (mName && mCourse && mBatch) {
      var compositeKey = mName + '|' + mCourse + '|' + mBatch;
      if (!ncbIndex[compositeKey]) ncbIndex[compositeKey] = [];
      ncbIndex[compositeKey].push(sheetRow);
    }
  }

  var synced = 0;
  var skipped = 0;
  var skipReasons = [];

  for (var r = 1; r < bgvData.length; r++) {
    var rowObj = rowToObj(bgvHeaders, bgvData[r]);
    if (isObjEmpty(rowObj)) continue;

    var syncStatus = String(rowObj['syncStatus'] || '').trim();
    if (syncStatus === 'synced') continue;

    var rowLabel = 'Row ' + (r + 1);

    // MAPPING CLEANUP: Map raw Google Form data robustly
    function getVal(keys) {
      for (var k in rowObj) {
        var cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (keys.indexOf(cleanK) !== -1 && rowObj[k]) {
          return String(rowObj[k]).trim();
        }
      }
      return '';
    }

    var bgvName      = getVal(['fullname', 'name', 'fullnam', 'candidatename']);
    var bgvPhone     = getVal(['phone', 'contactnumber', 'contactno', 'mobile', 'mobilenumber', 'mobno']);
    var bgvDob       = getVal(['dateofbirth', 'dob']);
    var bgvFather    = getVal(['fathername', 'fathersname']);
    var bgvAddress   = getVal(['address', 'currentaddress', 'residentialaddress']);
    var bgvCourse    = getVal(['coursename', 'course', 'domain']);
    var bgvBatch     = getVal(['batchname', 'batch', 'mode']);
    var bgvDocAmt    = getVal(['documentamount', 'amount', 'amountpaid', 'howmuchamountpaidfordocument']);
    var bgvTimestamp = getVal(['submittedat', 'timestamp']) || new Date().toISOString();

    // If the actual schema columns were blank but we found data, write it to the sheet so it's clean
    if (!rowObj['fullName'] && bgvName) setByHeader(bgvSheet, bgvHeaders, r + 1, 'fullName', bgvName);
    if (!rowObj['phone'] && bgvPhone) setByHeader(bgvSheet, bgvHeaders, r + 1, 'phone', bgvPhone);
    if (!rowObj['dateOfBirth'] && bgvDob) setByHeader(bgvSheet, bgvHeaders, r + 1, 'dateOfBirth', bgvDob);
    if (!rowObj['fatherName'] && bgvFather) setByHeader(bgvSheet, bgvHeaders, r + 1, 'fatherName', bgvFather);
    if (!rowObj['address'] && bgvAddress) setByHeader(bgvSheet, bgvHeaders, r + 1, 'address', bgvAddress);
    if (!rowObj['courseName'] && bgvCourse) setByHeader(bgvSheet, bgvHeaders, r + 1, 'courseName', bgvCourse);
    if (!rowObj['batchName'] && bgvBatch) setByHeader(bgvSheet, bgvHeaders, r + 1, 'batchName', bgvBatch);
    if (!rowObj['documentAmount'] && bgvDocAmt) setByHeader(bgvSheet, bgvHeaders, r + 1, 'documentAmount', bgvDocAmt);
    if (!rowObj['submittedAt'] && bgvTimestamp) setByHeader(bgvSheet, bgvHeaders, r + 1, 'submittedAt', bgvTimestamp);

    // Skip empty/placeholder rows safely
    var hasFallback = (bgvName && bgvCourse);
    if (!bgvPhone && !hasFallback) {
      var reason = rowLabel + ': Skipped — missing usable phone and incomplete fallback data (Name/Course).';
      Logger.log('syncBgvResponses: ' + reason);
      skipReasons.push(reason);
      skipped++;
      continue;
    }

    var targetRow = -1;
    var matchMethod = '';
    var normPhone = normalizePhone(bgvPhone);

    // PRIMARY MATCH: Name + Course
    if (hasFallback) {
      var ncKey = bgvName.toLowerCase() + '|' + bgvCourse.toLowerCase();
      var ncMatches = ncIndex[ncKey] || [];

      if (ncMatches.length === 1) {
        targetRow = ncMatches[0];
        matchMethod = 'Name+Course';
      } else if (ncMatches.length > 1) {
        // Disambiguate by Batch if available
        if (bgvBatch) {
          var fbKey = bgvName.toLowerCase() + '|' + bgvCourse.toLowerCase() + '|' + bgvBatch.toLowerCase();
          var ncbMatches = ncbIndex[fbKey] || [];
          if (ncbMatches.length === 1) {
            targetRow = ncbMatches[0];
            matchMethod = 'Name+Course+Batch';
          }
        }
      }
    }

    // SECONDARY MATCH: Phone
    if (targetRow === -1 && normPhone && normPhone.length >= 7) {
      var phoneMatches = phoneIndex[normPhone] || [];
      if (phoneMatches.length === 1) {
        targetRow = phoneMatches[0];
        matchMethod = 'Contact Number';
      } else if (phoneMatches.length > 1) {
        var reason = rowLabel + ': Skipped — Multiple candidates share phone ' + normPhone + '.';
        Logger.log('syncBgvResponses: ' + reason);
        skipReasons.push(reason);
        skipped++;
        continue;
      }
    }

    // NO MATCH
    if (targetRow === -1) {
      var reason = rowLabel + ': Skipped — No candidate match found (or multiple matches could not be resolved).';
      Logger.log('syncBgvResponses: ' + reason);
      skipReasons.push(reason);
      skipped++;
      continue;
    }

    // SUCCESS - UPDATE MASTER
    var matchedMasterRowObj = rowToObj(masterHeaders, masterData[targetRow - 1]);
    
    // Backfill phone if blank in master and present in BGV
    var existingPhone = String(matchedMasterRowObj['phone'] || '').trim();
    if (!existingPhone && bgvPhone) {
      setByHeader(masterSheet, masterHeaders, targetRow, 'phone', bgvPhone);
      Logger.log('syncBgvResponses: Backfilled phone for ' + rowLabel);
    }
    
    // Backfill dateOfBirth if blank in master and present in BGV
    var existingDob = String(matchedMasterRowObj['dateOfBirth'] || matchedMasterRowObj['dateofbirth'] || '').trim();
    if (!existingDob && bgvDob) {
      setByHeader(masterSheet, masterHeaders, targetRow, 'dateOfBirth', bgvDob);
      Logger.log('syncBgvResponses: Backfilled dateOfBirth for ' + rowLabel);
    }

    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvStatus', 'Submitted'); // Never auto-set cleared
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvSubmittedAt', bgvTimestamp);
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvDob', bgvDob);
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvFatherName', bgvFather);
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvAddress', bgvAddress);
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvCourseName', bgvCourse);
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvBatch', bgvBatch);
    setByHeader(masterSheet, masterHeaders, targetRow, 'bgvDocumentAmount', bgvDocAmt);
    setByHeader(masterSheet, masterHeaders, targetRow, 'updatedAt', new Date().toISOString());

    // Mark as synced
    setByHeader(bgvSheet, bgvHeaders, r + 1, 'syncStatus', 'synced');

    Logger.log('syncBgvResponses: ' + rowLabel + ' synced via ' + matchMethod + '.');
    synced++;
  }

  return { success: true, synced: synced, skipped: skipped, skipReasons: skipReasons };
}

// ============================================================
// DIRECT PLACEMENT CRM FUNCTIONS
// ============================================================

function generatePlacementId() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DP_MASTER_SHEET);
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
  var sheet = ss.getSheetByName(DP_MASTER_SHEET);
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
  var sheet = ss.getSheetByName(DP_MASTER_SHEET);
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
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var dpFormSheet = ss.getSheetByName('Form responses 13');
    if (!dpFormSheet) {
      Logger.log("Form responses 13 not found.");
      return { success: false, error: "Form responses 13 not found." };
    }
    
    Logger.log("Detecting source sheet: Form responses 13");
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
    var dpMasterSheet = ss.getSheetByName(DP_MASTER_SHEET);

    if (!dpMasterSheet) {
      dpMasterSheet = ss.insertSheet(DP_MASTER_SHEET);
    }

    ensureDirectPlacementColumns_(dpMasterSheet, masterCols);
    
    var masterData = dpMasterSheet.getDataRange().getValues();
    Logger.log("Number of rows read from Master sheet: " + masterData.length);
    
    var masterHeaderRowIdx = 0;
    if (masterData.length > 1 && String(masterData[1][0] || '').trim().toLowerCase() === 'placementid') {
      masterHeaderRowIdx = 1;
      Logger.log("Detected two-row header format. Using row index 1 for headers.");
    } else {
      Logger.log("Detected single-row header format. Using row index 0 for headers.");
    }
    
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
        Logger.log("Processing Form responses 13 row " + r);
        
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
        var amountPaidObj = getVal(['AmountPaid', 'Amount', 'PaidAmount']);
        var offerObj = getVal(['OfferLetter', 'Offer']);
        var relievingObj = getVal(['RelievingLetter', 'Relieving']);
        var pfObj = getVal(['PFServiceHistory', 'PF', 'ServiceHistory']);
        var payslipObj = getVal(['Payslip', 'PaySlips']);
        var submittedAt = getVal(['Timestamp', 'SubmittedAt']) || new Date().toISOString();
        
        Logger.log("Candidate mapped: " + nameObj + " | " + mobileObj);
        
        var matchedIdx = -1;
        for (var k = 0; k < existingData.length; k++) {
          var mRow = existingData[k];
          if (mobileObj && String(mRow['mobileNumber'] || '').trim() === mobileObj) {
            matchedIdx = k; break;
          }
          if (rowObj['placementId'] && String(mRow['placementId'] || '').trim() === String(rowObj['placementId']).trim()) {
            matchedIdx = k; break;
          }
          if (nameObj && String(mRow['fullName'] || '').trim().toLowerCase() === nameObj.toLowerCase()) {
            matchedIdx = k; break;
          }
        }
        
        var now = new Date().toISOString();
        var placementId = '';
        var isNew = false;
        
        if (matchedIdx !== -1) {
          placementId = existingData[matchedIdx]['placementId'];
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
        
        // Mark Form responses 13 as synced
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
  }
}

function getDirectPlacementPayments(placementId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(DP_PAYMENT_SHEET);
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
    var sheet = ss.getSheetByName(DP_FINANCIAL_LEDGER_SHEET);
    if (!sheet) return { success: true, financials: [] };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, financials: [] };
    
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var financials = [];
    var pIdIdx = findHeaderCol(headers, 'placementId');
    
    for (var i = 1; i < data.length; i++) {
      if (!placementId || String(data[i][pIdIdx] || '').trim() === String(placementId).trim()) {
        financials.push(rowToObj(headers, data[i]));
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
    var sheet = ss.getSheetByName(DP_MASTER_SHEET);
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
    logDirectAudit(ss, placementId, candidateName, 'FINANCIAL', 'PAYMENT_ADDED', readableType + ' Added Rs.' + amount, '', '', params.userStamp || 'System');
    
    upsertDirectFinancialLedger(ss, placementId, candidateName);
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
    var sheet = ss.getSheetByName(DP_PAYMENT_SHEET);
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
    
    logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'PAYMENT_UPDATED', 'Updated Payment ' + paymentId, '', '', params.userStamp || 'System');
    
    upsertDirectFinancialLedger(ss, placementId, candidateName);
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
    var sheet = ss.getSheetByName(DP_PAYMENT_SHEET);
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
    
    sheet.deleteRow(targetRow);
    
    logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'PAYMENT_DELETED', 'Deleted Payment ' + paymentId, '', '', params.userStamp || 'System');
    
    upsertDirectFinancialLedger(ss, placementId, candidateName);
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
    var dpMasterSheet = ss.getSheetByName(DP_MASTER_SHEET);
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
    var dpMasterSheet = ss.getSheetByName(DP_MASTER_SHEET);
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
    var dpMasterSheet = ss.getSheetByName(DP_MASTER_SHEET);
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



function logDirectAudit(ss, placementId, candidateName, category, action, description, oldValue, newValue, performedBy) {
  try {
    var sheetCols = ['logId', 'timestamp', 'placementId', 'candidateName', 'category', 'action', 'description', 'performedBy', 'oldValue', 'newValue'];
    var sheet = ensureSheetWithColumns(ss, DP_AUDIT_LOGS_SHEET, sheetCols);
    
    var logId = 'dplog_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    var now = new Date().toISOString();
    
    // Some calls might pass 8 arguments instead of 9 (e.g. logDirectAudit(ss, pId, cName, cat, act, oldV, newV, perfBy))
    // We can detect this based on the number of arguments, but since JS doesn't complain, we just check if performedBy is undefined.
    if (performedBy === undefined) {
      // It was called with 8 args: (ss, placementId, candidateName, category, action, descriptionOrOldValue, newValue, performedBy)
      performedBy = newValue;
      newValue = oldValue;
      oldValue = description;
      description = '';
    }
    
    var row = buildRowByHeaders(sheetCols, {
      logId: logId,
      timestamp: now,
      placementId: placementId || '',
      candidateName: candidateName || '',
      category: category || '',
      action: action || '',
      description: description || '',
      performedBy: performedBy || 'System',
      oldValue: oldValue || '',
      newValue: newValue || ''
    });
    
    sheet.appendRow(row);
  } catch(e) {
    Logger.log("logDirectAudit error: " + e.toString());
  }
}



function syncDirectBGV(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var namedValues = (e && e.namedValues) ? e.namedValues : {};
    var rawRowIndex = (e && e.range) ? e.range.getRow() : new Date().getTime();
    
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

    var bName = getVal(['name', 'fullname', 'candidatename']);
    var bPhone = getVal(['contactnumber', 'mobilenumber', 'mobile', 'phone', 'phonenumber']);
    var bCompany = getVal(['companyname', 'company']);
    var bDob = getVal(['dateofbirth', 'dob']);
    var bFather = getVal(['fathersname', 'fathername']);
    var bAltPhone = getVal(['alternatecontactnumber', 'alternatecontact', 'alternatemobile', 'alternatephonenumber']);
    var bAddress = getVal(['address']);
    var bPin = getVal(['pincode', 'postalcode', 'zipcode']);
    var bCourse = getVal(['coursename', 'course']);
    var bBatch = getVal(['batch', 'batchname']);
    var bDocAmtRaw = getVal(['howmuchamountpaidfordocument', 'documentamount', 'documentamountpaid', 'amountpaidfordocument']);
    var bDocAmt = parseFloat(String(bDocAmtRaw).replace(/[^0-9.]/g, '')) || 0;
    var submittedAt = (namedValues['Timestamp'] && namedValues['Timestamp'][0]) ? namedValues['Timestamp'][0] : new Date().toISOString();

    // 2. Normalize Mobile Number for matching
    var normBPhone = String(bPhone).replace(/[\s\+\-\(\)]/g, "");
    if (normBPhone.length > 10) {
      normBPhone = normBPhone.slice(-10);
    }

    var bNameNorm = String(bName).trim().toLowerCase();

    // 3. Match Existing Direct Placement Candidate
    var mSheet = ss.getSheetByName(DP_MASTER_SHEET);
    if (!mSheet) {
      Logger.log("Direct_Placement_Master sheet not found");
      return;
    }
    
    var mData = mSheet.getDataRange().getValues();
    if (mData.length < 2) return; // Need at least two header rows
    
    // We assume row 2 is actual backend headers based on prompt requirements
    var masterHeaderRowIdx = getDirectPlacementHeaderRowIndex_(mSheet);
    
    var headerRow = mData[masterHeaderRowIdx].map(function(h) { return String(h).trim(); });
    var headerMap = getDirectPlacementHeaderMap_(mSheet);
    var pIdIdx = headerMap['placementId'] !== undefined ? headerMap['placementId'] : findHeaderCol(headerRow, 'placementId');
    var mPhoneIdx = headerMap['mobileNumber'] !== undefined ? headerMap['mobileNumber'] : findHeaderCol(headerRow, 'mobileNumber');
    var mNameIdx = headerMap['fullName'] !== undefined ? headerMap['fullName'] : findHeaderCol(headerRow, 'fullName');
    
    var matchedRowIdx = -1;
    var matchedPlacementId = "";
    var matchedFullName = "";
    var previousBgvStatus = "";
    
    for (var i = masterHeaderRowIdx + 1; i < mData.length; i++) {
      var row = mData[i];
      var rowPhoneRaw = String(row[mPhoneIdx] || "");
      var rowPhoneNorm = rowPhoneRaw.replace(/[\s\+\-\(\)]/g, "");
      if (rowPhoneNorm.length > 10) rowPhoneNorm = rowPhoneNorm.slice(-10);
      
      var rowNameRaw = String(row[mNameIdx] || "").trim().toLowerCase();
      
      // PRIORITY 1: Mobile match
      if (normBPhone && rowPhoneNorm === normBPhone) {
        matchedRowIdx = i;
        break;
      }
    }
    
    // PRIORITY 2: Exact Name match fallback
    if (matchedRowIdx === -1 && bNameNorm) {
      for (var j = masterHeaderRowIdx + 1; j < mData.length; j++) {
        var rowNameFallback = String(mData[j][mNameIdx] || "").trim().toLowerCase();
        if (rowNameFallback === bNameNorm) {
          matchedRowIdx = j;
          break;
        }
      }
    }
    
    var syncStatus = "synced";
    if (matchedRowIdx !== -1) {
      matchedPlacementId = String(mData[matchedRowIdx][pIdIdx]);
      matchedFullName = String(mData[matchedRowIdx][mNameIdx]);
      previousBgvStatus = String(mData[matchedRowIdx][findHeaderCol(headerRow, 'bgvStatus')] || "PENDING");
    } else {
      Logger.log("Candidate not found in Direct_Placement_Master for mobile: " + normBPhone + " and name: " + bNameNorm);
      syncStatus = "candidate_not_found";
    }
    
    var responseId = 'dp_bgv_' + new Date().getTime() + '_' + rawRowIndex;

    // 4. Update DP_BGV_Responses
    var bgvCols = ['responseId', 'placementId', 'fullName', 'mobileNumber', 'dateOfBirth', 'fatherName', 'alternateContact', 'address', 'pincode', 'courseName', 'batch', 'documentAmount', 'bgvStatus', 'submittedAt', 'syncStatus', 'createdAt', 'updatedAt'];
    var bgvSheet = ensureSheetWithColumns(ss, DP_BGV_SHEET, bgvCols);
    
    // CHECK FOR DUPLICATE SYNC KEY
    var bgvData = bgvSheet.getDataRange().getValues();
    var duplicateBgvFound = false;
    if (bgvData.length > 1) {
      var bgvHeaders = bgvData[0].map(function(h) { return String(h).trim(); });
      var rIdIdx = findHeaderCol(bgvHeaders, 'responseId');
      var expectedSyncKey = 'dp_bgv_' + rawSheetName + '_' + rawRowIndex; // stable identity
      for (var r = 1; r < bgvData.length; r++) {
         if (String(bgvData[r][rIdIdx] || '').indexOf(rawRowIndex.toString()) !== -1) {
           // We might have already inserted it
           // However, Google Forms triggers can be tricky. Let's just allow it with a unique ID if not explicitly matched,
           // but the prompt says: "Prevent duplicate processing of the same form submission. Use a stable response identity based on source sheet name and source row number, or check whether the generated responseId already exists before appendRow."
         }
      }
    }
    
    // Create stable response ID
    var rawSheetName = e.range ? e.range.getSheet().getName() : 'raw';
    var stableResponseId = 'dp_bgv_' + rawSheetName + '_row_' + rawRowIndex;
    
    var alreadyExistsInBgv = false;
    var actualBgvHeaders = getSheetHeaders(bgvSheet);
    var actualRIdIdx = findHeaderCol(actualBgvHeaders, 'responseId');
    if (bgvData.length > 1) {
      for (var br = 1; br < bgvData.length; br++) {
        if (String(bgvData[br][actualRIdIdx] || '') === stableResponseId) {
          alreadyExistsInBgv = true;
          break;
        }
      }
    }
    
    if (!alreadyExistsInBgv) {
      var newBgvRow = buildRowByHeaders(actualBgvHeaders, {
        'responseId': stableResponseId,
        'placementId': matchedPlacementId,
        'fullName': matchedFullName || bName,
        'mobileNumber': bPhone,
        'dateOfBirth': bDob,
        'fatherName': bFather,
        'alternateContact': bAltPhone,
        'address': bAddress,
        'pincode': bPin,
        'courseName': bCourse,
        'batch': bBatch,
        'documentAmount': bDocAmtRaw,
        'bgvStatus': (matchedRowIdx !== -1) ? "SUBMITTED" : "",
        'submittedAt': submittedAt,
        'syncStatus': syncStatus,
        'createdAt': new Date().toISOString(),
        'updatedAt': new Date().toISOString()
      });
      bgvSheet.appendRow(newBgvRow);
    }
    
    if (matchedRowIdx !== -1) {
      // 5. Update Direct_Placement_Master
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'bgvStatus', 'SUBMITTED');
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'dateOfBirth', bDob);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'fatherName', bFather);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'alternateContact', bAltPhone);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'address', bAddress);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'pincode', bPin);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'courseName', bCourse);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'batch', bBatch);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'documentAmount', bDocAmt);
      
      // Update documentAmountPaid if it exists in Master, and recalculate totalPaid
      var docPaidIdx = findHeaderCol(headerRow, 'documentAmountPaid');
      var regAmtIdx = findHeaderCol(headerRow, 'registrationAmount');
      var totalPaidIdx = findHeaderCol(headerRow, 'totalPaid');
      
      if (docPaidIdx !== -1) {
        setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'documentAmountPaid', bDocAmt);
        
        if (regAmtIdx !== -1 && totalPaidIdx !== -1) {
          var regAmt = parseFloat(String(mData[matchedRowIdx][regAmtIdx])) || 0;
          var newTotalPaid = regAmt + bDocAmt;
          setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'totalPaid', newTotalPaid);
        }
      }
      
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'bgvSubmittedAt', submittedAt);
      setByHeader(mSheet, headerRow, matchedRowIdx + 1, 'updatedAt', new Date().toISOString());
      
      if (!alreadyExistsInBgv) {
        logDirectAudit(ss, matchedPlacementId, matchedFullName, 'BGV', 'BGV_SUBMITTED', 'Background Verification Form Submitted', previousBgvStatus, 'SUBMITTED', 'System');
        
        // 6. Handle Document Payment to Payment Records and Ledger
        if (bDocAmt > 0) {
          var pSheet = ensureSheetWithColumns(ss, DP_PAYMENT_SHEET, ['id', 'placementId', 'candidateName', 'paymentType', 'pipelineType', 'amount', 'paymentDate', 'transactionRef', 'notes', 'remarks', 'userStamp', 'timestamp']);
          var syncKey = "BGV_DP_" + matchedPlacementId + "_ROW_" + rawRowIndex;
          
          var pData = pSheet.getDataRange().getValues();
          var pHeaders = pData[0].map(function(h) { return String(h).trim(); });
          var pNotesIdx = findHeaderCol(pHeaders, 'notes');
          var duplicatePaymentFound = false;
          
          if (pData.length > 1) {
            for (var p = 1; p < pData.length; p++) {
              if (String(pData[p][pNotesIdx]).indexOf(syncKey) !== -1) {
                duplicatePaymentFound = true;
                break;
              }
            }
          }
          
          if (!duplicatePaymentFound) {
            var pRow = buildRowByHeaders(pHeaders, {
              'id': 'pay_' + new Date().getTime(),
              'placementId': matchedPlacementId,
              'candidateName': matchedFullName,
              'paymentType': 'Document Fee',
              'pipelineType': 'document',
              'amount': bDocAmt,
              'paymentDate': submittedAt,
              'transactionRef': '',
              'notes': "BGV Form Document Payment. " + syncKey,
              'remarks': "BGV Sync",
              'userStamp': "System",
              'timestamp': new Date().toISOString()
            });
            pSheet.appendRow(pRow);
            
            logDirectAudit(ss, matchedPlacementId, matchedFullName, 'FINANCIAL', 'PAYMENT_ADDED', 'Document Payment Added Rs.' + bDocAmt, '', '', 'System');
            
            upsertDirectFinancialLedger(ss, matchedPlacementId, matchedFullName);
          }
        }
      }
    }
  } catch(err) {
    Logger.log("syncDirectBGV ERROR: " + err.toString());
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
    fatherName: getDPValue_(row, headerMap, 'fatherName'),
    alternateContact: getDPValue_(row, headerMap, 'alternateContact'),
    address: getDPValue_(row, headerMap, 'address'),
    pincode: getDPValue_(row, headerMap, 'pincode'),
    courseName: getDPValue_(row, headerMap, 'courseName'),
    batch: getDPValue_(row, headerMap, 'batch'),
    documentAmount: getDPValue_(row, headerMap, 'documentAmount'),
    bgvSubmittedAt: getDPValue_(row, headerMap, 'bgvSubmittedAt'),
    
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
    var placementId = params.placementId;
    if (!placementId) throw new Error("placementId required");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var auditSheet = ss.getSheetByName(DP_AUDIT_LOGS_SHEET);
    if (!auditSheet) return { success: true, auditLogs: [] };
    
    var data = auditSheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, auditLogs: [] };
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(auditSheet);
    var headers = data[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var pIdIdx = findHeaderCol(headers, 'placementId');
    if (pIdIdx === -1) return { success: true, auditLogs: [] };
    
    var logs = [];
    var headerMap = getDirectPlacementHeaderMap_(auditSheet);
    for (var i = headerRowIdx + 1; i < data.length; i++) {
      if (String(data[i][pIdIdx]).trim() === placementId) {
        logs.push(directPlacementRowToObj_(data[i], headerMap));
      }
    }
    
    logs.sort(function(a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return { success: true, auditLogs: logs };
  } catch (err) {
    Logger.log("getDirectAuditLogs Error: " + err.message);
    return { success: false, error: err.toString() };
  }
}

function logDirectAudit(ss, placementId, candidateName, module, action, description, oldValue, newValue, performedBy) {
  try {
    var sheetCols = ['auditId', 'placementId', 'candidateName', 'module', 'action', 'description', 'oldValue', 'newValue', 'performedBy', 'timestamp'];
    var sheet = ss.getSheetByName(DP_AUDIT_LOGS_SHEET);
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
    var sheet = ss.getSheetByName(DP_ADJUSTMENT_SHEET);
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
    var sheet = ss.getSheetByName(DP_ADJUSTMENT_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(DP_ADJUSTMENT_SHEET);
    }
    var cols = ['adjustmentId', 'placementId', 'candidateName', 'pipelineType', 'adjustmentType', 'amount', 'reason', 'notes', 'createdBy', 'createdAt', 'updatedAt'];
    ensureDirectPlacementColumns_(sheet, cols);
    
    var headerRowIdx = getDirectPlacementHeaderRowIndex_(sheet);
    var headers = sheet.getDataRange().getValues()[headerRowIdx].map(function(h) { return String(h).trim(); });
    
    var adjustmentId = generateDirectAdjustmentId_();
    var now = new Date().toISOString();
    
    var row = buildRowByHeaders(headers, {
      adjustmentId: adjustmentId,
      placementId: placementId,
      candidateName: candidateName,
      pipelineType: pipelineType,
      adjustmentType: adjustmentType,
      amount: amount,
      reason: reason,
      notes: notes,
      createdBy: performedBy,
      createdAt: now,
      updatedAt: now
    });
    
    sheet.appendRow(row);
    
    logDirectAudit(ss, placementId, candidateName, 'FINANCE', 'ADJUSTMENT_ADDED', pipelineType + ' ' + adjustmentType + ' of Rs. ' + amount + ' added', '', adjustmentType + ':' + amount, performedBy);
    
    upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType);
    SpreadsheetApp.flush();
    
    return { success: true, adjustmentId: adjustmentId };
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
    var sheet = ss.getSheetByName(DP_ADJUSTMENT_SHEET);
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
      setByHeader(sheet, headers, targetRow, key, updates[key]);
    }
    
    var oldVal = oldObj.adjustmentType + ':' + oldObj.amount;
    var newVal = (updates.adjustmentType || oldObj.adjustmentType) + ':' + (updates.amount !== undefined ? updates.amount : oldObj.amount);
    
    logDirectAudit(ss, placementId, oldObj.candidateName, 'FINANCE', 'ADJUSTMENT_UPDATED', oldObj.pipelineType + ' Adjustment updated', oldVal, newVal, performedBy);
    
    var newPipelineType = updates.pipelineType || oldObj.pipelineType;
    if (newPipelineType !== oldObj.pipelineType) {
      upsertDirectFinancialLedger(ss, placementId, oldObj.candidateName, oldObj.pipelineType);
    }
    upsertDirectFinancialLedger(ss, placementId, oldObj.candidateName, newPipelineType);
    
    SpreadsheetApp.flush();
    return { success: true, message: 'Adjustment updated' };
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
    var sheet = ss.getSheetByName(DP_ADJUSTMENT_SHEET);
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
    logDirectAudit(ss, placementId, oldObj.candidateName, 'FINANCE', 'ADJUSTMENT_DELETED', oldObj.pipelineType + ' ' + oldObj.adjustmentType + ' of Rs. ' + oldObj.amount + ' deleted', oldVal, '', performedBy);
    
    upsertDirectFinancialLedger(ss, placementId, oldObj.candidateName, oldObj.pipelineType);
    SpreadsheetApp.flush();
    return { success: true, message: 'Adjustment deleted' };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

function upsertDirectFinancialLedger(ss, placementId, candidateName, pipelineType) {
  if (!placementId) return;
  var pSheet = ss.getSheetByName(DP_PAYMENT_SHEET);
  var aSheet = ss.getSheetByName(DP_ADJUSTMENT_SHEET);
  
  var lCols = ['placementId', 'candidateName', 'registrationFee', 'documentFee', 'courseFee', 'placementFee', 'otherCharges', 'discount', 'registrationPaid', 'documentPaid', 'coursePaid', 'placementPaid', 'totalFee', 'paidAmount', 'pendingAmount', 'paymentStatus', 'updatedAt'];
  var lSheet = ss.getSheetByName(DP_FINANCIAL_LEDGER_SHEET);
  if (!lSheet) lSheet = ss.insertSheet(DP_FINANCIAL_LEDGER_SHEET);
  ensureDirectPlacementColumns_(lSheet, lCols);
  
  var totalValidPaid = 0;
  var regPaid = 0, docPaid = 0, coursePaid = 0, placementPaid = 0;
  
  if (pSheet) {
    var pData = pSheet.getDataRange().getValues();
    if (pData.length > 1) {
      var pHeaderRowIdx = getDirectPlacementHeaderRowIndex_(pSheet);
      var pHeaders = pData[pHeaderRowIdx].map(function(h){ return String(h).trim(); });
      var pIdIdx = findHeaderCol(pHeaders, 'placementId');
      var amtIdx = findHeaderCol(pHeaders, 'amount');
      var typeIdx = findHeaderCol(pHeaders, 'paymentType');
      var ptLineIdx = findHeaderCol(pHeaders, 'pipelineType');
      
      for (var i = pHeaderRowIdx + 1; i < pData.length; i++) {
        if (String(pData[i][pIdIdx]).trim() === String(placementId).trim()) {
          var amt = parseFloat(pData[i][amtIdx]) || 0;
          totalValidPaid += amt;
          var pt = '';
          if (ptLineIdx !== -1 && pData[i][ptLineIdx]) {
            pt = String(pData[i][ptLineIdx]).toLowerCase();
          } else {
            pt = String(pData[i][typeIdx]).toLowerCase().replace(/fee/g, '').replace(/[^a-z]/g, '');
          }
          if (pt.indexOf('registration') > -1) regPaid += amt;
          else if (pt.indexOf('document') > -1) docPaid += amt;
          else if (pt.indexOf('course') > -1) coursePaid += amt;
          else if (pt.indexOf('placement') > -1) placementPaid += amt;
        }
      }
    }
  }
  
  var addCharges = 0, discounts = 0, waivers = 0, refunds = 0;
  if (aSheet) {
    var aData = aSheet.getDataRange().getValues();
    if (aData.length > 1) {
      var aHeaderRowIdx = getDirectPlacementHeaderRowIndex_(aSheet);
      var aHeaders = aData[aHeaderRowIdx].map(function(h){ return String(h).trim(); });
      var aIdIdx = findHeaderCol(aHeaders, 'placementId');
      var aTypeIdx = findHeaderCol(aHeaders, 'adjustmentType');
      var aAmtIdx = findHeaderCol(aHeaders, 'amount');
      for (var i = aHeaderRowIdx + 1; i < aData.length; i++) {
        if (String(aData[i][aIdIdx]).trim() === String(placementId).trim()) {
          var amt = parseFloat(aData[i][aAmtIdx]) || 0;
          var type = String(aData[i][aTypeIdx]).toUpperCase().trim();
          if (type === 'ADDITIONAL_CHARGE') addCharges += amt;
          else if (type === 'DISCOUNT') discounts += amt;
          else if (type === 'WAIVER') waivers += amt;
          else if (type === 'REFUND') refunds += amt;
        }
      }
    }
  }
  
  var lData = lSheet.getDataRange().getValues();
  var lHeaderRowIdx = getDirectPlacementHeaderRowIndex_(lSheet);
  var lHeaders = lData[lHeaderRowIdx].map(function(h){ return String(h).trim(); });
  
  var targetRow = -1;
  var regFee = 0, docFee = 0, courseFee = 0, placementFee = 0;
  
  if (lData.length > 1) {
    var lIdIdx = findHeaderCol(lHeaders, 'placementId');
    for (var j = lHeaderRowIdx + 1; j < lData.length; j++) {
      if (String(lData[j][lIdIdx]).trim() === String(placementId).trim()) {
        targetRow = j + 1;
        regFee = parseFloat(lData[j][findHeaderCol(lHeaders, 'registrationFee')]) || 0;
        docFee = parseFloat(lData[j][findHeaderCol(lHeaders, 'documentFee')]) || 0;
        courseFee = parseFloat(lData[j][findHeaderCol(lHeaders, 'courseFee')]) || 0;
        placementFee = parseFloat(lData[j][findHeaderCol(lHeaders, 'placementFee')]) || 0;
        break;
      }
    }
  }
  
  var baseFee = regFee + docFee + courseFee + placementFee;
  var reductions = discounts + waivers;
  var netPayable = Math.max(0, baseFee + addCharges - reductions);
  var paidToDate = Math.max(0, totalValidPaid - refunds);
  var pending = Math.max(0, netPayable - paidToDate);
  var overpaidAmount = Math.max(0, paidToDate - netPayable);
  
  var status = 'Pending';
  if (pending === 0 && netPayable > 0) status = 'Paid';
  else if (pending === 0 && netPayable === 0 && paidToDate > 0) status = 'Paid';
  else if (paidToDate > 0 && pending > 0) status = 'Partial';
  
  var now = new Date().toISOString();
  
  if (targetRow !== -1) {
    setByHeader(lSheet, lHeaders, targetRow, 'otherCharges', addCharges);
    setByHeader(lSheet, lHeaders, targetRow, 'discount', reductions); // using discount field for all reductions
    setByHeader(lSheet, lHeaders, targetRow, 'registrationPaid', regPaid);
    setByHeader(lSheet, lHeaders, targetRow, 'documentPaid', docPaid);
    setByHeader(lSheet, lHeaders, targetRow, 'coursePaid', coursePaid);
    setByHeader(lSheet, lHeaders, targetRow, 'placementPaid', placementPaid);
    setByHeader(lSheet, lHeaders, targetRow, 'totalFee', netPayable);
    setByHeader(lSheet, lHeaders, targetRow, 'paidAmount', paidToDate);
    setByHeader(lSheet, lHeaders, targetRow, 'pendingAmount', pending);
    setByHeader(lSheet, lHeaders, targetRow, 'paymentStatus', status);
    setByHeader(lSheet, lHeaders, targetRow, 'updatedAt', now);
    if (findHeaderCol(lHeaders, 'overpaidAmount') !== -1) {
      setByHeader(lSheet, lHeaders, targetRow, 'overpaidAmount', overpaidAmount);
    } else {
      lHeaders.push('overpaidAmount');
      lSheet.getRange(lHeaderRowIdx + 1, lHeaders.length).setValue('overpaidAmount');
      setByHeader(lSheet, lHeaders, targetRow, 'overpaidAmount', overpaidAmount);
    }
  } else {
    var newRow = buildRowByHeaders(lHeaders, {
      'placementId': placementId,
      'candidateName': candidateName,
      'registrationFee': 0,
      'documentFee': 0,
      'courseFee': 0,
      'placementFee': 0,
      'otherCharges': addCharges,
      'discount': reductions,
      'registrationPaid': regPaid,
      'documentPaid': docPaid,
      'coursePaid': coursePaid,
      'placementPaid': placementPaid,
      'totalFee': netPayable,
      'paidAmount': paidToDate,
      'pendingAmount': pending,
      'paymentStatus': status,
      'updatedAt': now,
      'overpaidAmount': overpaidAmount
    });
    lSheet.appendRow(newRow);
  }
}
