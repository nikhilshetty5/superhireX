"""
AI Service for Resume Parsing and Job Ranking

This service handles all OpenAI GPT interactions.

CRITICAL CREDIT PROTECTION RULES:
1. Resume parsing: ONCE per upload, results cached in DB
2. Job ranking: Use heuristics first, AI second
3. Never re-parse on login, profile view, or swipe
4. All AI responses are cached and reused

Engineering Notes:
- Uses OpenAI GPT via Emergent LLM key
- Structured outputs for reliable parsing
- Token usage minimized through smart prompting
- All errors are logged and handled gracefully
- Premium features flagged for future monetization
"""

from openai import OpenAI
from config import settings
from models import ParsedResumeData
import logging
import json
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class AIService:
    """
    AI-powered resume parsing and job ranking service.
    
    IMPORTANT: This service is backend-only.
    API keys are never exposed to the frontend.
    """
    
    def __init__(self):
        """Initialize OpenAI client with Emergent LLM key."""
        self.client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url
        )
        logger.info("✅ AI Service initialized with Emergent LLM key")
    
    async def parse_resume_text(self, resume_text: str, is_premium: bool = False) -> ParsedResumeData:
        """
        Parse resume text using OpenAI GPT.
        
        CREDIT PROTECTION: This function is called ONCE per resume upload.
        Results are stored in PostgreSQL and never re-parsed.
        
        Args:
            resume_text: Extracted text from PDF/DOCX
            is_premium: If True, use advanced parsing (future feature)
        
        Returns:
            ParsedResumeData: Structured resume information
        
        Engineering Notes:
        - Uses GPT-4 for best extraction quality
        - Structured output ensures reliable parsing
        - Premium mode can use extended prompts (future)
        - Failures are logged but don't crash the app
        """
        try:
            logger.info(f"🤖 Starting resume parse (premium={is_premium})")
            
            # Build prompt based on tier
            if is_premium:
                # Future: More detailed analysis for premium users
                prompt = self._build_premium_parse_prompt(resume_text)
            else:
                prompt = self._build_standard_parse_prompt(resume_text)
            
            # Call OpenAI with structured output
            response = self.client.chat.completions.create(
                model="gpt-4o",  # Best model for structured extraction
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert ATS (Applicant Tracking System) that extracts structured data from resumes. Extract information accurately and format it as JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistency
                response_format={"type": "json_object"}
            )
            
            # Parse response
            parsed_json = json.loads(response.choices[0].message.content)
            logger.info(f"✅ Resume parsed successfully")
            
            # Convert to Pydantic model
            parsed_data = ParsedResumeData(**parsed_json)
            
            # Calculate ATS score if not provided
            if not parsed_data.ats_score:
                parsed_data.ats_score = self._calculate_ats_score(parsed_data)
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"❌ Resume parsing failed: {e}")
            # Return minimal data on failure
            return ParsedResumeData(
                name="Parsing Failed",
                title="Unknown",
                summary="Resume parsing encountered an error. Please try again or edit manually.",
                ats_score=0.0
            )
    
    def _build_standard_parse_prompt(self, resume_text: str) -> str:
        """
        Build standard resume parsing prompt.
        Optimized for token efficiency.
        """
        return f"""
Extract the following information from this resume and return as JSON:

{{  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "title": "Current/Target Job Title",
  "location": "City, State/Country",
  "summary": "Brief professional summary (2-3 sentences)",
  "skills": ["skill1", "skill2", ...],
  "experience": "X years",
  "work_history": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Present",
      "description": "Brief description"
    }}
  ],
  "education": [
    {{
      "degree": "Degree Name",
      "institution": "University Name",
      "year": "2020"
    }}
  ],
  "certifications": ["cert1", "cert2"]
}}

Resume Text:
{resume_text[:4000]}  

Extract as much as possible. Use null for missing fields.
"""
    
    def _build_premium_parse_prompt(self, resume_text: str) -> str:
        """
        Build premium resume parsing prompt.
        
        FUTURE FEATURE: More detailed analysis for premium users.
        - Achievement quantification
        - Industry keyword detection
        - Career trajectory analysis
        - Salary estimation
        """
        # For MVP, use standard prompt
        # Premium features can be added later for monetization
        return self._build_standard_parse_prompt(resume_text)
    
    def _calculate_ats_score(self, parsed_data: ParsedResumeData) -> float:
        """
        Calculate ATS compatibility score (0-100).
        
        This is a heuristic score, not AI-based (saves credits).
        
        Scoring factors:
        - Contact info completeness: 20 points
        - Work experience: 30 points
        - Skills listed: 25 points
        - Education: 15 points
        - Certifications: 10 points
        """
        score = 0.0
        
        # Contact info (20 points)
        if parsed_data.name: score += 7
        if parsed_data.email: score += 7
        if parsed_data.phone: score += 6
        
        # Work experience (30 points)
        if parsed_data.work_history and len(parsed_data.work_history) > 0:
            score += min(30, len(parsed_data.work_history) * 10)
        
        # Skills (25 points)
        if parsed_data.skills and len(parsed_data.skills) > 0:
            score += min(25, len(parsed_data.skills) * 2.5)
        
        # Education (15 points)
        if parsed_data.education and len(parsed_data.education) > 0:
            score += min(15, len(parsed_data.education) * 7.5)
        
        # Certifications (10 points)
        if parsed_data.certifications and len(parsed_data.certifications) > 0:
            score += min(10, len(parsed_data.certifications) * 5)
        
        return min(100.0, score)
    
    def calculate_job_match_score(self, seeker_skills: list, job_requirements: list) -> float:
        """
        Calculate job match score using heuristics (no AI, saves credits).
        
        This is called during job feed generation.
        Uses simple skill overlap calculation.
        
        Args:
            seeker_skills: List of candidate skills
            job_requirements: List of job requirements
        
        Returns:
            Match score 0-100
        
        Engineering Notes:
        - Pure heuristic, no LLM calls
        - Case-insensitive matching
        - Can be enhanced with ML embeddings later
        """
        if not seeker_skills or not job_requirements:
            return 50.0  # Neutral score
        
        # Normalize to lowercase
        seeker_set = set(skill.lower().strip() for skill in seeker_skills)
        job_set = set(req.lower().strip() for req in job_requirements)
        
        # Calculate overlap
        overlap = len(seeker_set.intersection(job_set))
        total_job_reqs = len(job_set)
        
        if total_job_reqs == 0:
            return 50.0
        
        # Score based on % of requirements matched
        match_percentage = (overlap / total_job_reqs) * 100
        
        return min(100.0, match_percentage)
    
    async def generate_match_reason(self, seeker_skills: list, job_requirements: list) -> str:
        """
        Generate human-readable match reason.
        
        OPTIONAL: Can use AI or simple heuristics.
        For MVP, using heuristics to save credits.
        
        Future: Cache these per (seeker, job) pair.
        """
        overlap = set(s.lower() for s in seeker_skills).intersection(
            set(r.lower() for r in job_requirements)
        )
        
        if len(overlap) >= 3:
            skills_str = ", ".join(list(overlap)[:3])
            return f"Strong match: Your skills in {skills_str} align perfectly with job requirements."
        elif len(overlap) > 0:
            skills_str = ", ".join(list(overlap))
            return f"Good fit: Your experience with {skills_str} matches job needs."
        else:
            return "This role could help you expand your skill set and grow your career."


# Global AI service instance
ai_service = AIService()
