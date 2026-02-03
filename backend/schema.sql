-- SuperhireX Database Schema for Supabase PostgreSQL
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============== Profiles Table ==============
-- Extends Supabase auth.users with application-specific data

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('SEEKER', 'RECRUITER')),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);


-- ============== Seeker Profiles Table ==============
-- Additional data for job seekers

CREATE TABLE IF NOT EXISTS seeker_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    bio TEXT,
    location TEXT,
    experience TEXT,
    skills TEXT[] DEFAULT '{}',
    ats_score DECIMAL(5,2),
    resume_status TEXT DEFAULT 'pending' CHECK (resume_status IN ('pending', 'parsing', 'parsed', 'confirmed', 'failed')),
    parsed_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE seeker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seeker profile" ON seeker_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own seeker profile" ON seeker_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seeker profile" ON seeker_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recruiters can view confirmed seeker profiles
CREATE POLICY "Recruiters can view confirmed seekers" ON seeker_profiles
    FOR SELECT USING (
        resume_status = 'confirmed' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'RECRUITER'
        )
    );


-- ============== Resumes Table ==============
-- Tracks uploaded resume files

CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    parsed_at TIMESTAMPTZ,
    is_primary BOOLEAN DEFAULT TRUE
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resumes" ON resumes
    FOR SELECT USING (auth.uid() = seeker_id);

CREATE POLICY "Users can insert own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Users can update own resumes" ON resumes
    FOR UPDATE USING (auth.uid() = seeker_id);


-- ============== Jobs Table ==============
-- Job listings posted by recruiters

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recruiter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    salary TEXT,
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    logo TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Recruiters can manage their own jobs
CREATE POLICY "Recruiters can view own jobs" ON jobs
    FOR SELECT USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can insert own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can update own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete own jobs" ON jobs
    FOR DELETE USING (auth.uid() = recruiter_id);

-- Seekers can view active jobs
CREATE POLICY "Seekers can view active jobs" ON jobs
    FOR SELECT USING (
        status = 'active' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'SEEKER'
        )
    );


-- ============== Swipes Table ==============
-- Records all swipe actions (immutable)

CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('job', 'candidate')),
    direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swiper_id, target_id, target_type)
);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own swipes" ON swipes
    FOR SELECT USING (auth.uid() = swiper_id);

CREATE POLICY "Users can insert own swipes" ON swipes
    FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes(target_id);


-- ============== Matches Table ==============
-- Records mutual interest matches

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seeker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    UNIQUE(seeker_id, recruiter_id, job_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Seekers can view their matches
CREATE POLICY "Seekers can view own matches" ON matches
    FOR SELECT USING (auth.uid() = seeker_id);

-- Recruiters can view their matches
CREATE POLICY "Recruiters can view own matches" ON matches
    FOR SELECT USING (auth.uid() = recruiter_id);

-- Users can insert matches (backend handles logic)
CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (
        auth.uid() = seeker_id OR auth.uid() = recruiter_id
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_matches_seeker ON matches(seeker_id);
CREATE INDEX IF NOT EXISTS idx_matches_recruiter ON matches(recruiter_id);


-- ============== Storage Bucket ==============
-- Create storage bucket for resumes (run this in Storage section of Supabase dashboard)
-- Bucket name: resumes
-- Public: false (private files)

-- Note: You need to create this bucket in Supabase Dashboard > Storage
-- Then set up RLS policies for the bucket:

-- Policy: Users can upload their own resumes
-- insert ((bucket_id = 'resumes') AND (auth.uid()::text = (storage.foldername(name))[1]))

-- Policy: Users can view their own resumes
-- select ((bucket_id = 'resumes') AND (auth.uid()::text = (storage.foldername(name))[1]))


-- ============== Functions & Triggers ==============

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seeker_profiles_updated_at BEFORE UPDATE ON seeker_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============== Sample Data (Optional) ==============
-- Uncomment to insert sample data for testing

-- INSERT INTO profiles (id, user_id, full_name, email, role) VALUES
-- (uuid_generate_v4(), uuid_generate_v4(), 'John Doe', 'john@example.com', 'SEEKER'),
-- (uuid_generate_v4(), uuid_generate_v4(), 'Jane Smith', 'jane@techcorp.com', 'RECRUITER');

COMMIT;
