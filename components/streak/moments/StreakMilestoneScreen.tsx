// ═══════════════════════════════════════════════════════════════════════════
// StreakMilestoneScreen.tsx — полноэкранные рубежи серии: средний (50, 200, 300, 400, 600, 800, 900), большой (7, 30, 100), «Полтысячи» (500), «Год» (365),
// «Два года» (730), «Легенда» (1000). Образец: docs/design/v2-app/streak-milestones.html (`medium`, `big`, `half500`, `year`, `twoYears`, `legend` + init-такты).
//
// зачем (владелец 14.10: «перенести полноценно все модалы, точно по макетам»): у каждого уровня своя сцена и тайм-лист (streak_milestones.ts → STREAK_MOMENT_TIMELINE):
// такты включают стадии сцены — burst огня, морф в новую стадию с дрожью, тексты по 180–200 мс, акты года и легенды, фейерверки. Фон — экран темы (MomentFullScreen), всё из токенов
// текущей темы. «Пропустить» есть у года и легенды. Звук — имена событий, хаптик — на тактах. Reanimated на UI-треде; reduceMotion — сразу финальный вид. Ничего не начисляет и не пишет:
// ачивку, «Поделиться» и показ решает Ядро (флаг moments_v3). Монета — как в одобренном образце (кивок/эмоции на морфе и в «Легенде»); владелец 14.10 запретил только ФОРМУЛИРОВКИ про монету («задремала», «рада» и т. п.) — тексты сторож проверяет.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticSuccess, hapticTap } from '../../../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { V2Button } from '../../v2/V2Kit';
import MomentCoin from '../../moments/MomentCoin';
import MomentFirework, { useMomentRumble } from '../../spire/moments/moments_effects';
import { MomentFullScreen } from '../../spire/moments/moments_layout';
import { useSpirePalette } from '../../spire/useSpirePalette';
import StreakMomentFlame from './StreakMomentFlame';
import { HalfRing, MonthCalendar, MonthRing } from './StreakMomentRings';
import {
  STREAK_MILESTONES_WITH_SHARE, STREAK_MONTH_ARCS, STREAK_MOMENT_TIMELINE, nextStreakMilestone, streakFlameStage, streakMomentKind,
  type StreakMilestone, type StreakMomentKind,
} from './streak_milestones';
import { STREAK_SOUND_EVENTS, playStreakSound, type StreakSoundEvent } from './streak_moments_sound';
import { streakMilestoneTitle, streakMomentText } from './streak_moments_strings';

export type StreakMilestoneScreenProps = Readonly<{
  lang: Lang;
  /** Рубеж не малого уровня (малые — тост StreakMilestoneToast). */
  milestone: StreakMilestone;
  coinRank: number | null;
  onDone: () => void;
  /** Нет колбэка — кнопки «Поделиться» нет, даже у рубежей, где она предусмотрена. */
  onShare?: () => void;
  testID?: string;
}>;

/** Звук такта: имя события по id такта сцены. */
const CUE_SOUND: Readonly<Record<string, StreakSoundEvent>> = {
  burst: STREAK_SOUND_EVENTS.burst, text: STREAK_SOUND_EVENTS.tick, morph: STREAK_SOUND_EVENTS.morph, ring: STREAK_SOUND_EVENTS.riser,
  months: STREAK_SOUND_EVENTS.riser, act2: STREAK_SOUND_EVENTS.tick, act3: STREAK_SOUND_EVENTS.celebrate, fireworks: STREAK_SOUND_EVENTS.firework,
  fire1: STREAK_SOUND_EVENTS.firework, fire2: STREAK_SOUND_EVENTS.firework, fire3: STREAK_SOUND_EVENTS.firework, extra: STREAK_SOUND_EVENTS.celebrate,
};
const HEAVY_CUES: ReadonlySet<string> = new Set(['morph', 'fireworks', 'fire1']);

function Beat({ i, children }: Readonly<{ i: number; children: ReactNode }>) {
  const reduceMotion = useReducedMotion();
  return <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(i * 190).duration(500)}>{children}</Animated.View>;
}

function StreakMilestoneScreen({ lang, milestone, coinRank, onDone, onShare, testID = 'streak-milestone-screen' }: StreakMilestoneScreenProps) {
  const p = useSpirePalette();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const rumble = useMomentRumble();
  const kind: StreakMomentKind = streakMomentKind(milestone);
  const cues = STREAK_MOMENT_TIMELINE[kind];
  const [done, setDone] = useState<ReadonlySet<string>>(() => (reduceMotion ? new Set(cues.map((c) => c.id)) : new Set()));
  const [burstKey, setBurstKey] = useState(0);
  const [morphKey, setMorphKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fire = useCallback((id: string) => {
    setDone((prev) => new Set(prev).add(id));
    if (id === 'burst') setBurstKey((k) => k + 1);
    if (id === 'morph') { setMorphKey((k) => k + 1); rumble.play(); }
    if (id === 'fireworks') rumble.play();
    const snd = CUE_SOUND[id];
    if (snd) playStreakSound(snd);
    void (HEAVY_CUES.has(id) ? hapticSuccess() : hapticTap());
  }, [rumble]);

  useEffect(() => {
    if (reduceMotion) return;
    timers.current = cues.map((c) => setTimeout(() => fire(c.id), c.at));
    return () => timers.current.forEach(clearTimeout);
  }, [cues, fire, reduceMotion]);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setDone(new Set(cues.map((c) => c.id)));
  }, [cues]);

  const has = (id: string) => done.has(id);
  const stage = streakFlameStage(milestone);
  const title = streakMilestoneTitle(lang, milestone);
  const next = nextStreakMilestone(milestone);
  const toNext = next ? streakMomentText(lang, 'toNext', { next, left: next - milestone }) : streakMomentText(lang, 'legendSub');
  const overline = streakMomentText(lang, 'overline', { n: milestone });
  const showShare = !!onShare && STREAK_MILESTONES_WITH_SHARE.includes(milestone);
  const act = kind === 'year' || kind === 'legend' ? (has('act3') ? 3 : has('act2') ? 2 : 1) : 3;
  const finalAct = act === 3;
  const morphed = has('morph');
  const before = milestone - 1; // guard-ok: цифра огня ДО морфа (n−1, как в образце), вид — не баланс

  const T = (text: string, style: 'ov' | 'xl' | 'md' | 'p') => <Text style={[s[style], { color: style === 'ov' ? p.accentText : style === 'p' ? p.textSecondary : p.text }]}>{text}</Text>;
  const foot = (
    <View style={s.foot}>
      <V2Button label={streakMomentText(lang, 'next')} onPress={onDone} testID={`${testID}-next`} />
      {showShare ? <V2Button label={streakMomentText(lang, 'share')} onPress={onShare} variant="secondary" testID={`${testID}-share`} /> : null}
    </View>
  );

  // сцены: каждая возвращает содержимое `body` (+ при необходимости свой `foot`)
  let body: ReactNode;
  if (kind === 'medium') {
    body = (
      <>
        <StreakMomentFlame days={milestone} label={milestone} size={150} burstKey={burstKey || undefined} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
        {has('text') ? <Beat i={0}><View style={s.col}>{T(overline, 'ov')}{T(title, 'xl')}{T(toNext, 'p')}</View></Beat> : null}
      </>
    );
  } else if (kind === 'big') {
    body = (
      <>
        <View style={s.fireRow}>
          <StreakMomentFlame days={morphed ? milestone : before} label={morphed ? milestone : before} size={160} morphKey={morphKey || undefined} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
          <View style={s.coinBeside}><MomentCoin rank={coinRank} size={60} mood={morphed ? 'cheer' : 'idle'} shadow={false} emote={morphed ? 'star' : null} emoteKey={morphKey} emoteCount={3} /></View>
        </View>
        {has('text') ? (
          <Beat i={0}><View style={s.col}>
            {T(overline, 'ov')}{T(title, 'xl')}{next ? T(streakMomentText(lang, 'stageNew', { next }), 'p') : null}
            {milestone === 30 && has('extra') ? <View style={s.extra}><MonthCalendar lit={30} /></View> : null}
          </View></Beat>
        ) : null}
        <MomentFirework x={width / 2} y={200} r={120} n={40} fire={milestone === 100 && has('extra')} />
      </>
    );
  } else if (kind === 'half500') {
    body = (
      <>
        <HalfRing size={250} run={has('ring')}>
          <StreakMomentFlame days={milestone} label={milestone} size={150} burstKey={has('burst') ? burstKey || undefined : undefined} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
        </HalfRing>
        {has('text') ? <Beat i={0}><View style={s.col}>{T(overline, 'ov')}{T(title, 'xl')}{T(streakMomentText(lang, 'halfWay'), 'p')}</View></Beat> : null}
        <MomentFirework x={width / 2} y={220} r={140} n={40} fire={has('burst')} />
      </>
    );
  } else if (kind === 'twoYears') {
    body = (
      <>
        {T(overline, 'ov')}
        <View style={s.extra}><MonthRing rings={2} size={250} center={String(milestone)} lit={has('months')} stepMs={STREAK_MONTH_ARCS.twoYears.stepMs} /></View>
        {has('text') ? <Beat i={0}><View style={s.col}>{T(title, 'xl')}{T(streakMomentText(lang, 'untilLegend', { left: 1000 - milestone }), 'p')}</View></Beat> : null}
        <MomentFirework x={width / 2} y={260} r={130} fire={has('fireworks')} />
      </>
    );
  } else if (kind === 'year') {
    body = act === 1 ? (
      <>{T(overline, 'ov')}{T(streakMomentText(lang, 'yearAct1'), 'md')}<View style={s.extra}><MonthRing rings={1} size={250} center={String(milestone)} lit={has('months')} stepMs={STREAK_MONTH_ARCS.year.stepMs} /></View></>
    ) : (
      <>
        <StreakMomentFlame days={milestone} label={milestone} size={act === 2 ? 180 : 150} morphKey={morphKey || undefined} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
        {act === 2 ? T(streakMomentText(lang, 'stageNew', { next: 1000 }), 'ov') : null}
        {T(title, 'xl')}
        {act === 3 ? T(streakMomentText(lang, 'toNext', { next: 730, left: 730 - milestone }), 'p') : null}
        <MomentFirework x={width / 2} y={220} r={120} fire={has('morph')} />
        <MomentFirework x={width / 2} y={300} r={140} n={40} fire={has('act3')} />
      </>
    );
  } else {
    // legend
    body = act === 1 ? (
      <>
        <StreakMomentFlame days={morphed ? 1000 : 999} label={morphed ? 1000 : 999} size={170} morphKey={morphKey || undefined} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
        {T(overline, 'ov')}
      </>
    ) : act === 2 ? (
      <>
        <MomentCoin rank={19} size={130} mood="cheer" glints emote="star" emoteKey={1} emoteCount={6} />
        {T(title, 'xl')}{T(streakMomentText(lang, 'legendSub'), 'p')}
        <MomentFirework x={width / 2} y={200} r={120} fire={has('fire1')} />
        <MomentFirework x={width * 0.28} y={260} r={80} fire={has('fire2')} delayMs={0} />
        <MomentFirework x={width * 0.72} y={240} r={90} fire={has('fire3')} delayMs={0} />
      </>
    ) : (
      <>
        <StreakMomentFlame days={1000} label={1000} size={170} accessibilityLabel={streakMomentText(lang, 'flameA11y', { n: milestone })} />
        {T(streakMomentText(lang, 'finalStage'), 'ov')}{T(title, 'xl')}
        <MomentFirework x={width / 2} y={300} r={140} n={40} fire={has('act3')} />
      </>
    );
  }

  const withFoot = kind === 'medium' ? has('text') : kind === 'big' || kind === 'half500' || kind === 'twoYears' ? has('text') : finalAct;
  const skippable = (kind === 'year' || kind === 'legend') && !finalAct;
  const bodyKey = `${kind}-${act}`;
  return (
    <MomentFullScreen testID={testID}>
      <Animated.View style={[s.fill, { paddingTop: insets.top + 52, paddingBottom: insets.bottom + 24 }, rumble.style]}>
        <View key={bodyKey} style={s.body}>{body}</View>
        {withFoot ? <Beat i={2}>{foot}</Beat> : <View style={s.footSpacer} />}
        {skippable ? (
          <Pressable accessibilityRole="button" accessibilityLabel={streakMomentText(lang, 'skip')} onPress={skip} hitSlop={12} style={[s.skip, { top: insets.top + 12 }]} testID={`${testID}-skip`}>
            <Text style={[s.skipText, { color: p.textSecondary }]}>{streakMomentText(lang, 'skip')}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </MomentFullScreen>
  );
}

const COIN_OVERLAP = -20; // guard-ok: наложение монеты на огонь (вид), не баланс
const s = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 24 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  col: { alignItems: 'center', gap: 6, marginTop: 14 },
  fireRow: { flexDirection: 'row', alignItems: 'flex-end' },
  coinBeside: { marginLeft: COIN_OVERLAP, marginBottom: 10 },
  extra: { marginTop: 16, width: '100%', alignItems: 'center' },
  ov: { fontSize: 13, lineHeight: 17, letterSpacing: 1.6, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  xl: { fontSize: 34, lineHeight: 40, fontWeight: '800', textAlign: 'center' },
  md: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  p: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  foot: { gap: 12 },
  footSpacer: { height: 56 },
  skip: { position: 'absolute', right: 20, paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
});

export default memo(StreakMilestoneScreen);
