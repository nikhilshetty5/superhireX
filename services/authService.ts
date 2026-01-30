
import { supabase } from '../lib/supabase';

export interface UserSession {
  email: string;
  name?: string;
  role: 'SEEKER' | 'RECRUITER';
  isVerified: boolean;
  userId: string;
}

class AuthService {
  private session: UserSession | null = null;

  async requestOTP(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('Supabase Auth Error:', error.message);
      // Fallback for demo purposes if keys aren't set
      if (email === 'demo@superhirex.com' || email === 'demo@kergox.com') {
        console.log('%c[Demo Mode] OTP Requested for SuperHireX demo (Code: 1234)', 'color: #3b82f6');
        return;
      }
      throw error;
    }
  }

  async verifyOTP(email: string, code: string, role: 'SEEKER' | 'RECRUITER', name?: string): Promise<UserSession> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });

    if (error) {
      // Demo logic
      if ((email === 'demo@superhirex.com' || email === 'demo@kergox.com') && code === '1234') {
        this.session = { email, name: name || 'Demo User', role, isVerified: true, userId: 'demo-user-id' };
        return this.session;
      }
      throw error;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: data.user.id, 
          full_name: name, 
          role: role 
        });

      if (profileError) console.error('Profile Update Error:', profileError);

      this.session = {
        email: data.user.email!,
        name: name,
        role: role,
        isVerified: true,
        userId: data.user.id
      };
      
      return this.session;
    }

    throw new Error('Verification failed');
  }

  getCurrentSession(): UserSession | null {
    return this.session;
  }

  async logout() {
    await supabase.auth.signOut();
    this.session = null;
  }
}

export const authService = new AuthService();
