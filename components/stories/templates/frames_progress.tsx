// ═══════════════════════════════════════════════════════════════════════════
// frames_progress.tsx — кадры 5–8 макета stories-templates-v1.html: урок пройден, экзамен главы, Пик · вершина недели, Пик · итог недели.
//
// зачем (владелец 28.10: шаблоны «именно так», пиксель в пиксель): разметка, задержки и кегли — из `render()` TPL макета построчно
// (lesson: три звезды пружиной 200/340/480, три плитки 760/860/960; exam: кольцо 11 из 12 + счёт за 1,2 с, конфетти 20 с 1200;
// summit: башня раскрывается снизу за 1,5 с, конфетти 18 с 1400; peakweek: пьедестал 2 · 1 · 3, столбики растут 1 → 2 → 3, свой — в акценте).
// Башня — тот же SpireTowerSvg, что на экране Пика (наряд лиги, сцена темы).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spireTierName } from '../../../modules/spire/tier_names';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import SpireRankCoin from '../../spire/SpireRankCoin';
import SpireTowerSvg from '../../spire/SpireTowerSvg';
import { useSpireScene } from '../../spire/useSpireScene';
import { momentLeagueIn, momentText } from '../../spire/moments/moments_strings';
import { storyText, storyThousands } from '../story_strings';
import { Art, Confetti, FrameRoot, H1, Ov, P, Ring, Stat, Stats, statNumberStyle } from './story_template_kit';
import { summitTowerSize } from './story_template_layout';
import { CountUp, Enter } from './story_template_motion';
import { Grow, TowerReveal } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps, StoryPodiumEntry } from './story_template_registry';
import { tplNumber, tplText } from './story_template_strings';

// ── 5 · урок пройден ─────────────────────────────────────────────────────────────────────────────────────────────────

export const LessonFrame = memo(function LessonFrame({ tpl, lang }: StoryFrameProps<'lesson'>) {
  const pal = useStoryTemplatePalette();
  // .stars: цвет accentBright, в светлом оформлении — accent (`.ph.lt .stars`)
  const star = pal.isLight ? pal.accG : pal.accB;
  return (
    <FrameRoot testID="story-tpl-lesson">
      <Art>
        <View style={f.stars}>
          <Enter kind="pop" d={200}><Ionicons name="star" size={54} color={star} style={f.star54} /></Enter>
          <Enter kind="pop" d={340} style={f.starMid}><Ionicons name="star" size={74} color={star} style={f.star74} /></Enter>
          <Enter kind="pop" d={480}><Ionicons name="star" size={54} color={star} style={f.star54} /></Enter>
        </View>
      </Art>
      <Ov text={tplText(lang, 'lessonOverline', { lessonNo: tpl.lessonNo })} d={500} />
      <H1 text={tplText(lang, tpl.noHints ? 'lessonTitleNoHints' : 'lessonTitle')} d0={560} />
      <Stats>
        <Stat d={760} value={<CountUp to={tpl.correct} d={760} dur={700} style={statNumberStyle(pal)} />} label={tplText(lang, 'lessonCorrectOf', { total: tpl.total })} />
        <Stat d={860} value={<CountUp to={tpl.coins} d={860} dur={700} style={statNumberStyle(pal)} />} label={tplText(lang, 'lessonCoinsUnit', { coins: tpl.coins })} />
        <Stat d={960} value={tplText(lang, 'lessonMinutes', { minutes: tpl.minutes })} label={tplText(lang, 'lessonMinutesUnit')} />
      </Stats>
    </FrameRoot>
  );
});

// ── 6 · экзамен главы сдан ───────────────────────────────────────────────────────────────────────────────────────────

export const ExamFrame = memo(function ExamFrame({ tpl, lang }: StoryFrameProps<'exam'>) {
  const pal = useStoryTemplatePalette();
  const frac = tpl.total > 0 ? tpl.correct / tpl.total : 0;
  return (
    <FrameRoot testID="story-tpl-exam" layer={<Confetti n={20} d0={1200} />}>
      <Art>
        <Ring frac={frac}>
          <CountUp to={tpl.correct} d={300} dur={1200} style={[f.ringB, { color: pal.tx }]} />
          <Text style={[f.ringS, { color: pal.sec }]}>{tplText(lang, 'examOf', { total: tpl.total })}</Text>
        </Ring>
      </Art>
      <Ov text={tplText(lang, 'examOverline', { chapter: tpl.chapter })} d={900} />
      <H1 text={tplText(lang, tpl.firstTry ? 'examTitleFirstTry' : 'examTitle')} d0={980} />
      {tpl.nextChapter !== null ? <P text={tplText(lang, 'examNextOpen', { nextChapter: tpl.nextChapter })} d={1200} /> : null}
    </FrameRoot>
  );
});

// ── 7 · Пик · вершина недели ─────────────────────────────────────────────────────────────────────────────────────────

const noopSelect = (): void => undefined;

export const SummitFrame = memo(function SummitFrame({ tpl, lang }: StoryFrameProps<'summit'>) {
  const scene = useSpireScene();
  const { height: winH } = useWindowDimensions();
  const size = useMemo(() => summitTowerSize(winH), [winH]);
  const skin = useMemo(() => spireSkinForTier(tpl.tier), [tpl.tier]);
  return (
    <FrameRoot testID="story-tpl-summit" layer={<Confetti n={18} d0={1400} />}>
      <Art>
        <TowerReveal width={size.width} height={size.height}>
          <SpireTowerSvg lang={lang} myFloor={tpl.floor} selected={tpl.floor} onSelect={noopSelect} width={size.width} skin={skin} scene={scene} />
        </TowerReveal>
      </Art>
      <Ov text={tplText(lang, 'peakOverline', { league: spireTierName(tpl.tier, lang) })} d={1200} />
      <H1 text={tplText(lang, 'peakSummitTitle')} d0={1280} />
      <P text={tplText(lang, 'peakSummitFloor', { floor: tpl.floor, floors: tpl.floors, coins: tpl.weekCoins })} d={1500} />
    </FrameRoot>
  );
});

// ── 8 · Пик · итог недели ────────────────────────────────────────────────────────────────────────────────────────────

/** Пьедестал макета: столбик и задержки по месту (1 — 140 dp с 400 мс, 2 — 112 с 700, 3 — 84 с 1000); монета всплывает позже столбика. */
const PODIUM: Readonly<Record<1 | 2 | 3, Readonly<{ h: number; bar: number; coin: number }>>> = {
  1: { h: 140, bar: 400, coin: 600 },
  2: { h: 112, bar: 700, coin: 900 },
  3: { h: 84, bar: 1000, coin: 1100 },
};
/** Порядок колонок пьедестала: 2 · 1 · 3. */
const PODIUM_ORDER: readonly (1 | 2 | 3)[] = [2, 1, 3];

const PodiumColumn = memo(function PodiumColumn({ entry, you }: Readonly<{ entry: StoryPodiumEntry; you: string }>) {
  const pal = useStoryTemplatePalette();
  const geo = PODIUM[entry.place];
  return (
    <View style={f.pc}>
      <Enter kind="pop" d={geo.coin}><SpireRankCoin rank={entry.rank} size={48} /></Enter>
      <Text style={[f.pcName, { color: pal.tx }]}>{entry.me ? you : entry.name}</Text>
      <Grow axis="y" d={geo.bar} dur={800} style={[f.bar, { height: geo.h, backgroundColor: entry.me ? pal.accG : mix(pal.tx, 0.12) }, entry.me ? { boxShadow: `0 -10px 40px -10px ${pal.accGlow}` } : null]}>
        <Text style={[f.barN, { color: entry.me ? pal.accInk : pal.sec }]}>{entry.place}</Text>
      </Grow>
      <Text style={[f.pcCoins, { color: pal.sec }]}>{tplNumber(entry.coins)}</Text>
    </View>
  );
});

export const PeakWeekFrame = memo(function PeakWeekFrame({ tpl, lang, myRank }: StoryFrameProps<'peakweek'>) {
  const league = spireTierName(tpl.tier, lang);
  const outcome = tpl.outcome === 'up' ? storyText(lang, 'weekUp', { league })
    : tpl.outcome === 'down' ? storyText(lang, 'weekDown', { league })
      : momentText(lang, 'stayTitle', { league: momentLeagueIn(lang, tpl.tier, league) });
  // зачем (Ядро 14.10, прежний кадр): «+N» за повышение — только из promotionCoins сервера и только при подъёме
  const sub = [
    outcome,
    tpl.weekCoins > 0 ? storyText(lang, 'weekCoins', { coins: storyThousands(tpl.weekCoins) }) : null,
    tpl.outcome === 'up' && tpl.promotionCoins > 0 ? `+${storyThousands(tpl.promotionCoins)}` : null,
  ].filter((part): part is string => part !== null).join(' · ');
  const columns = useMemo(() => {
    const byPlace = new Map((tpl.podium ?? []).map((e) => [e.place, e] as const));
    return PODIUM_ORDER.map((place) => byPlace.get(place)).filter((e): e is StoryPodiumEntry => e !== undefined);
  }, [tpl.podium]);
  const you = tplText(lang, 'you');
  return (
    <FrameRoot testID="story-tpl-peakweek">
      <Art>
        {columns.length > 0 ? (
          <View style={f.podium}>{columns.map((e) => <PodiumColumn key={e.place} entry={e} you={you} />)}</View>
        ) : (
          // зачем: событие без тройки недели (старый payload) — своя монета, без выдуманных соседей
          <Enter kind="pop" d={400}><SpireRankCoin rank={myRank} size={96} /></Enter>
        )}
      </Art>
      <Ov text={`${storyText(lang, 'weekResult')} · ${league}`} d={1100} />
      {tpl.place > 0 && tpl.total > 0 ? <H1 text={storyText(lang, 'weekPlace', { place: tpl.place, total: tpl.total })} d0={1160} /> : null}
      <P text={sub} d={1360} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .stars: высота 90, зазор 8; средняя 74 с подъёмом −10
  stars: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 90 },
  star54: { lineHeight: 54 },
  star74: { lineHeight: 74 },
  starMid: { marginTop: -10 },
  // .ring .c b 48/52, −2; span 13/17, 700
  ringB: { fontSize: 48, lineHeight: 52, fontWeight: '800', letterSpacing: -2, textAlign: 'center' },
  ringS: { fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  // .podium: ряд по низу, зазор 10, высота 214; колонка 88, зазор 6
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 214 },
  pc: { width: 88, alignItems: 'center', gap: 6 },
  pcName: { fontSize: 13, lineHeight: 17, fontWeight: '700', maxWidth: 88 },
  bar: { width: 88, borderTopLeftRadius: 16, borderTopRightRadius: 16, alignItems: 'center', paddingTop: 10 },
  barN: { fontSize: 20, lineHeight: 21, fontWeight: '800' },
  pcCoins: { fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
});
