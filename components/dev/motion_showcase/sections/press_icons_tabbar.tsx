// ─── Витрина движения · шард «Отклик · кнопки, иконки, таббар» ───
// зачем: каждый пункт запускает РЕАЛЬНУЮ поверхность приложения (не бутафорию).
// Шард пополняется независимо от других (мультиагентная параллель без конфликтов).
// Файл .tsx (не .ts): render-пункт монтирует живую превью-панель с иконками (JSX).
// Агрегатор components/dev/motion_showcase/index.ts импортирует без расширения —
// tsc/Metro резолвят .tsx точно так же, как .ts.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MotionModal from '../../../MotionModal';
import { useTheme } from '../../../ThemeContext';
import { StreakChainIcon } from '../../../StreakChainIcon';
import LevelBadge from '../../../LevelBadge';
import PlusBadge from '../../../PlusBadge';
import LeagueCrownName from '../../../LeagueCrownName';
import EnergyIcon from '../../../EnergyIcon';
import type { ShowcaseRenderProps, ShowcaseSection } from '../types';
import { cs } from '../showcase_copy';

/**
 * Живая превью-панель шести «целевых» иконок семьи «Отклик» в одном месте.
 * Только визуальные демо-пропсы (статичный уровень/стрик/энергия) — никаких
 * grant/spend/claim колбэков, ничего не пишет в прогресс или сеть.
 * NotificationCenterButton сюда сознательно НЕ включён — см. note ниже:
 * компонент сам читает Firestore и помечает уведомления прочитанными.
 */
function IconsLivePreview({ visible, onClose }: ShowcaseRenderProps) {
  const { theme: t, f, themeMode } = useTheme();
  return (
    <MotionModal visible={visible} onRequestClose={onClose} testID="motion-showcase-press-icons-preview">
      <View style={[styles.root, { backgroundColor: t.bgCard }]}>
        <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
          {cs('icons_live_preview_heading')}
        </Text>
        <Text style={[styles.hint, { color: t.textMuted, fontSize: f.caption }]}>
          {cs('icons_live_preview_hint')}
        </Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <StreakChainIcon themeMode={themeMode} streakDays={7} size={48} />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_streak_chain')}</Text>
          </View>
          <View style={styles.cell}>
            <LevelBadge level={12} size={48} autoplay={false} centeredNumber />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_level_badge')}</Text>
          </View>
          <View style={styles.cell}>
            <PlusBadge themeMode={themeMode} size="md" />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_plus_badge')}</Text>
          </View>
          <View style={styles.cell}>
            <LeagueCrownName text={cs('press_icon_league_crown_demo_text')} fontSize={16} count={3} />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_league_crown_name')}</Text>
          </View>
          <View style={styles.cell}>
            <EnergyIcon filled themeColor={t.accent} themeMode={themeMode} size={40} animateChange={false} />
            <Text style={[styles.cellLabel, { color: t.textMuted }]}>{cs('press_icon_cell_energy_icon')}</Text>
          </View>
        </View>
      </View>
    </MotionModal>
  );
}

const IconsLivePreviewMemo = memo(IconsLivePreview);

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, gap: 6 },
  title: { fontWeight: '800' },
  hint: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 12 },
  cell: { alignItems: 'center', gap: 6, width: 92 },
  cellLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
});

export const SECTION: ShowcaseSection = {
  id: 'press_icons_tabbar',
  order: 80,
  title: cs('press_icons_tabbar_section_title'),
  items: [
    // ── Пресс-примитивы: три текущих реализации + целевой гибрид-стандарт ──
    {
      id: 'press-primitive-pressablescale-root',
      title: cs('press_primitive_root_title'),
      kind: 'note',
      note: cs('press_primitive_root_note'),
    },
    {
      id: 'press-primitive-pressablescale-feedback',
      title: cs('press_primitive_feedback_title'),
      kind: 'note',
      note: cs('press_primitive_feedback_note'),
    },
    {
      id: 'press-primitive-tapscale',
      title: cs('press_primitive_tapscale_title'),
      kind: 'note',
      note: cs('press_primitive_tapscale_note'),
    },
    {
      id: 'press-primitive-target-hybrid',
      title: cs('press_primitive_target_hybrid_title'),
      kind: 'note',
      note: cs('press_primitive_target_hybrid_note'),
    },
    // ── Целевые статичные иконки: что оживёт по какому событию ──
    {
      id: 'icon-target-streak-chain',
      title: cs('icon_target_streak_chain_title'),
      kind: 'note',
      note: cs('icon_target_streak_chain_note'),
    },
    {
      id: 'icon-target-level-badge',
      title: cs('icon_target_level_badge_title'),
      kind: 'note',
      note: cs('icon_target_level_badge_note'),
    },
    {
      id: 'icon-target-plus-badge',
      title: cs('icon_target_plus_badge_title'),
      kind: 'note',
      note: cs('icon_target_plus_badge_note'),
    },
    {
      id: 'icon-target-league-crown-name',
      title: cs('icon_target_league_crown_name_title'),
      kind: 'note',
      note: cs('icon_target_league_crown_name_note'),
    },
    {
      id: 'icon-target-notification-center-button',
      title: cs('icon_target_notification_center_button_title'),
      kind: 'note',
      note: cs('icon_target_notification_center_button_note'),
    },
    {
      id: 'icon-target-energy-icon',
      title: cs('icon_target_energy_icon_title'),
      kind: 'note',
      note: cs('icon_target_energy_icon_note'),
    },
    // ── Живое превью: все целевые иконки разом, безопасные демо-пропсы ──
    {
      id: 'icons-live-preview',
      title: cs('icons_live_preview_title'),
      kind: 'render',
      detail: cs('icons_live_preview_detail'),
      render: ({ visible, onClose }) => <IconsLivePreviewMemo visible={visible} onClose={onClose} />,
    },
    // ── Реальный таббар для проверки текущего состояния ──
    {
      id: 'route-tabbar-home',
      title: cs('route_tabbar_home_title'),
      kind: 'route',
      route: '/(tabs)/home',
      detail: cs('route_tabbar_home_detail'),
    },
  ],
};
