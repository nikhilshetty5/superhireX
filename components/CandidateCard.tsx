
import React, { useEffect, useState } from 'react';
import { Candidate } from '../types';
import { getAIRecommendation } from '../services/geminiService';
import { User, MapPin, Award, Sparkles } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const [aiInsight, setAiInsight] = useState<string>('');

  useEffect(() => {
    getAIRecommendation(candidate, 'RECRUITER').then(setAiInsight);
  }, [candidate]);

  return (
    <div className="h-full flex flex-col p-0 text-white select-none">
      <div className="relative h-64">
        <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
        <div className="absolute bottom-4 left-6">
          <h2 className="text-3xl font-bold">{candidate.name}</h2>
          <p className="text-white/70 font-medium">{candidate.title}</p>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-white/80">
            <MapPin size={18} className="text-red-400" />
            <span>{candidate.location}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Award size={18} className="text-yellow-400" />
            <span>{candidate.experience} experience</span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">About</h3>
          <p className="text-white/90 leading-relaxed mb-4">{candidate.bio}</p>
          
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {aiInsight && (
          <div className="mt-6 p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-green-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Talent Insight</span>
            </div>
            <p className="text-sm text-white/80 italic">"{aiInsight}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateCard;
