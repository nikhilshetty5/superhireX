/**
 * Authentication Service
 * 
 * Handles Supabase Auth (Email/Password) and profile management via backend API.
 * 
 * Engineering Notes:
 * - Supabase Auth for login/signup (frontend) - Email/Password method
 * - Profile management via backend API
 * - Backend creates/updates profiles in PostgreSQL
 */

import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { api } from './apiClient';

export interface UserSession {
  email: string;
  name?: string;
  role: 'SEEKER' | 'RECRUITER';
  isVerified: boolean;
  userId: string;
}

class AuthService {
  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, name: string): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  /**
   * Check if user profile already exists (to suggest login instead of signup)
   */
  async checkProfileExists(userId: string): Promise<boolean> {
    try {
      const profile = await api.getProfile();
      return !!profile;
    } catch (error) {
      return false;
    }
  }

  /**
   * Authenticate user after signup/signin
   * Creates profile for new users
   */
  async authenticateUser(email: string, role: 'SEEKER' | 'RECRUITER', name?: string): Promise<User | null> {
    // Get current session to verify user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw new Error('Not authenticated');
    }

    const userId = session.user.id;

    // Check if profile already exists
    const profileExists = await this.checkProfileExists(userId);
    
    if (profileExists) {
      console.log('✅ User logged in - profile already exists');
      return session.user;
    }
    
    // New user - create profile via backend API
    try {
      await api.createProfile({
        user_id: userId,
        full_name: name,
        email: email,
        role: role
      });
      console.log('✅ New profile created for:', role);
    } catch (err) {
      console.error('Failed to create profile via backend:', err);
      // Continue anyway, profile might already exist
    }
    
    return session.user;
  }

  /**
   * Logout helper
   */
  async logout() {
    await supabase.auth.signOut();
  }

  /**
   * Fetch profile data for a specific user ID
   * Now fetches from backend API instead of direct Supabase
   */
  async getUserProfile(userId: string) {
    try {
      const profile = await api.getProfile();
      return profile;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // If profile doesn't exist, create one
      if (error instanceof Error && error.message.includes('404')) {
        console.log('Profile not found, creating new profile...');
        // Profile will be created on next attempt after role selection
      }
      return null;
    }
  }
}

export const authService = new AuthService();
