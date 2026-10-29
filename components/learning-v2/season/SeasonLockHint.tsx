// ════════════════════════════════════════════════════════════════════════════
// SeasonLockHint.tsx — плашка «Откроется после занятия N» на тапе по закрытой карте курса (+ «Не хочу с начала», пока тест не использован).
//
// зачем (жалоба №8; владелец 29.10, макет VCtfXrJuZn37rcsTvnLDMm одобрен): немое покачивание замка не объясняло, что делать, и платный
// человек уровня B1 оставался в уроке 1. Замок 22.10 не меняется: вибрация + тряска замка, окна нет — плашка не модальная, внизу над
// таб-баром. Вид — тост-плашка списка уроков (lessons.tsx: opaqueControl, r18, поля 20/12, текст 16/21 700, тень плашки без кромки);
// кнопка под текстом — тональная (12 % цвета текста), 44, r22, значок school-outline 18. С кнопкой — 4 с или до любого тапа
// (касание вне плашки ловит родитель); без кнопки (тест использован / урок ≥ 10) — только текст, 2,2 с.
// Движение (макет): появление 240/260 мс cubic-bezier(.23,1,.32,1), сдвиг 10 dp; уход 200 мс; уменьшенное движение — сразу.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import V2Pressable from '../../v2/V2Pressable';
import { plateBoxShadow } from '../../v2/ShadowSurface';
import { noAndroidOutline } from '../../../constants/androidGlow';
import { useLv2Glass, lv2Alpha } from '../LearningV2Glass';

const LOG = '[PLACEMENT-ENTRY]';
/** Сколько живёт плашка: с кнопкой — дольше (её надо успеть нажать), без кнопки — как прежняя тост-плашка списка. */
export const SEASON_LOCK_HINT_WITH_BUTTON_MS = 4_000;
export const SEASON_LOCK_HINT_TEXT_ONLY_MS = 2_200;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SHIFT = 10;

export type SeasonLockHintRequest = Readonly<{ seq: number; text: string; withButton: boolean }>;
export type SeasonLockHintFrame = { x: number; y: number; width: number; height: number };

type Props = Readonly<{
  request: SeasonLockHintRequest | null;
  /** Родитель увеличивает — плашка уходит (тап вне плашки). */
  dismissSeq: number;
  buttonLabel: string;
  onButton: () => void;
  bottom: number;
  reducedMotion: boolean;
  /** Рамка плашки в окне — родителю, чтобы касание по самой плашке её не прятало. */
  frameRef: React.MutableRefObject<SeasonLockHintFrame | null>;
}>;

function SeasonLockHint({ request, dismissSeq, buttonLabel, onButton, bottom, reducedMotion, frameRef }: Props) {
  const g = useLv2Glass();
  const [shown, setShown] = useState<SeasonLockHintRequest | null>(null);
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef(0);
  const viewRef = useRef<View>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const unmount = useCallback(() => {
    setShown(null);
    frameRef.current = null;
  }, [frameRef]);

  const hide = useCallback((reason: 'timeout' | 'tap_outside' | 'button') => {
    clearTimer();
    console.log(`${LOG} плашка ушла`, JSON.stringify({ reason, visibleMs: shownAt.current ? Date.now() - shownAt.current : null })); // guard-ok: почему плашка ушла
    progress.value = withTiming(0, { duration: reducedMotion ? 1 : 200, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(unmount)();
    });
  }, [clearTimer, progress, reducedMotion, unmount]);

  useEffect(() => {
    if (!request) return;
    clearTimer();
    shownAt.current = Date.now();
    setShown(request);
    progress.value = 0;
    progress.value = withTiming(1, { duration: reducedMotion ? 1 : 260, easing: EASE_OUT });
    timer.current = setTimeout(() => hide('timeout'), request.withButton ? SEASON_LOCK_HINT_WITH_BUTTON_MS : SEASON_LOCK_HINT_TEXT_ONLY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: новая плашка только по новому seq запроса
  }, [request?.seq]);

  useEffect(() => {
    if (dismissSeq === 0 || !shown) return;
    hide('tap_outside');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: уход только по сигналу родителя
  }, [dismissSeq]);

  useEffect(() => clearTimer, [clearTimer]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * SHIFT }],
  }));

  const onLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x, y, width, height) => { frameRef.current = { x, y, width, height }; });
  }, [frameRef]);

  const press = useCallback(() => {
    hide('button');
    onButton();
  }, [hide, onButton]);

  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { bottom }, animStyle]}
      testID="season-lock-hint"
    >
      <View
        ref={viewRef}
        onLayout={onLayout}
        style={[styles.plate, { backgroundColor: g.opaqueControl, boxShadow: plateBoxShadow(g) }, noAndroidOutline]}
      >
        <Text style={[styles.text, { color: g.text }]}>{shown.text}</Text>
        {shown.withButton ? (
          <V2Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            onPress={press}
            style={[styles.button, { backgroundColor: lv2Alpha(g.text, 0.12) }]}
            testID="season-lock-hint-not-from-start"
          >
            <Ionicons name="school-outline" size={18} color={g.text} />
            <Text style={[styles.buttonText, { color: g.text }]} numberOfLines={1}>{buttonLabel}</Text>
          </V2Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // макет: плашка во всю ширину между полями 24 (а не по ширине текста), текст и кнопка — по центру
  wrap: { position: 'absolute', left: 24, right: 24, zIndex: 40 },
  plate: { borderRadius: 18, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  text: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  button: { marginTop: 10, height: 44, paddingHorizontal: 20, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonText: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
});

export default memo(SeasonLockHint);
