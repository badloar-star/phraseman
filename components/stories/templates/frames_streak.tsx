// ═══════════════════════════════════════════════════════════════════════════
// frames_streak.tsx — кадры 1–4 макета stories-templates-v1.html: серия · 7 дней, серия · 100 дней, ачивка, новый уровень.
//
// зачем (владелец 28.10: шаблоны «именно так», пиксель в пиксель): разметка, задержки и кегли — из `render()` TPL макета построчно
// (streak7: огонь 150 + счёт 1→7, обзор 380, заголовок 460, подпись 640, 7 дней с 700 через 80; streak100: 100 клеток волной через 14 мс,
// число до 100 за 1,4 с; ach: арт 132 с бликом, конфетти 16 с 600; level: кольцо, A1 уходит вверх, A2 въезжает, конфетти 18 с 1100).
// Огонь — тот же StreakMomentFlame, что у момента серии и Главной; цифра на плашке считает поверх него.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { achievementNameForLang, ALL_ACHIEVEMENTS } from '../../../app/achievements';
import AchievementArt from '../../AchievementArt';
import StreakMomentFlame, { streakPlateFill } from '../../streak/moments/StreakMomentFlame';
import { isStreakMilestone } from '../../streak/moments/streak_milestones';
import { streakDayWord, streakMilestoneTitle } from '../../streak/moments/streak_moments_strings';
import { storyText } from '../story_strings';
import { dayMonth } from './story_template_dates';
import { Art, Confetti, FrameRoot, H1, Ov, P, Ring, k } from './story_template_kit';
import { streakWeekCells } from './story_template_layout';
import { CountUp, Enter } from './story_template_motion';
import { LevelSwap, Sheen } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps } from './story_template_registry';
import { tplText } from './story_template_strings';

// ── 1 · серия · 7 дней ───────────────────────────────────────────────────────────────────────────────────────────────

/** Огонь 150 с плашкой цифры (.flame .n макета: низ 12 %, 36/45, 800, поля 0,34 em) — цифра считает 0 → days. */
const FlameCount = memo(function FlameCount({ days }: Readonly<{ days: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <View style={f.flame}>
      <StreakMomentFlame days={days} label="" size={150} testID="story-tpl-flame" />
      <View pointerEvents="none" style={f.plateWrap}>
        <View style={[f.plate, { backgroundColor: streakPlateFill({ mediaScrim: pal.mediaScrim }) }]}>
          <CountUp to={days} d={300} dur={800} style={[f.plateText, { color: pal.mediaInk }]} />
        </View>
      </View>
    </View>
  );
});

export const Streak7Frame = memo(function Streak7Frame({ tpl, lang }: StoryFrameProps<'streak7'>) {
  const pal = useStoryTemplatePalette();
  const cells = useMemo(() => streakWeekCells(lang, tpl.endMs, tpl.days), [lang, tpl.endMs, tpl.days]);
  const title = isStreakMilestone(tpl.days) ? streakMilestoneTitle(lang, tpl.days) : null;
  return (
    <FrameRoot testID="story-tpl-streak7">
      <Art><Enter kind="pop" d={120}><FlameCount days={tpl.days} /></Enter></Art>
      <Ov text={tplText(lang, 'streakOverline', { days: tpl.days })} d={380} />
      {title ? <H1 text={title} d0={460} /> : null}
      {tpl.next !== null ? <P text={tplText(lang, 'streakNext', { next: tpl.next })} d={640} /> : null}
      <View style={f.cal7}>
        {cells.map((c, i) => {
          const body = (
            <View style={[f.day, { backgroundColor: c.on ? pal.accG : mix(pal.tx, 0.1) }]}>
              <Text style={[f.dayT, { color: c.on ? pal.accInk : pal.sec }]}>{c.letter}</Text>
              {c.on ? <Ionicons name="checkmark" size={16} color={pal.accInk} style={f.dayI} /> : <View style={f.dayGap} />}
            </View>
          );
          return c.on ? <Enter key={c.key} kind="pop" d={700 + i * 80}>{body}</Enter> : <View key={c.key}>{body}</View>;
        })}
      </View>
    </FrameRoot>
  );
});

// ── 2 · серия · 100 дней ─────────────────────────────────────────────────────────────────────────────────────────────

const GRID100 = Array.from({ length: 100 }, (_, i) => ({ id: `g${i}`, d: 120 + i * 14, last: i === 99 }));

export const Streak100Frame = memo(function Streak100Frame({ tpl, lang }: StoryFrameProps<'streak100'>) {
  const pal = useStoryTemplatePalette();
  const ring = `0 0 0 4px ${mix(pal.accG, 0.35)}`;
  return (
    <FrameRoot testID="story-tpl-streak100">
      <View style={f.grid100}>
        {GRID100.map((c) => <Enter key={c.id} kind="pop" dur={420} d={c.d} style={[f.cell100, { backgroundColor: pal.accG }, c.last ? { boxShadow: ring } : null]} />)}
      </View>
      <CountUp to={tpl.days} d={200} dur={1400} style={[k.bigM, { color: pal.tx }]} />
      <Ov text={tplText(lang, 'streakBigUnit', { days: tpl.days })} d={900} />
      <H1 text={tplText(lang, 'streakBigTitle')} d0={1000} small />
      {tpl.next !== null ? <P text={tplText(lang, 'streakSince', { date: dayMonth(lang, tpl.startMs), next: tpl.next })} d={1300} /> : null}
    </FrameRoot>
  );
});

// ── 3 · ачивка ───────────────────────────────────────────────────────────────────────────────────────────────────────

export const AchFrame = memo(function AchFrame({ tpl, lang }: StoryFrameProps<'ach'>) {
  const pal = useStoryTemplatePalette();
  const name = useMemo(() => {
    const def = ALL_ACHIEVEMENTS.find((a) => a.id === tpl.achievementId);
    return def ? achievementNameForLang(def, lang) : '';
  }, [lang, tpl.achievementId]);
  const overline = tpl.opened !== null && tpl.total !== null ? tplText(lang, 'achCount', { opened: tpl.opened, total: tpl.total }) : storyText(lang, 'achOverline');
  return (
    <FrameRoot testID="story-tpl-ach" layer={<Confetti n={16} d0={600} />}>
      <Art>
        <Enter kind="pop" d={100}>
          <View style={[f.ach, { boxShadow: `0 18px 40px -16px ${mix(pal.shTint, 0.7)}` }]}>
            <View style={f.achClip}>
              <AchievementArt achievementId={tpl.achievementId} iconColor={pal.acc} size={132} borderRadius={30} accessibilityLabel={name || undefined} />
              <Sheen size={132} />
            </View>
          </View>
        </Enter>
      </Art>
      <Ov text={overline} d={360} />
      {name ? <H1 text={name} d0={440} /> : null}
      {tpl.nextDays !== null ? <P text={storyText(lang, 'achNext', { n: tpl.nextDays, dn: streakDayWord(lang, tpl.nextDays) })} d={620} /> : null}
    </FrameRoot>
  );
});

// ── 4 · новый уровень ────────────────────────────────────────────────────────────────────────────────────────────────

export const LevelFrame = memo(function LevelFrame({ tpl, lang }: StoryFrameProps<'level'>) {
  return (
    <FrameRoot testID="story-tpl-level" layer={<Confetti n={18} d0={1100} />}>
      <Art><Ring frac={1}><LevelSwap from={tpl.fromLevel} to={tpl.toLevel} /></Ring></Art>
      <Ov text={tplText(lang, 'levelOverline')} d={900} />
      <H1 text={tplText(lang, 'levelTitle', { toLevel: tpl.toLevel })} d0={980} />
      <P text={tplText(lang, 'levelBehind', { chapters: tpl.chapters, lessons: tpl.lessons })} d={1200} />
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  flame: { width: 150, height: 150 },
  plateWrap: { position: 'absolute', left: 0, right: 0, bottom: '12%', alignItems: 'center' },
  plate: { borderRadius: 999, paddingHorizontal: 12 },
  plateText: { fontSize: 36, lineHeight: 45, fontWeight: '800', letterSpacing: -0.5 },
  // .cal7: зазор 8, отступ 20; клетка 38 × 50, радиус 12, буква 12/700 (строка 21), галочка 16, зазор 4
  cal7: { flexDirection: 'row', gap: 8, marginTop: 20 },
  day: { width: 38, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dayT: { fontSize: 12, lineHeight: 21, fontWeight: '700' },
  dayI: { lineHeight: 16 },
  dayGap: { width: 16, height: 16 },
  // .grid100: 10 × 20, зазор 6, отступ снизу 20; клетка радиус 6
  grid100: { width: 254, flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  cell100: { width: 20, height: 20, borderRadius: 6 },
  // .ach 132, радиус 30, тень текста темы
  ach: { width: 132, height: 132, borderRadius: 30 },
  achClip: { width: 132, height: 132, borderRadius: 30, overflow: 'hidden' },
});
