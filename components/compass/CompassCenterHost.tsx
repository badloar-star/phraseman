import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import { useLang } from '../LangContext';
import { useStudyTarget } from '../StudyTargetContext';
import { useOverlayOccupied, useOverlayVisible } from '../OverlayArbiter';
import { compassIconSource } from '../../constants/weeklyCompassIcons';
import { hapticTap } from '../../hooks/use-haptics';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { getLocalDayKey } from '../../app/local_date';
import { markCompassAutoOpened, shouldAutoOpenCompass } from '../../app/compass_auto_open';
import { onAppEvent } from '../../app/events';
import { presentCompassRecommendation } from '../../app/compass_presenter';
import { useCompassCenter } from './CompassCenterContext';
import CompassQuickSheet from './CompassQuickSheet';
import CompassSurface from './CompassSurface';

type Props = Readonly<{
  homeActive: boolean;
  triggerBottom: number;
  onVisibilityChange?: (visible: boolean) => void;
}>;

function triggerCopy(lang: string): { title: string; label: string } {
  if (lang === 'uk') return { title: 'Компас', label: 'Відкрити Компас' };
  if (lang === 'es') return { title: 'Compass', label: 'Abrir Compass' };
  if (lang === 'pt-BR') return { title: 'Compass', label: 'Abrir Compass' };
  if (lang === 'vi') return { title: 'Compass', label: 'Mở Compass' };
  if (lang === 'id') return { title: 'Compass', label: 'Buka Compass' };
  if (lang === 'tr') return { title: 'Compass', label: 'Compass’ı aç' };
  if (lang === 'pl') return { title: 'Compass', label: 'Otwórz Compass' };
  return { title: 'Компас', label: 'Открыть Компас' };
}

export default function CompassCenterHost({ homeActive, triggerBottom, onVisibilityChange }: Props) {
  const { theme: t, f, themeMode, ds, isFlat } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const {
    result,
    sheet,
    requestSheet,
    requestClose,
    completeClose,
    refresh,
    launchRecommendation,
  } = useCompassCenter();
  const occupied = useOverlayOccupied();
  const [sheetMounted, setSheetMounted] = useState(false);
  const autoAttemptedRef = useRef(false);
  const autoScopeRef = useRef('');
  const actualVisibleReceiptRef = useRef('');
  const pendingAutoReceiptRef = useRef('');
  const focusHeadingRef = useRef<Text>(null);
  const triggerRef = useRef<View>(null);
  const sheetPhaseRef = useRef(sheet.phase);
  const homeActiveRef = useRef(homeActive);
  const occupiedRef = useRef(occupied);
  const homeContentReadyRef = useRef(false);
  const safeDailyStepRef = useRef(false);
  sheetPhaseRef.current = sheet.phase;
  homeActiveRef.current = homeActive;
  occupiedRef.current = occupied;
  const copy = triggerCopy(lang);
  const recommendation = useMemo(() => (
    result?.status === 'ready'
      ? presentCompassRecommendation(result.recommendation, lang, result.whyNow)
      : null
  ), [result, lang]);
  const hasSafeDailyStep = recommendation !== null;
  const granted = useOverlayVisible('compassBriefing', sheet.phase !== 'idle' && hasSafeDailyStep);
  safeDailyStepRef.current = hasSafeDailyStep;

  useEffect(() => {
    if (homeActive) return;
    if (sheet.phase === 'open') requestClose();
  }, [homeActive, requestClose, sheet.phase]);

  const attemptAutoOpen = useCallback(async () => {
    const token = captureAccountGeneration();
    if (token.phase !== 'active' || !token.stableId) return;
    const localDayKey = getLocalDayKey();
    const scope = `${token.generation}:${String(studyTarget ?? 'en')}:${localDayKey}`;
    if (autoScopeRef.current !== scope) {
      autoScopeRef.current = scope;
      autoAttemptedRef.current = false;
      actualVisibleReceiptRef.current = '';
      pendingAutoReceiptRef.current = '';
    }
    if (!homeContentReadyRef.current || autoAttemptedRef.current || !homeActive || occupied || sheetPhaseRef.current !== 'idle' || !safeDailyStepRef.current) return;
    if (AppState.currentState !== 'active' || Keyboard.isVisible()) return;
    autoAttemptedRef.current = true;
    const eligible = await shouldAutoOpenCompass({
      stableId: token.stableId,
      studyTarget: String(studyTarget ?? 'en'),
      localDayKey,
    });
    if (!eligible || !isCurrentAccountGeneration(token) || AppState.currentState !== 'active' || Keyboard.isVisible()) return;
    if (!homeActiveRef.current || occupiedRef.current || sheetPhaseRef.current !== 'idle') return;
    pendingAutoReceiptRef.current = `${token.generation}:${token.stableId}:${String(studyTarget ?? 'en')}:${localDayKey}`;
    requestSheet('auto');
  }, [homeActive, occupied, requestSheet, studyTarget]);

  useEffect(() => {
    if (!homeActive) {
      homeContentReadyRef.current = false;
      return undefined;
    }
    const refreshThenAttempt = async () => {
      await refresh();
      setTimeout(() => { void attemptAutoOpen(); }, 0);
    };
    const subscription = onAppEvent('app_first_content_ready', () => {
      homeContentReadyRef.current = true;
      void refreshThenAttempt();
    });
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active' && homeContentReadyRef.current) void refreshThenAttempt();
    });
    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [attemptAutoOpen, homeActive, refresh]);

  useEffect(() => {
    if (homeActive && homeContentReadyRef.current && hasSafeDailyStep) void attemptAutoOpen();
  }, [attemptAutoOpen, hasSafeDailyStep, homeActive]);

  useEffect(() => {
    if (!granted || !sheetMounted || sheet.phase !== 'open' || sheet.source !== 'auto') return;
    const token = captureAccountGeneration();
    if (token.phase !== 'active' || !token.stableId) return;
    const localDayKey = getLocalDayKey();
    const pending = `${token.generation}:${token.stableId}:${String(studyTarget ?? 'en')}:${localDayKey}`;
    if (pendingAutoReceiptRef.current !== pending || !hasSafeDailyStep) return;
    const receipt = `${token.generation}:${studyTarget}:${localDayKey}`;
    if (actualVisibleReceiptRef.current === receipt) return;
    actualVisibleReceiptRef.current = receipt;
    void markCompassAutoOpened({
      stableId: token.stableId,
      studyTarget: String(studyTarget ?? 'en'),
      localDayKey,
    });
  }, [granted, hasSafeDailyStep, sheet, sheetMounted, studyTarget]);

  const handleMountedChange = useCallback((mounted: boolean) => {
    setSheetMounted(mounted);
    onVisibilityChange?.(mounted);
  }, [onVisibilityChange]);

  const closeAndRestoreFocus = useCallback(() => {
    requestClose(() => {
      setTimeout(() => {
        if (triggerRef.current) AccessibilityInfo.sendAccessibilityEvent(triggerRef.current, 'focus');
      }, 40);
    });
  }, [requestClose]);

  const openManually = () => {
    if (!hasSafeDailyStep) return;
    hapticTap();
    requestSheet('home_control');
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {homeActive && hasSafeDailyStep && !granted && sheet.phase === 'idle' && !occupied ? (
        <Pressable
          ref={triggerRef}
          testID="compass-home-control"
          accessibilityRole="button"
          accessibilityLabel={copy.label}
          onPress={openManually}
          style={({ pressed }) => [styles.trigger, { bottom: triggerBottom, borderRadius: ds.radius.xxl, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, ds.shadow.medium]}
        >
          <LinearGradient
            colors={isFlat ? [t.bgCard, t.bgCard] : t.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.triggerMaterial, { borderRadius: ds.radius.xxl, borderColor: t.borderHighlight }]}
          >
            <View style={[styles.triggerRail, { backgroundColor: t.accent }]} />
            {isFlat ? (
              <View style={[styles.triggerFlatIcon, { backgroundColor: t.bgSurface2 }]}>
                <Ionicons name="compass-outline" size={25} color={t.accent} />
              </View>
            ) : (
              <Image source={compassIconSource(themeMode)} style={styles.triggerIcon} contentFit="contain" accessible={false} />
            )}
            <View style={styles.triggerCopy}>
              <Text style={[styles.triggerTitle, { color: t.textPrimary, fontSize: f.body }]}>{copy.title}</Text>
            </View>
            <View style={[styles.triggerArrow, { backgroundColor: t.bgSurface2 }]}>
              <Ionicons name="chevron-up" size={18} color={t.textSecond} />
            </View>
          </LinearGradient>
        </Pressable>
      ) : null}

      {recommendation ? <CompassQuickSheet
        granted={granted}
        phase={sheet.phase}
        closeId={sheet.phase === 'closing' ? sheet.closeId : null}
        onRequestClose={closeAndRestoreFocus}
        onClosed={completeClose}
        onMountedChange={handleMountedChange}
        focusTargetRef={focusHeadingRef}
      >
        {(expanded) => (
          <CompassSurface
            presentation={expanded ? 'expanded' : 'compact'}
            active={granted && sheet.phase === 'open'}
            recommendation={recommendation}
            onPrimary={() => {
              hapticTap();
              requestClose(launchRecommendation);
            }}
            headingRef={focusHeadingRef}
          />
        )}
      </CompassQuickSheet> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    alignSelf: 'center',
    width: 226,
    minHeight: 64,
  },
  triggerMaterial: {
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  triggerRail: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  triggerIcon: { width: 44, height: 44 },
  triggerFlatIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  triggerCopy: { minWidth: 0, flexShrink: 1 },
  triggerTitle: { fontWeight: '900', letterSpacing: -0.2 },
  triggerArrow: { marginLeft: 'auto', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
