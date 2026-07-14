import { Link } from 'react-router';
import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from './StatusBadge';

type CandidateSearchPanelProps = {
  autoFocus?: boolean;
  className?: string;
  onCandidateSelect?: () => void;
};

export default function CandidateSearchPanel({
  autoFocus = false,
  className = '',
  onCandidateSelect,
}: CandidateSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    settings,
    searchQuery,
    activeFilters,
    branchFilter,
    courseFilter,
    placementFilter,
    setSearchQuery,
    clearSearchQuery,
    toggleFilter,
    setBranchFilter,
    setCourseFilter,
    setPlacementFilter,
    getFilteredCandidates,
    updateSettings,
    candidates,
  } = useStore();

  const filteredCandidates = getFilteredCandidates();
  const filterPills = [
    { id: 'form-pending', label: 'Form Pending', color: 'amber' },
    { id: 'bgv-cleared', label: 'BGV Cleared', color: 'green' },
    { id: 'has-dues', label: 'Has Dues', color: 'red' },
  ];

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [autoFocus]);

  return (
    <div className={`relative ${className}`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(360px,1fr)_auto] lg:items-start">
        <div className="relative">
          <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-cc-warm-text" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Candidate Name, Batch, Email, or Phone..."
            className="w-full h-16 bg-cc-base-surface border border-cc-gridline rounded pl-14 pr-12 font-sans text-[17px] text-cc-text-high placeholder:text-cc-text-mid focus:outline-none focus:border-cc-warm-primary focus:shadow-[0_0_0_3px_rgba(184,92,61,0.16),0_18px_48px_rgba(0,0,0,0.34)] shadow-[0_16px_44px_rgba(0,0,0,0.24)] transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => clearSearchQuery()}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded text-cc-text-mid hover:text-cc-danger hover:bg-[rgba(201,75,75,0.1)] transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {filterPills.map((filter) => {
              const active = activeFilters.includes(filter.id);
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleFilter(filter.id)}
                  className={`rounded px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] border transition-all ${
                    active
                      ? filter.color === 'green'
                        ? 'bg-[rgba(91,168,124,0.15)] border-[#5BA87C] text-[#5BA87C]'
                        : filter.color === 'red'
                          ? 'bg-[rgba(201,75,75,0.14)] border-[#C94B4B] text-[#C94B4B]'
                          : 'bg-[rgba(201,168,76,0.14)] border-[#C9A84C] text-[#C9A84C]'
                      : 'bg-cc-base-surface border-cc-gridline text-cc-text-mid hover:text-cc-text-high'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full lg:w-auto">
            <select
              value={settings.isOfflineMode ? 'offline' : 'online'}
              onChange={(e) => updateSettings({ ...settings, isOfflineMode: e.target.value === 'offline' })}
              className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
            >
              <option value="online">Online (GAS)</option>
              <option value="offline">Offline (Local)</option>
            </select>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
            >
              <option value="all">All Branches</option>
              {settings.branches.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
            >
              <option value="all">All Courses</option>
              {settings.courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="training">In Training</option>
              <option value="placed">Placed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-cc-base-deep border border-cc-gridline rounded shadow-[0_22px_70px_rgba(0,0,0,0.46)] max-h-[420px] overflow-y-auto">
        <div className="px-4 py-3 border-b border-cc-gridline flex items-center justify-between">
          <span className="micro-text text-cc-text-mid">
            {filteredCandidates.length} candidate{filteredCandidates.length === 1 ? '' : 's'}
          </span>
        </div>
        {filteredCandidates.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-sans text-sm text-cc-text-mid">No candidates match this search</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(42,48,56,0.55)]">
            {filteredCandidates.map((candidate) => {
              return (
                <Link
                  key={candidate.id}
                  to={`/candidate/${candidate.id}`}
                  onClick={() => onCandidateSelect?.()}
                  className="grid gap-2 sm:grid-cols-[1fr_auto] px-4 py-3 hover:bg-cc-base-surface transition-colors"
                >
                    <div className="min-w-0">
                      <p className="font-sans text-[14px] font-semibold text-cc-text-high truncate">
                        {candidate.fullName}
                      </p>
                      <p className="micro-text text-cc-text-mid truncate">
                        {candidate.batchName} - {candidate.course} - {candidate.branch}
                      </p>
                      <p className="micro-text text-cc-text-low truncate">
                        {candidate.email} - {candidate.phone}
                      </p>
                    </div>
                    {(candidate.placed || candidate.bgvStatus === 'submitted' || candidate.bgvStatus === 'cleared') && (
                      <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                        {candidate.placed && (
                          <StatusBadge label="PLACED" variant="green" />
                        )}
                        {candidate.bgvStatus === 'submitted' && (
                          <StatusBadge label="BGV SUBMITTED" variant="blue" />
                        )}
                        {candidate.bgvStatus === 'cleared' && (
                          <StatusBadge label="BGV CLEARED" variant="green" />
                        )}
                      </div>
                    )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
