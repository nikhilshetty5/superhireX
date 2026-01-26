
import React, { useEffect, useState } from 'react';
import { Job } from '../types';
import { getAIRecommendation } from '../services/geminiService';
import { Briefcase, MapPin, DollarSign, Sparkles } from 'lucide-react';

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const [aiInsight, setAiInsight] = useState<string>('');

  useEffect(() => {
    getAIRecommendation(job, 'SEEKER').then(setAiInsight);
  }, [job]);

  return (
    <div className="h-full flex flex-col p-6 text-white select-none">
      <div className="flex items-center gap-4 mb-6">
        <img src={job.logo} alt={job.company} className="w-16 h-16 rounded-xl object-cover bg-white/5" />
        <div>
          <h2 className="text-2xl font-bold leading-tight">{job.title}</h2>
          <p className="text-white/60 font-medium">{job.company}</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-white/80">
          <MapPin size={18} className="text-blue-400" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <DollarSign size={18} className="text-green-400" />
          <span>{job.salary}</span>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <Briefcase size={18} className="text-purple-400" />
          <span>{job.postedAt}</span>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">Job Description</h3>
        <p className="text-white/90 leading-relaxed mb-4">{job.description}</p>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {job.requirements.map((req, i) => (
            <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
              {req}
            </span>
          ))}
        </div>
      </div>

      {aiInsight && (
        <div className="mt-6 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-2xl">
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
