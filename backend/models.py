"""
Data Models for SuperhireX

Pydantic models for request/response validation and data transfer.
These models ensure type safety and automatic validation.

Engineering Notes:
- Pydantic v2 models with automatic validation
- Separate models for requests, responses, and database records
- All timestamps are in ISO 8601 format
- JSON fields use dict/list types for flexibility
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role types."""
    SEEKER = "SEEKER"
    RECRUITER = "RECRUITER"


class ResumeStatus(str, Enum):
    """Resume processing status."""
    PENDING = "pending"  # Uploaded, not yet parsed
    PARSING = "parsing"  # AI parsing in progress
    PARSED = "parsed"    # Parsed, waiting for user confirmation
    CONFIRMED = "confirmed"  # User confirmed/edited, profile active
    FAILED = "failed"    # Parsing failed


class SwipeDirection(str, Enum):
    """Swipe direction."""
    LEFT = "left"   # Pass/Reject
    RIGHT = "right"  # Like/Interest


# ============== Profile Models ==============

class ProfileBase(BaseModel):
    """Base profile information."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: UserRole


class ProfileCreate(ProfileBase):
    """Profile creation request."""
    user_id: str  # Supabase auth user ID


class ProfileResponse(ProfileBase):
    """Profile response."""
    id: str
    user_id: str
    is_premium: bool = False
    created_at: datetime
    updated_at: datetime
    resume_status: Optional[str] = None  # For seekers: 'pending', 'parsing', 'parsed', 'confirmed', 'failed'
    has_resume: Optional[bool] = None  # For seekers: whether they have uploaded a resume
    
    model_config = ConfigDict(from_attributes=True)


# ============== Seeker Profile Models ==============

class SeekerProfileBase(BaseModel):
    """Job seeker profile base."""
    title: Optional[str] = Field(None, description="Job title/role")
    bio: Optional[str] = Field(None, description="Professional bio")
    location: Optional[str] = None
    experience: Optional[str] = Field(None, description="Years of experience")
    skills: Optional[List[str]] = Field(default_factory=list)


class SeekerProfileCreate(SeekerProfileBase):
    """Create seeker profile."""
    user_id: str


class SeekerProfileUpdate(SeekerProfileBase):
    """Update seeker profile (after AI parsing confirmation)."""
    pass


class SeekerProfileResponse(SeekerProfileBase):
    """Seeker profile response."""
    id: str
    user_id: str
    ats_score: Optional[float] = Field(None, description="ATS score 0-100")
    resume_status: ResumeStatus
    parsed_data: Optional[Dict[str, Any]] = Field(None, description="Full AI parsed data")
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============== Resume Models ==============

class ResumeUploadResponse(BaseModel):
    """Response after resume upload."""
    resume_id: str
    file_name: str
    file_path: str
    status: ResumeStatus
    message: str


class ParsedResumeData(BaseModel):
    """
    Structured data extracted from resume by AI.
    This is the core output of resume parsing.
    """
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: Optional[str] = None  # e.g., "5 years"
    work_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    education: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    certifications: Optional[List[str]] = Field(default_factory=list)
    ats_score: Optional[float] = Field(None, description="ATS compatibility score 0-100")


class ResumeParseResponse(BaseModel):
    """Response after resume parsing."""
    resume_id: str
    status: ResumeStatus
    parsed_data: Optional[ParsedResumeData] = None
    message: str


class ResumeConfirmRequest(BaseModel):
    """
    User confirmation/editing of parsed resume data.
    Allows users to review and correct AI extraction.
    """
    resume_id: str
    confirmed_data: ParsedResumeData


# ============== Job Models ==============

class JobBase(BaseModel):
    """Base job listing."""
    title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    location: str
    salary: Optional[str] = None
    description: str = Field(..., min_length=10)
    requirements: List[str] = Field(default_factory=list, description="Required skills/qualifications")
    logo: Optional[str] = Field(None, description="Company logo URL")


class JobCreate(JobBase):
    """Create job listing (recruiter only)."""
    pass


class JobUpdate(BaseModel):
    """Update job listing."""
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    logo: Optional[str] = None
    status: Optional[Literal["draft", "active", "closed"]] = None


class JobResponse(JobBase):
    """Job listing response."""
    id: str
    recruiter_id: str
    status: str = "active"
    created_at: datetime
    updated_at: datetime
    
    # Optional AI ranking metadata (added by backend)
    match_score: Optional[float] = Field(None, description="AI match score for this seeker")
    match_reason: Optional[str] = Field(None, description="Why this job matches")
    
    model_config = ConfigDict(from_attributes=True)


# ============== Swipe Models ==============

class SwipeRequest(BaseModel):
    """Record a swipe action."""
    target_id: str = Field(..., description="ID of job or candidate")
    target_type: Literal["job", "candidate"]
    direction: SwipeDirection


class SwipeResponse(BaseModel):
    """Swipe action response."""
    swipe_id: str
    is_match: bool = Field(..., description="True if mutual interest detected")
    match_id: Optional[str] = Field(None, description="Match ID if is_match=True")
    message: str


# ============== Match Models ==============

class MatchResponse(BaseModel):
    """Match information."""
    id: str
    seeker_id: str
    recruiter_id: str
    job_id: str
    matched_at: datetime
    status: str = "active"
    
    # Populated details
    seeker_profile: Optional[SeekerProfileResponse] = None
    job_details: Optional[JobResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============== Candidate Feed Models ==============

class CandidateResponse(BaseModel):
    """
    Candidate card for recruiters.
    Combines profile and resume data.
    """
    id: str  # seeker_profile.id
    user_id: str
    name: str
    title: Optional[str] = None
    location: Optional[str] = None
    experience: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    avatar: Optional[str] = Field(None, description="Profile picture URL")
    ats_score: Optional[float] = None
    
    # Optional AI ranking
    match_score: Optional[float] = None
    match_reason: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
