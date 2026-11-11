/**
 * Экран «Навыки» — перенос утверждённого макета (docs/design/v2-app/elevate-skills.html, экран «Навыки»;
 * исходник elevate-real4.js). Владелец 11.11.2026: «всё с макетов вноси в приложение».
 *
 * зачем так:
 *  • первый кадр — сразу конечная геометрия из памяти процесса; диск догружается фоном, сети нет вовсе
 *    (правило «каждый раздел открывается мгновенно»). Пока диск не прочитан — те же строки с нулями, без спиннера;
 *  • все числа считаются только через modules/skills — экран итога и статистика покажут те же цифры;
 *  • нижней кнопки «Подтянуть» на экране нет: владелец 11.11 велел её удалить; в разминку ведёт строка на экране «Сегодня».
 */
import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkillLevelBar from '../components/skills/SkillLevelBar';
import SkillsRadar, { type SkillsRadarAxis } from '../components/skills/SkillsRadar';
import { StatCountUpText } from '../components/stats/StatCountUpText';
import { V2Card, V2IconButton } from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { triLang } from '../constants/i18n';
import { V2 } from '../constants/v2Style';
import { hapticTap } from '../hooks/use-haptics';
import { SKILLS_SCREEN_COPY, SKILL_NAME, SKILL_RANK_NAME, SKILL_SOURCE } from '../modules/skills/skill_copy';
import { EMPTY_SKILL_TOTALS, SKILL_LEVEL_MAX, skillProgressFromPoints, skillRank } from '../modules/skills/skill_levels';
import { SKILL_IDS } from '../modules/skills/skill_points_table';
import { peekSkills, refreshSkills, skillWeekGains, subscribeSkills } from '../modules/skills/skill_store';
import { safeRouterBack } from './navigation_back';

const LOG = '[SKILLS]';
const ROW_STAGGER_MS = 80;
const OPEN_DELAY_MS = 350;

export default function SkillsScreen() {
  const router = useRouter();
  const p = useV2Palette();
  const { lang } = useLang();
  const state = useSyncExternalStore(subscribeSkills, peekSkills, peekSkills);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    // зачем: фоновая догрузка с диска; экран уже нарисован из памяти. Сбой чтения не оставляет экран пустым.
    refreshSkills().catch((error: unknown) => {
      console.warn(`${LOG} screen:refresh_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: лог в catch обязателен (правило «немой catch запрещён»)
    });
  }, []);

  const totals = state?.totals ?? EMPTY_SKILL_TOTALS;
  const gains = useMemo(() => (state ? skillWeekGains(state) : EMPTY_SKILL_TOTALS), [state]);
  const rows = useMemo(() => SKILL_IDS.map((id) => ({ id, name: triLang(lang, SKILL_NAME[id]), progress: skillProgressFromPoints(totals[id]), gain: Math.floor(gains[id]) })), [gains, lang, totals]);
  const axes = useMemo<SkillsRadarAxis[]>(() => rows.map((row) => ({
    key: row.id,
    label: row.name,
    // зачем: корень, как в макете, — первые уровни уже дают заметный луч
    value: Math.sqrt((row.progress.level + row.progress.ratio) / SKILL_LEVEL_MAX),
  })), [rows]);
  const index = useMemo(() => Math.floor(SKILL_IDS.reduce((sum, id) => sum + totals[id], 0)), [totals]);

  const onBack = useCallback(() => safeRouterBack(router, '/(tabs)/home' as never), [router]);

  const hint = active === null ? triLang(lang, SKILLS_SCREEN_COPY.hint) : triLang(lang, SKILL_SOURCE[rows[active].id]);

  return (
    <ScreenGradient>
      <SafeAreaView style={s.flex} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <V2IconButton icon="chevron-back" onPress={onBack} accessibilityLabel={triLang(lang, SKILLS_SCREEN_COPY.back)} testID="skills-back" />
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{triLang(lang, SKILLS_SCREEN_COPY.title)}</Text>
            <View style={[s.pill, { backgroundColor: p.glass }]}>
              <Ionicons name="trending-up" size={18} color={p.text} />
              <Text style={[s.pillText, { color: p.text }]}>{triLang(lang, SKILLS_SCREEN_COPY.thisWeek)}</Text>
            </View>
          </View>

          <View style={s.indexBlock}>
            <View>
              <Text style={[s.over, { color: p.textSecondary }]}>{triLang(lang, SKILLS_SCREEN_COPY.index)}</Text>
              <StatCountUpText value={index} durationMs={1300} delayMs={OPEN_DELAY_MS} style={[s.big, { color: p.text }]} />
            </View>
            {/* зачем (владелец 11.11): пилюля — слово по среднему уровню учебных навыков, как на макете справа от индекса */}
            <View style={[s.pill, s.rankPill, { backgroundColor: p.glass }]}>
              <Text style={[s.pillText, { color: p.text }]}>{triLang(lang, SKILL_RANK_NAME[skillRank(totals)])}</Text>
            </View>
          </View>

          <SkillsRadar
            axes={axes}
            activeIndex={active}
            gridColor={p.divider}
            axisColor={p.divider}
            shapeFill={p.accentSoft}
            shapeStroke={p.text}
            dotColor={p.text}
            labelColor={p.textSecondary}
            labelActiveColor={p.text}
          />

          <Text style={[s.hint, { color: p.textSecondary }]}>{hint}</Text>

          <V2Card seed={1} style={s.list}>
            {rows.map((row, i) => (
              <Pressable
                key={row.id}
                testID={`skills-row-${row.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active === i }}
                accessibilityLabel={`${row.name}, ${triLang(lang, SKILLS_SCREEN_COPY.levelShort)} ${row.progress.level}`}
                onPressIn={() => { void hapticTap(); }}
                onPress={() => setActive(i)}
                style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.divider }, pressed && s.pressed]}
              >
                <Text style={[s.name, { color: active === i ? p.text : p.textSecondary }]}>{row.name}</Text>
                <SkillLevelBar ratio={row.progress.ratio} delayMs={OPEN_DELAY_MS + i * ROW_STAGGER_MS} trackColor={p.track} fillColor={p.progressFill} />
                <Text style={[s.levelLabel, { color: p.textSecondary }]}>
                  {triLang(lang, SKILLS_SCREEN_COPY.levelShort)} <Text style={[s.levelValue, { color: p.text }]}>{row.progress.level}</Text>
                </Text>
                <Text style={[s.gain, { color: row.gain > 0 ? p.correct : p.textMuted }]}>{row.gain > 0 ? `+${row.gain}` : '—'}</Text>
              </Pressable>
            ))}
          </V2Card>

        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: V2.iconButton },
  title: { position: 'absolute', left: 64, right: 64, textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  pillText: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  indexBlock: { marginTop: 18, height: 70, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  rankPill: { marginBottom: 4 },
  over: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  big: { marginTop: 4, fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  hint: { minHeight: 18, marginTop: 4, textAlign: 'center', fontSize: 14, lineHeight: 18, fontWeight: '500' },
  list: { marginTop: 14, paddingVertical: 2, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 46 },
  pressed: { opacity: 0.86 },
  name: { width: 104, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  levelLabel: { width: 64, textAlign: 'right', fontSize: 14, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  levelValue: { fontSize: 18, fontWeight: '800' },
  gain: { width: 40, textAlign: 'right', fontSize: 13, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
