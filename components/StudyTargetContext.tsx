import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { ENABLE_DEV_STUDY_TARGET_LANG } from '../app/config';
import {
  DEV_STUDY_TARGET_CHANGED,
  getDevStudyTargetLang,
  type StudyTargetLang,
} from '../app/study_target_lang_dev';
import { useLang } from './LangContext';

type Ctx = {
  studyTarget: StudyTargetLang;
  refresh: () => Promise<void>;
};

const StudyTargetContext = createContext<Ctx>({
  studyTarget: 'en',
  refresh: async () => {},
});

export function StudyTargetProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [studyTarget, setStudyTarget] = useState<StudyTargetLang>('en');

  const refresh = useCallback(async () => {
    setStudyTarget(await getDevStudyTargetLang(lang));
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

  const value = useMemo(() => ({ studyTarget, refresh }), [studyTarget, refresh]);
  return <StudyTargetContext.Provider value={value}>{children}</StudyTargetContext.Provider>;
}

export function useStudyTarget(): Ctx {
  return useContext(StudyTargetContext);
}
