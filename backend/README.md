# SuperhireX Backend

## Architecture

Full-stack job matching platform with:
- **Backend**: FastAPI (Python) - All business logic and AI
- **Frontend**: React TypeScript - UI only
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (Email OTP)
- **AI**: OpenAI GPT via Emergent LLM Key
- **Storage**: Supabase Storage

## Key Features

### Credit Protection (IMPORTANT)
- ✅ Resume parsing: **ONCE per upload**, cached forever
- ✅ Job ranking: Heuristic-first, AI optional
- ✅ No AI calls on swipes, logins, or profile views
- ✅ All AI results stored in PostgreSQL

### Security
- ✅ Backend-only AI (keys never exposed to frontend)
- ✅ Row Level Security (RLS) on all tables
- ✅ JWT auth via Supabase
- ✅ CORS configured

## Setup Instructions

### 1. Install Dependencies

```bash
cd /app/backend
pip install -r requirements.txt
```

### 2. Configure Environment

Update `/app/backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://bicdhlzwtmrgppvoveqh.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
OPENAI_API_KEY=sk-emergent-02a91E395599d2b9d8
```

### 3. Set Up Database

1. Go to your Supabase project: https://supabase.com/dashboard/project/bicdhlzwtmrgppvoveqh
2. Navigate to SQL Editor
3. Run `/app/backend/schema.sql`
4. Create storage bucket named `resumes` in Storage section

### 4. Run Server

```bash
cd /app/backend
python server.py
```

Server runs on: http://localhost:8001

## API Endpoints

### Authentication
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/profile` - Create/update profile

### Resume Management
- `POST /api/resume/upload` - Upload resume file
- `POST /api/resume/parse` - Parse resume with AI (ONCE)
- `PUT /api/resume/confirm` - Confirm parsed data
- `GET /api/resume/status` - Check parsing status

### Jobs (Recruiters)
- `POST /api/jobs` - Create job listing
- `GET /api/jobs` - Get job feed (for seekers)
- `GET /api/jobs/:id` - Get single job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Candidates (Recruiters)
- `GET /api/candidates` - Get candidate feed

### Swipes
- `POST /api/swipe` - Record swipe, check for match

### Matches
- `GET /api/matches` - Get all matches

## File Structure

```
/app/backend/
├── server.py          # Main FastAPI application
├── config.py          # Environment configuration
├── database.py        # Supabase connection
├── models.py          # Pydantic models
├── ai_service.py      # OpenAI resume parsing
├── file_utils.py      # File processing & storage
├── schema.sql         # Database schema
├── requirements.txt   # Python dependencies
└── .env              # Environment variables
```

## Engineering Notes

### AI Credit Protection

**Resume Parsing:**
```python
# ✅ CORRECT: Parse once, cache forever
await ai_service.parse_resume_text(resume_text)
# Result stored in seeker_profiles.parsed_data

# ❌ WRONG: Never re-parse
# Don't call parse_resume_text on login/profile view
```

**Job Ranking:**
```python
# ✅ CORRECT: Heuristic first
match_score = ai_service.calculate_job_match_score(skills, requirements)
# Pure skill overlap calculation, no AI

# ❌ WRONG: Don't use AI per swipe
```

### Database Access

**Admin Client:**
```python
# Use for backend operations (bypasses RLS)
db.admin_client.table("profiles").select("*").execute()
```

**User Client:**
```python
# Use for user-scoped operations (respects RLS)
db.get_user_client(access_token).table("profiles").select("*").execute()
```

### Storage Abstraction

All file operations go through `StorageService`:
```python
storage = StorageService(db.admin_client)
file_path, url = await storage.upload_resume(user_id, file)
```

This allows easy migration to AWS S3 later.

## Scaling Considerations

### MVP (Current)
- Supabase PostgreSQL
- Heuristic job ranking
- Single server

### Future Enhancements
- [ ] Redis caching for match scores
- [ ] Vector embeddings for semantic job matching
- [ ] Background job queue for resume parsing
- [ ] AWS S3 for resume storage
- [ ] CDN for static assets
- [ ] Horizontal scaling with load balancer
- [ ] Premium features (advanced ATS scoring)

## Troubleshooting

### Issue: "Invalid token"
**Fix:** Ensure frontend sends `Authorization: Bearer <token>` header

### Issue: "Resume parsing failed"
**Fix:** Check OpenAI API key and credits

### Issue: "File upload failed"
**Fix:** Ensure Supabase storage bucket `resumes` exists

### Issue: "RLS policy error"
**Fix:** Run schema.sql to set up RLS policies

## License

MIT License - See LICENSE file
