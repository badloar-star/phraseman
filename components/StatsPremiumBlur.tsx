import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';

export type StatsPremiumBlurContext = 'stats' | 'heatmap' | 'patterns' | 'percentiles';

export interface StatsPremiumBlurProps {
  children: ReactNode;
  isPremium: boolean;
  context: StatsPremiumBlurContext;
  overrideTitle?: string;
  /** Dev/QA: показывать контент без блюра (включают только из dev-сборок). */
  devUnlock?: boolean;
}

/**
 * Обёртка для premium-only блоков статистики.
 * - premium или devUnlock → children без изменений.
 * - иначе → лёгкое затемнение + BlurView поверх контента + замок/CTA (на Android — experimental blur).
 */
export default function StatsPremiumBlur({
  children,
  isPremium,
  context,
  overrideTitle,
  devUnlock = false,
}: StatsPremiumBlurProps) {
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();

  if (isPremium || devUnlock) return <>{children}</>;

  const isLight = false;

  const titleByContext: Record<StatsPremiumBlurContext, { ru: string; uk: string; es: string }> = {
    stats:       { ru: 'Разбор твоего прогресса',   uk: 'Розбір твого прогресу',    es: 'Análisis de tu progreso' },
    heatmap:     { ru: 'Годовой пульс обучения',     uk: 'Річний пульс навчання',    es: 'Pulso anual de aprendizaje' },
    patterns:    { ru: 'Карта твоих слабых мест',    uk: 'Карта твоїх слабких місць', es: 'Mapa de tus puntos débiles' },
    percentiles: { ru: 'Где ты среди всех игроков',  uk: 'Де ти серед усіх гравців', es: 'Tu posición entre todos' },
  };
  const title = overrideTitle ?? triLang(lang, titleByContext[context]);
  const ctaLabel = triLang(lang, {
    ru: 'Открыть с Premium',
    uk: 'Відкрити з Premium',
    es: 'Abrir con Premium',
  });

  const overlayContent = (
    <Pressable
      onPress={() => {
        hapticTap();
        router.push({ pathname: '/premium_modal', params: { context } } as any);
      }}
      style={styles.overlay}
      accessibilityRole="button"
      accessibilityLabel={ctaLabel}
    >
      <View style={[styles.lockBadge, { backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(20,16,8,0.85)', borderColor: '#FFD700' }]}>
        <Ionicons name="lock-closed" size={28} color="#FFD700" />
      </View>
      <View style={styles.titleCtaBlock}>
        <Text style={[styles.title, { color: isLight ? t.textPrimary : '#FFD700', fontSize: f.bodyLg }]}>
          {title}
        </Text>
        <View style={styles.ctaWrap}>
          <LinearGradient
            colors={['#B8860B', '#FFD700', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaText, { fontSize: f.body }]}>👑 {ctaLabel}</Text>
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );

  /** Одно значение на iOS и Android: форма графов чуть заметнее, мелкий текст и цифры за blur + dim остаются нечитаемыми. */
  const blurIntensity = 14;

  return (
    <View style={styles.root} collapsable={false}>
      <View style={styles.contentWrap} collapsable={false}>
        {children}
      </View>
      {/* Затемнение между контентом и blur: если нативный blur слабый, сетка всё равно не читается как без премиума. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.dimUnderBlur,
          { backgroundColor: isLight ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.21)' },
        ]}
      />
      <BlurView
        tint={isLight ? 'light' : 'dark'}
        intensity={blurIntensity}
        style={[StyleSheet.absoluteFillObject, styles.blurLayer]}
        {...(Platform.OS === 'android'
          ? { experimentalBlurMethod: 'dimezisBlurView' as const, blurReductionFactor: 4.85 }
          : {})}
      />
      <View style={styles.overlayAboveBlur} pointerEvents="box-none">
        {overlayContent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  contentWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    zIndex: 0,
  },
  dimUnderBlur: {
    zIndex: 1,
    borderRadius: 16,
  },
  blurLayer: {
    zIndex: 2,
    overflow: 'hidden',
    borderRadius: 16,
  },
  overlayAboveBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  titleCtaBlock: {
    alignItems: 'center',
    gap: 6,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: { fontWeight: '900', textAlign: 'center', letterSpacing: 0.4 },
  ctaWrap: { borderRadius: 14, overflow: 'hidden', minWidth: 200 },
  ctaGradient: { paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#1a1208', fontWeight: '900', letterSpacing: 0.4 },
});
