/**
 * PrizeArc — дуга призовых карточек «Награда за друга» (стиль Kimi).
 *
 * зачем: владелец заменил горизонтальную ленту на полукруг из готовых карточек
 * assets/roulette — карточки стоят на невидимом круге, крайние уходят за края
 * экрана; спин = ОДИН поворот контейнера на UI-треде (Reanimated), без setState
 * в кадрах. Результат определяет сервер (referralSpin) — компонент лишь
 * докручивает контейнер до слота выданного приза (см. spinTo).
 *
 * Геометрия: 12 слотов (TAPE_CYCLE × 2) по 30°, радиус подобран так, чтобы
 * соседние карточки не перекрывались (хорда 2R·sin15° > ширина карточки).
 * transform: rotate(слот) → translateY(-R) даёт позицию на окружности с
 * тангенциальным наклоном — ровно как в референсе Kimi.
 *
 * Токены темы; fontWeight только 400/700; без обводок (тон/свечение);
 * высота зоны фиксирована (layout stability: первый кадр = финальная геометрия).
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
// зачем: домашний стандарт JS-колбэков из worklet — scheduleOnRN (см. контракт
// referral_roulette_finish: runOnJS в спин-экранах запрещён).
import { scheduleOnRN } from 'react-native-worklets';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';
import { hapticLightImpact } from '../hooks/use-haptics';
import {
  POSITION_OF_PRIZE,
  preloadRoulettePrizeImages,
  ROULETTE_PRIZES,
  TAPE_CYCLE,
} from '../app/roulette_prizes';

// ── Геометрия ────────────────────────────────────────────────────────────────
const CARD_W = 150;
const CARD_H = 100; // 3:2 — как в модалке выигрыша
const SLOT_DEG = 30;
const SLOTS = TAPE_CYCLE.length * 2; // 12
/** Радиус: хорда 2R·sin(15°) ≈ 171 > CARD_W + зазор. */
const RADIUS = 330;
/** Вертикаль центра верхней карточки внутри зоны. */
const CENTER_Y = 108;
/** Фиксированная высота зоны — ±30°-карточки видны, ±60° уходят за низ/края. */
export const PRIZE_ARC_HEIGHT = 212;
/** Основное вращение: короткое, но с заметным торможением к призу. */
const SPIN_DURATION_MS = 2_450;
/** Лёгкий перелёт и возврат имитируют фиксацию барабана в слоте. */
const FINAL_OVERSHOOT_DEGREES = 8;
const FINAL_OVERSHOOT_DURATION_MS = 130;
const FINAL_SETTLE_DURATION_MS = 220;
/** JS-страховка поверх нативного callback: приз важнее декоративной анимации. */
const SPIN_SETTLE_GRACE_MS = 600;
/** Минимум полных оборотов за спин. */
const MIN_TURNS = 3;
const ENTER_MS = 480;
/** Крейсерский оборот 360° — фон, пока сервер выбирает приз. */
const CRUISE_TURN_MS = 560;
/** Разгон до крейсерской скорости (первый оборот длиннее). */
const CRUISE_START_EXTRA_MS = 240;
/**
 * Крейсер ОГРАНИЧЕН по времени (~31 с), НЕ withRepeat(-1): вечная анимация в
 * фоне запрещена perf-контрактом (perf_freeze / runtime_lifecycle_ratchet).
 * Сервер отвечает за секунды; если нет — дуга сама докатится и встанет.
 */
const CRUISE_MAX_TURNS = 40;
/** Мягкий докат до ближайшего слота при остановке без приза (ошибка сети). */
const CRUISE_STOP_MS = 420;
/**
 * зачем: владелец (2026-07-26) — сшить скорости крейсера и докрутки без рывка.
 * Посадка из крейсера: линейный довод НА КРЕЙСЕРСКОЙ скорости до точки
 * торможения, затем quad-out, у которого начальная скорость 2·D/T равна
 * крейсерской (D = LANDING_DECEL_DEGREES, T выводится из скорости) — стык
 * фаз без скачка скорости. Из покоя spinTo крутит старым бурным профилем.
 * Владелец (дважды): «анимация слишком длинная, много оборотов» → крейсер
 * ускорен (560 мс/оборот), торможение 300° (~0.93 с), доводочный оборот
 * добавляется ТОЛЬКО если до приза ближе дистанции торможения. Посадка
 * ~0.9–1.5 с + фиксация; всего от тапа ~2.5–3.5 оборота.
 */
const LANDING_DECEL_DEGREES = 300; // дистанция торможения (2·300/(360/560) ≈ 933 мс)

export interface PrizeArcHandle {
  /**
   * Докрутить дугу до слота приза prizeIndex (0..5). Резолвится по завершении
   * анимации (или сразу при reduced motion). Параллельные вызовы игнорируются.
   */
  spinTo(prizeIndex: number): Promise<void>;
  /**
   * зачем: владелец (2026-07-26) — «Получить приз» без загрузки: вращение
   * стартует МГНОВЕННО по нажатию, сервер выбирает приз в фоне, spinTo потом
   * бесшовно докручивает с текущей скорости. При reduced motion — no-op.
   */
  startSpin(): void;
  /** Плавная остановка БЕЗ приза (сервер отказал): докат до ближайшего слота. */
  stopSpin(): void;
}

interface PrizeArcProps {
  /** Приз, стоящий в центре при первом кадре (по умолчанию «7 дней»). */
  initialPrizeIndex?: number;
  /** Нет ключей → карточки приглушены, свечение выключено. */
  dimmed?: boolean;
}

/** Слот i → индекс приза (цикл ленты повторён дважды по кругу). */
function prizeOfSlot(slot: number): number {
  return TAPE_CYCLE[((slot % TAPE_CYCLE.length) + TAPE_CYCLE.length) % TAPE_CYCLE.length];
}

const PrizeArc = forwardRef<PrizeArcHandle, PrizeArcProps>(function PrizeArc(
  { initialPrizeIndex = 1, dimmed = false },
  ref,
) {
  const { theme: t } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  // Слот стартового приза наверху: rotation = -slot·30°.
  const initialRotation = -POSITION_OF_PRIZE[initialPrizeIndex] * SLOT_DEG;
  const rotation = useSharedValue(initialRotation);
  const spinningSV = useSharedValue(0);
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const spinningRef = useRef(false);

  // зачем: владелец увидел вечно пустые карточки — рендер БОЛЬШЕ НЕ ждёт
  // Asset.loadAsync (если прелоад молча падал, дуга оставалась пустой навсегда).
  // expo-image грузит require()-ассеты сам с кэшем; прелоад остаётся тёплым
  // фоном, чтобы спин не ловил догрузку.
  useEffect(() => {
    void preloadRoulettePrizeImages().catch(() => {});
  }, []);

  // Вход: дуга выкатывается снизу с лёгким довором (как полукруг у Kimi).
  // зачем: вход только через transform, БЕЗ opacity-гейта — если анимация входа
  // по любой причине не отработает, дуга всё равно видима (правило «reveal
  // enhances an already-visible default»).
  useEffect(() => {
    if (reduceMotion) { enter.value = 1; return; }
    enter.value = withTiming(1, { duration: ENTER_MS, easing: Easing.bezier(0.32, 0.72, 0, 1) });
  }, [enter, reduceMotion]);

  // Вибро-тик на границах слотов во время спина (управляющий элемент — вибрация уместна).
  const tick = useCallback(() => { void hapticLightImpact(); }, []);
  useAnimatedReaction(
    () => (spinningSV.value === 1 ? Math.floor(-rotation.value / SLOT_DEG) : null),
    (current, previous) => {
      if (current !== null && previous !== null && current !== previous) scheduleOnRN(tick);
    },
  );

  const resolveRef = useRef<(() => void) | null>(null);
  const targetRotationRef = useRef<number | null>(null);
  const spinFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishSpin = useCallback(() => {
    if (spinFallbackTimerRef.current) {
      clearTimeout(spinFallbackTimerRef.current);
      spinFallbackTimerRef.current = null;
    }
    const target = targetRotationRef.current;
    targetRotationRef.current = null;
    // Если UI-thread анимация была отменена/не стартовала, всё равно ставим
    // серверный приз в центральный слот перед показом результата.
    if (target !== null) rotation.value = target;
    spinningSV.value = 0;
    spinningRef.current = false;
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.();
  }, [rotation, spinningSV]);

  useEffect(() => () => {
    cancelAnimation(rotation);
    finishSpin();
  }, [finishSpin, rotation]);

  useImperativeHandle(ref, () => ({
    startSpin() {
      // Уже идёт докрутка до приза — не сбиваем её декоративной петлёй.
      if (targetRotationRef.current !== null || spinningRef.current) return;
      cancelAnimation(rotation);
      const normalized = rotation.value % 360;
      rotation.value = normalized;
      // Reduced motion: без крейсерского вращения — spinTo доставит приз мгновенно.
      if (reduceMotion) return;
      spinningRef.current = true;
      spinningSV.value = 1;
      // Разгон + длинный равномерный крейсер. Ограничен CRUISE_MAX_TURNS —
      // spinTo/stopSpin перехватывают его задолго до конца.
      rotation.value = withSequence(
        withTiming(normalized - 360, {
          duration: CRUISE_TURN_MS + CRUISE_START_EXTRA_MS,
          easing: Easing.in(Easing.quad),
        }),
        withTiming(normalized - 360 * CRUISE_MAX_TURNS, {
          duration: CRUISE_TURN_MS * (CRUISE_MAX_TURNS - 1),
          easing: Easing.linear,
        }),
      );
    },
    stopSpin() {
      // Докрутка до приза важнее мягкой остановки — её не прерываем.
      if (targetRotationRef.current !== null) return;
      cancelAnimation(rotation);
      spinningRef.current = false;
      spinningSV.value = 0;
      const normalized = rotation.value % 360;
      // Докат ВПЕРЁД по ходу вращения до ближайшего слота — без отскока назад.
      const settle = normalized - (((normalized % SLOT_DEG) + SLOT_DEG) % SLOT_DEG);
      if (reduceMotion || settle === normalized) {
        rotation.value = settle;
        return;
      }
      rotation.value = normalized;
      rotation.value = withTiming(settle, {
        duration: CRUISE_STOP_MS,
        easing: Easing.out(Easing.cubic),
      });
    },
    spinTo(prizeIndex: number) {
      if (targetRotationRef.current !== null) return Promise.resolve();
      // Крейсер (startSpin) помечает spinningRef — по нему выбираем профиль посадки.
      const fromCruise = spinningRef.current;
      cancelAnimation(rotation);
      spinningRef.current = true;
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        // Нормализация: эквивалентная позиция в (-360, 0] — числа не растут бесконечно.
        const normalized = rotation.value % 360;
        rotation.value = normalized;
        // Целевой слот приза (в первом цикле), финал ≡ -slot·30 (mod 360).
        // Из покоя — бурный профиль на MIN_TURNS; из крейсера — линейный довод
        // на крейсерской скорости + торможение со сшитой начальной скоростью.
        const slotDeg = POSITION_OF_PRIZE[prizeIndex] * SLOT_DEG;
        const alreadyBehind = ((normalized + slotDeg) % 360 + 360) % 360;
        // Доводочный оборот добавляется ТОЛЬКО когда до приза ближе дистанции
        // торможения — иначе тормозим сразу (владелец: минимум оборотов).
        const landingTurns = fromCruise
          ? (alreadyBehind >= LANDING_DECEL_DEGREES ? 0 : 1)
          : MIN_TURNS;
        const target = normalized - alreadyBehind - landingTurns * 360;
        const overshootTarget = target - FINAL_OVERSHOOT_DEGREES;
        const cruiseDegPerMs = 360 / CRUISE_TURN_MS;
        // Стык фаз без рывка: quad-out стартует со скоростью 2·D/T = крейсерской.
        const linearDistance = fromCruise ? Math.max(0, normalized - target - LANDING_DECEL_DEGREES) : 0;
        const linearDurationMs = Math.round(linearDistance / cruiseDegPerMs);
        const decelDurationMs = fromCruise
          ? Math.round((2 * LANDING_DECEL_DEGREES) / cruiseDegPerMs)
          : SPIN_DURATION_MS;
        targetRotationRef.current = target;
        const fallbackDelayMs = linearDurationMs + decelDurationMs
          + FINAL_OVERSHOOT_DURATION_MS + FINAL_SETTLE_DURATION_MS + SPIN_SETTLE_GRACE_MS;
        spinFallbackTimerRef.current = setTimeout(finishSpin, fallbackDelayMs);
        if (reduceMotion) {
          rotation.value = target;
          finishSpin();
          return;
        }
        spinningSV.value = 1;
        const mainLegs = fromCruise
          ? [
              withTiming(normalized - linearDistance, {
                duration: linearDurationMs,
                easing: Easing.linear,
              }),
              withTiming(target, {
                duration: decelDurationMs,
                easing: Easing.out(Easing.quad),
              }),
            ]
          : [
              withTiming(target, {
                duration: SPIN_DURATION_MS,
                easing: Easing.bezier(0.08, 0.78, 0.12, 1),
              }),
            ];
        rotation.value = withSequence(
          ...mainLegs,
          withTiming(overshootTarget, {
            duration: FINAL_OVERSHOOT_DURATION_MS,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(
            target,
            { duration: FINAL_SETTLE_DURATION_MS, easing: Easing.out(Easing.cubic) },
            () => {
              'worklet';
              spinningSV.value = 0;
              // Reanimated вызывает callback и при отмене. В обоих случаях
              // освобождаем Promise; finishSpin сам докрутит до серверного слота.
              scheduleOnRN(finishSpin);
            },
          ),
        );
      });
    },
  }), [finishSpin, reduceMotion, rotation, spinningSV]);

  const pivotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const zoneStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - enter.value) * 36 }],
  }));

  // 12 карточек по кругу — статичны внутри вращающегося контейнера.
  const slots = useMemo(() => Array.from({ length: SLOTS }, (_, i) => ({
    slot: i,
    prize: ROULETTE_PRIZES[prizeOfSlot(i)],
  })), []);

  return (
    <Animated.View
      style={[styles.zone, zoneStyle]}
      pointerEvents="none"
      testID="prize-arc"
    >
      {/* Свечение под центральной карточкой — тон, не обводка. */}
      <View style={styles.pointer}>
        <Ionicons name="caret-down" size={28} color={dimmed ? t.textMuted : t.accent} />
      </View>
      <View style={[styles.pivotAnchor, { left: windowWidth / 2 }]}>
        <Animated.View style={pivotStyle}>
          {slots.map(({ slot, prize }) => (
            <View
              key={slot}
              style={[
                styles.card,
                {
                  backgroundColor: t.bgSurface,
                  borderColor: t.border,
                  opacity: dimmed ? 0.42 : 1,
                  transform: [
                    { rotate: `${slot * SLOT_DEG}deg` },
                    { translateY: -RADIUS },
                  ],
                },
              ]}
            >
              <Image
                // зачем: карточки декоративны (guard-ok) — состояние дуги озвучивает
                // подпись приза под ней на экране рефералов, дубли только шумят в VoiceOver.
                accessible={false}
                source={prize.image}
                style={styles.cardImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority={slot < 3 || slot > SLOTS - 3 ? 'high' : 'normal'}
              />
            </View>
          ))}
        </Animated.View>
      </View>
      {/* Нижний растворитель — карточки «уходят» в фон экрана без жёсткой кромки. */}
      <LinearGradient
        colors={['transparent', t.bgGradient[0]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fade}
        pointerEvents="none"
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  zone: {
    height: PRIZE_ARC_HEIGHT,
    overflow: 'hidden',
    // зачем: дуга должна доходить до физических краёв экрана (карточки клипаются
    // рамкой телефона, как у Kimi), поэтому зона всегда в full-bleed обёртке.
    alignSelf: 'stretch',
  },
  pointer: {
    position: 'absolute',
    top: 14,
    left: '50%',
    marginLeft: -14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pivotAnchor: {
    position: 'absolute',
    top: RADIUS + CENTER_Y,
    width: 0,
    height: 0,
  },
  card: {
    position: 'absolute',
    left: -CARD_W / 2,
    top: -CARD_H / 2,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
  },
});

export default PrizeArc;
