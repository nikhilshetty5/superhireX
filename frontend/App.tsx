
import React, { useState, useCallback, useEffect } from 'react';
import { UserRole, Job, Candidate } from './types';
import SwipeCard from './components/SwipeCard';
import JobCard from './components/JobCard';
import CandidateCard from './components/CandidateCard';
import AuthForm from './components/AuthForm';
import ResumeUpload from './components/ResumeUpload';
import { authService } from './services/authService';
import { dataService } from './services/dataService';
import { swipeService } from './services/swipeService';
import { supabase } from './lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Briefcase, RefreshCcw, Heart, X, CheckCircle2, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';

// 🧪 DEMO MODE - Disable auth for testing AI parsing
const DEMO_MODE = false;
const DEMO_USER_ID = 'demo-test-user-' + Date.now();
const DEMO_USER_EMAIL = 'demo@test.superhirex.com';

const App: React.FC = () => {
  // MVP: Only Job Seeker role
  const role = UserRole.SEEKER;
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);

  console.log('App component loaded. Current state (MVP - Seekers Only):', { user, loading, error });

  /**
   * STEP D — Global Auth State Listener (CRITICAL)
   */
  useEffect(() => {
    if (DEMO_MODE) {
      console.log('🧪 DEMO MODE - Skipping Supabase auth');
      // Auto-login with demo user
      setUser({ 
        id: DEMO_USER_ID, 
        email: DEMO_USER_EMAIL 
      } as User);
      setProfile({ 
        id: DEMO_USER_ID,
        user_id: DEMO_USER_ID,
        full_name: 'Demo User', 
        email: DEMO_USER_EMAIL, 
        role: 'SEEKER',
        has_resume: false
      });
      setShowResumeUpload(true);
      setLoading(false);
      return;
    }
    
    console.log('Auth effect starting...');
    
    try {
      // Initial check
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          console.log('Session check result:', session ? 'logged in' : 'not logged in');
          setUser(session?.user ?? null);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Auth session error:', err);
          setError(err?.message || 'Auth error');
          setLoading(false);
        });

      // Listen for changes (login, logout, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('Auth state changed:', _event);
        setUser(session?.user ?? null);
      });

      return () => {
        console.log('Unsubscribing from auth changes');
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('Supabase initialization error:', error);
      setError(String(error));
      setLoading(false);
    }
  }, []);

  // Fetch profile when user is authenticated
  useEffect(() => {
    if (user) {
      // For MVP, only seekers - fetch profile
      authService.getUserProfile(user.id).then(data => {
        if (data) {
          setProfile(data);
          // Show resume upload if user doesn't have a resume yet
          const hasResume = data?.has_resume === true;
          setResumeUploaded(hasResume);
          
          // If no resume, show upload screen
          if (!hasResume) {
            console.log('No resume found, showing upload screen');
            setShowResumeUpload(true);
          } else {
            console.log('Resume found, going to job feed');
            setShowResumeUpload(false);
          }
        }
      }).catch(err => {
        console.error('Error fetching profile:', err);
        // Default to showing upload screen if fetch fails
        setShowResumeUpload(true);
      });
    }
  }, [user]);

  // Load jobs for seekers
  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const data = await dataService.getJobs();
    setJobs(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleLogout = async () => {
    await authService.logout();
    setJobs([]);
  };

  const handleSwipe = useCallback(async (direction: 'left' | 'right', id: string) => {
    if (!user) return;

    setJobs(prev => prev.filter(j => j.id !== id));

    const { isMatch } = await swipeService.recordSwipe(user.id, id, direction, 'job');
    
    if (isMatch) {
      setShowMatch(true);
      setTimeout(() => setShowMatch(false), 3000);
    }
  }, [user]);

  const resetStack = () => {
    dataService.refresh();
    loadData();
  };

  // Show resume upload FIRST (before loading spinner)
  if (user && showResumeUpload) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <ResumeUpload
          userId={user.id}
          userEmail={user.email}
          onSuccess={(data) => {
            setResumeUploaded(true);
            setShowResumeUpload(false);
            // Fetch updated profile after creation
            authService.getUserProfile(user.id).then(profileData => {
              if (profileData) {
                setProfile(profileData);
              }
            });
          }}
          onSkip={() => {
            setShowResumeUpload(false);
            setResumeUploaded(true);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-white/60 mb-8">{error}</p>
          <p className="text-white/40 text-sm mb-8">Check browser console (F12) for more details</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-all"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Identity logic: if no user, show signup (no role selection for MVP)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-7xl font-black text-white tracking-widest drop-shadow-[0_0_25px_rgba(0,255,200,0.5)]">SUPERHIREX</h1>
          <p className="text-white/50 text-xl max-w-xs mx-auto">The swipe-to-work evolution.</p>
        </motion.div>
        <AuthForm role="SEEKER" onSuccess={() => {}} onBack={() => {}} />
      </div>
    );
  }

  // Show resume upload for job seekers immediately after login
  if (user && showResumeUpload) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <ResumeUpload
          userId={user.id}
          userEmail={user.email}
          onSuccess={(data) => {
            setResumeUploaded(true);
            setShowResumeUpload(false);
            // Fetch updated profile after creation
            authService.getUserProfile(user.id).then(profileData => {
              if (profileData) {
                setProfile(profileData);
              }
            });
          }}
          onSkip={() => {
            setShowResumeUpload(false);
            setResumeUploaded(true);
          }}
        />
      </div>
    );
  }

  const stack = jobs;

  return (
    <div className="h-screen bg-black overflow-hidden relative flex flex-col">
      <header className="p-6 flex items-center justify-between z-50">
        <button onClick={handleLogout} className="text-white/20 hover:text-white transition-colors">
          <LogOut size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black text-white tracking-tighter italic uppercase">SUPERHIREX</h1>
          <span className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.3em]">MVP - Job Seekers</span>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 p-0.5 overflow-hidden">
          <img className="w-full h-full rounded-full object-cover" src={`https://ui-avatars.com/api/?name=${profile?.full_name || user.email}&background=3b82f6&color=fff`} alt="Profile" />
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center">
        <AnimatePresence>
          {stack.length > 0 ? (
            stack.map((item) => (
              <SwipeCard 
                key={item.id} 
                onSwipeLeft={() => handleSwipe('left', item.id)}
                onSwipeRight={() => handleSwipe('right', item.id)}
                rightLabel="APPLY"
              >
                <JobCard job={item as Job} />
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
              <h1 className="text-7xl font-black text-white tracking-tighter mb-4 italic uppercase">MATCHED!</h1>
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
