/**
 * Режим «Говорить» (раздел «Карточки») — большая круглая кнопка «зажми и говори».
 *
 * зачем (владелец, 2026-08-17): «в отработке есть блиц и слушать — надо ещё речь».
 * Это тот же приём, что у кнопки «Устно» в уроках/тренажёре (`SpeakingButton`
 * с `inlineHold`): удержание — запись, отпускание — оценка. Но здесь кнопка —
 * главный элемент экрана (как ⏯ у слушания), поэтому она круглая, крупная и
 * живёт в транспортном ряду, а не пилюлей у поля ответа.
 *
 * Премиум-гейт тот же, что у всех речевых поверхностей: `useFeatureAccess('speaking')`;
 * без доступа тап ведёт на пейвол с контекстом 'speaking', а у кнопки — бейдж Plus.
 * Хост владеет состоянием удержания (`onHoldStart`/`onHoldEnd`) и сам монтирует
 * `SpeakingPanel presentation="inline"` — как трейнер фраз.
 *
 * Движение: пружина на нажатие (scale) + мягкое «дыхание» тона пока идёт запись —
 * без вечных циклов (withRepeat -1 запрещён перф-контрактом), только timing на
 * смену состояния.
 */
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useFeatureAccess } from '../../components/PremiumContext';
import PlusBadge from '../../components/PlusBadge';
import { useTheme } from '../../components/ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';

const PRESS_SPRING = { damping: 16, stiffness: 320, mass: 0.6 } as const;
export const SPEAK_HOLD_BUTTON_SIZE = 76;
const HALO_SIZE = SPEAK_HOLD_BUTTON_SIZE + 22;
/** Высота подписи под кругом (marginTop 4 + height 18) — соседи в транспортном
 *  ряду используют это, чтобы выровнять свои круги по низу HALO_SIZE, а не по
 *  низу всего компонента (круг+подпись). */
export const SPEAK_HOLD_LABEL_HEIGHT = 22;

export type SpeakHoldButtonProps = {
  accent: string;
  /** Идёт запись — кнопка «горит» ярче и растёт ореол. */
  listening: boolean;
  /** Кнопка недоступна (нет карточки / показываем результат сессии). */
  disabled?: boolean;
  reduceMotion?: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  /** Подпись под кнопкой (фиксированной высоты — без прыжков вёрстки). */
  label: string;
  testID?: string;
};

export default function SpeakHoldButton({
  accent,
  listening,
  disabled = false,
  reduceMotion = false,
  onHoldStart,
  onHoldEnd,
  label,
  testID = 'fc-speak-hold',
}: SpeakHoldButtonProps) {
  const router = useRouter();
  const { theme: t, themeMode } = useTheme();
  const isPremium = useFeatureAccess('speaking');

  const press = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    // Ореол появляется на время записи; на reduceMotion — просто включается.
    halo.value = reduceMotion
      ? withTiming(listening ? 1 : 0, { duration: 60 })
      : withTiming(listening ? 1 : 0, { duration: listening ? 220 : 160 });
  }, [listening, reduceMotion, halo]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.06 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: halo.value * 0.28,
    transform: [{ scale: 0.7 + halo.value * 0.3 }],
  }));

  const onPressIn = useCallback(() => {
    press.value = reduceMotion ? withTiming(1, { duration: 50 }) : withSpring(1, PRESS_SPRING);
    void hapticTap();
    if (!isPremium) {
      router.push({ pathname: '/premium_modal', params: { context: 'speaking' } } as never);
      return;
    }
    onHoldStart();
  }, [isPremium, router, press, reduceMotion, onHoldStart]);

  const onPressOut = useCallback(() => {
    press.value = reduceMotion ? withTiming(0, { duration: 80 }) : withSpring(0, PRESS_SPRING);
    if (isPremium) onHoldEnd();
  }, [isPremium, press, reduceMotion, onHoldEnd]);

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Reanimated.View
          pointerEvents="none"
          style={[styles.halo, { backgroundColor: accent }, haloStyle]}
        />
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`qa-${testID}`}
          accessibilityState={{ disabled, selected: listening }}
          accessible
          disabled={disabled}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          hitSlop={12}
        >
          <Reanimated.View
            style={[
              styles.btn,
              {
                backgroundColor: disabled ? t.bgSurface : accent,
                opacity: disabled ? 0.55 : 1,
                shadowColor: accent,
              },
              btnStyle,
            ]}
          >
            <Ionicons name={listening ? 'mic' : 'mic-outline'} size={34} color={disabled ? t.textMuted : '#fff'} />
          </Reanimated.View>
        </Pressable>
        {!isPremium ? (
          <View pointerEvents="none" style={styles.badge}>
            <PlusBadge themeMode={themeMode} size="xs" />
          </View>
        ) : null}
      </View>
      {/* Подпись фиксированной высоты: состояния меняются, геометрия — нет. */}
      <Text
        style={[styles.label, { color: listening ? accent : t.textMuted }]}
        numberOfLines={1}
        testID={`${testID}-label`}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  stage: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
  },
  btn: {
    width: SPEAK_HOLD_BUTTON_SIZE,
    height: SPEAK_HOLD_BUTTON_SIZE,
    borderRadius: SPEAK_HOLD_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  badge: { position: 'absolute', top: 2, right: -6 },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    height: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
});
