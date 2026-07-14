import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useDPStore } from '@/store/useDPStore';

interface PaymentModalProps {
  mode: 'training' | 'dp';
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  defaultPipeline?: string;
}

const paymentTypes = [
  { type: 'registration', label: 'Registration Fee' },
  { type: 'course', label: 'Course Fee' },
  { type: 'document', label: 'Document Fee' },
  { type: 'placement', label: 'Placement Payment' },
];

export default function PaymentModal({ mode, isOpen, onClose, candidateId, candidateName, defaultPipeline = 'registration' }: PaymentModalProps) {
  const store = useStore();
  const dpStore = useDPStore();
  
  const activeStore = mode === 'dp' ? dpStore : store;
  const showToast = activeStore.showToast;
  const addPaymentRecord = mode === 'dp' ? dpStore.addPaymentRecord : store.addPaymentRecord;

  const [paymentType, setPaymentType] = useState<string>(defaultPipeline);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentType(defaultPipeline);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      setPaymentError('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, defaultPipeline]);

  const handleSavePayment = async () => {
    setPaymentError('');
    if (!candidateId || !candidateName) {
      setPaymentError('Candidate details missing (ID or Name). Cannot save.');
      return;
    }
    if (!paymentType) {
      setPaymentError('Select a payment type');
      return;
    }
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setPaymentError('Enter a valid payment amount > 0');
      return;
    }
    if (!paymentDate) {
      setPaymentError('Select a payment date');
      return;
    }

    setIsSavingPayment(true);
    try {
      const typeLabel = paymentTypes.find(t => t.type === paymentType)?.label || paymentType;
      
      const payload: any = {
        id: `pay_${Date.now()}`,
        candidateName,
        paymentType: typeLabel,
        amount: parseFloat(paymentAmount),
        paymentDate,
        pipelineType: paymentType,
        transactionRef: paymentRef,
        notes: paymentNotes,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      if (mode === 'dp') {
        payload.placementId = candidateId;
      } else {
        payload.candidateId = candidateId;
        payload.action = 'addPayment';
      }

      const result = await addPaymentRecord(payload);
      
      if (result && !result.success) {
        setPaymentError(result.error || 'Failed to save payment');
      } else {
        showToast(`Payment logged for ${typeLabel}`);
        onClose();
        if (mode === 'dp') {
           dpStore.loadAuditLogs(candidateId);
           dpStore.loadPaymentsForCandidate(candidateId);
        } else {
           store.loadPaymentsForCandidate(candidateId);
           store.loadAuditLogs();
        }
      }
    } catch (err: any) {
      setPaymentError(err.message || 'An error occurred while saving the payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -8 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="mb-5 rounded border border-[rgba(199,168,76,0.2)] bg-[rgba(201,168,76,0.06)] p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="micro-text text-cc-text-mid block mb-1">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
                >
                  {paymentTypes.map((type) => (
                    <option key={type.type} value={type.type}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="micro-text text-cc-text-mid block mb-1">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => { 
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setPaymentAmount(val); 
                    setPaymentError(''); 
                  }}
                  placeholder="0"
                  className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="micro-text text-cc-text-mid block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={isSavingPayment}
                  className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="micro-text text-cc-text-mid block mb-1">Transaction / Ref ID</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  disabled={isSavingPayment}
                  placeholder="TXN12345"
                  className="w-full h-9 bg-cc-base-elevated border border-cc-gridline rounded px-2 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="micro-text text-cc-text-mid block mb-1">Notes / Remarks</label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                disabled={isSavingPayment}
                placeholder="Paid via GPay - Batch 4"
                rows={2}
                className="w-full bg-cc-base-elevated border border-cc-gridline rounded px-2 py-1.5 font-sans text-[13px] text-cc-text-high placeholder:text-cc-text-low focus:border-cc-warm-primary focus:outline-none resize-none"
              />
            </div>

            {paymentError && <p className="mt-2 micro-text text-cc-danger">{paymentError}</p>}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={isSavingPayment}
                className="flex-1 h-9 bg-cc-green text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSavingPayment ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    SAVING...
                  </>
                ) : 'Save Payment'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSavingPayment}
                className="h-9 px-3 border border-cc-gridline rounded font-mono text-[10px] uppercase tracking-[0.06em] text-cc-text-mid hover:text-cc-warm-text disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
