
import React, { useState, useCallback, useEffect } from 'react';
import { UserRole, Job, Candidate } from './types';
import SwipeCard from './components/SwipeCard';
import JobCard from './components/JobCard';
import CandidateCard from './components/CandidateCard';
import AuthForm from './components/AuthForm';
import { authService, UserSession } from './services/authService';
import { dataService } from './services/dataService';
import { swipeService } from './services/swipeService';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Briefcase, RefreshCcw, Heart, X, CheckCircle2, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [session, setSession] = useState<UserSession | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMatch, setShowMatch] = useState(false);

  // Load initial data when authenticated
  const loadData = useCallback(async () => {
    setLoading(true);
    if (role === UserRole.SEEKER) {
      const data = await dataService.getJobs();
      setJobs(data);
    } else if (role === UserRole.RECRUITER) {
      const data = await dataService.getCandidates();
      setCandidates(data);
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  const handleAuthSuccess = (userData: { email: string; name?: string }) => {
    const activeSession = authService.getCurrentSession();
    setSession(activeSession);
  };

  const handleLogout = () => {
    authService.logout();
    setSession(null);
    setRole(UserRole.NONE);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right', id: string) => {
    if (!session) return;

    if (role === UserRole.SEEKER) setJobs(prev => prev.filter(j => j.id !== id));
    else setCandidates(prev => prev.filter(c => c.id !== id));

    const { isMatch } = await swipeService.recordSwipe(session.userId, id, direction);
    
    if (isMatch) {
      setShowMatch(true);
      setTimeout(() => setShowMatch(false), 3000);
    }
  }, [role, session]);

  const resetStack = () => {
    dataService.refresh();
    loadData();
  };

  if (role === UserRole.NONE) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-6xl font-black text-white tracking-tighter mb-4 italic">SUPERHIREX</h1>
          <p className="text-white/50 text-xl max-w-xs mx-auto">The swipe-to-work evolution.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <button onClick={() => setRole(UserRole.SEEKER)} className="group p-12 bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] hover:border-blue-500/50 transition-all active:scale-95">
            <Briefcase size={48} className="text-blue-500 mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-white mb-2">Job Seeker</h2>
            <p className="text-white/40 text-sm">Find your next career move.</p>
          </button>
          <button onClick={() => setRole(UserRole.RECRUITER)} className="group p-12 bg-[#1A1A1A] border border-white/10 rounded-[2.5rem] hover:border-purple-500/50 transition-all active:scale-95">
            <Users size={48} className="text-purple-500 mb-4 mx-auto group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-white mb-2">Recruiter</h2>
            <p className="text-white/40 text-sm">Discover top talent.</p>
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <AuthForm role={role as 'SEEKER' | 'RECRUITER'} onSuccess={handleAuthSuccess} onBack={() => setRole(UserRole.NONE)} />
      </div>
    );
  }

  const stack = role === UserRole.SEEKER ? jobs : candidates;

  return (
    <div className="h-screen bg-black overflow-hidden relative flex flex-col">
      <header className="p-6 flex items-center justify-between z-50">
        <button onClick={handleLogout} className="text-white/20 hover:text-white transition-colors">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-white tracking-tighter italic">SUPERHIREX</h1>
          <span className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.3em]">
            {role === UserRole.SEEKER ? 'Seeker Mode' : 'Recruiter Mode'}
          </span>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 p-0.5 overflow-hidden">
          <img className="w-full h-full rounded-full object-cover" src={`https://ui-avatars.com/api/?name=${session.name || 'User'}&background=3b82f6&color=fff`} alt="Profile" />
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white/30 text-sm font-medium tracking-widest uppercase">Fetching Stack...</p>
          </div>
        ) : (
          <AnimatePresence>
            {stack.length > 0 ? (
              stack.map((item) => (
                <SwipeCard 
                  key={item.id} 
                  onSwipeLeft={() => handleSwipe('left', item.id)}
                  onSwipeRight={() => handleSwipe('right', item.id)}
                  rightLabel={role === UserRole.SEEKER ? "APPLY" : "INTERVIEW"}
                >
                  {role === UserRole.SEEKER ? <JobCard job={item as Job} /> : <CandidateCard candidate={item as Candidate} />}
                </SwipeCard>
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-10">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto border border-white/10">
                  <RefreshCcw size={32} className="text-white/20" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">End of the line!</h2>
                <p className="text-white/40 mb-8 max-w-xs mx-auto">No more recommendations in your area. Check back later.</p>
                <button onClick={resetStack} className="px-10 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-all">
                  Refresh Data
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="p-8 flex items-center justify-center gap-6 z-50">
        <button disabled={stack.length === 0} onClick={() => stack.length > 0 && handleSwipe('left', stack[stack.length - 1].id)} className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all active:scale-90 disabled:opacity-10">
          <X size={32} />
        </button>
        <button disabled={stack.length === 0} onClick={() => stack.length > 0 && handleSwipe('right', stack[stack.length - 1].id)} className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 hover:bg-green-500/20 shadow-lg shadow-green-500/5 transition-all active:scale-90 disabled:opacity-10">
          <Heart size={40} fill="currentColor" />
        </button>
      </footer>

      <AnimatePresence>
        {showMatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-3xl">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center">
              <div className="relative mb-8">
                <Heart size={140} className="text-green-500 mx-auto drop-shadow-[0_0_30px_rgba(34,197,94,0.4)]" fill="currentColor" />
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 size={48} className="text-black" />
                </motion.div>
              </div>
              <h1 className="text-7xl font-black text-white tracking-tighter mb-4 italic">MATCHED!</h1>
              <p className="text-white/60 text-xl font-medium">Both parties are interested in a conversation.</p>
              <div className="mt-12 flex gap-4 justify-center">
                <button onClick={() => setShowMatch(false)} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all">Keep Swiping</button>
                <button className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold transition-all">Send Message</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
