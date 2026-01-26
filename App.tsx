
import React, { useState, useCallback } from 'react';
import { UserRole, Job, Candidate } from './types';
import { MOCK_JOBS, MOCK_CANDIDATES } from './constants';
import SwipeCard from './components/SwipeCard';
import JobCard from './components/JobCard';
import CandidateCard from './components/CandidateCard';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Briefcase, RefreshCcw, Heart, X, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
  const [history, setHistory] = useState<any[]>([]);
  const [showMatch, setShowMatch] = useState(false);

  const handleRoleSelection = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleSwipe = useCallback((direction: 'left' | 'right', id: string) => {
    if (role === UserRole.SEEKER) {
      const job = jobs.find(j => j.id === id);
      if (direction === 'right') {
        setHistory(prev => [...prev, { type: 'applied', data: job }]);
        // Simulate Match
        if (Math.random() > 0.7) {
          setShowMatch(true);
          setTimeout(() => setShowMatch(false), 3000);
        }
      }
      setJobs(prev => prev.filter(j => j.id !== id));
    } else {
      const candidate = candidates.find(c => c.id === id);
      if (direction === 'right') {
        setHistory(prev => [...prev, { type: 'shortlisted', data: candidate }]);
        if (Math.random() > 0.7) {
          setShowMatch(true);
          setTimeout(() => setShowMatch(false), 3000);
        }
      }
      setCandidates(prev => prev.filter(c => c.id !== id));
    }
  }, [role, jobs, candidates]);

  const resetStack = () => {
    if (role === UserRole.SEEKER) setJobs(MOCK_JOBS);
    else setCandidates(MOCK_CANDIDATES);
  };

  if (role === UserRole.NONE) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-black text-white tracking-tighter mb-4">KERGOX</h1>
          <p className="text-white/50 text-xl max-w-xs mx-auto">The swipe-to-work evolution.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button 
            onClick={() => handleRoleSelection(UserRole.SEEKER)}
            className="group relative flex flex-col items-center p-12 bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] hover:border-blue-500/50 transition-all active:scale-95"
          >
            <Briefcase size={48} className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-white mb-2">Job Seeker</h2>
            <p className="text-white/40 text-center text-sm">Find your next career move with a swipe.</p>
          </button>

          <button 
            onClick={() => handleRoleSelection(UserRole.RECRUITER)}
            className="group relative flex flex-col items-center p-12 bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] hover:border-purple-500/50 transition-all active:scale-95"
          >
            <Users size={48} className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-white mb-2">Recruiter</h2>
            <p className="text-white/40 text-center text-sm">Discover top talent in seconds.</p>
          </button>
        </div>
      </div>
    );
  }

  const stackSize = role === UserRole.SEEKER ? jobs.length : candidates.length;

  return (
    <div className="h-screen bg-black overflow-hidden relative flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between z-50">
        <button 
          onClick={() => setRole(UserRole.NONE)}
          className="text-white/40 hover:text-white transition-colors"
        >
          <X size={28} />
        </button>
        <h1 className="text-2xl font-black text-white tracking-tighter">KERGOX</h1>
        <div className="w-7" /> {/* Spacer */}
      </header>

      {/* Main Swipe Area */}
      <main className="flex-1 relative flex items-center justify-center">
        <AnimatePresence>
          {stackSize > 0 ? (
            role === UserRole.SEEKER ? (
              jobs.map((job) => (
                <SwipeCard 
                  key={job.id} 
                  onSwipeLeft={() => handleSwipe('left', job.id)}
                  onSwipeRight={() => handleSwipe('right', job.id)}
                  rightLabel="APPLY"
                  leftLabel="SKIP"
                >
                  <JobCard job={job} />
                </SwipeCard>
              ))
            ) : (
              candidates.map((candidate) => (
                <SwipeCard 
                  key={candidate.id} 
                  onSwipeLeft={() => handleSwipe('left', candidate.id)}
                  onSwipeRight={() => handleSwipe('right', candidate.id)}
                  rightLabel="HIRE"
                  leftLabel="SKIP"
                >
                  <CandidateCard candidate={candidate} />
                </SwipeCard>
              ))
            )
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-10 flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                <RefreshCcw size={32} className="text-white/40 animate-spin-slow" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">That's everyone!</h2>
              <p className="text-white/50 mb-8">We'll find more recommendations soon.</p>
              <button 
                onClick={resetStack}
                className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all active:scale-95"
              >
                Refresh Stack
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Controls */}
      <footer className="p-8 flex items-center justify-center gap-6 z-50">
        <button 
          disabled={stackSize === 0}
          onClick={() => {
            const current = role === UserRole.SEEKER ? jobs[jobs.length - 1] : candidates[candidates.length - 1];
            if (current) handleSwipe('left', current.id);
          }}
          className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all active:scale-90"
        >
          <X size={32} />
        </button>
        <button 
           disabled={stackSize === 0}
           onClick={() => {
            const current = role === UserRole.SEEKER ? jobs[jobs.length - 1] : candidates[candidates.length - 1];
            if (current) handleSwipe('right', current.id);
          }}
          className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500/20 shadow-lg shadow-green-500/10 transition-all active:scale-90"
        >
          <Heart size={40} fill="currentColor" />
        </button>
        <button 
          className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 hover:bg-blue-500/20 transition-all active:scale-90"
        >
          <RefreshCcw size={32} />
        </button>
      </footer>

      {/* Match Overlay */}
      <AnimatePresence>
        {showMatch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-center"
            >
              <div className="relative mb-6">
                <Heart size={120} className="text-green-500 mx-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" fill="currentColor" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <CheckCircle2 size={40} className="text-black" />
                </motion.div>
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter mb-2 italic">IT'S A MATCH!</h1>
              <p className="text-white/60 text-lg">A connection has been made on Kergox.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
