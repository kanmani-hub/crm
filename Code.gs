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

// ============================================================
// ENTRY POINTS
// ============================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
    var result;

    switch (action) {
      case 'getCandidates':
        result = { success: true, candidates: getCandidates(), timestamp: new Date().toISOString() };
        break;
      case 'getDashboardMetrics':
        result = getDashboardMetrics();
        result.success = true;
        break;
      case 'syncMasterCandidates':
        result = syncMasterCandidates();
        break;
      default:
        result = { success: true, candidates: getCandidates(), metrics: getDashboardMetrics(), timestamp: new Date().toISOString() };
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

        for (var r = 1; r < data.length; r++) {
          var rowObj = rowToObj(headers, data[r]);
          if (rowObj['candidateId'] === candidateId) {
            targetRowIndex = r + 1;
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
          if (key.toLowerCase() === 'dob' || key.toLowerCase() === 'dateofbirth') headerName = 'dateOfBirth';
          
          setByHeader(masterSheet, headers, targetRowIndex, headerName, updates[key]);
        }
        
        setByHeader(masterSheet, headers, targetRowIndex, 'updatedAt', now);
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Candidate updated' })).setMimeType(ContentService.MimeType.JSON);
      } catch (innerErr) {
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

    // Use findValue for ALL fields - handles any key variation
    var fullName    = findValue(namedValues, "FullName");
    var email       = findValue(namedValues, "EMAIL");
    var phone       = findValue(namedValues, "MOBNO");
    var dob         = findValue(namedValues, "DOB");
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
    Logger.log("syncMasterCandidates completed");

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
    var phone    = String(rowObj['phone'] || '').trim();
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
      if (phone) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'phone', phone);
      if (dob) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'dateOfBirth', dob);
      if (addr) setByHeader(masterSheet, masterHeaders, targetMasterRow, 'address', addr);
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
      'dateOfBirth': dob,
      'address': addr,
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

  for (var i = 0; i < candidates.length; i++) {
    if (String(candidates[i]['placed'] || '').toUpperCase() === 'TRUE') placedCount++;
  }

  var revenue = 0;
  var pendingDues = 0;

  var finSheet = ss.getSheetByName('Financial_Ledger');
  if (finSheet) {
    var finData = finSheet.getDataRange().getValues();
    if (finData.length > 1) {
      var finHeaders = finData[0].map(function(h) { return String(h).trim(); });
      for (var r = 1; r < finData.length; r++) {
        var fObj = rowToObj(finHeaders, finData[r]);
        if (isObjEmpty(fObj)) continue;
        var paid = parseFloat(fObj['paidToDate'] || fObj['paid'] || 0) || 0;
        var net = parseFloat(fObj['netPayable'] || fObj['baseFee'] || 0) || 0;
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
// DYNAMIC HELPER FUNCTIONS (NO HARDCODED INDEXES)
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
// ONE-OFF DATA RECOVERY
// ============================================================

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
