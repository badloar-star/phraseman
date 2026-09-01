/**
 * Проигрывание повышения уровня НА ГЛАВНОЙ.
 *
 * зачем (владелец, 2026-09-01): «когда юзер набрал опыт для перехода — будь то
 * с подарка, уроки или ещё где-то — ничего не показывается. Единственное: когда
 * на главную возвращается юзер, появляется анимация заполнения полоски. Если
 * происходит левел-ап, полоска заполняется до конца, аватарка подпрыгивает и
 * обновляется (соответственно уровневой), но если стоит кастомная — аватарка не
 * меняется, просто анимация как она подпрыгивает, и цифра-текст уровень такой-то
 * тоже меняется. И всё, а спин появляется отдельно сразу же за этим.»
 *
 * Полноэкранная модалка поздравления удалена: она всплывала на любом экране в
 * непредсказуемый момент и показывала СТАРЫЙ уровень из durable-очереди
 * («был 40 — поздравляем, уровень 13»).
 *
 * Порядок цепочки на один уровень:
 *   1) полоска доливается от текущего значения до КОНЦА (1.0);
 *   2) в момент касания края — прыжок аватарки, смена цифры уровня, звук;
 *   3) полоска мгновенно падает в 0 и наливается до реального остатка.
 * Несколько уровней подряд — шаги 1–3 повторяются, цифра растёт по одному.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/** Доливание до края: чуть быстрее обычного наливания — это кульминация. */
const FILL_TO_EDGE_MS = 420;
/** Пауза на «щелчке» уровня: кадр, в котором полоска полная и прыгает аватар. */
const LEVEL_BEAT_MS = 260;
/** Наливание остатка нового уровня после сброса в ноль. */
const REFILL_MS = 460;
/** Прыжок аватарки. Короче — не читается, длиннее — начинает выглядеть вяло. */
const AVATAR_HOP_MS = 520;

const EDGE_EASE = Easing.bezier(0.3, 0.85, 0.3, 1);

export interface HomeLevelUpCelebrationPlayer {
  /** Уровень, который сейчас надо рисовать: во время цепочки идёт по шагам. */
  readonly displayLevel: number | null;
  /** Масштаб аватарки для прыжка (transform scale). */
  readonly avatarHop: Animated.Value;
  /** true, пока цепочка играет: обычное наливание полоски должно молчать. */
  readonly playing: boolean;
  /** Запустить цепочку fromLevel → toLevel. */
  readonly play: (fromLevel: number, toLevel: number) => void;
  /**
   * Дев-прогон для кнопки на Главной: проигрывает цепочку из `levels`
   * повышений от ТЕКУЩЕГО уровня.
   *
   * зачем (владелец, 2026-09-01): «в едер дев кнопку добавь, чтобы можно было
   * вызвать и посмотреть». Ждать реального повышения ради проверки анимации
   * нельзя, а очередь настоящих праздников трогать нельзя тем более — она
   * одноразовая, просмотр «съел» бы живой праздник.
   *
   * Настоящий опыт и уровень НЕ меняются: цифра на экране идёт от displayLevel,
   * который живёт только на время цепочки, а после неё экран возвращается к
   * реальному значению.
   */
  readonly playDemo: (currentLevel: number, levels: number) => void;
}

/**
 * @param barScaleX та же Animated.Value, что наливает полоску (useHomeXpBarFill)
 * @param restPercent прогресс внутри ФИНАЛЬНОГО уровня, 0..100 — где полоска встанет
 * @param reduceMotion системное «уменьшить движение»
 * @param onLevelBeat вызывается в момент щелчка каждого уровня (звук/хаптик)
 */
export function useHomeLevelUpCelebration(
  barScaleX: Animated.Value,
  restPercent: number,
  reduceMotion: boolean,
  onLevelBeat?: (level: number) => void,
): HomeLevelUpCelebrationPlayer {
  const avatarHop = useRef(new Animated.Value(1)).current;
  const [displayLevel, setDisplayLevel] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const cancelledRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Финальный остаток читаем через ref: цепочка длится больше кадра, и к её
  // концу проценты уже пересчитаны — брать их из замыкания старого рендера
  // значит поставить полоску не туда.
  const restPercentRef = useRef(restPercent);
  restPercentRef.current = restPercent;
  const onLevelBeatRef = useRef(onLevelBeat);
  onLevelBeatRef.current = onLevelBeat;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => {
    cancelledRef.current = true;
    clearTimers();
  }, [clearTimers]);

  const hopAvatar = useCallback(() => {
    avatarHop.stopAnimation();
    avatarHop.setValue(1);
    // Приседание перед прыжком: без него подскок читается как «дёрнулось».
    Animated.sequence([
      Animated.timing(avatarHop, { toValue: 0.94, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(avatarHop, { toValue: 1.14, useNativeDriver: true, friction: 4.5, tension: 150 }),
      Animated.spring(avatarHop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 110 }),
    ]).start();
  }, [avatarHop]);

  const play = useCallback((fromLevel: number, toLevel: number) => {
    const from = Math.trunc(fromLevel);
    const to = Math.trunc(toLevel);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      // Ранний выход обязан объясниться: иначе «анимации нет» без причины.
      if (__DEV__) console.log('[HOME-LEVELUP] play skipped: bad range', { fromLevel, toLevel });
      return;
    }

    cancelledRef.current = false;
    clearTimers();
    setPlaying(true);
    setDisplayLevel(from);

    const finish = () => {
      if (cancelledRef.current) return;
      const rest = Math.min(1, Math.max(0, (Number.isFinite(restPercentRef.current) ? restPercentRef.current : 0) / 100));
      if (__DEV__) console.log('[HOME-LEVELUP] chain finished', { from, to, rest });
      if (reduceMotion) {
        barScaleX.setValue(rest);
      } else {
        Animated.timing(barScaleX, {
          toValue: rest,
          duration: REFILL_MS,
          easing: EDGE_EASE,
          useNativeDriver: true,
        }).start();
      }
      // displayLevel снимаем только после того, как экран уже показывает
      // финальную цифру — иначе на кадр мелькнёт старый уровень из props.
      setDisplayLevel(to);
      const release = setTimeout(() => {
        if (cancelledRef.current) return;
        setPlaying(false);
        setDisplayLevel(null);
      }, reduceMotion ? 0 : REFILL_MS);
      timersRef.current.push(release);
    };

    if (reduceMotion) {
      // «Уменьшить движение»: без анимации, но событие уровня всё равно есть —
      // человек должен понять, что уровень вырос.
      for (let level = from + 1; level <= to; level += 1) onLevelBeatRef.current?.(level);
      finish();
      return;
    }

    // Шаг одного уровня: долить до края → щелчок → сброс в ноль.
    const step = (level: number) => {
      if (cancelledRef.current) return;
      Animated.timing(barScaleX, {
        toValue: 1,
        duration: FILL_TO_EDGE_MS,
        easing: EDGE_EASE,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (cancelledRef.current || !finished) return;
        // Кульминация уровня: цифра, прыжок, звук — в один кадр.
        setDisplayLevel(level);
        hopAvatar();
        onLevelBeatRef.current?.(level);
        if (__DEV__) console.log('[HOME-LEVELUP] level beat', { level, to });

        const afterBeat = setTimeout(() => {
          if (cancelledRef.current) return;
          if (level >= to) {
            barScaleX.setValue(0);
            finish();
            return;
          }
          // Следующий уровень: полоска начинает с нуля.
          barScaleX.setValue(0);
          step(level + 1);
        }, LEVEL_BEAT_MS);
        timersRef.current.push(afterBeat);
      });
    };

    step(from + 1);
  }, [barScaleX, clearTimers, hopAvatar, reduceMotion]);

  const playDemo = useCallback((currentLevel: number, levels: number) => {
    const from = Math.trunc(currentLevel);
    const count = Math.max(1, Math.trunc(levels));
    if (!Number.isFinite(from) || from <= 0) {
      // Ранний выход обязан назвать причину: иначе «кнопка не работает» без следа.
      if (__DEV__) console.log('[HOME-LEVELUP] demo skipped: bad current level', { currentLevel, levels });
      return;
    }
    if (__DEV__) console.log('[HOME-LEVELUP] demo play', { from, to: from + count });
    play(from, from + count);
  }, [play]);

  return { displayLevel, avatarHop, playing, play, playDemo };
}

export const HOME_LEVEL_UP_AVATAR_HOP_MS = AVATAR_HOP_MS;
