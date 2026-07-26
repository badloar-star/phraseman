// зачем: RN-замена source/src/lab/LabContext.tsx. Поверхности Kimi читают отсюда
// канонический state, условия (signal/online) и пишут интенты в журнал. В приложении
// журнал держим только в памяти — ни сети, ни Firestore (лаборатория дев-гейта).
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import type { CanonicalState } from './tokens';

export interface LabIntentEvent {
  readonly surfaceId: string;
  readonly intent: string;
  readonly payload?: unknown;
}

export interface LabConditions {
  /** Симулированный сигнал плеера (Kimi: playing/paused/none). */
  readonly signal: 'playing' | 'paused' | 'none';
  readonly online: boolean;
}

export interface LabValue {
  readonly canonicalState: CanonicalState;
  readonly conditions: LabConditions;
  readonly logIntent: (event: LabIntentEvent) => void;
  readonly setState: (next: CanonicalState) => void;
  readonly setSignal: (next: LabConditions['signal']) => void;
}

const FALLBACK: LabValue = {
  canonicalState: 'prompt',
  conditions: { signal: 'none', online: true },
  logIntent: () => {},
  setState: () => {},
  setSignal: () => {},
};

const LabContext = createContext<LabValue>(FALLBACK);

export function useLab(): LabValue {
  return useContext(LabContext);
}

export interface LabProviderProps {
  readonly initialState?: CanonicalState;
  readonly onIntent?: (event: LabIntentEvent) => void;
  readonly children: React.ReactNode;
}

export function LabProvider({ initialState = 'prompt', onIntent, children }: LabProviderProps) {
  const [canonicalState, setCanonicalState] = useState<CanonicalState>(initialState);
  const [signal, setSignalState] = useState<LabConditions['signal']>('none');
  // зачем: колбэк живёт в ref — иначе каждый рендер родителя пересоздаёт value контекста
  // и перерисовывает всю поверхность (лишние ре-рендеры на каждый тап).
  const intentRef = useRef(onIntent);
  intentRef.current = onIntent;

  const logIntent = useCallback((event: LabIntentEvent) => {
    intentRef.current?.(event);
  }, []);

  const setSignal = useCallback((next: LabConditions['signal']) => {
    setSignalState(next);
  }, []);

  const value = useMemo<LabValue>(
    () => ({
      canonicalState,
      conditions: { signal, online: true },
      logIntent,
      setState: setCanonicalState,
      setSignal,
    }),
    [canonicalState, signal, logIntent, setSignal],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}
