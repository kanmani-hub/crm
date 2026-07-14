import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { DocumentStatus } from '@/types';
import { FileText, TrendingUp, Banknote, LogOut, RefreshCw, History, Eye, Download, Trash, Upload, Loader2 } from 'lucide-react';

const trainingDocItems = [
  { key: 'offerLetter' as const, label: 'Offer Letter', icon: FileText },
  { key: 'appraisals' as const, label: 'Appraisals', icon: TrendingUp },
  { key: 'payslips' as const, label: 'Payslips', icon: Banknote },
  { key: 'relievingLetter' as const, label: 'Relieving Letter', icon: LogOut },
  { key: 'counterOffer' as const, label: 'Counter Offer', icon: RefreshCw },
];

const dpDocItems = [
  { key: 'offerLetter' as const, label: 'Offer Letter', icon: FileText },
  { key: 'relievingLetter' as const, label: 'Relieving Letter', icon: LogOut },
  { key: 'appraisals' as const, label: 'PF Service History', icon: History }, // Mapped to pfServiceHistory internally
  { key: 'payslips' as const, label: 'Payslip', icon: Banknote }, // Mapped to payslip internally
];

interface DocumentVaultProps {
  mode?: 'training' | 'dp';
  received: DocumentStatus;
  applied: DocumentStatus;
  onToggleReceived: (key: keyof DocumentStatus) => void;
  onToggleApplied: (key: keyof DocumentStatus) => void;
  fileUrls?: Partial<Record<keyof DocumentStatus, string>>;
  onUpload?: (key: keyof DocumentStatus, file: File) => Promise<void>;
  onDelete?: (key: keyof DocumentStatus) => Promise<void>;
}

function CheckboxItem({
  item,
  checked,
  onToggle,
  mode,
  fileUrl,
  onUpload,
  onDelete
}: {
  item: { key: keyof DocumentStatus; label: string; icon: any };
  checked: boolean;
  onToggle: () => void;
  mode: 'training' | 'dp';
  fileUrl?: string;
  onUpload?: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const Icon = item.icon;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      setLoading(true);
      await onUpload(file);
      setLoading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && window.confirm(`Are you sure you want to delete ${item.label}?`)) {
      setLoading(true);
      await onDelete();
      setLoading(false);
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileUrl) window.open(fileUrl, '_blank');
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileUrl) {
      // Force download if possible, else open in new tab
      const a = document.createElement('a');
      a.href = fileUrl;
      a.target = '_blank';
      a.download = item.label;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[rgba(42,48,56,0.3)] w-full text-left hover:bg-cc-base-elevated/30 transition-colors rounded pr-2 group">
      <button onClick={onToggle} className="flex items-center justify-center flex-shrink-0 ml-2">
        <motion.div
          animate={{
            backgroundColor: checked ? '#5BA87C' : '#22262E',
            borderColor: checked ? '#5BA87C' : '#2A3038',
          }}
          transition={{ duration: 0.2 }}
          className="w-[18px] h-[18px] rounded-sm border flex items-center justify-center"
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
      </button>

      <button onClick={onToggle} className="flex items-center gap-2 flex-grow text-left">
        <Icon size={16} className={checked ? 'text-cc-text-high' : 'text-cc-text-low'} />
        <span className={`font-sans text-[13px] ${checked ? 'text-cc-text-high' : 'text-cc-text-low'}`}>
          {item.label}
        </span>
      </button>

      <div className="flex items-center gap-2 flex-shrink-0">
        {mode === 'dp' && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {loading ? (
              <Loader2 size={14} className="animate-spin text-cc-text-mid mr-2" />
            ) : (
              <>
                {fileUrl ? (
                  <>
                    <button onClick={handleViewClick} title="Preview" className="p-1 hover:bg-cc-base-elevated-strong rounded text-cc-text-mid hover:text-cc-blue">
                      <Eye size={14} />
                    </button>
                    <button onClick={handleDownloadClick} title="Download" className="p-1 hover:bg-cc-base-elevated-strong rounded text-cc-text-mid hover:text-cc-text-high">
                      <Download size={14} />
                    </button>
                    <button onClick={handleUploadClick} title="Replace" className="p-1 hover:bg-cc-base-elevated-strong rounded text-cc-text-mid hover:text-cc-warm-primary">
                      <RefreshCw size={14} />
                    </button>
                    <button onClick={handleDeleteClick} title="Delete" className="p-1 hover:bg-[rgba(235,87,87,0.1)] rounded text-cc-text-mid hover:text-[#EB5757]">
                      <Trash size={14} />
                    </button>
                  </>
                ) : (
                  <button onClick={handleUploadClick} title="Upload" className="p-1 hover:bg-cc-base-elevated-strong rounded text-cc-text-mid hover:text-cc-green">
                    <Upload size={14} />
                  </button>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              </>
            )}
          </div>
        )}

        {checked ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-cc-green w-[50px] text-right">
            RECEIVED
          </span>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-cc-status-amber w-[50px] text-right">
            PENDING
          </span>
        )}
      </div>
    </div>
  );
}

export default function DocumentVault({ mode = 'training', received, applied, onToggleReceived, onToggleApplied, fileUrls, onUpload, onDelete }: DocumentVaultProps) {
  const docItems = mode === 'dp' ? dpDocItems : trainingDocItems;
  const targetCount = mode === 'dp' ? 4 : 5;
  
  // Calculate counts based on the active items
  const receivedCount = docItems.filter(item => received[item.key]).length;
  const appliedCount = docItems.filter(item => applied[item.key]).length;

  return (
    <div className="bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-inset-glow">
      <h3 className="section-header mb-6">DOCUMENT VAULT</h3>
      <div className={`grid grid-cols-1 ${mode === 'dp' ? '' : 'md:grid-cols-2'} gap-6`}>
        {/* Documents Received */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="section-header">DOCUMENTS RECEIVED</span>
            <span className="font-mono text-[10px] text-cc-text-mid">({receivedCount}/{targetCount})</span>
          </div>
          <div className="space-y-0 bg-cc-base-deep rounded border border-cc-gridline overflow-hidden">
            {docItems.map((item) => (
              <CheckboxItem
                key={item.key}
                item={item}
                checked={!!received[item.key]}
                onToggle={() => onToggleReceived(item.key)}
                mode={mode}
                fileUrl={fileUrls?.[item.key]}
                onUpload={onUpload ? (file) => onUpload(item.key, file) : undefined}
                onDelete={onDelete ? () => onDelete(item.key) : undefined}
              />
            ))}
          </div>
        </div>

        {/* Documents Applied - hide for DP for now to save space, or show if training */}
        {mode === 'training' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="section-header">DOCUMENTS APPLIED</span>
              <span className="font-mono text-[10px] text-cc-text-mid">({appliedCount}/{targetCount})</span>
            </div>
            <div className="space-y-0 bg-cc-base-deep rounded border border-cc-gridline overflow-hidden">
              {docItems.map((item) => (
                <CheckboxItem
                  key={item.key}
                  item={item}
                  checked={!!applied[item.key]}
                  onToggle={() => onToggleApplied(item.key)}
                  mode={mode}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
