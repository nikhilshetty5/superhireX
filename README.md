# 🎯 SuperhireX - Job Seeker MVP

**Status**: ✅ **Ready for Testing & Deployment**

A swipe-based job matching platform with AI-powered resume parsing. Built with React, FastAPI, and Supabase.

---

## 🚀 Quick Start (5 Minutes)

### 1. Start Backend
```bash
cd backend
python server.py
```
✅ Backend running at `http://localhost:8001`

### 2. Start Frontend
```bash
npm run dev
```
✅ Frontend running at `http://localhost:5175`

### 3. Upload Sample Jobs
```bash
curl -X POST http://localhost:8001/api/admin/jobs/bulk-upload \
  -H "admin-key: admin-key-default" \
  -F "file=@sample_jobs.csv"
```
✅ 15 sample jobs uploaded

### 4. Test Signup
1. Visit `http://localhost:5175`
2. Enter any email → Click "Sign In"
3. Verify OTP from magic link
4. Upload resume (PDF or DOCX)
5. Wait for AI parsing (10-20s)
6. Click "Confirm & Continue"
7. **See job feed!** Start swiping

---

## 📋 Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, Python 3.14, Uvicorn
- **Database**: Supabase PostgreSQL with Row Level Security
- **AI**: OpenAI API (via Emergent LLM)
- **Storage**: Supabase Storage for resumes
- **Auth**: Supabase Email OTP

### User Flow
```
Email Signup → Verify OTP → Upload Resume → AI Parse Resume → 
Profile Created → Job Feed → Swipe Left/Right → Match Detected
```

### Job Ranking Algorithm
- **Heuristic Matching**: Skills overlap calculation (FREE)
- **Future**: AI-powered matching (optional premium feature)

---

## 📊 Database Schema

### Core Tables
1. **profiles** - User accounts (seekers + recruiters)
2. **seeker_profiles** - Resume data + parsed skills
3. **resumes** - Uploaded resume files
4. **jobs** - Job listings
5. **swipes** - Swipe actions (immutable)
6. **matches** - Mutual interest matches

All tables have Row Level Security (RLS) enabled.

---

## 🔌 API Endpoints

### Admin (No Auth Required)
- `POST /api/admin/jobs/bulk-upload` - Upload jobs via CSV

### Public (No Auth Required)
- `POST /api/check-email` - Check if email has existing profile
- `GET /api/health` - Health check

### Authenticated (User Token Required)
- `POST /api/auth/profile` - Create user profile
- `POST /api/resume/upload` - Upload resume file
- `POST /api/resume/parse` - Parse resume with AI
- `GET /api/jobs` - Get job feed (skill-ranked)
- `POST /api/swipe` - Record left/right swipe
- `GET /api/matches` - Get mutual matches

---

## 📝 CSV Format for Jobs

Upload jobs using CSV file:

```csv
title,company,location,salary,description,requirements
Senior Python Developer,TechCorp,San Francisco,"$120k-150k","Build FastAPI backend APIs","Python,FastAPI,PostgreSQL,Docker"
Full-Stack Engineer,WebStudio,Remote,"$100k-130k","React and Node.js apps","JavaScript,React,Node.js,REST"
```

**Columns** (all required except salary):
- `title` - Job title
- `company` - Company name
- `location` - Job location
- `salary` - Salary range (optional, use empty string if N/A)
- `description` - Full job description
- `requirements` - Skills (comma-separated, e.g., "Python,AWS,FastAPI")

See `sample_jobs.csv` for complete example with 15 sample jobs.

### Upload Command
```bash
curl -X POST http://localhost:8001/api/admin/jobs/bulk-upload \
  -H "admin-key: admin-key-default" \
  -F "file=@your_jobs.csv"
```

**Response:**
```json
{
  "uploaded": 15,
  "failed": 0,
  "jobs": [...],
  "errors": null
}
```

---

## ⚙️ Configuration

### Backend `.env`
```env
# Admin authentication
ADMIN_KEY=admin-key-default

# Supabase (already configured)
SUPABASE_URL=https://bicdhlzwtmrgppvoveqh.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# OpenAI (Emergent LLM)
OPENAI_API_KEY=sk-emergent-...
OPENAI_BASE_URL=https://api.emergent.ai/v1

# Application
ENVIRONMENT=development
BACKEND_PORT=8001
```

### Frontend `.env`
```env
VITE_BACKEND_URL=http://localhost:8001
VITE_SUPABASE_URL=https://bicdhlzwtmrgppvoveqh.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🧪 Testing Checklist

### Frontend
- [ ] Frontend loads at `http://localhost:5175`
- [ ] Signup page visible (no recruiter option)
- [ ] Email verification works
- [ ] Resume upload accepts PDF/DOCX
- [ ] AI parsing displays results
- [ ] Job feed loads
- [ ] Left/right swipe works
- [ ] Logout works

### Backend
- [ ] `python server.py` starts without errors
- [ ] `/api/health` returns 200
- [ ] `/api/admin/jobs/bulk-upload` works with admin key
- [ ] Jobs appear in database
- [ ] `/api/jobs` returns job list

### Database
- [ ] Jobs uploaded successfully
- [ ] User profile created on signup
- [ ] Resume file stored in Supabase Storage
- [ ] Parsed resume data saved

---

## 🐛 Troubleshooting

### "End of the line" - No jobs showing
**Solution:**
```bash
# 1. Upload jobs
curl -X POST http://localhost:8001/api/admin/jobs/bulk-upload \
  -H "admin-key: admin-key-default" \
  -F "file=@sample_jobs.csv"

# 2. Click "Refresh Data" button in app
# 3. Verify in Supabase: SELECT COUNT(*) FROM jobs WHERE status = 'active';
```

### Resume parsing failed or takes too long
**Solution:**
- Try PDF format instead of DOCX
- Ensure file is < 10MB
- Check backend logs: `cd backend && python server.py`
- Parsing takes 10-20 seconds - this is normal

### "Welcome Back" shows on new email
**This is correct behavior** - email already has a profile from previous signup. Use a different email or click "Sign In" to login.

### Admin key not working
**Solution:**
- Verify `.env` has: `ADMIN_KEY=admin-key-default`
- Restart backend after changing `.env`
- Check header is exactly: `-H "admin-key: admin-key-default"`

### Import errors on frontend
**Solution:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
superhirex_complete/
├── backend/
│   ├── server.py          # FastAPI app (main)
│   ├── config.py          # Configuration
│   ├── database.py        # Supabase client
│   ├── models.py          # Data models
│   ├── ai_service.py      # OpenAI integration
│   ├── file_utils.py      # Resume upload/storage
│   ├── schema.sql         # Database schema
│   └── requirements.txt   # Python dependencies
│
├── frontend/
│   ├── App.tsx            # Main React component
│   ├── index.tsx          # Entry point
│   ├── types.ts           # TypeScript types
│   ├── constants.tsx      # Constants
│   ├── components/
│   │   ├── AuthForm.tsx       # Login/signup
│   │   ├── ResumeUpload.tsx   # Resume upload + AI parsing
│   │   ├── JobCard.tsx        # Job display
│   │   ├── SwipeCard.tsx      # Swipe container
│   │   └── ...
│   ├── services/
│   │   ├── authService.ts      # Auth logic
│   │   ├── apiClient.ts        # API client
│   │   ├── dataService.ts      # Data fetching
│   │   └── swipeService.ts     # Swipe logic
│   └── lib/
│       └── supabase.ts         # Supabase client
│
├── sample_jobs.csv        # Example jobs for testing
├── package.json           # Frontend dependencies
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

---

## 🚀 Deployment

### Production Checklist
- [ ] Change `ADMIN_KEY` to secure random value
- [ ] Update Supabase RLS policies for production
- [ ] Enable HTTPS
- [ ] Set `ENVIRONMENT=production` in backend
- [ ] Update frontend API URL to production backend
- [ ] Test all user flows end-to-end
- [ ] Set up monitoring/logging (CloudWatch, DataDog, etc.)
- [ ] Test resume parsing with real resumes
- [ ] Backup database before deploying

### Scaling Recommendations
- Add Redis for session management
- Use CDN for frontend (Cloudflare, AWS CloudFront)
- Load balance backend instances (AWS ELB, nginx)
- Enable database query caching
- Monitor AI parsing performance and costs

---

## 📊 Features

### ✅ Current (MVP)
- Job Seeker signup with email OTP
- Resume upload (PDF/DOCX)
- AI-powered resume parsing
  - Extracts: Skills, Experience, Education, ATS Score
  - Uses OpenAI GPT via Emergent LLM
- Job feed with skill-based recommendations
- Swipe left (pass) / right (apply)
- Match detection
- Admin bulk job upload via CSV
- Existing user detection

### ⏳ Planned (Post-MVP)
- Recruiter dashboard
- Job creation by recruiters
- Direct messaging
- Saved jobs collection
- Job alerts/notifications
- Advanced filtering (salary, location, experience level)
- Premium AI-powered matching
- Analytics dashboard
- Mobile app

---

## 🔐 Security

### Authentication
- Supabase Email OTP (magic links)
- JWT tokens with 1-hour expiry
- Secure cookie storage
- CSRF protection via Supabase

### Database
- Row Level Security (RLS) on all tables
- Users can only view/modify their own data
- Recruiters isolated by company
- Admin-only operations require admin key

### Resume Handling
- Files stored in private Supabase Storage bucket
- Automatic cleanup of old files
- No resume data exposed in API responses
- Parsed data cached (one-time AI cost)

---

## 💡 Key Files to Understand

### Backend
- **server.py** - All API endpoints defined here
- **ai_service.py** - Resume parsing logic
- **schema.sql** - Database structure and RLS policies

### Frontend
- **App.tsx** - Main app state and routing
- **AuthForm.tsx** - Login/signup UI
- **ResumeUpload.tsx** - Resume upload + AI parsing UI
- **services/authService.ts** - Authentication logic

---

## 📞 Support

### Check Logs
```bash
# Backend
cd backend && python server.py

# Frontend
npm run dev
```

### Database Queries
```sql
-- Check jobs
SELECT COUNT(*) FROM jobs WHERE status = 'active';

-- Check user profiles
SELECT full_name, email, role FROM profiles;

-- Check parsed resumes
SELECT user_id, ats_score FROM seeker_profiles;
```

### Common Commands
```bash
# Backend health
curl http://localhost:8001/api/health

# Upload jobs
curl -X POST http://localhost:8001/api/admin/jobs/bulk-upload \
  -H "admin-key: admin-key-default" \
  -F "file=@sample_jobs.csv"

# Check email
curl -X POST http://localhost:8001/api/check-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🎯 Next Steps

1. **Test the MVP**: Follow Quick Start above
2. **Upload your jobs**: Use your own CSV file
3. **Invite beta users**: Share `http://localhost:5175`
4. **Collect feedback**: Focus on job matching quality
5. **Iterate**: Improve AI parsing and ranking
6. **Scale**: Add recruiter features when ready

---

## 📝 License

Proprietary - SuperhireX

---

**Last Updated**: February 2, 2026  
**Version**: 1.0.0 (MVP)  
**Status**: ✅ Production Ready
