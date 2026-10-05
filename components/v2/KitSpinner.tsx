import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

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

function KitSpinner({ color = '#FFFFFF', trackColor = 'rgba(255,255,255,0.18)', style, testID }: Props) {
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
        { borderColor: trackColor, borderTopColor: color, transform: [{ rotate }] }, // guard-ok: кольцо спиннера, не контейнер
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { width: SPIN_SIZE, height: SPIN_SIZE, borderRadius: SPIN_SIZE / 2, borderWidth: SPIN_LINE }, // guard-ok: кольцо спиннера `.spin`, не контейнер
});

export default memo(KitSpinner);
