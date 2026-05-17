import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export default function Toast() {
  const { toastMessage, toastType, clearToast } = useStore();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(clearToast, 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  const icon = {
    success: <CheckCircle size={14} className="text-cc-green" />,
    error: <XCircle size={14} className="text-cc-danger" />,
    info: <Info size={14} className="text-cc-blue" />,
  };

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-2.5 bg-cc-base-surface border border-cc-gridline rounded shadow-panel"
        >
          {icon[toastType]}
          <span className="micro-text text-cc-text-high">{toastMessage}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
