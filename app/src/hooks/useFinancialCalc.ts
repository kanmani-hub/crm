import { useMemo } from 'react';
import type { FinancialPipeline } from '@/types';

export function useFinancialCalc(pipeline: FinancialPipeline) {
  return useMemo(() => {
    const adjustments = pipeline.adjustments || [];
    const totalAdjustments = adjustments.reduce((sum, a) => sum + Math.abs(Number(a.amount) || 0), 0);
    const baseFee = Number(pipeline.baseFee) || 0;
    const paidToDate = Number(pipeline.paidToDate) || 0;
    
    const netPayable = Math.max(0, baseFee - totalAdjustments);
    const pendingDues = netPayable - paidToDate;
    
    return {
      totalAdjustments,
      netPayable,
      pendingDues,
      isOverpaid: pendingDues < 0,
    };
  }, [pipeline.baseFee, pipeline.adjustments, pipeline.paidToDate]);
}
