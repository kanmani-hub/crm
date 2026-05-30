const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const workbook = xlsx.utils.book_new();

// Helper to create a sheet and add it to workbook
function addSheet(name, data) {
  const worksheet = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, name);
}

// 1. Schema_Map
addSheet('Schema_Map', [
  { sheetName: 'Master_Candidates', primaryKey: 'candidateId', purpose: 'Primary candidate profile and status cache', appSurface: 'Candidate profile, search, forms' },
  { sheetName: 'Candidate_Documents', primaryKey: 'candidateId + documentKey', purpose: 'Document received/applied flags used by Document Vault', appSurface: 'Candidate profile, BGV form' },
  { sheetName: 'Candidate_Employment', primaryKey: 'employmentId', purpose: 'Past company tags and BGV employment history', appSurface: 'Candidate profile, BGV form' },
  { sheetName: 'Financial_Ledger', primaryKey: 'candidateId + pipelineType', purpose: 'Current financial bucket state with formulas from payments and adjustments', appSurface: 'Financial Management' },
  { sheetName: 'Financial_Adjustments', primaryKey: 'adjustmentId', purpose: 'Discount/waiver rows for the financial buckets', appSurface: 'Add Adjustment' },
  { sheetName: 'Payment_Records', primaryKey: 'paymentId', purpose: 'Payment injector append-only rows', appSurface: 'Add Payment' },
  { sheetName: 'Tracked_Candidates', primaryKey: 'candidateId + timestamp', purpose: 'Push panel dispatch tracking', appSurface: 'Dashboard' },
  { sheetName: 'System_Audit_Logs', primaryKey: 'logId', purpose: 'Changes sidebar entries', appSurface: 'Changes tab' },
  { sheetName: 'Registration_Responses', primaryKey: 'submissionId', purpose: 'New registration form submissions', appSurface: 'External registration form' },
  { sheetName: 'BGV_Responses', primaryKey: 'responseId', purpose: 'BGV form personal/document submission rows', appSurface: 'External BGV form' },
  { sheetName: 'BGV_Response_Companies', primaryKey: 'responseId + sortOrder', purpose: 'Companies supplied in the BGV form', appSurface: 'External BGV form' },
  { sheetName: 'Contact_Pool', primaryKey: 'contactId', purpose: 'Live Contact Pool master contacts', appSurface: 'Push panel contact mail' },
  { sheetName: 'Courses_Dropdown', primaryKey: 'optionId', purpose: 'Course options from HR Settings', appSurface: 'Profile edit/search filters/forms' },
  { sheetName: 'Branches_Dropdown', primaryKey: 'optionId', purpose: 'Branch options from HR Settings', appSurface: 'Profile edit/search filters/forms' },
  { sheetName: 'App_Settings', primaryKey: 'settingKey', purpose: 'Organization and routing settings', appSurface: 'HR Settings' },
  { sheetName: 'Sheet_Links', primaryKey: 'linkKey', purpose: 'Staging links to source Google Sheets', appSurface: 'HR Settings' },
]);

// 2. Master_Candidates
addSheet('Master_Candidates', [
  { candidateId: 'c1', fullName: 'Rahul Sharma', email: 'rahul.sharma@email.com', phone: '+91 98765 43210', batchName: 'Batch 4', dateOfBirth: '1995-03-15', address: '42, MG Road, Bangalore, Karnataka 560001', branch: 'Bangalore', course: 'Full Stack', dateOfJoining: '2025-01-10', currentStatus: 'active', bgvStatus: 'pending', placed: false, placedCompany: null, trackedStatus: null, trackedAt: null, createdAt: '2025-01-10', updatedAt: '2025-01-10' },
  { candidateId: 'c2', fullName: 'Priya Patel', email: 'priya.patel@email.com', phone: '+91 87654 32109', batchName: 'Batch 5', dateOfBirth: '1997-08-22', address: '15, Park Street, Mumbai, Maharashtra 400001', branch: 'Online', course: 'Python Core', dateOfJoining: '2025-02-05', currentStatus: 'active', bgvStatus: 'in-review', placed: false, placedCompany: null, trackedStatus: null, trackedAt: null, createdAt: '2025-02-05', updatedAt: '2025-02-05' },
  { candidateId: 'c3', fullName: 'Amit Kumar', email: 'amit.kumar@email.com', phone: '+91 76543 21098', batchName: 'Batch 3', dateOfBirth: '1993-11-05', address: '78, Salt Lake, Kolkata, West Bengal 700091', branch: 'Chennai', course: 'Python Core', dateOfJoining: '2024-12-01', currentStatus: 'active', bgvStatus: 'cleared', placed: true, placedCompany: 'Google India', trackedStatus: null, trackedAt: null, createdAt: '2024-12-01', updatedAt: '2025-01-15' },
  { candidateId: 'c4', fullName: 'Sneha Reddy', email: 'sneha.reddy@email.com', phone: '+91 65432 10987', batchName: 'Batch 6', dateOfBirth: '1996-06-18', address: '33, Jubilee Hills, Hyderabad, Telangana 500033', branch: 'Bangalore', course: 'Full Stack', dateOfJoining: '2025-03-01', currentStatus: 'active', bgvStatus: 'pending', placed: false, placedCompany: null, trackedStatus: 'form-pending', trackedAt: '2025-03-01', createdAt: '2025-03-01', updatedAt: '2025-03-01' }
]);

// 3. Candidate_Documents
addSheet('Candidate_Documents', [
  { candidateId: 'c1', documentKey: 'offerLetter', documentLabel: 'Offer Letter', received: true, applied: true, updatedAt: '2025-01-10' },
  { candidateId: 'c1', documentKey: 'appraisals', documentLabel: 'Appraisals', received: true, applied: false, updatedAt: '2025-01-10' },
  { candidateId: 'c1', documentKey: 'payslips', documentLabel: 'Payslips', received: false, applied: true, updatedAt: '2025-01-10' },
  { candidateId: 'c1', documentKey: 'relievingLetter', documentLabel: 'Relieving Letter', received: true, applied: false, updatedAt: '2025-01-10' },
  { candidateId: 'c1', documentKey: 'counterOffer', documentLabel: 'Counter Offer', received: false, applied: false, updatedAt: '2025-01-10' },
  { candidateId: 'c2', documentKey: 'offerLetter', documentLabel: 'Offer Letter', received: true, applied: true, updatedAt: '2025-02-05' },
  { candidateId: 'c2', documentKey: 'appraisals', documentLabel: 'Appraisals', received: false, applied: true, updatedAt: '2025-02-05' },
  { candidateId: 'c2', documentKey: 'payslips', documentLabel: 'Payslips', received: true, applied: true, updatedAt: '2025-02-05' },
  { candidateId: 'c2', documentKey: 'relievingLetter', documentLabel: 'Relieving Letter', received: false, applied: true, updatedAt: '2025-02-05' },
  { candidateId: 'c2', documentKey: 'counterOffer', documentLabel: 'Counter Offer', received: false, applied: false, updatedAt: '2025-02-05' },
  { candidateId: 'c3', documentKey: 'offerLetter', documentLabel: 'Offer Letter', received: true, applied: true, updatedAt: '2024-12-01' },
  { candidateId: 'c3', documentKey: 'appraisals', documentLabel: 'Appraisals', received: true, applied: true, updatedAt: '2024-12-01' },
  { candidateId: 'c3', documentKey: 'payslips', documentLabel: 'Payslips', received: true, applied: true, updatedAt: '2024-12-01' },
  { candidateId: 'c3', documentKey: 'relievingLetter', documentLabel: 'Relieving Letter', received: true, applied: true, updatedAt: '2024-12-01' },
  { candidateId: 'c3', documentKey: 'counterOffer', documentLabel: 'Counter Offer', received: true, applied: true, updatedAt: '2024-12-01' },
  { candidateId: 'c4', documentKey: 'offerLetter', documentLabel: 'Offer Letter', received: false, applied: true, updatedAt: '2025-03-01' },
  { candidateId: 'c4', documentKey: 'appraisals', documentLabel: 'Appraisals', received: false, applied: false, updatedAt: '2025-03-01' },
  { candidateId: 'c4', documentKey: 'payslips', documentLabel: 'Payslips', received: false, applied: false, updatedAt: '2025-03-01' },
  { candidateId: 'c4', documentKey: 'relievingLetter', documentLabel: 'Relieving Letter', received: false, applied: false, updatedAt: '2025-03-01' },
  { candidateId: 'c4', documentKey: 'counterOffer', documentLabel: 'Counter Offer', received: false, applied: false, updatedAt: '2025-03-01' }
]);

// 4. Candidate_Employment
addSheet('Candidate_Employment', [
  { employmentId: 'emp_c1_1', candidateId: 'c1', companyName: 'TCS', designation: null, duration: null, source: 'profile', sortOrder: 1, updatedAt: '2025-01-10' },
  { employmentId: 'emp_c1_2', candidateId: 'c1', companyName: 'Infosys', designation: null, duration: null, source: 'profile', sortOrder: 2, updatedAt: '2025-01-10' },
  { employmentId: 'emp_c2_1', candidateId: 'c2', companyName: 'Cognizant', designation: null, duration: null, source: 'profile', sortOrder: 1, updatedAt: '2025-02-05' },
  { employmentId: 'emp_c2_2', candidateId: 'c2', companyName: 'Wipro', designation: null, duration: null, source: 'profile', sortOrder: 2, updatedAt: '2025-02-05' },
  { employmentId: 'emp_c3_1', candidateId: 'c3', companyName: 'HCL', designation: null, duration: null, source: 'profile', sortOrder: 1, updatedAt: '2024-12-01' },
  { employmentId: 'emp_c3_2', candidateId: 'c3', companyName: 'Tech Mahindra', designation: null, duration: null, source: 'profile', sortOrder: 2, updatedAt: '2024-12-01' },
  { employmentId: 'emp_c3_3', candidateId: 'c3', companyName: 'Accenture', designation: null, duration: null, source: 'profile', sortOrder: 3, updatedAt: '2024-12-01' },
  { employmentId: 'emp_c4_1', candidateId: 'c4', companyName: 'Capgemini', designation: null, duration: null, source: 'profile', sortOrder: 1, updatedAt: '2025-03-01' }
]);

// 5. Financial_Ledger
addSheet('Financial_Ledger', [
  { candidateId: 'c1', pipelineType: 'registration', pipelineLabel: 'Registration Fee', baseFee: 0, totalAdjustments: 0, paidToDate: 0, netPayable: 0, pendingDues: 0, updatedAt: '2025-01-10' },
  { candidateId: 'c1', pipelineType: 'course', pipelineLabel: 'Course Fee', baseFee: 30000, totalAdjustments: -2000, paidToDate: 25000, netPayable: 28000, pendingDues: 3000, updatedAt: '2025-01-10' },
  { candidateId: 'c1', pipelineType: 'document', pipelineLabel: 'Document Fee', baseFee: 25000, totalAdjustments: 0, paidToDate: 0, netPayable: 25000, pendingDues: 25000, updatedAt: '2025-01-10' },
  { candidateId: 'c1', pipelineType: 'placement', pipelineLabel: 'Placement Payment', baseFee: 100000, totalAdjustments: 0, paidToDate: 0, netPayable: 100000, pendingDues: 100000, updatedAt: '2025-01-10' },
  { candidateId: 'c2', pipelineType: 'registration', pipelineLabel: 'Registration Fee', baseFee: 0, totalAdjustments: 0, paidToDate: 0, netPayable: 0, pendingDues: 0, updatedAt: '2025-02-05' },
  { candidateId: 'c2', pipelineType: 'course', pipelineLabel: 'Course Fee', baseFee: 30000, totalAdjustments: 0, paidToDate: 10000, netPayable: 30000, pendingDues: 20000, updatedAt: '2025-02-05' },
  { candidateId: 'c2', pipelineType: 'document', pipelineLabel: 'Document Fee', baseFee: 25000, totalAdjustments: 0, paidToDate: 5000, netPayable: 25000, pendingDues: 20000, updatedAt: '2025-02-05' },
  { candidateId: 'c2', pipelineType: 'placement', pipelineLabel: 'Placement Payment', baseFee: 100000, totalAdjustments: 0, paidToDate: 0, netPayable: 100000, pendingDues: 100000, updatedAt: '2025-02-05' },
  { candidateId: 'c3', pipelineType: 'registration', pipelineLabel: 'Registration Fee', baseFee: 0, totalAdjustments: 0, paidToDate: 0, netPayable: 0, pendingDues: 0, updatedAt: '2024-12-01' },
  { candidateId: 'c3', pipelineType: 'course', pipelineLabel: 'Course Fee', baseFee: 30000, totalAdjustments: 0, paidToDate: 30000, netPayable: 30000, pendingDues: 0, updatedAt: '2024-12-01' },
  { candidateId: 'c3', pipelineType: 'document', pipelineLabel: 'Document Fee', baseFee: 25000, totalAdjustments: 0, paidToDate: 25000, netPayable: 25000, pendingDues: 0, updatedAt: '2024-12-01' },
  { candidateId: 'c3', pipelineType: 'placement', pipelineLabel: 'Placement Payment', baseFee: 100000, totalAdjustments: -10000, paidToDate: 90000, netPayable: 90000, pendingDues: 0, updatedAt: '2024-12-01' },
  { candidateId: 'c4', pipelineType: 'registration', pipelineLabel: 'Registration Fee', baseFee: 0, totalAdjustments: 0, paidToDate: 0, netPayable: 0, pendingDues: 0, updatedAt: '2025-03-01' },
  { candidateId: 'c4', pipelineType: 'course', pipelineLabel: 'Course Fee', baseFee: 30000, totalAdjustments: 0, paidToDate: 0, netPayable: 30000, pendingDues: 30000, updatedAt: '2025-03-01' },
  { candidateId: 'c4', pipelineType: 'document', pipelineLabel: 'Document Fee', baseFee: 25000, totalAdjustments: 0, paidToDate: 0, netPayable: 25000, pendingDues: 25000, updatedAt: '2025-03-01' },
  { candidateId: 'c4', pipelineType: 'placement', pipelineLabel: 'Placement Payment', baseFee: 100000, totalAdjustments: 0, paidToDate: 0, netPayable: 100000, pendingDues: 100000, updatedAt: '2025-03-01' }
]);

// 6. Financial_Adjustments
addSheet('Financial_Adjustments', [
  { adjustmentId: 'adj_c1_course_001', candidateId: 'c1', pipelineType: 'course', amount: -2000, label: 'Corporate Waiver', reason: 'Branch Manager approved early-bird corporate waiver', createdAt: '2025-01-10T10:30:00Z', userStamp: 'HR-A' },
  { adjustmentId: 'adj_c3_placement_001', candidateId: 'c3', pipelineType: 'placement', amount: -10000, label: 'Placement Partner Credit', reason: 'Referral credit approved by placements team', createdAt: '2025-01-15T09:15:00Z', userStamp: 'HR-B' }
]);

// 7. Payment_Records
addSheet('Payment_Records', [
  { paymentId: 'pay_c1_course_001', candidateId: 'c1', pipelineType: 'course', amount: 25000, transactionRef: 'TXN-C1-COURSE-001', notes: 'Paid via GPay - Batch 4', timestamp: '2025-01-15T14:20:00Z', userStamp: 'Python HR' },
  { paymentId: 'pay_c2_course_001', candidateId: 'c2', pipelineType: 'course', amount: 10000, transactionRef: 'TXN-C2-COURSE-001', notes: 'Initial course payment', timestamp: '2025-02-10T10:00:00Z', userStamp: 'Python HR' },
  { paymentId: 'pay_c2_document_001', candidateId: 'c2', pipelineType: 'document', amount: 5000, transactionRef: 'TXN-C2-DOC-001', notes: 'Document fee part payment', timestamp: '2025-02-15T10:00:00Z', userStamp: 'Python HR' },
  { paymentId: 'pay_c3_course_001', candidateId: 'c3', pipelineType: 'course', amount: 30000, transactionRef: 'TXN-C3-COURSE-001', notes: 'Course fee paid in full', timestamp: '2024-12-10T10:00:00Z', userStamp: 'Python HR' },
  { paymentId: 'pay_c3_document_001', candidateId: 'c3', pipelineType: 'document', amount: 25000, transactionRef: 'TXN-C3-DOC-001', notes: 'Document fee paid in full', timestamp: '2024-12-15T10:00:00Z', userStamp: 'Python HR' },
  { paymentId: 'pay_c3_placement_001', candidateId: 'c3', pipelineType: 'placement', amount: 90000, transactionRef: 'TXN-C3-PLACE-001', notes: 'Placement payment after waiver', timestamp: '2025-03-10T10:00:00Z', userStamp: 'Python HR' }
]);

// 8. Tracked_Candidates
addSheet('Tracked_Candidates', [
  { candidateId: 'c4', status: 'form-pending', payloadType: 'new-registration', email: 'sneha.reddy@email.com', name: 'Sneha Reddy', contactCount: null, timestamp: '2025-03-01T10:00:00Z' },
  { candidateId: 'c2', status: 'bgv-submitted', payloadType: 'bgv-form', email: 'priya.patel@email.com', name: 'Priya Patel', contactCount: null, timestamp: '2025-02-05T10:00:00Z' },
  { candidateId: 'tc_20260522_001', status: 'contacts-sent', payloadType: 'contact-mail', email: 'lead.candidate@email.com', name: null, contactCount: 3, timestamp: '2025-03-02T10:00:00Z' }
]);

// 9. System_Audit_Logs
addSheet('System_Audit_Logs', [
  { logId: 'l1', candidateId: 'c1', logType: 'structural', description: 'Applied discount: Corporate Waiver (-Rs.2,000)', reason: 'Branch Manager approved early-bird corporate waiver', userStamp: 'HR-A', timestamp: '2025-01-10T10:30:00Z' },
  { logId: 'l2', candidateId: 'c1', logType: 'financial', description: 'Payment received: Rs.25,000 for Course Fee', reason: 'Paid via GPay - Batch 4', userStamp: 'Python HR', timestamp: '2025-01-15T14:20:00Z' },
  { logId: 'l3', candidateId: 'c2', logType: 'bgv', description: 'BGV request dispatched to team', reason: null, userStamp: 'HR-A', timestamp: '2025-02-05T10:00:00Z' },
  { logId: 'l4', candidateId: 'c3', logType: 'financial', description: 'Python HR logged a payment of Rs.90,000 for Placement Payment. (Ref: TXN-C3-PLACE-001)', reason: 'Placement payment after waiver', userStamp: 'Python HR', timestamp: '2025-03-10T10:00:00Z' }
]);

// 10. Registration_Responses
addSheet('Registration_Responses', [
  { submissionId: 'reg_20260522_001', tokenEmail: 'new.candidate@email.com', fullName: 'Ananya Rao', email: 'new.candidate@email.com', phone: '+91 90000 11111', dob: '1999-09-15', address: 'Velachery, Chennai', course: 'Python Core', branch: 'Chennai', submittedAt: '2025-03-05T10:00:00Z', syncStatus: 'pending-import', candidateId: null },
  { submissionId: 'reg_20260522_002', tokenEmail: 'lead.candidate@email.com', fullName: 'Karthik Menon', email: 'lead.candidate@email.com', phone: '+91 90000 22222', dob: '1998-03-12', address: 'Whitefield, Bangalore', course: 'Full Stack', branch: 'Bangalore', submittedAt: '2025-03-06T10:00:00Z', syncStatus: 'candidate-created', candidateId: 'c7' }
]);

// 11. BGV_Responses
addSheet('BGV_Responses', [
  { responseId: 'bgv_20260522_001', candidateId: 'c1', fullName: 'Rahul Sharma', email: 'rahul.sharma@email.com', phone: '+91 98765 43210', aadhar: '1234 5678 9012', currentAddress: '42, MG Road, Bangalore, Karnataka 560001', emergencyContact: 'Anita Sharma +91 90000 33333', offerLetter: true, appraisals: true, payslips: true, relievingLetter: true, counterOffer: false, submittedAt: '2025-01-20T10:00:00Z', reviewStatus: 'in-review' }
]);

// 12. BGV_Response_Companies
addSheet('BGV_Response_Companies', [
  { responseId: 'bgv_20260522_001', candidateId: 'c1', sortOrder: 1, companyName: 'TCS', designation: 'Software Engineer', duration: '2020-2022' },
  { responseId: 'bgv_20260522_001', candidateId: 'c1', sortOrder: 2, companyName: 'Infosys', designation: 'Senior Developer', duration: '2022-2024' }
]);

// 13. Contact_Pool
addSheet('Contact_Pool', [
  { contactId: 'contact_001', email: 'recruiter1@company.com', label: 'Recruiter 1', source: 'default-settings', active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { contactId: 'contact_002', email: 'leads@branch.com', label: 'Branch Leads', source: 'default-settings', active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' },
  { contactId: 'contact_003', email: 'placements@pythonhr.com', label: 'Placement Team', source: 'default-settings', active: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' }
]);

// 14. Courses_Dropdown
addSheet('Courses_Dropdown', [
  { optionId: 'course_1', label: 'Python Core', active: true, sortOrder: 1, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'course_2', label: 'Full Stack', active: true, sortOrder: 2, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'course_3', label: 'Data Science', active: true, sortOrder: 3, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'course_4', label: 'Machine Learning', active: true, sortOrder: 4, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'course_5', label: 'Web Development', active: true, sortOrder: 5, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'course_6', label: 'Other', active: true, sortOrder: 6, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' }
]);

// 15. Branches_Dropdown
addSheet('Branches_Dropdown', [
  { optionId: 'branch_1', label: 'Chennai', active: true, sortOrder: 1, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'branch_2', label: 'Bangalore', active: true, sortOrder: 2, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' },
  { optionId: 'branch_3', label: 'Online', active: true, sortOrder: 3, source: 'HR Settings > Dropdowns', updatedAt: '2025-01-01' }
]);

// 16. App_Settings
addSheet('App_Settings', [
  { settingKey: 'orgName', settingValue: 'Python HR', notes: 'Displayed on public forms and settings', updatedAt: '2025-01-01' },
  { settingKey: 'bgvTeamEmail', settingValue: 'bgv-team@pythonhr.com', notes: 'BGV team mail id used by dispatch flow', updatedAt: '2025-01-01' },
  { settingKey: 'gasWebAppUrl', settingValue: 'https://script.google.com/macros/s/AKfycby7pYr1H1qy64W2_fiU_r3ezU3wgZ6cW6cfhDRqkK9TRsNjvTI3W1hMKv5QlXvEoiD2mA/exec', notes: 'Required for sending form links without backend server', updatedAt: '2025-01-01' },
  { settingKey: 'themeMode', settingValue: 'command', notes: 'UI preference only; app may persist this locally', updatedAt: '2025-01-01' }
]);

// 17. Sheet_Links
addSheet('Sheet_Links', [
  { linkKey: 'candidateMaster', label: 'Candidate Master Sheet', googleSheetUrl: null, notes: 'Primary candidate profile and status data' },
  { linkKey: 'registrations', label: 'Registration Responses Sheet', googleSheetUrl: null, notes: 'New registration form submissions' },
  { linkKey: 'bgvResponses', label: 'BGV Responses Sheet', googleSheetUrl: null, notes: 'Background verification form submissions' },
  { linkKey: 'financials', label: 'Financial Pipeline Sheet', googleSheetUrl: null, notes: 'Fee, payment, discount, and due records' },
  { linkKey: 'auditLogs', label: 'Audit Logs Sheet', googleSheetUrl: null, notes: 'Structural, BGV, and financial change history' },
  { linkKey: 'settings', label: 'Settings Sheet', googleSheetUrl: null, notes: 'Dropdowns, branches, and app configuration' }
]);

const filePath = path.join(__dirname, 'pycrm_database.xlsx');
xlsx.writeFile(workbook, filePath);
console.log(`Excel database successfully generated at: ${filePath}`);
