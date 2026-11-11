// ═══════════════════════════════════════════════════════════════════════════
// frames_instead_b.tsx — кадры 9–15 и 17 макета stories-instead-of-modals.html: подарок по приглашению, подарок закончился,
// идеальный урок, открыт новый урок, оценка приложения, приз за набор месяца, первый разговор, Пик · тебя обошли.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях», затем «Да, в приложение»):
// каждый кадр заменяет одно всплывающее окно из аудита (какое именно — в комментарии над кадром). Разметка, задержки и кегли —
// из `render()` кадров макета построчно; детали — из набора историй (две монеты, кольцо со сменой номера, пьедестал, дорожки).
//
// ФАЙЛ ПОКА НИКЕМ НЕ ИМПОРТИРУЕТСЯ — см. шапку frames_instead_a.tsx и пакет
// docs/work/tasks/stories-instead-of-modals-frames-2026-11-11.md
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../../constants/i18n';
import { spireTierName } from '../../../modules/spire/tier_names';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { Art, Confetti, FrameRoot, H1, Ov, P, Ring, Stat, Stats, k, statNumberStyle } from './story_template_kit';
import { CountUp, Enter } from './story_template_motion';
import { FromSide, Grow, LevelSwap } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryBubble, StoryPodiumEntry } from './story_template_registry';
import { tplMonthIn, tplNumber, tplText, tplWord } from './story_template_strings';
import { plusOfferText } from './story_plus_offer_strings';
import { Bubbles, IconDisc } from './story_instead_parts';
import { insteadText } from './story_instead_strings';

/** Данные кадров — только то, что событие уже знает. При подключении переезжают в story_template_registry. */
export type ReferralWelcomeStory = Readonly<{ friendName: string; friendRank: number | null; giftDays: number }>;
export type ReferralEndedStory = Readonly<{ endedLabel: string }>;
export type PerfectLessonStory = Readonly<{ lessonNo: number; correct: number; total: number; coins: number }>;
export type LessonOpenStory = Readonly<{ lessonNo: number; nextLessonNo: number; topic: string | null }>;
export type RateAppStory = Readonly<{ lessonsDone: number }>;
/** `month` — 1…12; `podium` — тройка месяца, своя строка помечена `me`. */
export type PackPrizeStory = Readonly<{ place: 1 | 2 | 3; month: number; packName: string; saves: number; coins: number; podium: readonly StoryPodiumEntry[] }>;
export type FirstDialogStory = Readonly<{ turns: number; minutes: number; bubbles: readonly StoryBubble[] }>;
export type PeakOvertakeStory = Readonly<{ tier: number; rivalName: string; rivalRank: number | null; rivalScore: number; myScore: number; daysLeft: number }>;

type FrameProps<D> = Readonly<{ tpl: D; lang: Lang; myRank: number | null }>;

// ── 9 · подарок по приглашению (взамен реферального окна-приветствия) ────────────────────────────────

export const ReferralWelcomeFrame = memo(function ReferralWelcomeFrame({ tpl, lang, myRank }: FrameProps<ReferralWelcomeStory>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-instead-ref-welcome">
      <Art>
        <View style={f.pair}>
          <FromSide side="left"><SpireRankCoin rank={tpl.friendRank} size={96} /></FromSide>
          <FromSide side="right" style={f.pairSecond}><SpireRankCoin rank={myRank} size={96} /></FromSide>
          <Enter kind="pop" d={800} style={[f.ok, { backgroundColor: pal.accG }]}>
            <Ionicons name="checkmark" size={22} color={pal.accInk} style={f.okIcon} />
          </Enter>
        </View>
      </Art>
      <Ov text={insteadText(lang, 'refInvites', { name: tpl.friendName })} d={500} />
      <H1 text={insteadText(lang, 'refTitle', { plusDays: tpl.giftDays })} d0={580} />
      <P text={insteadText(lang, 'refText', { name: tpl.friendName })} d={900} />
    </FrameRoot>
  );
});

// ── 10 · подарок закончился (взамен окна «Реферальный доступ закончился» на вкладке «Друзья») ────────

export const ReferralEndedFrame = memo(function ReferralEndedFrame({ tpl, lang }: FrameProps<ReferralEndedStory>) {
  return (
    <FrameRoot testID="story-tpl-instead-ref-ended">
      <Art><IconDisc icon="hourglass" /></Art>
      <Ov text={insteadText(lang, 'refEndedOverline')} d={380} />
      <H1 text={insteadText(lang, 'refEndedTitle')} d0={460} small />
      <P text={insteadText(lang, 'refEndedText', { date: tpl.endedLabel })} d={800} />
    </FrameRoot>
  );
});

// ── 11 · идеальный урок (взамен окна «Идеальный урок» на итоге) ──────────────────────────────────────

export const PerfectLessonFrame = memo(function PerfectLessonFrame({ tpl, lang, myRank }: FrameProps<PerfectLessonStory>) {
  const pal = useStoryTemplatePalette();
  const star = pal.isLight ? pal.accG : pal.accB;
  return (
    <FrameRoot testID="story-tpl-instead-perfect" layer={<Confetti n={18} d0={700} />}>
      <Art>
        <View style={f.stars}>
          <Enter kind="pop" d={160}><Ionicons name="star" size={54} color={star} style={f.star54} /></Enter>
          <Enter kind="pop" d={280} style={f.starMid}><Ionicons name="star" size={74} color={star} style={f.star74} /></Enter>
          <Enter kind="pop" d={400}><Ionicons name="star" size={54} color={star} style={f.star54} /></Enter>
        </View>
      </Art>
      <Enter d={520}>
        <Text style={[k.bigS, { color: pal.tx }]}>{tplNumber(tpl.correct)}<Text style={{ color: pal.sec }}>/{tplNumber(tpl.total)}</Text></Text>
      </Enter>
      <Ov text={insteadText(lang, 'lessonOverline', { lessonNo: tpl.lessonNo })} d={680} />
      <H1 text={insteadText(lang, 'perfectTitle')} d0={760} />
      {tpl.coins > 0 ? (
        <Enter d={1050} style={[k.chip, { backgroundColor: mix(pal.tx, 0.12) }]}>
          <SpireRankCoin rank={myRank} size={20} />
          <Text style={[k.chipT, { color: pal.tx }]}>{insteadText(lang, 'plusCoins', { coins: tpl.coins })}</Text>
        </Enter>
      ) : null}
    </FrameRoot>
  );
});

// ── 12 · открыт новый урок (взамен окна «Новый урок открыт» на итоге) ────────────────────────────────

export const LessonOpenFrame = memo(function LessonOpenFrame({ tpl, lang }: FrameProps<LessonOpenStory>) {
  return (
    <FrameRoot testID="story-tpl-instead-lesson-open">
      <Art>
        <Ring frac={1}><LevelSwap from={String(tpl.lessonNo)} to={String(tpl.nextLessonNo)} /></Ring>
      </Art>
      <Ov text={insteadText(lang, 'openOverline', { lessonNo: tpl.lessonNo })} d={700} />
      <H1 text={insteadText(lang, 'openTitle', { next: tpl.nextLessonNo })} d0={780} />
      {tpl.topic ? <P text={insteadText(lang, 'openTopic', { topic: tpl.topic })} d={1020} /> : null}
    </FrameRoot>
  );
});

// ── 13 · оценка приложения (взамен окна «Оцените приложение» на итоге урока) ─────────────────────────

const FIVE = [{ id: 'star-1', d: 160 }, { id: 'star-2', d: 250 }, { id: 'star-3', d: 340 }, { id: 'star-4', d: 430 }, { id: 'star-5', d: 520 }] as const;

export const RateAppFrame = memo(function RateAppFrame({ tpl, lang }: FrameProps<RateAppStory>) {
  const pal = useStoryTemplatePalette();
  const star = pal.isLight ? pal.accG : pal.accB;
  return (
    <FrameRoot testID="story-tpl-instead-rate">
      <Art>
        <View style={f.five}>
          {FIVE.map((s) => <Enter key={s.id} kind="pop" d={s.d}><Ionicons name="star" size={44} color={star} style={f.star44} /></Enter>)}
        </View>
      </Art>
      <Ov text={insteadText(lang, 'rateOverline', { lessons: tpl.lessonsDone })} d={700} />
      <H1 text={insteadText(lang, 'rateTitle')} d0={780} />
      <P text={insteadText(lang, 'rateText')} d={1060} />
    </FrameRoot>
  );
});

// ── 14 · приз за набор месяца (взамен окна «Награда сообщества», которое возвращалось при каждом заходе) ──

/** Столбики макета: 1 место — 130, 2 — 96, 3 — 70; порядок колонок 2 · 1 · 3; задержки 200 / 320 / 440 по колонке слева направо. */
const PRIZE_BAR: Readonly<Record<1 | 2 | 3, number>> = { 1: 130, 2: 96, 3: 70 };
const PRIZE_ORDER: readonly (1 | 2 | 3)[] = [2, 1, 3];

export const PackPrizeFrame = memo(function PackPrizeFrame({ tpl, lang }: FrameProps<PackPrizeStory>) {
  const pal = useStoryTemplatePalette();
  const you = tplText(lang, 'you');
  const columns = useMemo(() => {
    const byPlace = new Map(tpl.podium.map((e) => [e.place, e] as const));
    return PRIZE_ORDER.map((place) => byPlace.get(place)).filter((e): e is StoryPodiumEntry => e !== undefined);
  }, [tpl.podium]);
  return (
    <FrameRoot testID="story-tpl-instead-pack-prize">
      {columns.length > 0 ? (
        <Art>
          <View style={f.podium}>
            {columns.map((e, i) => (
              <View key={e.place} style={f.pc}>
                <SpireRankCoin rank={e.rank} size={40} />
                {/* зачем (правило владельца: текст не обрезать и не ужимать): длинное имя переносится по центру колонки, столбик стоит на месте — колонка растёт вверх */}
                <Text style={[f.pcName, { color: pal.tx }]}>{e.me ? you : e.name}</Text>
                <Grow axis="y" d={200 + i * 120} dur={800} style={[f.bar, { height: PRIZE_BAR[e.place], backgroundColor: e.me ? pal.accG : mix(pal.tx, 0.12) }, e.me ? { boxShadow: `0 -10px 40px -10px ${pal.accGlow}` } : null]}>
                  <Text style={[f.barN, { color: e.me ? pal.accInk : pal.sec }]}>{e.place}</Text>
                </Grow>
              </View>
            ))}
          </View>
        </Art>
      ) : null}
      <Ov text={insteadText(lang, 'prizeOverline', { monthIn: tplMonthIn(lang, tpl.month) })} d={700} />
      <H1 text={insteadText(lang, 'prizeTitle', { place: tpl.place })} d0={780} small />
      <P text={insteadText(lang, 'prizeText', { pack: tpl.packName, count: tpl.saves })} d={1100} />
    </FrameRoot>
  );
});

// ── 15 · первый разговор (взамен окна «Первый разговор» в конце первого диалога с ИИ) ────────────────

export const FirstDialogFrame = memo(function FirstDialogFrame({ tpl, lang }: FrameProps<FirstDialogStory>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-instead-first-dialog">
      <Bubbles bubbles={tpl.bubbles.slice(0, 3)} d0={200} step={360} />
      <Ov text={plusOfferText(lang, 'dialogOverline')} d={1200} />
      <H1 text={insteadText(lang, 'firstDialogTitle')} d0={1280} small />
      <Stats>
        <Stat d={1600} value={<CountUp to={tpl.turns} d={1700} dur={700} style={statNumberStyle(pal)} />} label={tplWord(lang, 'turn', tpl.turns)} />
        <Stat d={1680} value={<CountUp to={tpl.minutes} d={1780} dur={700} style={statNumberStyle(pal)} />} label={tplWord(lang, 'minute', tpl.minutes)} />
      </Stats>
    </FrameRoot>
  );
});

// ── 17 · Пик · тебя обошли (взамен окон позиции Пика: до трёх подряд после ступени) ──────────────────

const RaceRow = memo(function RaceRow({ name, rank, share, value, lead, d }: Readonly<{ name: string; rank: number | null; share: number; value: number; lead: boolean; d: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <View style={f.raceBlock}>
      {/* зачем (правило владельца: текст не обрезать и не ужимать): имя стоит в потоке над дорожкой — длинное переносится и раздвигает строки, а не налезает на соседнюю */}
      <Text style={[f.raceName, { color: pal.sec }]}>{name}</Text>
      <View style={f.raceRow}>
      <SpireRankCoin rank={rank} size={36} />
      <View style={[f.track, { backgroundColor: mix(pal.tx, 0.1) }]}>
        <Grow axis="x" to={share} d={d} dur={1300} style={[f.trackFill, { backgroundColor: lead ? pal.accG : mix(pal.tx, 0.32) }]} />
      </View>
      <View style={f.raceValueBox}><Text style={[f.raceValue, { color: pal.tx }]}>{tplNumber(value)}</Text></View>
      </View>
    </View>
  );
});

export const PeakOvertakeFrame = memo(function PeakOvertakeFrame({ tpl, lang, myRank }: FrameProps<PeakOvertakeStory>) {
  const top = Math.max(1, tpl.rivalScore, tpl.myScore);
  const gap = Math.max(0, tpl.rivalScore - tpl.myScore); // guard-ok: разрыв для подписи кадра, очки не меняются
  return (
    <FrameRoot testID="story-tpl-instead-peak-overtake">
      <View style={f.race}>
        <RaceRow name={tpl.rivalName} rank={tpl.rivalRank} share={tpl.rivalScore / top} value={tpl.rivalScore} lead d={200} />
        <RaceRow name={tplText(lang, 'you')} rank={myRank} share={tpl.myScore / top} value={tpl.myScore} lead={false} d={320} />
      </View>
      <Ov text={tplText(lang, 'peakOverline', { league: spireTierName(tpl.tier, lang) })} d={900} />
      <H1 text={tplText(lang, 'overtakenTitle', { name: tpl.rivalName })} d0={980} />
      <P text={tplText(lang, 'overtakenGap', { gap, daysLeft: tpl.daysLeft })} d={1240} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .pair: высота 110; вторая монета −14; галочка 40 по центру (как у кадра «Новый друг»)
  pair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 110 },
  pairSecond: { marginLeft: -14 },
  ok: { position: 'absolute', left: '50%', top: '50%', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  okIcon: { lineHeight: 22 },
  // .stars: высота 90, зазор 8; средняя 74 с подъёмом −10 (как у кадра «Урок пройден»)
  stars: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 90 },
  star54: { lineHeight: 54 },
  star74: { lineHeight: 74 },
  starMid: { marginTop: -10 },
  // .stars.five: пять звёзд 44, зазор 6, высота 60
  five: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 60 },
  star44: { lineHeight: 44 },
  // .podium в этом кадре: высота 190; колонка 88, зазор 6; монета 40; столбик со скруглением сверху 16
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 190 },
  pc: { width: 88, alignItems: 'center', gap: 6 },
  pcName: { fontSize: 13, lineHeight: 17, fontWeight: '700', maxWidth: 88, textAlign: 'center' },
  bar: { width: 88, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center', paddingTop: 10 },
  barN: { fontSize: 20, lineHeight: 21, fontWeight: '800' },
  // .race: колонка, зазор 14, отступ снизу 24; строка: отступ 10, монета 36, дорожка 28 (радиус 14), число 62 справа 15/700
  race: { alignSelf: 'stretch', gap: 14, marginBottom: 24 },
  // имя: макет ставит его на 18 выше строки (left 58, 12/21) — в потоке это отступ слева 58 и нахлёст 3 на строку; блок несёт отступ 10 между строками
  raceBlock: { marginTop: -8 },
  raceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  raceName: { paddingLeft: 58, marginBottom: -3, fontSize: 12, lineHeight: 21, textAlign: 'left' },
  track: { flex: 1, minWidth: 0, height: 28, borderRadius: 14, overflow: 'hidden' },
  trackFill: { height: '100%', width: '100%', borderRadius: 14 },
  raceValueBox: { width: 62 },
  raceValue: { fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'right' },
});
