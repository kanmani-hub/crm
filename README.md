# PyCRM

PyCRM is a modern, responsive, and dynamic CRM system designed for managing student candidates, training pipelines, background verifications (BGV), and financials. It integrates seamlessly with Google Sheets (via Google Apps Script) as a cloud database backend, along with a local fallback using Express and Excel.

## Features

- **Dynamic Dashboard**: View key performance indicators, active student counts, placement statistics, and branch/course breakdowns.
- **Candidate Management**: Search, filter, and track candidates across multiple stages (Training, BGV, Placed).
- **Inline Editing & Global Edit**: Instantly update candidate details directly from the UI. Edits are immediately persisted to Google Sheets.
- **Financial Pipelines**: Track payments, base fees, and due amounts across different stages (Registration, Course Fee, Document, Placement).
- **Background Verification (BGV)**: Built-in flows to manage BGV status, send automated forms via email, and review submitted documents.
- **Audit Logs**: Maintain a robust history of structural, financial, and BGV changes made to any candidate.
- **Settings Configuration**: A dedicated settings page to dynamically control dropdown options (Courses, Branches), CC mail IDs, and backend synchronization configurations.

## Architecture & Tech Stack

### Frontend
- **React 18** (built with **Vite**)
- **TypeScript** for robust type-safety
- **Zustand** for lightweight global state management
- **Tailwind CSS** for dynamic styling and custom utility classes
- **Framer Motion** for smooth micro-animations and route transitions
- **Lucide React** for crisp, scalable icons

### Backend & Database
- **Google Apps Script (GAS)**: Serves as the primary production backend. It uses `Code.gs` to expose a REST API via `doGet` and `doPost`, interfacing directly with Google Sheets (`Master_Candidates`, `Registration_Responses`, etc.).
- **Express.js (Node)**: A local backend server providing file-system-based persistence using Excel (`xlsx`), heavily utilized during local development.

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
Navigate to the `server` directory and start the Express server:
```bash
cd server
npm install
npm start
```
The server will run on `http://localhost:3001` and provide fallback APIs using the local `sheets/pycrm_database.xlsx` file.

### 3. Deploying Google Apps Script
To connect the frontend to your live Google Sheets database:
1. Open your Google Sheet.
2. Go to **Extensions > Apps Script**.
3. Copy the contents of the root `Code.gs` file into the editor.
4. Save and click **Deploy > New deployment**.
5. Select type **Web app**, set execute as **Me**, and access to **Anyone**.
6. Copy the resulting Web App URL.
7. Open PyCRM, go to the **Settings** page, and paste the URL into the **Google Apps Script Web App URL** field.

## Project Structure

```text
pycrm_project/
├── app/
│   ├── src/
│   │   ├── components/      # Reusable UI components (Sidebar, TopNav, Cards)
│   │   ├── pages/           # Route views (Dashboard, Settings, Profiles)
│   │   ├── services/        # API layer for fetching/syncing data
│   │   ├── store/           # Zustand state management (useStore.ts)
│   │   └── types/           # TypeScript interfaces and type definitions
├── server/
│   └── index.js             # Local Express API server
├── sheets/
│   └── pycrm_database.xlsx  # Local Excel database
└── Code.gs                  # Google Apps Script production backend
```
