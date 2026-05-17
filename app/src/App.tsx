import { Routes, Route, useLocation, Navigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import CandidateProfile from './pages/CandidateProfile';
import SettingsPage from './pages/Settings';
import NewRegistrationForm from './pages/NewRegistrationForm';
import BGVForm from './pages/BGVForm';

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

export default function App() {
  const location = useLocation();
  const isExternalForm = location.pathname.startsWith('/form/');

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
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/search" element={<Navigate to="/" replace />} />
        <Route path="/candidate/:id" element={<PageTransition><CandidateProfile /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="*" element={<PageTransition><Dashboard /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}
