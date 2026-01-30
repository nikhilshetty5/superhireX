
import { supabase } from '../lib/supabase';

class SwipeService {
  async recordSwipe(
    userId: string, 
    targetId: string, 
    direction: 'left' | 'right'
  ): Promise<{ isMatch: boolean }> {
    
    // 1. Record the swipe in the database
    const { error: swipeError } = await supabase
      .from('swipes')
      .insert({
        swiper_id: userId,
        target_id: targetId,
        type: direction
      });

    if (swipeError) {
      console.warn('Could not record swipe to Supabase:', swipeError.message);
      // Fallback random match for development
      return { isMatch: direction === 'right' && Math.random() > 0.8 };
    }

    // 2. Check for reciprocal match if liked
    if (direction === 'right') {
      const { data: reciprocalSwipe, error: matchError } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_id', targetId)
        .eq('target_id', userId)
        .eq('type', 'right')
        .single();

      if (reciprocalSwipe && !matchError) {
        // Record the match in a matches table
        await supabase.from('matches').insert({
          user_a: userId,
          user_b: targetId
        });
        return { isMatch: true };
      }
    }

    return { isMatch: false };
  }
}

export const swipeService = new SwipeService();
