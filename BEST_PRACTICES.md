# 🎯 Best Practices Guide - SuperhireX

**Last Updated:** February 4, 2026  
**Target Audience:** Development Team  
**Purpose:** Coding standards and best practices for SuperhireX project

---

## 📚 Table of Contents

1. [Python/FastAPI Backend Best Practices](#python-backend)
2. [TypeScript/React Frontend Best Practices](#typescript-frontend)
3. [Database Best Practices](#database)
4. [Security Best Practices](#security)
5. [API Design Best Practices](#api-design)
6. [Testing Best Practices](#testing)
7. [Git & Version Control](#git)
8. [Documentation Standards](#documentation)

---

## 🐍 Python/FastAPI Backend Best Practices

### Code Organization

```python
# ✅ GOOD: Clear, single-responsibility functions
async def parse_resume(resume_text: str) -> ParsedResumeData:
    """
    Parse resume using AI.
    
    Args:
        resume_text: Raw text from resume
        
    Returns:
        ParsedResumeData: Structured resume information
        
    Raises:
        ValueError: If resume text is empty
    """
    if not resume_text.strip():
        raise ValueError("Resume text cannot be empty")
    
    return await ai_service.parse(resume_text)

# ❌ BAD: Unclear function, multiple responsibilities
async def do_stuff(data):
    # Parse resume, save to DB, send email...
    pass
```

### Type Hints

```python
# ✅ GOOD: Full type hints
from typing import List, Optional, Dict

def get_jobs(
    user_id: str,
    limit: int = 20,
    skills: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """Get jobs with proper typing."""
    pass

# ❌ BAD: No type hints
def get_jobs(user_id, limit=20, skills=None):
    pass
```

### Exception Handling

```python
# ✅ GOOD: Specific exceptions, proper logging
try:
    result = await expensive_operation()
except ValueError as e:
    logger.warning(f"Invalid input: {e}")
    raise HTTPException(400, "Invalid request data")
except DatabaseError as e:
    logger.error(f"Database error: {e}", exc_info=True)
    raise HTTPException(500, "Operation failed")
except Exception as e:
    logger.exception("Unexpected error")
    raise HTTPException(500, "Internal server error")

# ❌ BAD: Catches all, exposes internals
try:
    result = await operation()
except Exception as e:
    raise HTTPException(500, detail=str(e))  # Leaks info!
```

### Async/Await

```python
# ✅ GOOD: Proper async usage
async def process_resume(file: UploadFile) -> dict:
    content = await file.read()
    text = await extract_text(content)
    parsed = await ai_service.parse(text)
    return parsed

# ❌ BAD: Blocking I/O in async function
async def process_resume(file: UploadFile) -> dict:
    content = file.read()  # Blocking!
    time.sleep(5)          # Blocking!
    return result
```

### Dependency Injection

```python
# ✅ GOOD: Use FastAPI's dependency injection
from fastapi import Depends

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    return verify_token(token)

@app.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return user

# ❌ BAD: Global state, hard to test
current_user = None

@app.get("/profile")
async def get_profile():
    return current_user
```

---

## ⚛️ TypeScript/React Frontend Best Practices

### Component Structure

```tsx
// ✅ GOOD: Typed props, clear structure
interface JobCardProps {
  job: Job;
  onSwipe: (direction: 'left' | 'right') => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSwipe }) => {
  return (
    <div className="job-card">
      <h2>{job.title}</h2>
      <p>{job.company}</p>
    </div>
  );
};

// ❌ BAD: Untyped props, unclear structure
export function JobCard(props) {
  return <div>{props.job.title}</div>;
}
```

### State Management

```tsx
// ✅ GOOD: Clear state updates, proper types
const [jobs, setJobs] = useState<Job[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchJobs = async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await api.getJobs();
    setJobs(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load jobs');
  } finally {
    setLoading(false);
  }
};

// ❌ BAD: Untyped, missing error handling
const [jobs, setJobs] = useState([]);

const fetchJobs = async () => {
  const data = await api.getJobs();
  setJobs(data);
};
```

### Custom Hooks

```tsx
// ✅ GOOD: Reusable custom hook
function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  };

  return { jobs, loading, refetch: fetchJobs };
}

// Usage
const { jobs, loading, refetch } = useJobs();
```

### Error Boundaries

```tsx
// ✅ GOOD: Error boundary for robustness
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

---

## 🗄️ Database Best Practices

### Schema Design

```sql
-- ✅ GOOD: Proper constraints, indexes
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) <= 200),
    company TEXT NOT NULL CHECK (length(company) <= 100),
    description TEXT NOT NULL CHECK (length(description) <= 10000),
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('draft', 'active', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status = 'active';
CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);

-- ❌ BAD: No constraints, no indexes
CREATE TABLE jobs (
    id TEXT,
    recruiter_id TEXT,
    title TEXT,
    company TEXT,
    description TEXT
);
```

### Row Level Security (RLS)

```sql
-- ✅ GOOD: Comprehensive RLS policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see active jobs
CREATE POLICY "Users can view active jobs" ON jobs
    FOR SELECT 
    USING (
        status = 'active' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SEEKER'
        )
    );

-- Recruiters can manage their own jobs
CREATE POLICY "Recruiters can manage own jobs" ON jobs
    FOR ALL 
    USING (auth.uid() = recruiter_id)
    WITH CHECK (auth.uid() = recruiter_id);

-- ❌ BAD: No RLS, security at application level only
-- (Application bugs can expose data)
```

### Migrations

```sql
-- ✅ GOOD: Versioned, reversible migrations
-- migrations/001_create_jobs_table.up.sql
CREATE TABLE jobs (...);

-- migrations/001_create_jobs_table.down.sql
DROP TABLE IF EXISTS jobs;

-- ❌ BAD: Direct SQL execution without version control
```

---

## 🔒 Security Best Practices

### Authentication

```python
# ✅ GOOD: Verify JWT tokens properly
async def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, "Missing or invalid token")
    
    token = authorization.replace('Bearer ', '')
    
    try:
        # Verify with Supabase
        user = supabase.auth.get_user(token)
        return user.id
    except Exception:
        raise HTTPException(401, "Invalid token")

# ❌ BAD: Accept any token
async def get_current_user(authorization: str = Header(None)) -> str:
    if DEMO_MODE:  # Never do this!
        return "demo-user"
    return authorization.split(' ')[1]
```

### Input Validation

```python
# ✅ GOOD: Validate all inputs
from pydantic import BaseModel, Field, validator

class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    company: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=10, max_length=10000)
    
    @validator('title', 'company', 'description')
    def sanitize_html(cls, v):
        return bleach.clean(v, strip=True)

# ❌ BAD: Trust user input
class JobCreate(BaseModel):
    title: str
    description: str  # Could contain XSS!
```

### Environment Variables

```python
# ✅ GOOD: Required env vars, fail fast
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Required - will fail if not set
    supabase_url: str
    supabase_service_key: str
    openai_api_key: str
    
    # Optional with validation
    environment: str = "development"
    
    @validator('openai_api_key')
    def validate_api_key(cls, v):
        if not v.startswith('sk-'):
            raise ValueError("Invalid OpenAI API key format")
        return v
    
    class Config:
        env_file = ".env"

# ❌ BAD: Defaults and no validation
openai_key = os.getenv('OPENAI_API_KEY', 'default-key')
```

### Rate Limiting

```python
# ✅ GOOD: Rate limit expensive operations
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/resume/parse")
@limiter.limit("5/hour")  # 5 parses per hour per IP
async def parse_resume(...):
    pass

@app.post("/api/swipe")
@limiter.limit("100/minute")  # 100 swipes per minute
async def record_swipe(...):
    pass

# ❌ BAD: No rate limiting
@app.post("/api/resume/parse")
async def parse_resume(...):
    # Can be called unlimited times!
    pass
```

---

## 🌐 API Design Best Practices

### Versioning

```python
# ✅ GOOD: Versioned API
from fastapi import FastAPI

app = FastAPI()
api_v1 = FastAPI()

@api_v1.get("/jobs")
async def get_jobs_v1():
    pass

app.mount("/api/v1", api_v1)

# Future: /api/v2 with breaking changes

# ❌ BAD: No versioning
@app.get("/api/jobs")
async def get_jobs():
    # Breaking changes will affect all clients!
    pass
```

### Pagination

```python
# ✅ GOOD: Cursor-based pagination
from fastapi import Query

@app.get("/jobs")
async def get_jobs(
    limit: int = Query(20, le=100),
    cursor: Optional[str] = None
):
    jobs = await db.get_jobs(limit=limit, after=cursor)
    next_cursor = jobs[-1].id if jobs else None
    
    return {
        "data": jobs,
        "pagination": {
            "next_cursor": next_cursor,
            "has_more": len(jobs) == limit
        }
    }

# ❌ BAD: No pagination or offset-based
@app.get("/jobs")
async def get_jobs(limit: int = 20):
    # Returns only 20 jobs, no way to get more!
    return await db.get_jobs(limit=limit)
```

### Error Responses

```python
# ✅ GOOD: Consistent error format
from fastapi import HTTPException
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.status_code,
            message=exc.detail
        ).dict()
    )

# ❌ BAD: Inconsistent errors
raise HTTPException(400, "Bad request")
raise HTTPException(500, detail={"error": "Server error"})
```

---

## 🧪 Testing Best Practices

### Unit Tests

```python
# ✅ GOOD: Test single functionality
import pytest
from unittest.mock import Mock, patch

@pytest.mark.asyncio
async def test_parse_resume_success():
    """Test resume parsing with valid input."""
    ai_service = Mock()
    ai_service.parse.return_value = ParsedResumeData(
        name="John Doe",
        skills=["Python", "FastAPI"]
    )
    
    result = await parse_resume("Sample resume text", ai_service)
    
    assert result.name == "John Doe"
    assert "Python" in result.skills

@pytest.mark.asyncio  
async def test_parse_resume_empty_text():
    """Test resume parsing with empty text."""
    with pytest.raises(ValueError, match="empty"):
        await parse_resume("", Mock())

# ❌ BAD: Tests multiple things, no assertions
def test_resume():
    parse_resume("text")
    # No assertions!
```

### Integration Tests

```python
# ✅ GOOD: Test API endpoints
from fastapi.testclient import TestClient

def test_create_job_authenticated():
    """Test job creation with valid auth."""
    client = TestClient(app)
    headers = {"Authorization": f"Bearer {test_token}"}
    
    response = client.post(
        "/api/v1/jobs",
        json={
            "title": "Python Developer",
            "company": "TestCorp",
            "description": "Great opportunity"
        },
        headers=headers
    )
    
    assert response.status_code == 201
    assert response.json()["title"] == "Python Developer"

def test_create_job_unauthorized():
    """Test job creation without auth."""
    client = TestClient(app)
    
    response = client.post("/api/v1/jobs", json={...})
    
    assert response.status_code == 401
```

### Frontend Tests

```tsx
// ✅ GOOD: Test component behavior
import { render, screen, fireEvent } from '@testing-library/react';
import { JobCard } from './JobCard';

test('renders job information', () => {
  const job = {
    id: '1',
    title: 'Software Engineer',
    company: 'TechCorp'
  };
  
  render(<JobCard job={job} onSwipe={jest.fn()} />);
  
  expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  expect(screen.getByText('TechCorp')).toBeInTheDocument();
});

test('calls onSwipe when swiped', () => {
  const onSwipe = jest.fn();
  const job = { id: '1', title: 'Test Job', company: 'Test' };
  
  render(<JobCard job={job} onSwipe={onSwipe} />);
  
  fireEvent.click(screen.getByRole('button', { name: /apply/i }));
  
  expect(onSwipe).toHaveBeenCalledWith('right');
});
```

---

## 📝 Git & Version Control

### Commit Messages

```bash
# ✅ GOOD: Clear, descriptive commits
git commit -m "feat: Add rate limiting to resume parsing endpoint

- Limit to 5 parses per hour per user
- Add slowapi dependency
- Update tests to verify rate limit
- Closes #123"

# ❌ BAD: Unclear commits
git commit -m "fix stuff"
git commit -m "updates"
```

### Branch Strategy

```bash
# ✅ GOOD: Feature branches
git checkout -b feat/rate-limiting
# Work on feature
git push origin feat/rate-limiting
# Create PR

# ❌ BAD: Work directly on main
git checkout main
# Make changes directly
git push
```

### Pull Requests

```markdown
# ✅ GOOD: Detailed PR description
## Changes
- Added rate limiting to /api/resume/parse
- Limited to 5 requests per hour per user
- Added tests for rate limit behavior

## Testing
- Unit tests: ✅ All passing
- Manual test: ✅ Verified rate limit works
- Security scan: ✅ No new vulnerabilities

## Screenshots
[Add screenshot if UI changes]

## Closes
#123

# ❌ BAD: No description
Changed some code
```

---

## 📖 Documentation Standards

### Code Comments

```python
# ✅ GOOD: Clear docstrings
async def parse_resume(resume_text: str, is_premium: bool = False) -> ParsedResumeData:
    """
    Parse resume text using OpenAI GPT.
    
    This function is called ONCE per resume upload. Results are cached
    in the database and never re-parsed to save AI credits.
    
    Args:
        resume_text: Raw text extracted from PDF/DOCX
        is_premium: If True, use advanced parsing features
        
    Returns:
        ParsedResumeData: Structured resume information including
            name, skills, experience, and ATS score
            
    Raises:
        ValueError: If resume_text is empty
        AIServiceError: If OpenAI API fails
        
    Example:
        >>> text = extract_pdf("resume.pdf")
        >>> parsed = await parse_resume(text)
        >>> print(parsed.skills)
        ['Python', 'FastAPI', 'PostgreSQL']
    """
    pass

# ❌ BAD: No documentation
def parse(text):
    # Parse resume
    return result
```

### API Documentation

```python
# ✅ GOOD: OpenAPI/Swagger documentation
from fastapi import FastAPI
from pydantic import BaseModel, Field

class JobResponse(BaseModel):
    """Response model for job endpoints."""
    id: str = Field(..., description="Unique job identifier")
    title: str = Field(..., description="Job title", example="Senior Python Developer")
    company: str = Field(..., description="Company name", example="TechCorp")
    
@app.get(
    "/jobs/{job_id}",
    response_model=JobResponse,
    summary="Get job by ID",
    description="Retrieve detailed information about a specific job listing",
    responses={
        200: {"description": "Job found"},
        404: {"description": "Job not found"}
    }
)
async def get_job(job_id: str):
    """Get job details."""
    pass

# ❌ BAD: No API documentation
@app.get("/jobs/{job_id}")
async def get_job(job_id):
    pass
```

---

## 🎯 General Best Practices

### DRY (Don't Repeat Yourself)

```python
# ✅ GOOD: Reusable functions
def calculate_match_score(seeker_skills: List[str], job_requirements: List[str]) -> float:
    """Calculate job match score based on skill overlap."""
    seeker_set = set(s.lower() for s in seeker_skills)
    job_set = set(r.lower() for r in job_requirements)
    overlap = len(seeker_set.intersection(job_set))
    return (overlap / len(job_set)) * 100 if job_set else 50.0

# Use in multiple places
score1 = calculate_match_score(user.skills, job1.requirements)
score2 = calculate_match_score(user.skills, job2.requirements)

# ❌ BAD: Duplicate logic
# Copy-paste same logic in multiple places
```

### YAGNI (You Aren't Gonna Need It)

```python
# ✅ GOOD: Implement only what's needed
@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile):
    """Upload and store resume file."""
    # Simple implementation for MVP
    content = await file.read()
    path = await storage.save(content, file.filename)
    return {"path": path}

# ❌ BAD: Over-engineering for future
@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile,
    version: int = 1,  # For future versioning?
    encryption: str = "aes256",  # For future encryption?
    compression: str = "gzip"  # For future compression?
):
    # Complex implementation for features we don't need yet
    pass
```

### KISS (Keep It Simple, Stupid)

```python
# ✅ GOOD: Simple, clear logic
def is_match(swipe1_direction: str, swipe2_direction: str) -> bool:
    """Check if two swipes result in a match."""
    return swipe1_direction == "right" and swipe2_direction == "right"

# ❌ BAD: Overly complex
def is_match(s1, s2):
    return (lambda x, y: (lambda a, b: a == b)(x, y) and x == "right")(s1, s2)
```

---

## ✅ Code Review Checklist

Before submitting code for review:

- [ ] All tests pass
- [ ] Code is properly formatted (black, prettier)
- [ ] No linter warnings
- [ ] Type hints added (Python) or types defined (TypeScript)
- [ ] Docstrings/comments for complex logic
- [ ] Security considerations addressed
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] No hardcoded secrets or credentials
- [ ] Database migrations created (if schema changes)
- [ ] API documentation updated
- [ ] Performance considered for expensive operations
- [ ] Edge cases handled

---

## 📚 Resources

### Python/FastAPI
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PEP 8 Style Guide](https://peps.python.org/pep-0008/)
- [Type Hints Cheat Sheet](https://mypy.readthedocs.io/en/stable/cheat_sheet_py3.html)

### TypeScript/React
- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Web Security Cheat Sheet](https://cheatsheetseries.owasp.org/)

---

**Remember:** Good code is not just working code—it's maintainable, secure, and understandable by others.

**Generated:** February 4, 2026
