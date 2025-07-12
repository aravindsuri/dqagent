import { useState, useEffect } from 'react';
import { UserProfile } from '../types/api.types';

export const useUserProfile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate user data - replace with actual API call
    const mockUser: UserProfile = {
      id: '1',
      name: 'Netherlands Team',
      email: 'nl-team@daimler.com',
      country: 'NL',
      role: 'market_team',
      permissions: ['view_questionnaire', 'submit_response']
    };

    setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 500);
  }, []);

  return { user, loading };
};
