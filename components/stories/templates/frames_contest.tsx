// ═══════════════════════════════════════════════════════════════════════════
// frames_contest.tsx — анонс конкурса «Набор месяца», 4 кадра: старт, как голосовать, призы за места, награды за приглашения.
//
// зачем (владелец 29.10: «Да, делать в коде», макет claude.ai/artifact/GukYuSACfWas4P9toiG7sS v2): кадры — как в утверждённом макете, в той же
// системе, что 23 шаблона историй (тот же каркас кадра, классы .ov / .h1 / .p, часы кадра, «Уменьшить движение» — сразу конечный вид).
// Тексты простые, с цифрами, без метафор; числа — правила конкурса (STORY_CONTEST_RULES), событие может прислать свои. Цвета — только темы.
// Кнопка «Открыть наборы» и мелкая строка про спонсоров — у последнего кадра (STORY_TEMPLATE_CTA.contest_invite, рисует просмотр).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { LinearGradient } from '../../SafeLinearGradient';
import { EASE_OUT, frameMs, phase, useStoryFrameClock } from './story_frame_clock';
import { dayMonth } from './story_template_dates';
import { Art, FrameRoot, H1, Ov, P } from './story_template_kit';
import { Enter } from './story_template_motion';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps } from './story_template_registry';
import { tplText } from './story_template_strings';

// ── 24 · старт: веер из трёх наборов с ♥ ─────────────────────────────────────────────────────────────────────────────

type FanTile = Readonly<{ key: string; name: string; cards: number; hearts: number; pose: ViewStyle; hi: boolean }>;

export const ContestStartFrame = memo(function ContestStartFrame({ tpl, lang }: StoryFrameProps<'contest_start'>) {
  const pal = useStoryTemplatePalette();
  // зачем: веер — иллюстрация «наборы с голосами» из макета (примерные наборы и ♥), не данные события
  const tiles: readonly FanTile[] = [
    { key: 'a', name: tplText(lang, 'contestSamplePackA'), cards: 48, hearts: 31, pose: s.t1, hi: false },
    { key: 'c', name: tplText(lang, 'contestSamplePackC'), cards: 36, hearts: 27, pose: s.t3, hi: false },
    { key: 'b', name: tplText(lang, 'contestSamplePackB'), cards: 126, hearts: 42, pose: s.t2, hi: true },
  ];
  return (
    <FrameRoot testID="story-tpl-contest_start">
      <Art>
        <Enter kind="pop" d={120} style={s.fan}>
          {tiles.map((t) => (
            <View key={t.key} style={[s.tile, t.pose, { backgroundColor: pal.card, boxShadow: `0 16px 36px -16px ${mix(pal.shTint, 0.7)}` }]}>
              {t.hi ? (
                <View style={s.tileClip} pointerEvents="none">
                  <LinearGradient colors={[mix(pal.accG, 0.26), mix(pal.accG, 0)]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
                </View>
              ) : null}
              <Text style={[s.tileCards, { color: pal.sec }]}>{tplText(lang, 'contestCards', { cards: t.cards })}</Text>
              <View>
                <Text style={[s.tileName, { color: pal.tx }]}>{t.name}</Text>
                <Text style={[s.tileHearts, { color: pal.acc }]}>♥ {t.hearts}</Text>
              </View>
            </View>
          ))}
        </Enter>
      </Art>
      <Ov text={tplText(lang, 'contestOverline')} d={360} />
      <H1 text={tplText(lang, 'contestStartTitle', { date: dayMonth(lang, tpl.startMs) })} d0={440} />
      <P text={tplText(lang, 'contestStartText')} d={620} />
    </FrameRoot>
  );
});

// ── 25 · как голосовать: три крупных числа ───────────────────────────────────────────────────────────────────────────

const NumTile = memo(function NumTile({ value, label, reward, d, hi }: Readonly<{ value: number; label: string; reward?: string; d: number; hi?: boolean }>) {
  const pal = useStoryTemplatePalette();
  return (
    <Enter d={d} style={[s.num, hi ? null : { backgroundColor: mix(pal.tx, 0.07) }]}>
      {hi ? (
        <View style={s.numClip} pointerEvents="none">
          <LinearGradient colors={[mix(pal.accG, 0.3), mix(pal.accG, 0.1)]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <Text style={[s.numV, { color: pal.tx }]}>{value}</Text>
      <Text style={[s.numL, { color: pal.sec }]}>{label}</Text>
      {reward ? <Text style={[s.numR, { color: pal.acc }]}>{reward}</Text> : null}
    </Enter>
  );
});

export const ContestVoteFrame = memo(function ContestVoteFrame({ tpl, lang }: StoryFrameProps<'contest_vote'>) {
  return (
    <FrameRoot testID="story-tpl-contest_vote">
      <Art>
        <View style={s.nums}>
          <NumTile value={tpl.minDays} label={tplText(lang, 'contestVoteDays', { days: tpl.minDays })} d={120} />
          <NumTile value={tpl.minLessons} label={tplText(lang, 'contestVoteLessons', { done: tpl.minLessons })} d={200} />
          <NumTile value={tpl.votesPerMonth} label={tplText(lang, 'contestVoteVotes', { votes: tpl.votesPerMonth })} d={280} />
        </View>
      </Art>
      <Ov text={tplText(lang, 'contestVoteOverline')} d={360} />
      <H1 text={tplText(lang, 'contestVoteTitle')} d0={440} />
      <P text={tplText(lang, 'contestVoteText')} d={620} />
    </FrameRoot>
  );
});

// ── 26 · призы за места: лесенка 3 → 2 → 1 ───────────────────────────────────────────────────────────────────────────

/** Ступень вырастает снизу (scaleY .4 → 1 за 700 мс, ease-out) — от часов кадра: пауза останавливает, «Уменьшить движение» — сразу конец. */
const Step = memo(function Step({ place, months, height, d, top, lang }: Readonly<{ place: number; months: number; height: `${number}%`; d: number; top: boolean; lang: Lang }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const rise = useAnimatedStyle(() => {
    const e = EASE_OUT(phase(frameMs(progress.value, durationMs, final), d, 700));
    return { opacity: e, transform: [{ scaleY: 0.4 + 0.6 * e }] };
  });
  return (
    <Animated.View style={[s.step, { height }, top ? null : { backgroundColor: mix(pal.tx, 0.08) }, rise]}>
      {top ? (
        <View style={s.stepClip} pointerEvents="none">
          <LinearGradient colors={[mix(pal.accG, 0.34), mix(pal.accG, 0.12)]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <Text style={[s.stepPlace, { color: top ? pal.acc : pal.sec }]}>{tplText(lang, 'contestPlace', { place })}</Text>
      <Text style={[s.stepPrize, { color: pal.tx }]}>Plus</Text>
      <Text style={[s.stepMonths, { color: pal.sec }]}>{tplText(lang, 'contestPlusMonths', { months })}</Text>
    </Animated.View>
  );
});

export const ContestPrizesFrame = memo(function ContestPrizesFrame({ tpl, lang }: StoryFrameProps<'contest_prizes'>) {
  const [first, second, third] = tpl.plusMonths;
  return (
    <FrameRoot testID="story-tpl-contest_prizes">
      <Art>
        <View style={s.ladder} accessible accessibilityLabel={[3, 2, 1].map((place) => `${tplText(lang, 'contestPlace', { place })}: Plus ${tplText(lang, 'contestPlusMonths', { months: tpl.plusMonths[place - 1] ?? 0 })}`).join(', ')}>
          <Step place={3} months={third} height="60%" d={150} top={false} lang={lang} />
          <Step place={2} months={second} height="78%" d={300} top={false} lang={lang} />
          <Step place={1} months={first} height="100%" d={450} top lang={lang} />
        </View>
      </Art>
      <Ov text={tplText(lang, 'contestPrizesOverline')} d={360} />
      <H1 text={tplText(lang, 'contestPrizesTitle')} d0={440} />
      <P text={tplText(lang, 'contestPrizesText')} d={620} />
    </FrameRoot>
  );
});

// ── 27 · награды за приглашения: 1 друг и 3 друга ───────────────────────────────────────────────────────────────────

export const ContestInviteFrame = memo(function ContestInviteFrame({ tpl, lang }: StoryFrameProps<'contest_invite'>) {
  return (
    <FrameRoot testID="story-tpl-contest_invite">
      <Art>
        <View style={[s.nums, s.nums2]}>
          <NumTile value={1} label={tplText(lang, 'contestInviteOne')} reward={tplText(lang, 'contestInviteOneReward', { coins: tpl.coins })} d={120} />
          <NumTile value={tpl.friends} label={tplText(lang, 'contestInviteThree', { friends: tpl.friends })} reward={tplText(lang, 'contestInviteThreeReward', { plusDays: tpl.plusDays })} d={220} hi />
        </View>
      </Art>
      <Ov text={tplText(lang, 'contestInviteOverline')} d={360} />
      <H1 text={tplText(lang, 'contestInviteTitle', { coins: tpl.coins })} d0={440} />
      <P text={tplText(lang, 'contestInviteText')} d={620} />
    </FrameRoot>
  );
});

const s = StyleSheet.create({
  // веер 240 × 170: плитки 118 × 150, радиус 22, крайние повёрнуты на ∓9° и сдвинуты на ∓66
  fan: { width: 240, height: 170, marginBottom: 4 },
  tile: { position: 'absolute', top: 10, left: 61, width: 118, height: 150, borderRadius: 22, paddingTop: 14, paddingHorizontal: 12, paddingBottom: 12, justifyContent: 'space-between' },
  tileClip: { ...StyleSheet.absoluteFillObject, borderRadius: 22, overflow: 'hidden' },
  t1: { transform: [{ rotate: '-9deg' }, { translateX: -66 }] },
  t3: { transform: [{ rotate: '9deg' }, { translateX: 66 }] },
  t2: { top: 0, zIndex: 2 },
  tileCards: { fontSize: 12, lineHeight: 15, fontWeight: '600' },
  tileName: { fontSize: 15, lineHeight: 19, fontWeight: '700' },
  tileHearts: { fontSize: 13, lineHeight: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // три числа: ряд 334, зазор 10, плитка радиус 22, число 44/48 800
  nums: { flexDirection: 'row', gap: 10, width: 334, maxWidth: '100%', marginBottom: 8 },
  nums2: { width: 300 },
  num: { flex: 1, borderRadius: 22, paddingTop: 16, paddingHorizontal: 8, paddingBottom: 14, alignItems: 'center' },
  numClip: { ...StyleSheet.absoluteFillObject, borderRadius: 22, overflow: 'hidden' },
  numV: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  numL: { marginTop: 4, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  numR: { marginTop: 10, fontSize: 17, lineHeight: 21, fontWeight: '800', textAlign: 'center' },
  // лесенка 334 × 230: ступени растут снизу, верх скруглён 20, низ 10
  ladder: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, width: 334, maxWidth: '100%', height: 230, marginBottom: 8 },
  step: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', paddingTop: 12, paddingHorizontal: 6, gap: 6, transformOrigin: '50% 100%' },
  stepClip: { ...StyleSheet.absoluteFillObject, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden' },
  stepPlace: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' },
  stepPrize: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  stepMonths: { marginTop: -4, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
});
