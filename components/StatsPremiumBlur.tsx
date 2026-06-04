import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
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
 * - иначе → затемнение + blur/frost overlay поверх контента + замок/CTA.
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

  const titleByContext: Record<StatsPremiumBlurContext, {
    ru: string;
    uk: string;
    es: string;
    'pt-BR': string;
    vi: string;
    id: string;
    tr: string;
    pl: string;
  }> = {
    stats: {
      ru: 'Разбор твоего прогресса',
      uk: 'Розбір твого прогресу',
      es: 'Análisis de tu progreso',
      'pt-BR': 'Análise do seu progresso',
      vi: 'Phân tích tiến độ của bạn',
      id: 'Analisis progresmu',
      tr: 'İlerlemenin analizi',
      pl: 'Analiza twoich postępów',
    },
    heatmap: {
      ru: 'Годовой пульс обучения',
      uk: 'Річний пульс навчання',
      es: 'Pulso anual de aprendizaje',
      'pt-BR': 'Pulso anual de estudo',
      vi: 'Nhịp học trong năm',
      id: 'Denyut belajar tahunan',
      tr: 'Yıllık öğrenme ritmi',
      pl: 'Roczny rytm nauki',
    },
    patterns: {
      ru: 'Карта твоих слабых мест',
      uk: 'Карта твоїх слабких місць',
      es: 'Mapa de tus puntos débiles',
      'pt-BR': 'Mapa dos seus pontos fracos',
      vi: 'Bản đồ điểm yếu của bạn',
      id: 'Peta titik lemahmu',
      tr: 'Zayıf noktalarının haritası',
      pl: 'Mapa twoich słabych punktów',
    },
    percentiles: {
      ru: 'Где ты среди всех игроков',
      uk: 'Де ти серед усіх гравців',
      es: 'Tu posición entre todos',
      'pt-BR': 'Sua posição entre todos',
      vi: 'Vị trí của bạn giữa mọi người',
      id: 'Posisimu di antara semua pemain',
      tr: 'Tüm oyuncular arasındaki yerin',
      pl: 'Twoje miejsce wśród wszystkich graczy',
    },
  };
  const titleCopy = titleByContext[context];
  const title = overrideTitle ?? triLang(lang, {
    ru: titleCopy.ru,
    uk: titleCopy.uk,
    es: titleCopy.es,
    'pt-BR': titleCopy['pt-BR'],
    vi: titleCopy.vi,
    id: titleCopy.id,
    tr: titleCopy.tr,
    pl: titleCopy.pl,
  });
  const ctaLabel = triLang(lang, {
    ru: 'Открыть с Premium',
    uk: 'Відкрити з Premium',
    es: 'Abrir con Premium',
    'pt-BR': 'Abrir com Premium',
    vi: 'Mở bằng Premium',
    id: 'Buka dengan Premium',
    tr: 'Premium ile aç',
    pl: 'Otwórz z Premium',
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

  /** Форма графов чуть заметнее, мелкий текст и цифры за blur + dim остаются нечитаемыми. */
  const blurIntensity = 14;
  const renderNativeBlur = Platform.OS !== 'android';

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
      {renderNativeBlur ? (
        <BlurView
          tint={isLight ? 'light' : 'dark'}
          intensity={blurIntensity}
          style={[StyleSheet.absoluteFillObject, styles.blurLayer]}
        />
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.androidStaticBlurLayer]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.28)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View pointerEvents="none" style={[styles.androidSoftFocusBand, styles.androidSoftFocusBandTop]} />
          <View pointerEvents="none" style={[styles.androidSoftFocusBand, styles.androidSoftFocusBandBottom]} />
        </View>
      )}
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
  androidStaticBlurLayer: {
    zIndex: 2,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(10,10,12,0.56)',
  },
  androidSoftFocusBand: {
    position: 'absolute',
    left: -40,
    right: -40,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-10deg' }],
  },
  androidSoftFocusBandTop: {
    top: '18%',
  },
  androidSoftFocusBandBottom: {
    bottom: '12%',
    opacity: 0.7,
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
