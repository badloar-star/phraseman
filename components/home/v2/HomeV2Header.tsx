import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { V2GlassSheen, V2IconTile, useV2GlassStyle } from '../../v2/V2Glass';

type StatChip = Readonly<{
  testID: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
}>;

type Props = {
  isPro: boolean;
  tagline: string;
  /** Колокольчик (NotificationCenterButton) — со своей логикой и шторкой. */
  bellSlot?: React.ReactNode;
  /** Аватар профиля — со своей навигацией. */
  avatarSlot?: React.ReactNode;
  stats: readonly [StatChip, StatChip];
};

/**
 * Шапка новой Главной по референсу владельца 24.09 (2.0): «PhraseMan» + корона
 * + PRO, справа колокольчик и аватар; под названием слоган, справа две плашки
 * «Серия» и «Монеты».
 */
export default function HomeV2Header({ isPro, tagline, bellSlot, avatarSlot, stats }: Props) {
  const p = useV2Palette();
  const glass = useV2GlassStyle();
  return (
    <View testID="home-v2-header" style={s.root}>
      <View style={s.topRow}>
        <View style={s.brand}>
          <Text accessibilityRole="header" numberOfLines={1} style={[s.logo, { color: p.text }]}>PhraseMan</Text>
          {isPro ? (
            <>
              <CrownIcon color={p.gold} />
              <View testID="home-v2-pro-badge" style={[s.pro, { borderColor: p.outline }]}>
                <Text style={[s.proText, { color: p.text }]}>PRO</Text>
              </View>
            </>
          ) : null}
        </View>
        <View style={s.actions}>
          {bellSlot}
          {avatarSlot}
        </View>
      </View>
      <View style={s.bottomRow}>
        <Text numberOfLines={2} style={[s.tagline, { color: p.textSecondary }]}>{tagline}</Text>
        <View style={s.stats}>
          {stats.map((stat, index) => (
            <V2Pressable
              key={stat.testID}
              testID={stat.testID}
              accessibilityRole="button"
              accessibilityLabel={stat.accessibilityLabel}
              onPress={stat.onPress}
              scaleTo={0.96}
              style={[s.stat, glass]}
            >
              <V2GlassSheen seed={index} />
              <View style={s.statIcon}>{stat.icon}</View>
              <View style={s.statCopy}>
                <Text numberOfLines={1} style={[s.statValue, { color: p.text }]}>{stat.value}</Text>
                <Text numberOfLines={1} style={[s.statLabel, { color: p.textSecondary }]}>{stat.label}</Text>
              </View>
            </V2Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Корона-контур (22 pt) без целого шрифта иконок ради одного знака. */
function CrownIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path
        d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const s = StyleSheet.create({
  root: { paddingTop: 8, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  logo: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, flexShrink: 1 },
  pro: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    alignItems: 'center',
    justifyContent: 'center',
  },
  proText: { fontSize: 12, lineHeight: 15, fontWeight: '800', letterSpacing: 0.6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tagline: { ...V2_TYPE.subtitle, fontSize: 13, lineHeight: 18, flexShrink: 1 },
  stats: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  stat: {
    // Одинаковая минимальная ширина, как на референсе; длинное «12 дней»
    // растит плашку, а не обрезается.
    minWidth: 100,
    height: 46,
    borderRadius: V2.radius.row,
    borderWidth: StyleSheet.hairlineWidth, // guard-ok: D43
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 9,
    paddingRight: 12,
  },
  statIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  statCopy: { flexShrink: 0 },
  statValue: { fontSize: 15, lineHeight: 18, fontWeight: '800' },
  statLabel: { ...V2_TYPE.caption },
});
