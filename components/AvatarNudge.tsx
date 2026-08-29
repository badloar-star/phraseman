// ─── Анимация-намёк «нажми на меня» на аватарке ──────────────────────────
// зачем: владелец (2026-08-27) — новичок не догадывается, что аватарка на
// Главной кликабельна и ведёт в раздел внешнего вида. Раз в 20 секунд она
// коротко качает головой (жест приглашения, а не украшение) и носит точку-
// маркер «новое», пока раздел не открыт. Кому показывать и сколько сессий —
// решает app/avatar_nudge_state.ts, здесь только движение.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useReduceMotion } from '../hooks/use_reduce_motion';

type Props = {
  /** Намёк разрешён состоянием (не заходил в раздел + бюджет сессий не исчерпан). */
  enabled: boolean;
  /** Экран открыт и приложение на переднем плане (useRuntimeActive у владельца). */
  runtimeActive: boolean;
  size: number;
  /** Цвет точки-маркера — задаётся темой вызывающего экрана. */
  dotColor: string;
  /**
   * Дев-триггер: любое изменение числа проигрывает покачивание немедленно,
   * в обход паузы и периода. Нужен, чтобы владелец мог посмотреть анимацию
   * по кнопке, не дожидаясь 20 секунд и не сбрасывая бюджет сессий.
   * В релизной сборке проп никто не передаёт.
   */
  devPlayToken?: number;
  children: React.ReactNode;
};

/** Пауза перед первым намёком: даём экрану доехать и человеку осмотреться. */
const FIRST_DELAY_MS = 3000;
/** Период повтора. Реже — не заметят, чаще — начинает дёргать глаз. */
const REPEAT_MS = 20000;
/** Длительность самого покачивания (см. таблицу таймингов: UI-жест < 800ms). */
const WIGGLE_MS = 760;

function AvatarNudge({ enabled, runtimeActive, size, dotColor, devPlayToken, children }: Props) {
  const reduceMotion = useReduceMotion();
  const phase = useRef(new Animated.Value(0)).current;
  const dotIn = useRef(new Animated.Value(0)).current;

  // зачем: движение живёт ТОЛЬКО пока экран открыт и приложение на переднем
  // плане. Без этого гейта таймер и цикл Animated продолжали бы крутиться в
  // фоне на каждом экране — в проекте это отдельно оговорённый класс проблем
  // (греет телефон, см. animateAura в AvatarView).
  const motionOn = enabled && runtimeActive && !reduceMotion;

  // Одно покачивание. Вынесено из эффекта, чтобы его мог дёрнуть и дев-триггер.
  const playWiggle = useCallback(() => {
    phase.setValue(0);
    Animated.timing(phase, {
      toValue: 1,
      duration: WIGGLE_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phase]);

  useEffect(() => {
    if (!motionOn) {
      phase.stopAnimation(() => phase.setValue(0));
      return undefined;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const wiggle = () => {
      if (cancelled) return;
      playWiggle();
    };

    const first = setTimeout(() => {
      wiggle();
      // Повтор заводим только после первого показа, чтобы период отсчитывался
      // от него, а не от монтирования экрана.
      if (!cancelled) interval = setInterval(wiggle, REPEAT_MS);
    }, FIRST_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(first);
      if (interval) clearInterval(interval);
      phase.stopAnimation(() => phase.setValue(0));
    };
  }, [motionOn, phase, playWiggle]);

  // зачем: дев-кнопка на Главной (владелец, 2026-08-27) — посмотреть покачивание
  // по требованию. Играем В ОБХОД enabled/runtimeActive: у владельца раздел
  // давно открыт, намёк выключен навсегда, и без обхода кнопка была бы мёртвой.
  // Уважаем только reduce-motion — системную настройку не переезжаем даже в деве.
  // Пропуск первого значения обязателен: без него анимация играла бы на каждом
  // монтировании Главной.
  const devPlayedRef = useRef(devPlayToken);
  const [devPreview, setDevPreview] = useState(false);
  useEffect(() => {
    if (devPlayToken === undefined || devPlayToken === devPlayedRef.current) return;
    devPlayedRef.current = devPlayToken;
    // Точку тоже показываем: иначе у владельца (раздел открыт → enabled=false)
    // кнопка проверяла бы половину намёка.
    setDevPreview(true);
    if (!reduceMotion) playWiggle();
  }, [devPlayToken, playWiggle, reduceMotion]);

  /** Точка видна по-настоящему (новичок) либо её показывает дев-кнопка. */
  const dotVisible = enabled || devPreview;

  // зачем: точка не возникает из ничего (scale 0) — это выглядит как глюк.
  // Появляется из 0.4 с лёгким перелётом, как физический объект.
  useEffect(() => {
    if (!dotVisible) {
      dotIn.setValue(0);
      return;
    }
    Animated.timing(dotIn, {
      toValue: 1,
      duration: reduceMotion ? 0 : 320,
      delay: reduceMotion ? 0 : 400,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [dotVisible, dotIn, reduceMotion]);

  // Затухающее покачивание: сильный первый мах, дальше всё мельче — так
  // качает головой живой человек, зовущий к себе. Симметричный маятник
  // читался бы как механический метроном.
  const rotate = phase.interpolate({
    inputRange: [0, 0.12, 0.3, 0.48, 0.66, 0.82, 1],
    outputRange: ['0deg', '-7deg', '6deg', '-4deg', '2.5deg', '-1deg', '0deg'],
  });
  // Лёгкое увеличение на пике — аватарка «подаётся вперёд», а не просто вертится.
  const scale = phase.interpolate({
    inputRange: [0, 0.12, 0.3, 0.48, 1],
    outputRange: [1, 1.045, 1.045, 1.03, 1],
  });

  const dotSize = Math.max(10, Math.round(size * 0.18));

  return (
    <Animated.View
      style={{
        // зачем: поворот от нижней части — голова качается «на шее», а не
        // крутится вокруг своего центра; именно это читается как живой кивок,
        // а не как вращение картинки. RN по умолчанию берёт центр, поэтому
        // origin задаём явно.
        transformOrigin: '50% 85%',
        transform: [{ rotate }, { scale }],
      }}
    >
      {children}
      {dotVisible ? (
        // зачем: точку кладём в центрированный слой РОВНО размера аватарки, а
        // не по углу внешней обёртки. У владельца с аурой AvatarAura отдаёт
        // контейнер шире аватарки (size + 12, кольцо до 2.05×) — привязка к
        // углу обёртки увела бы точку от головы и утопила под кольцом.
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: size, height: size }}>
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: dotColor,
                opacity: dotIn,
                transform: [{ scale: dotIn.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
              }}
            />
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

export default memo(AvatarNudge);
