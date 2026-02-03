/**
 * Candidate Card Component
 * 
 * Displays candidate profile information.
 * AI insights now come from backend API (pre-computed).
 */

import React from 'react';
import { Candidate } from '../types';
import { User, MapPin, Award, Sparkles } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  // AI insight comes from backend (pre-computed during candidate feed generation)
  const aiInsight = (candidate as any).match_reason || '';

  return (
    <div className="h-full flex flex-col p-0 text-white select-none" data-testid="candidate-card">
      <div className="relative h-64">
        <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
        <div className="absolute bottom-4 left-6">
          <h2 className="text-3xl font-bold" data-testid="candidate-name">{candidate.name}</h2>
          <p className="text-white/70 font-medium" data-testid="candidate-title">{candidate.title}</p>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="space-y-3 mb-6">
          {candidate.location && (
            <div className="flex items-center gap-2 text-white/80" data-testid="candidate-location">
              <MapPin size={18} className="text-red-400" />
              <span>{candidate.location}</span>
            </div>
          )}
          {candidate.experience && (
            <div className="flex items-center gap-2 text-white/80" data-testid="candidate-experience">
              <Award size={18} className="text-yellow-400" />
              <span>{candidate.experience} experience</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">About</h3>
          <p className="text-white/90 leading-relaxed mb-4" data-testid="candidate-bio">{candidate.bio}</p>
          
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-2" data-testid="candidate-skills">
              {candidate.skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {aiInsight && (
          <div className="mt-6 p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-white/10 rounded-2xl" data-testid="ai-talent-insight">
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
