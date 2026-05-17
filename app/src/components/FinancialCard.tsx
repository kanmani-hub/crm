import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import type { FinancialPipeline } from '@/types';
import { useFinancialCalc } from '@/hooks/useFinancialCalc';
import { useStore } from '@/store/useStore';
import InlinePencilEditor from './InlinePencilEditor';

interface FinancialCardProps {
  candidateId: string;
  pipeline: FinancialPipeline;
  accentColor: string;
}

export default function FinancialCard({ candidateId, pipeline, accentColor }: FinancialCardProps) {
  const { showToast } = useStore();
  const { updateFinancialPipeline } = useStore();
  const calc = useFinancialCalc(pipeline);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjLabel, setAdjLabel] = useState('');
  const [adjReason, setAdjReason] = useState('');

  const formatCurrency = (amount: number) => `Rs. ${Math.abs(amount).toLocaleString('en-IN')}`;

  const handleBaseFeeSave = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      updateFinancialPipeline(candidateId, pipeline.pipelineType, { baseFee: num });
      showToast('Base fee updated');
    }
  };

  const handlePaidToDateSave = (val: string) => {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      updateFinancialPipeline(candidateId, pipeline.pipelineType, { paidToDate: num });
      showToast('Payment updated');
    }
  };

  const handleAddAdjustment = () => {
    if (!adjAmount || !adjLabel || !adjReason) return;
    const amount = parseFloat(adjAmount);
    if (isNaN(amount)) return;
    const newAdj = {
      id: Math.random().toString(36).substring(2, 8),
      amount: -Math.abs(amount),
      label: adjLabel,
      reason: adjReason,
      createdAt: new Date().toISOString(),
      userStamp: 'HR-A',
    };
    updateFinancialPipeline(candidateId, pipeline.pipelineType, {
      adjustments: [...pipeline.adjustments, newAdj],
    });
    setShowAddAdjustment(false);
    setAdjAmount('');
    setAdjLabel('');
    setAdjReason('');
    showToast('Adjustment applied');
  };

  const handleRemoveAdjustment = (adjId: string) => {
    updateFinancialPipeline(candidateId, pipeline.pipelineType, {
      adjustments: pipeline.adjustments.filter((a) => a.id !== adjId),
    });
    showToast('Adjustment removed');
  };

  return (
    <div className="space-y-6">
      {/* Net Payable Hero */}
      <div>
        <span className="section-header">NET PAYABLE</span>
        <motion.div
          key={calc.netPayable}
          initial={{ scale: 1.03 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
          className="data-figure mt-2"
          style={{ color: accentColor }}
        >
          {formatCurrency(calc.netPayable)}
        </motion.div>
      </div>

      {/* Base Fee */}
      <div>
        <span className="section-header">BASE FEE</span>
        <div className="mt-2">
          <InlinePencilEditor
            value={formatCurrency(pipeline.baseFee)}
            onSave={handleBaseFeeSave}
          />
        </div>
      </div>

      {/* Adjustments */}
      <div>
        <span className="section-header">ADJUSTMENTS</span>
        <div className="mt-2 space-y-1.5">
          <AnimatePresence>
            {pipeline.adjustments.map((adj) => (
              <motion.div
                key={adj.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-cc-danger">{formatCurrency(adj.amount)}</span>
                  <span className="font-sans text-sm text-cc-warm-text">{adj.label}</span>
                </div>
                <button
                  onClick={() => handleRemoveAdjustment(adj.id)}
                  className="p-1 hover:bg-cc-base-elevated rounded transition-colors"
                >
                  <Trash2 size={12} className="text-cc-text-low hover:text-cc-danger" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!showAddAdjustment ? (
          <button
            onClick={() => setShowAddAdjustment(true)}
            className="mt-3 font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-cc-warm-primary hover:text-cc-warm-primary-hover transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> ADD ADJUSTMENT
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2 bg-cc-base-elevated p-3 rounded"
          >
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Amount"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                className="flex-1 bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
              />
              <input
                type="text"
                placeholder="Label"
                value={adjLabel}
                onChange={(e) => setAdjLabel(e.target.value)}
                className="flex-1 bg-cc-base-deep border border-cc-gridline rounded px-2 py-1.5 text-sm text-cc-text-high font-sans focus:border-cc-warm-primary focus:outline-none"
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
              onClick={handleAddAdjustment}
              disabled={!adjAmount || !adjLabel || !adjReason}
              className="w-full py-2 bg-cc-warm-primary text-white font-mono text-[10px] font-semibold uppercase tracking-[0.06em] rounded hover:bg-cc-warm-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              APPLY
            </button>
          </motion.div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-cc-gridline" />

      {/* Summary */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-sans text-sm text-cc-text-mid">Net Payable</span>
          <motion.span
            key={calc.netPayable}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="data-figure text-cc-gold"
          >
            {formatCurrency(calc.netPayable)}
          </motion.span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-sans text-sm text-cc-text-mid">Paid to Date</span>
          <InlinePencilEditor
            value={formatCurrency(pipeline.paidToDate)}
            onSave={handlePaidToDateSave}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="font-sans text-sm text-cc-text-mid">Pending Dues</span>
          <motion.span
            key={calc.pendingDues}
            initial={{ scale: 1.05, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`data-figure ${calc.pendingDues <= 0 ? 'text-cc-green' : 'text-cc-danger'}`}
          >
            {calc.isOverpaid ? `${formatCurrency(Math.abs(calc.pendingDues))} OVERPAID` : formatCurrency(calc.pendingDues)}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
