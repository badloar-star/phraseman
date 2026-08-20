import React, { memo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';

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
    ru: 'Разбор твоего пути',
    uk: 'Розбір твого шляху',
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
    ru: 'Где ты среди всех учеников',
    uk: 'Де ти серед усіх учнів',
    es: 'Tu posición entre todos los alumnos',
    'pt-BR': 'Sua posição entre todos os alunos',
    vi: 'Vị trí của bạn giữa các học viên',
    id: 'Posisimu di antara semua siswa',
    tr: 'Tüm öğrenciler arasındaki yerin',
    pl: 'Twoje miejsce wśród wszystkich uczniów',
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

function PremiumStatsPlaceholder({ snapshotKey }: { snapshotKey?: StatsPremiumSnapshotKey }) {
  const isHeatmap = snapshotKey === 'heatmap';
  const isChart = snapshotKey === 'pathChart' || snapshotKey === 'lifetimeTotals';
  const rows = isHeatmap ? 7 : 5;
  const cols = isHeatmap ? 12 : 6;

  return (
    <View pointerEvents="none" style={styles.placeholder}>
      {isHeatmap ? (
        <View style={styles.heatmapGrid}>
          {Array.from({ length: rows * cols }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.heatmapCell,
                { opacity: 0.18 + ((index * 7) % 5) * 0.055 },
              ]}
            />
          ))}
        </View>
      ) : (
        <>
          <View style={styles.placeholderHeader}>
            <View style={styles.placeholderTitle} />
            <View style={styles.placeholderPill} />
          </View>
          <View style={styles.placeholderBody}>
            {Array.from({ length: rows }).map((_, index) => (
              <View key={index} style={styles.placeholderRow}>
                <View style={[styles.placeholderDot, { opacity: 0.24 + index * 0.04 }]} />
                <View style={[styles.placeholderLine, { width: `${72 - index * 7}%` }]} />
              </View>
            ))}
          </View>
          <View style={styles.placeholderBars}>
            {Array.from({ length: cols }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.placeholderBar,
                  {
                    height: isChart ? 38 + ((index * 13) % 58) : 22 + ((index * 11) % 44),
                    opacity: 0.18 + ((index * 3) % 4) * 0.07,
                  },
                ]}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function StatsPremiumBlur({
  children,
  isPremium,
  context,
  snapshotKey,
  overrideTitle,
  devUnlock = false,
}: StatsPremiumBlurProps) {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();

  // зачем: флаг был захардкожен false, и тернарники isLight ниже были мёртвым кодом —
  // sagePorcelain получала тёмный вариант бейджа/заголовка. Включаем реальный признак
  // единственной светлой темы через центральный классификатор.
  const isLight = isLightThemeMode(themeMode);
  const titleCopy = CONTEXT_TITLES[context];
  const title = overrideTitle ?? triLang(lang, titleCopy);
  const ctaLabel = triLang(lang, {
    ru: 'Открыть с Plus',
    uk: 'Відкрити з Plus',
    es: 'Abrir con Plus',
    'pt-BR': 'Abrir com Plus',
    vi: 'Mở bằng Plus',
    id: 'Buka dengan Plus',
    tr: 'Plus ile aç',
    pl: 'Otwórz z Plus',
  });
  if (isPremium || devUnlock) return <>{children}</>;

  return (
    <View style={[styles.root, context === 'heatmap' ? styles.heatmapRoot : styles.statsRoot]} collapsable={false}>
      <PremiumStatsPlaceholder snapshotKey={snapshotKey} />
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
          {/* зачем: на белом бейдже светлой темы яркое #FFD700 выцветает (~1.2:1);
              t.gold sagePorcelain — тёмная бронза #8B6320 (~4.7:1), замок остаётся премиумным */}
          <Ionicons name="lock-closed" size={28} color={isLight ? t.gold : '#FFD700'} />
        </View>
        <View style={styles.titleCtaBlock}>
          {/* зачем: подложка вуали форсированно тёмная (скримы плейсхолдера не зависят от темы),
              тёмный t.textPrimary светлой темы на ней невидим (~1.4:1) — берём фарфоровый белый
              в тон bgCard sagePorcelain (~11:1) вместо золота, кричащего на спокойной теме */}
          <Text style={[styles.title, { color: isLight ? '#FCFDF9' : '#FFD700', fontSize: f.bodyLg }]}>
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
                <Ionicons name="diamond" size={18} color={'#1a1208'} />
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
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    padding: 18,
    backgroundColor: 'rgba(8,8,10,0.72)',
    justifyContent: 'space-between',
  },
  snapshotScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.26)',
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
    borderWidth: 0,
    borderColor: 'rgba(255,215,0,0.10)',
    backgroundColor: 'rgba(0,0,0,0.00)',
  },
  placeholderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  placeholderTitle: {
    height: 16,
    width: '48%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.20)',
  },
  placeholderPill: {
    height: 24,
    width: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 0,
    borderColor: 'rgba(255,215,0,0.16)',
  },
  placeholderBody: {
    gap: 10,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeholderDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFD700',
  },
  placeholderLine: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  placeholderBars: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  placeholderBar: {
    flex: 1,
    minWidth: 12,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: '#FFD700',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: 5,
    flex: 1,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFD700',
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
    borderWidth: 0,
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
