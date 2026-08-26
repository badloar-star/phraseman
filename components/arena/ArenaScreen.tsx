import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { type TournamentBackdropVariant } from '../ui/V2Backdrop';
import ScreenGradient from '../ScreenGradient';
import { TournamentFxHost, type TournamentFxApi } from '../ui/V2Fx';
import { useTournamentPalette } from '../ui/v2_theme';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { navigationFallbackForPath, safeRouterBack } from '../../app/navigation_back';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';

export function ArenaScreen({
  title,
  subtitle,
  children,
  variant = 'hub',
  scroll = true,
  onBack,
  backDisabled = false,
  fxRef,
  headerRight,
  overlay,
  showBack = true,
  extraBottomInset = 0,
  bottomContentInset,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: TournamentBackdropVariant;
  scroll?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
  fxRef?: React.Ref<TournamentFxApi>;
  headerRight?: React.ReactNode;
  showBack?: boolean;
  extraBottomInset?: number;
  /** Exact bottom padding for main-tab surfaces with the floating app tabbar. */
  bottomContentInset?: number;
  /**
   * Полноэкранная гибрид-сцена поверх всего экрана (ArenaRankChangeHybrid) —
   * рисуется НАД TournamentFxHost, привязана к `root`
   * (position:relative по умолчанию в RN), а не к скроллящемуся контенту:
   * иначе position:absolute сцены заняла бы место внутри ScrollView вместо
   * перекрытия всего экрана.
   */
  overlay?: React.ReactNode;
}>) {
  const P = useTournamentPalette();
  // зачем: `variant` остаётся частью публичного API экрана (его передают бой,
  // разбор, лобби), но фон он больше НЕ выбирает — фон общий с главной.
  // Явное `void` держит проп живым, чтобы линтер не счёл его мусором, а
  // следующая сессия не вырезала его из сигнатуры вместе с вызовами.
  void variant;
  const insets = useStableSafeAreaInsets();
  const window = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();
  const content = (
    <View style={[styles.content, !scroll ? styles.contentFixed : null]}>
      <View style={styles.header}>
        {showBack ? <Pressable
          accessibilityRole="button"
          accessibilityLabel={arenaText(lang, 'back')}
          accessibilityState={{ disabled: backDisabled }}
          disabled={backDisabled}
          hitSlop={8}
          onPress={onBack ?? (() => safeRouterBack(router, navigationFallbackForPath(pathname) as never))}
          style={[styles.back, backDisabled ? styles.backDisabled : null, { backgroundColor: P.elev }]}
        >
          <Ionicons name="chevron-back" size={25} color={P.text} />
        </Pressable> : null}
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
    <ScreenGradient style={styles.root} artBackdrop="home">
      {/*
        зачем 2026-08-24 (владелец: «в разделе арена фон должен быть такой же
        как фон на главной, он не должен отличаться»): Арена рисовала свой
        TournamentBackdrop — он брал те же BG_GRADIENTS, но клал их плоско
        (вертикаль + locations 0/0.5/1) и БЕЗ остальных слоёв главной:
        диагонали 0.3,0→0.7,1, донного скрима, арт-бэкдропа маршрута и
        эффектов темы (орбы / CinemaBloom / GoldFabricFlow). Из-за этого
        Арена рядом с главной читалась плоской и другого оттенка. Теперь тот
        же самый компонент, что и на главной — расходиться им больше нечем.
        `variant` остаётся в API: его читают экраны боя/разбора.
      */}
      {scroll ? (
        <ScrollView decelerationRate="fast" contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: bottomContentInset ?? (Math.max(24, insets.bottom + 16) + extraBottomInset) }]}>{content}</ScrollView>
      ) : <View style={[styles.fixed, { paddingTop: insets.top, paddingBottom: bottomContentInset ?? (Math.max(16, insets.bottom) + extraBottomInset) }]}>{content}</View>}
      <TournamentFxHost ref={fxRef} width={window.width} height={window.height} />
      {overlay}
    </ScreenGradient>
  );
}

export function ArenaStat({ label, value, style }: { label: string; value: React.ReactNode; style?: ViewStyle }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.stat, { backgroundColor: P.elev }, style]}>
      <Text maxFontSizeMultiplier={1.35} style={[styles.statValue, { color: P.text }]}>{value}</Text>
      <Text maxFontSizeMultiplier={1.5} style={[styles.statLabel, { color: P.muted }]}>{label}</Text>
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
  backDisabled: { opacity: 0.45 },
  heading: { flex: 1 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { marginTop: 2, fontSize: 14, fontWeight: '600' },
  stat: { minHeight: 74, flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 10 },
  statValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'center', flexShrink: 1 },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
