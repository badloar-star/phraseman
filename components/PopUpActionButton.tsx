import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect } from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import Reanimated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import DuoPressable from './DuoPressable';
import { MOTION_SPRING } from '../constants/motion';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';

interface Props {
  /** Показать кнопку (true → всплывает снизу, false → уезжает вниз/скрывается). */
  visible: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Цвет поверхности кнопки. Default — зелёный (как Duolingo «Проверить»). */
  color?: string;
  /** @deprecated Сохранено для совместимости; декоративная кромка не рисуется. */
  edgeColor?: string;
  /** Цвет текста. По умолчанию тёмный для контраста с ярко-зелёной заливкой. */
  textColor?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_COLOR = '#22C55E';
const DEFAULT_EDGE = '#15803D';

/**
 * Всплывающая снизу CTA-кнопка для упражнений (НЕ в футере).
 *
 * Когда пользователь ввёл/выбрал все слова — кнопка «Проверить»/«Продолжить»
 * выезжает снизу вверх с пружиной и фейдом. Абсолютно позиционирована у нижнего
 * края экрана, поверх контента. Внутри — DuoPressable с коротким press-откликом
 * без декоративной обводки.
 *
 * Точки внедрения (см. BUTTON_AUDIT): review.tsx, diagnostic_test.tsx.
 *
 * При visible=false монтируется, но уезжает за нижний край (pointerEvents none),
 * чтобы анимация ухода тоже играла. Рендерь его всегда, управляй через visible.
 */
function PopUpActionButton({
  visible,
  label,
  onPress,
  disabled,
  color = DEFAULT_COLOR,
  edgeColor = DEFAULT_EDGE,
  textColor = '#07110A',
  testID,
  style,
}: Props) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const shown = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    shown.value = visible
      ? withSpring(1, MOTION_SPRING.ui)
      : withTiming(0, { duration: 180 });
  }, [visible, shown]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(shown.value, [0, 1], [120, 0]) }],
    opacity: interpolate(shown.value, [0, 0.4, 1], [0, 0.6, 1]),
  }));

  return (
    <Reanimated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        styles.container,
        { paddingBottom: Math.max(bottomInset, 12) + 8 },
        containerStyle,
        style,
      ]}
    >
      <DuoPressable
        onPress={onPress}
        disabled={disabled}
        edgeColor={edgeColor}
        testID={testID}
        accessibilityLabel={label}
        style={[styles.button, { backgroundColor: color }]}
      >
        <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
          {label}
        </Text>
      </DuoPressable>
    </Reanimated.View>
  );
}

export default memo(PopUpActionButton);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    // Лёгкий «подъём» от края — чтобы не липла к самому низу.
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
