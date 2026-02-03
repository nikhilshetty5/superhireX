"""
SuperhireX Backend Server

FastAPI backend for swipe-based job matching platform.

Architecture:
- Backend owns ALL business logic and AI
- Frontend is UI-only and untrusted
- All AI operations happen here (never expose keys to frontend)
- Credit-protected AI: parse once, cache forever

Engineering Notes:
- FastAPI with async/await for performance
- Supabase PostgreSQL for data persistence
- OpenAI GPT for resume parsing (via Emergent LLM key)
- Row Level Security (RLS) enforced at database level
- All endpoints require authentication
- Comprehensive logging for debugging
"""

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
import sys
from datetime import datetime

# Import our modules
from config import settings
from database import db
from models import (
    ProfileCreate, ProfileResponse,
    SeekerProfileCreate, SeekerProfileUpdate, SeekerProfileResponse,
    ResumeUploadResponse, ResumeParseResponse, ResumeConfirmRequest, ParsedResumeData,
    JobCreate, JobUpdate, JobResponse,
    SwipeRequest, SwipeResponse,
    MatchResponse, CandidateResponse,
    UserRole, ResumeStatus
)
from ai_service import ai_service
from file_utils import FileProcessor, StorageService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ],
    encoding='utf-8'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SuperhireX API",
    description="Swipe-based job matching platform backend",
    version="1.0.0"
)

# CORS Configuration
# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5174",
        settings.frontend_url
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("SuperhireX Backend starting...")
logger.info(f"Environment: {settings.environment}")
logger.info(f"Port: {settings.backend_port}")

# 🧪 DEMO MODE - For testing without Supabase auth
DEMO_MODE = False


# ============== Authentication Dependency ==============

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Extract and validate user ID from Supabase auth token.
    
    This is a critical security function:
    - Validates JWT token from Supabase Auth
    - Extracts user_id from token
    - Returns user_id for use in endpoints
    
    Args:
        authorization: Bearer token from Authorization header
    
    Returns:
        user_id: Authenticated user's ID
    
    Raises:
        HTTPException: If token invalid or missing
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split("Bearer ")[1]
    
    # 🧪 DEMO MODE - Allow demo tokens for testing
    if DEMO_MODE and token.startswith("demo-token-"):
        logger.info(f"🧪 DEMO MODE - Using demo token: {token}")
        # Extract user ID from demo token (format: demo-token-<user-id>)
        user_id = token.replace("demo-token-", "")
        return user_id
    
    try:
        # Verify token with Supabase
        user = db.admin_client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        return user.user.id
    
    except Exception as e:
        logger.error(f"❌ Auth failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


# ============== Health Check ==============

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "superhirex-backend",
        "timestamp": datetime.now().isoformat()
    }


# ============== Profile Endpoints ==============

@app.get("/api/auth/profile", response_model=ProfileResponse)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    """
    Get current user's profile.
    
    Called after login to fetch user profile data.
    """
    try:
        response = db.admin_client.table("profiles").select("*").eq("id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = response.data[0]
        logger.info(f"Profile fetched: {profile}")
        
        # For seekers, also fetch resume status and check if they have a resume
        if profile.get("role") == "SEEKER":
            seeker_response = db.admin_client.table("seeker_profiles").select("resume_status").eq("user_id", user_id).execute()
            logger.info(f"Seeker profile response: {seeker_response.data}")
            
            if seeker_response.data:
                profile["resume_status"] = seeker_response.data[0].get("resume_status")
            else:
                profile["resume_status"] = "pending"
                logger.info(f"No seeker_profile found, setting status to pending")
            
            # Check if they have uploaded a resume
            resume_response = db.admin_client.table("resumes").select("id").eq("seeker_id", user_id).execute()
            logger.info(f"Resume check - seeker_id: {user_id}, found: {len(resume_response.data)} resumes")
            profile["has_resume"] = len(resume_response.data) > 0
        
        logger.info(f"Final profile with has_resume: {profile.get('has_resume')}")
        return profile
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/check-email")
async def check_email_exists(request_data: dict):
    """
    Check if an email already has a profile.
    
    This endpoint is used during signup to detect existing users.
    Returns without requiring authentication since it's used pre-login.
    """
    try:
        email = request_data.get("email", "").lower().strip()
        
        if not email:
            return {"profile_exists": False}
        
        # Query profiles table for this email
        response = db.admin_client.table("profiles").select("id").eq("email", email).limit(1).execute()
        
        profile_exists = len(response.data) > 0
        
        logger.info(f"📧 Email check: {email} - Exists: {profile_exists}")
        
        return {"profile_exists": profile_exists}
    
    except Exception as e:
        logger.error(f"❌ Email check failed: {e}")
        # Return False on error to not break signup flow
        return {"profile_exists": False}


@app.post("/api/auth/profile", response_model=ProfileResponse)
async def create_or_update_profile(
    profile: ProfileCreate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create or update user profile.
    
    Called after signup to create initial profile.
    """
    try:
        # Upsert profile
        profile_data = {
            "id": user_id,
            "user_id": user_id,
            "full_name": profile.full_name,
            "email": profile.email,
            "role": profile.role.value,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.admin_client.table("profiles").upsert(profile_data).execute()
        
        # If seeker, create seeker_profile
        if profile.role == UserRole.SEEKER:
            seeker_profile = {
                "user_id": user_id,
                "resume_status": ResumeStatus.PENDING.value,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            db.admin_client.table("seeker_profiles").upsert(seeker_profile).execute()
        
        return response.data[0]
    
    except Exception as e:
        logger.error(f"❌ Create profile failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Resume Management Endpoints ==============

@app.post("/api/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """
    Upload resume file for job seeker.
    
    Flow:
    1. Validate file type and size
    2. Upload to Supabase Storage
    3. Create resume record
    4. Return resume_id for parsing
    
    Engineering Notes:
    - File uploaded to Supabase Storage
    - Parsing happens separately (async workflow)
    - User can trigger parsing via /api/resume/parse
    """
    try:
        logger.info(f"📤 Resume upload started for user {user_id}")
        
        # Validate file
        FileProcessor.validate_file_type(file.filename)
        
        # 🧪 DEMO MODE - Skip database operations for testing
        if DEMO_MODE and user_id.startswith('demo-'):
            logger.info(f"🧪 DEMO MODE - Skipping storage and database, using fake data")
            file_path = f"demo/{user_id}/{file.filename}"
            public_url = f"https://demo.example.com/{file_path}"
            resume_id = f"demo-resume-{int(__import__('time').time() * 1000)}"
            
            logger.info(f"✅ Resume uploaded (demo): {resume_id}")
            
            return ResumeUploadResponse(
                resume_id=resume_id,
                file_name=file.filename,
                file_path=file_path,
                status=ResumeStatus.PENDING,
                message="Resume uploaded successfully. You can now parse it."
            )
        
        # Production: Upload to storage and database
        # Upload to storage
        storage = StorageService(db.admin_client)
        file_path, public_url = await storage.upload_resume(user_id, file)
        
        # Create resume record
        resume_data = {
            "seeker_id": user_id,
            "file_path": file_path,
            "file_name": file.filename,
            "uploaded_at": datetime.now().isoformat(),
            "is_primary": True  # First upload is primary
        }
        
        response = db.admin_client.table("resumes").insert(resume_data).execute()
        resume_id = response.data[0]["id"]
        
        logger.info(f"✅ Resume uploaded: {resume_id}")
        
        return ResumeUploadResponse(
            resume_id=resume_id,
            file_name=file.filename,
            file_path=file_path,
            status=ResumeStatus.PENDING,
            message="Resume uploaded successfully. You can now parse it."
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Resume upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/resume/parse", response_model=ResumeParseResponse)
async def parse_resume(
    resume_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Parse resume using AI (ONE-TIME OPERATION).
    
    CRITICAL CREDIT PROTECTION:
    - Called ONCE per resume
    - Results cached in database
    - Never re-parse on login or profile view
    
    Flow:
    1. Get resume file from storage
    2. Extract text (local, free)
    3. Parse with OpenAI (costs credits)
    4. Store parsed data in database
    5. Update seeker profile with parsed data
    6. Return parsed data for user review
    
    Engineering Notes:
    - This is the ONLY place where AI parsing happens
    - Results stored in seeker_profiles.parsed_data
    - Status updated to 'parsed'
    - User reviews and confirms via /api/resume/confirm
    """
    try:
        logger.info(f"🤖 Resume parsing started for resume {resume_id}")
        
        # 🧪 DEMO MODE - Skip database lookup, use dummy data
        if DEMO_MODE and user_id.startswith('demo-'):
            logger.info(f"🧪 DEMO MODE - Using dummy resume for parsing")
            resume_text = """
            NIKHIL SHETTY
            San Francisco, CA | (555) 123-4567 | nikhil@superhirex.com
            
            PROFESSIONAL SUMMARY
            Full-stack software engineer with 5+ years of experience building scalable web applications.
            Expertise in Python, React, TypeScript, and cloud deployment on AWS.
            
            EXPERIENCE
            Senior Software Engineer - Tech Startup (2021-Present)
            - Led development of microservices architecture using FastAPI and PostgreSQL
            - Reduced API response time by 40% through optimization
            - Managed team of 3 junior engineers
            
            Software Engineer - Web Company (2019-2021)
            - Built React-based SPA with TypeScript and Redux
            - Implemented CI/CD pipeline using GitHub Actions
            - Increased test coverage from 45% to 85%
            
            SKILLS
            Languages: Python, JavaScript, TypeScript, SQL
            Frontend: React, Next.js, Tailwind CSS, Framer Motion
            Backend: FastAPI, Node.js, PostgreSQL, Supabase
            DevOps: AWS, Docker, GitHub Actions, Vercel
            
            EDUCATION
            BS Computer Science - State University (2019)
            GPA: 3.8/4.0
            """
        else:
            # Production: Get resume from database
            resume_response = db.admin_client.table("resumes").select("*").eq("id", resume_id).eq("seeker_id", user_id).execute()
            
            if not resume_response.data:
                raise HTTPException(status_code=404, detail="Resume not found")
            
            resume = resume_response.data[0]
            
            # Check if already parsed (prevent duplicate AI calls)
            seeker_response = db.admin_client.table("seeker_profiles").select("*").eq("user_id", user_id).execute()
            
            if seeker_response.data and seeker_response.data[0].get("resume_status") in ["parsed", "confirmed"]:
                # Already parsed, return cached data
                logger.info(f"✅ Using cached parse result for resume {resume_id}")
                return ResumeParseResponse(
                    resume_id=resume_id,
                    status=ResumeStatus.PARSED,
                    parsed_data=ParsedResumeData(**seeker_response.data[0]["parsed_data"]),
                    message="Resume already parsed (using cached result)"
                )
            
            # Update status to parsing
            db.admin_client.table("seeker_profiles").update({
                "resume_status": ResumeStatus.PARSING.value
            }).eq("user_id", user_id).execute()
            
            # Download resume file
            storage = StorageService(db.admin_client)
            file_path = resume["file_path"]
            
            # Get file content from storage
            file_content = db.admin_client.storage.from_("resumes").download(file_path)
            
            # Extract text from file
            # Note: We need to convert bytes to UploadFile-like object for extraction
            import io
            from fastapi import UploadFile
            
            file_obj = UploadFile(
                filename=resume["file_name"],
                file=io.BytesIO(file_content)
            )
            
            resume_text = await FileProcessor.extract_text_from_resume(file_obj)
        
        # Check if user is premium
        if not DEMO_MODE or not user_id.startswith('demo-'):
            profile_response = db.admin_client.table("profiles").select("is_premium").eq("id", user_id).execute()
            is_premium = profile_response.data[0].get("is_premium", False) if profile_response.data else False
        else:
            is_premium = False  # Demo users are not premium
        
        # Parse with AI (THIS IS THE EXPENSIVE OPERATION)
        parsed_data = await ai_service.parse_resume_text(resume_text, is_premium=is_premium)
        
        # Store parsed data in database (skip for demo)
        if not DEMO_MODE or not user_id.startswith('demo-'):
            db.admin_client.table("seeker_profiles").update({
                "parsed_data": parsed_data.model_dump(),
                "ats_score": parsed_data.ats_score,
                "resume_status": ResumeStatus.PARSED.value
            }).eq("user_id", user_id).execute()
            
            # Update resume record
            db.admin_client.table("resumes").update({
                "parsed_at": datetime.now().isoformat()
            }).eq("id", resume_id).execute()
        
        logger.info(f"✅ Resume parsed and cached for resume {resume_id}")
        
        return ResumeParseResponse(
            resume_id=resume_id,
            status=ResumeStatus.PARSED,
            parsed_data=parsed_data,
            message="Resume parsed successfully. Please review and confirm."
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Resume parsing failed: {e}")
        
        # Update status to failed (skip for demo)
        if not DEMO_MODE or not user_id.startswith('demo-'):
            db.admin_client.table("seeker_profiles").update({
                "resume_status": ResumeStatus.FAILED.value
            }).eq("user_id", user_id).execute()
        
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/resume/confirm", response_model=SeekerProfileResponse)
async def confirm_resume_data(
    confirm_request: ResumeConfirmRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    User confirms/edits parsed resume data.
    
    This is the final step before profile activation.
    User can review AI-parsed data and make corrections.
    
    Flow:
    1. User reviews parsed data from /api/resume/parse
    2. User confirms or edits data
    3. This endpoint updates seeker_profile with final data
    4. Status changed to 'confirmed' (profile now active)
    5. User can now swipe on jobs
    """
    try:
        logger.info(f"✅ Resume confirmation for user {user_id}")
        
        confirmed_data = confirm_request.confirmed_data
        
        # Update seeker profile with confirmed data
        update_data = {
            "title": confirmed_data.title,
            "bio": confirmed_data.summary,
            "location": confirmed_data.location,
            "experience": confirmed_data.experience,
            "skills": confirmed_data.skills,
            "ats_score": confirmed_data.ats_score,
            "parsed_data": confirmed_data.model_dump(),
            "resume_status": ResumeStatus.CONFIRMED.value,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.admin_client.table("seeker_profiles").update(update_data).eq("user_id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Seeker profile not found")
        
        logger.info(f"✅ Profile confirmed and activated for user {user_id}")
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Resume confirmation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/resume/status")
async def get_resume_status(user_id: str = Depends(get_current_user_id)):
    """Get resume processing status for job seeker."""
    try:
        response = db.admin_client.table("seeker_profiles").select("resume_status, ats_score").eq("user_id", user_id).execute()
        
        if not response.data:
            return {"status": "no_resume", "ats_score": None}
        
        return {
            "status": response.data[0].get("resume_status"),
            "ats_score": response.data[0].get("ats_score")
        }
    
    except Exception as e:
        logger.error(f"❌ Get resume status failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Job Listing Endpoints ==============

@app.post("/api/admin/jobs/bulk-upload")
async def bulk_upload_jobs(file: UploadFile = File(...), admin_key: Optional[str] = Header(None)):
    """
    Admin endpoint to bulk upload jobs via CSV.
    
    CSV Format (with headers):
    title,company,location,salary,description,requirements
    
    Example:
    Senior Python Developer,TechCorp,San Francisco,"$120k-150k","Build backend APIs","Python,FastAPI,PostgreSQL"
    
    Security:
    - Requires ADMIN_KEY in header (set in .env)
    - Creates jobs under system admin account
    
    Returns:
    - Success: {uploaded: N, failed: 0, jobs: [...]}
    - Failure: Detailed error messages
    """
    try:
        admin_key_expected = settings.admin_key if hasattr(settings, 'admin_key') else "demo-admin-key-change-this"
        
        if not admin_key or admin_key != admin_key_expected:
            raise HTTPException(status_code=403, detail="Invalid or missing admin key")
        
        # Get admin user (system user for bulk uploads)
        admin_profile = db.admin_client.table("profiles").select("id").eq("role", "RECRUITER").limit(1).execute()
        
        if not admin_profile.data:
            # Create a system admin profile if it doesn't exist
            admin_id = "00000000-0000-0000-0000-000000000000"  # System user ID
            admin_profile_data = {
                "id": admin_id,
                "user_id": admin_id,
                "full_name": "SuperhireX Admin",
                "email": "admin@superhirex.internal",
                "role": "RECRUITER",
                "created_at": datetime.now().isoformat()
            }
            try:
                db.admin_client.table("profiles").insert(admin_profile_data).execute()
            except:
                pass  # Profile might already exist
            admin_id = admin_id
        else:
            admin_id = admin_profile.data[0]["id"]
        
        # Parse CSV
        import csv
        import io
        
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        uploaded_jobs = []
        failed_uploads = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Parse requirements (comma-separated -> list)
                requirements = [r.strip() for r in row.get('requirements', '').split(',') if r.strip()]
                
                job_data = {
                    "recruiter_id": admin_id,
                    "title": row.get('title', '').strip(),
                    "company": row.get('company', '').strip(),
                    "location": row.get('location', '').strip(),
                    "salary": row.get('salary', '').strip() or None,
                    "description": row.get('description', '').strip(),
                    "requirements": requirements,
                    "logo": f"https://ui-avatars.com/api/?name={row.get('company', 'Job')}&background=random",
                    "status": "active",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                response = db.admin_client.table("jobs").insert(job_data).execute()
                uploaded_jobs.append(response.data[0])
                logger.info(f"✅ Job uploaded: {row.get('title')} at {row.get('company')}")
                
            except Exception as e:
                failed_uploads.append({
                    "row": row_num,
                    "error": str(e),
                    "data": row
                })
                logger.error(f"❌ Row {row_num} failed: {e}")
        
        logger.info(f"📊 Bulk upload complete: {len(uploaded_jobs)} success, {len(failed_uploads)} failed")
        
        return {
            "uploaded": len(uploaded_jobs),
            "failed": len(failed_uploads),
            "jobs": uploaded_jobs,
            "errors": failed_uploads if failed_uploads else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Bulk job upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/jobs", response_model=JobResponse)
async def create_job(
    job: JobCreate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create job listing (recruiter only).
    
    Engineering Notes:
    - Only recruiters can create jobs
    - Jobs are immediately active
    - Logo can be URL or uploaded separately
    """
    try:
        logger.info(f"💼 Creating job listing for recruiter {user_id}")
        
        # Verify user is recruiter
        profile = db.admin_client.table("profiles").select("role").eq("id", user_id).execute()
        
        if not profile.data or profile.data[0]["role"] != "RECRUITER":
            raise HTTPException(status_code=403, detail="Only recruiters can create jobs")
        
        job_data = {
            "recruiter_id": user_id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary": job.salary,
            "description": job.description,
            "requirements": job.requirements,
            "logo": job.logo or f"https://ui-avatars.com/api/?name={job.company}&background=random",
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.admin_client.table("jobs").insert(job_data).execute()
        
        logger.info(f"✅ Job created: {response.data[0]['id']}")
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Job creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs", response_model=List[JobResponse])
async def get_jobs(
    limit: int = 20,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get job feed for job seeker.
    
    CREDIT PROTECTION:
    - Uses heuristic ranking (free)
    - Optional AI ranking (future premium feature)
    - Results are ordered by match score
    
    Engineering Notes:
    - Filters out already-swiped jobs
    - Calculates match scores using skills overlap
    - Can add AI-powered ranking for premium users later
    """
    try:
        logger.info(f"📋 Fetching job feed for user {user_id}")
        
        # Get user's skills for matching
        seeker = db.admin_client.table("seeker_profiles").select("skills").eq("user_id", user_id).execute()
        user_skills = seeker.data[0].get("skills", []) if seeker.data else []
        
        # Get already-swiped job IDs
        swiped = db.admin_client.table("swipes").select("target_id").eq("swiper_id", user_id).eq("target_type", "job").execute()
        swiped_ids = [s["target_id"] for s in swiped.data] if swiped.data else []
        
        # Get active jobs (excluding swiped ones)
        query = db.admin_client.table("jobs").select("*").eq("status", "active").limit(limit + len(swiped_ids))
        
        response = query.execute()
        jobs = response.data if response.data else []
        
        # Filter out swiped jobs and calculate match scores
        ranked_jobs = []
        for job in jobs:
            if job["id"] not in swiped_ids:
                # Calculate match score (heuristic, no AI cost)
                match_score = ai_service.calculate_job_match_score(
                    user_skills,
                    job.get("requirements", [])
                )
                
                # Generate match reason (heuristic, no AI cost)
                match_reason = await ai_service.generate_match_reason(
                    user_skills,
                    job.get("requirements", [])
                )
                
                job["match_score"] = match_score
                job["match_reason"] = match_reason
                ranked_jobs.append(job)
        
        # Sort by match score (highest first)
        ranked_jobs.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Limit results
        ranked_jobs = ranked_jobs[:limit]
        
        logger.info(f"✅ Returning {len(ranked_jobs)} jobs for user {user_id}")
        
        return ranked_jobs
    
    except Exception as e:
        logger.error(f"❌ Get jobs failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get single job details."""
    try:
        response = db.admin_client.table("jobs").select("*").eq("id", job_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get job failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/jobs/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_update: JobUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update job listing (recruiter only, own jobs only)."""
    try:
        # Verify ownership
        job = db.admin_client.table("jobs").select("recruiter_id").eq("id", job_id).execute()
        
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.data[0]["recruiter_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this job")
        
        # Update job
        update_data = {k: v for k, v in job_update.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = db.admin_client.table("jobs").update(update_data).eq("id", job_id).execute()
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Update job failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/jobs/{job_id}")
async def delete_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete job listing (recruiter only, own jobs only)."""
    try:
        # Verify ownership
        job = db.admin_client.table("jobs").select("recruiter_id").eq("id", job_id).execute()
        
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.data[0]["recruiter_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this job")
        
        # Soft delete (set status to closed)
        db.admin_client.table("jobs").update({
            "status": "closed",
            "updated_at": datetime.now().isoformat()
        }).eq("id", job_id).execute()
        
        return {"message": "Job deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete job failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Candidate Feed Endpoints ==============

@app.get("/api/candidates", response_model=List[CandidateResponse])
async def get_candidates(
    limit: int = 20,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get candidate feed for recruiter.
    
    CREDIT PROTECTION:
    - Uses heuristic ranking
    - No AI calls per swipe
    - Match scores calculated using simple overlap
    
    Engineering Notes:
    - Only returns confirmed seeker profiles
    - Filters out already-swiped candidates
    - Can add AI ranking for premium recruiters later
    """
    try:
        logger.info(f"👥 Fetching candidate feed for recruiter {user_id}")
        
        # Verify user is recruiter
        profile = db.admin_client.table("profiles").select("role").eq("id", user_id).execute()
        
        if not profile.data or profile.data[0]["role"] != "RECRUITER":
            raise HTTPException(status_code=403, detail="Only recruiters can view candidates")
        
        # Get already-swiped candidate IDs
        swiped = db.admin_client.table("swipes").select("target_id").eq("swiper_id", user_id).eq("target_type", "candidate").execute()
        swiped_ids = [s["target_id"] for s in swiped.data] if swiped.data else []
        
        # Get active candidates (confirmed profiles only)
        query = db.admin_client.table("seeker_profiles").select("*, profiles!inner(full_name, email)").eq("resume_status", "confirmed").limit(limit + len(swiped_ids))
        
        response = query.execute()
        candidates_raw = response.data if response.data else []
        
        # Transform to CandidateResponse format
        candidates = []
        for c in candidates_raw:
            if c["id"] not in swiped_ids:
                profile_data = c.get("profiles", {})
                
                candidate = {
                    "id": c["id"],
                    "user_id": c["user_id"],
                    "name": profile_data.get("full_name", "Anonymous"),
                    "title": c.get("title"),
                    "location": c.get("location"),
                    "experience": c.get("experience"),
                    "skills": c.get("skills", []),
                    "bio": c.get("bio"),
                    "avatar": f"https://ui-avatars.com/api/?name={profile_data.get('full_name', 'User')}&background=random",
                    "ats_score": c.get("ats_score"),
                    "match_score": 80.0,  # Heuristic score (can add real matching later)
                    "match_reason": "Strong profile with relevant experience."
                }
                
                candidates.append(candidate)
        
        # Limit results
        candidates = candidates[:limit]
        
        logger.info(f"✅ Returning {len(candidates)} candidates for recruiter {user_id}")
        
        return candidates
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get candidates failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Swipe Endpoints ==============

@app.post("/api/swipe", response_model=SwipeResponse)
async def record_swipe(
    swipe: SwipeRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Record swipe action and check for matches.
    
    Flow:
    1. Record swipe in database (immutable)
    2. If right swipe, check for reciprocal match
    3. If match found, create match record
    4. Return match status
    
    Engineering Notes:
    - Swipes are immutable once recorded
    - Matches detected automatically on right swipes
    - No AI cost per swipe (all heuristic)
    """
    try:
        logger.info(f"👆 Recording swipe: user={user_id}, target={swipe.target_id}, direction={swipe.direction}")
        
        # Record swipe
        swipe_data = {
            "swiper_id": user_id,
            "target_id": swipe.target_id,
            "target_type": swipe.target_type.value,
            "direction": swipe.direction.value,
            "created_at": datetime.now().isoformat()
        }
        
        swipe_response = db.admin_client.table("swipes").insert(swipe_data).execute()
        swipe_id = swipe_response.data[0]["id"]
        
        # Check for match if right swipe
        is_match = False
        match_id = None
        
        if swipe.direction.value == "right":
            # Look for reciprocal swipe
            # If seeker swiped right on job, check if recruiter (job owner) swiped right on seeker
            # If recruiter swiped right on candidate, check if candidate swiped right on any of recruiter's jobs
            
            reciprocal = None
            
            if swipe.target_type == "job":
                # Seeker swiped right on job
                # Check if job's recruiter swiped right on this seeker
                job = db.admin_client.table("jobs").select("recruiter_id").eq("id", swipe.target_id).execute()
                if job.data:
                    recruiter_id = job.data[0]["recruiter_id"]
                    reciprocal = db.admin_client.table("swipes").select("*").eq("swiper_id", recruiter_id).eq("target_id", user_id).eq("target_type", "candidate").eq("direction", "right").execute()
            
            elif swipe.target_type == "candidate":
                # Recruiter swiped right on candidate
                # Check if candidate swiped right on any of this recruiter's jobs
                recruiter_jobs = db.admin_client.table("jobs").select("id").eq("recruiter_id", user_id).execute()
                job_ids = [j["id"] for j in recruiter_jobs.data] if recruiter_jobs.data else []
                
                if job_ids:
                    # Check if candidate swiped right on any of these jobs
                    for job_id in job_ids:
                        candidate_swipe = db.admin_client.table("swipes").select("*").eq("swiper_id", swipe.target_id).eq("target_id", job_id).eq("target_type", "job").eq("direction", "right").execute()
                        
                        if candidate_swipe.data:
                            reciprocal = candidate_swipe
                            # Create match with this specific job
                            match_data = {
                                "seeker_id": swipe.target_id,
                                "recruiter_id": user_id,
                                "job_id": job_id,
                                "matched_at": datetime.now().isoformat(),
                                "status": "active"
                            }
                            
                            match_response = db.admin_client.table("matches").insert(match_data).execute()
                            match_id = match_response.data[0]["id"]
                            is_match = True
                            break
            
            if reciprocal and reciprocal.data and not is_match:
                # Found reciprocal match
                is_match = True
                
                # Create match record (if not already created above)
                if swipe.target_type == "job":
                    # Match between seeker and recruiter for this job
                    job = db.admin_client.table("jobs").select("recruiter_id").eq("id", swipe.target_id).execute()
                    
                    match_data = {
                        "seeker_id": user_id,
                        "recruiter_id": job.data[0]["recruiter_id"],
                        "job_id": swipe.target_id,
                        "matched_at": datetime.now().isoformat(),
                        "status": "active"
                    }
                    
                    match_response = db.admin_client.table("matches").insert(match_data).execute()
                    match_id = match_response.data[0]["id"]
        
        message = "Match! 🎉" if is_match else "Swipe recorded"
        
        logger.info(f"✅ Swipe recorded (match={is_match})")
        
        return SwipeResponse(
            swipe_id=swipe_id,
            is_match=is_match,
            match_id=match_id,
            message=message
        )
    
    except Exception as e:
        logger.error(f"❌ Record swipe failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Match Endpoints ==============

@app.get("/api/matches", response_model=List[MatchResponse])
async def get_matches(user_id: str = Depends(get_current_user_id)):
    """Get all matches for current user."""
    try:
        # Get user role
        profile = db.admin_client.table("profiles").select("role").eq("id", user_id).execute()
        
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        role = profile.data[0]["role"]
        
        # Query matches based on role
        if role == "SEEKER":
            query = db.admin_client.table("matches").select("*, jobs(*), profiles!matches_recruiter_id_fkey(*)").eq("seeker_id", user_id).eq("status", "active")
        else:
            query = db.admin_client.table("matches").select("*, jobs(*), profiles!matches_seeker_id_fkey(*), seeker_profiles(*)").eq("recruiter_id", user_id).eq("status", "active")
        
        response = query.execute()
        
        return response.data if response.data else []
    
    except Exception as e:
        logger.error(f"❌ Get matches failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== Application Startup ==============

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("🚀 SuperhireX Backend initialized successfully")
    logger.info(f"✅ Supabase connected: {settings.supabase_url}")
    logger.info(f"✅ AI Service ready (OpenAI via Emergent LLM)")
    logger.info(f"✅ CORS enabled for: {settings.frontend_url}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=settings.backend_port,
        reload=True if settings.environment == "development" else False
    )
