/**
 * Job Card Component
 * 
 * Displays job listing information.
 * AI insights now come from backend API (pre-computed).
 */

import React from 'react';
import { Job } from '../types';
import { Briefcase, MapPin, DollarSign, Sparkles } from 'lucide-react';

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  // AI insight comes from backend (pre-computed during job feed generation)
  const aiInsight = (job as any).match_reason || '';

  return (
    <div className="h-full flex flex-col p-6 text-white select-none" data-testid="job-card">
      <div className="flex items-center gap-4 mb-6">
        <img src={job.logo} alt={job.company} className="w-16 h-16 rounded-xl object-cover bg-white/5" />
        <div>
          <h2 className="text-2xl font-bold leading-tight" data-testid="job-title">{job.title}</h2>
          <p className="text-white/60 font-medium" data-testid="job-company">{job.company}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-white/80" data-testid="job-location">
          <MapPin size={18} className="text-blue-400" />
          <span>{job.location}</span>
        </div>
        {job.salary && (
          <div className="flex items-center gap-2 text-white/80" data-testid="job-salary">
            <DollarSign size={18} className="text-green-400" />
            <span>{job.salary}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-white/80" data-testid="job-posted-at">
          <Briefcase size={18} className="text-purple-400" />
          <span>{job.postedAt || 'Recently posted'}</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">Job Description</h3>
        <p className="text-white/90 leading-relaxed mb-4" data-testid="job-description">{job.description}</p>
        
        {job.requirements && job.requirements.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2" data-testid="job-requirements">
            {job.requirements.map((req, i) => (
              <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
                {req}
              </span>
            ))}
          </div>
        )}
      </div>

      {aiInsight && (
        <div className="mt-6 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-2xl" data-testid="ai-insight">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">AI Matching Analysis</span>
          </div>
          <p className="text-sm text-white/80 italic">"{aiInsight}"</p>
        </div>
      )}
    </div>
  );
};

export default JobCard;
