import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import {
  DEFAULT_STUDY_TARGET,
  getStoredStudyTarget,
  isProductionStudyTarget,
  STUDY_TARGET_CHANGED,
  type StudyTarget,
} from '../app/study_target';
import { peekStudyTargetRaw, writePeekStudyTargetRaw } from '../app/app_snapshot_bootstrap';
import { useLang, type Lang } from './LangContext';

type Ctx = {
  studyTarget: StudyTarget;
  refresh: () => Promise<void>;
};

const StudyTargetContext = createContext<Ctx>({
  studyTarget: 'en',
  refresh: async () => {},
});

// B3 (PERF_MASTER_PLAN): синхронно используем последний известный канонический
// target, чтобы первый кадр не мигал английским перед гидратацией хранилища.
function initialStudyTargetFromPeek(_uiLang: Lang): StudyTarget {
  const raw = peekStudyTargetRaw();
  return isProductionStudyTarget(raw) ? raw : DEFAULT_STUDY_TARGET;
}

export function StudyTargetProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [studyTarget, setStudyTarget] = useState<StudyTarget>(() => initialStudyTargetFromPeek(lang));

  const refresh = useCallback(async () => {
    const stored = await getStoredStudyTarget(lang);
    writePeekStudyTargetRaw(stored);
    setStudyTarget(stored);
  }, [lang]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(STUDY_TARGET_CHANGED, () => {
      void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(() => ({ studyTarget, refresh }), [studyTarget, refresh]);
  return <StudyTargetContext.Provider value={value}>{children}</StudyTargetContext.Provider>;
}

export function useStudyTarget(): Ctx {
  return useContext(StudyTargetContext);
}
