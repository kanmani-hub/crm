import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Award, ShieldCheck, PieChart, BarChart3, ArrowDownCircle, IndianRupee } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function DashboardReports() {
  const { candidates, trackedCandidates } = useStore();
  const [activeTab, setActiveTab] = useState<'financial' | 'funnel' | 'branch'>('financial');

  // ----------------------------------------------------
  // DATA CALCULATIONS
  // ----------------------------------------------------
  const totalCandidates = candidates.length;
  const placedCandidates = candidates.filter(c => c.placed).length;
  const inTraining = candidates.filter(c => !c.placed).length;
  const pendingForms = trackedCandidates.filter(t => t.status === 'form-pending').length;

  let totalProjected = 0;
  let totalPaid = 0;
  let totalDues = 0;

  const pipelineSummary: Record<string, { base: number; paid: number; dues: number }> = {
    registration: { base: 0, paid: 0, dues: 0 },
    course: { base: 0, paid: 0, dues: 0 },
    document: { base: 0, paid: 0, dues: 0 },
    placement: { base: 0, paid: 0, dues: 0 },
  };

  const branchSummary: Record<string, { total: number; placed: number }> = {};
  const courseSummary: Record<string, number> = {};

  candidates.forEach(c => {
    // Branch breakdown
    const branch = c.branch || 'Unknown';
    if (!branchSummary[branch]) {
      branchSummary[branch] = { total: 0, placed: 0 };
    }
    branchSummary[branch].total += 1;
    if (c.placed) branchSummary[branch].placed += 1;

    // Course breakdown
    const course = c.course || 'Unknown';
    courseSummary[course] = (courseSummary[course] || 0) + 1;

    // Financial breakdown
    c.financials.forEach(f => {
      const type = f.pipelineType;
      if (pipelineSummary[type]) {
        const adjustmentsSum = (f.adjustments || []).reduce((sum, a) => sum + a.amount, 0);
        const net = Math.max(0, f.baseFee + adjustmentsSum);
        const dues = Math.max(0, net - f.paidToDate);

        pipelineSummary[type].base += net;
        pipelineSummary[type].paid += f.paidToDate;
        pipelineSummary[type].dues += dues;

        totalProjected += net;
        totalPaid += f.paidToDate;
        totalDues += dues;
      }
    });
  });

  const placementRate = totalCandidates > 0 ? Math.round((placedCandidates / totalCandidates) * 100) : 0;
  const formattedCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // SVG Helper dimensions
  const branchLabels = Object.keys(branchSummary);
  const branchData = Object.values(branchSummary);
  const maxBranchTotal = Math.max(...branchData.map(b => b.total), 1);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Revenue */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-cc-base-surface border border-cc-gridline rounded p-4 shadow-inset-glow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(91,168,124,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="section-header !text-cc-green">REVENUE COLLECTED</span>
            <div className="p-1.5 rounded-sm bg-cc-green/10 border border-cc-green/20 text-cc-green group-hover:scale-105 transition-transform">
              <IndianRupee size={15} />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-light text-cc-text-high leading-tight">
            {formattedCurrency(totalPaid)}
          </div>
          <div className="mt-1 font-mono text-[9px] text-cc-text-mid uppercase tracking-wide">
            OF {formattedCurrency(totalProjected)} PROJECTED
          </div>
        </motion.div>

        {/* KPI 2: Outstanding Dues */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-cc-base-surface border border-cc-gridline rounded p-4 shadow-inset-glow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(201,75,75,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="section-header !text-cc-danger">OUTSTANDING DUES</span>
            <div className="p-1.5 rounded-sm bg-cc-danger/10 border border-cc-danger/20 text-cc-danger group-hover:scale-105 transition-transform">
              <ArrowDownCircle size={15} />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-light text-cc-text-high leading-tight">
            {formattedCurrency(totalDues)}
          </div>
          <div className="mt-1 font-mono text-[9px] text-cc-text-mid uppercase tracking-wide">
            {Math.round((totalDues / Math.max(1, totalProjected)) * 100)}% UNCOLLECTED RATIO
          </div>
        </motion.div>

        {/* KPI 3: Placed Student Count */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-cc-base-surface border border-cc-gridline rounded p-4 shadow-inset-glow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(91,143,191,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="section-header !text-cc-blue">PLACEMENTS HUB</span>
            <div className="p-1.5 rounded-sm bg-cc-blue/10 border border-cc-blue/20 text-cc-blue group-hover:scale-105 transition-transform">
              <Award size={15} />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-light text-cc-text-high leading-tight">
            {placedCandidates} / {totalCandidates}
          </div>
          <div className="mt-1 font-mono text-[9px] text-cc-text-mid uppercase tracking-wide">
            {placementRate}% PLACEMENT RATE
          </div>
        </motion.div>

        {/* KPI 4: Pending Intake Forms */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-cc-base-surface border border-cc-gridline rounded p-4 shadow-inset-glow relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="section-header !text-cc-gold">FORM INTAKE</span>
            <div className="p-1.5 rounded-sm bg-cc-gold/10 border border-cc-gold/20 text-cc-gold group-hover:scale-105 transition-transform">
              <Users size={15} />
            </div>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-light text-cc-text-high leading-tight">
            {pendingForms} PENDING
          </div>
          <div className="mt-1 font-mono text-[9px] text-cc-text-mid uppercase tracking-wide">
            {inTraining} STUDENTS IN TRAINING
          </div>
        </motion.div>
      </div>

      {/* Analytics Central Panel */}
      <div className="bg-cc-base-surface border border-cc-gridline rounded shadow-inset-glow overflow-hidden">
        {/* Panel Tabs Header */}
        <div className="flex border-b border-cc-gridline bg-cc-base-deep/45 px-4 h-11 items-center gap-1.5">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 h-full px-3 font-mono text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'financial'
                ? 'border-cc-warm-primary text-cc-text-high'
                : 'border-transparent text-cc-text-low hover:text-cc-text-mid'
            }`}
          >
            <TrendingUp size={13} />
            Financial Pipelines
          </button>
          <button
            onClick={() => setActiveTab('funnel')}
            className={`flex items-center gap-2 h-full px-3 font-mono text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'funnel'
                ? 'border-cc-warm-primary text-cc-text-high'
                : 'border-transparent text-cc-text-low hover:text-cc-text-mid'
            }`}
          >
            <PieChart size={13} />
            Placement Funnel
          </button>
          <button
            onClick={() => setActiveTab('branch')}
            className={`flex items-center gap-2 h-full px-3 font-mono text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'branch'
                ? 'border-cc-warm-primary text-cc-text-high'
                : 'border-transparent text-cc-text-low hover:text-cc-text-mid'
            }`}
          >
            <BarChart3 size={13} />
            Branches & Courses
          </button>
        </div>

        {/* Tab Contents with Framer-motion crossfading */}
        <div className="p-5 lg:p-6 min-h-[260px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {activeTab === 'financial' && (
              <motion.div
                key="financial"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
              >
                {/* Horizontal Pipeline Bars */}
                <div className="space-y-4">
                  <h4 className="section-header">PIPELINE MILESTONES</h4>
                  {['registration', 'course', 'document', 'placement'].map(type => {
                    const data = pipelineSummary[type];
                    const percent = data.base > 0 ? Math.round((data.paid / data.base) * 100) : 0;
                    
                    return (
                      <div key={type} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-medium text-cc-text-high uppercase tracking-wide truncate max-w-[130px]">
                            {type} pipeline
                          </span>
                          <span className="font-mono text-cc-text-mid">
                            {formattedCurrency(data.paid)} / {formattedCurrency(data.base)} ({percent}%)
                          </span>
                        </div>
                        {/* Custom visual glowing progress bar */}
                        <div className="h-2.5 w-full bg-cc-base-deep border border-cc-gridline rounded-sm overflow-hidden relative p-[1px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-sm relative"
                            style={{
                              backgroundColor:
                                type === 'registration' ? '#C9A84C' :
                                type === 'course' ? '#5B8FBF' :
                                type === 'document' ? '#5BA87C' : '#B85C3D',
                              boxShadow: `0 0 10px ${
                                type === 'registration' ? 'rgba(201,168,76,0.3)' :
                                type === 'course' ? 'rgba(91,143,191,0.3)' :
                                type === 'document' ? 'rgba(91,168,124,0.3)' : 'rgba(184,92,61,0.3)'
                              }`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Collections KPI Card */}
                <div className="bg-cc-base-deep/40 rounded border border-cc-gridline/60 p-5 flex flex-col justify-between">
                  <div>
                    <h5 className="font-mono text-[10px] font-semibold text-cc-warm-text uppercase tracking-wider mb-2">COLLECTIONS HEALTH</h5>
                    <p className="font-sans text-[13px] text-cc-text-mid leading-relaxed">
                      All calculations are recalculated in the client's browser local memory to avoid lag. Out of a projected value of <strong className="text-cc-text-high font-medium">{formattedCurrency(totalProjected)}</strong>, HR has successfully matched and reconciliation holds <strong className="text-cc-green font-medium">{formattedCurrency(totalPaid)}</strong> in cleared payments.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-cc-gridline/40 pt-4">
                    <div>
                      <span className="font-mono text-[10px] text-cc-text-low uppercase tracking-wider block">COLLECTED RATIO</span>
                      <span className="font-mono text-2xl font-light text-cc-green">
                        {totalProjected > 0 ? Math.round((totalPaid / totalProjected) * 100) : 0}%
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-cc-text-low uppercase tracking-wider block">PENDING LIABILITIES</span>
                      <span className="font-mono text-2xl font-light text-cc-gold">
                        {formattedCurrency(totalDues)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'funnel' && (
              <motion.div
                key="funnel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid gap-6 lg:grid-cols-2 items-center"
              >
                {/* Radial Glowing Ring representation */}
                <div className="flex justify-center py-2 relative">
                  <svg width="180" height="180" viewBox="0 0 100 100" className="rotate-[-90deg]">
                    {/* Background circle */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgb(var(--cc-gridline))" strokeWidth="6" />
                    {/* Active training segment (lower priority) */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(90,106,125,0.4)" strokeWidth="6" />
                    {/* Placed segment circle */}
                    <motion.circle
                      cx="50" cy="50" r="40"
                      fill="transparent"
                      stroke="#5BA87C"
                      strokeWidth="6.5"
                      strokeDasharray={251.2}
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 - (251.2 * placementRate) / 100 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(91,168,124,0.4))' }}
                    />
                  </svg>
                  {/* Inside Center Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                    <span className="font-mono text-2xl font-light text-cc-green">{placementRate}%</span>
                    <span className="font-mono text-[9px] text-cc-text-low uppercase tracking-widest">PLACED</span>
                  </div>
                </div>

                {/* Placement Stats Column */}
                <div className="space-y-4">
                  <h4 className="section-header">PLACEMENT INSIGHTS</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded bg-cc-base-deep/30 border border-cc-gridline/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cc-green" />
                        <span className="font-sans text-[13px] text-cc-text-high">Placed in Companies</span>
                      </div>
                      <span className="font-mono text-[13px] font-semibold text-cc-text-high">{placedCandidates} Candidates</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2.5 rounded bg-cc-base-deep/30 border border-cc-gridline/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cc-text-low" />
                        <span className="font-sans text-[13px] text-cc-text-high">Active in Training</span>
                      </div>
                      <span className="font-mono text-[13px] font-semibold text-cc-text-high">{inTraining} Candidates</span>
                    </div>

                    <p className="font-sans text-xs text-cc-text-mid leading-relaxed">
                      Our dynamic search metrics show {placedCandidates} out of {totalCandidates} registered students have successfully transitioned into placement roles with partners like Google India and Microsoft India.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'branch' && (
              <motion.div
                key="branch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid gap-6 lg:grid-cols-2"
              >
                {/* SVG Bar Chart for Branches */}
                <div>
                  <h4 className="section-header mb-4">BRANCH ENROLLMENT</h4>
                  {branchLabels.length === 0 ? (
                    <p className="font-mono text-[10px] text-cc-text-low uppercase">No branch data available</p>
                  ) : (
                    <div className="flex items-end justify-around h-36 border-b border-cc-gridline/70 pt-2 pb-1 relative">
                      {/* Grid lines */}
                      <div className="absolute inset-x-0 top-1/4 border-t border-[rgba(42,48,56,0.2)]" />
                      <div className="absolute inset-x-0 top-2/4 border-t border-[rgba(42,48,56,0.2)]" />
                      <div className="absolute inset-x-0 top-3/4 border-t border-[rgba(42,48,56,0.2)]" />

                      {branchLabels.map((branch, i) => {
                        const count = branchSummary[branch].total;
                        const heightPercent = Math.max(10, Math.round((count / maxBranchTotal) * 100));

                        return (
                          <div key={branch} className="flex flex-col items-center flex-1 z-10 group relative max-w-[60px]">
                            {/* Hover tooltip */}
                            <div className="absolute -top-6 bg-cc-base-elevated border border-cc-gridline rounded px-1.5 py-0.5 font-mono text-[9px] text-cc-text-high opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-panel">
                              {count} candidates
                            </div>
                            
                            {/* Bar item */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${heightPercent}px` }}
                              transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                              className="w-8 rounded-t bg-cc-blue/30 border border-cc-blue/60 group-hover:bg-cc-blue/50 transition-colors shadow-[0_0_8px_rgba(91,143,191,0.1)]"
                              style={{ maxHeight: '110px' }}
                            />
                            
                            {/* Label */}
                            <span className="font-mono text-[10px] text-cc-text-mid mt-2 truncate w-full text-center">
                              {branch}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Course Distribution list */}
                <div>
                  <h4 className="section-header mb-3">COURSE ENROLLMENTS</h4>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {Object.entries(courseSummary).map(([course, count]) => {
                      const percent = totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0;
                      return (
                        <div key={course} className="flex items-center justify-between text-xs p-1.5 rounded bg-cc-base-deep/20 border border-cc-gridline/40">
                          <span className="font-sans font-medium text-cc-text-high">{course}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cc-text-mid">{count} Candidates</span>
                            <span className="font-mono text-[10px] text-cc-text-low">({percent}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
