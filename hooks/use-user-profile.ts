import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../app/types/user_profile';

interface UseUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('user_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          setProfile(parsed);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load profile'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        if (!profile) {
          throw new Error('No profile loaded');
        }

        const updated = { ...profile, ...updates };
        setProfile(updated);
        await AsyncStorage.setItem('user_profile', JSON.stringify(updated));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update profile'));
        throw err;
      }
    },
    [profile]
  );

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}
