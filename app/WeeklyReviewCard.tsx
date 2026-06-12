// ═══════════════════════════════════════════════════════════════════════════
// WeeklyReviewCard.tsx — карточка «Разбор ошибок» сверху экрана аналитики.
//
// Premium: полный разбор от ИИ (приветствие + абзацы) + кликабельные уроки.
// Free: усечённый разбор (приветствие + 1 абзац) + тизер «полный — в Premium».
// Данные грузятся через weekly_review_client (кэш + гейт частоты + вызов CF).
//
// Вынесена отдельным компонентом, чтобы не раздувать phrase_analytics_screen.tsx.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import TapScale from '../components/TapScale';
import { LinearGradient } from '../components/SafeLinearGradient';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import {
  generateWeeklyReview,
  getWeeklyReviewState,
  type WeeklyReviewState,
  type WeeklyReviewStored,
} from './weekly_review_client';
import type { RuntimeStudyTarget } from './target_storage_keys';

interface WeeklyReviewCardProps {
  isPremium: boolean;
  studyTarget?: RuntimeStudyTarget;
}

const GOLD = '#C9A227';
const GOLD_SOFT = '#E8D5A3';

export default function WeeklyReviewCard({ isPremium, studyTarget }: WeeklyReviewCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const isCompassTheme = false;
  const [state, setState] = useState<WeeklyReviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refreshState = useCallback(async () => {
    const next = await getWeeklyReviewState(studyTarget);
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
      const generated = await generateWeeklyReview({ lang, studyTarget, isPremium });
      setState(generated);
      setBusy(false);
    }
  }, [lang, studyTarget, isPremium]);

  useFocusEffect(useCallback(() => { void refreshState(); }, [refreshState]));

  const onManualRefresh = useCallback(async () => {
    hapticTap();
    setBusy(true);
    const generated = await generateWeeklyReview({ lang, studyTarget, isPremium, force: true });
    setState(generated);
    setBusy(false);
  }, [lang, studyTarget, isPremium]);

  const openLesson = useCallback((microDiagnosisId: string) => {
    hapticTap();
    router.push({ pathname: '/problem_coach', params: { microDiagnosisId } } as never);
  }, [router]);

  // Ничего не показываем, пока не знаем состояние или данных мало (без шума).
  if (!state) return null;
  if (state.kind === 'insufficient_data') return null;
  if (state.kind === 'none' && !busy) return null;

  const stored: WeeklyReviewStored | null =
    state.kind === 'cached' ? state.stored : state.kind === 'error' ? state.stored : null;

  // Состояние «генерируем впервые».
  if (!stored && busy) {
    return (
      <CardShell isCompassTheme={isCompassTheme} t={t}>
        <Header
          lang={lang}
          t={t}
          f={f}
          expanded={expanded}
          busy={busy}
          onPress={() => setExpanded((value) => !value)}
        />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={isCompassTheme ? COMPASS_RICH.champagne : GOLD} />
          <Text style={[styles.loadingText, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Готовлю твой разбор ошибок…', uk: 'Готую твій розбір помилок…', es: 'Preparando tu análisis de errores…',
              'pt-BR': 'Preparando sua análise de erros…', vi: 'Đang chuẩn bị bản phân tích lỗi của bạn…',
              id: 'Menyiapkan analisis kesalahanmu…', tr: 'Hata analizini hazırlıyorum…', pl: 'Przygotowuję twoją analizę błędów…',
            })}
          </Text>
        </View>
      </CardShell>
    );
  }

  if (!stored) return null;

  const { review } = stored;
  // Free видит приветствие + 1 абзац, остальное под тизером.
  const visibleParagraphs = isPremium ? review.paragraphs : review.paragraphs.slice(0, 1);
  const hiddenCount = isPremium ? 0 : Math.max(0, review.paragraphs.length - 1);
  const canManualRefresh = (state.kind === 'cached' && state.canRefresh) || state.kind === 'error';

  return (
    <CardShell isCompassTheme={isCompassTheme} t={t}>
      <Header
        lang={lang}
        t={t}
        f={f}
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
              onPress={() => { hapticTap(); router.push({ pathname: '/premium_modal', params: { context: 'patterns' } } as never); }}
              style={[styles.teaser, { borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'rgba(201,162,39,0.3)' }]}
            >
              <Ionicons name="lock-closed" size={14} color={GOLD} />
              <Text style={[styles.teaserText, { color: isCompassTheme ? COMPASS_RICH.textDark : GOLD_SOFT, fontSize: f.sub }]}>
                {triLang(lang, {
                  ru: 'Полный разбор и план — в Premium', uk: 'Повний розбір і план — у Premium', es: 'Análisis completo y plan — en Premium',
                  'pt-BR': 'Análise completa e plano — no Premium', vi: 'Phân tích đầy đủ và kế hoạch — trong Premium',
                  id: 'Analisis lengkap dan rencana — di Premium', tr: 'Tam analiz ve plan — Premium\'de', pl: 'Pełna analiza i plan — w Premium',
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
                  <Text style={[styles.recText, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={1}>
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
                    ru: 'Не удалось обновить — показан прошлый разбор', uk: 'Не вдалося оновити — показано минулий розбір',
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
}: {
  children: React.ReactNode;
  isCompassTheme: boolean;
  t: ReturnType<typeof useTheme>['theme'];
}) {
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
      ]}
    >
      {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
      {children}
    </View>
  );
}

function Header({
  lang,
  t,
  f,
  expanded,
  busy,
  onPress,
}: {
  lang: ReturnType<typeof useLang>['lang'];
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
  expanded: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.titleRow}>
      <LinearGradient
        colors={['rgba(42,36,28,0.95)', 'rgba(18,16,14,0.98)']}
        style={styles.iconBox}
      >
        <Ionicons name="sparkles" size={16} color={GOLD_SOFT} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[styles.kicker, { color: GOLD }]}>PHRASEMAN</Text>
        <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: Math.max(16, f.h2 * 0.82) }]}>
          {triLang(lang, {
            ru: 'Разбор ошибок', uk: 'Розбір помилок', es: 'Análisis de errores',
            'pt-BR': 'Análise de erros', vi: 'Phân tích lỗi', id: 'Analisis kesalahan',
            tr: 'Hata analizi', pl: 'Analiza błędów',
          })}
        </Text>
        <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
          {busy
            ? triLang(lang, {
                ru: 'Обновляю по твоим ошибкам', uk: 'Оновлюю за твоїми помилками', es: 'Actualizando con tus errores',
                'pt-BR': 'Atualizando com seus erros', vi: 'Đang cập nhật theo lỗi của bạn',
                id: 'Memperbarui dari kesalahanmu', tr: 'Hatalarına göre güncelleniyor', pl: 'Aktualizacja z twoich błędów',
              })
            : triLang(lang, {
                ru: 'Только по тем местам, где ты ошибался', uk: 'Тільки за місцями, де ти помилявся', es: 'Solo donde realmente fallaste',
                'pt-BR': 'Só onde você realmente errou', vi: 'Chỉ những chỗ bạn thật sự sai',
                id: 'Hanya dari bagian yang pernah salah', tr: 'Yalnızca gerçekten hata yaptığın yerler', pl: 'Tylko miejsca z realnymi błędami',
              })}
        </Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 1, marginBottom: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,175,88,0.28)' },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 3 },
  cardTitle: { fontWeight: '800', letterSpacing: -0.2 },
  cardSub: { marginTop: 3, lineHeight: 17, fontWeight: '600' },
  greeting: { fontWeight: '800', letterSpacing: -0.3, lineHeight: 26 },
  paragraph: { lineHeight: 23, letterSpacing: 0.1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { flex: 1, lineHeight: 22 },
  teaser: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  teaserText: { flex: 1, fontWeight: '600' },
  recommendations: { gap: 8, marginTop: 4 },
  recLabel: { fontWeight: '700', letterSpacing: 1.1 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 0.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  recText: { flex: 1, fontWeight: '600' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, borderTopWidth: 0.5 },
  footerText: { flex: 1, lineHeight: 18 },
});
