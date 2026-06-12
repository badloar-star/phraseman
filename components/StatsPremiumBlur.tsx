import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { selectStatsPremiumBlurPresentation } from './statsPremiumBlurCache';

export type StatsPremiumBlurContext = 'stats' | 'heatmap' | 'patterns' | 'percentiles';
export type StatsPremiumSnapshotKey =
  | 'learningCoach'
  | 'weekRhythm'
  | 'heatmap'
  | 'percentiles'
  | 'pathChart'
  | 'lifetimeTotals';

export interface StatsPremiumBlurProps {
  children: ReactNode;
  isPremium: boolean;
  context: StatsPremiumBlurContext;
  snapshotKey?: StatsPremiumSnapshotKey;
  overrideTitle?: string;
  /** Dev/QA: show content without the premium veil in dev builds only. */
  devUnlock?: boolean;
}

const CONTEXT_TITLES: Record<StatsPremiumBlurContext, {
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

function PremiumSnapshotSheen() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.veilBand, styles.veilBandTop]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,215,0,0.00)', 'rgba(255,215,0,0.16)', 'rgba(255,255,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.veilBand, styles.veilBandMiddle]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.veilBand, styles.veilBandBottom]}
      />
      <View pointerEvents="none" style={styles.veilVignette} />
    </View>
  );
}

function StatsPremiumBlur({
  children,
  isPremium,
  context,
  overrideTitle,
  devUnlock = false,
}: StatsPremiumBlurProps) {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const captureSourceRef = useRef<View>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureInFlightRef = useRef(false);
  const captureDoneRef = useRef(false);
  const [cachedBlurUri, setCachedBlurUri] = useState<string | null>(null);
  const [captureSize, setCaptureSize] = useState({ width: 0, height: 0 });

  const isLight = false;
  const titleCopy = CONTEXT_TITLES[context];
  const title = overrideTitle ?? triLang(lang, titleCopy);
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
  const blurPresentation = selectStatsPremiumBlurPresentation({
    cachedUri: cachedBlurUri,
    width: captureSize.width,
    height: captureSize.height,
  });

  useEffect(() => {
    if (isPremium || devUnlock) return undefined;
    if (captureSize.width <= 0 || captureSize.height <= 0) return undefined;
    if (captureDoneRef.current) return undefined;
    if (captureInFlightRef.current) return undefined;

    if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    captureTimerRef.current = setTimeout(() => {
      const node = captureSourceRef.current;
      if (!node || captureInFlightRef.current) return;

      captureInFlightRef.current = true;
      captureRef(node, {
        format: 'jpg',
        quality: 0.78,
        result: 'tmpfile',
      })
        .then((uri) => {
          if (uri) {
            captureDoneRef.current = true;
            setCachedBlurUri(uri);
          }
        })
        .catch(() => {
          setCachedBlurUri(null);
        })
        .finally(() => {
          captureInFlightRef.current = false;
        });
    }, 120);

    return () => {
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    };
  }, [captureSize.height, captureSize.width, devUnlock, isPremium]);

  if (isPremium || devUnlock) return <>{children}</>;

  return (
    <View style={[styles.root, context === 'heatmap' ? styles.heatmapRoot : styles.statsRoot]} collapsable={false}>
      {blurPresentation === 'cached-image' ? (
        <View
          pointerEvents="none"
          style={[styles.cachedContentSpacer, { height: captureSize.height }]}
        />
      ) : (
        <View
          ref={captureSourceRef}
          pointerEvents="none"
          collapsable={false}
          style={styles.contentUnderVeil}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setCaptureSize((prev) => (
              Math.round(prev.width) === Math.round(width) && Math.round(prev.height) === Math.round(height)
                ? prev
                : { width, height }
            ));
          }}
        >
          {children}
        </View>
      )}
      {blurPresentation === 'cached-image' ? (
        <Image
          source={{ uri: cachedBlurUri! }}
          contentFit="fill"
          blurRadius={6}
          style={styles.cachedBlurImage}
        />
      ) : (
        <BlurView
          pointerEvents="none"
          intensity={10}
          tint="default"
          blurReductionFactor={4}
          experimentalBlurMethod="dimezisBlurView"
          style={styles.blurVeil}
        />
      )}
      <View pointerEvents="none" style={styles.snapshotScrim} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.sheenLayer]}>
        <PremiumSnapshotSheen />
      </View>
      <Pressable
        onPress={() => {
          hapticTap();
          router.push({ pathname: '/premium_modal', params: { context } } as any);
        }}
        style={styles.overlay}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <View style={[styles.lockBadge, { backgroundColor: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(20,16,8,0.85)' }]}>
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
              <View style={styles.ctaInner}>
                <Ionicons name="diamond" size={18} color="#1a1208" />
                <Text style={[styles.ctaText, { fontSize: f.body }]}>{ctaLabel}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default memo(StatsPremiumBlur);

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
  },
  statsRoot: {
    minHeight: 318,
  },
  heatmapRoot: {
    minHeight: 252,
  },
  contentUnderVeil: {
    opacity: 1,
  },
  cachedContentSpacer: {
    width: '100%',
  },
  blurVeil: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  cachedBlurImage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  snapshotScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  sheenLayer: {
    zIndex: 3,
    overflow: 'hidden',
    borderRadius: 16,
  },
  veilBand: {
    position: 'absolute',
    left: -80,
    right: -80,
    height: 78,
    borderRadius: 40,
    transform: [{ rotate: '-9deg' }],
  },
  veilBandTop: {
    top: '17%',
    opacity: 0.08,
  },
  veilBandMiddle: {
    top: '46%',
    opacity: 0.14,
  },
  veilBandBottom: {
    bottom: '7%',
    opacity: 0.06,
  },
  veilVignette: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.10)',
    backgroundColor: 'rgba(0,0,0,0.00)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
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
    borderColor: '#FFD700',
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  ctaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 200,
  },
  ctaGradient: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#1a1208',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
