/**
 * Блок «Навыки» на экране «Серия и результаты» — перенос панели из утверждённого макета
 * (docs/design/v2-app/elevate-real2.js: малая звезда 150 слева, справа шесть строк «название — полоска — уровень»).
 *
 * зачем самодостаточный: экран статистики ничего не знает о навыках — блок сам читает хранилище и сам ведёт на
 * экран «Навыки». Первый кадр — из памяти процесса; пока диск не прочитан, те же шесть строк с нулями
 * (высота блока не меняется, спиннера нет).
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useLang } from '../LangContext';
import { V2Card } from '../v2/V2Kit';
import { useV2Palette } from '../v2/useV2Palette';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { SKILLS_SCREEN_COPY, SKILL_NAME } from '../../modules/skills/skill_copy';
import { EMPTY_SKILL_TOTALS, SKILL_LEVEL_MAX, skillProgressFromPoints } from '../../modules/skills/skill_levels';
import { SKILL_IDS } from '../../modules/skills/skill_points_table';
import { peekSkills, refreshSkills, subscribeSkills } from '../../modules/skills/skill_store';
import SkillLevelBar from './SkillLevelBar';
import SkillsStar from './SkillsStar';

const LOG = '[SKILLS]';
const STAR_SIZE = 150;
const NAV_GUARD_MS = 700;

function SkillsStatsCard() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const state = useSyncExternalStore(subscribeSkills, peekSkills, peekSkills);
  const lastNavAt = useRef(0);

  useEffect(() => {
    refreshSkills().catch((error: unknown) => {
      console.warn(`${LOG} stats_card:refresh_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен
    });
  }, []);

  const totals = state?.totals ?? EMPTY_SKILL_TOTALS;
  const rows = useMemo(() => SKILL_IDS.map((id) => ({ id, name: triLang(lang, SKILL_NAME[id]), progress: skillProgressFromPoints(totals[id]) })), [lang, totals]);
  const star = useMemo(() => rows.map((row) => Math.sqrt((row.progress.level + row.progress.ratio) / SKILL_LEVEL_MAX)), [rows]);

  const onPress = useCallback(() => {
    const now = Date.now();
    if (now - lastNavAt.current < NAV_GUARD_MS) return; // защита от двойного тапа
    lastNavAt.current = now;
    void hapticTap();
    router.push('/skills' as never);
  }, [router]);

  return (
    <V2Card seed={2} style={s.card} onPress={onPress} testID="stats-skills-card" accessibilityLabel={triLang(lang, SKILLS_SCREEN_COPY.title)}>
      <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{triLang(lang, SKILLS_SCREEN_COPY.title)}</Text>
      <View style={s.body}>
        <SkillsStar size={STAR_SIZE} values={star} delayMs={350} gridColor={p.divider} axisColor={p.divider} shapeFill={p.accentSoft} shapeStroke={p.text} />
        <View style={s.rows}>
          {rows.map((row, i) => (
            <View key={row.id} style={s.row}>
              <Text style={[s.name, { color: p.textSecondary }]}>{row.name}</Text>
              <SkillLevelBar ratio={row.progress.ratio} delayMs={350 + i * 80} trackColor={p.track} fillColor={p.progressFill} />
              <Text style={[s.level, { color: p.text }]}>{row.progress.level}</Text>
            </View>
          ))}
        </View>
      </View>
    </V2Card>
  );
}

const s = StyleSheet.create({
  card: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '800', marginBottom: 4 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  rows: { flex: 1, gap: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 20 },
  name: { width: 88, fontSize: 14, lineHeight: 18, fontWeight: '600' },
  level: { width: 22, textAlign: 'right', fontSize: 16, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default memo(SkillsStatsCard);
