import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { V2Card, V2Cta } from '../tournament/tournament_v2_ui';
import type { ArenaFeatureState, ArenaHubSection } from '../../modules/arena/expansion_contract';
import { ARENA_HUB_SECTIONS } from '../../modules/arena/expansion_contract';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function ArenaSectionTabs({
  selected,
  labels,
  onSelect,
}: Readonly<{
  selected: ArenaHubSection;
  labels: Readonly<Record<ArenaHubSection, string>>;
  onSelect: (section: ArenaHubSection) => void;
}>) {
  const P = useTournamentPalette();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={styles.tabs}
    >
      {ARENA_HUB_SECTIONS.map((section) => {
        const active = section === selected;
        return (
          <Pressable
            key={section}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(section)}
            style={[styles.tab, { backgroundColor: active ? P.accent : P.elev }]}
          >
            <Text style={[styles.tabText, { color: active ? P.okInk : P.text }]}>{labels[section]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ArenaWalletButton({ label, balance, onPress, disabled = false }: { label: string; balance: number; onPress: () => void; disabled?: boolean }) {
  const P = useTournamentPalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${balance}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.walletButton, { backgroundColor: P.gold, opacity: disabled ? 0.55 : 1 }]}
    >
      <Ionicons name="star" size={17} color={P.onGold} />
      <Text style={[styles.walletValue, { color: P.onGold }]}>{balance}</Text>
    </Pressable>
  );
}

export function ArenaFeatureRow({
  title,
  body,
  icon,
  onPress,
  disabled = false,
  accent = false,
  badge,
}: Readonly<{
  title: string;
  body?: string;
  icon: IconName;
  onPress?: () => void;
  disabled?: boolean;
  accent?: boolean;
  badge?: string;
}>) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const foreground = accent ? P.okInk : disabled ? P.ghost : P.text;
  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(220)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={[title, body, badge].filter(Boolean).join('. ')}
        disabled={disabled}
        onPress={onPress}
        style={[styles.feature, { backgroundColor: accent ? P.accent : P.elev, opacity: disabled ? 0.62 : 1 }]}
      >
        <View style={[styles.featureIcon, { backgroundColor: accent ? 'rgba(7,17,10,0.13)' : P.elev2 }]}>
          <Ionicons name={icon} size={25} color={foreground} />
        </View>
        <View style={styles.featureCopy}>
          <Text style={[styles.featureTitle, { color: foreground }]}>{title}</Text>
          {body ? <Text style={[styles.featureBody, { color: accent ? P.okInk : P.muted }]}>{body}</Text> : null}
          {badge ? <Text style={[styles.featureBadge, { color: accent ? P.okInk : P.gold }]}>{badge}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={22} color={foreground} />
      </Pressable>
    </Animated.View>
  );
}

export function ArenaProgress({ value, max, label }: { value: number; max: number; label: string }) {
  const P = useTournamentPalette();
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max, now: value }} style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: P.elev2 }]}>
        <View style={[styles.progressFill, { backgroundColor: P.accent, width: `${ratio * 100}%` }]} />
      </View>
      <Text style={[styles.progressText, { color: P.muted }]}>{value} / {max}</Text>
    </View>
  );
}

export function ArenaDisclosureBadge({ text }: { text: string }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.disclosure, { backgroundColor: P.goldSoft }]}>
      <Ionicons name="information-circle" size={18} color={P.gold} />
      <Text style={[styles.disclosureText, { color: P.text }]}>{text}</Text>
    </View>
  );
}

export function ArenaStateCard({
  state,
  title,
  body,
  actionLabel,
  onAction,
}: Readonly<{
  state: ArenaFeatureState;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}>) {
  const P = useTournamentPalette();
  const icon: IconName = state === 'error' ? 'alert-circle'
    : state === 'expired' ? 'time'
      : state === 'unavailable' ? 'lock-closed'
        : state === 'empty' ? 'albums-outline'
          : state === 'loading' ? 'hourglass-outline'
            : 'checkmark-circle';
  return (
    <V2Card style={styles.stateCard}>
      <Ionicons name={icon} size={32} color={state === 'error' ? P.danger : P.accent} />
      <Text accessibilityLiveRegion="polite" style={[styles.stateTitle, { color: P.text }]}>{title}</Text>
      {body ? <Text style={[styles.stateBody, { color: P.muted }]}>{body}</Text> : null}
      {actionLabel && onAction ? <View style={styles.stateAction}><V2Cta onPress={onAction}>{actionLabel}</V2Cta></View> : null}
    </V2Card>
  );
}

export function ArenaSectionTitle({ children }: { children: React.ReactNode }) {
  const P = useTournamentPalette();
  return <Text style={[styles.sectionTitle, { color: P.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  tabs: { gap: 8, paddingVertical: 2 },
  tab: { minHeight: 46, minWidth: 82, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 14, fontWeight: '800' },
  walletButton: { minHeight: 44, minWidth: 64, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  walletValue: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  feature: { minHeight: 82, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 17, fontWeight: '900' },
  featureBody: { marginTop: 2, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  featureBadge: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '900' },
  progressWrap: { gap: 6 },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { alignSelf: 'flex-end', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  disclosure: { minHeight: 44, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclosureText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  stateCard: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stateBody: { fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  stateAction: { width: '100%', marginTop: 4 },
  sectionTitle: { marginTop: 2, fontSize: 19, lineHeight: 25, fontWeight: '900' },
});
