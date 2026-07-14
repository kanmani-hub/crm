import { useState } from 'react';
import { Database, Users, ShieldCheck, IndianRupee, History, Download, HardDrive } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { sheetsApi } from '@/services/sheetsApi';
import TopNavigationBar from '@/components/TopNavigationBar';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

export default function BackupCenter() {
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const showToast = useStore((s) => s.showToast);

  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const handleExport = async (type: string, title: string) => {
    setLoadingType(type);
    showToast(`Generating ${title} in Excel format. Please wait...`, 'info');
    try {
      let sheetNames: string[] = [];
      if (type === 'training_master') sheetNames = ['Master_Candidates'];
      else if (type === 'training_bgv') sheetNames = ['BGV_Responses'];
      else if (type === 'dp_master') sheetNames = ['Direct_Placement_Master'];
      else if (type === 'dp_bgv') sheetNames = ['DP_BGV_Responses'];
      else if (type === 'training_finance') sheetNames = ['Payment_Records', 'Financial_Ledger'];
      else if (type === 'dp_finance') sheetNames = ['Direct_Payment_Records', 'Direct_Financial_Ledger', 'Direct_Adjustment_Records'];
      else if (type === 'training_audit') sheetNames = ['System_Audit_Logs'];
      else if (type === 'dp_audit') sheetNames = ['Direct_System_Audit_Logs'];
      else if (type === 'full_crm') sheetNames = ['Master_Candidates', 'BGV_Responses', 'Payment_Records', 'Financial_Ledger', 'System_Audit_Logs', 'Direct_Placement_Master', 'DP_BGV_Responses', 'Direct_Payment_Records', 'Direct_Financial_Ledger', 'Direct_Adjustment_Records', 'Direct_System_Audit_Logs'];

      const data = await sheetsApi.getRawSheetData(sheetNames, selectedMonth);
      
      let hasData = false;
      const wb = XLSX.utils.book_new();
      for (const sheetName of sheetNames) {
        if (data[sheetName] && data[sheetName].length > 1) {
          hasData = true;
          const ws = XLSX.utils.aoa_to_sheet(data[sheetName]);
          XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel sheet names max 31 chars
        }
      }
      
      if (!hasData) {
        const readableMonth = selectedMonth ? new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : 'the selected period';
        showToast(`No records found for ${readableMonth}.`, 'error');
        return;
      }
      
      const dateStr = selectedMonth || new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${title.replace(/ /g, '_')}_${dateStr}.xlsx`);
      
      showToast(`${title} downloaded successfully!`);
    } catch (err: any) {
      const errorMsg = err.message || `Failed to generate ${title}.`;
      showToast(errorMsg, 'error');
      console.error(err);
    } finally {
      setLoadingType(null);
    }
  };

  const backups = [
    {
      type: 'training_master',
      title: 'TRAINING MASTER CANDIDATES',
      desc: 'Export all Training CRM candidate profiles from Master_Candidates.',
      btn: 'EXPORT MASTER CANDIDATES',
      icon: Users
    },
    {
      type: 'training_bgv',
      title: 'TRAINING BGV',
      desc: 'Export all Training CRM background verification records.',
      btn: 'EXPORT TRAINING BGV',
      icon: ShieldCheck
    },
    {
      type: 'dp_master',
      title: 'DIRECT PLACEMENT CANDIDATES',
      desc: 'Export all Direct Placement candidate profiles.',
      btn: 'EXPORT DP CANDIDATES',
      icon: Users
    },
    {
      type: 'dp_bgv',
      title: 'DIRECT PLACEMENT BGV',
      desc: 'Export all Direct Placement background verification records.',
      btn: 'EXPORT DP BGV',
      icon: ShieldCheck
    },
    {
      type: 'training_finance',
      title: 'TRAINING FINANCES',
      desc: 'Export Training CRM payment records and financial ledger.',
      btn: 'EXPORT TRAINING FINANCES',
      icon: IndianRupee
    },
    {
      type: 'dp_finance',
      title: 'DIRECT PLACEMENT FINANCES',
      desc: 'Export Direct Placement payment records and financial ledger.',
      btn: 'EXPORT DP FINANCES',
      icon: IndianRupee
    },
    {
      type: 'training_audit',
      title: 'TRAINING AUDIT LOGS',
      desc: 'Export Training CRM system audit history.',
      btn: 'EXPORT TRAINING AUDIT LOGS',
      icon: History
    },
    {
      type: 'dp_audit',
      title: 'DIRECT PLACEMENT AUDIT LOGS',
      desc: 'Export Direct Placement system audit history.',
      btn: 'EXPORT DP AUDIT LOGS',
      icon: History
    }
  ];

  return (
    <div className="min-h-screen bg-cc-base-deep pt-14 pb-20">
      <TopNavigationBar />

      <main className="max-w-[1200px] mx-auto px-4 lg:px-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-cc-base-surface border border-cc-gridline rounded-lg p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-cc-gridline/50">
              <div className="flex items-center gap-2.5">
                <Database size={18} className="text-cc-warm-text" />
                <span className="font-mono text-base font-semibold tracking-[0.12em] uppercase text-cc-text-high">BACKUP CENTER</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="font-mono text-[11px] text-cc-text-mid uppercase tracking-wide">Select Month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-8 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-mono text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            {selectedMonth && (
              <div className="mb-6 p-3 bg-cc-warm-primary/10 border border-cc-warm-primary/20 rounded text-center">
                <span className="font-sans text-[13px] text-cc-text-high">
                  Selected Backup Period: <strong className="text-cc-warm-text ml-1">{new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {backups.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.type} className="bg-cc-base-elevated border border-cc-gridline rounded p-4 flex flex-col h-full">
                    <h3 className="font-mono text-[13px] text-cc-text-high mb-2 tracking-wide uppercase">{b.title}</h3>
                    <p className="font-sans text-[12px] text-cc-text-mid mb-6 flex-grow">{b.desc}</p>
                    <button
                      onClick={() => handleExport(b.type, b.title)}
                      disabled={loadingType !== null}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-cc-base-surface text-cc-text-high border border-cc-gridline rounded font-mono text-[10px] font-semibold uppercase tracking-wider hover:bg-cc-gridline disabled:opacity-50 transition-all"
                    >
                      {loadingType === b.type ? (
                        <>EXPORTING...</>
                      ) : (
                        <>
                          <Icon size={13} /> {b.btn}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* FULL CRM BACKUP */}
            <div className="mt-8 border-t border-cc-gridline/50 pt-8">
              <div className="bg-cc-base-elevated border border-cc-warm-primary/30 rounded p-6 shadow-inset-glow relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cc-warm-primary/5 via-transparent to-cc-warm-primary/5 pointer-events-none" />
                
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                  <div className="flex justify-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-cc-warm-primary/10 border border-cc-warm-primary/20 flex items-center justify-center text-cc-warm-text">
                      <HardDrive size={18} />
                    </div>
                  </div>
                  <h3 className="font-mono text-[15px] font-semibold tracking-wider text-cc-text-high mb-2 uppercase">Full CRM Backup</h3>
                  <p className="font-sans text-[13px] text-cc-text-mid mb-6">Complete backup of Training CRM and Direct Placement CRM sheets.</p>
                  
                  <button
                    onClick={() => handleExport('full_crm', 'FULL CRM BACKUP')}
                    disabled={loadingType !== null}
                    className="w-full sm:w-auto sm:px-12 mx-auto flex items-center justify-center gap-2 h-10 bg-cc-warm-primary text-white rounded font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-cc-warm-hover disabled:opacity-50 shadow-[0_2px_10px_rgba(255,107,53,0.3)] transition-all"
                  >
                    {loadingType === 'full_crm' ? (
                      <>EXPORTING...</>
                    ) : (
                      <>
                        <Download size={14} /> EXPORT FULL CRM BACKUP
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </main>
    </div>
  );
}
