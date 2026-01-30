
import { Job, Candidate } from '../types';
import { supabase } from '../lib/supabase';
import { MOCK_JOBS, MOCK_CANDIDATES } from '../constants';

class DataService {
  async getJobs(page: number = 0, limit: number = 10): Promise<Job[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .range(page * limit, (page + 1) * limit - 1)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_JOBS;
    }

    return data as Job[];
  }

  async getCandidates(page: number = 0, limit: number = 10): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .range(page * limit, (page + 1) * limit - 1)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_CANDIDATES;
    }

    return data as Candidate[];
  }

  refresh() {
    console.log('Refreshing data from SuperHireX backend...');
  }
}

export const dataService = new DataService();
