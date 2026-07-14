# PyCRM

PyCRM is a modern, responsive, and dynamic CRM system designed for managing student candidates, training pipelines, Direct Placements, background verifications (BGV), and complex financial pipelines. It integrates seamlessly with Google Sheets (via Google Apps Script) as a robust cloud database backend, while providing a stunning UI built on React and TailwindCSS.

## Key Features

- **Dual CRM Architecture**:
  - **Regular CRM**: Manage training candidates, track their course fee progression, BGV status, and overall training lifecycle.
  - **Direct Placement CRM**: Dedicated module for managing candidates placed directly in partner companies. Tracks Direct Placement BGV forms, Direct Placement adjustments/finances, and candidate experience/designation tracking.
- **Dynamic Dashboards**: Real-time Key Performance Indicators (KPIs) and analytical widgets tailored for both Regular and Direct Placement pipelines.
- **Background Verification (BGV)**: 
  - Automated synchronization between Google Form submissions and the CRM.
  - Supports detailed mapping of candidate fields including flexible alternate contact processing.
  - Separate BGV flow and tracking for Direct Placement candidates.
- **Advanced Financial Management**: 
  - Segmented financial ledgers for Registration, Course Fees, Document Fees, and Placement Fees.
  - Support for custom Financial Adjustments (Discounts, Scholarships) which dynamically update Net Payable and Pending Dues.
  - Cross-pipeline synchronization with real-time Dashboard tracking.
- **Document Vault & Relieving Letters**: Complete document tracking synchronization (Offer Letters, Relieving Letters, PF Service History, Payslips) ensuring robust document auditing per candidate.
- **System Change Log (Audit System)**: 
  - Comprehensive Audit Trails for both CRMs.
  - Logs user stamps, timestamps, and exact structural/financial changes.
  - Visible globally on dashboards and within individual candidate profiles.
- **Backup & Export Center**: 
  - Multi-sheet Excel exports mapping exactly to Google Sheet structures.
  - **Month-wise filtering**: Export candidate data, BGV data, financials, and audit logs filtered precisely by a selected calendar month (or All Time).

## Architecture & Tech Stack

### Frontend
- **React 18** (built with **Vite**)
- **TypeScript** for robust type-safety
- **Zustand** for lightweight, persistent global state management
- **Tailwind CSS** for dynamic styling, custom utility classes, and glassmorphism UI
- **Framer Motion** for smooth micro-animations and route transitions
- **Lucide React** for crisp, scalable icons
- **XLSX (SheetJS)** for generating and downloading complex Excel backups locally

### Backend & Database
- **Google Apps Script (GAS)**: Serves as the primary production backend. Uses `Code.gs` to expose a robust REST API (`doGet`/`doPost`), interfacing directly with Google Sheets (`Master_Candidates`, `Direct_Placement_Candidates`, `Financial_Ledger`, `System_Audit_Logs`, etc.).
- **Express.js (Node)**: A local backend server providing file-system-based persistence for isolated local development without consuming GAS quotas.

## Setup Instructions

### 1. Starting the Frontend
Navigate to the `app` directory, install dependencies, and start the Vite dev server:
```bash
cd app
npm install
npm run dev
```
The application will be running at `http://localhost:3000`.

### 2. Starting the Local Backend (Optional)
Navigate to the `server` directory and start the Express server for local JSON/Excel mock routing:
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:3001`.

### 3. Deploying Google Apps Script (Production Backend)
1. Open your designated PyCRM Google Sheet workspace.
2. Go to **Extensions > Apps Script**.
3. Copy the entire contents of the `Code.gs` file into the Apps Script editor.
4. Save and click **Deploy > New deployment**.
5. Select type **Web app**, execute as **Me**, and access to **Anyone**.
6. Copy the resulting Web App URL.
7. Open PyCRM, go to the **Settings** page, and paste the URL into the **Google Apps Script Web App URL** field.
8. Paste your Google Form links for BGV and Direct Placements in the settings page for direct access.

## Project Structure

```text
pycrm/
├── app/
│   ├── src/
│   │   ├── components/      # Global UI components (Sidebars, TopNav, Modals, Forms)
│   │   ├── pages/           # Route views (Dashboards, Settings, Profiles, Backup Center)
│   │   │   └── directPlacement/ # Direct Placement CRM isolated views
│   │   ├── services/        # API layer (sheetsApi.ts, dpSheetsApi.ts)
│   │   ├── store/           # Zustand state management (useStore.ts, useDPStore.ts)
│   │   ├── types/           # Core interfaces (index.ts, dp.ts)
│   │   └── lib/             # Utilities (Excel export formats, date formatters)
├── server/
│   └── index.js             # Local fallback Express API server
├── Code.gs                  # Google Apps Script production backend source
└── README.md                # Project documentation
```
