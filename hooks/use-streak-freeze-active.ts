import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { onAppEvent } from '../app/events';
import { readStreakFreezeActive } from '../app/streak_freeze';

export { readStreakFreezeActive };

export function useStreakFreezeActive(): boolean {
  const [freezeActive, setFreezeActive] = useState(false);

  const refresh = useCallback(() => {
    let cancelled = false;
    void readStreakFreezeActive().then(active => {
      if (!cancelled) setFreezeActive(active);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  useEffect(() => {
    const refreshNow = () => {
      void readStreakFreezeActive().then(setFreezeActive);
    };
    const subs = [
      onAppEvent('streak_freeze_updated', refreshNow),
      onAppEvent('premium_activated', refreshNow),
      onAppEvent('premium_deactivated', refreshNow),
      onAppEvent('cloud_profile_hydrated', refreshNow),
      onAppEvent('streak_revived', refreshNow),
    ];
    const appSub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshNow();
    });
    return () => {
      subs.forEach(sub => sub.remove());
      appSub.remove();
    };
  }, []);

  return freezeActive;
}
