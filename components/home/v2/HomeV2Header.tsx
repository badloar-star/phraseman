import React from 'react';
import { StyleSheet, View } from 'react-native';
import V2Pressable from '../../v2/V2Pressable';
import { FlowText } from '../../text-integrity/FlowText';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2GlassSheen, useV2GlassStyle } from '../../v2/V2Glass';
import KitSpinner from '../../v2/KitSpinner';

type StatChip = Readonly<{
  testID: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
}>;

type Props = {
  /** Колокольчик (NotificationCenterButton) — со своей логикой и шторкой. */
  bellSlot?: React.ReactNode;
  /** Аватар профиля — со своей навигацией. */
  avatarSlot?: React.ReactNode;
  stats: readonly [StatChip, StatChip];
  /**
   * зачем (релизный пол 10.10): после входа серия и монеты догружаются в фоне до ~20 с —
   * тихий KitSpinner кита на месте значка, без сдвига разметки и без блокировки экрана.
   */
  refreshing?: boolean;
};

/** One compact utility row; the Home title and slogan are intentionally absent. */
export default function HomeV2Header({ bellSlot, avatarSlot, stats, refreshing = false }: Props) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  return (
    <View testID="home-v2-header" style={s.root}>
      <View style={s.topRow}>
        <View style={s.stats}>
          {stats.map((stat, index) => {
            const content = <>
              <V2GlassSheen seed={index} />
              <View style={s.statIcon}>{refreshing ? <KitSpinner testID={`${stat.testID}-refreshing`} color={p.text} /> : stat.icon}</View>
              <View style={s.statCopy}>
                <FlowText testID={`${stat.testID}-value`} provenance="authored" style={[s.statValue, { color: p.text }]}>{stat.value}</FlowText>
                <FlowText testID={`${stat.testID}-label`} provenance="authored" style={[s.statLabel, { color: p.textSecondary }]}>{stat.label}</FlowText>
              </View>
            </>;
            return stat.onPress ? (
              <V2Pressable
                key={stat.testID}
                testID={stat.testID}
                accessibilityRole="button"
                accessibilityLabel={stat.accessibilityLabel}
                onPress={stat.onPress}
                scaleTo={0.96}
                outerStyle={s.statSlot}
                style={[s.stat, glass]}
              >{content}</V2Pressable>
            ) : (
              <View key={stat.testID} testID={stat.testID} accessible accessibilityRole="text"
                accessibilityLabel={stat.accessibilityLabel} style={[s.statSlot, s.stat, glass]}>
                {content}
              </View>
            );
          })}
        </View>
        <View style={s.actions}>
          {bellSlot}
          {avatarSlot}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { paddingTop: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stats: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 6 },
  actions: { flexDirection: 'row', flexShrink: 0, alignItems: 'center', gap: 7 },
  statSlot: { flex: 1, minWidth: 0 },
  stat: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: V2.radius.row,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  statIcon: { width: 20, height: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  statCopy: { flex: 1, minWidth: 0 },
  statValue: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  statLabel: { ...V2_TYPE.caption, fontSize: 13, lineHeight: 17 },
});
