// ═══════════════════════════════════════════════════════════════════════════
// frames_recap.tsx — кадры 15, 16, 18–21 макета stories-templates-v1.html: твоя неделя, итог месяца, праздник, ранг монеты, новая тема,
// отметка монет.
//
// зачем (владелец 28.10: шаблоны «именно так», пиксель в пиксель): разметка, задержки и кегли — из `render()` TPL макета построчно
// (week: 7 столбиков растут с 150 через 90, четыре плитки 1000–1300; month: дни горят по порядку через 55 мс; holiday: снег + год
// всплывает 150; rank: монета переворачивается с 500, ореол с 1300; theme: круг темы, орбиты оборот за 18 с; coins: монеты падают, счёт
// до отметки за 1,4 с).
// Столбики недели — доля от самого длинного дня (высота столбика до 93 dp — столько в макете остаётся над подписью дня; weekBars).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { liquidGlassGradientTheme } from '../../../constants/liquidGlassGradientThemes';
import { isPremiumThemeId } from '../../../app/premium_theme_catalog';
import { premiumThemeRequirement } from '../../../app/premium_theme_copy';
import { themeDisplayName } from '../../../app/theme_display_names';
import { storyText, storyThousands } from '../story_strings';
import { monthName, weekRange } from './story_template_dates';
import { Art, FrameRoot, H1, Ov, P, Stat, Stats, k, statNumberStyle } from './story_template_kit';
import { monthCells, weekBars } from './story_template_layout';
import { CountUp, Enter } from './story_template_motion';
import { CoinFlip, CoinRain, Snow, ThemeSwatch } from './story_template_layers';
import { Grow } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryFrameProps } from './story_template_registry';
import { tplNumber, tplText } from './story_template_strings';

// ── 15 · твоя неделя ─────────────────────────────────────────────────────────────────────────────────────────────────

/** «3 ч 20» для подписи «минут»; меньше часа — просто число минут. */
function hoursLabel(lang: Lang, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? tplText(lang, 'hoursMinutes', { h, m: String(m).padStart(2, '0') }) : tplNumber(minutes);
}

export const WeekFrame = memo(function WeekFrame({ tpl, lang }: StoryFrameProps<'week'>) {
  const pal = useStoryTemplatePalette();
  const bars = useMemo(() => weekBars(lang, tpl.startMs, tpl.dailyMinutes), [lang, tpl.startMs, tpl.dailyMinutes]);
  return (
    <FrameRoot testID="story-tpl-week">
      <Art>
        <View style={f.wk}>
          {bars.map((b) => (
            <View key={b.key} style={f.wkCol}>
              {b.h > 0 ? <Grow axis="y" d={b.d} dur={700} style={[f.wkBar, { height: b.h, backgroundColor: b.top ? pal.accG : mix(pal.tx, 0.18) }]} /> : null}
              <Text style={[f.wkDay, { color: pal.sec }]}>{b.letter}</Text>
            </View>
          ))}
        </View>
      </Art>
      <Ov text={weekRange(lang, tpl.startMs, tpl.endMs)} d={800} />
      <H1 text={tplText(lang, 'weekTitle')} d0={860} />
      <Stats maxWidth={250}>
        <Stat d={1000} value={<CountUp to={tpl.lessons} d={1000} dur={600} style={statNumberStyle(pal)} />} label={tplText(lang, 'weekLessonsUnit', { lessons: tpl.lessons })} />
        <Stat d={1100} value={<CountUp to={tpl.coins} d={1100} dur={900} style={statNumberStyle(pal)} />} label={tplText(lang, 'lessonCoinsUnit', { coins: tpl.coins })} />
        <Stat d={1200} value={hoursLabel(lang, tpl.minutes)} label={tplText(lang, 'weekMinutesUnit', { minutes: tpl.minutes })} />
        <Stat d={1300} value={<CountUp to={tpl.streak} d={1300} dur={600} style={statNumberStyle(pal)} />} label={tplText(lang, 'weekStreakUnit', { streak: tpl.streak })} />
      </Stats>
    </FrameRoot>
  );
});

// ── 16 · итог месяца ─────────────────────────────────────────────────────────────────────────────────────────────────

export const MonthFrame = memo(function MonthFrame({ tpl, lang }: StoryFrameProps<'month'>) {
  const pal = useStoryTemplatePalette();
  const cells = useMemo(() => monthCells(tpl.daysInMonth, tpl.activeDays), [tpl.daysInMonth, tpl.activeDays]);
  const text = tplText(lang, 'monthText', { lessons: tpl.lessons, exams: tpl.exams });
  return (
    <FrameRoot testID="story-tpl-month">
      <View style={f.cal31}>
        {cells.map((c) => (c.on ? (
          <Enter key={c.key} kind="pop" dur={420} d={c.d} style={[f.cell, { backgroundColor: pal.accG }]}>
            <Text style={[f.cellT, { color: pal.accInk }]}>{c.day}</Text>
          </Enter>
        ) : (
          <View key={c.key} style={[f.cell, { backgroundColor: mix(pal.tx, 0.09) }]}>
            <Text style={[f.cellT, { color: pal.mu }]}>{c.day}</Text>
          </View>
        )))}
      </View>
      <Ov text={monthName(lang, tpl.monthMs)} d={1400} />
      <H1 text={tplText(lang, 'monthTitle', { active: tpl.activeDays.length, daysInMonth: tpl.daysInMonth })} d0={1460} />
      <P text={tpl.best ? `${text} · ${tplText(lang, 'monthBest')}` : text} d={1680} />
    </FrameRoot>
  );
});

// ── 18 · праздник (объявление администратора: год, дата, заголовок и текст — из объявления) ─────────────────────────────

export const HolidayFrame = memo(function HolidayFrame({ tpl }: StoryFrameProps<'holiday'>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-holiday" layer={<Snow />}>
      <Enter kind="rise" d={150}><Text style={[k.big, { color: pal.tx }]}>{tpl.year}</Text></Enter>
      <Ov text={tpl.dateLabel} d={600} />
      <H1 text={tpl.title} d0={660} />
      {tpl.text ? <P text={tpl.text} d={880} /> : null}
    </FrameRoot>
  );
});

// ── 19 · ранг монеты ─────────────────────────────────────────────────────────────────────────────────────────────────

export const RankFrame = memo(function RankFrame({ tpl, lang }: StoryFrameProps<'rank'>) {
  const paid = storyText(lang, 'rankPaid', { price: storyThousands(tpl.price) });
  const fromRank = Math.max(0, tpl.toRank - 1); // guard-ok: прежний ранг для картинки переворота, ранг не меняется
  return (
    <FrameRoot testID="story-tpl-rank">
      <Art><CoinFlip from={fromRank} to={tpl.toRank} /></Art>
      <Ov text={storyText(lang, 'rankOverline')} d={1300} />
      <H1 text={storyText(lang, 'rankTitle', { n: tpl.toRank })} d0={1360} />
      <P text={tpl.nextPrice !== null ? `${paid} · ${tplText(lang, 'rankNext', { next: tpl.nextPrice })}` : paid} d={1500} />
    </FrameRoot>
  );
});

// ── 20 · новая тема ──────────────────────────────────────────────────────────────────────────────────────────────────

export const ThemeFrame = memo(function ThemeFrame({ tpl, lang }: StoryFrameProps<'theme'>) {
  const pal = useStoryTemplatePalette();
  // зачем (правило «цвета — только токены»): круг показывает саму открытую тему — её акцент и свечение из каталога тем (в макете — иллюстративные #DDE1E8 / #5E6570)
  const def = liquidGlassGradientTheme(tpl.themeId);
  const name = themeDisplayName(tpl.themeId, lang);
  const requirement = isPremiumThemeId(tpl.themeId) ? premiumThemeRequirement(tpl.themeId, lang) : '';
  const opened = tpl.opened !== null && tpl.total !== null ? tplText(lang, 'themesOpened', { opened: tpl.opened, total: tpl.total }) : '';
  const sub = [requirement, opened].filter(Boolean).join(' · ');
  return (
    <FrameRoot testID="story-tpl-theme">
      <Art><Enter kind="pop" d={120}><ThemeSwatch colorA={def?.accent ?? pal.accB} colorB={def?.glowA ?? pal.accG} /></Enter></Art>
      <Ov text={storyText(lang, 'themeOverline')} d={500} />
      {name ? <H1 text={tplText(lang, 'themeUnlockedTitle', { theme: name })} d0={560} /> : null}
      {sub ? <P text={sub} d={780} /> : null}
    </FrameRoot>
  );
});

// ── 21 · отметка монет ───────────────────────────────────────────────────────────────────────────────────────────────

export const CoinsFrame = memo(function CoinsFrame({ tpl, lang }: StoryFrameProps<'coins'>) {
  const pal = useStoryTemplatePalette();
  return (
    <FrameRoot testID="story-tpl-coins" layer={<CoinRain />} layerClip={false}>
      <CountUp to={tpl.milestone} d={200} dur={1400} style={[k.bigM, { color: pal.tx }]} />
      <Ov text={tplText(lang, 'coinsBigUnit', { coins: tpl.milestone })} d={1000} />
      <H1 text={tplText(lang, 'coinsMilestoneTitle')} d0={1060} />
      {tpl.rank !== null ? <P text={tplText(lang, 'coinsMilestoneText', { days: tpl.days, rank: tpl.rank })} d={1280} /> : null}
    </FrameRoot>
  );
});

const f = StyleSheet.create({
  // .wk: ряд по низу, зазор 9, высота 120, отступ снизу 6; столбик 30, радиус 8; подпись 12/700 (строка 21), отступ 6
  wk: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 120, marginBottom: 6 },
  wkCol: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  wkBar: { width: '100%', borderRadius: 8 },
  wkDay: { fontSize: 12, lineHeight: 21, fontWeight: '700', marginTop: 6 },
  // .cal31: 7 × 36, зазор 7, отступ снизу 18; клетка радиус 10, 12/700
  cal31: { width: 7 * 36 + 6 * 7, flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  cell: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellT: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
});
