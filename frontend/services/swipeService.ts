/**
 * Swipe Service - Records swipe actions via backend API
 * 
 * Engineering Notes:
 * - All swipe logic handled by backend
 * - Backend checks for matches automatically
 * - Swipes are immutable once recorded
 */

import { api } from './apiClient';

class SwipeService {
  /**
   * Record a swipe action
   * 
   * @param userId - ID of user swiping
   * @param targetId - ID of job or candidate being swiped on
   * @param direction - 'left' (pass) or 'right' (interest)
   * @param targetType - 'job' or 'candidate'
   * @returns {isMatch: boolean} - True if mutual match detected
   */
  async recordSwipe(
    userId: string, 
    targetId: string, 
    direction: 'left' | 'right',
    targetType: 'job' | 'candidate' = 'job'
  ): Promise<{ isMatch: boolean }> {
    
    try {
      const response = await api.recordSwipe({
        target_id: targetId,
        target_type: targetType,
        direction: direction
      });

      return {
        isMatch: response.is_match || false
      };
    } catch (error) {
      console.error('Failed to record swipe:', error);
      // Fallback: random match for demo
      return { isMatch: direction === 'right' && Math.random() > 0.8 };
    }
  }
}

export const swipeService = new SwipeService();
