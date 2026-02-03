/**
 * API Client for SuperhireX Backend
 * 
 * All API calls go through this client.
 * Automatically adds auth token to requests.
 * 
 * Engineering Notes:
 * - Never expose API keys in frontend
 * - All business logic in backend
 * - Frontend is untrusted UI layer only
 */

import { supabase } from '../lib/supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

/**
 * Get current user's access token from Supabase
 */
async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Make authenticated API request to backend
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Upload file (multipart/form-data)
 */
async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<T> {
  const token = await getAccessToken();
  
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: HeadersInit = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Profile endpoints
  getProfile: () => apiRequest<any>('/api/auth/profile'),
  createProfile: (data: any) => apiRequest<any>('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Resume endpoints
  uploadResume: (file: File) => uploadFile<any>('/api/resume/upload', file),
  parseResume: (resumeId: string) => apiRequest<any>(`/api/resume/parse?resume_id=${resumeId}`, {
    method: 'POST',
  }),
  confirmResume: (data: any) => apiRequest<any>('/api/resume/confirm', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getResumeStatus: () => apiRequest<any>('/api/resume/status'),

  // Job endpoints
  getJobs: (limit: number = 20) => apiRequest<any[]>(`/api/jobs?limit=${limit}`),
  getJob: (jobId: string) => apiRequest<any>(`/api/jobs/${jobId}`),
  createJob: (data: any) => apiRequest<any>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateJob: (jobId: string, data: any) => apiRequest<any>(`/api/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteJob: (jobId: string) => apiRequest<any>(`/api/jobs/${jobId}`, {
    method: 'DELETE',
  }),

  // Candidate endpoints
  getCandidates: (limit: number = 20) => apiRequest<any[]>(`/api/candidates?limit=${limit}`),

  // Swipe endpoints
  recordSwipe: (data: { target_id: string; target_type: 'job' | 'candidate'; direction: 'left' | 'right' }) => 
    apiRequest<any>('/api/swipe', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Match endpoints
  getMatches: () => apiRequest<any[]>('/api/matches'),
};

export default api;
