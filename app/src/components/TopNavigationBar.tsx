import { Link, useLocation } from 'react-router';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from './StatusBadge';

export default function TopNavigationBar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const {
    settings,
    themeMode,
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
    toggleThemeMode,
    getFilteredCandidates,
  } = useStore();
  const filteredCandidates = getFilteredCandidates();
  const isSunny = themeMode === 'sunny';
  const hasActiveSearch =
    searchQuery ||
    activeFilters.length > 0 ||
    branchFilter !== 'all' ||
    courseFilter !== 'all' ||
    placementFilter !== 'all';
  const showResults = hasActiveSearch && resultsOpen;

  const isActive = (path: string) => location.pathname === path;
  const filterPills = [
    { id: 'form-pending', label: 'Form Pending', color: 'amber' },
    { id: 'bgv-cleared', label: 'BGV Cleared', color: 'green' },
    { id: 'has-dues', label: 'Has Dues', color: 'red' },
  ];
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-cc-base-deep border-b border-cc-gridline z-[100] shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
      <div className="max-w-[1200px] mx-auto h-14 flex items-center justify-between px-4 lg:px-6">
        {/* Left cluster */}
        <div className="flex items-center gap-4">
          <Link to="/" className="font-mono text-xs font-medium tracking-[0.12em] uppercase text-cc-text-high hover:text-cc-warm-text transition-colors">
            COMMAND CENTER
          </Link>
          <div className="hidden sm:block w-px h-6 bg-cc-gridline" />
          <div className="hidden sm:flex items-center gap-4">
            <Link
              to="/"
              className={`nav-label transition-colors ${isActive('/') ? 'text-cc-text-high' : 'text-cc-text-mid hover:text-cc-warm-text'}`}
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleThemeMode}
            className="group relative h-8 w-[68px] rounded-full border border-cc-gridline bg-cc-base-surface p-1 shadow-inset-glow transition-colors hover:border-cc-warm-primary"
            aria-label={isSunny ? 'Switch to Command Center theme' : 'Switch to Sunny Meadows theme'}
            title={isSunny ? 'Command Center theme' : 'Sunny Meadows theme'}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-cc-warm-primary shadow-[0_3px_10px_rgba(0,0,0,0.22)] transition-transform ${
                isSunny ? 'translate-x-9' : 'translate-x-0'
              }`}
            />
            <span className="relative z-10 flex h-full items-center justify-between px-1">
              <Moon size={14} className={isSunny ? 'text-cc-text-low' : 'text-white'} />
              <Sun size={14} className={isSunny ? 'text-white' : 'text-cc-text-low'} />
            </span>
          </button>

          {/* Avatar */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-7 h-7 rounded-full bg-cc-base-surface border border-cc-gridline flex items-center justify-center font-mono text-[10px] uppercase tracking-wider text-cc-text-mid hover:text-cc-text-high hover:border-cc-text-mid transition-colors"
            >
              HR
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-9 z-50 w-40 bg-cc-base-surface border border-cc-gridline rounded shadow-panel py-1">
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-cc-text-mid hover:text-cc-text-high hover:bg-cc-base-elevated transition-colors"
                  >
                    Settings
                  </Link>
                  <button className="w-full text-left px-4 py-2 text-sm text-cc-text-mid hover:text-cc-text-high hover:bg-cc-base-elevated transition-colors">
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 hover:bg-cc-base-elevated rounded transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} className="text-cc-text-mid" /> : <Menu size={20} className="text-cc-text-mid" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden bg-cc-base-deep border-t border-cc-gridline px-4 py-3 space-y-2">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className={`block nav-label py-2 ${isActive('/') ? 'text-cc-text-high' : 'text-cc-text-mid'}`}
          >
            Dashboard
          </Link>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 pb-4">
        <div className="relative">
          <div className="grid gap-3 lg:grid-cols-[minmax(360px,1fr)_auto] lg:items-start">
            <div className="relative">
              <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-cc-warm-text" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setResultsOpen(true); }}
                onFocus={() => { if (hasActiveSearch) setResultsOpen(true); }}
                placeholder="Search by Candidate Name, Batch, Email, or Phone..."
                className="w-full h-16 bg-cc-base-surface border border-cc-gridline rounded pl-14 pr-12 font-sans text-[17px] text-cc-text-high placeholder:text-cc-text-mid focus:outline-none focus:border-cc-warm-primary focus:shadow-[0_0_0_3px_rgba(184,92,61,0.16),0_18px_48px_rgba(0,0,0,0.42)] shadow-[0_16px_44px_rgba(0,0,0,0.34)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearchQuery}
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
                      onClick={() => { toggleFilter(filter.id); setResultsOpen(true); }}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                <select
                  value={branchFilter}
                  onChange={(e) => { setBranchFilter(e.target.value); setResultsOpen(true); }}
                  className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
                >
                  <option value="all">All Branches</option>
                  {settings.branches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <select
                  value={courseFilter}
                  onChange={(e) => { setCourseFilter(e.target.value); setResultsOpen(true); }}
                  className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
                >
                  <option value="all">All Courses</option>
                  {settings.courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
                <select
                  value={placementFilter}
                  onChange={(e) => { setPlacementFilter(e.target.value); setResultsOpen(true); }}
                  className="h-9 bg-cc-base-surface border border-cc-gridline rounded px-2 font-sans text-[12px] text-cc-text-high focus:border-cc-warm-primary focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="training">In Training</option>
                  <option value="placed">Placed</option>
                </select>
              </div>
            </div>
          </div>

          {showResults && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-cc-base-deep border border-cc-gridline rounded shadow-[0_22px_70px_rgba(0,0,0,0.46)] max-h-[420px] overflow-y-auto">
              <div className="px-4 py-3 border-b border-cc-gridline flex items-center justify-between">
                <span className="micro-text text-cc-text-mid">
                  {filteredCandidates.length} matching candidate{filteredCandidates.length === 1 ? '' : 's'}
                </span>
              </div>
              {filteredCandidates.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="font-sans text-sm text-cc-text-mid">No candidates match this search</p>
                </div>
              ) : (
                <div className="divide-y divide-[rgba(42,48,56,0.55)]">
                  {filteredCandidates.slice(0, 8).map((candidate) => {
                    const totalPending = candidate.financials.reduce((sum, f) => {
                      const net = f.baseFee + f.adjustments.reduce((s, a) => s + a.amount, 0);
                      return sum + (Math.max(0, net) - f.paidToDate);
                    }, 0);

                    return (
                      <Link
                        key={candidate.id}
                        to={`/candidate/${candidate.id}`}
                        onClick={() => setResultsOpen(false)}
                        className="grid gap-2 sm:grid-cols-[1fr_auto] px-4 py-3 hover:bg-cc-base-surface transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-sans text-[14px] font-semibold text-cc-text-high truncate">
                            {candidate.fullName}
                          </p>
                          <p className="micro-text text-cc-text-mid truncate">
                            {candidate.batchName} · {candidate.course} · {candidate.branch}
                          </p>
                          <p className="micro-text text-cc-text-low truncate">
                            {candidate.email} · {candidate.phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                          <StatusBadge label={candidate.placed ? 'PLACED' : 'IN TRAINING'} variant={candidate.placed ? 'green' : 'neutral'} />
                          <StatusBadge label={formatCurrency(Math.max(0, totalPending))} variant={totalPending > 0 ? 'red' : 'green'} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
