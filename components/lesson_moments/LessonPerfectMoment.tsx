// ═══════════════════════════════════════════════════════════════════════════
// LessonPerfectMoment.tsx — момент m09 «Идеальный урок — чекан» (эталон engagement-moments-v3-all.html, `perfect3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m09; координатор): на экране итога урока (не поверх вопроса), когда ни одной ошибки: монета 128 «wow» с бликами и сиянием →
// штамп «ИДЕАЛ» падает (плашка темы, без рамки: scale 3 → 1, поворот −10°, 600 мс) на 0,9 с → «удар» на 1,5 с (стоп-кадр 420 мс + дрожь 700 мс + тяжёлый хаптик) → конфетти цветов темы на 1,7 с → «N из N»,
// «Ни одной ошибки · +N монет» и «Дальше» по 200 мс с 2,0 с. Монеты — обычные за урок (число приходит из итога, «≈150» в коде нет), без множителей. Компонент ничего не пишет и не начисляет;
// условие показа (100 % без ошибок) и подключение к экрану итога — вызывающий. Звук идеального урока ведёт мост sound_v2 (pm.complete.perfect → lesson_perfect) — здесь только хаптик. reduceMotion — сразу итоговый кадр.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { hapticHeavyImpact, hapticTap } from '../../hooks/use-haptics';
import MomentCoin from '../moments/MomentCoin';
import { useFireOnce } from '../moments/use_fire_once';
import { MomentFullScreen } from '../spire/moments/moments_layout';
import { useMomentRumble } from '../spire/moments/moments_effects';
import { stepMomentText } from '../spire/moments/step_moment_strings';
import StreakConfetti from '../streak/moments/StreakConfetti';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useSpireShadow } from '../spire/useSpireShadow';
import { V2Button } from '../v2/V2Kit';
import { spireGameText } from '../spire/spire_game_strings';
import { perfectMomentText } from './perfect_moment_strings';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../moments/title_scale';

/** Тайминги образца, мс: штамп 900, удар 1500, конфетти 1700, тексты 2000 + 200 × i. */
export const PERFECT_MOMENT_TIMELINE = { stamp: 900, hit: 1500, confetti: 1700, texts: 2000, textStep: 200 } as const;

const lessonPerfectTestId = (base: string): string => `${base}-stamp`;

export type LessonPerfectMomentProps = Readonly<{
  lang: Lang;
  /** Ранг монеты 0…19; null — базовая. */
  coinRank: number | null;
  /** Заданий в уроке (в образце 20): «N из N». */
  total: number;
  /** Монеты за урок (обычные, без множителей) — из итога урока. */
  coinsEarned: number;
  onNext: () => void;
  testID?: string;
}>;

function LessonPerfectMoment({ lang, coinRank, total, coinsEarned, onNext, testID = 'lesson-perfect' }: LessonPerfectMomentProps) {
  // зачем (координатор 14.10, аудит Optimistic UI): тап срабатывает один раз синхронно; родитель в onNext/onPlay СНАЧАЛА закрывает окно, потом навигация/запись
  const fire = useFireOnce('LESSON-PERFECT');
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const rumble = useMomentRumble();
  const stamp = useSharedValue(reduceMotion ? 1 : 0);
  const flash = useSharedValue(0);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    console.log(`[LESSON-PERFECT] показ: ${total} из ${total}, монеты=${coinsEarned} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) return undefined;
    const T = PERFECT_MOMENT_TIMELINE;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => { stamp.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) }); void hapticTap(); }, T.stamp));
    timers.push(setTimeout(() => {
      flash.value = withSequence(withTiming(1, { duration: 0 }), withDelay(420, withTiming(0, { duration: 0 })));
      rumble.play();
      void hapticHeavyImpact();
    }, T.hit));
    timers.push(setTimeout(() => setConfetti(true), T.confetti));
    return () => { timers.forEach(clearTimeout); cancelAnimation(stamp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, stamp.value * 4),
    transform: [{ rotate: '-10deg' }, { scale: 3 - 2 * stamp.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.16 }));
  const textIn = (i: number) => (reduceMotion ? undefined : FadeIn.delay(PERFECT_MOMENT_TIMELINE.texts + i * PERFECT_MOMENT_TIMELINE.textStep).duration(400));

  return (
    <MomentFullScreen testID={testID} glowTop="36%">
      <StreakConfetti fire={confetti} n={80} />
      <Animated.View style={[s.full, rumble.style]}>
        <View style={s.body}>
          <View style={s.coinBox}>
            <MomentCoin rank={coinRank} size={128} mood="wow" glints testID={`${testID}-coin`} />
            <View style={s.stampWrap} pointerEvents="none">
              <Animated.View style={[s.stamp, { backgroundColor: p.control }, sh.plate, stampStyle]} testID={`${lessonPerfectTestId(testID)}`}>
                <Text style={[s.stampText, { color: p.accentTextSafe }]}>{perfectMomentText(lang, 'stamp')}</Text>
              </Animated.View>
            </View>
          </View>
          <Animated.Text entering={textIn(0)} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.hXl, { color: p.text }]} testID={`${testID}-title`}>{stepMomentText(lang, 'ofTasks', { ok: total, all: total })}</Animated.Text>
          <Animated.Text entering={textIn(1)} style={[s.p, { color: p.textSecondary }]} testID={`${testID}-sub`}>{perfectMomentText(lang, 'noMistakes', { n: coinsEarned })}</Animated.Text>
        </View>
        <Animated.View entering={textIn(2)} style={s.foot}>
          <V2Button label={spireGameText(lang, 'onward')} icon="arrow-forward" onPress={() => fire(onNext, 'next')} testID={`${testID}-next`} />
        </Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />{/* theme-exempt: стоп-кадр образца — светлая вуаль */}
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  // `.full`: колонка, поля 24, верх 76 / низ 36
  full: { flex: 1, paddingHorizontal: 24, paddingTop: 76, paddingBottom: 36 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coinBox: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  // `.stamp`: по центру монеты (50 % / 44 %), padding 10/20, радиус 14, 28/800, разрядка 3
  stampWrap: { position: 'absolute', left: -60, right: -60, top: '30%', alignItems: 'center' },
  stamp: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14 },
  stampText: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: 3 },
  hXl: { marginTop: 24, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  p: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  foot: { gap: 0 },
});

export default memo(LessonPerfectMoment);
