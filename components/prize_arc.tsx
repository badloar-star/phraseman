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
const CRUISE_TURN_MS = 780;
/** Разгон до крейсерской скорости (первый оборот длиннее). */
const CRUISE_START_EXTRA_MS = 380;
/**
 * Крейсер ОГРАНИЧЕН по времени (~31 с), НЕ withRepeat(-1): вечная анимация в
 * фоне запрещена perf-контрактом (perf_freeze / runtime_lifecycle_ratchet).
 * Сервер отвечает за секунды; если нет — дуга сама докатится и встанет.
 */
const CRUISE_MAX_TURNS = 40;
/** Мягкий докат до ближайшего слота при остановке без приза (ошибка сети). */
const CRUISE_STOP_MS = 420;

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
      cancelAnimation(rotation);
      spinningRef.current = true;
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
        // Нормализация: эквивалентная позиция в (-360, 0] — числа не растут бесконечно.
        const normalized = rotation.value % 360;
        rotation.value = normalized;
        // Целевой слот приза (в первом цикле), финал ≡ -slot·30 (mod 360), минимум MIN_TURNS оборотов.
        const slotDeg = POSITION_OF_PRIZE[prizeIndex] * SLOT_DEG;
        const alreadyBehind = ((normalized + slotDeg) % 360 + 360) % 360;
        const target = normalized - alreadyBehind - MIN_TURNS * 360;
        const overshootTarget = target - FINAL_OVERSHOOT_DEGREES;
        targetRotationRef.current = target;
        spinFallbackTimerRef.current = setTimeout(finishSpin, SPIN_DURATION_MS + SPIN_SETTLE_GRACE_MS);
        if (reduceMotion) {
          rotation.value = target;
          finishSpin();
          return;
        }
        spinningSV.value = 1;
        rotation.value = withSequence(
          withTiming(target, {
            duration: SPIN_DURATION_MS,
            easing: Easing.bezier(0.08, 0.78, 0.12, 1),
          }),
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
      {!dimmed && (
        <LinearGradient
          colors={[`${t.accent}3D`, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glow}
          pointerEvents="none"
        />
      )}
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
  glow: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -110,
    width: 220,
    height: 170,
    borderRadius: 24,
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
