
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserSession {
  email: string;
  name?: string;
  role: 'SEEKER' | 'RECRUITER';
  isVerified: boolean;
  userId: string;
}

class AuthService {
  /**
   * 1. User enters email - Request OTP
   */
  async requestOTP(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      // Fallback for demo/testing if Supabase isn't configured yet
      if (email.includes('demo@superhirex.com')) {
        console.log('%c[Demo Mode] OTP: 1234', 'color: #3b82f6; font-weight: bold;');
        return;
      }
      throw error;
    }
  }

  /**
   * 2. User enters OTP - Verify and get session
   */
  async verifyOTP(email: string, code: string, role: 'SEEKER' | 'RECRUITER', name?: string): Promise<User | null> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      // Demo fallback logic
      if (email.includes('demo@superhirex.com') && code === '1234') {
        return { id: 'demo-user-id', email } as User;
      }
      throw error;
    }

    if (data.user) {
      // 3. Update profile with role and name in the background
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        role: role,
        updated_at: new Date().toISOString(),
      });
      return data.user;
    }

    return null;
  }

  /**
   * Logout helper
   */
  async logout() {
    await supabase.auth.signOut();
  }

  /**
   * Fetch profile data for a specific user ID
   */
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return data;
  }
}

export const authService = new AuthService();
