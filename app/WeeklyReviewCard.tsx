// ═══════════════════════════════════════════════════════════════════════════
// WeeklyReviewCard.tsx — карточка «Разбор недели» сверху экрана аналитики.
//
// Premium: полный разбор от ИИ (приветствие + абзацы) + кликабельные уроки.
// Free: усечённый разбор (приветствие + 1 абзац) + тизер «полный — в Premium».
// Данные грузятся через weekly_review_client (кэш + гейт частоты + вызов CF).
//
// Вынесена отдельным компонентом, чтобы не раздувать phrase_analytics_screen.tsx.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useRef, useState } from 'react';
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
  nextReviewCopy,
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
  const isCompassTheme = themeMode === 'compass';
  const [state, setState] = useState<WeeklyReviewState | null>(null);
  const [busy, setBusy] = useState(false);
  // In-flight латч: useFocusEffect перезапускает refreshState на КАЖДЫЙ фокус
  // экрана; без этого быстрые фокус/блюр или первый заход без кэша могли пускать
  // несколько параллельных вызовов CF. setBusy асинхронный, поэтому гейтим на ref.
  const inFlight = useRef(false);

  const runGenerate = useCallback(async (force: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const generated = await generateWeeklyReview({ lang, studyTarget, isPremium, force });
      setState(generated);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }, [lang, studyTarget, isPremium]);

  const refreshState = useCallback(async () => {
    if (inFlight.current) return;
    const next = await getWeeklyReviewState(studyTarget);
    setState(next);
    // Авто-генерация при первом заходе или когда окно открылось. Апгрейд
    // free→premium подтянет полный разбор на следующем открытии окна (extra
    // платный вызов посреди окна намеренно не форсим — это всего лишь усечение
    // до конца текущего цикла).
    const shouldAutoGenerate =
      next.kind === 'none'
        ? next.canGenerate
        : next.kind === 'cached'
          ? next.canRefresh
          : false;
    if (shouldAutoGenerate) {
      await runGenerate(false);
    }
  }, [studyTarget, runGenerate]);

  useFocusEffect(useCallback(() => { void refreshState(); }, [refreshState]));

  const onManualRefresh = useCallback(async () => {
    hapticTap();
    await runGenerate(true);
  }, [runGenerate]);

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
        <Header lang={lang} t={t} f={f} />
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={isCompassTheme ? COMPASS_RICH.champagne : GOLD} />
          <Text style={[styles.loadingText, { color: t.textMuted, fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Готовлю твой разбор недели…', uk: 'Готую твій розбір тижня…', es: 'Preparando tu análisis semanal…',
              'pt-BR': 'Preparando sua análise semanal…', vi: 'Đang chuẩn bị bản phân tích tuần của bạn…',
              id: 'Menyiapkan analisis mingguanmu…', tr: 'Haftalık analizini hazırlıyorum…', pl: 'Przygotowuję twoją analizę tygodnia…',
            })}
          </Text>
        </View>
      </CardShell>
    );
  }

  if (!stored) return null;

  const { review } = stored;
  // Сервер уже обрезал payload по реальному премиуму: free получает только
  // приветствие + 1 абзац, а сколько спрятано — в review.lockedParagraphCount.
  // Клиент НЕ режет сам (придержанный текст на устройство не приходит).
  const visibleParagraphs = review.paragraphs;
  const hiddenCount = review.lockedParagraphCount;

  return (
    <CardShell isCompassTheme={isCompassTheme} t={t}>
      <Header lang={lang} t={t} f={f} />

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

      {/* Рекомендованные уроки: сервер кладёт их только в premium-payload
          (free получает []), поэтому гейтим по факту присланного. */}
      {review.recommendations.length > 0 && (
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

      {/* Подпись «следующий разбор» + ручное обновление при ошибке/доступности */}
      <View style={[styles.footer, { borderTopColor: t.border }]}>
        <Text style={[styles.footerText, { color: t.textMuted, fontSize: f.caption }]}>
          {state.kind === 'error'
            ? triLang(lang, {
                ru: 'Не удалось обновить — показан прошлый разбор', uk: 'Не вдалося оновити — показано минулий розбір',
                es: 'No se pudo actualizar — se muestra el anterior', 'pt-BR': 'Não foi possível atualizar — exibindo o anterior',
                vi: 'Không thể cập nhật — hiển thị bản trước', id: 'Gagal memperbarui — menampilkan yang sebelumnya',
                tr: 'Güncellenemedi — önceki gösteriliyor', pl: 'Nie udało się odświeżyć — pokazano poprzednią',
              })
            : nextReviewCopy(stored.nextAllowedAtMs, lang)}
        </Text>
        {(state.kind === 'cached' && state.canRefresh) || state.kind === 'error' ? (
          <TapScale onPress={onManualRefresh} disabled={busy} hitSlop={8}>
            {busy
              ? <ActivityIndicator size="small" color={t.accent} />
              : <Ionicons name="refresh" size={16} color={t.accent} />}
          </TapScale>
        ) : null}
      </View>
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
}: {
  lang: ReturnType<typeof useLang>['lang'];
  t: ReturnType<typeof useTheme>['theme'];
  f: ReturnType<typeof useTheme>['f'];
}) {
  return (
    <View style={styles.titleRow}>
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
            ru: 'Разбор недели', uk: 'Розбір тижня', es: 'Análisis de la semana',
            'pt-BR': 'Análise da semana', vi: 'Phân tích tuần', id: 'Analisis minggu ini',
            tr: 'Haftanın analizi', pl: 'Analiza tygodnia',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderWidth: 1, marginBottom: 20, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,175,88,0.28)' },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 3 },
  cardTitle: { fontWeight: '800', letterSpacing: -0.2 },
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
