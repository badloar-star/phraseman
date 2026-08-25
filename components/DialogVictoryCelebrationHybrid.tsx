/**
 * DialogVictoryCelebrationHybrid — гибрид «Световод + Чекан» для салюта финала
 * ИИ-диалога. Подключается ТОЛЬКО через <DialogVictoryCelebration
 * motionVariant="hybrid">, боевой classic-путь не тронут.
 *
 * Хореография (задание владельца, законы Motion DNA):
 * 1. Блум (LUM.bloomMs=420) → кольцо целей резолвится из света.
 * 2. Герой-иконка садится БЕЗ отскока (LUM.settle).
 * 3. ЕДИНСТВЕННЫЙ удар — момент, когда кольцо достигает 3/3 целей: squash
 *    иконки (CHK.squash) + отдача сцены (CHK.recoil) + конфетти (26 частиц,
 *    геометрия как в classic-варианте). Если не все цели выполнены — кольцо
 *    останавливается на своей доле БЕЗ удара (закон №1: удар только у героя
 *    кульминации, а тут кульминация — именно полный комплект целей).
 * 4. Метрики каскадом LUM.ladder, CTA последним.
 *
 * Reduce Motion = один финальный кадр (без удара/конфетти/каскада).
 * Закрытие — onDone (CTA, аппаратный «назад» через onRequestClose родителя,
 * поскольку это full-screen оверлей без Modal-обёртки — как и classic).
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import type { TextProps } from 'react-native';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import Animated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../constants/i18n';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { hapticMediumImpact, hapticSuccess } from '../hooks/use-haptics';
import { LUM, CHK, SUITE } from '../constants/motionHybrid';
import { DIALOG_VICTORY_HYBRID_PALETTE } from '../constants/motionHybridPalettes';
import { isLowEndDevice } from '../hooks/device_perf_tier';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { soundDirector } from '../modules/audio/sound_director';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// зачем: число опыта ведём по UI-потоку через animatedProps (как счётчик места
// в лиге) — обёртка над Text нужна именно для этого, ре-рендеров JS не будет.
const AnimatedText = Animated.createAnimatedComponent(Text);

// Та же палитра «дорогого» праздника — единый язык с classic-вариантом.
const PALETTE = DIALOG_VICTORY_HYBRID_PALETTE;

const CONFETTI_COUNT = 26;

function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── Конфетти-частица: та же геометрия, что и в classic-варианте, но играет
// ТОЛЬКО на импульсе удара (progress передан снаружи вместо STAGE.CONFETTI). ──
function ConfettiPiece({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const { width } = useWindowDimensions();

  const angle = seeded(index, 1) * Math.PI * 2;
  const distance = 110 + seeded(index, 2) * (width * 0.4);
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 60;
  const rot = (seeded(index, 3) - 0.5) * 1080;
  const size = 7 + seeded(index, 4) * 8;
  const color = [PALETTE.gold, PALETTE.goldBright, PALETTE.emerald, PALETTE.confettiPink, PALETTE.confettiBlue][index % 5];
  const isCircle = index % 3 === 0;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, dx]) },
        { translateY: interpolate(p, [0, 0.6, 1], [0, dy, dy + 80]) },
        { rotate: `${interpolate(p, [0, 1], [0, rot])}deg` },
        { scale: interpolate(p, [0, 0.2, 1], [0.4, 1, 0.9]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: isCircle ? size : size * 0.5,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function MetricCard({
  index,
  icon,
  value,
  label,
  reduceMotion,
}: {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  reduceMotion: boolean;
}) {
  const enter = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      enter.value = 1;
      return;
    }
    // зачем: каскад метрик по общей лестнице LUM.ladder (закон №2 — неравномерная,
    // не метроном), отсчёт от старта — эффект запускает родитель через триггер ниже.
    enter.value = withDelay(
      LUM.ladder[3 + Math.min(index, 2)] ?? LUM.ladder[LUM.ladder.length - 1],
      withSpring(1, LUM.settle),
    );
    return () => cancelAnimation(enter);
  }, [enter, index, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [22, 0]) },
      { scale: interpolate(enter.value, [0, 1], [0.9, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.metricCard, style]}>
      <Ionicons name={icon} size={22} color={PALETTE.gold} style={styles.metricIcon} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
}

export type DialogVictoryCelebrationHybridProps = {
  lang: Lang;
  xp: number;
  replies: number;
  goalsMet: number;
  goalsTotal: number;
  heroIcon?: keyof typeof Ionicons.glyphMap;
  moodIcon?: keyof typeof Ionicons.glyphMap;
  onDone: () => void;
};

export function DialogVictoryCelebrationHybrid({
  lang,
  xp,
  replies,
  goalsMet,
  goalsTotal,
  heroIcon = 'ribbon',
  moodIcon = 'happy',
  onDone,
}: DialogVictoryCelebrationHybridProps) {
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const lowEnd = isLowEndDevice(Platform);

  const backdrop = useSharedValue(0);
  const bloomOpacity = useSharedValue(0);
  const bloomScale = useSharedValue(0.82);
  const ringProgress = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.6);
  const heroScaleX = useSharedValue(1);
  const heroScaleY = useSharedValue(1);
  const sceneRecoilY = useSharedValue(0);
  const confettiProgress = useSharedValue(0);
  const titleAnim = useSharedValue(0);
  const ctaIn = useSharedValue(0);
  // зачем: аудит 2026-08-17 — счётчик опыта крутился через setInterval(16мс)
  // с setState, то есть ре-рендерил JS-поток 60 раз в секунду ровно тогда,
  // когда на UI-потоке идут салют, кольцо и пружины. Ведём число по UI-потоку
  // (тот же приём, что у счётчика места в лиге) — ре-рендеров ноль.
  const xpTick = useSharedValue(0);

  const RING_SIZE = Math.min(width * 0.56, 220);
  const RING_R = (RING_SIZE - 18) / 2;
  const RING_C = 2 * Math.PI * RING_R;
  const goalsFraction = goalsTotal > 0 ? Math.min(1, goalsMet / goalsTotal) : 1;
  const isFullClear = goalsTotal > 0 ? goalsMet >= goalsTotal : true;

  const handleImpact = useCallback(() => {
    void hapticMediumImpact();
    // зачем: раньше здесь заимствовался pm.reward.chest_open за неимением
    // своего звука — теперь у победы в диалоге есть выделенный dedicated cue.
    soundDirector.request('pm.dialog.victory', { scope: 'dialog-victory-hybrid', dedupeKey: 'dialog-victory-hybrid' });
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // зачем: закон Motion DNA — Reduce Motion = один финальный кадр.
      backdrop.value = 1;
      bloomOpacity.value = 0;
      ringProgress.value = 1;
      heroOpacity.value = 1;
      heroScale.value = 1;
      heroScaleX.value = 1;
      heroScaleY.value = 1;
      titleAnim.value = 1;
      ctaIn.value = 1;
      void hapticSuccess();
      xpTick.value = xp;
      return undefined;
    }

    backdrop.value = withTiming(1, { duration: 350 });
    bloomOpacity.value = withTiming(1, { duration: LUM.bloomMs, easing: REasing.out(REasing.cubic) });
    bloomScale.value = withTiming(1.15, { duration: 900, easing: REasing.out(REasing.cubic) });

    // ── фаза 2: герой резолвится из света, посадка БЕЗ отскока ──
    heroOpacity.value = withDelay(LUM.ladder[1], withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.cubic) }));
    heroScale.value = withDelay(LUM.ladder[1], withSpring(1, LUM.settle));

    // ── фаза 3: кольцо целей резолвится следом ──
    const ringDelay = LUM.ladder[2];
    const ringDuration = 1100;
    ringProgress.value = withDelay(
      ringDelay,
      withTiming(goalsFraction, { duration: ringDuration, easing: REasing.out(REasing.cubic) }, (finished) => {
        'worklet';
        if (finished && isFullClear) {
          // ЕДИНСТВЕННЫЙ удар кульминации: комплект целей закрыт.
          heroScaleX.value = withSequence(
            withTiming(1.12, { duration: CHK.anticipMs / 2, easing: REasing.inOut(REasing.ease) }),
            withSpring(1, CHK.squash),
          );
          heroScaleY.value = withSequence(
            withTiming(0.88, { duration: CHK.anticipMs / 2, easing: REasing.inOut(REasing.ease) }),
            withSpring(1, CHK.squash),
          );
          sceneRecoilY.value = withSequence(
            withTiming(CHK.recoilShiftPx, { duration: 0 }),
            withSpring(0, CHK.recoil),
          );
          confettiProgress.value = withTiming(1, { duration: 1400, easing: REasing.out(REasing.cubic) });
          runOnJS(handleImpact)();
        }
      }),
    );

    titleAnim.value = withDelay(LUM.ladder[1] + 80, withSpring(1, SUITE.text));

    const ctaDelay = isFullClear ? LUM.ladder[2] + CHK.anticipMs + CHK.fallMs + 700 : ringDelay + ringDuration + 500;
    ctaIn.value = withDelay(ctaDelay, withSpring(1, SUITE.text));

    const hHero = setTimeout(() => {
      void hapticSuccess();
    }, LUM.ladder[1]);

    if (xp > 0) {
      // разгон числа на UI-потоке: та же кривая «out cubic» и та же секунда,
      // но без единого ре-рендера JS — счётчик больше не конкурирует с салютом
      xpTick.value = 0;
      xpTick.value = withDelay(
        Math.max(0, ctaDelay - 700),
        withTiming(xp, { duration: 1000, easing: REasing.out(REasing.cubic) }),
      );
    }

    return () => {
      clearTimeout(hHero);
      cancelAnimation(backdrop);
      cancelAnimation(bloomOpacity);
      cancelAnimation(bloomScale);
      cancelAnimation(ringProgress);
      cancelAnimation(heroOpacity);
      cancelAnimation(heroScale);
      cancelAnimation(heroScaleX);
      cancelAnimation(heroScaleY);
      cancelAnimation(sceneRecoilY);
      cancelAnimation(confettiProgress);
      cancelAnimation(titleAnim);
      cancelAnimation(ctaIn);
      cancelAnimation(xpTick);
    };
    // зачем: пересобираем последовательность заново на каждый показ; shared values
    // не мутируются вне эффекта (нет setState в кадрах).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, goalsFraction, isFullClear, xp, handleImpact]);

  const handleDone = useCallback(() => {
    onDone();
  }, [onDone]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }],
  }));
  const sceneStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sceneRecoilY.value }],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [
      { scale: heroScale.value },
      { scaleX: heroScaleX.value },
      { scaleY: heroScaleY.value },
    ],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringProgress.value),
  }));
  // зачем: то же, что rankTextProps в LeagueResultHybrid — число печатается
  // нативно из UI-потока; тип приводим к Partial<TextProps>, потому что у
  // обёртки над Text нативных пропов text/defaultValue в типах нет.
  const xpTextProps = useAnimatedProps<Partial<TextProps>>(() => ({
    text: String(Math.round(xpTick.value)),
    defaultValue: String(Math.round(xpTick.value)),
  } as Partial<TextProps>));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleAnim.value,
    transform: [{ translateY: interpolate(titleAnim.value, [0, 1], [14, 0]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaIn.value,
    transform: [
      { translateY: interpolate(ctaIn.value, [0, 1], [20, 0]) },
      { scale: ctaIn.value },
    ],
  }));

  const confetti = useMemo(
    () => (lowEnd ? [] : Array.from({ length: CONFETTI_COUNT }, (_, i) => i)),
    [lowEnd],
  );

  const title = triLang(lang, {
    ru: 'Диалог пройден!',
    uk: 'Діалог пройдено!',
    es: '¡Diálogo superado!',
    'pt-BR': 'Diálogo concluído!',
    vi: 'Hoàn thành hội thoại!',
    id: 'Dialog selesai!',
    tr: 'Diyalog tamamlandı!',
    pl: 'Dialog zaliczony!',
  });
  const subtitle =
    goalsTotal > 0 && goalsMet >= goalsTotal
      ? triLang(lang, {
          ru: 'Все цели выполнены — блестяще',
          uk: 'Усі цілі виконано — блискуче',
          es: 'Todas las metas cumplidas — brillante',
          'pt-BR': 'Todas as metas cumpridas — brilhante',
          vi: 'Đạt mọi mục tiêu — xuất sắc',
          id: 'Semua tujuan tercapai — cemerlang',
          tr: 'Tüm hedefler tamam — harika',
          pl: 'Wszystkie cele osiągnięte — świetnie',
        })
      : triLang(lang, {
          ru: 'Отличный разговор — так держать',
          uk: 'Чудова розмова — так тримати',
          es: 'Gran conversación — sigue así',
          'pt-BR': 'Ótima conversa — continue assim',
          vi: 'Cuộc trò chuyện tuyệt vời — cứ thế nhé',
          id: 'Percakapan hebat — pertahankan',
          tr: 'Harika sohbet — böyle devam',
          pl: 'Świetna rozmowa — tak trzymać',
        });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <LinearGradient
          colors={[PALETTE.backdrop, PALETTE.backdropMid, PALETTE.backdrop]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[styles.stage, sceneStyle]}>
        <Animated.View style={[styles.glowOrb, bloomStyle]} pointerEvents="none">
          <LinearGradient
            colors={[PALETTE.glow, 'rgba(255,206,120,0.0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke={PALETTE.ringTrack} strokeWidth={9} fill="none" />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={PALETTE.ring}
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_C}
              animatedProps={ringProps}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>

          {confetti.length > 0 && (
            <View style={styles.confettiLayer} pointerEvents="none">
              {confetti.map((i) => (
                <ConfettiPiece key={`c-${i}`} index={i} progress={confettiProgress} />
              ))}
            </View>
          )}

          <Animated.View style={heroStyle}>
            <Ionicons name={heroIcon} size={78} color={PALETTE.gold} />
          </Animated.View>
        </View>

        <Animated.View style={titleStyle}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>

        {xp > 0 && (
          <View style={styles.xpRow}>
            <Text style={styles.xpPlus}>+</Text>
            <AnimatedText style={styles.xpValue} animatedProps={xpTextProps}>
              {'0'}
            </AnimatedText>
            <Text style={styles.xpUnit}>XP</Text>
          </View>
        )}

        <View style={styles.metricsRow}>
          <MetricCard
            index={0}
            reduceMotion={reduceMotion}
            icon="chatbubble-ellipses"
            value={String(replies)}
            label={triLang(lang, {
              ru: 'Реплик', uk: 'Реплік', es: 'Frases', 'pt-BR': 'Falas',
              vi: 'Lượt nói', id: 'Ucapan', tr: 'Replik', pl: 'Kwestie',
            })}
          />
          <MetricCard
            index={1}
            reduceMotion={reduceMotion}
            icon="flag"
            value={goalsTotal > 0 ? `${goalsMet}/${goalsTotal}` : '—'}
            label={triLang(lang, {
              ru: 'Цели', uk: 'Цілі', es: 'Metas', 'pt-BR': 'Metas',
              vi: 'Mục tiêu', id: 'Tujuan', tr: 'Hedefler', pl: 'Cele',
            })}
          />
          <MetricCard
            index={2}
            reduceMotion={reduceMotion}
            icon={moodIcon}
            value={triLang(lang, {
              ru: 'Доволен', uk: 'Задоволений', es: 'Contento', 'pt-BR': 'Contente',
              vi: 'Hài lòng', id: 'Senang', tr: 'Memnun', pl: 'Zadowolony',
            })}
            label={triLang(lang, {
              ru: 'Настроение', uk: 'Настрій', es: 'Ánimo', 'pt-BR': 'Humor',
              vi: 'Tâm trạng', id: 'Suasana', tr: 'Ruh hali', pl: 'Nastrój',
            })}
          />
        </View>
      </Animated.View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={[{ width: '100%' }, ctaStyle]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleDone}
            style={styles.ctaWrap}
            accessibilityRole="button"
          >
            <LinearGradient colors={PALETTE.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Text style={styles.ctaText}>
                {triLang(lang, {
                  ru: 'К диалогам', uk: 'До діалогів', es: 'A los diálogos', 'pt-BR': 'Aos diálogos',
                  vi: 'Về hội thoại', id: 'Ke dialog', tr: 'Diyaloglara', pl: 'Do dialogów',
                })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  glowOrb: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: '16%',
    overflow: 'hidden',
  },
  confettiLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  title: { color: PALETTE.text, fontSize: 28, fontWeight: '700', marginTop: 24, letterSpacing: 0.3, textAlign: 'center' },
  subtitle: { color: PALETTE.textDim, fontSize: 15, marginTop: 7, textAlign: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 },
  xpPlus: { color: PALETTE.gold, fontSize: 24, fontWeight: '700', marginBottom: 5 },
  xpValue: { color: PALETTE.goldBright, fontSize: 52, fontWeight: '700', lineHeight: 56, marginHorizontal: 2 },
  xpUnit: { color: PALETTE.gold, fontSize: 18, fontWeight: '700', marginBottom: 6, marginLeft: 4 },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 26 },
  metricCard: {
    width: 96,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: PALETTE.card,
  },
  metricIcon: { marginBottom: 2 },
  metricValue: { color: PALETTE.text, fontSize: 16, fontWeight: '700', marginTop: 6 },
  metricLabel: { color: PALETTE.textDim, fontSize: 12, marginTop: 3 },
  bottom: { paddingHorizontal: 24, alignItems: 'center' },
  ctaWrap: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  cta: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaText: { color: PALETTE.ctaText, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
});

export default DialogVictoryCelebrationHybrid;
