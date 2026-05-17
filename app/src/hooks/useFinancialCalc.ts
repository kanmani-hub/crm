import { useMemo } from 'react';
import type { FinancialPipeline } from '@/types';

export function useFinancialCalc(pipeline: FinancialPipeline) {
  return useMemo(() => {
    const totalAdjustments = pipeline.adjustments.reduce((sum, a) => sum + a.amount, 0);
    const netPayable = pipeline.baseFee + totalAdjustments;
    const pendingDues = netPayable - pipeline.paidToDate;
    return {
      totalAdjustments,
      netPayable: Math.max(0, netPayable),
      pendingDues,
      isOverpaid: pendingDues < 0,
    };
  }, [pipeline.baseFee, pipeline.adjustments, pipeline.paidToDate]);
}
