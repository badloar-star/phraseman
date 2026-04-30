import React from 'react';

// AnimContext stub — frame animations removed
export interface AnimCtx {
  t: any; tSlow: any; tMed: any; tFast: any; breathe: any; pulse: any;
}

export const AnimContext = React.createContext<AnimCtx | null>(null);

export function useAnimCtx(): AnimCtx {
  return {} as AnimCtx;
}

export function AnimatedFrameProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
