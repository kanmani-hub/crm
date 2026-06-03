/**
 * ============================================================
 * PyCRM — Code.gs (Google Apps Script Backend)
 * ============================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Apps Script project
 * 2. Replace ALL content in Code.gs with this file
 * 3. Deploy → Manage deployments → Edit → Version: "New version" → Deploy
 * 4. Edit → Triggers → Add trigger:
 *    - Function: onFormSubmit
 *    - Event source: From spreadsheet
 *    - Event type: On form submit
 * 5. Copy the new Web App URL and update Settings → gasWebAppUrl
 * 
 * SHEET NAMES (must match exactly):
 * - "PyCRM_New_Joinee"  → Google Form responses land here
 * - "Master_Candidates"  → Canonical candidate list
 */

// ============================================================
// CONFIGURATION
// ============================================================

/** Name of the sheet where Google Form responses arrive */
var FORM_SHEET_NAME = 'PyCRM_New_Joinee';

/** Name of the master candidates sheet */
var MASTER_SHEET_NAME = 'Master_Candidates';

/** Master_Candidates column order (A through R) */
var MASTER_HEADERS = [
  'candidateId',    // A
  'fullName',       // B
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

/**
 * doGet — Handles all GET requests from the frontend.
 * Query params:
 *   ?action=getData           → returns all Master_Candidates rows
 *   ?action=syncNewJoinees    → syncs form responses → master, returns results
 *   ?action=getDashboardMetrics → returns computed KPI summary
 *   (no action)               → returns getData by default
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getData';
    var result;

    switch (action) {
      case 'syncNewJoinees':
        result = syncNewJoinees();
        break;
      case 'getDashboardMetrics':
        result = getDashboardMetrics();
        break;
      case 'getData':
      default:
        // Sync first, then return fresh data
        var syncResult = syncNewJoinees();
        var candidates = getAllCandidates();
        result = {
          success: true,
          candidates: candidates,
          sync: syncResult,
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

/**
 * doPost — Handles POST requests (form dispatch / email sending).
 * Preserves existing email dispatch functionality.
 */
function doPost(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || '';

    // --- If action=syncNewJoinees, run sync via POST ---
    if (action === 'syncNewJoinees') {
      var syncResult = syncNewJoinees();
      return ContentService
        .createTextOutput(JSON.stringify(syncResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- Email dispatch (existing functionality) ---
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

      var mailOptions = {
        to: to,
        subject: subject,
        htmlBody: htmlBody
      };
      if (cc) mailOptions.cc = cc;

      MailApp.sendEmail(mailOptions);

      return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: 'Email sent to ' + to }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Missing required parameters (to, formLink)' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * onFormSubmit — Installable trigger that runs when a Google Form is submitted.
 * Automatically syncs new responses to Master_Candidates.
 */
function onFormSubmit(e) {
  try {
    Utilities.sleep(2000); // Wait for the form response row to fully write
    syncNewJoinees();
    Logger.log('onFormSubmit: Sync completed successfully');
  } catch (err) {
    Logger.log('onFormSubmit error: ' + err.toString());
  }
}


// ============================================================
// CORE SYNC LOGIC
// ============================================================

/**
 * syncNewJoinees — Reads PyCRM_New_Joinee, deduplicates, and appends
 * new candidates to Master_Candidates.
 * 
 * Returns { success, synced, skipped, total, newCandidates[] }
 */
function syncNewJoinees() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formSheet = ss.getSheetByName(FORM_SHEET_NAME);
  var masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);

  if (!formSheet) {
    return { success: false, error: 'Sheet "' + FORM_SHEET_NAME + '" not found', synced: 0, skipped: 0, total: 0 };
  }
  if (!masterSheet) {
    return { success: false, error: 'Sheet "' + MASTER_SHEET_NAME + '" not found', synced: 0, skipped: 0, total: 0 };
  }

  // --- Read form responses ---
  var formData = formSheet.getDataRange().getValues();
  if (formData.length < 2) {
    return { success: true, synced: 0, skipped: 0, total: 0, message: 'No form responses found' };
  }

  var formHeaders = formData[0].map(function(h) { return String(h).trim(); });
  var formRows = formData.slice(1);

  // --- Read existing master data for duplicate check ---
  var masterData = masterSheet.getDataRange().getValues();
  var masterHeaders = masterData[0] || MASTER_HEADERS;

  // Build lookup sets for duplicate checking (email + phone)
  var existingEmails = {};
  var existingPhones = {};
  var emailCol = indexOfHeader(masterHeaders, ['email', 'e-mail', 'mail']);
  var phoneCol = indexOfHeader(masterHeaders, ['phone', 'mob', 'mobile', 'contact']);

  for (var i = 1; i < masterData.length; i++) {
    var row = masterData[i];
    // Skip completely empty rows
    if (isRowEmpty(row)) continue;

    if (emailCol >= 0 && row[emailCol]) {
      existingEmails[normalizeValue(row[emailCol])] = true;
    }
    if (phoneCol >= 0 && row[phoneCol]) {
      existingPhones[normalizePhone(row[phoneCol])] = true;
    }
  }

  // --- Map form columns using flexible matching ---
  var colMap = mapFormColumns(formHeaders);

  // --- Process each form row ---
  var synced = 0;
  var skipped = 0;
  var newCandidates = [];
  var now = new Date().toISOString();

  for (var r = 0; r < formRows.length; r++) {
    var fRow = formRows[r];

    // Skip empty rows (timestamp is empty = not a real submission)
    if (colMap.timestamp >= 0 && !fRow[colMap.timestamp]) continue;
    // Also skip if first column (usually Timestamp) is empty
    if (!fRow[0] && !fRow[1]) continue;

    // Extract values with flexible column mapping
    var fullName = getVal(fRow, colMap.fullName);
    var email    = getVal(fRow, colMap.email);
    var phone    = getVal(fRow, colMap.phone);
    var course   = getVal(fRow, colMap.course);
    var branch   = getVal(fRow, colMap.branch);
    var dob      = getVal(fRow, colMap.dob);
    var address  = getVal(fRow, colMap.address);

    // Must have at least a name to proceed
    if (!fullName) {
      skipped++;
      continue;
    }

    // --- Duplicate check ---
    var isDuplicate = false;

    if (email) {
      var normEmail = normalizeValue(email);
      if (existingEmails[normEmail]) {
        isDuplicate = true;
      }
    }

    if (!isDuplicate && phone) {
      var normPhone = normalizePhone(phone);
      if (normPhone.length >= 10 && existingPhones[normPhone]) {
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      skipped++;
      continue;
    }

    // --- Generate candidate ID ---
    var candidateId = 'c_' + Date.now() + '_' + r;

    // --- Build Master_Candidates row ---
    var newRow = [
      candidateId,                           // A: candidateId
      fullName,                              // B: fullName
      email || '',                           // C: email
      phone || '',                           // D: phone
      'Batch 1',                             // E: batchName (default)
      formatDate(dob),                       // F: dateOfBirth
      address || '',                         // G: address
      branch || 'Online',                    // H: branch (default)
      course || 'Python Core',              // I: course (default)
      now.split('T')[0],                     // J: dateOfJoining (today)
      'active',                              // K: currentStatus
      'pending',                             // L: bgvStatus
      'FALSE',                               // M: placed
      '',                                    // N: placedCompany
      'form-pending',                        // O: trackedStatus
      now,                                   // P: trackedAt
      now,                                   // Q: createdAt
      now                                    // R: updatedAt
    ];

    masterSheet.appendRow(newRow);

    // Track for duplicate prevention within this batch
    if (email) existingEmails[normalizeValue(email)] = true;
    if (phone) existingPhones[normalizePhone(phone)] = true;

    newCandidates.push({
      candidateId: candidateId,
      fullName: fullName,
      email: email || '',
      phone: phone || ''
    });

    synced++;
  }

  return {
    success: true,
    synced: synced,
    skipped: skipped,
    total: formRows.length,
    newCandidates: newCandidates,
    timestamp: now
  };
}


// ============================================================
// DATA RETRIEVAL
// ============================================================

/**
 * getAllCandidates — Returns all non-empty rows from Master_Candidates as objects.
 */
function getAllCandidates() {
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
      // Convert Date objects to strings
      if (val instanceof Date) {
        obj[key] = val.toISOString();
      } else {
        obj[key] = val !== undefined && val !== null ? String(val) : '';
      }
    }

    // Only include rows that have at least a candidateId or fullName
    if (obj.candidateId || obj.fullName) {
      candidates.push(obj);
    }
  }

  return candidates;
}

/**
 * getDashboardMetrics — Computes summary metrics from Master_Candidates.
 */
function getDashboardMetrics() {
  var candidates = getAllCandidates();
  var totalCandidates = candidates.length;
  var placedCount = 0;
  var activeCount = 0;
  var pendingBGV = 0;
  var clearedBGV = 0;

  var branchCounts = {};
  var courseCounts = {};

  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];

    if (String(c.placed).toUpperCase() === 'TRUE') placedCount++;
    if (c.currentStatus === 'active') activeCount++;
    if (c.bgvStatus === 'pending') pendingBGV++;
    if (c.bgvStatus === 'cleared') clearedBGV++;

    var branch = c.branch || 'Unknown';
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;

    var course = c.course || 'Unknown';
    courseCounts[course] = (courseCounts[course] || 0) + 1;
  }

  return {
    success: true,
    totalCandidates: totalCandidates,
    placedCount: placedCount,
    activeCount: activeCount,
    inTraining: totalCandidates - placedCount,
    pendingBGV: pendingBGV,
    clearedBGV: clearedBGV,
    branchCounts: branchCounts,
    courseCounts: courseCounts,
    placementRate: totalCandidates > 0 ? Math.round((placedCount / totalCandidates) * 100) : 0,
    timestamp: new Date().toISOString()
  };
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * mapFormColumns — Flexibly maps PyCRM_New_Joinee column headers
 * to our expected field names. Handles variations like:
 *   "NAME", "Full Name", "Candidate Name" → fullName
 *   "MOB NO.", "Phone", "Mobile" → phone
 *   etc.
 * 
 * Returns an object with field→columnIndex mappings.
 */
function mapFormColumns(headers) {
  var lowerHeaders = headers.map(function(h) { return String(h).toLowerCase().trim(); });

  return {
    timestamp: findCol(lowerHeaders, ['timestamp', 'time', 'date', 'submitted']),
    fullName:  findCol(lowerHeaders, ['name', 'full name', 'fullname', 'candidate name', 'student name']),
    email:     findCol(lowerHeaders, ['email', 'e-mail', 'email id', 'mail', 'email address']),
    phone:     findCol(lowerHeaders, ['mob no', 'mob no.', 'mobile', 'phone', 'contact', 'contact no', 'contact number', 'mobile no', 'mobile number', 'phone number', 'mob']),
    course:    findCol(lowerHeaders, ['course', 'program', 'course name', 'interested course']),
    branch:    findCol(lowerHeaders, ['branch', 'center', 'location', 'branch name', 'preferred branch']),
    dob:       findCol(lowerHeaders, ['dob', 'date of birth', 'birth date', 'birthday', 'd.o.b']),
    address:   findCol(lowerHeaders, ['address', 'city', 'location', 'residential address', 'current address'])
  };
}

/**
 * findCol — Finds the first column index matching any of the given patterns.
 * Uses substring matching for flexibility.
 */
function findCol(lowerHeaders, patterns) {
  // Exact match first
  for (var p = 0; p < patterns.length; p++) {
    for (var h = 0; h < lowerHeaders.length; h++) {
      if (lowerHeaders[h] === patterns[p]) return h;
    }
  }
  // Substring match as fallback
  for (var p2 = 0; p2 < patterns.length; p2++) {
    for (var h2 = 0; h2 < lowerHeaders.length; h2++) {
      if (lowerHeaders[h2].indexOf(patterns[p2]) >= 0) return h2;
    }
  }
  return -1;
}

/**
 * indexOfHeader — Find column index in master headers for a field.
 */
function indexOfHeader(headers, patterns) {
  var lower = headers.map(function(h) { return String(h).toLowerCase().trim(); });
  return findCol(lower, patterns);
}

/** Get value from row at mapped column index, return '' if not found */
function getVal(row, colIndex) {
  if (colIndex < 0 || colIndex >= row.length) return '';
  var val = row[colIndex];
  if (val === undefined || val === null) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val).trim();
}

/** Normalize a string value for comparison (lowercase, trimmed) */
function normalizeValue(val) {
  return String(val).toLowerCase().trim();
}

/** Normalize phone: strip all non-digit chars, take last 10 digits */
function normalizePhone(val) {
  var digits = String(val).replace(/\D/g, '');
  if (digits.length > 10) {
    digits = digits.slice(-10); // Take last 10 digits (remove country code)
  }
  return digits;
}

/** Format a date value to YYYY-MM-DD string */
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val).trim();
}

/** Check if an entire row is empty */
function isRowEmpty(row) {
  for (var i = 0; i < row.length; i++) {
    if (row[i] !== '' && row[i] !== null && row[i] !== undefined) return false;
  }
  return true;
}
