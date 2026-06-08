/**
 * ============================================================
 * PyCRM — Code.gs (Google Apps Script Backend)
 * ============================================================
 * 
 * SHEET NAMES (must match exactly):
 * - "Registration_Responses"  → Google Form responses land here
 * - "Master_Candidates"  → Canonical candidate list
 * - "Financial_Ledger" → Financial tracking
 */

var FORM_SOURCE_SHEET = 'Form responses 1';
var REGISTRATION_SHEET = 'Registration_Responses';
var MASTER_SHEET_NAME = 'Master_Candidates';

var MASTER_HEADERS = [
  'candidateId',    // A
  'FullName',       // B
  'email',          // C
  'phone',          // D
  'batchName',      // E
  'dateOfBirth',    // F
  'address',        // G
  'branch',         // H
  'course',         // I
  'dateOfJoining',  // J
  'currentStatus',  // K
  'bgvStatus',      // L
  'placed',         // M
  'placedCompany',  // N
  'trackedStatus',  // O
  'trackedAt',      // P
  'createdAt',      // Q
  'updatedAt'       // R
];

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
          timestamp: new Date().toISOString()
        };
        break;
      case 'getDashboardMetrics':
        var metricsObj = getDashboardMetrics();
        metricsObj.success = true;
        result = metricsObj;
        break;
      case 'syncMasterCandidates':
        result = syncMasterCandidates();
        break;
      default:
        result = {
          success: true,
          candidates: getCandidates(),
          metrics: getDashboardMetrics(),
          timestamp: new Date().toISOString()
        };
        break;
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || '';

    if (action === 'syncMasterCandidates') {
      var syncResult = syncMasterCandidates();
      return ContentService
        .createTextOutput(JSON.stringify(syncResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var to = params.to || '';
    var cc = params.cc || '';
    var formType = params.formType || 'Registration';
    var formLink = params.formLink || '';

    if (to && formLink) {
      var subject = formType === 'BGV'
        ? 'PyCRM: Background Verification Form'
        : 'PyCRM: New Candidate Registration Form';

      var htmlBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">'
        + '<h2 style="color:#B85C3D;margin-bottom:16px;">PyCRM — ' + formType + ' Form</h2>'
        + '<p style="color:#333;font-size:15px;line-height:1.6;">Hello,</p>'
        + '<p style="color:#333;font-size:15px;line-height:1.6;">Please fill out the following form at your earliest convenience:</p>'
        + '<p style="margin:24px 0;"><a href="' + formLink + '" '
        + 'style="display:inline-block;background:#B85C3D;color:#fff;padding:12px 32px;'
        + 'text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;">Open ' + formType + ' Form</a></p>'
        + '<p style="color:#888;font-size:12px;margin-top:32px;">— PyCRM Command Center</p>'
        + '</div>';

      var mailOptions = { to: to, subject: subject, htmlBody: htmlBody };
      if (cc) mailOptions.cc = cc;

      MailApp.sendEmail(mailOptions);

      return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: 'Email sent to ' + to }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Missing required parameters' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// FORM SUBMIT HANDLER
// ============================================================
function getFormValue(namedValues, possibleKeys) {
  for (var key in namedValues) {
    var normalized = key.toLowerCase().replace(/\s+/g, '');
    for (var i = 0; i < possibleKeys.length; i++) {
      if (normalized === possibleKeys[i].toLowerCase().replace(/\s+/g, '')) {
        return namedValues[key][0];
      }
    }
  }
  return '';
}

function onFormSubmit(e) {
  try {
    var namedValues = (e && e.namedValues) ? e.namedValues : {};
    
    var fullName = getFormValue(namedValues, ['FullName', 'FULLNAME', 'Full Name', 'fullname']);
    var email    = getFormValue(namedValues, ['EMAIL']);
    var phone    = getFormValue(namedValues, ['MOB NO']);
    var mode     = getFormValue(namedValues, ['MODE']);
    var branch   = getFormValue(namedValues, ['BRANCH']);
    var course   = getFormValue(namedValues, ['DOMAIN']);
    var dob      = getFormValue(namedValues, ['DOB']);
    var address  = getFormValue(namedValues, ['ADDRESS']);
    var remarks  = getFormValue(namedValues, ['REMARKS']);
    var submittedAt = getFormValue(namedValues, ['Timestamp']) || new Date().toISOString();

    Logger.log("[SYNC] Form submission received");
    Logger.log("=== FORM DATA ===");
    Logger.log(JSON.stringify(namedValues));
    Logger.log("FullName=" + fullName);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName(REGISTRATION_SHEET);
    if (!regSheet) return;

    var submissionId = 'sub_' + Date.now() + '_' + Math.floor(Math.random()*1000);
    var syncStatus = 'pending';

    var regData = regSheet.getDataRange().getValues();
    if (regData.length < 1) return;
    var regHeaders = regData[0].map(function(h) { return String(h).trim(); });

    var mappedRow = new Array(regHeaders.length);
    for (var i = 0; i < mappedRow.length; i++) {
      var header = regHeaders[i];
      switch (header) {
        case 'submissionId': mappedRow[i] = submissionId; break;
        case 'FullName': mappedRow[i] = fullName; break;
        case 'fullName': mappedRow[i] = fullName; break;
        case 'email': mappedRow[i] = email; break;
        case 'tokenEmail': mappedRow[i] = email; break;
        case 'phone': mappedRow[i] = phone; break;
        case 'dob': mappedRow[i] = dob; break;
        case 'address': mappedRow[i] = address; break;
        case 'course': mappedRow[i] = course; break;
        case 'branch': mappedRow[i] = branch; break;
        case 'submittedAt': mappedRow[i] = submittedAt; break;
        case 'syncStatus': mappedRow[i] = syncStatus; break;
        case 'candidateId': mappedRow[i] = ''; break;
        case 'batchName': mappedRow[i] = mode; break;
        case 'remarks': mappedRow[i] = remarks; break;
        default: mappedRow[i] = ''; break;
      }
    }

    regSheet.appendRow(mappedRow);
    Logger.log("[SYNC] Registration_Responses updated");
    
    // Force immediate synchronization
    SpreadsheetApp.flush();
    syncMasterCandidates();
    Logger.log("[SYNC] Dashboard refreshed");

  } catch (err) {
    Logger.log("onFormSubmit error: " + err.toString());
  }
}

// ============================================================
// CORE SYNC LOGIC
// ============================================================

function syncMasterCandidates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regSheet = ss.getSheetByName(REGISTRATION_SHEET);
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);

  if (!regSheet || !masterSheet) {
    return { success: false, error: 'Required sheets not found', synced: 0, skipped: 0, total: 0 };
  }

  var regData = regSheet.getDataRange().getValues();
  if (regData.length < 2) {
    return { success: true, synced: 0, skipped: 0, total: 0, message: 'No form responses found' };
  }

  var regHeaders = regData[0].map(function(h) { return String(h).trim(); });
  
  var idxEmail = indexOfHeader(regHeaders, ['email', 'tokenemail']);
  var idxPhone = indexOfHeader(regHeaders, ['phone', 'mob no']);
  var idxFullName = indexOfHeader(regHeaders, ['fullname']);
  var idxDob = indexOfHeader(regHeaders, ['dob', 'dateofbirth']);
  var idxAddress = indexOfHeader(regHeaders, ['address']);
  var idxCourse = indexOfHeader(regHeaders, ['course', 'domain']);
  var idxBranch = indexOfHeader(regHeaders, ['branch']);
  var idxStatus = indexOfHeader(regHeaders, ['syncstatus']);
  var idxCandId = indexOfHeader(regHeaders, ['candidateid']);
  var idxBatch = indexOfHeader(regHeaders, ['batchname', 'mode']);
  var idxRemarks = indexOfHeader(regHeaders, ['remarks']);

  var masterData = masterSheet.getDataRange().getValues();
  var masterHeaders = masterData[0] || MASTER_HEADERS;

  var existingEmails = {};
  var existingPhones = {};
  var mEmailCol = indexOfHeader(masterHeaders, ['email', 'e-mail', 'mail']);
  var mPhoneCol = indexOfHeader(masterHeaders, ['phone', 'mob', 'mobile', 'contact']);

  for (var i = 1; i < masterData.length; i++) {
    var row = masterData[i];
    if (isRowEmpty(row)) continue;

    if (mEmailCol >= 0 && row[mEmailCol]) {
      existingEmails[normalizeValue(row[mEmailCol])] = i + 1;
    }
    if (mPhoneCol >= 0 && row[mPhoneCol]) {
      existingPhones[normalizePhone(row[mPhoneCol])] = i + 1;
    }
  }

  var synced = 0;
  var skipped = 0;
  var newCandidates = [];
  var now = new Date().toISOString();

  for (var r = 1; r < regData.length; r++) {
    var row = regData[r];
    
    var status = idxStatus >= 0 ? row[idxStatus] : '';
    if (status === 'imported' || status === 'synced') {
      continue;
    }

    var fullName = getVal(row, idxFullName);
    var email    = getVal(row, idxEmail);
    var phone    = getVal(row, idxPhone);

    var targetMasterRow = -1;
    if (email) {
      var normEmail = normalizeValue(email);
      if (existingEmails[normEmail]) targetMasterRow = existingEmails[normEmail];
    }
    if (targetMasterRow === -1 && phone) {
      var normPhone = normalizePhone(phone);
      if (normPhone.length >= 10 && existingPhones[normPhone]) targetMasterRow = existingPhones[normPhone];
    }

    if (targetMasterRow !== -1) {
      var mFullNameCol = indexOfHeader(masterHeaders, ['fullname']);
      var mDobCol = indexOfHeader(masterHeaders, ['dob', 'dateofbirth']);
      var mAddressCol = indexOfHeader(masterHeaders, ['address']);
      var mBranchCol = indexOfHeader(masterHeaders, ['branch']);
      var mCourseCol = indexOfHeader(masterHeaders, ['course', 'domain']);
      var mBatchCol = indexOfHeader(masterHeaders, ['batchname', 'mode']);
      var mUpdatedAtCol = indexOfHeader(masterHeaders, ['updatedat']);
      
      if (mFullNameCol >= 0 && fullName) masterSheet.getRange(targetMasterRow, mFullNameCol + 1).setValue(fullName);
      if (mEmailCol >= 0 && email) masterSheet.getRange(targetMasterRow, mEmailCol + 1).setValue(email);
      if (mPhoneCol >= 0 && phone) masterSheet.getRange(targetMasterRow, mPhoneCol + 1).setValue(phone);
      if (mDobCol >= 0 && getVal(row, idxDob)) masterSheet.getRange(targetMasterRow, mDobCol + 1).setValue(formatDate(getVal(row, idxDob)));
      if (mAddressCol >= 0 && getVal(row, idxAddress)) masterSheet.getRange(targetMasterRow, mAddressCol + 1).setValue(getVal(row, idxAddress));
      if (mBranchCol >= 0 && getVal(row, idxBranch)) masterSheet.getRange(targetMasterRow, mBranchCol + 1).setValue(getVal(row, idxBranch));
      if (mCourseCol >= 0 && getVal(row, idxCourse)) masterSheet.getRange(targetMasterRow, mCourseCol + 1).setValue(getVal(row, idxCourse));
      if (mBatchCol >= 0 && getVal(row, idxBatch)) masterSheet.getRange(targetMasterRow, mBatchCol + 1).setValue(getVal(row, idxBatch));
      if (mUpdatedAtCol >= 0) masterSheet.getRange(targetMasterRow, mUpdatedAtCol + 1).setValue(now);
      
      if (idxStatus >= 0) regSheet.getRange(r + 1, idxStatus + 1).setValue('imported');
      Logger.log("[SYNC] Master_Candidates updated (duplicate merged)");
      synced++;
      continue;
    }

    // Auto-generate candidateId if it doesn't exist
    var candidateId = row[idxCandId] || ('c_' + Date.now() + '_' + r);

    if (idxStatus >= 0) regSheet.getRange(r + 1, idxStatus + 1).setValue('imported');
    if (idxCandId >= 0) regSheet.getRange(r + 1, idxCandId + 1).setValue(candidateId);

    var newMasterRow = new Array(masterHeaders.length);
    for (var i = 0; i < newMasterRow.length; i++) {
      var header = String(masterHeaders[i]).trim();
      switch (header) {
        case 'candidateId': newMasterRow[i] = candidateId; break;
        case 'FullName': newMasterRow[i] = fullName; break;
        case 'email': newMasterRow[i] = email; break;
        case 'phone': newMasterRow[i] = phone; break;
        case 'batchName': newMasterRow[i] = getVal(row, idxBatch); break;
        case 'dateOfBirth': newMasterRow[i] = formatDate(getVal(row, idxDob)); break;
        case 'address': newMasterRow[i] = getVal(row, idxAddress); break;
        case 'branch': newMasterRow[i] = getVal(row, idxBranch); break;
        case 'course': newMasterRow[i] = getVal(row, idxCourse); break;
        case 'dateOfJoining': newMasterRow[i] = now.split('T')[0]; break;
        case 'currentStatus': newMasterRow[i] = 'active'; break;
        case 'bgvStatus': newMasterRow[i] = 'pending'; break;
        case 'placed': newMasterRow[i] = 'FALSE'; break;
        case 'placedCompany': newMasterRow[i] = ''; break;
        case 'trackedStatus': newMasterRow[i] = 'form-pending'; break;
        case 'trackedAt': newMasterRow[i] = now; break;
        case 'createdAt': newMasterRow[i] = now; break;
        case 'updatedAt': newMasterRow[i] = now; break;
        default: newMasterRow[i] = ''; break;
      }
    }

    masterSheet.appendRow(newMasterRow);
    Logger.log("[SYNC] Master_Candidates updated");

    if (email) existingEmails[normalizeValue(email)] = masterSheet.getLastRow();
    if (phone) existingPhones[normalizePhone(phone)] = masterSheet.getLastRow();

    newCandidates.push({
      candidateId: candidateId,
      fullName: fullName,
      email: email,
      phone: phone
    });

    synced++;
  }

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
// DATA RETRIEVAL (UNCHANGED)
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
    var row = data[i];
    if (isRowEmpty(row)) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      if (val instanceof Date) {
        obj[key] = val.toISOString();
      } else {
        obj[key] = val !== undefined && val !== null ? String(val) : '';
      }
    }

    if (obj.candidateId || obj.fullName) {
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
  
  for (var i = 0; i < candidates.length; i++) {
    if (String(candidates[i].placed).toUpperCase() === 'TRUE') placedCount++;
  }

  var revenue = 0;
  var pendingDues = 0;
  
  var finSheet = ss.getSheetByName('Financial_Ledger');
  if (finSheet) {
    var finData = finSheet.getDataRange().getValues();
    if (finData.length > 1) {
      var finHeaders = finData[0].map(function(h) { return String(h).trim(); });
      var paidCol = indexOfHeader(finHeaders, ['paidToDate', 'paid']);
      var netCol = indexOfHeader(finHeaders, ['netPayable', 'net', 'baseFee']);
      
      for (var r = 1; r < finData.length; r++) {
        var row = finData[r];
        if (isRowEmpty(row)) continue;
        var paid = parseFloat(row[paidCol]) || 0;
        var net = parseFloat(row[netCol]) || 0;
        
        revenue += paid;
        pendingDues += Math.max(0, net - paid);
      }
    }
  }

  return {
    success: true,
    totalCandidates: totalCandidates,
    placedCount: placedCount,
    revenue: revenue,
    pendingDues: pendingDues,
    timestamp: new Date().toISOString()
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getMappedValue(data, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = String(keys[i]).trim().toLowerCase();
    for (var dKey in data) {
      if (String(dKey).trim().toLowerCase() === k) {
        var val = data[dKey];
        var strVal = Array.isArray(val) ? val[0] : val;
        return String(strVal || '').trim();
      }
    }
  }
  return '';
}

function indexOfHeader(headers, patterns) {
  var lower = headers.map(function(h) { return String(h).toLowerCase().trim(); });
  for (var p = 0; p < patterns.length; p++) {
    for (var h = 0; h < lower.length; h++) {
      if (lower[h] === patterns[p]) return h;
    }
  }
  for (var p2 = 0; p2 < patterns.length; p2++) {
    for (var h2 = 0; h2 < lower.length; h2++) {
      if (lower[h2].indexOf(patterns[p2]) >= 0) return h2;
    }
  }
  return -1;
}

function getVal(row, colIndex) {
  if (colIndex < 0 || colIndex >= row.length) return '';
  var val = row[colIndex];
  if (val === undefined || val === null) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val).trim();
}

function normalizeValue(val) {
  return String(val).toLowerCase().trim();
}

function normalizePhone(val) {
  var digits = String(val).replace(/\D/g, '');
  if (digits.length > 10) {
    digits = digits.slice(-10); 
  }
  return digits;
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).trim();
}

function isRowEmpty(row) {
  for (var i = 0; i < row.length; i++) {
    if (row[i] !== '' && row[i] !== null && row[i] !== undefined) return false;
  }
  return true;
}
