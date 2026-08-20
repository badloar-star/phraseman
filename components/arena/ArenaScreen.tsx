import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { TournamentBackdrop, type TournamentBackdropVariant } from '../tournament/TournamentBackdrop';
import { TournamentFxHost, type TournamentFxApi } from '../tournament/TournamentFx';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { navigationFallbackForPath, safeRouterBack } from '../../app/navigation_back';
import { useArenaChromeInset } from './arena_chrome_inset';
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
  /**
   * Полноэкранная гибрид-сцена поверх всего экрана (напр. ArenaTierUpHybrid/
   * ArenaTierDownHybrid) — рисуется НАД TournamentFxHost, привязана к `root`
   * (position:relative по умолчанию в RN), а не к скроллящемуся контенту:
   * иначе position:absolute сцены заняла бы место внутри ScrollView вместо
   * перекрытия всего экрана.
   */
  overlay?: React.ReactNode;
}>) {
  const P = useTournamentPalette();
  const insets = useStableSafeAreaInsets();
  const window = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();
  const chromeInset = useArenaChromeInset();
  const content = (
    <View style={[styles.content, !scroll ? styles.contentFixed : null]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={arenaText(lang, 'back')}
          accessibilityState={{ disabled: backDisabled }}
          disabled={backDisabled}
          hitSlop={8}
          onPress={onBack ?? (() => safeRouterBack(router, navigationFallbackForPath(pathname) as never))}
          style={[styles.back, backDisabled ? styles.backDisabled : null, { backgroundColor: P.elev }]}
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
    <View style={[styles.root, { backgroundColor: P.bg }]}>
      {/*
        Фон Арены идёт под статус-бар целиком — как на главной. Раньше сейф-зона
        закрывалась сплошной заливкой, и сверху шла чёрная полоса: экран
        выглядел обрезанным, а не цельным.

        Отступ сейф-зоны живёт на содержимом, а НЕ на корне. В Yoga (в отличие
        от вёрстки в браузере) отступы родителя сдвигают и абсолютно
        позиционированных детей: `paddingTop` на корне утащил бы фон вниз
        ровно на высоту сейф-зоны — и чёрная полоса вернулась бы на место,
        только теперь её рисовал бы сам корень.
      */}
      <TournamentBackdrop variant={variant} capSafeTop={false} />
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: Math.max(24, insets.bottom + 16) + chromeInset }]}>{content}</ScrollView>
      ) : <View style={[styles.fixed, { paddingTop: insets.top, paddingBottom: Math.max(16, insets.bottom) + chromeInset }]}>{content}</View>}
      <TournamentFxHost ref={fxRef} width={window.width} height={window.height} />
      {overlay}
    </View>
  );
}

export function ArenaStat({ label, value, style }: { label: string; value: React.ReactNode; style?: ViewStyle }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.stat, { backgroundColor: P.elev }, style]}>
      {/*
        Плитка узкая — треть ширины. При системном увеличении шрифта
        четырёхзначное число вылезало за её край и обрезалось на середине
        цифры: «1 24». Число важнее размера, поэтому оно ужимается, а подпись
        ограничена множителем и переносится.
      */}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.statValue, { color: P.text }]}>{value}</Text>
      <Text numberOfLines={3} maxFontSizeMultiplier={1.5} style={[styles.statLabel, { color: P.muted }]}>{label}</Text>
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
  statValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
