import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function ModalWindow({ isOpen, onClose, title, children, footer, maxWidth = '480px' }: ModalWindowProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-cc-base-deep/88"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div
              className="w-full bg-cc-base-surface border border-cc-gridline rounded p-6 shadow-panel"
              style={{ maxWidth }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-sans text-sm font-semibold text-cc-text-high">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-cc-base-elevated rounded transition-colors">
                  <X size={20} className="text-cc-text-mid" />
                </button>
              </div>

              {/* Body */}
              <div className="font-sans text-[13px] text-cc-text-high leading-relaxed">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex justify-end gap-3 mt-6">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
