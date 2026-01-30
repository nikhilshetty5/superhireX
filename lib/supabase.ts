
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase Project URL and Anon Key 
// found in your Supabase Dashboard under Project Settings -> API
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
