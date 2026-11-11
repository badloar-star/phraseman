/**
 * Блок «Навыки растут» для экранов итога — перенос панели из утверждённого макета
 * (docs/design/v2-app/elevate-core.js, `P.star`: звезда 128 слева, справа строки «навык — уровень — полоска»).
 *
 * зачем: блок получает итоги «до» и «после» и сам считает прирост через modules/skills — на любом итоге цифры
 * совпадают с таблицей очков. Нет прироста — блок не рисуется вовсе (вызывающий знает это до первого кадра,
 * потому что итоги уже в памяти). Метка «Новый уровень» занимает место сразу и только проявляется:
 * высота блока после анимации не меняется.
 */
import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { useLang } from '../LangContext';
import { V2Card } from '../v2/V2Kit';
import { useV2Palette } from '../v2/useV2Palette';
import { triLang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { SKILL_NAME } from '../../modules/skills/skill_copy';
import { SKILL_LEVEL_MAX, skillProgressFromPoints, type SkillTotals } from '../../modules/skills/skill_levels';
import { SKILL_IDS } from '../../modules/skills/skill_points_table';
import { skillGrowthRows, type SkillGrowthRow } from '../../modules/skills/skill_session';
import SkillsStar from './SkillsStar';

const STAR_SIZE = 128;
const START_DELAY_MS = 500;
const GROW_MS = 1100;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

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

type RowProps = Readonly<{ row: SkillGrowthRow; index: number; name: string; levelWord: string; levelUpWord: string }>;

const GrowthRow = memo(function GrowthRow({ row, index, name, levelWord, levelUpWord }: RowProps) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(reduceMotion ? row.ratioAfter : row.ratioBefore);
  const tag = useSharedValue(reduceMotion && row.leveledUp ? 1 : 0);
  const [level, setLevel] = useState(reduceMotion ? row.levelAfter : row.levelBefore);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const delay = START_DELAY_MS + index * 160;
    if (row.leveledUp) {
      // зачем: при новом уровне полоска доходит до конца, цифра меняется, и полоска начинает новый уровень с нуля
      fill.value = withDelay(delay, withSequence(
        withTiming(1, { duration: GROW_MS * 0.6, easing: EASE }, (done) => {
          if (done) runOnJS(setLevel)(row.levelAfter);
        }),
        withTiming(0, { duration: 0 }),
        withTiming(row.ratioAfter, { duration: GROW_MS * 0.4, easing: EASE }),
      ));
      tag.value = withDelay(delay + GROW_MS * 0.6, withTiming(1, { duration: 260 }));
    } else {
      fill.value = withDelay(delay, withTiming(row.ratioAfter, { duration: GROW_MS, easing: EASE }));
    }
    return () => {
      cancelAnimation(fill);
      cancelAnimation(tag);
    };
  }, [fill, index, reduceMotion, row.leveledUp, row.levelAfter, row.ratioAfter, tag]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));

  return (
    <View>
      <View style={s.head}>
        <Text numberOfLines={1} style={[s.name, { color: p.text }]}>{name}</Text>
        <Text style={[s.levelWord, { color: p.textSecondary }]}>
          {levelWord} <Text style={[s.levelValue, { color: p.text }]}>{level}</Text>
        </Text>
      </View>
      <View style={[s.track, { backgroundColor: p.track }]}>
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
        <SkillsStar size={STAR_SIZE} values={to} from={from} delayMs={START_DELAY_MS} gridColor={p.divider} axisColor={p.divider} shapeFill={p.accentSoft} shapeStroke={p.text} />
        <View style={s.rows}>
          {rows.map((row, i) => (
            <GrowthRow key={row.skill} row={row} index={i} name={triLang(lang, SKILL_NAME[row.skill])} levelWord={triLang(lang, COPY.level)} levelUpWord={triLang(lang, COPY.levelUp)} />
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
  levelWord: { fontSize: 13, lineHeight: 24, fontWeight: '600' },
  levelValue: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
  tag: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: 'center', marginTop: 8 },
  tagText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
});

export default memo(SkillsGrowthPanel);
