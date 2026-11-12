/**
 * Блок «Навыки растут» для экранов итога — перенос панели из утверждённого макета
 * (docs/design/v2-app/elevate-core.js, `P.star`: звезда 128 слева, справа строки «навык — уровень — полоска»).
 *
 * зачем: блок получает итоги «до» и «после» и сам считает прирост через modules/skills — на любом итоге цифры
 * совпадают с таблицей очков. Нет прироста — блок не рисуется вовсе (вызывающий знает это до первого кадра,
 * потому что итоги уже в памяти). Метка «Новый уровень» выезжает и раздвигает блок — ровно как на макете
 * (решение владельца 11.11).
 */
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { useLang } from '../LangContext';
import GameBumpText from '../games/GameBumpText';
import { V2Card } from '../v2/V2Kit';
import { useV2Palette } from '../v2/useV2Palette';
import { GAME_EASE, GAME_MOTION_EXTRA as M } from '../../constants/gameMotion';
import { triLang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { SKILL_NAME } from '../../modules/skills/skill_copy';
import { SKILL_LEVEL_MAX, skillProgressFromPoints, type SkillTotals } from '../../modules/skills/skill_levels';
import { SKILL_IDS } from '../../modules/skills/skill_points_table';
import { skillGrowthRows, type SkillGrowthRow } from '../../modules/skills/skill_session';
import SkillsStar from './SkillsStar';

const STAR_SIZE = 128;
// зачем (сверка движения 11.11, пп. 7–9): тайминги — из макета (elevate-core.js:81–89, elevate-extra.css:220–222):
// полоски растут сразу и без лесенки, звезда — 1500 мс с паузой 200, новый уровень щёлкает на 1200 мс
const BAR_EASE = Easing.bezier(M.skillBarEase[0], M.skillBarEase[1], M.skillBarEase[2], M.skillBarEase[3]);
const TAG_GROW_EASE = Easing.bezier(GAME_EASE.out[0], GAME_EASE.out[1], GAME_EASE.out[2], GAME_EASE.out[3]);
const TAG_FADE_EASE = Easing.bezier(GAME_EASE.ease[0], GAME_EASE.ease[1], GAME_EASE.ease[2], GAME_EASE.ease[3]);

const COPY = {
  title: { ru: 'Навыки растут', uk: 'Навички зростають', es: 'Tus habilidades crecen', en: 'Skills are growing' },
  level: { ru: 'уровень', uk: 'рівень', es: 'nivel', en: 'level' },
  levelUp: { ru: 'Новый уровень', uk: 'Новий рівень', es: 'Nuevo nivel', en: 'New level' },
} as const;

function starValues(totals: SkillTotals): number[] {
  return SKILL_IDS.map((id) => {
    const progress = skillProgressFromPoints(totals[id]);
    return Math.sqrt((progress.level + progress.ratio) / SKILL_LEVEL_MAX);
  });
}

type RowProps = Readonly<{ row: SkillGrowthRow; name: string; levelWord: string; levelUpWord: string }>;

const GrowthRow = memo(function GrowthRow({ row, name, levelWord, levelUpWord }: RowProps) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(reduceMotion ? row.ratioAfter : row.ratioBefore);
  // `.bar i.was` — прежний уровень бледной полосой; при новом уровне обнуляется
  const was = useSharedValue(reduceMotion && row.leveledUp ? 0 : row.ratioBefore);
  const tagGrow = useSharedValue(reduceMotion && row.leveledUp ? 1 : 0);
  const tagFade = useSharedValue(reduceMotion && row.leveledUp ? 1 : 0);
  const [level, setLevel] = useState(reduceMotion ? row.levelAfter : row.levelBefore);

  useEffect(() => {
    if (reduceMotion) return undefined;
    if (!row.leveledUp) {
      fill.value = withTiming(row.ratioAfter, { duration: M.skillBarMs, easing: BAR_EASE });
      return () => cancelAnimation(fill);
    }
    // зачем: полоса сначала доходит до конца (1100 мс), на 1200 мс уровень щёлкает с подскоком цифры, прежняя полоса
    // обнуляется, и новая растёт с нуля ещё 1100 мс — как `starGrow` в макете
    fill.value = withSequence(
      withTiming(1, { duration: M.skillBarMs, easing: BAR_EASE }),
      withDelay(M.skillLevelUpAtMs - M.skillBarMs, withTiming(0, { duration: 0 })),
      withTiming(row.ratioAfter, { duration: M.skillBarMs, easing: BAR_EASE }),
    );
    was.value = withDelay(M.skillLevelUpAtMs, withTiming(0, { duration: 0 }));
    tagGrow.value = withDelay(M.skillLevelUpAtMs, withTiming(1, { duration: M.skillTagGrowMs, easing: TAG_GROW_EASE }));
    tagFade.value = withDelay(M.skillLevelUpAtMs, withTiming(1, { duration: M.skillTagFadeMs, easing: TAG_FADE_EASE }));
    const id = setTimeout(() => setLevel(row.levelAfter), M.skillLevelUpAtMs);
    return () => {
      clearTimeout(id);
      cancelAnimation(fill);
      cancelAnimation(was);
      cancelAnimation(tagGrow);
      cancelAnimation(tagFade);
    };
  }, [fill, reduceMotion, row.leveledUp, row.levelAfter, row.ratioAfter, tagFade, tagGrow, was]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` }));
  const wasStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, was.value)) * 100}%` }));
  // зачем (владелец 11.11, ответ «Ровно как на макете»): метка выезжает — высота 0 → 22 и отступ 0 → 8, блок раздвигается.
  // Это осознанное исключение из правила стабильной геометрии: движение происходит один раз, после полоски, по слову владельца.
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagFade.value, height: M.skillTagHeight * tagGrow.value, marginTop: M.skillTagMargin * tagGrow.value }));

  return (
    <View>
      <View style={s.head}>
        <Text style={[s.name, { color: p.text }]}>{name}</Text>
        {/* зачем: цифра — отдельный элемент, иначе внутри строки подскок (сдвиг и масштаб) не работает */}
        <View style={s.levelBox}>
          <Text style={[s.levelWord, { color: p.textSecondary }]}>{levelWord}</Text>
          <GameBumpText value={String(level)} style={[s.levelValue, { color: p.text }]} />
        </View>
      </View>
      <View style={[s.track, { backgroundColor: p.track }]}>
        <Reanimated.View style={[s.fill, s.was, { backgroundColor: p.progressFill }, wasStyle]} />
        <Reanimated.View style={[s.fill, { backgroundColor: p.progressFill }, fillStyle]} />
      </View>
      {row.leveledUp ? (
        <Reanimated.View style={[s.tag, { backgroundColor: p.cta }, tagStyle]}>
          <Text style={[s.tagText, { color: p.ctaText }]}>{levelUpWord}</Text>
        </Reanimated.View>
      ) : null}
    </View>
  );
});

type Props = Readonly<{ before: SkillTotals; after: SkillTotals; testID?: string }>;

function SkillsGrowthPanel({ before, after, testID = 'skills-growth-panel' }: Props) {
  const p = useV2Palette();
  const { lang } = useLang();
  const rows = useMemo(() => skillGrowthRows(before, after), [after, before]);
  const from = useMemo(() => starValues(before), [before]);
  const to = useMemo(() => starValues(after), [after]);
  if (rows.length === 0) return null;

  return (
    <V2Card seed={3} style={s.card} testID={testID}>
      <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{triLang(lang, COPY.title)}</Text>
      <View style={s.body}>
        <SkillsStar size={STAR_SIZE} values={to} from={from} delayMs={M.skillStarDelayMs} durationMs={M.skillStarMs} gridColor={p.divider} axisColor={p.divider} shapeFill={p.accentSoft} shapeStroke={p.text} />
        <View style={s.rows}>
          {rows.map((row) => (
            <GrowthRow key={row.skill} row={row} name={triLang(lang, SKILL_NAME[row.skill])} levelWord={triLang(lang, COPY.level)} levelUpWord={triLang(lang, COPY.levelUp)} />
          ))}
        </View>
      </View>
    </V2Card>
  );
}

const s = StyleSheet.create({
  card: { padding: 16 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  rows: { flex: 1, minWidth: 0, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 20, fontWeight: '600' },
  levelBox: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  levelWord: { fontSize: 13, lineHeight: 24, fontWeight: '600' },
  levelValue: { fontSize: 20, lineHeight: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  fill: { position: 'absolute', left: 0, top: 0, height: 6, borderRadius: 3 },
  // elevate-mechanics.css:208 — `.bar i.was`: прежний уровень на 38 % яркости полосы
  was: { opacity: M.skillWasOpacity },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, borderRadius: 11, justifyContent: 'center', overflow: 'hidden' },
  tagText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
});

export default memo(SkillsGrowthPanel);
