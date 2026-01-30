
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ChevronLeft, ShieldCheck, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  role: 'SEEKER' | 'RECRUITER';
}

type FormStep = 'credentials' | 'verifying';

const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'msn.com', 'live.com'];

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onBack, role }) => {
  const [step, setStep] = useState<FormStep>('credentials');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDomainValid, setIsDomainValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (role === 'RECRUITER' && email.includes('@')) {
      const domain = email.split('@')[1]?.toLowerCase();
      const isValid = domain && domain.includes('.') && !PUBLIC_DOMAINS.includes(domain);
      setIsDomainValid(isValid);
    } else {
      setIsDomainValid(null);
    }
  }, [email, role]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (role === 'RECRUITER' && !isLogin && !isDomainValid) {
      setError('Please use a valid company email address.');
      return;
    }

    setLoading(true);
    try {
      await authService.requestOTP(email);
      setStep('verifying');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const user = await authService.verifyOTP(email, code, role, isLogin ? undefined : name);
      if (user) {
        setIsVerified(true);
        setTimeout(() => onSuccess(), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-8 bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
      <button 
        disabled={loading || isVerified}
        onClick={step === 'verifying' ? () => setStep('credentials') : onBack}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group disabled:opacity-30"
      >
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">{step === 'verifying' ? 'Edit credentials' : 'Back to roles'}</span>
      </button>

      <AnimatePresence mode="wait">
        {step === 'credentials' ? (
          <motion.div key="credentials" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white mb-2 italic uppercase">
                {isLogin ? 'Welcome back' : 'Join SuperHireX'}
              </h2>
              <p className="text-white/40 text-sm">
                {role === 'SEEKER' ? 'Ready to find your next adventure?' : 'Let\'s build your dream team.'}
              </p>
            </div>

            <form onSubmit={handleInitialSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                  <input type="text" placeholder="Full Name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors" />
                </div>
              )}
              <div className="relative">
                {role === 'RECRUITER' ? <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} /> : <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />}
                <input type="email" placeholder={role === 'RECRUITER' ? 'Work Email' : 'Email Address'} required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors" />
              </div>
              {error && <div className="text-red-400 text-xs flex items-center gap-2 px-2"><AlertCircle size={14} />{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50">
                {loading ? 'Sending Code...' : isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-6 text-sm text-white/30 hover:text-white transition-colors">
              {isLogin ? "Don't have an account? Sign Up" : "Already registered? Sign In"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="verifying" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-blue-500/20 shadow-lg shadow-blue-500/5">
                {isVerified ? <CheckCircle2 size={32} className="text-green-500" /> : <ShieldCheck size={32} className="text-blue-500" />}
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">{isVerified ? 'Success!' : 'Verification'}</h2>
              <p className="text-white/40 text-sm">Enter the code sent to your inbox.</p>
            </div>
            <form onSubmit={handleVerify} className="space-y-6">
              <input type="text" maxLength={6} placeholder="000000" disabled={isVerified} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="w-full bg-black border border-white/10 rounded-2xl py-5 text-center text-4xl font-mono tracking-[0.2em] text-white focus:outline-none focus:border-blue-500 transition-all" />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading || code.length < 4 || isVerified} className={`w-full font-black py-4 rounded-2xl transition-all ${isVerified ? 'bg-green-500 text-white' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`}>
                {loading ? 'Verifying...' : isVerified ? 'Verified' : 'Confirm'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthForm;
