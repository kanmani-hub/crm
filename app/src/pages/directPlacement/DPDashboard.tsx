import { useState, useEffect, useRef, useMemo } from 'react';
import { motion} from 'framer-motion';
import { 
  Users, CheckCircle, IndianRupee, RefreshCw, 
  FileText, AlertTriangle, Search, X, Activity
} from 'lucide-react';
import {  useNavigate } from 'react-router';
import { useDPStore } from '@/store/useDPStore';
import TopNavigationBar from '@/components/TopNavigationBar';
import Toast from '@/components/Toast';
import { useStore } from '@/store/useStore';
import { exportToExcel, exportMultiSheetExcel } from '@/lib/exportUtils';
import { dpSheetsApi } from '@/services/dpSheetsApi';
import { sheetsApi } from '@/services/sheetsApi';

export default function DPDashboard() {
  const {
    candidates,
    dashboardMetrics,
    fetchInitialData,
    refreshDashboard,
    syncCandidates,
    
    syncStatus,
    isFetchingData,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    bgvFilter, setBgvFilter,
    companyFilter, setCompanyFilter,
    experienceFilter, setExperienceFilter,
    paymentFilter, setPaymentFilter,
    yopFilter, setYopFilter,
    clearSearchQuery,
    auditLogs,
    loadAuditLogs
  } = useDPStore();
  
  const { settings } = useStore();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInitialData(true, true);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, bgvFilter, companyFilter, experienceFilter, paymentFilter, yopFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchInitialData(true, true);
      loadAuditLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchInitialData, loadAuditLogs]);

  const [selectedToggle, setSelectedToggle] = useState<'direct-placement-form' | 'direct-bgv-form' | 'contact-mail'>('direct-placement-form');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateEmailError, setCandidateEmailError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const submitToGoogleWindow = (toEmail: string, ccEmail: string, formType: string, formLink: string) => {
    if (!settings?.gasWebAppUrl) {
      console.error('MISSING_GAS_URL');
      return;
    }
    const formData = new URLSearchParams();
    formData.append('to', toEmail);
    formData.append('cc', ccEmail);
    formData.append('formType', formType);
    formData.append('formLink', formLink);

    fetch(settings.gasWebAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    }).catch(err => console.error("Error dispatching email:", err));
  };

  const handleSend = async (id: string, type: string) => {
    if (selectedToggle !== 'contact-mail') {
      if (!candidateEmail.trim()) {
        setCandidateEmailError('Please enter an email address');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(candidateEmail.trim())) {
        setCandidateEmailError('Please enter a valid email');
        return;
      }
    }

    if (selectedToggle === 'contact-mail') {
      if (!newContactEmail) {
        setContactError('No recipient specified.');
        return;
      }
      if (!contactSubject || !contactMessage) {
        setContactError('Subject and message are required.');
        return;
      }

      setIsSending(true);
      setContactError('');
      
      try {
        await sheetsApi.sendContactMail({
          recipient: newContactEmail,
          subject: contactSubject,
          message: contactMessage,
          userStamp: 'DP-Admin'
        });
        
        setDispatchSuccess(true);
        setTimeout(() => setDispatchSuccess(false), 3000);
        setNewContactEmail('');
        setContactSubject('');
        setContactMessage('');
      } catch (err: any) {
        setContactError(err.message || 'Failed to send contact mail.');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Direct Placement Form
    if (selectedToggle === 'direct-placement-form') {
      const url = settings?.googleSheetLinks?.dpRegistrationForm;
      if (!url) {
        setCandidateEmailError('Direct Placement Form link not configured in Settings.');
        return;
      }
      submitToGoogleWindow(
        candidateEmail.trim(),
        settings?.hrCCEmail || '',
        'DP_Registration',
        url
      );
      setDispatchSuccess(true);
      setTimeout(() => setDispatchSuccess(false), 2000);
      setCandidateEmail('');
      return;
    }

    // Direct Placement BGV Form
    if (selectedToggle === 'direct-bgv-form') {
      const url = settings?.googleSheetLinks?.dpBgvForm;
      if (!url) {
        setCandidateEmailError('Direct Placement BGV Form link not configured in Settings.');
        return;
      }
      submitToGoogleWindow(
        candidateEmail.trim(),
        settings?.hrCCEmail || '',
        'DP_BGV',
        url
      );
      setDispatchSuccess(true);
      setTimeout(() => setDispatchSuccess(false), 2000);
      setCandidateEmail('');
      return;
    }
  };

  
  const handleExportBackup = async (type: string) => {
    try {
      setIsExporting(true);
      const data = await dpSheetsApi.fetchAllData();
      const dateStr = new Date().toISOString().split('T')[0];
      const suffix = `${dateStr}`;

      switch (type) {
        case 'candidates':
          exportToExcel(data.candidates || [], `DP_Candidates_${suffix}.xlsx`, 'Direct_Placement_Master');
          break;
        case 'finances':
          exportToExcel(data.financials || [], `DP_Financials_${suffix}.xlsx`, 'Direct_Financial_Ledger');
          break;
        case 'audit':
          exportToExcel(data.auditLogs || [], `DP_Audit_Logs_${suffix}.xlsx`, 'Direct_System_Audit_Logs');
          break;
        case 'full':
          exportMultiSheetExcel(
            {
              'Direct_Placement_Master': data.candidates || [],
              'Direct_Financial_Ledger': data.payments || [],
              'Direct_System_Audit_Logs': data.auditLogs || []
            },
            `DP_Full_Backup_${suffix}.xlsx`
          );
          break;
      }
    } catch (err) {
      console.error('Backup failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalCandidates = dashboardMetrics?.totalCandidates || candidates.length;
  const placedCount = candidates.filter(c => c.candidateStatus === 'completed' || c.trackedStatus === 'cleared').length;
  const pendingBgv = dashboardMetrics?.bgvPending || candidates.filter(c => c.bgvStatus === 'pending').length;
  
  let totalRevenue = dashboardMetrics?.revenue || 0;
  if (!dashboardMetrics?.revenue) {
    candidates.forEach(c => {
      if (c.financials) {
        c.financials.forEach(f => { totalRevenue += f.paidToDate; });
      }
    });
  }

  let pendingDues = dashboardMetrics?.pendingDues || 0;
  if (!dashboardMetrics?.pendingDues) {
    candidates.forEach(c => {
      if (c.financials) {
        c.financials.forEach(f => {
          const totalAdj = f.adjustments.reduce((sum, a) => sum + a.amount, 0);
          pendingDues += (f.baseFee + totalAdj) - f.paidToDate;
        });
      }
    });
  }

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchSearch = 
          c.fullName?.toLowerCase().includes(query) ||
          c.placementId?.toLowerCase().includes(query) ||
          c.mobileNumber?.includes(query) ||
          c.companyName?.toLowerCase().includes(query);
        if (!matchSearch) return false;
      }

      if (statusFilter && c.candidateStatus?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (bgvFilter && c.bgvStatus?.toLowerCase() !== bgvFilter.toLowerCase()) return false;
      if (experienceFilter && c.experienceType?.toLowerCase() !== experienceFilter.toLowerCase()) return false;
      
      if (paymentFilter) {
         let isPending = false;
         let isPaid = false;
         if (c.financials && c.financials.length > 0) {
           const hasDues = c.financials.some(f => ((f.baseFee || 0) + f.adjustments.reduce((sum,a) => sum + (a.amount||0), 0)) - (f.paidToDate || 0) > 0);
           if (hasDues) isPending = true;
           else isPaid = true;
         }
         if (paymentFilter === 'pending' && !isPending) return false;
         if (paymentFilter === 'paid' && !isPaid) return false;
      }

      if (companyFilter && !c.companyName?.toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (yopFilter && !c.yearOfPassing?.toString().includes(yopFilter)) return false;

      return true;
    });
  }, [candidates, searchQuery, statusFilter, bgvFilter, experienceFilter, paymentFilter, companyFilter, yopFilter]);

  return (
    <div className="min-h-screen bg-cc-bg">
      <TopNavigationBar />
      
      <div className="pt-20 px-4 md:px-8 max-w-[1600px] mx-auto pb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-sans font-bold text-cc-text-high tracking-tight">Direct Placement</h1>
            {syncStatus === 'syncing' ? (
              <span className="flex items-center gap-1 font-mono text-[10px] text-cc-warm-text bg-[rgba(184,92,61,0.1)] px-2 py-0.5 rounded">
                <RefreshCw size={10} className="animate-spin" /> SYNCING
              </span>
            ) : syncStatus === 'error' ? (
              <span className="flex items-center gap-1 font-mono text-[10px] text-cc-danger bg-[rgba(201,75,75,0.1)] px-2 py-0.5 rounded">
                <AlertTriangle size={10} /> SYNC ERROR
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono text-[10px] text-cc-text-mid bg-cc-base-elevated px-2 py-0.5 rounded border border-cc-gridline">
                <CheckCircle size={10} className="text-cc-green" /> SYNCED
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => { await syncCandidates(); await fetchInitialData(true); }}
              disabled={syncStatus === 'syncing'}
              className="font-mono text-[10px] text-cc-text-high hover:text-cc-brand flex items-center gap-1 transition-colors px-3 py-1 bg-cc-base-elevated rounded border border-cc-gridline"
            >
              <RefreshCw size={12} className={syncStatus === 'syncing' ? "animate-spin" : ""} /> Manual Sync
            </button>
            <button 
              onClick={() => { fetchInitialData(true); refreshDashboard(true); }}
              className="font-mono text-[10px] text-cc-text-mid hover:text-cc-warm-text flex items-center gap-1 transition-colors px-2 py-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* DP KPI CARDS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-[1360px] mx-auto"
        >
          {[
            { label: 'Total Placements', value: totalCandidates, icon: Users, color: 'text-cc-blue' },
            { label: 'Placed Candidates', value: placedCount, icon: CheckCircle, color: 'text-cc-green' },
            { label: 'Pending BGV', value: pendingBgv, icon: FileText, color: 'text-cc-warn' },
            { label: 'Revenue Received', value: `₹${(totalRevenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-cc-text-high' },
            { label: 'Pending Dues', value: `₹${(pendingDues || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-cc-danger' },
          ].map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-cc-base-elevated border border-cc-gridline rounded-md p-4 flex items-center gap-3 hover:border-cc-warm-primary transition-colors">
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-cc-base-surface border border-cc-gridline/50`}>
                  <Icon size={16} className={kpi.color} />
                </div>
                <div className="min-w-0">
                  <p className="micro-text text-cc-text-mid truncate leading-none uppercase">{kpi.label}</p>
                  <p className="text-xl font-mono text-cc-text-high mt-1.5 leading-none">{kpi.value}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Global Prominent Search Panel for DP */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-4 w-full max-w-[1360px] mx-auto"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(360px,1fr)_auto] lg:items-start mb-2">
            <div className="relative">
              <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-cc-warm-text" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by DP Candidate Name, ID, Email, Phone or Company..."
                className="w-full h-16 bg-cc-base-surface border border-cc-gridline rounded pl-14 pr-12 font-sans text-[17px] text-cc-text-high placeholder:text-cc-text-mid focus:outline-none focus:border-cc-warm-primary focus:shadow-[0_0_0_3px_rgba(184,92,61,0.16),0_18px_48px_rgba(0,0,0,0.34)] shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => clearSearchQuery()}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded text-cc-text-mid hover:text-cc-danger hover:bg-[rgba(201,75,75,0.1)] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 lg:items-end">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto mt-2">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 bg-cc-base-elevated border border-cc-gridline rounded font-sans text-sm text-cc-text-high focus:outline-none focus:border-cc-warm-primary min-w-[120px]">
                  <option value="">Status: All</option>
                  <option value="registered">Registered</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="placed">Placed</option>
                </select>

                <select value={bgvFilter} onChange={(e) => setBgvFilter(e.target.value)} className="h-10 px-3 bg-cc-base-elevated border border-cc-gridline rounded font-sans text-sm text-cc-text-high focus:outline-none focus:border-cc-warm-primary min-w-[120px]">
                  <option value="">BGV: All</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="cleared">Cleared</option>
                </select>

                <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className="h-10 px-3 bg-cc-base-elevated border border-cc-gridline rounded font-sans text-sm text-cc-text-high focus:outline-none focus:border-cc-warm-primary min-w-[120px]">
                  <option value="">Exp: All</option>
                  <option value="fresher">Fresher</option>
                  <option value="experienced">Experienced</option>
                </select>
                
                <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-10 px-3 bg-cc-base-elevated border border-cc-gridline rounded font-sans text-sm text-cc-text-high focus:outline-none focus:border-cc-warm-primary min-w-[120px]">
                  <option value="">Payment: All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>

                <input type="text" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} placeholder="Company" className="h-10 px-3 bg-cc-base-elevated border border-cc-gridline rounded font-sans text-sm text-cc-text-high placeholder:text-cc-text-mid focus:outline-none focus:border-cc-warm-primary" />
                <input type="text" value={yopFilter} onChange={(e) => setYopFilter(e.target.value)} placeholder="Year of Passing" className="h-10 px-3 bg-cc-base-elevated border border-cc-gridline rounded font-sans text-sm text-cc-text-high placeholder:text-cc-text-mid focus:outline-none focus:border-cc-warm-primary" />
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3 px-1">
            {isFetchingData ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-cc-warm-text">
                <RefreshCw size={10} className="animate-spin" />
                Loading Direct Placement Candidates...
              </span>
            ) : candidates.length === 0 ? (
              <>
                <span className="font-mono text-[10px] text-cc-danger">
                  ⚠ No candidates loaded — verify backend synchronization.
                </span>
                <button
                  onClick={() => fetchInitialData(true)}
                  className="font-mono text-[10px] text-cc-warm-text underline hover:no-underline"
                >
                  Retry
                </button>
              </>
            ) : (
              <span className="font-mono text-[10px] text-cc-text-mid">
                Showing <strong className="text-cc-text-high">{filteredCandidates.length}</strong> placement candidates
              </span>
            )}
          </div>
        </motion.div>

        {/* CANDIDATES TABLE */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 max-w-[1360px] mx-auto bg-cc-base-elevated border border-cc-gridline rounded-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cc-base-surface border-b border-cc-gridline text-cc-text-mid font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-3 font-semibold">Placement ID</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Company</th>
                  <th className="p-3 font-semibold">Designation</th>
                  <th className="p-3 font-semibold">Experience</th>
                  <th className="p-3 font-semibold">BGV Status</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => (
                  <tr 
                    key={c.placementId} 
                    onClick={() => navigate(`/dp/candidate/${c.placementId}`)}
                    className="border-b border-cc-gridline/50 hover:bg-cc-base-surface transition-colors cursor-pointer group"
                  >
                    <td className="p-3 font-mono text-sm text-cc-warm-text">{c.placementId}</td>
                    <td className="p-3 font-sans text-sm font-semibold text-cc-text-high">{c.fullName || '-'}</td>
                    <td className="p-3 font-sans text-sm text-cc-text-mid">{c.companyName || '-'}</td>
                    <td className="p-3 font-sans text-sm text-cc-text-mid">{c.designation || '-'}</td>
                    <td className="p-3 font-sans text-sm text-cc-text-mid capitalize">{c.experienceType || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider ${
                        c.bgvStatus === 'cleared' ? 'bg-[rgba(91,168,124,0.15)] text-[#5BA87C]' :
                        c.bgvStatus === 'submitted' ? 'bg-[rgba(91,143,191,0.15)] text-[#5B8FBF]' :
                        'bg-[rgba(201,168,76,0.15)] text-[#C9A84C]'
                      }`}>
                        {c.bgvStatus || 'pending'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-cc-warm-primary font-mono text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        View Profile →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
        {/* Change Log Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 max-w-[1360px] mx-auto"
        >
          <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cc-gridline/50">
              <Activity size={15} className="text-cc-warm-text" />
              <span className="section-header">SYSTEM CHANGE LOG</span>
            </div>
            
            <div className="overflow-x-auto">
              {auditLogs && auditLogs.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cc-gridline">
                      <th className="py-2 px-3 font-mono text-[10px] font-semibold uppercase text-cc-text-mid">Date & Time</th>
                      <th className="py-2 px-3 font-mono text-[10px] font-semibold uppercase text-cc-text-mid">Candidate</th>
                      <th className="py-2 px-3 font-mono text-[10px] font-semibold uppercase text-cc-text-mid">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 15).map((log) => {
                      const dt = new Date(log.timestamp);
                      const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                      
                      let candidateName = '-';
                      const candidate = candidates.find(c => c.placementId === log.placementId);
                      if (candidate) candidateName = candidate.fullName || candidate.placementId;
                      else if (log.placementId) candidateName = log.candidateName || log.placementId || '-';
                      
                      return (
                        <tr key={log.id} className="border-b border-cc-gridline/50 hover:bg-cc-base-elevated transition-colors">
                          <td className="py-2 px-3 font-sans text-[12px] text-cc-text-mid whitespace-nowrap">
                            <span className="text-cc-text-high">{dateStr}</span> <span className="text-cc-text-low text-[11px]">{timeStr}</span>
                          </td>
                          <td className="py-2 px-3 font-sans text-[13px] font-semibold text-cc-text-high">
                            {candidateName}
                          </td>
                          <td className="py-2 px-3 font-sans text-[12px] text-cc-text-mid">
                            {log.description || log.action}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-cc-text-mid font-mono text-xs">
                  No system changes recorded.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      <Toast />
    </div>
  );
}
