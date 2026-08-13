import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { tabSwipeLocked } from '../../app/tabSwipeLock';
import { hapticTap } from '../../hooks/use-haptics';
import {
  canAcknowledgeCompassVisualClose,
  compassCompactScrollSpacer,
  resolveCompassSurfaceRelease,
} from '../../app/compass_surface_model';

type Props = Readonly<{
  granted: boolean;
  phase: 'idle' | 'open' | 'closing';
  closeId: number | null;
  onRequestClose: () => void;
  onClosed: (closeId: number) => void;
  onMountedChange?: (mounted: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
  focusTargetRef: React.RefObject<Text | null>;
  children: (expanded: boolean, expand: () => void) => React.ReactNode;
}>;

const COMPACT_VISIBLE_HEIGHT = 520;
const TOP_GAP = 10;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export default function CompassQuickSheet({
  granted,
  phase,
  closeId,
  onRequestClose,
  onClosed,
  onMountedChange,
  onExpandedChange,
  focusTargetRef,
  children,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(granted && phase !== 'idle');
  const closeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentedRef = useRef(false);
  const closingIdRef = useRef<number | null>(null);
  const acknowledgedCloseIdRef = useRef<number | null>(null);
  const expandedY = Math.max(TOP_GAP, insets.top + TOP_GAP);
  const compactY = Math.max(expandedY + 120, height - Math.min(COMPACT_VISIBLE_HEIGHT, height * 0.56));
  const hiddenY = height + 36;
  const translateY = useSharedValue(hiddenY);
  const dragOrigin = useSharedValue(compactY);
  const backdrop = useSharedValue(0);
  const phaseRef = useRef(phase);
  const closeIdRef = useRef(closeId);
  const geometryRef = useRef({ expandedY, compactY, hiddenY });
  phaseRef.current = phase;
  closeIdRef.current = closeId;
  const labels = useMemo(() => ({
    close: lang === 'uk' ? 'Закрити Компас' : lang === 'es' ? 'Cerrar Compass' : lang === 'pt-BR' ? 'Fechar Compass' : lang === 'vi' ? 'Đóng Compass' : lang === 'id' ? 'Tutup Compass' : lang === 'tr' ? 'Compass’ı kapat' : lang === 'pl' ? 'Zamknij Compass' : 'Закрыть Компас',
    expand: lang === 'uk' ? 'Розгорнути' : lang === 'es' ? 'Ampliar' : lang === 'pt-BR' ? 'Expandir' : lang === 'vi' ? 'Mở rộng' : lang === 'id' ? 'Perluas' : lang === 'tr' ? 'Genişlet' : lang === 'pl' ? 'Rozwiń' : 'Развернуть',
    collapse: lang === 'uk' ? 'Згорнути' : lang === 'es' ? 'Contraer' : lang === 'pt-BR' ? 'Recolher' : lang === 'vi' ? 'Thu gọn' : lang === 'id' ? 'Ciutkan' : lang === 'tr' ? 'Daralt' : lang === 'pl' ? 'Zwiń' : 'Свернуть',
  }), [lang]);

  const commitExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    onExpandedChange?.(next);
  }, [onExpandedChange]);

  useEffect(() => () => {
    cancelAnimation(translateY);
    cancelAnimation(backdrop);
    if (closeFallbackRef.current) clearTimeout(closeFallbackRef.current);
  }, [backdrop, translateY]);

  useEffect(() => {
    tabSwipeLocked.value = mounted;
    return () => { tabSwipeLocked.value = false; };
  }, [mounted]);

  useEffect(() => {
    onMountedChange?.(mounted);
    return () => onMountedChange?.(false);
  }, [mounted, onMountedChange]);

  const acknowledgeClose = useCallback((id: number) => {
    if (!canAcknowledgeCompassVisualClose({ phase: phaseRef.current, closeId: closeIdRef.current }, id)) return;
    if (acknowledgedCloseIdRef.current === id) return;
    acknowledgedCloseIdRef.current = id;
    closingIdRef.current = null;
    if (closeFallbackRef.current) {
      clearTimeout(closeFallbackRef.current);
      closeFallbackRef.current = null;
    }
    cancelAnimation(translateY);
    cancelAnimation(backdrop);
    translateY.value = hiddenY;
    backdrop.value = 0;
    presentedRef.current = false;
    setMounted(false);
    commitExpanded(false);
    onClosed(id);
  }, [backdrop, commitExpanded, hiddenY, onClosed, translateY]);

  useEffect(() => {
    if (phase === 'idle') {
      if (closeFallbackRef.current) {
        clearTimeout(closeFallbackRef.current);
        closeFallbackRef.current = null;
      }
      cancelAnimation(translateY);
      cancelAnimation(backdrop);
      translateY.value = hiddenY;
      backdrop.value = 0;
      presentedRef.current = false;
      closingIdRef.current = null;
      setMounted(false);
      commitExpanded(false);
      return undefined;
    }

    if (phase === 'open') {
      if (closeFallbackRef.current) {
        clearTimeout(closeFallbackRef.current);
        closeFallbackRef.current = null;
      }
      if (closingIdRef.current != null) {
        cancelAnimation(translateY);
        cancelAnimation(backdrop);
        closingIdRef.current = null;
        presentedRef.current = false;
      }
      if (!granted) {
        cancelAnimation(translateY);
        cancelAnimation(backdrop);
        translateY.value = hiddenY;
        backdrop.value = 0;
        presentedRef.current = false;
        setMounted(false);
        commitExpanded(false);
        return undefined;
      }
      if (presentedRef.current) return undefined;
      presentedRef.current = true;
      acknowledgedCloseIdRef.current = null;
      setMounted(true);
      commitExpanded(false);
      dragOrigin.value = compactY;
      translateY.value = hiddenY;
      backdrop.value = 0;
      if (reducedMotion) {
        translateY.value = compactY;
        backdrop.value = 1;
      } else {
        translateY.value = withSpring(compactY, { damping: 24, stiffness: 220, mass: 0.72 });
        backdrop.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
      return undefined;
    }

    if (closeId == null || acknowledgedCloseIdRef.current === closeId) return undefined;
    if (!granted || !mounted || reducedMotion) {
      acknowledgeClose(closeId);
      return undefined;
    }
    if (closingIdRef.current === closeId) return undefined;
    closingIdRef.current = closeId;
    backdrop.value = withTiming(0, { duration: 180 });
    closeFallbackRef.current = setTimeout(() => acknowledgeClose(closeId), 340);
    translateY.value = withTiming(hiddenY, { duration: 280, easing: Easing.in(Easing.cubic) }, finished => {
      if (finished) runOnJS(acknowledgeClose)(closeId);
    });
    return undefined;
  }, [acknowledgeClose, backdrop, closeId, commitExpanded, compactY, dragOrigin, focusTargetRef, granted, hiddenY, mounted, phase, reducedMotion, translateY]);

  useEffect(() => {
    if (!mounted || !granted || phase !== 'open') return undefined;
    const focusTimer = setTimeout(() => {
      if (focusTargetRef.current) AccessibilityInfo.sendAccessibilityEvent(focusTargetRef.current, 'focus');
    }, reducedMotion ? 40 : 360);
    return () => clearTimeout(focusTimer);
  }, [focusTargetRef, granted, mounted, phase, reducedMotion]);

  useEffect(() => {
    const previous = geometryRef.current;
    geometryRef.current = { expandedY, compactY, hiddenY };
    const changed = previous.expandedY !== expandedY
      || previous.compactY !== compactY
      || previous.hiddenY !== hiddenY;
    if (!changed || !mounted) return;

    cancelAnimation(translateY);
    if (phase === 'open' && granted) {
      const destination = expanded ? expandedY : compactY;
      dragOrigin.value = destination;
      translateY.value = reducedMotion
        ? destination
        : withTiming(destination, { duration: 180, easing: Easing.out(Easing.cubic) });
      return;
    }

    if (phase === 'closing' && closeId != null) {
      backdrop.value = 0;
      if (reducedMotion) {
        translateY.value = hiddenY;
        acknowledgeClose(closeId);
      } else {
        translateY.value = withTiming(hiddenY, { duration: 180, easing: Easing.in(Easing.cubic) }, finished => {
          if (finished) runOnJS(acknowledgeClose)(closeId);
        });
      }
      return;
    }

    translateY.value = hiddenY;
  }, [acknowledgeClose, backdrop, closeId, compactY, dragOrigin, expanded, expandedY, granted, hiddenY, mounted, phase, reducedMotion, translateY]);

  const snapTo = useCallback((nextExpanded: boolean) => {
    hapticTap();
    const destination = nextExpanded ? expandedY : compactY;
    commitExpanded(nextExpanded);
    dragOrigin.value = destination;
    translateY.value = reducedMotion
      ? destination
      : withSpring(destination, { damping: 25, stiffness: 250, mass: 0.66 });
    backdrop.value = reducedMotion ? 1 : withTiming(1, { duration: 180 });
  }, [backdrop, commitExpanded, compactY, dragOrigin, expandedY, reducedMotion, translateY]);

  useEffect(() => {
    if (!granted || phase !== 'open') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expanded) {
        snapTo(false);
      } else {
        onRequestClose();
      }
      return true;
    });
    return () => sub.remove();
  }, [expanded, granted, onRequestClose, phase, snapTo]);

  const gesture = useMemo(() => Gesture.Pan()
    .enabled(phase === 'open')
    .activeOffsetY([-12, 12])
    .failOffsetX([-22, 22])
    .onBegin(() => {
      'worklet';
      cancelAnimation(translateY);
      dragOrigin.value = translateY.value;
    })
    .onUpdate(event => {
      'worklet';
      translateY.value = clamp(dragOrigin.value + event.translationY, expandedY, hiddenY);
      backdrop.value = 1 - Math.min(0.82, Math.max(0, translateY.value - compactY) / Math.max(1, hiddenY - compactY));
    })
    .onEnd(event => {
      'worklet';
      const destination = resolveCompassSurfaceRelease({
        translateY: translateY.value,
        velocityY: event.velocityY,
        expandedY,
        compactY,
      });
      if (destination === 'closed') {
        runOnJS(onRequestClose)();
        return;
      }
      runOnJS(snapTo)(destination === 'expanded');
    }), [backdrop, compactY, dragOrigin, expandedY, hiddenY, onRequestClose, phase, snapTo, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    borderTopLeftRadius: interpolate(translateY.value, [expandedY, compactY], [0, 28], Extrapolation.CLAMP),
    borderTopRightRadius: interpolate(translateY.value, [expandedY, compactY], [0, 28], Extrapolation.CLAMP),
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.64 }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={phase === 'open' ? 'box-none' : 'none'} testID="compass-quick-sheet-host">
      <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessible={false} importantForAccessibility="no">
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>
      <Animated.View
        accessibilityViewIsModal
        accessibilityElementsHidden={phase === 'closing'}
        importantForAccessibility={phase === 'closing' ? 'no-hide-descendants' : 'auto'}
        onAccessibilityEscape={expanded ? () => snapTo(false) : onRequestClose}
        style={[
          styles.sheet,
          {
            height: Math.max(480, height - expandedY),
            top: 0,
            backgroundColor: t.bgCard,
            shadowColor: t.shadowDark,
          },
          sheetStyle,
        ]}
      >
        <GestureDetector gesture={gesture}>
          <View style={styles.handleZone} testID="compass-sheet-handle">
            <View style={styles.handleSpacer} />
            <View style={[styles.handle, { backgroundColor: t.textGhost }]} />
            <View style={styles.handleActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={expanded ? labels.collapse : labels.expand}
                accessibilityState={{ expanded }}
                onPress={() => snapTo(!expanded)}
                style={({ pressed }) => [styles.handleButton, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.65 : 1 }]}
              >
                <Ionicons name={expanded ? 'contract-outline' : 'expand-outline'} size={18} color={t.textSecond} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={labels.close}
                onPress={onRequestClose}
                style={({ pressed }) => [styles.handleButton, { backgroundColor: t.bgSurface2, opacity: pressed ? 0.65 : 1 }]}
              >
                <Ionicons name="close" size={19} color={t.textSecond} />
              </Pressable>
            </View>
          </View>
        </GestureDetector>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(28, insets.bottom + 20)
                + compassCompactScrollSpacer(expanded, expandedY, compactY),
            },
          ]}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          bounces={expanded}
        >
          {children(expanded, () => snapTo(true))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 28,
  },
  handleZone: { minHeight: 54, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  handleSpacer: { width: 92 },
  handle: { width: 46, height: 5, borderRadius: 3, opacity: 0.66 },
  handleActions: { width: 92, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  handleButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
});
