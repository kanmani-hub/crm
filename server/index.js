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

// ----------------------------------------------------
// APPEND ROW (Generic)
// ----------------------------------------------------
app.post('/api/append', (req, res) => {
  const { sheetName, values } = req.body;
  try {
    const workbook = readDB();
    if (!workbook.Sheets[sheetName]) {
      return res.status(404).json({ error: `Sheet ${sheetName} not found` });
    }
    
    // values is an object representing a row
    // We convert existing sheet to json, push, and convert back
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    rows.push(values);
    
    const newWorksheet = xlsx.utils.json_to_sheet(rows);
    workbook.Sheets[sheetName] = newWorksheet;
    
    xlsx.writeFile(workbook, DB_PATH);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error appending to ${sheetName}:`, error);
    res.status(500).json({ error: `Failed to append to ${sheetName}` });
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

app.listen(PORT, () => {
  console.log(`🚀 Excel Proxy server running on http://localhost:${PORT}`);
});
