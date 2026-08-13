import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useLang } from '../LangContext';
import { useStudyTarget } from '../StudyTargetContext';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
} from '../../app/account_generation';
import {
  resolveCompassAction,
} from '../../app/compass_recommendation';
import {
  loadCompassRecommendation,
  type LoadedCompassRecommendationResult,
} from '../../app/compass_recommendation_loader';
import {
  IDLE_COMPASS_SHEET,
  beginCompassSheetClose,
  completeCompassSheetClose,
  openCompassSheet,
  type CompassSheetLifecycle,
  type CompassSheetSource,
} from '../../app/compass_sheet_lifecycle';

type ContextValue = Readonly<{
  result: LoadedCompassRecommendationResult | null;
  sheet: CompassSheetLifecycle;
  requestSheet: (source: CompassSheetSource) => void;
  requestClose: (afterClosed?: () => void) => void;
  completeClose: (closeId: number) => void;
  abortSheet: () => void;
  refresh: () => Promise<void>;
  launchRecommendation: () => void;
}>;

const CompassCenterContext = createContext<ContextValue | null>(null);

export function CompassCenterProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const router = useRouter();
  const [result, setResult] = useState<LoadedCompassRecommendationResult | null>(null);
  const [sheet, setSheet] = useState<CompassSheetLifecycle>(IDLE_COMPASS_SHEET);
  const sheetRef = useRef<CompassSheetLifecycle>(sheet);
  const closeSequenceRef = useRef(0);
  const afterCloseRef = useRef<Readonly<{ closeId: number; callback: (() => void) | null }> | null>(null);
  const [completedClose, setCompletedClose] = useState<Readonly<{ closeId: number; callback: (() => void) | null }> | null>(null);
  const loadEpochRef = useRef(0);
  const resultOwnerRef = useRef<ReturnType<typeof captureAccountGeneration> | null>(null);
  const discardResultAfterCloseRef = useRef(false);

  const commitSheet = useCallback((next: CompassSheetLifecycle) => {
    sheetRef.current = next;
    setSheet(next);
  }, []);

  const abortSheet = useCallback(() => {
    closeSequenceRef.current += 1;
    afterCloseRef.current = null;
    setCompletedClose(null);
    discardResultAfterCloseRef.current = false;
    commitSheet(IDLE_COMPASS_SHEET);
  }, [commitSheet]);

  const retireReadyPresentation = useCallback(() => {
    const current = sheetRef.current;
    if (current.phase === 'open') {
      const closeId = ++closeSequenceRef.current;
      discardResultAfterCloseRef.current = true;
      afterCloseRef.current = { closeId, callback: null };
      commitSheet(beginCompassSheetClose(current, closeId));
      return;
    }
    if (current.phase === 'closing') {
      discardResultAfterCloseRef.current = true;
      afterCloseRef.current = { closeId: current.closeId, callback: null };
      return;
    }
    setResult(null);
    resultOwnerRef.current = null;
  }, [commitSheet]);

  const refresh = useCallback(async () => {
    const loadEpoch = ++loadEpochRef.current;
    const accountToken = captureAccountGeneration();
    if (accountToken.phase !== 'active') {
      setResult(null);
      resultOwnerRef.current = null;
      return;
    }
    try {
      const next = await loadCompassRecommendation({
        lang,
        studyTarget,
        sourceLocale: lang,
      });
      if (loadEpoch !== loadEpochRef.current || !isCurrentAccountGeneration(accountToken)) return;
      if (next.status === 'ready') {
        discardResultAfterCloseRef.current = false;
        setResult(next);
        resultOwnerRef.current = accountToken;
      } else {
        retireReadyPresentation();
      }
    } catch {
      if (loadEpoch !== loadEpochRef.current || !isCurrentAccountGeneration(accountToken)) return;
      retireReadyPresentation();
    }
  }, [lang, retireReadyPresentation, studyTarget]);

  useEffect(() => {
    loadEpochRef.current += 1;
    setResult(null);
    resultOwnerRef.current = null;
    abortSheet();
    void refresh();
  }, [abortSheet, refresh]);

  useEffect(() => {
    const subscription = subscribeAccountGeneration((token) => {
      loadEpochRef.current += 1;
      setResult(null);
      resultOwnerRef.current = null;
      abortSheet();
      if (token.phase === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [abortSheet, refresh]);

  const requestSheet = useCallback((source: CompassSheetSource) => {
    const owner = resultOwnerRef.current;
    if (result?.status !== 'ready' || !owner || !isCurrentAccountGeneration(owner)) {
      void refresh();
      return;
    }
    closeSequenceRef.current += 1;
    discardResultAfterCloseRef.current = false;
    afterCloseRef.current = null;
    setCompletedClose(null);
    commitSheet(openCompassSheet(source));
  }, [commitSheet, refresh, result]);

  const requestClose = useCallback((afterClosed?: () => void) => {
    const current = sheetRef.current;
    if (current.phase !== 'open') return;
    const closeId = ++closeSequenceRef.current;
    afterCloseRef.current = { closeId, callback: afterClosed ?? null };
    commitSheet(beginCompassSheetClose(current, closeId));
  }, [commitSheet]);

  const completeClose = useCallback((closeId: number) => {
    const current = sheetRef.current;
    const completionResult = completeCompassSheetClose(current, closeId);
    if (!completionResult.accepted) return;
    const completion = afterCloseRef.current?.closeId === closeId
      ? afterCloseRef.current
      : { closeId, callback: null };
    afterCloseRef.current = null;
    commitSheet(completionResult.next);
    if (discardResultAfterCloseRef.current) {
      discardResultAfterCloseRef.current = false;
      setResult(null);
      resultOwnerRef.current = null;
    }
    setCompletedClose(completion);
  }, [commitSheet]);

  useEffect(() => {
    if (!completedClose || sheet.phase !== 'idle') return;
    setCompletedClose(null);
    completedClose.callback?.();
  }, [completedClose, sheet.phase]);

  const launchRecommendation = useCallback(() => {
    const owner = resultOwnerRef.current;
    if (!owner || !isCurrentAccountGeneration(owner)) return;
    if (result?.status !== 'ready') return;
    const route = resolveCompassAction(result.recommendation.action);
    if (!route) return;
    if (!isCurrentAccountGeneration(owner)) return;
    router.push(route as never);
  }, [result, router]);

  const value = useMemo<ContextValue>(() => ({
    result,
    sheet,
    requestSheet,
    requestClose,
    completeClose,
    abortSheet,
    refresh,
    launchRecommendation,
  }), [abortSheet, completeClose, launchRecommendation, refresh, requestClose, requestSheet, result, sheet]);

  return <CompassCenterContext.Provider value={value}>{children}</CompassCenterContext.Provider>;
}

export function useCompassCenter(): ContextValue {
  const value = useContext(CompassCenterContext);
  if (!value) throw new Error('useCompassCenter must be used inside CompassCenterProvider');
  return value;
}

export default function __RouteShim() { return null; }
