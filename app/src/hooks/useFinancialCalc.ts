import { useMemo } from 'react';
import type { FinancialPipeline } from '@/types';

export function useFinancialCalc(pipeline: FinancialPipeline) {
  return useMemo(() => {
    const adjustments = pipeline.adjustments || [];
    let totalAdjustments = 0;
    let baseFee = Number(pipeline.baseFee) || 0;
    const paidToDate = Number(pipeline.paidToDate) || 0;
    
    let netPayable = baseFee;

    adjustments.forEach(a => {
      const amt = Math.abs(Number(a.amount) || 0);
      const type = (a as any).adjustmentType;
      
      if (type === 'ADDITIONAL_CHARGE') {
        netPayable += amt;
        totalAdjustments -= amt;
      } else if (type === 'REFUND') {
        // Refunds don't reduce net payable, they increase pending dues (as if money was un-paid)
        // We'll handle this by adjusting paidToDate in our local calculation, but for simplicity:
        // A refund means the school gave money back. The student owes it again (if they must pay).
        // Let's treat refund as an INCREASE in net payable for simplicity, or just ignore for netPayable.
        // Usually, REFUND means totalAdjustments goes down. Let's do:
        totalAdjustments -= amt;
        netPayable += amt; // they owe us again because we refunded them
      } else {
        // DISCOUNT, WAIVER
        netPayable -= amt;
        totalAdjustments += amt;
      }
    });

    netPayable = Math.max(0, netPayable);
    const pendingDues = netPayable - paidToDate;
    
    return {
      totalAdjustments,
      netPayable,
      pendingDues,
      isOverpaid: pendingDues < 0,
    };
  }, [pipeline.baseFee, pipeline.adjustments, pipeline.paidToDate]);
}
