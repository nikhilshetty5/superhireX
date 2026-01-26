
export enum UserRole {
  SEEKER = 'SEEKER',
  RECRUITER = 'RECRUITER',
  NONE = 'NONE'
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  requirements: string[];
  postedAt: string;
  logo: string;
}

export interface Candidate {
  id: string;
  name: string;
  title: string;
  experience: string;
  location: string;
  skills: string[];
  bio: string;
  avatar: string;
  resumeUrl?: string;
}

export interface AIRecommendation {
  id: string;
  reason: string;
  matchScore: number;
}
