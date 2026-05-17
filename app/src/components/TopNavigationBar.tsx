import { Link, useLocation } from 'react-router';
import { Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';

export default function TopNavigationBar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { trackedCandidates } = useStore();
  const pendingCount = trackedCandidates.filter((t) => t.status === 'form-pending').length;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-cc-base-deep border-b border-cc-gridline z-[100]">
      <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between px-4 lg:px-6">
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
            <Link
              to="/search"
              className={`nav-label transition-colors ${isActive('/search') ? 'text-cc-text-high' : 'text-cc-text-mid hover:text-cc-warm-text'}`}
            >
              Search
            </Link>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button className="relative p-2 hover:bg-cc-base-elevated rounded transition-colors">
            <Bell size={20} strokeWidth={1.5} className="text-cc-text-mid" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cc-warm-primary" />
            )}
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
          <Link
            to="/search"
            onClick={() => setMenuOpen(false)}
            className={`block nav-label py-2 ${isActive('/search') ? 'text-cc-text-high' : 'text-cc-text-mid'}`}
          >
            Search
          </Link>
        </div>
      )}
    </nav>
  );
}
