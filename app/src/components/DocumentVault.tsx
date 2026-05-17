import { motion } from 'framer-motion';
import type { DocumentStatus } from '@/types';
import { FileText, TrendingUp, Banknote, LogOut, RefreshCw } from 'lucide-react';

const docItems = [
  { key: 'offerLetter' as keyof DocumentStatus, label: 'Offer Letter', icon: FileText },
  { key: 'appraisals' as keyof DocumentStatus, label: 'Appraisals', icon: TrendingUp },
  { key: 'payslips' as keyof DocumentStatus, label: 'Payslips', icon: Banknote },
  { key: 'relievingLetter' as keyof DocumentStatus, label: 'Relieving Letter', icon: LogOut },
  { key: 'counterOffer' as keyof DocumentStatus, label: 'Counter Offer', icon: RefreshCw },
];

interface DocumentVaultProps {
  received: DocumentStatus;
  applied: DocumentStatus;
  onToggleReceived: (key: keyof DocumentStatus) => void;
  onToggleApplied: (key: keyof DocumentStatus) => void;
}

function CheckboxItem({
  item,
  checked,
  onToggle,
}: {
  item: (typeof docItems)[0];
  checked: boolean;
  onToggle: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 py-2.5 border-b border-[rgba(42,48,56,0.3)] w-full text-left hover:bg-cc-base-elevated/30 transition-colors rounded"
    >
      <motion.div
        animate={{
          backgroundColor: checked ? '#5BA87C' : '#22262E',
          borderColor: checked ? '#5BA87C' : '#2A3038',
        }}
        transition={{ duration: 0.2 }}
        className="w-[18px] h-[18px] rounded-sm border flex items-center justify-center flex-shrink-0"
      >
        {checked && (
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.15 }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <motion.path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.15 }}
            />
          </motion.svg>
        )}
      </motion.div>
      <Icon size={16} className={checked ? 'text-cc-text-high' : 'text-cc-text-low'} />
      <span className={`font-sans text-[13px] ${checked ? 'text-cc-text-high' : 'text-cc-text-low'}`}>
        {item.label}
      </span>
      {checked && (
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.04em] text-cc-green">
          RECEIVED
        </span>
      )}
      {!checked && (
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.04em] text-cc-status-amber">
          PENDING
        </span>
      )}
    </button>
  );
}

export default function DocumentVault({ received, applied, onToggleReceived, onToggleApplied }: DocumentVaultProps) {
  const receivedCount = Object.values(received).filter(Boolean).length;
  const appliedCount = Object.values(applied).filter(Boolean).length;

  return (
    <div className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow">
      <h3 className="section-header mb-6">DOCUMENT VAULT</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Documents Received */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="section-header">DOCUMENTS RECEIVED</span>
            <span className="font-mono text-[10px] text-cc-text-mid">({receivedCount}/5)</span>
          </div>
          <div className="space-y-0">
            {docItems.map((item) => (
              <CheckboxItem
                key={item.key}
                item={item}
                checked={received[item.key]}
                onToggle={() => onToggleReceived(item.key)}
              />
            ))}
          </div>
        </div>

        {/* Documents Applied */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="section-header">DOCUMENTS APPLIED</span>
            <span className="font-mono text-[10px] text-cc-text-mid">({appliedCount}/5)</span>
          </div>
          <div className="space-y-0">
            {docItems.map((item) => (
              <CheckboxItem
                key={item.key}
                item={item}
                checked={applied[item.key]}
                onToggle={() => onToggleApplied(item.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
