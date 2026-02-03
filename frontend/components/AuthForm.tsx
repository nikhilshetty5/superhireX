
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  role: 'SEEKER' | 'RECRUITER';
}

type FormStep = 'credentials' | 'authenticated' | 'existing-user';

const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onBack, role }) => {
  const [step, setStep] = useState<FormStep>('credentials');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingUserEmail, setExistingUserEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // Check if profile exists for login
      if (isLogin) {
        try {
          const backendUrl = (import.meta as any).env.VITE_BACKEND_URL;
          const response = await fetch(`${backendUrl}/api/check-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() })
          });

          if (response.ok) {
            const data = await response.json();
            if (!data.profile_exists) {
              setError('No account found with this email. Please sign up first.');
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.log('Could not check email, proceeding with login');
        }
      }

      try {
        if (isLogin) {
          const result = await authService.signIn(email.trim(), password);
          if (result.error) {
            throw new Error(result.error?.message || 'Invalid login credentials');
          }
          const user = result.user;
          
          if (user) {
            await authService.authenticateUser(email.trim(), role);
            setIsVerified(true);
            setTimeout(() => onSuccess(), 800);
          }
        } else {
          // Sign up
          const signUpResult = await authService.signUp(email.trim(), password, name.trim());
          if (signUpResult.error) {
            throw new Error(signUpResult.error?.message || 'Sign up failed');
          }
          
          const signUpUser = signUpResult.user;
          if (!signUpUser) {
            throw new Error('Sign up completed but no user returned');
          }

          // For new signups, Supabase may require email confirmation
          // Try to create session immediately
          try {
            const signInResult = await authService.signIn(email.trim(), password);
            if (signInResult.error) {
              // If signin fails after signup, email confirmation might be required
              console.log('Email confirmation may be required. Account created, please check your email.');
              throw new Error('Account created! Please check your email to verify before logging in.');
            }
            
            const signInUser = signInResult.user;
            if (signInUser) {
              await authService.authenticateUser(email.trim(), role, name.trim());
              setIsVerified(true);
              setTimeout(() => onSuccess(), 800);
            }
          } catch (signInErr: any) {
            // Even if signin fails, the account exists now
            throw new Error(signInErr.message || 'Account created! Please verify your email.');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
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
      
      <AnimatePresence mode="wait">
        {step === 'credentials' ? (
          <motion.div key="credentials" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white mb-2 italic uppercase">
                {isLogin ? 'Welcome back' : 'Join SuperHireX'}
              </h2>
              <p className="text-white/40 text-sm">
                {isLogin ? 'Sign in to your account' : 'Ready to find your next career move?'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors" 
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors" 
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={20} />
                <input 
                  type="password" 
                  placeholder="Password (min 6 characters)" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-white/40 transition-colors" 
                />
              </div>
              {error && <div className="text-red-400 text-xs flex items-center gap-2 px-2"><AlertCircle size={14} />{error}</div>}
              <button type="submit" disabled={loading} className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50">
                {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); setPassword(''); }} 
              className="w-full mt-6 text-sm text-white/30 hover:text-white transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </motion.div>
        ) : step === 'existing-user' ? (
          <motion.div key="existing-user" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-purple-500/20 shadow-lg shadow-purple-500/5">
                <CheckCircle2 size={32} className="text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
              <p className="text-white/40 text-sm mb-4">We found your account.</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setStep('credentials');
                  setPassword('');
                  setError(null);
                }}
                className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-white/90 active:scale-95 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setStep('credentials');
                  setEmail('');
                  setPassword('');
                  setError(null);
                  setExistingUserEmail(null);
                }}
                className="w-full bg-white/5 border border-white/20 text-white font-black py-4 rounded-2xl hover:bg-white/10 active:scale-95 transition-all"
              >
                Try Different Email
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="authenticated" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="mb-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6 mx-auto border border-green-500/20 shadow-lg shadow-green-500/5">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Success!</h2>
              <p className="text-white/40 text-sm">You're all set. Redirecting...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AuthForm;
