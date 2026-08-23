/**
 * EnergySpendFlightHost — глобальная анимация списания энергии за старт.
 *
 * зачем: владелец 2026-08-23 — «при начале мы должны видеть анимацию отнятия
 * 1 единицы энергии». Списание происходит в 9 разных точках (урок, слова,
 * глаголы, предлоги, персональный план, разбор ошибок, экзамены, Арена,
 * флешкарты, диалоги MAX), и половина этих экранов вообще не показывает
 * счётчик энергии в шапке. Поэтому анимация сделана САМОДОСТАТОЧНОЙ: молния
 * поднимается вверх и гаснет по центру экрана, ей не нужен счётчик-цель.
 * Один хост на всё приложение — точки списания только шлют событие.
 *
 * Движение (принципы Emil Kowalski):
 *  - редкое событие (раз в сессию активности) → можно делать заметным;
 *  - ease-out: мгновенный отклик на нажатие, без вялого разгона;
 *  - НЕ из scale(0): молния уменьшается 1 → 0.72, а не возникает из ничего;
 *  - выход короче входа; общая длительность ~520 мс — это не UI-переход,
 *    а подтверждение траты, ему позволено дышать;
 *  - reduce motion: короткое затухание без полёта.
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { onAppEvent } from '../app/events';
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import EnergyIcon from './EnergyIcon';

const FLIGHT_MS = 520;
const FADE_MS = 200;

function EnergySpendFlightHost() {
  const { themeMode, theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const [visible, setVisible] = useState(false);

  const rise = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const runningRef = useRef(false);
  // зачем: держим ссылку на текущую композицию, чтобы остановить её при
  // размонтировании. Без этого колбэк .start() дёргал бы setVisible на снятом
  // компоненте, а runningRef навсегда оставался бы true — и анимация больше
  // никогда не проигралась бы до перезапуска приложения.
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => () => {
    animRef.current?.stop();
    animRef.current = null;
    runningRef.current = false;
  }, []);

  const play = useCallback(() => {
    // Повторное событие во время полёта не перезапускает анимацию с нуля —
    // иначе двойное срабатывание дало бы рывок.
    if (runningRef.current) return;
    runningRef.current = true;
    setVisible(true);
    rise.setValue(0);
    fade.setValue(0);

    if (reduceMotion) {
      // Уменьшенное движение: только появление и затухание, без полёта.
      const rmAnim = Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.delay(160),
        Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]);
      animRef.current = rmAnim;
      rmAnim.start(() => {
        animRef.current = null;
        runningRef.current = false;
        setVisible(false);
      });
      return;
    }

    const flight = Animated.parallel([
      Animated.timing(rise, {
        toValue: 1,
        duration: FLIGHT_MS,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(FLIGHT_MS - 140 - FADE_MS),
        Animated.timing(fade, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animRef.current = flight;
    flight.start(() => {
      animRef.current = null;
      runningRef.current = false;
      setVisible(false);
    });
  }, [fade, reduceMotion, rise]);

  useEffect(() => {
    const sub = onAppEvent('energy_spent_on_start', () => { play(); });
    return () => { sub.remove(); };
  }, [play]);

  if (!visible) return null;

  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -86] });
  const scale = rise.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={styles.center}>
        <Animated.View
          style={{
            opacity: fade,
            transform: reduceMotion ? [] : [{ translateY }, { scale }],
          }}
        >
          <EnergyIcon filled themeMode={themeMode} size={54} animateChange={false} themeColor={t.accent} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(EnergySpendFlightHost);
