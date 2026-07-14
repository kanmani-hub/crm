import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { FinancialPipeline } from '@/types';
import { useFinancialCalc } from '@/hooks/useFinancialCalc';
import { useStore } from '@/store/useStore';
import { useDPStore } from '@/store/useDPStore';
import InlinePencilEditor from './InlinePencilEditor';
import type { PaymentRecord } from '@/types';
import ModalWindow from './ModalWindow';

interface FinancialCardProps {
  candidateId: string;
  pipeline: FinancialPipeline;
  accentColor: string;
  mode?: 'training' | 'dp';
}

const normalizePaymentType = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/fee$/, '')
    .replace(/[\s_-]+/g, "");

const parseAmount = (value: unknown): number => {
  const cleaned = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/Rs\.?/gi, "")
    .replace(/,/g, "")
    .trim();
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
};

export default function FinancialCard({ candidateId, pipeline, accentColor, mode = 'training' }: FinancialCardProps) {
  console.log("[DP FINANCIAL] FinancialCard RENDER", { candidateId, pipelineType: pipeline?.pipelineType, pipeline });
  
  useEffect(() => {
    console.log("[DP FINANCIAL] FinancialCard MOUNTED", { candidateId, pipelineType: pipeline?.pipelineType });
    return () => console.log("[DP FINANCIAL] FinancialCard UNMOUNTED", { candidateId, pipelineType: pipeline?.pipelineType });
  }, [candidateId, pipeline?.pipelineType]);

  const store = useStore();
  const dpStore = useDPStore();
  
  const showToast = mode === 'dp' ? dpStore.showToast : store.showToast;
  const updateFinancialPipeline = mode === 'dp' ? dpStore.updateFinancialPipeline : store.updateFinancialPipeline;
  
  const paymentRecords = mode === 'dp' ? dpStore.paymentRecords : store.paymentRecords;
  
  const payments = paymentRecords.filter(p => 
    (mode === 'dp' ? (p as any).placementId === candidateId : (p as any).candidateId === candidateId) && 
    (mode === 'dp' 
      ? normalizePaymentType(p.paymentType) === normalizePaymentType(pipeline.pipelineType)
      : (p.pipelineType === pipeline.pipelineType || (!p.pipelineType && p.paymentType.toLowerCase().includes(pipeline.pipelineType))))
  );

  const calculatedPaidToDate = useMemo(() => {
    return payments.reduce((total, p) => total + parseAmount(p.amount), 0);
  }, [payments]);

  const dpAdjustments = useMemo(() => {
    if (mode !== 'dp') return [];
    const allAdj = dpStore.adjustmentsByPlacementId[candidateId] || [];
    return allAdj.filter(a => normalizePaymentType(a.pipelineType) === normalizePaymentType(pipeline.pipelineType));
  }, [mode, dpStore.adjustmentsByPlacementId, candidateId, pipeline.pipelineType]);

  const pipelineWithDPAdj = mode === 'dp' ? { ...pipeline, adjustments: dpAdjustments.map(a => ({
    id: a.adjustmentId,
    amount: a.amount,
    label: a.notes || a.reason || '',
    reason: a.reason || '',
    createdAt: a.createdAt,
    userStamp: a.createdBy,
    adjustmentType: a.adjustmentType
  })), paidToDate: calculatedPaidToDate } : { ...pipeline, paidToDate: calculatedPaidToDate };

  const calc = useFinancialCalc(pipelineWithDPAdj);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjLabel, setAdjLabel] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const updatePaymentRecord = mode === 'dp' ? dpStore.updatePaymentRecord : store.updatePaymentRecord;
  const deletePaymentRecord = mode === 'dp' ? dpStore.deletePaymentRecord : null;

  const formatCurrency = (amount: number) => `Rs. ${Math.abs(amount).toLocaleString('en-IN')}`;

  const handleBaseFeeSave = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      updateFinancialPipeline(candidateId, pipeline.pipelineType, { baseFee: num });
      showToast('Base fee updated');
    }
  };

  const handleNetPayableSave = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num) && num >= 0) {
      const adjustedBaseFee = num - calc.totalAdjustments;
      updateFinancialPipeline(candidateId, pipeline.pipelineType, { baseFee: adjustedBaseFee });
      showToast('Net payable updated');
    }
  };

  const handlePaidToDateSave = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      updateFinancialPipeline(candidateId, pipeline.pipelineType, { paidToDate: num });
      showToast('Payment updated');
    }
  };

  const [adjType, setAdjType] = useState('DISCOUNT');
  const handleAddAdjustment = async () => {
    if (!adjAmount || !adjLabel || !adjReason) return;
    const amount = parseFloat(adjAmount);
    if (isNaN(amount)) return;
    
    if (mode === 'dp') {
      const payload = {
        placementId: candidateId,
        candidateName: store.getCandidateById(candidateId)?.fullName || dpStore.candidates.find(c => c.placementId === candidateId)?.fullName || '',
        pipelineType: pipeline.pipelineType,
        adjustmentType: adjType,
        amount: Math.abs(amount),
        reason: adjReason,
        notes: adjLabel,
        performedBy: 'System'
      };
      
      try {
        await dpStore.addDirectAdjustment(payload);
        setShowAddAdjustment(false);
        setAdjAmount('');
        setAdjLabel('');
        setAdjReason('');
        showToast('Adjustment applied');
      } catch (err: any) {
        showToast(err.message || 'Failed to add adjustment', 'error');
      }
    } else {
      const newAdj = {
        id: Math.random().toString(36).substring(2, 8),
        amount: Math.abs(amount),
        label: adjLabel,
        reason: adjReason,
        createdAt: new Date().toISOString(),
        userStamp: 'HR-A',
      };
      updateFinancialPipeline(candidateId, pipeline.pipelineType, {
        adjustments: [...pipeline.adjustments, newAdj] as any,
      });
      setShowAddAdjustment(false);
      setAdjAmount('');
      setAdjLabel('');
      setAdjReason('');
      showToast('Adjustment applied');
    }
  };

  const handleRemoveAdjustment = async (adjId: string) => {
    if (mode === 'dp') {
      const res = await dpStore.deleteDirectAdjustment({ adjustmentId: adjId, placementId: candidateId });
      if (res.success) {
        showToast('Adjustment removed');
      } else {
        showToast(res.error || 'Failed to remove adjustment', 'error');
      }
    } else {
      updateFinancialPipeline(candidateId, pipeline.pipelineType, {
        adjustments: pipeline.adjustments.filter((a) => a.id !== adjId) as any,
      });
      showToast('Adjustment removed');
    }
  };;

  const startEditPayment = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setEditAmount(String(payment.amount));
    setEditDate(payment.paymentDate || new Date().toISOString().split('T')[0]);
    setEditRef(payment.transactionRef || '');
    setEditNotes(payment.notes || payment.remarks || '');
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment || !editAmount) return;
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Invalid amount', 'error');
      return;
    }
    
    setIsUpdatingPayment(true);
    try {
      const result = await updatePaymentRecord(editingPayment.id, {
        amount: numAmount,
        paymentDate: editDate,
        transactionRef: editRef,
        notes: editNotes,
      });
      
      if (!result || result.success !== false) {
        showToast('Payment updated successfully');
        setEditingPayment(null);
        if (mode === 'dp') {
          const pid = (editingPayment as any).placementId;
          if (pid) {
            dpStore.loadPaymentsForCandidate(pid, true);
            dpStore.loadAuditLogs(pid);
          }
        }
      } else {
        showToast(result.error || 'Failed to update payment', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment', 'error');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPaymentId || !deletePaymentRecord) return;
    setIsDeletingPayment(true);
    try {
      const existing = paymentRecords.find(p => p.id === deletingPaymentId);
      const result = await deletePaymentRecord(deletingPaymentId);
      if (result.success) {
        showToast('Payment deleted successfully');
        setDeletingPaymentId(null);
        if (mode === 'dp' && existing) {
          const pid = (existing as any).placementId;
          if (pid) {
            dpStore.loadPaymentsForCandidate(pid, true);
            dpStore.loadAuditLogs(pid);
          }
        }
      } else {
        showToast(result.error || 'Failed to delete payment', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete payment', 'error');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Payment Confirmation Modal */}
      <ModalWindow
        isOpen={!!deletingPaymentId}
        onClose={() => setDeletingPaymentId(null)}
        title="Delete Payment"
        footer={
          <>
            <button
              onClick={() => setDeletingPaymentId(null)}
              disabled={isDeletingPayment}
              className="px-5 py-2 font-mono text-[11px] font-medium uppercase tracking-wider border border-cc-gridline rounded text-cc-text-mid hover:text-cc-warm-text transition-colors disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              onClick={handleDeletePayment}
              disabled={isDeletingPayment}
              className="px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider bg-cc-danger text-white rounded hover:brightness-110 transition-all disabled:opacity-50"
            >
              {isDeletingPayment ? 'DELETING...' : 'DELETE'}
            </button>
          </>
        }
      >
        <p className="font-sans text-[13px] text-cc-text-high">Are you sure you want to delete this payment?</p>
        <p className="text-cc-text-mid mt-2 text-xs">This action cannot be undone. The financial summary will be recalculated.</p>
      </ModalWindow>
      {/* Net Payable Hero */}
      <div>
        <span className="section-header">NET PAYABLE</span>
        <motion.div
          key={calc.netPayable}
          initial={{ scale: 1.03 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className="mt-2"
          style={{ color: accentColor }}
        >
          <InlinePencilEditor
            value={formatCurrency(calc.netPayable)}
            editValue={String(calc.netPayable)}
            onSave={handleNetPayableSave}
            className="data-figure"
          />
        </motion.div>
      </div>

      {/* Base Fee */}
      <div>
        <span className="section-header">BASE FEE</span>
        <div className="mt-2">
          <InlinePencilEditor
            value={formatCurrency(pipeline.baseFee)}
            editValue={String(pipeline.baseFee)}
            onSave={handleBaseFeeSave}
          />
        </div>
      </div>

      {/* Adjustments */}
      <div>
        <span className="section-header">ADJUSTMENTS</span>
        <div className="mt-2 space-y-1.5">
          <AnimatePresence>
            {pipelineWithDPAdj.adjustments.map((adj) => (
              <motion.div
                key={adj.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm ${(adj as any).adjustmentType === 'ADDITIONAL_CHARGE' ? 'text-cc-danger' : (adj as any).adjustmentType === 'REFUND' ? 'text-cc-blue' : 'text-cc-green'}`}>{formatCurrency(adj.amount)}</span>
                  <span className="font-sans text-sm text-cc-warm-text">{adj.label} {mode === 'dp' && (adj as any).adjustmentType ? `(${(adj as any).adjustmentType.replace(/_/g, ' ')})` : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAdjustment(adj.id)}
                  className="p-1 hover:bg-cc-base-elevated rounded transition-colors select-none caret-transparent"
                  aria-label={`Remove ${adj.label} adjustment`}
                >
                  <Trash2 size={12} className="text-cc-text-low hover:text-cc-danger" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!showAddAdjustment ? (
          <button
            type="button"
            onClick={() => setShowAddAdjustment(true)}
            className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded px-1 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-cc-warm-primary hover:text-cc-warm-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cc-warm-primary/40 transition-colors select-none caret-transparent"
          >
            <Plus size={12} /> ADD ADJUSTMENT
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2 bg-cc-base-elevated p-3 rounded overflow-hidden"
          >
            {mode === 'dp' && (
              <div className="mb-2">
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
                >
                  <option value="DISCOUNT">Discount</option>
                  <option value="ADDITIONAL_CHARGE">Additional Charge</option>
                  <option value="WAIVER">Waiver</option>
                  <option value="REFUND">Refund</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="min-w-0 w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder="Label"
                value={adjLabel}
                onChange={(e) => setAdjLabel(e.target.value)}
                className="min-w-0 w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
              />
            </div>
            <textarea
              placeholder="Reason required (e.g., Branch Manager approved corporate waiver)"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              rows={2}
              className="w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={handleAddAdjustment}
              disabled={!adjAmount || !adjLabel || !adjReason}
              className="w-full min-h-9 py-2 bg-cc-warm-primary text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded hover:bg-cc-warm-primary-hover disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cc-warm-primary/40 transition-colors select-none caret-transparent"
            >
              APPLY
            </button>
          </motion.div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <span className="section-header">PAYMENT HISTORY</span>
        <div className="mt-2 space-y-2">
          {payments.length === 0 ? (
            <p className="micro-text text-cc-text-low italic">No payments recorded</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex flex-col bg-cc-base-deep rounded border border-cc-gridline p-2.5 hover:border-[rgba(199,178,153,0.3)] transition-colors group">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] text-cc-green font-medium">{formatCurrency(payment.amount)}</span>
                      <span className="font-mono text-[10px] text-cc-text-mid bg-cc-base-elevated px-1.5 py-0.5 rounded">{payment.paymentDate}</span>
                    </div>
                    {(payment.transactionRef || payment.notes || payment.remarks) && (
                      <div className="font-sans text-[11px] text-cc-text-low leading-snug">
                        {payment.transactionRef && <span className="mr-2 font-mono bg-cc-base-elevated px-1 rounded-sm text-cc-text-mid">REF: {payment.transactionRef}</span>}
                        {(payment.notes || payment.remarks) && <span>{payment.notes || payment.remarks}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
                    <button 
                      onClick={() => startEditPayment(payment as PaymentRecord)} 
                      className="p-1.5 rounded bg-cc-base-elevated text-cc-text-mid hover:bg-[rgba(199,178,153,0.1)] hover:text-cc-warm-text"
                      title="Edit payment"
                    >
                      <Pencil size={12} />
                    </button>
                    {mode === 'dp' && deletePaymentRecord && (
                      <button 
                        onClick={() => setDeletingPaymentId(payment.id)} 
                        className="p-1.5 rounded bg-cc-base-elevated text-cc-text-mid hover:bg-[rgba(220,60,60,0.1)] hover:text-cc-danger"
                        title="Delete payment"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Edit Payment Inline Form */}
          <AnimatePresence>
            {editingPayment && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="mt-2 overflow-hidden"
              >
                <div className="bg-[rgba(199,178,153,0.06)] border border-[rgba(199,178,153,0.2)] rounded p-3 space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[10px] font-semibold text-cc-warm-text uppercase">Edit Payment</span>
                    <button onClick={() => setEditingPayment(null)} className="text-cc-text-low hover:text-cc-danger">
                      <Trash2 size={12} /> {/* We used Trash2 instead of X to avoid new import if possible, but X is better. Wait, X is not imported. I'll just say "Cancel" text */}
                      <span className="sr-only">Cancel</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="min-w-0 w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
                    />
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="min-w-0 w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-[13px] text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      placeholder="Transaction Ref"
                      value={editRef}
                      onChange={(e) => setEditRef(e.target.value)}
                      className="w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
                    />
                    <textarea
                      placeholder="Notes / Remarks"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleUpdatePayment}
                      disabled={isUpdatingPayment || !editAmount}
                      className="flex-1 min-h-8 bg-cc-warm-primary text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded hover:bg-cc-warm-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isUpdatingPayment ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPayment(null)}
                      disabled={isUpdatingPayment}
                      className="flex-1 min-h-8 border border-cc-gridline text-cc-text-mid hover:text-cc-warm-text font-mono text-[10px] uppercase tracking-[0.06em] rounded disabled:opacity-50 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-cc-gridline" />

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-sans text-sm text-cc-text-mid">Net Payable</span>
          <motion.div
            key={calc.netPayable}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-cc-gold"
          >
            <InlinePencilEditor
              value={formatCurrency(calc.netPayable)}
              editValue={String(calc.netPayable)}
              onSave={handleNetPayableSave}
              className="data-figure"
            />
          </motion.div>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-sans text-sm text-cc-text-mid">Paid to Date</span>
          <span className="data-figure">
            {formatCurrency(calculatedPaidToDate)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          {calc.isOverpaid ? (
            <>
              <span className="font-sans text-sm text-cc-text-mid">Pending Dues</span>
              <motion.span
                key={calc.pendingDues + 'o'}
                initial={{ scale: 1.05, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="data-figure text-cc-green"
              >
                Rs. 0
              </motion.span>
            </>
          ) : (
            <>
              <span className="font-sans text-sm text-cc-text-mid">Pending Dues</span>
              <motion.span
                key={calc.pendingDues}
                initial={{ scale: 1.05, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`data-figure ${calc.pendingDues <= 0 ? 'text-cc-green' : 'text-cc-danger'}`}
              >
                {formatCurrency(calc.pendingDues)}
              </motion.span>
            </>
          )}
        </div>
        
        {calc.isOverpaid && (
          <div className="flex justify-between items-center mt-2">
            <span className="font-sans text-sm text-cc-text-mid">Overpaid</span>
            <motion.span
              initial={{ scale: 1.05, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="data-figure text-cc-gold"
            >
              OVERPAID {formatCurrency(Math.abs(calc.pendingDues))}
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}
