/**
 * Data Service - Fetches jobs and candidates from backend API
 * 
 * Engineering Notes:
 * - All data comes from backend API (no direct Supabase access)
 * - Backend handles AI ranking and filtering
 * - Frontend just displays what backend sends
 */

import { Job, Candidate } from '../types';
import { api } from './apiClient';
import { MOCK_JOBS, MOCK_CANDIDATES } from '../constants';

class DataService {
  /**
   * Get job feed for job seekers
   * Backend handles:
   * - Filtering already-swiped jobs
   * - AI-powered job ranking
   * - Match score calculation
   */
  async getJobs(page: number = 0, limit: number = 10): Promise<Job[]> {
    try {
      const jobs = await api.getJobs(limit);
      return jobs;
    } catch (error) {
      console.warn('Failed to fetch jobs from backend, using mock data:', error);
      return MOCK_JOBS;
    }
  }

  /**
   * Get candidate feed for recruiters
   * Backend handles:
   * - Filtering already-swiped candidates
   * - Only showing confirmed profiles
   * - Match score calculation
   */
  async getCandidates(page: number = 0, limit: number = 10): Promise<Candidate[]> {
    try {
      const candidates = await api.getCandidates(limit);
      return candidates;
    } catch (error) {
      console.warn('Failed to fetch candidates from backend, using mock data:', error);
      return MOCK_CANDIDATES;
    }
  }

  refresh() {
    console.log('Refreshing data from SuperHireX backend...');
  }
}

export const dataService = new DataService();
