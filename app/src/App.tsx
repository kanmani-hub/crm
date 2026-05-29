import { Routes, Route, useLocation, Navigate } from 'react-router';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import CandidateProfile from './pages/CandidateProfile';
import SettingsPage from './pages/Settings';
import NewRegistrationForm from './pages/NewRegistrationForm';
import BGVForm from './pages/BGVForm';
import { useStore } from './store/useStore';
import LoginPage from './pages/Login';

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const isExternalForm = location.pathname.startsWith('/form/');
  const themeMode = useStore((state) => state.themeMode);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-sunny', themeMode === 'sunny');
  }, [themeMode]);

  useEffect(() => {
    useStore.getState().fetchInitialData();
  }, []);

  // External forms don't use page transitions (they have their own theme)
  if (isExternalForm) {
    return (
      <Routes>
        <Route path="/form/register/:token" element={<NewRegistrationForm />} />
        <Route path="/form/bgv/:token" element={<BGVForm />} />
      </Routes>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/search" element={<Navigate to="/" replace />} />
        <Route path="/candidate/:id" element={<ProtectedRoute><PageTransition><CandidateProfile /></PageTransition></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
