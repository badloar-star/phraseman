// ═══════════════════════════════════════════════════════════════════════════
// WeeklyReviewCard.tsx — карточка «Разбор ошибок» сверху экрана аналитики.
//
// Premium: полный разбор от ИИ (приветствие + абзацы) + кликабельные уроки.
// Free: усечённый разбор (приветствие + 1 абзац) + тизер «полный — в Premium».
// Данные грузятся через weekly_review_client (кэш + гейт частоты + вызов CF).
//
// Вынесена отдельным компонентом, чтобы не раздувать phrase_analytics_screen.tsx.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AccordionChevronIonicons from '../components/AccordionChevronIonicons';
import { useFocusEffect, useRouter } from 'expo-router';
import TapScale from '../components/TapScale';
import SkeletonBlock from '../components/SkeletonShimmer';
import CompassDepthSurface from '../components/CompassDepthSurface';
import PlusBadge from '../components/PlusBadge';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { weeklyCompassIconSource } from '../constants/weeklyCompassIcons';
import { triLang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import {
  generateWeeklyReview,
  getWeeklyReviewState,
  type WeeklyReviewState,
  type WeeklyReviewStored,
} from './weekly_review_client';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { emitSoftUpsellTrigger, weeklyReviewCandidate } from './soft_upsell_trigger_adapters';

interface WeeklyReviewCardProps {
  isPremium: boolean;
  active: boolean;
  studyTarget?: RuntimeStudyTarget;
  stableLayout?: boolean;
  embedded?: boolean;
}

const GOLD_SOFT = '#E8D5A3';

export default function WeeklyReviewCard({ active, isPremium, studyTarget, stableLayout = false, embedded = false }: WeeklyReviewCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const isCompassTheme = false;
  const [state, setState] = useState<WeeklyReviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const emittedReviewRef = useRef(false);

  useEffect(() => {
    if (!expanded || state?.kind !== 'cached' || emittedReviewRef.current) return;
    emittedReviewRef.current = true;
    emitSoftUpsellTrigger(weeklyReviewCandidate({
      completed: true,
      studyTarget: studyTarget === 'fr' ? 'fr' : 'en',
      hasPremiumAccess: isPremium,
    }));
  }, [expanded, isPremium, state?.kind, studyTarget]);

  const refreshState = useCallback(async () => {
    const next = await getWeeklyReviewState(studyTarget, lang);
    setState(next);
    // Авто-генерация при первом заходе или когда окно открылось.
    const shouldAutoGenerate =
      next.kind === 'none'
        ? next.canGenerate
        : next.kind === 'cached'
          ? next.canRefresh
          : false;
    if (shouldAutoGenerate) {
      setBusy(true);
      try {
        const generated = await generateWeeklyReview({ lang, studyTarget, isPremium });
        setState(generated);
      } catch {
        // Оставляем прежнее состояние (cached/none) — карточка живая, не «генерируем».
      } finally {
        // Без finally исключение генерации замораживало карточку в «генерируем» навсегда.
        setBusy(false);
      }
    }
  }, [lang, studyTarget, isPremium]);

  useFocusEffect(useCallback(() => { void refreshState(); }, [refreshState]));

  const onManualRefresh = useCallback(async () => {
    hapticTap();
    setBusy(true);
    try {
      const generated = await generateWeeklyReview({ lang, studyTarget, isPremium, force: true });
      setState(generated);
    } catch {
      // Прежнее состояние остаётся видимым; busy снимается — можно повторить.
    } finally {
      setBusy(false);
    }
  }, [lang, studyTarget, isPremium]);

  const openLesson = useCallback((microDiagnosisId: string) => {
    hapticTap();
    router.push({ pathname: '/problem_coach', params: { microDiagnosisId } } as never);
  }, [router]);

  // Ничего не показываем, пока не знаем состояние или данных мало (без шума).
  const stableCardStyle = stableLayout ? (embedded ? styles.stableEmbeddedSlot : styles.stableCardSlot) : null;

  if (!state) {
    if (!stableLayout) return null;
    return (
      <CardShell isCompassTheme={isCompassTheme} t={t} style={stableCardStyle} embedded={embedded}>
        <Header
          active={active}
          lang={lang}
          t={t}
          f={f}
          themeMode={themeMode}
          iconAccent={t.accent}
          expanded={expanded}
          busy
          onPress={() => setExpanded((value) => !value)}
        />
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <Text style={[styles.loadingText, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Компас готовит подсказки…', uk: 'Компас готує підказки…', es: 'Compass está preparando pistas…',
              'pt-BR': 'Compass está preparando dicas…', vi: 'Compass đang chuẩn bị gợi ý…',
              id: 'Compass sedang menyiapkan arahan…', tr: 'Compass ipuçlarını hazırlıyor…', pl: 'Compass przygotowuje wskazówki…',
            })}
          </Text>
          <SkeletonBlock width="100%" height={13} borderRadius={6} />
          <SkeletonBlock width="86%" height={13} borderRadius={6} />
          <SkeletonBlock width="92%" height={13} borderRadius={6} />
        </View>
      </CardShell>
    );
  }
  if (state.kind === 'insufficient_data') return null;
  if (state.kind === 'none' && !busy) return null;

  const stored: WeeklyReviewStored | null =
    state.kind === 'cached' ? state.stored : state.kind === 'error' ? state.stored : null;

  // Состояние «генерируем впервые».
  if (!stored && busy) {
    return (
      <CardShell isCompassTheme={isCompassTheme} t={t} style={stableCardStyle} embedded={embedded}>
        <Header
          active={active}
          lang={lang}
          t={t}
          f={f}
          themeMode={themeMode}
          iconAccent={t.accent}
          expanded={expanded}
          busy={busy}
          onPress={() => setExpanded((value) => !value)}
        />
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <Text style={[styles.loadingText, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Компас готовит подсказки…', uk: 'Компас готує підказки…', es: 'Compass está preparando pistas…',
              'pt-BR': 'Compass está preparando dicas…', vi: 'Compass đang chuẩn bị gợi ý…',
              id: 'Compass sedang menyiapkan arahan…', tr: 'Compass ipuçlarını hazırlıyor…', pl: 'Compass przygotowuje wskazówki…',
            })}
          </Text>
          <SkeletonBlock width="100%" height={13} borderRadius={6} />
          <SkeletonBlock width="86%" height={13} borderRadius={6} />
          <SkeletonBlock width="92%" height={13} borderRadius={6} />
        </View>
      </CardShell>
    );
  }

  if (!stored) return null;

  const { review } = stored;
  // Full review visible for premium only; free users see greeting + 1 paragraph.
  const visibleParagraphs = isPremium ? review.paragraphs : review.paragraphs.slice(0, 1);
  const hiddenCount = isPremium ? 0 : Math.max(0, review.paragraphs.length - 1);
  const canManualRefresh = (state.kind === 'cached' && state.canRefresh) || state.kind === 'error';

  return (
    <CardShell isCompassTheme={isCompassTheme} t={t} style={stableCardStyle} embedded={embedded}>
      <Header
        active={active}
        lang={lang}
        t={t}
        f={f}
        themeMode={themeMode}
        iconAccent={t.accent}
        expanded={expanded}
        busy={busy}
        onPress={() => setExpanded((value) => !value)}
      />

      {expanded && (
        <>
          <Text style={[styles.greeting, { color: isCompassTheme ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.h2 }]}>
            {review.greeting}
          </Text>

          {visibleParagraphs.map((p, i) => (
            <Text key={i} style={[styles.paragraph, { color: t.textSecond, fontSize: f.body }]}>
              {p}
            </Text>
          ))}

          {/* Free-тизер на скрытые абзацы */}
          {hiddenCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => { hapticTap(); router.push({ pathname: '/premium_modal', params: { context: 'weekly_review' } } as never); }}
              style={[styles.teaser, { borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'rgba(201,162,39,0.3)' }]}
            >
              <PlusBadge themeMode={themeMode} size="xs" />
              <Text style={[styles.teaserText, { color: isCompassTheme ? COMPASS_RICH.textDark : GOLD_SOFT, fontSize: f.sub }]}>
                {triLang(lang, {
                  ru: 'Полные подсказки и план — в Plus', uk: 'Повні підказки й план — у Plus', es: 'Guía completa y plan — en Plus',
                  'pt-BR': 'Orientação completa e plano — no Plus', vi: 'Gợi ý đầy đủ và kế hoạch — trong Plus',
                  id: 'Panduan lengkap dan rencana — di Plus', tr: 'Tam rehber ve plan — Plus\'de', pl: 'Pełne wskazówki i plan — w Plus',
                })}
              </Text>
            </TouchableOpacity>
          )}

          {/* Рекомендованные уроки (только premium видит кликабельные) */}
          {isPremium && review.recommendations.length > 0 && (
            <View style={styles.recommendations}>
              <Text style={[styles.recLabel, { color: t.textMuted, fontSize: f.label }]}>
                {triLang(lang, {
                  ru: 'НАД ЧЕМ ПОРАБОТАТЬ', uk: 'НАД ЧИМ ПОПРАЦЮВАТИ', es: 'EN QUÉ TRABAJAR',
                  'pt-BR': 'NO QUE TRABALHAR', vi: 'CẦN LUYỆN GÌ', id: 'YANG PERLU DILATIH', tr: 'NE ÜZERİNDE ÇALIŞMALI', pl: 'NAD CZYM POPRACOWAĆ',
                })}
              </Text>
              {review.recommendations.map((rec) => (
                <TouchableOpacity
                  key={rec.microDiagnosisId}
                  activeOpacity={0.86}
                  onPress={() => openLesson(rec.microDiagnosisId)}
                  style={[styles.recRow, { borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border }]}
                >
                  <Ionicons name="school-outline" size={16} color={isCompassTheme ? COMPASS_RICH.champagne : t.accent} />
                  <Text style={[styles.recText, { color: t.textPrimary, fontSize: f.body }]}>
                    {rec.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={t.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {canManualRefresh ? (
            <View style={[styles.footer, { borderTopColor: t.border }]}>
              {state.kind === 'error' ? (
                <Text style={[styles.footerText, { color: t.textMuted, fontSize: f.caption }]}>
                  {triLang(lang, {
                    ru: 'Не удалось обновить — показаны прошлые подсказки', uk: 'Не вдалося оновити — показано попередні підказки',
                    es: 'No se pudo actualizar — se muestra el anterior', 'pt-BR': 'Não foi possível atualizar — exibindo o anterior',
                    vi: 'Không thể cập nhật — hiển thị bản trước', id: 'Gagal memperbarui — menampilkan yang sebelumnya',
                    tr: 'Güncellenemedi — önceki gösteriliyor', pl: 'Nie udało się odświeżyć — pokazano poprzednią',
                  })}
                </Text>
              ) : <View style={{ flex: 1 }} />}
              <TapScale onPress={onManualRefresh} disabled={busy} hitSlop={8}>
                {busy
                  ? <ActivityIndicator size="small" color={t.accent} />
                  : <Ionicons name="refresh" size={16} color={t.accent} />}
              </TapScale>
            </View>
          ) : null}
        </>
      )}
    </CardShell>
  );
}

// ── Подкомпоненты ───────────────────────────────────────────────────────────

function CardShell({
  children,
  isCompassTheme,
  t,
  style,
  embedded = false,
}: {
  children: React.ReactNode;
  isCompassTheme: boolean;
  t: ReturnType<typeof useTheme>['theme'];
  style?: StyleProp<ViewStyle>;
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <View style={[styles.embeddedSection, style]}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
          borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'rgba(201,162,39,0.28)',
          borderRadius: isCompassTheme ? 10 : 18,
          overflow: 'hidden',
        },
        isCompassTheme && compassShadow(2),
        style,
      ]}
    >
      {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
      {children}
    </View>
  );
}

function WeeklyCompassIcon({
  active,
  themeMode,
  accent,
}: {
  active: boolean;
  themeMode: ThemeMode;
  accent: string;
}) {
  const float = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const iconSource = weeklyCompassIconSource(themeMode);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(Boolean(enabled));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!active || reduceMotion) {
      float.stopAnimation();
      float.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1650, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, float, reduceMotion]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const rotate = float.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] });
  const shadowScale = float.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] });
  const shadowOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.18] });
  const glowScale = float.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const glowOpacity = float.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0.42] });

  return (
    <View style={styles.iconBox} pointerEvents="none">
      <Animated.View style={[styles.iconGlow, { backgroundColor: accent, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.iconShadow, { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] }]} />
      <Animated.View style={[styles.compassImageLayer, { transform: [{ translateY }, { rotate }] }]}>
        <Image source={iconSource} style={styles.compassImage} contentFit="contain" transition={140} accessible={false} />
      </Animated.View>
    </View>
  );
}

function Header({
  active,
  lang,
  t,
  f,
  themeMode,
  iconAccent,
  expanded,
  busy,
  onPress,
}: {
  active: boolean;
  lang: ReturnType<typeof useLang>['lang'];
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
  themeMode: ThemeMode;
  iconAccent: string;
  expanded: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.titleRow}
      accessibilityRole="button"
      accessibilityState={{ expanded, busy }}
    >
      <WeeklyCompassIcon active={active} themeMode={themeMode} accent={iconAccent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: Math.max(16, f.h2 * 0.82) }]}>
          {triLang(lang, {
            ru: 'Компас', uk: 'Компас', es: 'Compass',
            'pt-BR': 'Compass', vi: 'Compass', id: 'Compass',
            tr: 'Compass', pl: 'Compass',
          })}
        </Text>
        <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
          {busy
            ? triLang(lang, {
                ru: 'Смотрю, что поможет тебе дальше', uk: 'Дивлюся, що допоможе тобі далі', es: 'Buscando qué te ayuda ahora',
                'pt-BR': 'Vendo o que mais te ajuda agora', vi: 'Đang tìm phần giúp bạn tiếp theo',
                id: 'Mencari latihan yang paling membantumu', tr: 'Şimdi sana ne yardım eder bakıyorum', pl: 'Sprawdzam, co pomoże ci dalej',
              })
            : triLang(lang, {
                ru: 'Ежедневный разбор ошибок', uk: 'Щоденний розбір помилок', es: 'Análisis diario de errores',
                'pt-BR': 'Análise diária de erros', vi: 'Phân tích lỗi hằng ngày',
                id: 'Analisis kesalahan harian', tr: 'Günlük hata analizi', pl: 'Codzienna analiza błędów',
              })}
        </Text>
      </View>
      <AccordionChevronIonicons isOpen={expanded} size={18} color={t.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 0, marginBottom: 20, gap: 12 },
  stableCardSlot: { minHeight: 150 },
  stableEmbeddedSlot: { minHeight: 88 },
  embeddedSection: { gap: 10, paddingTop: 2, paddingBottom: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  compassImageLayer: { width: 52, height: 52, zIndex: 3 },
  compassImage: { width: 52, height: 52 },
  iconGlow: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 999,
    zIndex: 1,
  },
  iconShadow: {
    position: 'absolute',
    bottom: 1,
    width: 32,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#000',
    zIndex: 2,
  },
  cardTitle: { fontWeight: '800', letterSpacing: -0.2 },
  cardSub: { marginTop: 3, lineHeight: 17, fontWeight: '600' },
  greeting: { fontWeight: '800', letterSpacing: -0.3, lineHeight: 26 },
  paragraph: { lineHeight: 23, letterSpacing: 0.1 },
  loadingText: { flex: 1, lineHeight: 22 },
  teaser: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 0, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  teaserText: { flex: 1, fontWeight: '600' },
  recommendations: { gap: 8, marginTop: 4 },
  recLabel: { fontWeight: '700', letterSpacing: 1.1 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, minHeight: 58 },
  recText: { flex: 1, flexShrink: 1, fontWeight: '600', lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTopWidth: 0.5 },
  footerText: { flex: 1, lineHeight: 18 },
});
