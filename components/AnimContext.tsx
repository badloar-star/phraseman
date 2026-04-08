import React, { useEffect, useMemo } from 'react';
import {
  useSharedValue, withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';

export interface AnimCtx {
  t: any; tSlow: any; tMed: any; tFast: any; breathe: any; pulse: any;
}

export const AnimContext = React.createContext<AnimCtx | null>(null);

export function useAnimCtx(): AnimCtx {
  const ctx = React.useContext(AnimContext);
  if (!ctx) throw new Error('Must be inside AnimatedFrameProvider');
  return ctx;
}

// Provider lives here (not in AnimatedFrame.tsx) so _layout.tsx
// does NOT pull in @shopify/react-native-skia on startup.
export function AnimatedFrameProvider({ children }: { children: React.ReactNode }) {
  const t       = useSharedValue(0);
  const tSlow   = useSharedValue(0);
  const tMed    = useSharedValue(0);
  const tFast   = useSharedValue(0);
  const breathe = useSharedValue(0);
  const pulse   = useSharedValue(0);

  useEffect(() => {
    t.value       = withRepeat(withTiming(1, { duration: 4000,  easing: Easing.linear }), -1, false);
    tSlow.value   = withRepeat(withTiming(1, { duration: 10000, easing: Easing.linear }), -1, false);
    tMed.value    = withRepeat(withTiming(1, { duration: 6000,  easing: Easing.linear }), -1, false);
    tFast.value   = withRepeat(withTiming(1, { duration: 2500,  easing: Easing.linear }), -1, false);
    breathe.value = withRepeat(withSequence(
      withTiming(1,   { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0,   { duration: 2000, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    pulse.value   = withRepeat(withSequence(
      withTiming(1,   { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, []);

  const ctx = useMemo(() => ({ t, tSlow, tMed, tFast, breathe, pulse }), []);
  return <AnimContext.Provider value={ctx}>{children}</AnimContext.Provider>;
}
