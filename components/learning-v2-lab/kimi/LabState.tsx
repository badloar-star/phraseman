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
  // зачем: владелец выбрал НАСТОЯЩИЙ микрофон (распознавание на устройстве) —
  // разрешение станет реальным в речевой волне; поверхности читают его уже сейчас,
  // чтобы панель «микрофон выключен» не пришлось вшивать задним числом.
  readonly permission: 'granted' | 'denied' | 'undetermined';
}

export interface LabValue {
  readonly canonicalState: CanonicalState;
  readonly conditions: LabConditions;
  readonly logIntent: (event: LabIntentEvent) => void;
  readonly setState: (next: CanonicalState) => void;
  readonly setSignal: (next: LabConditions['signal']) => void;
  readonly setPermission: (next: LabConditions['permission']) => void;
}

const FALLBACK: LabValue = {
  canonicalState: 'prompt',
  conditions: { signal: 'none', online: true, permission: 'undetermined' },
  logIntent: () => {},
  setState: () => {},
  setSignal: () => {},
  setPermission: () => {},
};

const LabContext = createContext<LabValue>(FALLBACK);

export function useLab(): LabValue {
  return useContext(LabContext);
}

export interface LabProviderProps {
  readonly initialState?: CanonicalState;
  /**
   * Управляемое состояние: когда цикл ведёт плеер (как у Duolingo), он передаёт
   * состояние сюда, и провайдер перестаёт быть его владельцем. Без этого пришлось
   * бы синхронизировать два источника правды и ловить рассинхрон.
   */
  readonly state?: CanonicalState;
  readonly onIntent?: (event: LabIntentEvent) => void;
  readonly children: React.ReactNode;
}

export function LabProvider({ initialState = 'prompt', state: controlledState, onIntent, children }: LabProviderProps) {
  const [uncontrolledState, setCanonicalState] = useState<CanonicalState>(initialState);
  const canonicalState = controlledState ?? uncontrolledState;
  const [signal, setSignalState] = useState<LabConditions['signal']>('none');
  const [permission, setPermissionState] = useState<LabConditions['permission']>('undetermined');
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

  const setPermission = useCallback((next: LabConditions['permission']) => {
    setPermissionState(next);
  }, []);

  const value = useMemo<LabValue>(
    () => ({
      canonicalState,
      conditions: { signal, online: true, permission },
      logIntent,
      setState: setCanonicalState,
      setSignal,
      setPermission,
    }),
    [canonicalState, signal, permission, logIntent, setSignal],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}
