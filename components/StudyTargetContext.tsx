import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { ENABLE_DEV_STUDY_TARGET_LANG } from '../app/config';
import {
  DEV_STUDY_TARGET_CHANGED,
  getDevStudyTargetLang,
  type StudyTargetLang,
} from '../app/study_target_lang_dev';
import {
  DEFAULT_STUDY_TARGET,
  getStoredStudyTarget,
  isProductionStudyTarget,
  isStudyTargetSourceLocale,
  STUDY_TARGET_CHANGED,
} from '../app/study_target';
import { peekStudyTargetRaw, writePeekStudyTargetRaw } from '../app/app_snapshot_bootstrap';
import { useLang, type Lang } from './LangContext';

type Ctx = {
  studyTarget: StudyTargetLang;
  refresh: () => Promise<void>;
};

const StudyTargetContext = createContext<Ctx>({
  studyTarget: 'en',
  refresh: async () => {},
});

// B3 (PERF_MASTER_PLAN): peek последнего известного 'study_target_v1' из
// app_snapshot_bootstrap.ts (см. peekStudyTargetRaw/writePeekStudyTargetRaw).
// Production target теперь один — английский; dev-испанский по-прежнему
// поднимается только через refresh() и не попадает в production snapshot.
function initialStudyTargetFromPeek(uiLang: Lang): StudyTargetLang {
  if (!isStudyTargetSourceLocale(uiLang)) return DEFAULT_STUDY_TARGET;
  const raw = peekStudyTargetRaw();
  return isProductionStudyTarget(raw) ? raw : DEFAULT_STUDY_TARGET;
}

export function StudyTargetProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [studyTarget, setStudyTarget] = useState<StudyTargetLang>(() => initialStudyTargetFromPeek(lang));

  const refresh = useCallback(async () => {
    if (ENABLE_DEV_STUDY_TARGET_LANG) {
      const devTarget = await getDevStudyTargetLang(lang);
      if (devTarget === 'es') {
        setStudyTarget('es');
        return;
      }
    }
    const stored = await getStoredStudyTarget(lang);
    writePeekStudyTargetRaw(stored);
    setStudyTarget(stored);
  }, [lang]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!ENABLE_DEV_STUDY_TARGET_LANG) return;
    const sub = DeviceEventEmitter.addListener(DEV_STUDY_TARGET_CHANGED, () => {
      void refresh();
    });
    return () => sub.remove();
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
