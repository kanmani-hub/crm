import { useMemo } from 'react';
import type { FinancialPipeline } from '@/types';

export function useFinancialCalc(pipeline: FinancialPipeline) {
  return useMemo(() => {
    const adjustments = pipeline.adjustments || [];
    let totalAdjustments = 0;
    let baseFee = Number(pipeline.baseFee) || 0;
    const paidToDate = Number(pipeline.paidToDate) || 0;
    
    adjustments.forEach(a => {
      let amt = Number(a.amount) || 0;
      const uType = String((a as any).adjustmentType || a.label || '').toUpperCase().trim();
      
      // Determine sign
      if (uType.includes('DISCOUNT') || uType.includes('WAIVER') || uType.includes('REFUND') || uType.includes('REDUCTION')) {
        amt = -Math.abs(amt);
      } else if (uType.includes('CHARGE') || uType.includes('ADDITIONAL')) {
        amt = Math.abs(amt);
      } else {
        // Fallback for generic negative amount
        amt = amt;
      }
      
      totalAdjustments += amt;
    });

    const netPayable = Math.max(0, baseFee + totalAdjustments);
    const pendingDues = Math.max(0, netPayable - paidToDate);
    const overpaidAmount = Math.max(0, paidToDate - netPayable);
    
    return {
      totalAdjustments,
      netPayable,
      pendingDues,
      isOverpaid: overpaidAmount > 0,
      overpaidAmount
    };
  }, [pipeline.baseFee, pipeline.adjustments, pipeline.paidToDate]);
}
