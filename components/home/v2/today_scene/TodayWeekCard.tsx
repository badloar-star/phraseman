// ═══════════════════════════════════════════════════════════════════════════
// TodayWeekCard.tsx — карточка «Неделя · N из 6 дней» под «Заданиями дня» на сцене «Сегодня».
//
// зачем (владелец 22.10 выбрал вариант 2 scenes-compact.html; координатор: «нижняя карточка „Неделя · N из 6 дней“ с кольцами по дням
// вместо „История“», вариант А — итог дня на телефоне): шесть дней до сегодняшнего, у каждого три мини-кольца эталона `ringsMini`
// (34, радиусы 15/10/5, толщина 3,5, дорожка 20 %, дуга только у ненулевого) теми же оттенками темы, что кольца-герой (на карточке — углублёнными до читаемых), и дата под ними.
// «N из 6 дней» — дни, когда хоть одно задание сдвинулось; дней до выпуска нет в памяти — пустые кольца, честно. Карточка — тон
// темы уровня «Максимум», как панель «Задания дня» (без обводок, тень). Чтение — use_today_week (память → диск, без сети).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { liquidGlassTokens } from '../../../../constants/liquidGlassThemePalette';
import { useScaledTextStyles } from '../../../../hooks/useLineScale';
import type { TodayWeekDay } from '../../../../modules/today-tasks/today_tasks_week';
import { useLang } from '../../../LangContext';
import { useTheme } from '../../../ThemeContext';
import { plateBoxShadow, useShadowGlass } from '../../../v2/ShadowSurface';
import { todayHistoryDateLabel, todayHistoryDayA11y, todayWeekActiveLabel, todayWeekTitle } from '../today_activity_history_copy';
import { homeSceneTokensForTheme } from '../scene/home_scene_tokens';
import { todayRingsOnCard } from './today_scene_ring_look';
import { useTodayWeek } from './use_today_week';

/** Мини-кольца эталона `ringsMini`: холст 34, внешний радиус 15, шаг 5, толщина 3,5. */
const MINI = Object.freeze({ size: 34, r0: 15, step: 5, stroke: 3.5, track: 0.2 });

const MiniRings = memo(function MiniRings({ day, colors }: Readonly<{ day: TodayWeekDay | null; colors: readonly [string, string, string] }>) {
  const c = MINI.size / 2;
  return (
    <Svg width={MINI.size} height={MINI.size} viewBox={`0 0 ${MINI.size} ${MINI.size}`} style={baseStyles.svg}>
      {colors.map((color, i) => {
        const r = MINI.r0 - i * MINI.step;
        const len = 2 * Math.PI * r;
        const target = day ? day.targets[i] : 0;
        const x = day && target > 0 ? Math.min(1, day.progress[i] / target) : 0;
        return (
          <React.Fragment key={i} /* guard-ok: три кольца фиксированного порядка */>
            <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={MINI.track} strokeWidth={MINI.stroke} />
            {x > 0 ? <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={MINI.stroke} strokeLinecap="round" strokeDasharray={`${len * x} ${len}`} /> : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
});

type Props = Readonly<{
  /** Сегодняшний ключ дня (окно — шесть дней до него). */
  dayKey: string;
  /** Готовая неделя вместо хранилища — dev-превью и тесты. */
  fixture?: readonly TodayWeekDay[];
}>;

function TodayWeekCard({ dayKey, fixture }: Props) {
  const { lang } = useLang();
  const s = useScaledTextStyles(baseStyles); // зачем (FONTSCALE2): межстрочный растёт вместе с системным шрифтом
  const { liquidGlassThemeId, liquidGlassAppearance } = useTheme();
  const glass = useShadowGlass();
  const p = useMemo(() => liquidGlassTokens(liquidGlassThemeId, { level: 'max', appearance: liquidGlassAppearance }), [liquidGlassThemeId, liquidGlassAppearance]);
  // зачем (закон владельца 22.10: «КРУЖОЧКИ … СТРОГО В ЦВЕТАХ ТЕМЫ»): мини-кольца — оттенки колец-героя; на светлой карточке светлые пропадают —
  // углубляем к акцентному тексту карточки лесенкой (today_scene_ring_look), в тёмных темах цвета как на сцене
  const ringColors = useMemo(() => todayRingsOnCard(homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance).todayRing, p), [liquidGlassThemeId, liquidGlassAppearance, p]);
  const week = useTodayWeek(dayKey, fixture);
  return (
    <View testID="today-week-card" style={[s.card, { backgroundColor: p.opaqueCard, boxShadow: plateBoxShadow(glass) }]}>
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{todayWeekTitle(lang)}</Text>
        {/* зачем: счётчик — только когда неделя прочитана (память — сразу, диск — один раз за запуск), чтобы число не прыгало с «0» */}
        {week.ready ? <Text testID="today-week-count" style={[s.count, { color: p.secondary }]}>{todayWeekActiveLabel(lang, week.active)}</Text> : null}
      </View>
      <View style={s.days}>
        {week.cells.map((cell) => {
          const done = cell.day ? cell.day.progress.filter((v, i) => (cell.day?.targets[i] ?? 0) > 0 && v >= (cell.day?.targets[i] ?? 0)).length : 0;
          return (
            <View key={cell.dayKey} testID={`today-week-day-${cell.dayKey}`} style={s.day} accessible accessibilityLabel={todayHistoryDayA11y(lang, cell.dayKey, done)}>
              <MiniRings day={cell.day} colors={ringColors} />
              <Text style={[s.date, { color: p.secondary }]} numberOfLines={2}>{todayHistoryDateLabel(lang, cell.dayKey)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  // эталон `.pn`: радиус 24, поля 14 16; заголовок — как у «Заданий дня» (20/26), счётчик 13/17 по шкале D145; `.days` — шесть колонок поровну
  card: { marginHorizontal: 16, borderRadius: 24, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  count: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  days: { flexDirection: 'row', paddingTop: 10 },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  svg: { transform: [{ rotate: '-90deg' }] },
  date: { fontSize: 13, lineHeight: 17, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

export default memo(TodayWeekCard);
