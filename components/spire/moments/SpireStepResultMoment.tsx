// ═══════════════════════════════════════════════════════════════════════════
// SpireStepResultMoment.tsx — момент m06 «Ступень пройдена / не пройдена» (эталон engagement-moments-v3-all.html, `stepPass3` / `stepFail3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m06; координатор): итог ступени — отдельный экран темы поверх экрана ступени, а не плашка у дока. Пройдена: кольцо таймера докручивается
// с бегущими цифрами (Reanimated на UI-потоке, цифры — по таймеру JS), монета радуется со звёздами и облачком «Чисто!», лесенка этажа растёт по 60 мс на ступеньку, «Дальше». Не пройдена (3 ошибки / время / выход) — без стыда:
// три погасших сердца, монета дрожит и кивает «Ещё раз?», главная «Ещё раз — другой набор», вторичная «К башне» (как в коде: «Ещё раз» даёт другой набор). Все числа — из итога ступени (SpireStepOutcome) и config/spire_v1:
// время и бюджет, ошибки, ступень на этаже, монеты за ступень; «N из 10» — по числу ошибок. Компонент ничего не пишет: «Дальше»/«Ещё раз» зовут прежний обработчик подъёма (climb), «К башне» — dismissOutcome.
// Показывается только за флагом moments_v3 (решает вызывающий); kinds floor/summit/save_failed — другой момент (m07) или прежняя плашка.
// ═══════════════════════════════════════════════════════════════════════════
import { V2_TYPE } from '../../../constants/v2Style';
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import type { SpireStepOutcome } from '../../../app/spire/use_spire_game';
import type { SpireCoinsConfig } from '../../../modules/spire/config_contract';
import { hapticMediumImpact, hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { playEvent } from '../../../modules/sound_v2/sound_bank';
import { playUnlessRecentlyPlayed } from '../../../modules/sound_v2/legacy_bridge';
import MomentCoin from '../../moments/MomentCoin';
import { V2Button } from '../../v2/V2Kit';
import { spireClock, spireGameText } from '../spire_game_strings';
import { SPIRE_FLOOR_COUNT, spireStepsIn } from '../spire_tower_model';
import { useSpirePalette } from '../useSpirePalette';
import { MomentFullScreen } from './moments_layout';
import { stepMomentText } from './step_moment_strings';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../../moments/title_scale';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
/** В ступени 10 заданий (spire_game_strings.failSub: «Новый набор из 10 заданий»). */
const TASKS_PER_STEP = 10;
const RING = 110;
const RING_R = 47;
const RING_LEN = 2 * Math.PI * RING_R;
/** Тайминги образца: кольцо 0,2 с + 1,1 с; монета 1,4 с; лесенка 1,9 с / провал: дрожь 0,3 с, кивок 1,1 с. */
export const STEP_MOMENT_TIMELINE = { ring: 200, ringMs: 1100, cheer: 1400, stairs: 1900, shiver: 300, nod: 1100 } as const;

export type SpireStepResultMomentProps = Readonly<{
  lang: Lang;
  /** Итог ступени: kind 'passed' или 'failed'. */
  outcome: SpireStepOutcome;
  coins: SpireCoinsConfig;
  /** Ранг монеты человека 0…19; null — базовая. */
  coinRank: number | null;
  /** «Дальше» (пройдена) / «Ещё раз — другой набор» (не пройдена): прежний подъём (climb). */
  onAgain: () => void;
  /** «К башне» (не пройдена): закрыть итог. */
  onLater: () => void;
  busy?: boolean;
  testID?: string;
}>;

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

function PassView({ lang, outcome, coins, coinRank, onAgain, busy, testID }: SpireStepResultMomentProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const ratio = outcome.budgetMs > 0 ? Math.max(0, Math.min(1, outcome.usedMs / outcome.budgetMs)) : 0;
  const fill = useSharedValue(reduceMotion ? ratio : 0);
  const [shownMs, setShownMs] = useState(reduceMotion ? outcome.usedMs : 0);
  const [cheer, setCheer] = useState(reduceMotion);
  const floorNow = Math.min(outcome.local.floor, SPIRE_FLOOR_COUNT);
  const stairsN = spireStepsIn(floorNow);
  const stepK = Math.max(0, Math.min(stairsN, outcome.local.stepInFloor));

  useEffect(() => {
    console.log(`[STEP-MOMENT] пройдена: время=${outcome.usedMs}/${outcome.budgetMs} ошибок=${outcome.errors} ступень=${outcome.local.stepInFloor}/${stairsN} монеты=${coins.perStep} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    // зачем: игра уже сыграла 'step' мгновенно — момент повторит только если прошло > 400 мс
    playUnlessRecentlyPlayed('step', 'SpireStepResultMoment');
    if (reduceMotion) return undefined;
    const T = STEP_MOMENT_TIMELINE;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | null = null;
    timers.push(setTimeout(() => {
      playEvent('tap');
      fill.value = withTiming(ratio, { duration: T.ringMs, easing: Easing.bezier(0.23, 1, 0.32, 1) });
      const started = Date.now();
      interval = setInterval(() => {
        const k = Math.min(1, (Date.now() - started) / T.ringMs);
        setShownMs(Math.round(outcome.usedMs * (1 - Math.pow(1 - k, 3))));
        if (k >= 1 && interval) { clearInterval(interval); interval = null; }
      }, 40);
    }, T.ring));
    timers.push(setTimeout(() => { setCheer(true); void hapticSuccess(); }, T.cheer));
    timers.push(setTimeout(() => { playEvent('correct'); void hapticTap(); }, T.stairs));
    return () => { timers.forEach(clearTimeout); if (interval) clearInterval(interval); cancelAnimation(fill); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - fill.value) }));
  const clean = outcome.errors === 0;
  const errorsText = capitalize(clean ? spireGameText(lang, 'noErrors') : spireGameText(lang, 'errorsN', { n: outcome.errors }));

  return (
    <>
      <View style={s.body}>
        <View style={s.rowTop}>
          <View style={s.timer} accessible accessibilityLabel={`${spireClock(outcome.usedMs)} ${stepMomentText(lang, 'ofBudget', { t: spireClock(outcome.budgetMs) })}`}>
            <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
              <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={p.control} strokeWidth={9} />
              <AnimatedCircle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={p.cta} strokeWidth={9} strokeLinecap="round" strokeDasharray={RING_LEN} animatedProps={ringProps} rotation={-90} origin={`${RING / 2}, ${RING / 2}`} />
            </Svg>
            <View style={s.timerText} pointerEvents="none">
              <Text style={[s.timerValue, { color: p.text }]} testID={`${testID}-time`}>{spireClock(shownMs)}</Text>
              <Text style={[s.timerSmall, { color: p.textSecondary }]}>{stepMomentText(lang, 'ofBudget', { t: spireClock(outcome.budgetMs) })}</Text>
            </View>
          </View>
          <MomentCoin rank={coinRank} size={84} mood={cheer ? 'cheer' : 'idle'} say={cheer && clean ? stepMomentText(lang, 'clean') : undefined} emote={cheer ? 'star' : null} emoteCount={3} testID={`${testID}-coin`} />
        </View>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(300)} style={[s.hXl, { color: p.text }]} testID={`${testID}-title`}>{stepMomentText(lang, 'ofTasks', { ok: TASKS_PER_STEP - outcome.errors, all: TASKS_PER_STEP })}</Animated.Text>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(400)} style={[s.p, { color: p.textSecondary }]}>{`${errorsText} · +${coins.perStep} ${spireGameText(lang, 'coins')}`}</Animated.Text>
        <View style={s.stair} accessible accessibilityLabel={spireGameText(lang, 'onFloorProgress', { k: stepK, n: stairsN })}>
          {Array.from({ length: stairsN }, (_, i) => i + 1).map((i) => (
            <Animated.View
              key={i}
              entering={reduceMotion ? undefined : FadeIn.delay(STEP_MOMENT_TIMELINE.stairs - 500 + i * 60)}
              style={[s.stairBar, { height: 28 + i * 5, backgroundColor: i <= stepK ? p.cta : p.control }]}
            />
          ))}
        </View>
        <Text style={[s.small, { color: p.textSecondary }]}>{spireGameText(lang, 'onFloorProgress', { k: stepK, n: stairsN })}</Text>
      </View>
      <View style={s.foot}>
        <V2Button label={spireGameText(lang, 'onward')} icon="arrow-forward" onPress={onAgain} disabled={busy} testID={`${testID}-next`} />
      </View>
    </>
  );
}

function FailView({ lang, outcome, coinRank, onAgain, onLater, busy, testID }: SpireStepResultMomentProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const [mood, setMood] = useState<'idle' | 'shiver' | 'nod'>(reduceMotion ? 'idle' : 'idle');
  const [sweat, setSweat] = useState(false);
  const [asked, setAsked] = useState(reduceMotion);
  const heartsLost = outcome.failReason === 'hearts';
  const title = heartsLost ? stepMomentText(lang, 'failHearts') : outcome.failReason === 'timeout' ? spireGameText(lang, 'failTimeout') : outcome.failReason === 'backed_out' ? spireGameText(lang, 'failBack') : spireGameText(lang, 'failHearts');

  useEffect(() => {
    console.log(`[STEP-MOMENT] не пройдена: причина=${String(outcome.failReason)} этаж=${outcome.floorBefore} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) return undefined;
    const T = STEP_MOMENT_TIMELINE;
    const a = setTimeout(() => { setMood('shiver'); setSweat(true); playEvent('wrong'); void hapticMediumImpact(); }, T.shiver);
    const b = setTimeout(() => { setMood('nod'); setSweat(false); setAsked(true); playEvent('tap'); void hapticTap(); }, T.nod);
    return () => { clearTimeout(a); clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  return (
    <>
      <View style={s.body}>
        <View style={s.hearts} accessible={false} importantForAccessibility="no-hide-descendants">
          {[0, 1, 2].map((i) => (
            <Animated.View key={i} entering={reduceMotion ? undefined : FadeIn.delay(i * 150)}>
              <Ionicons name="heart" size={36} color={heartsLost ? p.textSecondary : p.wrong} style={heartsLost ? s.heartOff : undefined} />
            </Animated.View>
          ))}
        </View>
        <View style={s.coinGap}>
          <MomentCoin rank={coinRank} size={80} mood={mood} say={asked ? stepMomentText(lang, 'againQ') : undefined} emote={sweat ? 'sweat' : null} emoteCount={2} testID={`${testID}-coin`} />
        </View>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(450)} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.hLg, { color: p.text }]} testID={`${testID}-title`}>{title}</Animated.Text>
        <Animated.Text entering={reduceMotion ? undefined : FadeIn.delay(600)} style={[s.p, { color: p.textSecondary }]}>{spireGameText(lang, 'failSub', { n: outcome.floorBefore })}</Animated.Text>
      </View>
      <View style={s.foot}>
        <V2Button label={stepMomentText(lang, 'retrySet')} icon="arrow-forward" onPress={onAgain} disabled={busy} testID={`${testID}-again`} />
        <View style={s.gap} />
        <V2Button label={stepMomentText(lang, 'toTower')} variant="secondary" onPress={onLater} testID={`${testID}-later`} />
      </View>
    </>
  );
}

function SpireStepResultMoment(props: SpireStepResultMomentProps) {
  const testID = props.testID ?? 'step-moment';
  const passed = props.outcome.kind !== 'failed';
  return (
    <MomentFullScreen testID={testID}>
      <View style={s.full}>
        {passed ? <PassView {...props} testID={testID} /> : <FailView {...props} testID={testID} />}
      </View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  // `.full`: колонка, поля 24, верх 76 / низ 36 (+ безопасные зоны задаёт MomentFullScreen/родитель)
  full: { flex: 1, paddingHorizontal: 24, paddingTop: 76, paddingBottom: 36 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  timer: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  timerText: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  timerValue: { fontSize: 24, lineHeight: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m06: «из 2:00» 13/17 · 600
  timerSmall: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  hXl: { marginTop: 20, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m06: «3 ошибки — ступень не пройдена» 24/30 · 800 · −0,3
  hLg: { marginTop: 14, ...V2_TYPE.momentTitleLg, textAlign: 'center' },
  p: { marginTop: 4, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  stair: { marginTop: 22, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  stairBar: { flex: 1, borderRadius: 6 },
  small: { marginTop: 8, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  hearts: { flexDirection: 'row', gap: 10 },
  heartOff: { opacity: 0.45 },
  coinGap: { marginTop: 16 },
  foot: { gap: 0 },
  gap: { height: 12 },
});

export default memo(SpireStepResultMoment);
