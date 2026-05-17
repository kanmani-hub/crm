import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useStore } from '@/store/useStore';
import TopNavigationBar from '@/components/TopNavigationBar';
import Toast from '@/components/Toast';
import StatusBadge from '@/components/StatusBadge';
import EmploymentChip from '@/components/EmploymentChip';

const defaultFilters = [
  { id: 'form-pending', label: 'Form Pending' },
  { id: 'bgv-cleared', label: 'BGV Cleared' },
  { id: 'has-dues', label: 'Has Dues' },
];

export default function SearchPage() {
  const { candidates } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeFilters, setActiveFilters] = useState<string[]>(
    searchParams.getAll('filter') || []
  );

  // Update URL when search/filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    activeFilters.forEach((f) => params.append('filter', f));
    setSearchParams(params, { replace: true });
  }, [query, activeFilters, setSearchParams]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((f) => f !== filterId) : [...prev, filterId]
    );
  };

  // Filter candidates
  const filtered = candidates.filter((c) => {
    if (query) {
      const q = query.toLowerCase();
      const sanitizedPhone = query.replace(/[^\d]/g, '');
      const matchesName = c.fullName.toLowerCase().includes(q);
      const matchesEmail = c.email.toLowerCase().includes(q);
      const matchesPhone = c.phone.replace(/[^\d]/g, '').includes(sanitizedPhone);
      if (!matchesName && !matchesEmail && !matchesPhone) return false;
    }

    if (activeFilters.includes('form-pending') && c.trackedStatus !== 'form-pending') return false;
    if (activeFilters.includes('bgv-cleared') && c.bgvStatus !== 'cleared') return false;
    if (activeFilters.includes('has-dues')) {
      const hasDues = c.financials.some((f) => {
        const netPayable = f.baseFee + f.adjustments.reduce((sum, a) => sum + a.amount, 0);
        return netPayable - f.paidToDate > 0;
      });
      if (!hasDues) return false;
    }

    return true;
  });

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-cc-base-deep pt-14">
      <TopNavigationBar />
      <Toast />

      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-10">
        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-[960px] mx-auto"
        >
          <div className="relative">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-cc-text-mid" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or phone number..."
              className="w-full h-14 bg-cc-base-surface border border-cc-gridline rounded pl-14 pr-4 font-sans text-base text-cc-text-high placeholder:text-cc-text-mid focus:outline-none focus:border-cc-warm-primary focus:shadow-focus-ring transition-all"
              autoFocus
            />
          </div>
        </motion.div>

        {/* Filter Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="max-w-[960px] mx-auto mt-2 flex items-center gap-2 flex-wrap"
        >
          {defaultFilters.map((filter, i) => (
            <motion.button
              key={filter.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => toggleFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] font-medium uppercase tracking-[0.04em] border transition-all ${
                activeFilters.includes(filter.id)
                  ? 'bg-cc-base-elevated border-cc-blue text-cc-blue'
                  : 'bg-cc-base-elevated border-cc-gridline text-cc-text-mid hover:text-cc-text-high'
              }`}
            >
              {filter.label}
              {activeFilters.includes(filter.id) && (
                <X size={10} onClick={(e) => { e.stopPropagation(); toggleFilter(filter.id); }} className="cursor-pointer" />
              )}
            </motion.button>
          ))}

          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] font-medium uppercase tracking-[0.04em] border border-dashed border-cc-gridline text-cc-text-mid hover:text-cc-text-high transition-all"
          >
            <Plus size={10} /> Add Filter
          </motion.button>
        </motion.div>

        {/* Results Count */}
        <div className="max-w-[1200px] mx-auto mt-6">
          <p className="micro-text text-cc-text-mid">
            Found {filtered.length} candidate{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Results Grid */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Search size={48} className="text-cc-text-low mb-3" />
            <p className="font-sans text-sm text-cc-text-mid">No candidates match your search</p>
            <p className="micro-text text-cc-text-low mt-1">Try adjusting your filters or search terms</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {filtered.map((candidate, i) => {
              // Calculate financials
              const totalNetPayable = candidate.financials.reduce((sum, f) => {
                const net = f.baseFee + f.adjustments.reduce((s, a) => s + a.amount, 0);
                return sum + Math.max(0, net);
              }, 0);
              const totalPending = candidate.financials.reduce((sum, f) => {
                const net = f.baseFee + f.adjustments.reduce((s, a) => s + a.amount, 0);
                return sum + (Math.max(0, net) - f.paidToDate);
              }, 0);

              return (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    to={`/candidate/${candidate.id}`}
                    className="block bg-cc-base-surface border border-cc-gridline rounded p-4 hover:bg-cc-base-elevated hover:border-cc-base-elevated-strong hover:-translate-y-0.5 hover:shadow-panel transition-all duration-200 cursor-pointer"
                  >
                    {/* Top row */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-sans text-[15px] font-semibold text-cc-text-high truncate">
                          {candidate.fullName}
                        </p>
                        <p className="micro-text text-cc-text-mid truncate mt-0.5">{candidate.email}</p>
                        <p className="micro-text text-cc-text-mid truncate">{candidate.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                        <StatusBadge
                          label={candidate.bgvStatus === 'pending' ? 'PENDING' : candidate.bgvStatus === 'in-review' ? 'IN REVIEW' : 'CLEARED'}
                          variant={candidate.bgvStatus === 'pending' ? 'amber' : candidate.bgvStatus === 'in-review' ? 'blue' : 'green'}
                        />
                        <StatusBadge label={candidate.placed ? 'PLACED' : 'NOT PLACED'} variant={candidate.placed ? 'green' : 'neutral'} />
                        {candidate.placed && candidate.placedCompany && (
                          <StatusBadge label={candidate.placedCompany.toUpperCase()} variant="blue" />
                        )}
                      </div>
                    </div>

                    {/* Financial summary */}
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-[rgba(42,48,56,0.5)]">
                      <div>
                        <p className="micro-text text-cc-text-mid">Net Payable</p>
                        <p className="font-mono text-base font-light text-cc-gold">{formatCurrency(totalNetPayable)}</p>
                      </div>
                      <div>
                        <p className="micro-text text-cc-text-mid">Pending Dues</p>
                        <p className={`font-mono text-base font-light ${totalPending > 0 ? 'text-cc-danger' : 'text-cc-green'}`}>
                          {formatCurrency(Math.max(0, totalPending))}
                        </p>
                      </div>
                    </div>

                    {/* Employment chips */}
                    {candidate.pastEmployment.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-[rgba(42,48,56,0.3)] overflow-hidden relative">
                        {candidate.pastEmployment.slice(0, 5).map((company) => (
                          <EmploymentChip key={company} company={company} readOnly />
                        ))}
                        {candidate.pastEmployment.length > 5 && (
                          <span className="inline-flex items-center px-2 py-0.5 bg-cc-base-elevated rounded-sm font-mono text-[10px] text-cc-text-low">
                            +{candidate.pastEmployment.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
