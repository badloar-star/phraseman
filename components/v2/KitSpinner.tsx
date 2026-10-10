import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../ThemeContext';

// зачем (65в, макет coins.html №4 «Проверяем повышение»): системный спиннер кита `.spin` — кольцо 22, линия 2.5,
// дорожка rgba(255,255,255,.18), верх белый, оборот 0.8 с линейно (cards-states.html / system.html / dialogs.html).
// Вращение на нативном драйвере: ни одного React-рендера на кадр, JS-поток свободен.
const SPIN_SIZE = 22;
const SPIN_LINE = 2.5;
const SPIN_PERIOD_MS = 800;

type Props = Readonly<{
  /** Цвет верхней дуги; дорожка — тот же белый на 18%, как в макете. */
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>;

function KitSpinner({ color, trackColor, style, testID }: Props) {
  // зачем (замечание владельца 10.10): белое кольцо на светлой теме не видно — по умолчанию цвет текста темы, дорожка — её кромка.
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const ringColor = color ?? g.text;
  const ringTrack = trackColor ?? g.glassEdge;
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Вечный цикл допустим: это индикатор загрузки (motion_allowlist), снимается вместе с компонентом.
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: SPIN_PERIOD_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      testID={testID}
      accessibilityRole="progressbar"
      style={[
        styles.ring,
        // Кольцо спиннера, а не обводка контейнера: дорожка + цветная верхняя дуга, как `.spin` макета.
        { borderColor: ringTrack, borderTopColor: ringColor, transform: [{ rotate }] }, // guard-ok: кольцо спиннера, не контейнер
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { width: SPIN_SIZE, height: SPIN_SIZE, borderRadius: SPIN_SIZE / 2, borderWidth: SPIN_LINE }, // guard-ok: кольцо спиннера `.spin`, не контейнер
});

export default memo(KitSpinner);
