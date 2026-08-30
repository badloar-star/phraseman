import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';

import { levelSpinRewardImageSource } from '../../app/level_spin_reward_assets';
import { themeUiAsset } from '../../app/theme_ui_assets';
import { getStreakFreezeIconVariant } from '../../constants/streakIconAssets';
import { hapticLightImpact, hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useTheme } from '../ThemeContext';
import {
  dailyJourneyChapterForDay,
  dailyJourneyChapterNumber,
  dailyJourneyRewardForDay,
  normalizeDailyJourneyDay,
  type DailyJourneyReward,
  type DailyJourneyRewardPayload,
} from '../dev/dailyJourneyRewardPreviewModel';

// зачем: владелец попросил «супер премиальную» хореографию вместо текущей
// модалки с кнопками. Сцена реализует одобренную спеку
// docs/superpowers/specs/2026-08-30-daily-journey-gift-inbox-design.md:
// журнал главы → удар сердца на сегодняшнем дне → раскрытие → полёт награды
// в карточку «Статистика» → приземление. Ноль решений пользователя, ноль
// текста наград; единственный контрол — «Пропустить», который ведёт в полёт
// и НЕ отменяет уже записанную доставку. Сцена — общий хост хореографии:
// dev-обёртка components/dev/DailyJourneyRewardPreviewModal.tsx рендерит её
// внутри Modal, будущий боевой хост подключится так же.
// Референс таймингов: артефакт «Дар дня» (сессия 2026-08-30).

export type DailyJourneyRevealTarget = Readonly<{ x: number; y: number }>;

export type DailyJourneyRevealSceneHandle = Readonly<{
  /** Спека: Android back и accessibility dismiss ведут себя как «Пропустить». */
  skipToDelivery: () => void;
}>;

type Props = Readonly<{
  visible: boolean;
  day: number;
  /** Каждый показ — новый run: перезапускает хореографию и дедуп звука. */
  run: number;
  /** Composite host identity: same run with a replacement occurrence is new. */
  deliveryId?: string;
  /**
   * Куда летит награда (центр карточки «Статистика» в координатах окна).
   * Хост меряет через measureInWindow; null/не задано — стабильный фоллбэк
   * «верхний центр» из спеки, доставка не откатывается.
   */
  targetPoint?: DailyJourneyRevealTarget | null;
  /** Durable occurrence payload wins over mutable day-table data. */
  reward?: DailyJourneyRewardPayload;
  /** Полёт завершён, сцена погасла: хост закрывает Modal и пульсирует карточку. */
  onDelivered: () => void;
}>;

export const DAILY_JOURNEY_CHAPTER_NAMES = ['Пробуждение', 'Разгон', 'Ритм', 'Сила', 'Вершина'] as const;

const LOG = '[DAILY-JOURNEY-REVEAL]';
// зачем: правило «логи на ранних выходах и в catch — навсегда», но в проде
// console.* запрещён перф-гардом; в дев-сборке владелец видит цепочку в
// metro-console по единому префиксу.
function djLog(...args: unknown[]): void {
  if (__DEV__) console.log(LOG, ...args);
}
const SPARK_COUNT = 12;
const RAY_COUNT = 12;
const HERO_SIZE = 205;
const HERO_CENTER_Y_RATIO = 0.33;
// зачем: вращение лучей сделано КОНЕЧНЫМ (один проход 36/44 c) вместо
// Animated.loop — сцена живёт секунды, а конечная длительность разрешена
// runtime_lifecycle_ratchet без записи в allowlist.
const RAYS_TURN_MS = 36_000;
const RAYS_TURN_B_MS = 44_000;

export function rewardImageSource(
  reward: DailyJourneyReward,
  themeMode: Parameters<typeof themeUiAsset>[0],
): ImageSourcePropType {
  // зачем: единственный маппер «награда → арт» для сцены и её хостов;
  // прежний дубль в dev-модалке удалён вместе с её старой вёрсткой.
  switch (reward.kind) {
    case 'pearls':
      return levelSpinRewardImageSource(`pearls_${reward.amount}`, themeMode)
        ?? levelSpinRewardImageSource('pearls_100', themeMode)!;
    case 'runes':
      return themeUiAsset(themeMode, 'rune');
    case 'energy_full':
      return levelSpinRewardImageSource('energy_full', themeMode)!;
    case 'energy_plus':
      return levelSpinRewardImageSource(reward.amount >= 3 ? 'energy_plus3' : 'energy_plus2', themeMode)!;
    case 'spins':
      return themeUiAsset(themeMode, 'spinTicket');
    case 'freeze':
      return getStreakFreezeIconVariant(themeMode).source;
  }
}

/** Статичная звёздная пыль бэкдропа: без твинкла, ноль циклов. */
function buildStars(width: number, height: number) {
  const stars: { left: number; top: number; size: number; opacity: number }[] = [];
  for (let i = 0; i < 22; i++) {
    stars.push({
      left: Math.random() * width,
      top: Math.random() * height * 0.72,
      size: Math.random() * 1.6 + 0.8,
      opacity: Math.random() * 0.45 + 0.15,
    });
  }
  return stars;
}

const DailyJourneyRevealScene = forwardRef<DailyJourneyRevealSceneHandle, Props>(
  function DailyJourneyRevealScene({ visible, day, run, deliveryId, targetPoint, reward, onDelivered }, ref) {
    const { width, height } = useWindowDimensions();
    const { theme: t, themeMode, f } = useTheme();
    const reduceMotion = useReduceMotion();
    const sequenceKey = deliveryId ?? String(run);

    const normalizedDay = normalizeDailyJourneyDay(day);
    const chapter = useMemo(() => dailyJourneyChapterForDay(normalizedDay), [normalizedDay]);
    const chapterNumber = dailyJourneyChapterNumber(normalizedDay);
    const currentReward = useMemo(() => reward ?? dailyJourneyRewardForDay(normalizedDay), [normalizedDay, reward]);
    const heroArt = rewardImageSource(currentReward, themeMode);
    const cardWidth = Math.min(420, width - 24);

    const stars = useMemo(() => buildStars(width, height), [width, height]);
    const sparks = useMemo(
      () =>
        Array.from({ length: SPARK_COUNT }, (_, i) => ({
          x: (Math.random() * 150 - 75) | 0,
          rise: (70 + Math.random() * 70) | 0,
          delay: 200 + i * 55,
          duration: 1200 + ((Math.random() * 700) | 0),
        })),
      // зачем: новая россыпь на каждый показ, но стабильная внутри показа.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [sequenceKey],
    );

    /* ── Animated-значения: только transform/opacity, native driver ── */
    const backdrop = useRef(new Animated.Value(0)).current;
    const bloomIn = useRef(new Animated.Value(0)).current;
    const skipOp = useRef(new Animated.Value(0)).current;
    const journalIn = useRef(new Animated.Value(0)).current;
    const journalAlive = useRef(new Animated.Value(1)).current;
    const labelIn = useRef(new Animated.Value(0)).current;
    const titleIn = useRef(new Animated.Value(0)).current;
    const headerDim = useRef(new Animated.Value(1)).current;
    const tileIn = useRef(chapter.map(() => new Animated.Value(0))).current;
    const recede = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const haloOp = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const heroOp = useRef(new Animated.Value(0)).current;
    const heroScale = useRef(new Animated.Value(0.27)).current;
    const heroTx = useRef(new Animated.Value(0)).current;
    const heroTy = useRef(new Animated.Value(0)).current;
    const heroRot = useRef(new Animated.Value(0)).current;
    const glowIn = useRef(new Animated.Value(0)).current;
    const raysOp = useRef(new Animated.Value(0)).current;
    const raysTurnA = useRef(new Animated.Value(0)).current;
    const raysTurnB = useRef(new Animated.Value(0)).current;
    const shock = useRef(new Animated.Value(0)).current;
    const sparkVals = useRef(Array.from({ length: SPARK_COUNT }, () => new Animated.Value(0))).current;

    const runningRef = useRef<Animated.CompositeAnimation | null>(null);
    const phaseRef = useRef<'idle' | 'intro' | 'flight' | 'done'>('idle');
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const todayTileRef = useRef<View | null>(null);
    const deliveredRef = useRef(false);
    const sequenceRef = useRef(0);
    const [skipAvailable, setSkipAvailable] = useState(false);

    const later = useCallback((fn: () => void, ms: number) => {
      timersRef.current.push(setTimeout(fn, ms));
    }, []);
    const clearTimers = useCallback(() => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    }, []);

    const stopIntroSound = useCallback(() => {
      soundDirector.stopActiveEvent('pm.reward.daily_journey_intro', 'daily-journey-reveal');
    }, []);

    const heroCenter = useMemo(
      () => ({ x: width / 2, y: height * HERO_CENTER_Y_RATIO }),
      [width, height],
    );

    const resolveTarget = useCallback((): DailyJourneyRevealTarget => {
      if (targetPoint && Number.isFinite(targetPoint.x) && Number.isFinite(targetPoint.y)) {
        return targetPoint;
      }
      // Спека, п. 5.6: цель не измерилась — летим в стабильный верхний центр.
      djLog(`flight target fallback: targetPoint=`, targetPoint, '-> top-center');
      return { x: width / 2, y: 120 };
    }, [targetPoint, width]);

    /** Смещение «из плитки в центр сцены» для старта раскрытия. */
    const measureTileDelta = useCallback((): Promise<{ dx: number; dy: number }> => {
      return new Promise((resolve) => {
        const fallback = { dx: 0, dy: height * 0.17 };
        const node = todayTileRef.current;
        if (!node) {
          djLog(`today tile ref missing, reveal starts from math fallback`, fallback);
          resolve(fallback);
          return;
        }
        try {
          node.measureInWindow((x, y, w, h) => {
            if (!Number.isFinite(x) || !Number.isFinite(y) || w <= 0 || h <= 0) {
              djLog(`measureInWindow returned degenerate rect`, { x, y, w, h }, fallback);
              resolve(fallback);
              return;
            }
            resolve({ dx: x + w / 2 - heroCenter.x, dy: y + h / 2 - heroCenter.y });
          });
        } catch (e) {
          djLog(`measureInWindow threw:`, e, fallback);
          resolve(fallback);
        }
      });
    }, [height, heroCenter.x, heroCenter.y]);

    const resetScene = useCallback(() => {
      backdrop.setValue(0); bloomIn.setValue(0); skipOp.setValue(0);
      journalIn.setValue(0); journalAlive.setValue(1);
      labelIn.setValue(0); titleIn.setValue(0); headerDim.setValue(1);
      tileIn.forEach((v) => v.setValue(0));
      recede.setValue(0); pulse.setValue(0); haloOp.setValue(0); shimmer.setValue(0);
      heroOp.setValue(0); heroScale.setValue(0.27); heroTx.setValue(0); heroTy.setValue(0);
      heroRot.setValue(0); glowIn.setValue(0);
      raysOp.setValue(0); raysTurnA.setValue(0); raysTurnB.setValue(0);
      shock.setValue(0);
      sparkVals.forEach((v) => v.setValue(0));
      deliveredRef.current = false;
    }, [backdrop, bloomIn, glowIn, haloOp, headerDim, heroOp, heroRot, heroScale, heroTx, heroTy,
      journalAlive, journalIn, labelIn, pulse, raysOp, raysTurnA, raysTurnB, recede, shimmer, shock,
      skipOp, sparkVals, tileIn, titleIn]);

    /** Мгновенно выставить конец акта III (герой в центре, журнал погашен). */
    const applyRevealEndState = useCallback(() => {
      backdrop.setValue(1); bloomIn.setValue(1); skipOp.setValue(1);
      journalIn.setValue(1); journalAlive.setValue(0);
      labelIn.setValue(1); titleIn.setValue(1); headerDim.setValue(0.45);
      tileIn.forEach((v) => v.setValue(1));
      recede.setValue(1); pulse.setValue(0); haloOp.setValue(1);
      heroOp.setValue(1); heroScale.setValue(1); heroTx.setValue(0); heroTy.setValue(0);
      glowIn.setValue(1); raysOp.setValue(1);
    }, [backdrop, bloomIn, glowIn, haloOp, headerDim, heroOp, heroScale, heroTx, heroTy,
      journalAlive, journalIn, labelIn, pulse, raysOp, recede, skipOp, tileIn, titleIn]);

    const finishDelivered = useCallback(() => {
      if (deliveredRef.current) {
        djLog(`onDelivered suppressed: already delivered this run`);
        return;
      }
      deliveredRef.current = true;
      phaseRef.current = 'done';
      setSkipAvailable(false);
      stopIntroSound();
      hapticSuccess();
      onDelivered();
    }, [onDelivered, stopIntroSound]);

    /* ── Акт IV+V: полёт по дуге и растворение сцены ── */
    const startFlight = useCallback(() => {
      if (phaseRef.current === 'flight' || phaseRef.current === 'done') {
        djLog(`startFlight ignored: phase=${phaseRef.current}`);
        return;
      }
      phaseRef.current = 'flight';
      setSkipAvailable(false);
      runningRef.current?.stop();
      clearTimers();
      applyRevealEndState();

      const target = resolveTarget();
      const dx = target.x - heroCenter.x;
      const dy = target.y - heroCenter.y;

      // зачем: дуга без кривых — две оси с разными кривыми (X ровно, Y сначала
      // «вдох» вверх, потом ускорение вниз); в сумме читается как арка.
      const flight = Animated.parallel([
        Animated.timing(heroTx, { toValue: dx, duration: 640, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(heroTy, { toValue: -14, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(heroTy, { toValue: dy, duration: 490, easing: Easing.bezier(0.77, 0, 0.175, 1), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(heroRot, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(heroRot, { toValue: 0, duration: 440, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(heroScale, { toValue: 0.16, duration: 640, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 500, delay: 120, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }),
        Animated.timing(raysOp, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(glowIn, { toValue: 0, duration: 340, useNativeDriver: true }),
        Animated.timing(skipOp, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]);
      const settle = Animated.timing(heroOp, { toValue: 0, duration: 120, useNativeDriver: true });

      const seq = Animated.sequence([flight, settle]);
      runningRef.current = seq;
      seq.start(({ finished }) => {
        // зачем (спека, п. 9): прерывание после старта полёта не отменяет
        // доставку — подарок уже записан; хост получает onDelivered в любом
        // исходе, кроме размонтирования сцены.
        djLog(`flight finished=${finished} dx=${dx | 0} dy=${dy | 0}`);
        if (!finished) return;
        runningRef.current = null;
        finishDelivered();
      });
    }, [applyRevealEndState, backdrop, clearTimers, finishDelivered, glowIn, heroCenter.x,
      heroCenter.y, heroOp, heroRot, heroScale, heroTx, heroTy, raysOp, resolveTarget, skipOp]);

    const finishReducedMotion = useCallback(() => {
      // зачем (спека, п. 5): с reduce motion полёта нет вообще — «Пропустить»
      // завершает доставку тем же коротким кроссфейдом, что и обычный ход.
      if (phaseRef.current === 'done') return;
      phaseRef.current = 'flight';
      setSkipAvailable(false);
      runningRef.current?.stop();
      clearTimers();
      const out = Animated.parallel([
        Animated.timing(journalAlive, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(skipOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(heroOp, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]);
      runningRef.current = out;
      out.start(({ finished }) => {
        if (!finished) return;
        runningRef.current = null;
        finishDelivered();
      });
    }, [backdrop, clearTimers, finishDelivered, heroOp, journalAlive, skipOp]);

    const skipToDelivery = useCallback(() => {
      djLog(`skip requested at phase=${phaseRef.current} reduceMotion=${reduceMotion}`);
      if (phaseRef.current === 'flight' || phaseRef.current === 'done') return;
      hapticTap();
      if (reduceMotion) finishReducedMotion();
      else startFlight();
    }, [finishReducedMotion, reduceMotion, startFlight]);

    useImperativeHandle(ref, () => ({ skipToDelivery }), [skipToDelivery]);

    /* ── Акты 0–III: интро-хореография ── */
    const startIntro = useCallback(async (sequence: number) => {
      phaseRef.current = 'intro';
      setSkipAvailable(true);
      const tj = (v: Animated.Value, toValue: number, duration: number, delay = 0, easing = Easing.out(Easing.poly(5))) =>
        Animated.timing(v, { toValue, duration, delay, easing, useNativeDriver: true });

      // Акт 0 «Сцена»: чернота, блум, звёзды.
      const act0 = Animated.parallel([
        tj(backdrop, 1, 320),
        tj(bloomIn, 1, 600),
        tj(skipOp, 1, 260, 140, Easing.out(Easing.quad)),
      ]);

      // Акт I «Журнал»: карточка, заголовки, волна плиток, сегодняшний с битом.
      const todayIdx = chapter.findIndex((r) => r.day === normalizedDay);
      const wave: Animated.CompositeAnimation[] = [];
      let slot = 0;
      chapter.forEach((r, i) => {
        if (i === todayIdx) return;
        wave.push(tj(tileIn[i], 1, 300, 200 + slot * 36));
        slot++;
      });
      const todayDelay = 200 + slot * 36 + 140;
      const act1 = Animated.parallel([
        tj(journalIn, 1, 420, 0, Easing.out(Easing.exp)),
        tj(labelIn, 1, 300, 90),
        tj(titleIn, 1, 300, 150),
        ...wave,
        tj(tileIn[todayIdx], 1, 360, todayDelay, Easing.out(Easing.back(1.2))),
        tj(haloOp, 1, 420, todayDelay + 180, Easing.out(Easing.quad)),
        tj(shimmer, 1, 700, todayDelay + 220, Easing.inOut(Easing.cubic)),
      ]);

      // Акт II «Сегодня»: два удара сердца, сетка уходит в глубину.
      const beat = (toValue: number) =>
        Animated.timing(pulse, {
          toValue,
          duration: toValue === 1 ? 180 : 220,
          easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
          useNativeDriver: true,
        });
      const act2 = Animated.parallel([
        Animated.sequence([beat(1), beat(0), beat(1), beat(0)]),
        tj(recede, 1, 500, 0, Easing.inOut(Easing.quad)),
        tj(headerDim, 0.45, 400, 0, Easing.inOut(Easing.quad)),
      ]);

      const intro = Animated.sequence([act0, act1, Animated.delay(120), act2, Animated.delay(120)]);
      runningRef.current = intro;

      // Хаптика по расписанию актов: тик журнала и два лёгких удара сердца.
      later(() => {
        if (sequenceRef.current === sequence) hapticTap();
      }, 620);
      const act2Start = 620 + 200 + slot * 36 + 140 + 700 + 120;
      later(() => {
        if (sequenceRef.current === sequence) hapticLightImpact();
      }, act2Start + 100);
      later(() => {
        if (sequenceRef.current === sequence) hapticLightImpact();
      }, act2Start + 500);

      await new Promise<void>((resolve) => intro.start(() => resolve()));
      if (sequenceRef.current !== sequence || phaseRef.current !== 'intro') return;

      // Акт III «Раскрытие»: журнал тает, награда вырывается из плитки.
      const { dx, dy } = await measureTileDelta();
      if (sequenceRef.current !== sequence || phaseRef.current !== 'intro') return;
      heroTx.setValue(dx); heroTy.setValue(dy); heroOp.setValue(1);
      const reveal = Animated.parallel([
        Animated.timing(journalAlive, { toValue: 0, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(heroTx, { toValue: 0, duration: 620, delay: 60, easing: Easing.out(Easing.poly(5)), useNativeDriver: true }),
        Animated.timing(heroTy, { toValue: 0, duration: 620, delay: 60, easing: Easing.out(Easing.poly(5)), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(heroScale, { toValue: 1.04, duration: 480, delay: 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(heroScale, { toValue: 1, duration: 140, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.timing(shock, { toValue: 1, duration: 720, delay: 220, easing: Easing.out(Easing.exp), useNativeDriver: true }),
        Animated.timing(glowIn, { toValue: 1, duration: 520, delay: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(raysOp, { toValue: 1, duration: 500, delay: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ...sparkVals.map((v, i) =>
          Animated.timing(v, { toValue: 1, duration: sparks[i].duration, delay: sparks[i].delay, easing: Easing.out(Easing.quad), useNativeDriver: true })),
      ]);
      // Свет живёт конечно: один медленный проход, дольше сцены всё равно не живут.
      Animated.timing(raysTurnA, { toValue: 1, duration: RAYS_TURN_MS, easing: Easing.linear, useNativeDriver: true }).start();
      Animated.timing(raysTurnB, { toValue: 1, duration: RAYS_TURN_B_MS, easing: Easing.linear, useNativeDriver: true }).start();

      runningRef.current = reveal;
      await new Promise<void>((resolve) => reveal.start(() => resolve()));
      if (sequenceRef.current !== sequence || phaseRef.current !== 'intro') return;

      later(() => {
        if (sequenceRef.current === sequence) startFlight();
      }, 500);
    }, [backdrop, bloomIn, chapter, haloOp, headerDim, heroOp, heroScale, heroTx, heroTy,
      journalAlive, journalIn, labelIn, later, measureTileDelta, normalizedDay, pulse, raysOp,
      glowIn, raysTurnA, raysTurnB, recede, shimmer, shock, skipOp, sparkVals, sparks, startFlight,
      tileIn, titleIn]);

    /* ── Reduce motion: детерминированный кроссфейд без полёта и пульсов ── */
    const startReducedMotion = useCallback(() => {
      phaseRef.current = 'intro';
      setSkipAvailable(true);
      backdrop.setValue(1); bloomIn.setValue(1); skipOp.setValue(1);
      labelIn.setValue(1); titleIn.setValue(1);
      tileIn.forEach((v) => v.setValue(1));
      haloOp.setValue(1);
      const fadeIn = Animated.timing(journalIn, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true });
      runningRef.current = fadeIn;
      fadeIn.start(({ finished }) => {
        if (!finished) return;
        later(() => {
          const out = Animated.parallel([
            Animated.timing(journalAlive, { toValue: 0, duration: 240, useNativeDriver: true }),
            Animated.timing(backdrop, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.timing(skipOp, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]);
          runningRef.current = out;
          out.start(({ finished: outFinished }) => {
            if (!outFinished) return;
            runningRef.current = null;
            finishDelivered();
          });
        }, 1100);
      });
    }, [backdrop, bloomIn, finishDelivered, haloOp, journalAlive, journalIn, labelIn, later,
      skipOp, tileIn, titleIn]);

    // A run is the sole choreography identity; callback/target re-renders do
    // not restart delivery. Their host wrappers retain the latest callbacks.
    useEffect(() => {
      if (!visible) {
        runningRef.current?.stop();
        runningRef.current = null;
        clearTimers();
        stopIntroSound();
        phaseRef.current = 'idle';
        setSkipAvailable(false);
        return undefined;
      }
      const sequence = sequenceRef.current + 1;
      sequenceRef.current = sequence;
      resetScene();
      setSkipAvailable(false);
      soundDirector.request('pm.reward.daily_journey_intro', {
        scope: 'daily-journey-reveal',
        dedupeKey: `daily-journey-reveal-${sequenceKey}`,
      });
      if (reduceMotion) {
        startReducedMotion();
      } else {
        startIntro(sequence).catch((e) => {
          // зачем: немой обрыв хореографии оставил бы вечный чёрный экран;
          // логируем причину и честно завершаем доставку кроссфейдом.
          djLog(`intro chain failed, delivering via fallback:`, e);
          if (sequenceRef.current === sequence) startFlight();
        });
      }
      return () => {
        sequenceRef.current += 1;
        runningRef.current?.stop();
        runningRef.current = null;
        clearTimers();
        stopIntroSound();
        // зачем: конечные 36/44-секундные прогоны лучей стартуют вне
        // runningRef — глушим явно, чтобы скрытая сцена не тикала фоном.
        raysTurnA.stopAnimation();
        raysTurnB.stopAnimation();
        setSkipAvailable(false);
      };
    }, [clearTimers, reduceMotion, resetScene, sequenceKey, startFlight, startIntro, startReducedMotion,
      stopIntroSound, visible, raysTurnA, raysTurnB]);

    /* ── интерполяции ── */
    const journalOpacity = Animated.multiply(journalIn, journalAlive);
    const journalShift = journalIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
    const journalScaleIn = journalIn.interpolate({ inputRange: [0, 1], outputRange: [0.965, 1] });
    const journalScaleOut = journalAlive.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
    const labelOpacity = Animated.multiply(labelIn, headerDim);
    const titleOpacity = Animated.multiply(titleIn, headerDim);
    const recedeOpacity = recede.interpolate({ inputRange: [0, 1], outputRange: [1, 0.32] });
    const recedeScale = recede.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] });
    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
    const bloomShift = bloomIn.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
    const bloomOpacity = bloomIn.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
    const shockScale = shock.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.45] });
    const shockOpacity = shock.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.5, 0] });
    const rotA = raysTurnA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const rotB = raysTurnB.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
    const heroRotDeg = heroRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] });
    const tileSize = (cardWidth - 32 - 4 * 8) / 5;
    const shimmerShift = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-tileSize * 1.4, tileSize * 1.6] });
    const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [0, 1, 1, 0] });

    const accent = t.accent;
    const gold = t.gold;

    return (
      <View style={styles.root} pointerEvents="box-none" testID="daily-journey-reveal-scene">
        {/* Бэкдроп «чёрного кино»: чернота + блум + звёздная пыль */}
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]} pointerEvents="none">
          {stars.map((s, i) => (
            <View
              key={i} // guard-ok: статичная декоративная россыпь
              style={[styles.star, { left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity }]}
            />
          ))}
          <Animated.View
            style={[styles.bloomWrap, { opacity: bloomOpacity, transform: [{ translateY: bloomShift }] }]}
          >
            <Svg width={width * 1.4} height={340} viewBox="0 0 100 60">
              <Defs>
                <SvgRadialGradient id="djBloom" cx="50%" cy="82%" r="62%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.16} />
                  <Stop offset="34%" stopColor={accent} stopOpacity={0.3} />
                  <Stop offset="70%" stopColor={gold} stopOpacity={0.12} />
                  <Stop offset="100%" stopColor={accent} stopOpacity={0} />
                </SvgRadialGradient>
              </Defs>
              <Circle cx="50" cy="50" r="48" fill="url(#djBloom)" />
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* Единственный контрол сцены */}
        <Animated.View
          pointerEvents={skipAvailable ? 'auto' : 'none'}
          accessibilityElementsHidden={!skipAvailable}
          importantForAccessibility={skipAvailable ? 'auto' : 'no-hide-descendants'}
          style={[styles.skipWrap, { opacity: skipOp }]}
        >
          <Pressable
            testID="daily-journey-skip"
            accessibilityRole="button"
            accessibilityLabel="Пропустить анимацию"
            hitSlop={8}
            onPress={skipToDelivery}
            style={({ pressed }) => [styles.skip, { backgroundColor: t.bgCard }, pressed && styles.pressed]}
          >
            <Text style={[styles.skipText, { color: t.textPrimary, fontSize: f.label }]}>Пропустить</Text>
          </Pressable>
        </Animated.View>

        {/* Журнал главы */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.journal,
            {
              width: cardWidth,
              left: (width - cardWidth) / 2,
              opacity: journalOpacity,
              transform: [{ translateY: journalShift }, { scale: journalScaleIn }, { scale: journalScaleOut }],
            },
          ]}
        >
          <LinearGradient colors={[t.bgSurface2 ?? t.bgSurface, t.bgCard]} start={{ x: 0.8, y: 0 }} end={{ x: 0.2, y: 1 }} style={styles.journalFill}>
            <Animated.Text style={[styles.jrLabel, { color: gold, fontSize: f.caption, opacity: labelOpacity }]}>
              ДЕНЬ {normalizedDay} ИЗ 50
            </Animated.Text>
            <Animated.Text style={[styles.jrTitle, { color: t.textPrimary, fontSize: f.h2, opacity: titleOpacity }]}>
              Глава {chapterNumber} · {DAILY_JOURNEY_CHAPTER_NAMES[chapterNumber - 1]}
            </Animated.Text>
            <View style={styles.grid}>
              {chapter.map((reward, i) => {
                const received = reward.day < normalizedDay;
                const isToday = reward.day === normalizedDay;
                const art = rewardImageSource(reward, themeMode);
                const enter = {
                  opacity: tileIn[i],
                  transform: [
                    { translateY: tileIn[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                    { scale: tileIn[i].interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                  ],
                };
                const tile = (
                  <View testID={`daily-journey-day-${reward.day}`} style={styles.tileClip}>
                    <LinearGradient
                      colors={isToday ? [t.accentBg ?? t.bgSurface, t.bgSurface] : [t.bgSurface, t.bgCard]}
                      start={{ x: 0.7, y: 0 }} end={{ x: 0.3, y: 1 }}
                      style={[styles.tileFill, received && styles.tileReceived]}
                    >
                      <Image source={art} style={styles.tileArt} contentFit="contain" accessible={false} />
                    </LinearGradient>
                    {received ? (
                      <View style={[styles.mark, { backgroundColor: t.bgCard }]}>
                        <Ionicons name="checkmark" size={12} color={t.textMuted} />
                      </View>
                    ) : null}
                    {isToday ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[styles.shimmer, { opacity: shimmerOpacity, transform: [{ translateX: shimmerShift }, { skewX: '-18deg' }] }]}
                      />
                    ) : null}
                  </View>
                );
                if (isToday) {
                  return (
                    <Animated.View key={reward.day} ref={todayTileRef as React.Ref<View>} style={[styles.cell, enter, { transform: [...enter.transform, { scale: pulseScale }] }]}>
                      <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOp }]}>
                        <Svg width="100%" height="100%" viewBox="0 0 100 100">
                          <Defs>
                            <SvgRadialGradient id="djHalo" cx="50%" cy="50%" r="50%">
                              <Stop offset="0%" stopColor={accent} stopOpacity={0.36} />
                              <Stop offset="62%" stopColor={gold} stopOpacity={0.12} />
                              <Stop offset="100%" stopColor={accent} stopOpacity={0} />
                            </SvgRadialGradient>
                          </Defs>
                          <Circle cx="50" cy="50" r="50" fill="url(#djHalo)" />
                        </Svg>
                      </Animated.View>
                      {tile}
                    </Animated.View>
                  );
                }
                return (
                  <Animated.View key={reward.day} style={styles.cell}>
                    <Animated.View style={enter}>
                      <Animated.View style={{ opacity: recedeOpacity, transform: [{ scale: recedeScale }] }}>
                        {tile}
                      </Animated.View>
                    </Animated.View>
                  </Animated.View>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Герой: свечение, лучи, ударная волна, пылинки, арт */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hero,
            {
              left: heroCenter.x - HERO_SIZE / 2,
              top: heroCenter.y - HERO_SIZE / 2,
              opacity: heroOp,
              transform: [{ translateX: heroTx }, { translateY: heroTy }, { scale: heroScale }, { rotate: heroRotDeg }],
            },
          ]}
        >
          <Animated.View style={[styles.heroLayer, { opacity: glowIn }]}>
            <Svg width="140%" height="140%" viewBox="0 0 100 100" style={styles.heroGlowSvg}>
              <Defs>
                <SvgRadialGradient id="djGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={accent} stopOpacity={0.3} />
                  <Stop offset="55%" stopColor={gold} stopOpacity={0.14} />
                  <Stop offset="100%" stopColor={accent} stopOpacity={0} />
                </SvgRadialGradient>
              </Defs>
              <Circle cx="50" cy="50" r="50" fill="url(#djGlow)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.heroLayer, styles.rayField, { opacity: Animated.multiply(raysOp, 0.6), transform: [{ rotate: rotA }] }]}>
            {Array.from({ length: RAY_COUNT }, (_, i) => (
              <View key={i} /* guard-ok: статичный список лучей */ style={[styles.ray, { backgroundColor: i % 2 === 0 ? accent : gold, transform: [{ rotate: `${i * (360 / RAY_COUNT)}deg` }] }]} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.heroLayer, styles.rayField, { opacity: Animated.multiply(raysOp, 0.4), transform: [{ rotate: rotB }, { scale: 0.82 }] }]}>
            {Array.from({ length: RAY_COUNT }, (_, i) => (
              <View key={i} /* guard-ok: статичный список лучей */ style={[styles.ray, { backgroundColor: i % 2 === 0 ? gold : accent, transform: [{ rotate: `${(i + 0.5) * (360 / RAY_COUNT)}deg` }] }]} />
            ))}
          </Animated.View>
          <Animated.View style={[styles.heroLayer, { opacity: shockOpacity, transform: [{ scale: shockScale }] }]}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs>
                <SvgRadialGradient id="djShock" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={accent} stopOpacity={0} />
                  <Stop offset="56%" stopColor={accent} stopOpacity={0} />
                  <Stop offset="63%" stopColor={accent} stopOpacity={0.4} />
                  <Stop offset="70%" stopColor={gold} stopOpacity={0.25} />
                  <Stop offset="82%" stopColor={gold} stopOpacity={0} />
                  <Stop offset="100%" stopColor={gold} stopOpacity={0} />
                </SvgRadialGradient>
              </Defs>
              <Circle cx="50" cy="50" r="50" fill="url(#djShock)" />
            </Svg>
          </Animated.View>
          {sparks.map((s, i) => (
            <Animated.View
              key={i} // guard-ok: статичная декоративная россыпь
              style={[
                styles.spark,
                { backgroundColor: gold },
                {
                  opacity: sparkVals[i].interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 0] }),
                  transform: [
                    { translateX: s.x },
                    { translateY: sparkVals[i].interpolate({ inputRange: [0, 1], outputRange: [10, -s.rise] }) },
                    { scale: sparkVals[i].interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 1, 0.5] }) },
                  ],
                },
              ]}
            />
          ))}
          <Image source={heroArt} style={styles.heroArt} contentFit="contain" accessible={false} />
        </Animated.View>
      </View>
    );
  },
);

export default DailyJourneyRevealScene;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,4,10,0.93)', overflow: 'hidden' },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: 'rgba(221,228,255,0.9)' },
  bloomWrap: { position: 'absolute', left: '-20%', right: '-20%', bottom: -180, alignItems: 'center' },
  skipWrap: { position: 'absolute', top: 54, right: 16, zIndex: 30 },
  skip: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 15 },
  skipText: { fontWeight: '700' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
  journal: {
    position: 'absolute', top: '50%', marginTop: -140, zIndex: 15, borderRadius: 26,
    shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  journalFill: { borderRadius: 26, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, overflow: 'hidden' },
  jrLabel: { fontWeight: '700', letterSpacing: 1.4, textAlign: 'center' },
  jrTitle: { marginTop: 7, marginBottom: 16, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexBasis: '18%', flexGrow: 1 },
  tileClip: { position: 'relative', aspectRatio: 1, borderRadius: 14, overflow: 'hidden' },
  tileFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileReceived: { opacity: 0.45 },
  // Спека, п. 5: арт вырастает с 56% до 78% плитки, подписи не рендерятся.
  tileArt: { width: '78%', height: '78%' },
  mark: { position: 'absolute', top: 4, right: 4, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: '52%', backgroundColor: 'rgba(255,255,255,0.22)' },
  halo: { position: 'absolute', left: -14, right: -14, top: -14, bottom: -14, zIndex: -1 },
  hero: { position: 'absolute', zIndex: 20, width: HERO_SIZE, height: HERO_SIZE, alignItems: 'center', justifyContent: 'center' },
  heroLayer: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroGlowSvg: { position: 'absolute' },
  rayField: { width: HERO_SIZE + 20, height: HERO_SIZE + 20 },
  ray: { position: 'absolute', left: '50%', top: '50%', marginLeft: -1.5, marginTop: -(HERO_SIZE + 20) / 2, width: 3, height: HERO_SIZE + 20, borderRadius: 2, opacity: 0.5 },
  spark: { position: 'absolute', left: HERO_SIZE / 2 - 2.5, top: HERO_SIZE * 0.58, width: 5, height: 5, borderRadius: 3 },
  heroArt: { width: HERO_SIZE, height: HERO_SIZE },
});
