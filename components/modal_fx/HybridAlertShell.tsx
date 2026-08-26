// ════════════════════════════════════════════════════════════════════════════
// HybridAlertShell.tsx — общий гибрид-шелл семьи «Алерты и формы» (M1 «Алерт-
// выбор» из .motion-mockups/phraseman-hybrid.html). База — Световод: панель
// выходит из света (opacity 380 + scale 1.04→1, settle БЕЗ отскока), кнопки
// каскадом по LUM.ladder, деструктивные действия — одна дрожь TOAST.errorShakePx
// на подтверждении. Выход всегда короче входа (закон №15: LUM.exitMs).
//
// зачем: владелец утвердил (2026-08-15), что база всех модалок-алертов сейчас —
// голый нативный fade (ThemedChoiceModal/ThemedConfirmModal). Этот шелл — ОДНА
// точка правды для гибрид-варианта, вместо копирования анимации в 27 модалок.
// Подключение — через motionVariant?: 'classic'|'hybrid' (default 'classic'),
// боевое поведение не меняется, пока проп явно не передан.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { noAndroidOutline } from '../../constants/androidGlow';
import { LUM } from '../../constants/motionHybrid';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** Тень/скругление панели — эталон DESIGN.md (16, направленная чёрная тень). */
  shadowColor?: string;
  testID?: string;
  /** Затемнение фона — совпадает с классическим путём модалки-хозяина. */
  backdropColor?: string;
  /** Блокирующие решения закрываются только явной кнопкой внутри панели. */
  dismissible?: boolean;
};

/**
 * Панель выходит из света: opacity 0→1 (LUM.resolveMs) + scale 1.04→1
 * (LUM.settle, без отскока), задержка LUM.ladder[1] — свет загорается первым.
 * Экспортирует shared values ребёнку не нужно: контент кладём внутрь как
 * children, кнопки-caller сами каскадируют через delay-пропы (см. использование
 * в ThemedChoiceModal/ThemedConfirmModal).
 */
function HybridAlertShell({
  visible,
  onRequestClose,
  children,
  shadowColor = 'rgba(0,0,0,0.5)',
  testID,
  backdropColor = 'rgba(0,0,0,0.60)',
  dismissible = true,
}: Props) {
  const reduceMotion = useReduceMotion();
  const backdropOpacity = useSharedValue(0);
  const panelOpacity = useSharedValue(0);
  const panelScale = useSharedValue(1.04);
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitCompletedRef = useRef(false);

  const completeExit = useCallback(() => {
    if (exitCompletedRef.current) return;
    exitCompletedRef.current = true;
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    onRequestCloseRef.current();
  }, []);

  useEffect(() => {
    if (!visible) {
      exitCompletedRef.current = true;
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      backdropOpacity.value = 0;
      panelOpacity.value = 0;
      panelScale.value = 1.04;
      return;
    }
    exitCompletedRef.current = false;
    if (reduceMotion) {
      // Reduce Motion = один кадр (закон движения проекта): без промежуточных
      // состояний, сразу конечная геометрия.
      backdropOpacity.value = 1;
      panelOpacity.value = 1;
      panelScale.value = 1;
      return;
    }
    backdropOpacity.value = withTiming(1, { duration: LUM.backdropMs, easing: Easing.out(Easing.cubic) });
    panelOpacity.value = withDelay(
      LUM.ladder[1],
      withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }),
    );
    panelScale.value = withDelay(LUM.ladder[1], withSpring(1, LUM.settle));
    return () => {
      cancelAnimation(backdropOpacity);
      cancelAnimation(panelOpacity);
      cancelAnimation(panelScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  }, []);

  const runExit = useCallback(() => {
    if (exitCompletedRef.current) return;
    if (reduceMotion) {
      completeExit();
      return;
    }
    backdropOpacity.value = withTiming(0, { duration: LUM.exitMs, easing: Easing.out(Easing.cubic) });
    panelOpacity.value = withTiming(0, { duration: LUM.exitMs, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(completeExit)();
    });
    panelScale.value = withTiming(0.97, { duration: LUM.exitMs, easing: Easing.out(Easing.cubic) });
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(completeExit, LUM.exitMs + 80);
  }, [backdropOpacity, completeExit, panelOpacity, panelScale, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }));
  const ignoreDismiss = useCallback(() => {}, []);
  const dismissHandler = dismissible ? runExit : ignoreDismiss;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismissHandler}>
      {/* guard-ok: скрим-фон закрывает модалку по тапу вовне, у него нет своего
          смысла для VoiceOver/TalkBack — озвучиваемые элементы (заголовок,
          кнопки) идут внутри children панели. */}
      <Pressable
        testID={testID}
        style={StyleSheet.absoluteFillObject}
        onPress={dismissible ? runExit : undefined}
        accessible={false}
      >
        <Reanimated.View style={[styles.backdrop, { backgroundColor: backdropColor }, backdropStyle]} />
        <View style={styles.center} pointerEvents="box-none">
          {/* guard-ok: чисто структурная обёртка, гасит всплытие тапа до скрима —
              её единственная роль такая же декоративная, как у самого скрима. */}
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.pressableWrap}>
            <Reanimated.View style={[styles.panel, { shadowColor }, panelStyle, noAndroidOutline]}>
              {visible ? children : null}
            </Reanimated.View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export default memo(HybridAlertShell);

/** Один узел каскада: opacity 0→1 + translateY 6→0, задержка из LUM.ladder.
 * зачем: общий кусок вынесен сюда, чтобы каждая из 6+ модалок семьи не
 * копировала одну и ту же реализацию (было продублировано в ThemedChoiceModal
 * до выноса — см. историю правок). Один источник правды на каскад-анимацию. */
export function CascadeItem({ delay, reduceMotion, children }: { delay: number; reduceMotion: boolean; children: React.ReactNode }) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const y = useSharedValue(reduceMotion ? 0 : 6);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    y.value = withDelay(delay, withTiming(0, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Reanimated.View style={style}>{children}</Reanimated.View>;
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pressableWrap: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '100%',
  },
  panel: {
    width: '100%',
    maxHeight: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
});
