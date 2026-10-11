import React, { memo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens, type GlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';

const EXEMPT_COLOR_1 = 'rgba(255,255,255,0.00)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_2 = 'rgba(255,255,255,0.10)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_3 = 'rgba(255,255,255,0.00)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_4 = 'rgba(255,255,255,0.12)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_5 = 'rgba(255,255,255,0.00)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_6 = 'rgba(255,255,255,0.07)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_7 = 'rgba(255,255,255,0.35)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики
const EXEMPT_COLOR_8 = 'rgba(0,0,0,0.26)'; // theme-exempt: премиум-размытие: блики и скримы поверх статистики

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
  /** false — статус Plus ещё не определён: показываем нейтральную заглушку без замка и кнопки. */
  accessResolved?: boolean;
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
        colors={[EXEMPT_COLOR_1, EXEMPT_COLOR_2, 'rgba(255,255,255,0.00)']} // theme-exempt: оттенки замка Plus на статистике — бренд статуса
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.veilBand, styles.veilBandTop]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[EXEMPT_COLOR_3, EXEMPT_COLOR_4, 'rgba(255,255,255,0.00)']} // theme-exempt: оттенки замка Plus на статистике — бренд статуса
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.veilBand, styles.veilBandMiddle]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[EXEMPT_COLOR_5, EXEMPT_COLOR_6, 'rgba(255,255,255,0.00)']} // theme-exempt: оттенки замка Plus на статистике — бренд статуса
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.veilBand, styles.veilBandBottom]}
      />
      <View pointerEvents="none" style={styles.veilVignette} />
    </View>
  );
}

// зачем (01.10, стиль 2.0 «никакого жёлтого»): заглушка красится токенами темы — акцент в
// «Акценте/Максимуме», нейтральный тон в «Спокойно»; золото #FFD700 убрано.
function markColor(g: GlassTokens): string {
  return g.level === 'accent' || g.level === 'max' ? g.accentBright : g.secondary;
}

function PremiumStatsPlaceholder({ snapshotKey, g }: { snapshotKey?: StatsPremiumSnapshotKey; g: GlassTokens }) {
  const mark = markColor(g);
  const isHeatmap = snapshotKey === 'heatmap';
  const isChart = snapshotKey === 'pathChart' || snapshotKey === 'lifetimeTotals';
  const rows = isHeatmap ? 7 : 5;
  const cols = isHeatmap ? 12 : 6;

  return (
    <View pointerEvents="none" style={[styles.placeholder, { backgroundColor: g.opaqueCard }]}>
      {isHeatmap ? (
        <View style={styles.heatmapGrid}>
          {Array.from({ length: rows * cols }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.heatmapCell,
                { backgroundColor: mark, opacity: 0.18 + ((index * 7) % 5) * 0.055 },
              ]}
            />
          ))}
        </View>
      ) : (
        <>
          <View style={styles.placeholderHeader}>
            <View style={[styles.placeholderTitle, { backgroundColor: g.line }]} />
            <View style={[styles.placeholderPill, { backgroundColor: g.line }]} />
          </View>
          <View style={styles.placeholderBody}>
            {Array.from({ length: rows }).map((_, index) => (
              <View key={index} style={styles.placeholderRow}>
                <View style={[styles.placeholderDot, { backgroundColor: mark, opacity: 0.24 + index * 0.04 }]} />
                <View style={[styles.placeholderLine, { backgroundColor: g.line, width: `${72 - index * 7}%` }]} />
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
                    backgroundColor: mark,
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
  accessResolved = true,
}: StatsPremiumBlurProps) {
  const router = useRouter();
  const { f, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();

  const titleCopy = CONTEXT_TITLES[context];
  const title = overrideTitle ?? triLang(lang, titleCopy);
  const ctaLabel = triLang(lang, {
    ru: 'Открыть с Plus',
    uk: 'Відкрити з Plus',
    en: 'Unlock with Plus',
    es: 'Abrir con Plus',
    'pt-BR': 'Abrir com Plus',
    vi: 'Mở bằng Plus',
    id: 'Buka dengan Plus',
    tr: 'Plus ile aç',
    pl: 'Otwórz z Plus',
  });
  if (isPremium || devUnlock) return <>{children}</>;
  const vivid = g.level === 'accent' || g.level === 'max';
  const ctaBg = vivid ? g.accent : g.cta;
  const ctaInk = vivid ? g.accentInk : g.ctaInk;
  // зачем (эмулятор 01.10): пока статус Plus не определён, подписчик видел на мгновение
  // замок и «Открыть с Plus» (default-then-patch). Показываем только нейтральную заглушку
  // той же высоты — без замка и кнопки; геометрия не прыгает.
  if (!accessResolved) {
    return (
      <View style={[styles.root, context === 'heatmap' ? styles.heatmapRoot : styles.statsRoot]} collapsable={false}>
        <PremiumStatsPlaceholder snapshotKey={snapshotKey} g={g} />
      </View>
    );
  }

  return (
    <View style={[styles.root, context === 'heatmap' ? styles.heatmapRoot : styles.statsRoot]} collapsable={false}>
      <PremiumStatsPlaceholder snapshotKey={snapshotKey} g={g} />
      <View pointerEvents="none" style={[styles.snapshotScrim, { backgroundColor: g.isLight ? EXEMPT_COLOR_7 : EXEMPT_COLOR_8 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.sheenLayer]}>
        <PremiumSnapshotSheen />
      </View>
      <Pressable
        onPress={() => {
          hapticTap();
          // зачем (2026-09-13): замок статистики открывал пейвол без source и в
          // аналитике сливался с прямыми ссылками. Дизайн и контекст не меняются.
          router.push({ pathname: '/premium_modal', params: { context, source: 'stats_locked_card' } } as any);
        }}
        style={styles.overlay}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <View style={[styles.lockBadge, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name="lock-closed" size={28} color={vivid ? g.accentText : g.text} />
        </View>
        <View style={styles.titleCtaBlock}>
          <Text style={[styles.title, { color: g.text, fontSize: f.bodyLg }]}>
            {title}
          </Text>
          <View style={[styles.ctaWrap, { backgroundColor: ctaBg }]}>
            <View style={styles.ctaGradient}>
              <View style={styles.ctaInner}>
                <Ionicons name="diamond" size={18} color={ctaInk} />
                <Text style={[styles.ctaText, { color: ctaInk, fontSize: f.body }]}>{ctaLabel}</Text>
              </View>
            </View>
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
    backgroundColor: 'rgba(8,8,10,0.72)', // theme-exempt: премиум-размытие: блики и скримы поверх статистики
    justifyContent: 'space-between',
  },
  snapshotScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.26)', // theme-exempt: премиум-размытие: блики и скримы поверх статистики
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
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.00)', // theme-exempt: премиум-размытие: блики и скримы поверх статистики
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
    backgroundColor: 'transparent',
  },
  placeholderPill: {
    height: 24,
    width: 72,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)', // theme-exempt: премиум-размытие: блики и скримы поверх статистики
    borderWidth: 0,
    borderColor: 'transparent',
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
    backgroundColor: 'transparent',
  },
  placeholderLine: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)', // theme-exempt: премиум-размытие: блики и скримы поверх статистики
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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
    borderColor: 'transparent',
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
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
