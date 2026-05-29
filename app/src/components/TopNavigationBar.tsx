import { Link, useLocation, useNavigate } from 'react-router';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import CandidateSearchPanel from './CandidateSearchPanel';

export default function TopNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { themeMode, toggleThemeMode, user, logout } = useStore();
  const isSunny = themeMode === 'sunny';
  const isActive = (path: string) => location.pathname === path;

  const userInitials = user 
    ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'HR';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-cc-base-deep border-b border-cc-gridline z-[100] shadow-[0_12px_40px_rgba(0,0,0,0.32)]">
        <div className="max-w-[1200px] mx-auto h-14 flex items-center justify-between px-4 lg:px-6">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className={`h-8 w-8 inline-flex items-center justify-center rounded border transition-colors ${
                searchOpen
                  ? 'bg-cc-warm-primary border-cc-warm-primary text-white'
                  : 'bg-cc-base-surface border-cc-gridline text-cc-text-mid hover:text-cc-text-high hover:border-cc-warm-primary'
              }`}
              aria-label={searchOpen ? 'Close search panel' : 'Open search panel'}
              title={searchOpen ? 'Close search' : 'Open search'}
            >
              {searchOpen ? <X size={16} /> : <Search size={16} />}
            </button>

            <button
              type="button"
              onClick={toggleThemeMode}
              className="group relative h-8 w-[68px] rounded-full border border-cc-gridline bg-cc-base-surface p-1 shadow-inset-glow transition-colors hover:border-cc-warm-primary"
              aria-label={isSunny ? 'Switch to Command Center theme' : 'Switch to Sunny Meadows theme'}
              title={isSunny ? 'Command Center theme' : 'Sunny Meadows theme'}
            >
              <span
                className={`absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-cc-warm-primary shadow-[0_3px_10px_rgba(0,0,0,0.22)] transition-transform ${
                  isSunny ? 'translate-x-[34px]' : 'translate-x-0'
                }`}
              />
              <span className="relative z-10 flex h-full items-center justify-between px-1">
                <Moon size={14} className={isSunny ? 'text-cc-text-low' : 'text-white'} />
                <Sun size={14} className={isSunny ? 'text-white' : 'text-cc-text-low'} />
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-7 h-7 rounded-full bg-cc-base-surface border border-cc-gridline flex items-center justify-center font-mono text-[10px] uppercase tracking-wider text-cc-text-mid hover:text-cc-text-high hover:border-cc-text-mid transition-colors"
                title={user?.name || 'User Profile'}
              >
                {userInitials}
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-9 z-50 w-48 bg-cc-base-surface border border-cc-gridline rounded shadow-panel py-1">
                    <div className="px-4 py-2 border-b border-cc-gridline/40">
                      <p className="font-mono text-[10px] text-cc-text-low truncate uppercase tracking-wider">Logged in as</p>
                      <p className="font-sans text-xs font-semibold text-cc-text-high truncate">{user?.name || 'HR Admin'}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-cc-text-mid hover:text-cc-text-high hover:bg-cc-base-elevated transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate('/login', { replace: true });
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-cc-text-mid hover:text-cc-danger hover:bg-cc-base-elevated transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="sm:hidden p-2 hover:bg-cc-base-elevated rounded transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={20} className="text-cc-text-mid" /> : <Menu size={20} className="text-cc-text-mid" />}
            </button>
          </div>
        </div>

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
      </nav>

      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close search overlay"
              className="fixed inset-x-0 bottom-0 top-14 z-[88] bg-black/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              className="fixed left-0 right-0 top-14 z-[96] border-b border-cc-gridline bg-cc-base-deep px-4 py-4 shadow-[0_18px_52px_rgba(0,0,0,0.42)]"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="max-w-[1200px] mx-auto">
                <CandidateSearchPanel
                  autoFocus
                  onCandidateSelect={() => setSearchOpen(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
