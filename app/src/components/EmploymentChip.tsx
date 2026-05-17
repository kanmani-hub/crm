import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface EmploymentChipProps {
  company: string;
  onRemove?: () => void;
  readOnly?: boolean;
}

export default function EmploymentChip({ company, onRemove, readOnly = false }: EmploymentChipProps) {
  return (
    <motion.span
      layout
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center gap-1 bg-[rgba(199,178,153,0.08)] border border-[rgba(199,178,153,0.15)] rounded-sm px-2 py-0.5"
    >
      <span className="font-mono text-[10px] font-medium tracking-[0.04em] text-cc-warm-text max-w-[100px] truncate">
        {company}
      </span>
      {!readOnly && onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-cc-danger transition-colors"
        >
          <X size={10} className="text-cc-text-low" />
        </button>
      )}
    </motion.span>
  );
}
