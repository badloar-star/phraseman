import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Наливание полосы опыта на Главной.
 *
 * зачем (владелец, 2026-09-01): «опыт просто полоска хп должна анимированно
 * чуть преувеличиться и заполниться, типа как это в других играх делают».
 * Раньше ширина проставлялась сразу — прогресс менялся между кадрами, и рост
 * опыта был не виден вообще.
 *
 * Почему масштаб, а не ширина в процентах: анимация `width` идёт через JS-поток
 * и пересчитывает layout каждый кадр (Performance Bible прямо запрещает такое
 * на Главной). `scaleX` живёт на UI-потоке и layout не трогает: полоса рисуется
 * на ПОЛНУЮ ширину и сжимается к левому краю.
 *
 * «Перебор» (overshoot) — то самое игровое ощущение: полоса проскакивает цель
 * на ~4% и мягко возвращается. Это spring с малым отскоком, а не буквальный
 * выход за 100%: за краем дорожки overflow всё равно обрежет.
 */

/** Доля перебора: сколько полоса проскакивает мимо цели перед возвратом. */
const OVERSHOOT = 0.04;

/**
 * Кривая наливания: быстрый старт, плавное замедление.
 * ease-in запрещён — он «залипает» на старте, ровно там, куда смотрит глаз.
 */
const FILL_EASE = Easing.bezier(0.22, 0.9, 0.24, 1);

export interface HomeXpBarFill {
  /** Значение для transform: [{ scaleX }] — 0..1 от полной ширины дорожки. */
  readonly scaleX: Animated.Value;
  /**
   * Демо-прогон для дев-кнопки: полоса откатывается назад и снова наливается
   * до реального значения.
   *
   * зачем (владелец, 2026-09-01): наливание видно только в момент изменения
   * опыта, а ждать реального урока ради проверки анимации нельзя. Настоящий
   * прогресс при этом не меняется — двигается ТОЛЬКО картинка.
   */
  readonly playDemo: () => void;
}

/**
 * @param percent прогресс уровня, 0..100
 * @param active экран реально показан (на премаунте не анимируем)
 * @param reduceMotion системное «уменьшить движение»
 */
export function useHomeXpBarFill(
  percent: number,
  active: boolean,
  reduceMotion: boolean,
): HomeXpBarFill {
  const target = Math.min(1, Math.max(0, (Number.isFinite(percent) ? percent : 0) / 100));
  // Стартуем СРАЗУ с правильной величины: первый кадр обязан быть финальной
  // геометрией (layout stability), иначе полоса «прыгала» бы с нуля при каждом
  // заходе на Главную и выглядела как сброс прогресса.
  const scaleX = useRef(new Animated.Value(target)).current;
  const previousRef = useRef(target);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = target;

    // Не показываем: ставим значение молча, чтобы возврат на Главную не
    // проигрывал анимацию задним числом.
    if (!active) {
      scaleX.setValue(target);
      return;
    }

    // Ничего не изменилось — незачем трогать анимацию.
    if (Math.abs(target - previous) < 0.0005) return;

    if (reduceMotion) {
      scaleX.setValue(target);
      return;
    }

    // Уровень вырос — полоса ушла НАЗАД (0.9 → 0.1). Перебор здесь неуместен:
    // он читался бы как «опыт отобрали». Просто быстро дорисовываем новый.
    if (target < previous) {
      Animated.timing(scaleX, {
        toValue: target,
        duration: 260,
        easing: FILL_EASE,
        useNativeDriver: true,
      }).start();
      return;
    }

    // Рост: наливаем с перебором и мягким возвратом.
    const peak = Math.min(1, target + OVERSHOOT);
    Animated.sequence([
      Animated.timing(scaleX, {
        toValue: peak,
        duration: 520,
        easing: FILL_EASE,
        useNativeDriver: true,
      }),
      Animated.spring(scaleX, {
        toValue: target,
        useNativeDriver: true,
        friction: 6,
        tension: 90,
      }),
    ]).start();
  }, [active, reduceMotion, scaleX, target]);

  const playDemo = useCallback(() => {
    if (reduceMotion) {
      scaleX.setValue(target);
      return;
    }
    // Откат — заметный, но не в ноль: полоса, упавшая в самое начало, читается
    // как потеря прогресса, а не как демонстрация наливания.
    const from = Math.max(0, target - 0.45);
    const peak = Math.min(1, target + OVERSHOOT);
    scaleX.stopAnimation();
    scaleX.setValue(from);
    Animated.sequence([
      Animated.timing(scaleX, { toValue: peak, duration: 620, easing: FILL_EASE, useNativeDriver: true }),
      Animated.spring(scaleX, { toValue: target, useNativeDriver: true, friction: 6, tension: 90 }),
    ]).start();
  }, [reduceMotion, scaleX, target]);

  return { scaleX, playDemo };
}
