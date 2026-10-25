// PlacementChrome.tsx — общая обвязка экранов теста «Не хочу с начала» (макет chapter-exam-season.html, раздел 6): шапка, карточка темы, плашка «ещё 2», подвал.
// зачем (координатор 24.10, «1 в 1 по макету»): размеры — из CSS макета (.extop, .tvx, .tvtrk, .tvn, .topic, .exfoot, .tcta).
// Обводок нет — плита темы + тень «Тень»; заливки — токены темы (useLv2Glass / lv2TaskTokens). Тап по кнопкам — хаптик только у управляющих (V2Pressable).
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import V2Pressable from '../../v2/V2Pressable';
import { useLv2Glass } from '../LearningV2Glass';
import { learningV2LessonIonIcon } from '../icons/learningV2IonIcons';
import { lv2TaskPlateStyle } from '../learning_v2_task_layout_tokens';
import { lv2TaskTokens } from '../learning_v2_task_theme_tokens';
import { seasonText } from '../season/season_copy';
import { placementCopy } from './placement_copy';

/** Размеры из CSS макета. */
export const PLACEMENT_LAYOUT = {
  top: { gap: 12, minHeight: 54, marginTop: 2, close: 44, closeIcon: 22 },
  progress: { height: 6, radius: 3, labelSize: 13, labelLine: 17, labelGap: 5 },
  topic: { marginTop: 10, radius: 18, padV: 10, padH: 12, gap: 12, tile: 46, tileRadius: 12, tileIcon: 22, kickerSize: 13, kickerLine: 17, titleSize: 16, titleLine: 21 },
  foot: { padTop: 12, padH: 20, padBottom: 34, cta: 52, ghost: 50, ghostGap: 10 },
} as const;

type TopBarProps = Readonly<{
  closeLabel: string;
  onClose: () => void;
  /** Полоса прогресса и подпись «Тест · урок n из N»; нет — в шапке только крестик (старт и итог). */
  progress?: Readonly<{ fraction: number; label: string }>;
  topInset: number;
}>;

/** `.extop`: круглая плита «закрыть» 44 и — на вопросах — полоса прогресса с подписью. */
export const PlacementTopBar = memo(function PlacementTopBar({ closeLabel, onClose, progress, topInset }: TopBarProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  return (
    <View style={[styles.top, { paddingTop: topInset }]}>
      <V2Pressable testID="placement-close" accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={[styles.close, { backgroundColor: g.opaqueCard, boxShadow: t.taskPlateShadow as never }]}>
        <Ionicons name="close" size={PLACEMENT_LAYOUT.top.closeIcon} color={g.text} />
      </V2Pressable>
      {progress ? (
        <View style={styles.progressColumn}>
          <View style={[styles.track, { backgroundColor: t.controlSoft }]}>
            <View testID="placement-progress-fill" style={[styles.fill, { backgroundColor: g.accent, width: `${Math.round(Math.max(0, Math.min(1, progress.fraction)) * 100)}%` }]} />
          </View>
          <Text testID="placement-progress-label" style={[styles.progressText, { color: g.secondary }]}>{progress.label}</Text>
        </View>
      ) : null}
    </View>
  );
});

/** Плитка урока (`.ich.les`): 46, радиус 12, значок 22 — фон тон текста 9 %, как плитки уроков Сезона. */
export const PlacementLessonTile = memo(function PlacementLessonTile({ lessonOrdinal }: Readonly<{ lessonOrdinal: number }>) {
  const g = useLv2Glass();
  return (
    <View style={[styles.tile, { backgroundColor: `${g.text}17` }]}>
      <Ionicons name={learningV2LessonIonIcon(lessonOrdinal)} size={PLACEMENT_LAYOUT.topic.tileIcon} color={g.text} />
    </View>
  );
});

/**
 * Карточка темы (`.topic`): плитка урока, «Урок n» и название.
 * ЗАМОК ВЛАДЕЛЬЦА 25.10 «убери 2 доп вопроса вообще»: один вопрос на урок — точек попыток справа нет, текст занимает их место.
 */
export const PlacementTopicCard = memo(function PlacementTopicCard({ lang, lessonOrdinal, title }: Readonly<{ lang: string; lessonOrdinal: number; title: string }>) {
  const g = useLv2Glass();
  return (
    <View testID="placement-topic" style={[styles.topic, lv2TaskPlateStyle(g)]}>
      <PlacementLessonTile lessonOrdinal={lessonOrdinal} />
      <View style={styles.topicText}>
        <Text style={[styles.topicKicker, { color: g.secondary }]}>{seasonText(lang as never, 'lesson', { n: lessonOrdinal })}</Text>
        <Text style={[styles.topicTitle, { color: g.text }]} numberOfLines={2}>{title}</Text>
      </View>
    </View>
  );
});

type FooterProps = Readonly<{ primaryLabel: string; onPrimary: () => void; ghostLabel?: string; onGhost?: () => void; bottomInset: number; primaryDisabled?: boolean }>;

/** `.exfoot`: подвал с главной кнопкой `.tcta` (52, радиус 26) и, на старте, вторичной кнопкой (50, радиус 25, `--ctl`). */
export const PlacementFooter = memo(function PlacementFooter({ primaryLabel, onPrimary, ghostLabel, onGhost, bottomInset, primaryDisabled }: FooterProps) {
  const g = useLv2Glass();
  const t = lv2TaskTokens(g);
  return (
    <View style={[styles.foot, { backgroundColor: t.footerSolid, paddingBottom: PLACEMENT_LAYOUT.foot.padBottom + bottomInset }]}>
      <V2Pressable testID="placement-cta" accessibilityRole="button" disabled={primaryDisabled} onPress={onPrimary} style={[styles.cta, { backgroundColor: primaryDisabled ? t.controlSoft : t.ctaFill }]}>
        <Text style={[styles.ctaText, { color: primaryDisabled ? g.secondary : t.ctaInk }]}>{primaryLabel}</Text>
      </V2Pressable>
      {ghostLabel && onGhost ? (
        <V2Pressable testID="placement-ghost" accessibilityRole="button" onPress={onGhost} style={[styles.ghost, { backgroundColor: t.controlSoft }]}>
          <Text style={[styles.ghostText, { color: g.text }]}>{ghostLabel}</Text>
        </V2Pressable>
      ) : null}
    </View>
  );
});

const L = PLACEMENT_LAYOUT;
const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: L.top.gap, minHeight: L.top.minHeight, marginTop: L.top.marginTop, paddingHorizontal: 20 },
  close: { width: L.top.close, height: L.top.close, borderRadius: L.top.close / 2, alignItems: 'center', justifyContent: 'center' },
  progressColumn: { flex: 1 },
  track: { height: L.progress.height, borderRadius: L.progress.radius, overflow: 'hidden' },
  fill: { height: L.progress.height, borderRadius: L.progress.radius },
  progressText: { marginTop: L.progress.labelGap, fontSize: L.progress.labelSize, lineHeight: L.progress.labelLine, fontWeight: '700' },
  tile: { width: L.topic.tile, height: L.topic.tile, borderRadius: L.topic.tileRadius, alignItems: 'center', justifyContent: 'center' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: L.topic.gap, marginTop: L.topic.marginTop, borderRadius: L.topic.radius, paddingVertical: L.topic.padV, paddingHorizontal: L.topic.padH },
  topicText: { flex: 1, minWidth: 0 },
  topicKicker: { fontSize: L.topic.kickerSize, lineHeight: L.topic.kickerLine, fontWeight: '700' },
  topicTitle: { marginTop: 2, fontSize: L.topic.titleSize, lineHeight: L.topic.titleLine, fontWeight: '700' },
  foot: { paddingTop: L.foot.padTop, paddingHorizontal: L.foot.padH },
  cta: { height: L.foot.cta, borderRadius: L.foot.cta / 2, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  ghost: { marginTop: L.foot.ghostGap, height: L.foot.ghost, borderRadius: L.foot.ghost / 2, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
});
