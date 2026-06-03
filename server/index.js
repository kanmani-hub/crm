const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, '..', 'sheets', 'pycrm_database.xlsx');

// Helper to safely read workbook
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('Database Excel file not found. Run generate_excel.js first.');
  }
  return xlsx.readFile(DB_PATH);
}

// ----------------------------------------------------
// READ ALL DATA
// ----------------------------------------------------
app.get('/api/data', (req, res) => {
  try {
    const workbook = readDB();
    const data = {};
    
    // Convert all sheets to JSON
    workbook.SheetNames.forEach(sheetName => {
      data[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error reading database:', error);
    res.status(500).json({ error: 'Failed to fetch data from Excel database' });
  }
});

// Helpers for relational excel updates
function getHeaders(sheet) {
  const headers = [];
  const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = xlsx.utils.encode_cell({ r: 0, c: col });
    const cell = sheet[cellAddress];
    if (cell && cell.v !== undefined) {
      headers.push(String(cell.v).trim());
    }
  }
  return headers;
}

function getActualSheetName(sheetName, workbook) {
  const cleanName = sheetName.replace(/^Tab\d+_\s*/, '');
  if (workbook.Sheets[cleanName]) {
    return cleanName;
  }
  const match = workbook.SheetNames.find(n => n.toLowerCase() === cleanName.toLowerCase());
  return match || cleanName;
}

function mapRowData(sheet, values) {
  const headers = getHeaders(sheet);
  const rowObj = {};
  if (Array.isArray(values)) {
    headers.forEach((h, index) => {
      rowObj[h] = values[index] !== undefined ? values[index] : '';
    });
  } else if (values && typeof values === 'object') {
    headers.forEach(h => {
      rowObj[h] = values[h] !== undefined ? values[h] : '';
    });
  }
  return rowObj;
}

function appendRowToSheet(workbook, sheetName, rowObject) {
  const sheet = workbook.Sheets[sheetName];
  const headers = getHeaders(sheet);
  const rows = xlsx.utils.sheet_to_json(sheet);
  rows.push(rowObject);
  workbook.Sheets[sheetName] = xlsx.utils.json_to_sheet(rows, { header: headers });
}

// ----------------------------------------------------
// APPEND ROW (Generic & Process Registration/BGV Form Pipelines)
// ----------------------------------------------------
app.post('/api/append', (req, res) => {
  const { sheetName: inputSheetName, values } = req.body;
  try {
    const workbook = readDB();
    const sheetName = getActualSheetName(inputSheetName, workbook);
    
    if (!workbook.Sheets[sheetName]) {
      return res.status(404).json({ error: `Sheet ${sheetName} not found` });
    }

    const rowObject = mapRowData(workbook.Sheets[sheetName], values);
    
    // Save original row to target sheet
    appendRowToSheet(workbook, sheetName, rowObject);
    
    // ----------------------------------------------------
    // PIPELINE: Registration Responses (Ingest Candidate & Track)
    // ----------------------------------------------------
    if (sheetName === 'Registration_Responses') {
      console.log('Processing Registration Response Submission...');
      const candidateId = `c_${Date.now()}`;
      
      // Update registration row to complete status
      let regRows = xlsx.utils.sheet_to_json(workbook.Sheets['Registration_Responses']);
      const lastRegIndex = regRows.length - 1;
      if (lastRegIndex >= 0) {
        regRows[lastRegIndex].syncStatus = 'TRUE';
        regRows[lastRegIndex].candidateId = candidateId;
        workbook.Sheets['Registration_Responses'] = xlsx.utils.json_to_sheet(regRows, { header: getHeaders(workbook.Sheets['Registration_Responses']) });
      }

      // 1. Create candidate in Master_Candidates
      const nowString = new Date().toISOString();
      const candidateRow = {
        candidateId: candidateId,
        fullName: rowObject.fullName || '',
        email: rowObject.email || '',
        phone: rowObject.phone || '',
        batchName: 'Batch 1',
        dateOfBirth: rowObject.dob || '',
        address: rowObject.address || '',
        branch: rowObject.branch || 'Online',
        course: rowObject.course || 'Python Core',
        dateOfJoining: nowString.split('T')[0],
        currentStatus: 'active',
        bgvStatus: 'pending',
        placed: 'FALSE',
        placedCompany: '',
        trackedStatus: 'form-pending',
        trackedAt: nowString,
        createdAt: nowString,
        updatedAt: nowString
      };
      appendRowToSheet(workbook, 'Master_Candidates', candidateRow);

      // 2. Initialize documents checklist in Candidate_Documents
      const docKeys = [
        { key: 'offerLetter', label: 'Offer Letter' },
        { key: 'appraisals', label: 'Appraisals' },
        { key: 'payslips', label: 'Payslips' },
        { key: 'relievingLetter', label: 'Relieving Letter' },
        { key: 'counterOffer', label: 'Counter Offer' }
      ];
      docKeys.forEach(doc => {
        const docRow = {
          candidateId: candidateId,
          documentKey: doc.key,
          documentLabel: doc.label,
          received: 'FALSE',
          applied: 'FALSE',
          updatedAt: nowString
        };
        appendRowToSheet(workbook, 'Candidate_Documents', docRow);
      });

      // 3. Initialize financials in Financial_Ledger
      const financials = [
        { type: 'registration', label: 'Registration Fee', base: 0 },
        { type: 'course', label: 'Course Fee', base: 30000 },
        { type: 'document', label: 'Document Fee', base: 25000 },
        { type: 'placement', label: 'Placement Payment', base: 100000 }
      ];
      financials.forEach(f => {
        const finRow = {
          candidateId: candidateId,
          pipelineType: f.type,
          pipelineLabel: f.label,
          baseFee: f.base,
          totalAdjustments: 0,
          paidToDate: 0,
          netPayable: f.base,
          pendingDues: f.base,
          updatedAt: nowString
        };
        appendRowToSheet(workbook, 'Financial_Ledger', finRow);
      });

      // 4. Register candidate in Tracked_Candidates list
      const trackedRow = {
        candidateId: candidateId,
        status: 'form-pending',
        payloadType: 'new-registration',
        email: rowObject.email || '',
        name: rowObject.fullName || '',
        contactCount: '',
        timestamp: nowString
      };
      appendRowToSheet(workbook, 'Tracked_Candidates', trackedRow);
    }
    
    // ----------------------------------------------------
    // PIPELINE: BGV Responses (Update BGV Verification & Companies)
    // ----------------------------------------------------
    if (sheetName === 'BGV_Responses') {
      console.log('Processing BGV Response Submission...');
      const nowString = new Date().toISOString();
      const email = (rowObject.email || '').toLowerCase();
      const bvgCandId = rowObject.candidateId;

      // Find the Candidate in Master_Candidates
      let candidateList = xlsx.utils.sheet_to_json(workbook.Sheets['Master_Candidates']);
      let candidate = candidateList.find(c => 
        (bvgCandId && String(c.candidateId) === String(bvgCandId)) || 
        (email && String(c.email).toLowerCase() === email)
      );

      if (candidate) {
        const candidateId = candidate.candidateId;

        // 1. Update candidate parameters in Master_Candidates
        candidate.bgvStatus = 'in-review';
        candidate.trackedStatus = 'bgv-submitted';
        if (rowObject.currentAddress) candidate.address = rowObject.currentAddress;
        candidate.updatedAt = nowString;
        workbook.Sheets['Master_Candidates'] = xlsx.utils.json_to_sheet(candidateList, { header: getHeaders(workbook.Sheets['Master_Candidates']) });

        // 2. Update tracked candidates status
        let trackedList = xlsx.utils.sheet_to_json(workbook.Sheets['Tracked_Candidates']);
        let trackedCand = trackedList.find(t => String(t.candidateId) === String(candidateId));
        if (trackedCand) {
          trackedCand.status = 'bgv-submitted';
          trackedCand.timestamp = nowString;
        } else {
          trackedList.push({
            candidateId: candidateId,
            status: 'bgv-submitted',
            payloadType: 'bgv-form',
            email: candidate.email,
            name: candidate.fullName,
            contactCount: '',
            timestamp: nowString
          });
        }
        workbook.Sheets['Tracked_Candidates'] = xlsx.utils.json_to_sheet(trackedList, { header: getHeaders(workbook.Sheets['Tracked_Candidates']) });

        // 3. Update BGV Checklist in Candidate_Documents
        let docList = xlsx.utils.sheet_to_json(workbook.Sheets['Candidate_Documents']);
        const docKeys = ['offerLetter', 'appraisals', 'payslips', 'relievingLetter', 'counterOffer'];
        docList.forEach(doc => {
          if (String(doc.candidateId) === String(candidateId) && docKeys.includes(doc.documentKey)) {
            // Check matching value from BGV response
            const formVal = rowObject[doc.documentKey];
            const isChecked = formVal === 'TRUE' || formVal === true || String(formVal).toLowerCase() === 'true';
            doc.received = isChecked ? 'TRUE' : 'FALSE';
            doc.updatedAt = nowString;
          }
        });
        workbook.Sheets['Candidate_Documents'] = xlsx.utils.json_to_sheet(docList, { header: getHeaders(workbook.Sheets['Candidate_Documents']) });

        // 4. Save companies into BGV_Response_Companies and Candidate_Employment
        const companies = values.companies || [];
        if (Array.isArray(companies)) {
          companies.forEach((comp, index) => {
            if (!comp.name) return;

            // BGV_Response_Companies
            const bvgCompRow = {
              responseId: rowObject.responseId,
              candidateId: candidateId,
              sortOrder: index + 1,
              companyName: comp.name,
              designation: comp.designation || '',
              duration: comp.duration || ''
            };
            appendRowToSheet(workbook, 'BGV_Response_Companies', bvgCompRow);

            // Candidate_Employment
            const empRow = {
              employmentId: `emp_${candidateId}_${Date.now()}_${index}`,
              candidateId: candidateId,
              companyName: comp.name,
              designation: comp.designation || '',
              duration: comp.duration || '',
              source: 'bgv',
              sortOrder: index + 1,
              updatedAt: nowString
            };
            appendRowToSheet(workbook, 'Candidate_Employment', empRow);
          });
        }
      }
    }

    xlsx.writeFile(workbook, DB_PATH);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error appending to target sheet:`, error);
    res.status(500).json({ error: `Failed to append target sheet records` });
  }
});

// ----------------------------------------------------
// UPDATE ROW (Generic by primary key field)
// ----------------------------------------------------
app.put('/api/update', (req, res) => {
  const { sheetName, idField, idValue, values } = req.body;
  try {
    const workbook = readDB();
    if (!workbook.Sheets[sheetName]) {
      return res.status(404).json({ error: `Sheet ${sheetName} not found` });
    }
    
    let rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const rowIndex = rows.findIndex(r => r[idField] === idValue);
    
    if (rowIndex === -1) {
      return res.status(404).json({ error: `Record with ${idField}=${idValue} not found in ${sheetName}` });
    }
    
    // Update fields
    rows[rowIndex] = { ...rows[rowIndex], ...values };
    
    const newWorksheet = xlsx.utils.json_to_sheet(rows);
    workbook.Sheets[sheetName] = newWorksheet;
    
    xlsx.writeFile(workbook, DB_PATH);
    res.json({ success: true, rowIndex });
  } catch (error) {
    console.error(`Error updating ${sheetName}:`, error);
    res.status(500).json({ error: `Failed to update ${sheetName}` });
  }
});

// ----------------------------------------------------
// SAVE SETTINGS (App_Settings + Sheet_Links)
// ----------------------------------------------------
app.post('/api/save-settings', (req, res) => {
  const { appSettings, sheetLinks } = req.body;
  
  try {
    const workbook = readDB();
    
    // Update App_Settings
    if (appSettings && typeof appSettings === 'object') {
      let settingsRows = xlsx.utils.sheet_to_json(workbook.Sheets['App_Settings'] || {});
      const settingsHeaders = getHeaders(workbook.Sheets['App_Settings']);
      
      Object.entries(appSettings).forEach(([key, value]) => {
        const existingIdx = settingsRows.findIndex(r => r.settingKey === key);
        if (existingIdx >= 0) {
          settingsRows[existingIdx].settingValue = value;
          settingsRows[existingIdx].updatedAt = new Date().toISOString();
        } else {
          settingsRows.push({
            settingKey: key,
            settingValue: value,
            notes: '',
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      workbook.Sheets['App_Settings'] = xlsx.utils.json_to_sheet(settingsRows, { header: settingsHeaders.length > 0 ? settingsHeaders : undefined });
    }
    
    // Update Sheet_Links
    if (sheetLinks && typeof sheetLinks === 'object') {
      let linkRows = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet_Links'] || {});
      const linkHeaders = getHeaders(workbook.Sheets['Sheet_Links']);
      
      Object.entries(sheetLinks).forEach(([key, url]) => {
        const existingIdx = linkRows.findIndex(r => r.linkKey === key);
        if (existingIdx >= 0) {
          linkRows[existingIdx].googleSheetUrl = url;
        } else {
          linkRows.push({
            linkKey: key,
            label: key,
            googleSheetUrl: url,
            notes: ''
          });
        }
      });
      
      workbook.Sheets['Sheet_Links'] = xlsx.utils.json_to_sheet(linkRows, { header: linkHeaders.length > 0 ? linkHeaders : undefined });
    }
    
    xlsx.writeFile(workbook, DB_PATH);
    console.log('Settings saved successfully');
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ----------------------------------------------------
// SYNC FROM GOOGLE SHEETS (Fetch published sheet data)
// ----------------------------------------------------

async function performGoogleSheetSync(googleSheetUrl) {
  if (!googleSheetUrl) {
    throw new Error('Google Sheet URL is required');
  }

  // Convert Google Sheets URL to CSV export URL
  let csvUrl = '';
  const sheetIdMatch = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetIdMatch) {
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=0`;
  } else {
    // Try as direct ID
    csvUrl = `https://docs.google.com/spreadsheets/d/${googleSheetUrl}/export?format=csv&gid=0`;
  }
  
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}. Make sure the sheet is published/shared publicly.`);
  }
  
  const csvText = await response.text();
  
  // Parse CSV
  const csvWorkbook = xlsx.read(csvText, { type: 'string' });
  const csvSheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(csvSheet);
  
  if (rows.length === 0) {
    return { success: true, imported: 0, total: 0, message: 'No data rows found in the Google Sheet' };
  }

  // Read current database
  const workbook = readDB();
  const existingRegs = xlsx.utils.sheet_to_json(workbook.Sheets['Registration_Responses'] || {});
    const existingEmails = new Set(existingRegs.map(r => String(r.email || '').toLowerCase()));
    
    let importedCount = 0;
    const nowString = new Date().toISOString();
    
    for (const row of rows) {
      // Map Google Form columns to our schema
      // Common Google Form column names -> our field names
      const mapped = mapGoogleFormRow(row);
      
      if (!mapped.email) continue; // Skip rows without email
      
      // Skip already imported
      if (existingEmails.has(mapped.email.toLowerCase())) {
        console.log(`Skipping already imported: ${mapped.email}`);
        continue;
      }
      
      const submissionId = `reg_sync_${Date.now()}_${importedCount}`;
      const candidateId = `c_sync_${Date.now()}_${importedCount}`;
      
      // 1. Add to Registration_Responses
      const regRow = {
        submissionId: submissionId,
        tokenEmail: mapped.email,
        fullName: mapped.fullName || '',
        email: mapped.email,
        phone: mapped.phone || '',
        dob: mapped.dob || '',
        address: mapped.address || '',
        course: mapped.course || 'Python Core',
        branch: mapped.branch || 'Online',
        submittedAt: mapped.timestamp || nowString,
        syncStatus: 'TRUE',
        candidateId: candidateId
      };
      appendRowToSheet(workbook, 'Registration_Responses', regRow);
      
      // 2. Add to Master_Candidates
      const candidateRow = {
        candidateId: candidateId,
        fullName: mapped.fullName || '',
        email: mapped.email,
        phone: mapped.phone || '',
        batchName: 'Batch 1',
        dateOfBirth: mapped.dob || '',
        address: mapped.address || '',
        branch: mapped.branch || 'Online',
        course: mapped.course || 'Python Core',
        dateOfJoining: nowString.split('T')[0],
        currentStatus: 'active',
        bgvStatus: 'pending',
        placed: 'FALSE',
        placedCompany: '',
        trackedStatus: 'form-pending',
        trackedAt: nowString,
        createdAt: nowString,
        updatedAt: nowString
      };
      appendRowToSheet(workbook, 'Master_Candidates', candidateRow);
      
      // 3. Initialize documents checklist
      const docKeys = [
        { key: 'offerLetter', label: 'Offer Letter' },
        { key: 'appraisals', label: 'Appraisals' },
        { key: 'payslips', label: 'Payslips' },
        { key: 'relievingLetter', label: 'Relieving Letter' },
        { key: 'counterOffer', label: 'Counter Offer' }
      ];
      docKeys.forEach(doc => {
        appendRowToSheet(workbook, 'Candidate_Documents', {
          candidateId: candidateId,
          documentKey: doc.key,
          documentLabel: doc.label,
          received: 'FALSE',
          applied: 'FALSE',
          updatedAt: nowString
        });
      });
      
      // 4. Initialize financials
      const financials = [
        { type: 'registration', label: 'Registration Fee', base: 0 },
        { type: 'course', label: 'Course Fee', base: 30000 },
        { type: 'document', label: 'Document Fee', base: 25000 },
        { type: 'placement', label: 'Placement Payment', base: 100000 }
      ];
      financials.forEach(f => {
        appendRowToSheet(workbook, 'Financial_Ledger', {
          candidateId: candidateId,
          pipelineType: f.type,
          pipelineLabel: f.label,
          baseFee: f.base,
          totalAdjustments: 0,
          paidToDate: 0,
          netPayable: f.base,
          pendingDues: f.base,
          updatedAt: nowString
        });
      });
      
      // 5. Add to Tracked_Candidates
      appendRowToSheet(workbook, 'Tracked_Candidates', {
        candidateId: candidateId,
        status: 'form-pending',
        payloadType: 'new-registration',
        email: mapped.email,
        name: mapped.fullName || '',
        contactCount: '',
        timestamp: nowString
      });
      
      existingEmails.add(mapped.email.toLowerCase());
      importedCount++;
    }
    
    if (importedCount > 0) {
      xlsx.writeFile(workbook, DB_PATH);
      console.log(`Successfully imported ${importedCount} new candidates from Google Sheet`);
    }
    
    return { 
      success: true, 
      imported: importedCount, 
      total: rows.length,
      message: `Imported ${importedCount} new candidate(s) from ${rows.length} total row(s)` 
    };
}

app.post('/api/sync-google-sheet', async (req, res) => {
  try {
    const result = await performGoogleSheetSync(req.body.googleSheetUrl);
    res.json(result);
  } catch (error) {
    console.error('Error syncing Google Sheet:', error);
    res.status(500).json({ error: error.message || 'Failed to sync Google Sheet' });
  }
});

// Helper: Map Google Form response columns to our schema
function mapGoogleFormRow(row) {
  // Google Forms typically uses "Timestamp" and the question text as column headers
  // We need to be flexible about column name matching
  const keys = Object.keys(row);
  
  const find = (patterns) => {
    for (const pattern of patterns) {
      const key = keys.find(k => k.toLowerCase().includes(pattern.toLowerCase()));
      if (key && row[key]) return String(row[key]).trim();
    }
    return '';
  };
  
  return {
    timestamp: find(['timestamp', 'time', 'date submitted', 'submitted']),
    fullName: find(['full name', 'fullname', 'name', 'candidate name']),
    email: find(['email', 'mail', 'e-mail']),
    phone: find(['phone', 'mobile', 'contact number', 'contact', 'cell']),
    dob: find(['date of birth', 'dob', 'birth date', 'birthday']),
    address: find(['address', 'location', 'city']),
    course: find(['course', 'program', 'interested']),
    branch: find(['branch', 'center', 'location preference']),
  };
}

// ----------------------------------------------------
// MANUAL IMPORT (Direct candidate entry from frontend)
// ----------------------------------------------------
app.post('/api/import-candidate', (req, res) => {
  const { fullName, email, phone, dob, address, course, branch } = req.body;
  
  if (!email || !fullName) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const workbook = readDB();
    const nowString = new Date().toISOString();
    const candidateId = `c_${Date.now()}`;
    const submissionId = `reg_manual_${Date.now()}`;
    
    // Check if email already exists
    const existingCands = xlsx.utils.sheet_to_json(workbook.Sheets['Master_Candidates'] || {});
    const exists = existingCands.find(c => String(c.email || '').toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: 'A candidate with this email already exists', candidateId: exists.candidateId });
    }
    
    // 1. Add to Registration_Responses
    appendRowToSheet(workbook, 'Registration_Responses', {
      submissionId,
      tokenEmail: email,
      fullName,
      email,
      phone: phone || '',
      dob: dob || '',
      address: address || '',
      course: course || 'Python Core',
      branch: branch || 'Online',
      submittedAt: nowString,
      syncStatus: 'TRUE',
      candidateId
    });
    
    // 2. Add to Master_Candidates
    appendRowToSheet(workbook, 'Master_Candidates', {
      candidateId,
      fullName,
      email,
      phone: phone || '',
      batchName: 'Batch 1',
      dateOfBirth: dob || '',
      address: address || '',
      branch: branch || 'Online',
      course: course || 'Python Core',
      dateOfJoining: nowString.split('T')[0],
      currentStatus: 'active',
      bgvStatus: 'pending',
      placed: 'FALSE',
      placedCompany: '',
      trackedStatus: 'form-pending',
      trackedAt: nowString,
      createdAt: nowString,
      updatedAt: nowString
    });
    
    // 3. Initialize documents
    ['offerLetter', 'appraisals', 'payslips', 'relievingLetter', 'counterOffer'].forEach(key => {
      appendRowToSheet(workbook, 'Candidate_Documents', {
        candidateId,
        documentKey: key,
        documentLabel: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
        received: 'FALSE',
        applied: 'FALSE',
        updatedAt: nowString
      });
    });
    
    // 4. Initialize financials
    [
      { type: 'registration', label: 'Registration Fee', base: 0 },
      { type: 'course', label: 'Course Fee', base: 30000 },
      { type: 'document', label: 'Document Fee', base: 25000 },
      { type: 'placement', label: 'Placement Payment', base: 100000 }
    ].forEach(f => {
      appendRowToSheet(workbook, 'Financial_Ledger', {
        candidateId,
        pipelineType: f.type,
        pipelineLabel: f.label,
        baseFee: f.base,
        totalAdjustments: 0,
        paidToDate: 0,
        netPayable: f.base,
        pendingDues: f.base,
        updatedAt: nowString
      });
    });
    
    // 5. Add to Tracked_Candidates
    appendRowToSheet(workbook, 'Tracked_Candidates', {
      candidateId,
      status: 'form-pending',
      payloadType: 'new-registration',
      email,
      name: fullName,
      contactCount: '',
      timestamp: nowString
    });
    
    xlsx.writeFile(workbook, DB_PATH);
    
    console.log(`Manually imported candidate: ${fullName} (${email}) -> ${candidateId}`);
    res.json({ success: true, candidateId, message: `Successfully imported ${fullName}` });
    
  } catch (error) {
    console.error('Error importing candidate:', error);
    res.status(500).json({ error: 'Failed to import candidate' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Excel Proxy server running on http://localhost:${PORT}`);
  
  // Start background auto-sync polling every 30 seconds
  setInterval(async () => {
    try {
      if (!fs.existsSync(DB_PATH)) return;
      const workbook = xlsx.readFile(DB_PATH);
      const links = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet_Links'] || {});
      const regLink = links.find(l => l.linkKey === 'registrations');
      
      if (regLink && regLink.googleSheetUrl) {
        const result = await performGoogleSheetSync(regLink.googleSheetUrl);
        if (result.imported > 0) {
          console.log(`Auto-sync imported ${result.imported} candidates in background.`);
        }
      }
    } catch (e) {
      // Silently fail on background sync errors so it doesn't crash the server
      console.error('Background auto-sync failed:', e.message);
    }
  }, 30000);
});
