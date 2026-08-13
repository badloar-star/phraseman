import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { TournamentBackdrop, type TournamentBackdropVariant } from '../tournament/TournamentBackdrop';
import { TournamentFxHost, type TournamentFxApi } from '../tournament/TournamentFx';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';

export function ArenaScreen({
  title,
  subtitle,
  children,
  variant = 'hub',
  scroll = true,
  onBack,
  fxRef,
  headerRight,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: TournamentBackdropVariant;
  scroll?: boolean;
  onBack?: () => void;
  fxRef?: React.Ref<TournamentFxApi>;
  headerRight?: React.ReactNode;
}>) {
  const P = useTournamentPalette();
  const insets = useStableSafeAreaInsets();
  const window = useWindowDimensions();
  const router = useRouter();
  const { lang } = useLang();
  const content = (
    <View style={[styles.content, !scroll ? styles.contentFixed : null]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={arenaText(lang, 'back')}
          hitSlop={8}
          onPress={onBack ?? (() => router.back())}
          style={[styles.back, { backgroundColor: P.elev }]}
        >
          <Ionicons name="chevron-back" size={25} color={P.text} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: P.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: P.muted }]}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      {children}
    </View>
  );
  return (
    <View style={[styles.root, { backgroundColor: P.bg, paddingTop: insets.top }]}>
      {/*
        Фон Арены идёт под статус-бар целиком — как на главной. Раньше сейф-зона
        закрывалась сплошной заливкой, и сверху шла чёрная полоса: экран
        выглядел обрезанным, а не цельным.
      */}
      <TournamentBackdrop variant={variant} capSafeTop={false} />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>{content}</ScrollView>
      ) : <View style={[styles.fixed, { paddingBottom: Math.max(16, insets.bottom) }]}>{content}</View>}
      <TournamentFxHost ref={fxRef} width={window.width} height={window.height} />
    </View>
  );
}

export function ArenaStat({ label, value, style }: { label: string; value: React.ReactNode; style?: ViewStyle }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.stat, { backgroundColor: P.elev }, style]}>
      <Text style={[styles.statValue, { color: P.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: P.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fixed: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 18, gap: 16 },
  contentFixed: { flex: 1 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: 2, fontSize: 14, fontWeight: '600' },
  stat: { minHeight: 74, flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 10 },
  statValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
