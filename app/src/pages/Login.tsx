import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldAlert, KeyRound, Terminal, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import Toast from '@/components/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated, loginError } = useStore();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    // Subtle micro-delay to give a highly-professional server feel
    await new Promise((r) => setTimeout(r, 700));

    const success = login(email, password);
    setIsLoading(false);

    if (success) {
      navigate('/', { replace: true });
    } else {
      setErrorMsg('Invalid authorization credentials. Please try again.');
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@pythonhr.com');
    setPassword('admin123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-cc-base-deep overflow-hidden px-4 select-none">
      {/* Background Animated Tech Grids & Particles */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[linear-gradient(to_right,#2a3038_1px,transparent_1px),linear-gradient(to_bottom,#2a3038_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Glowing background orbs for premium visual quality */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(184,92,61,0.06)_0%,transparent_70%)] blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(91,143,191,0.05)_0%,transparent_70%)] blur-3xl pointer-events-none z-0" />

      <Toast />

      {/* Main glassmorphism login frame */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Terminal Header */}
        <div className="mb-2 flex items-center justify-between px-2 text-cc-text-low font-mono text-[10px] tracking-widest uppercase">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cc-danger animate-pulse-slow" />
            <span className="h-1.5 w-1.5 rounded-full bg-cc-gold animate-pulse-slow delay-75" />
            <span className="h-1.5 w-1.5 rounded-full bg-cc-green animate-pulse-slow delay-150" />
            <span className="ml-1 text-cc-text-mid font-medium">SYS_AUTH_PORTAL // V1.0</span>
          </div>
          <span className="text-[9px]">SECURE CONNECTION</span>
        </div>

        {/* Shake Wrapper on Failure */}
        <motion.div
          animate={shakeTrigger ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-cc-base-surface/85 backdrop-blur-xl border border-cc-gridline/80 rounded p-6 lg:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          {/* Logo Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded border border-cc-warm-primary/30 bg-cc-warm-primary/5 text-cc-warm-primary mb-4 shadow-[0_0_20px_rgba(184,92,61,0.15)] relative group">
              <KeyRound size={26} className="text-cc-warm-primary group-hover:rotate-45 transition-transform duration-300" />
              <div className="absolute inset-0 border border-cc-warm-primary rounded scale-105 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
            </div>
            <h2 className="font-mono text-xl font-light tracking-[0.06em] text-cc-text-high uppercase">
              PYCRM LOGIN
            </h2>
            <p className="mt-1 font-sans text-xs text-cc-text-mid">
              Python HR candidate reconciliation control panel.
            </p>
          </div>

          {/* Alert messages */}
          <AnimatePresence mode="wait">
            {(errorMsg || loginError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="flex gap-2.5 items-start p-3.5 border border-cc-danger/30 bg-cc-danger/10 text-cc-danger rounded-sm font-sans text-xs leading-normal">
                  <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{errorMsg || loginError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email input field */}
            <div>
              <label className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-cc-text-mid block mb-1.5">
                IDENTITY EMAIL
              </label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cc-text-low group-focus-within:text-cc-warm-primary transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
                  placeholder="admin@pythonhr.com"
                  disabled={isLoading}
                  className="w-full h-11 bg-cc-base-deep border border-cc-gridline rounded pl-10 pr-4 font-sans text-sm text-cc-text-high placeholder:text-cc-text-low/60 focus:outline-none focus:border-cc-warm-primary focus:shadow-[0_0_0_3px_rgba(184,92,61,0.1)] transition-all"
                />
              </div>
            </div>

            {/* Password input field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-cc-text-mid">
                  AUTHORIZATION ACCESS KEY
                </label>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cc-text-low group-focus-within:text-cc-warm-primary transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full h-11 bg-cc-base-deep border border-cc-gridline rounded pl-10 pr-10 font-sans text-sm text-cc-text-high placeholder:text-cc-text-low/60 focus:outline-none focus:border-cc-warm-primary focus:shadow-[0_0_0_3px_rgba(184,92,61,0.1)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-cc-text-low hover:text-cc-text-mid rounded hover:bg-cc-base-elevated transition-all"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Action Trigger Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-11 bg-cc-warm-primary text-white font-mono text-[11px] font-semibold uppercase tracking-[0.1em] rounded hover:bg-cc-warm-primary-hover hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(184,92,61,0.3)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all mt-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AUTHENTICATING...
                </div>
              ) : (
                <>
                  <Terminal size={14} />
                  ESTABLISH COMMAND SESSION
                </>
              )}
            </button>
          </form>

          {/* Quick-fill helper bubble */}
          <div className="mt-6 pt-5 border-t border-cc-gridline/40 text-center">
            <p className="font-mono text-[9px] text-cc-text-low uppercase tracking-wider mb-2">
              DEMO CREDENTIAL LOCKBOX
            </p>
            <button
              type="button"
              onClick={handleQuickFill}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(199,178,153,0.06)] border border-[rgba(199,178,153,0.15)] rounded-full hover:bg-[rgba(199,178,153,0.12)] hover:border-cc-warm-text transition-all font-mono text-[10px] text-cc-warm-text cursor-pointer"
            >
              <KeyRound size={11} />
              PRE-FILL MOCK ADMIN
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
