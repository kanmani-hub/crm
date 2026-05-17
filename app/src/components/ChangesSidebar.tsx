import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AuditLogEntry, LogType } from '@/types';

const mockLogs: AuditLogEntry[] = [
  {
    id: 'l1',
    candidateId: 'c1',
    logType: 'structural',
    description: 'Applied discount: Corporate Waiver (-Rs.2,000)',
    reason: 'Branch Manager approved early-bird corporate waiver',
    userStamp: 'HR-A',
    timestamp: '2025-01-10T10:30:00Z',
  },
  {
    id: 'l2',
    candidateId: 'c1',
    logType: 'financial',
    description: 'Payment received: Rs.4,500 for Registration',
    userStamp: 'HR-A',
    timestamp: '2025-01-15T14:20:00Z',
  },
  {
    id: 'l3',
    candidateId: 'c1',
    logType: 'structural',
    description: 'Updated base fee: Registration from Rs.5,000 to Rs.4,500',
    reason: 'Negotiated discount with candidate family',
    userStamp: 'HR-B',
    timestamp: '2025-02-01T09:15:00Z',
  },
  {
    id: 'l4',
    candidateId: 'c1',
    logType: 'bgv',
    description: 'BGV status changed to Pending',
    userStamp: 'HR-A',
    timestamp: '2025-01-20T11:00:00Z',
  },
  {
    id: 'l5',
    candidateId: 'c1',
    logType: 'financial',
    description: 'Payment received: Rs.25,000 for Course Fee',
    userStamp: 'HR-A',
    timestamp: '2025-02-10T16:45:00Z',
  },
];

const typeConfig: Record<LogType, { dot: string; label: string }> = {
  financial: { dot: 'bg-cc-green', label: 'FINANCIAL' },
  structural: { dot: 'bg-cc-blue', label: 'STRUCTURAL' },
  bgv: { dot: 'bg-cc-status-amber', label: 'BGV' },
};

export default function ChangesSidebar() {
  const { sidebarOpen, setSidebarOpen, activeProfileId, getCandidateById } = useStore();
  const candidate = activeProfileId ? getCandidateById(activeProfileId) : null;

  const filteredLogs = mockLogs.filter((l) => l.candidateId === activeProfileId);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      {/* Trigger tab */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[90] w-[120px] h-9 bg-cc-warm-primary text-white font-mono text-[10px] font-semibold uppercase tracking-[0.08em] rounded-t-sm -rotate-90 origin-bottom-right hover:bg-cc-warm-primary-hover transition-colors shadow-panel"
        style={{ transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center center' }}
      >
        CHANGES
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[92] bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-14 bottom-0 w-full max-w-[420px] bg-cc-base-deep border-l border-cc-gridline z-[95] shadow-drawer flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cc-gridline">
              <div>
                <h3 className="section-header">CHANGE LOG</h3>
                {candidate && (
                  <p className="font-sans text-sm font-medium text-cc-text-high mt-1">{candidate.fullName}</p>
                )}
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-cc-base-elevated rounded transition-colors">
                <X size={20} className="text-cc-text-mid" />
              </button>
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <p className="font-sans text-sm text-cc-text-mid">No changes recorded for this candidate</p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const cfg = typeConfig[log.logType];
                  return (
                    <div key={log.id} className="p-4 border-b border-[rgba(42,48,56,0.5)]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.06em] text-cc-text-mid">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-sans text-[13px] text-cc-text-high mt-1.5">{log.description}</p>
                      {log.reason && (
                        <p className="font-sans text-xs text-cc-warm-text italic mt-1">{log.reason}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-cc-base-elevated flex items-center justify-center font-mono text-[8px] text-cc-text-mid">
                            {log.userStamp.slice(0, 2)}
                          </span>
                          <span className="micro-text text-cc-text-mid">{log.userStamp}</span>
                        </div>
                        <span className="micro-text text-cc-text-low">{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
