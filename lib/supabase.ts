
import { createClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase Client
 * In Vite, environment variables are accessed via import.meta.env
 */

// Helper to get env variables safely
const getEnv = (key: string): string => {
  // Try import.meta.env (Vite standard) first, then process.env
  const value = (import.meta as any).env?.[key] || (process as any).env?.[key];
  return value || '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Log a warning instead of crashing if variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'SUPERHIREX WARNING: Supabase credentials (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) are missing in environment. ' +
    'Real-time database features will be disabled. Demo Mode remains available.'
  );
}

// We provide fallback strings to prevent createClient from throwing an "is required" Error.
// This allows the app to boot and run Demo logic even without a backend connection.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
