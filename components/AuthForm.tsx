
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, ChevronLeft, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthFormProps {
  onSuccess: (userData: { email: string; name?: string }) => void;
  onBack: () => void;
  role: 'SEEKER' | 'RECRUITER';
}

type FormStep = 'credentials' | 'verifying';

const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'];

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onBack, role }) => {
  const [step, setStep] = useState<FormStep>('credentials');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompanyEmail = (emailStr: string) => {
    const domain = emailStr.split('@')[1]?.toLowerCase();
    return domain && !PUBLIC_DOMAINS.includes(domain);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (role === 'RECRUITER' && !isLogin && !isCompanyEmail(email)) {
      setError('Recruiters must register with a valid company email address.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('verifying');
    }, 1000);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      setError('Please enter a valid 4-digit code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess({ email, name: isLogin ? 'User' : name });
    }, 1200);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-8 bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
      
      <button 
        onClick={step === 'verifying' ? () => setStep('credentials') : onBack}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">{step === 'verifying' ? 'Edit credentials' : 'Back to roles'}</span>
      </button>

      <AnimatePresence mode="wait">
        {step === 'credentials' ? (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-white/40">
                {role === 'SEEKER' ? 'Join the Kergox talent pool' : 'Register your company profile'}
              </p>
            </div>

            <form onSubmit={handleInitialSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="nameInput"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input
                  type="email"
                  placeholder={role === 'RECRUITER' ? 'Work Email Address' : 'Email Address'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400 text-xs leading-relaxed"
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Verify Email'}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="mb-8 flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                <ShieldCheck size={32} className="text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Check your inbox</h2>
              <p className="text-white/40 text-sm max-w-[240px]">
                We sent a verification code to <span className="text-white/80">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex justify-center gap-3">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="0000"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-32 bg-black border border-white/10 rounded-2xl py-4 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 4}
                className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Code</span>
                    <ShieldCheck size={20} />
                  </>
                )}
              </button>

              <button
                type="button"
                className="text-sm text-white/40 hover:text-white transition-colors"
                onClick={() => {
                  setError('Code resent!');
                  setTimeout(() => setError(null), 3000);
                }}
              >
                Did not receive a code? Resend
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthForm;
