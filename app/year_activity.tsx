// зачем (владелец 13.10, вопрос 17; макет results.html телефон 9/14, results-009): «Активность за год» — отдельный экран: кнопка назад, заголовок, карточка
// «365 дней · Практика по календарю» с пилюлей года, большая сетка дней (13 колонок, квадратные клетки), легенда «меньше … больше», строки «Фраз выучено»
// и «Время практики». Данные — те же, что у полоски «Год» в «Серии и статистике»: кэш peekActivity365Analytics + тот же loadActivity365Analytics (без новых запросов).
// Первый кадр — из кэша: ни спиннеров, ни «Загрузка…». Тап по клетке открывает прежнее окно месяца. Логи [YEAR-ACTIVITY].
import React, { memo, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { ResultsGlassBackButton } from '../components/results/ResultsGlass';
import { buildCanonicalYear, heatPalette, MonthExplorerModal } from '../components/ActivityHeatmap365';
import { PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { accentGraphicOf } from '../constants/themeAccentRoles';
import { triLang } from '../constants/i18n';
import { loadActivity365Analytics, peekActivity365Analytics, type Activity365Analytics, type Activity365Day } from './activity_365_analytics';
import { safeRouterBack } from './navigation_back';
import { peekDevYearActivityDays } from './dev_year_activity';
import { buildYearActivityModel, formatPracticeTime, YEAR_ACTIVITY_COLS } from './year_activity_model';

const LOG = '[YEAR-ACTIVITY]';
// зачем (ревью Авторизации 13.10): общий пустой список — при пустом кэше ссылка не меняется, и модель сетки (365 клеток) не пересчитывается каждый рендер.
const NO_DAYS: readonly Activity365Day[] = Object.freeze([]);
const CELL_GAP = 4; // макет `.heatmap { gap: 4px }`
const CARD_PADDING = 18; // макет: padding 18
const SCREEN_PADDING = 16;

const COPY = {
  back: { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' },
  title: { ru: 'Активность за год', uk: 'Активність за рік', en: 'Activity this year', es: 'Actividad del año', 'pt-BR': 'Atividade do ano', vi: 'Hoạt động trong năm', id: 'Aktivitas setahun', tr: 'Yıllık aktivite', pl: 'Aktywność w ciągu roku' },
  days: { ru: '365 дней', uk: '365 днів', en: '365 days', es: '365 días', 'pt-BR': '365 dias', vi: '365 ngày', id: '365 hari', tr: '365 gün', pl: '365 dni' },
  sub: { ru: 'Практика по календарю', uk: 'Практика за календарем', en: 'Practice by calendar', es: 'Práctica por calendario', 'pt-BR': 'Prática por calendário', vi: 'Luyện tập theo lịch', id: 'Latihan menurut kalender', tr: 'Takvime göre pratik', pl: 'Praktyka według kalendarza' },
  less: { ru: 'меньше', uk: 'менше', en: 'less', es: 'menos', 'pt-BR': 'menos', vi: 'ít', id: 'sedikit', tr: 'az', pl: 'mniej' },
  more: { ru: 'больше', uk: 'більше', en: 'more', es: 'más', 'pt-BR': 'mais', vi: 'nhiều', id: 'banyak', tr: 'çok', pl: 'więcej' },
  phrases: { ru: 'Фраз выучено', uk: 'Фраз вивчено', en: 'Phrases learned', es: 'Frases aprendidas', 'pt-BR': 'Frases aprendidas', vi: 'Cụm từ đã học', id: 'Frasa dipelajari', tr: 'Öğrenilen ifade', pl: 'Poznane frazy' },
  time: { ru: 'Время практики', uk: 'Час практики', en: 'Practice time', es: 'Tiempo de práctica', 'pt-BR': 'Tempo de prática', vi: 'Thời gian luyện tập', id: 'Waktu latihan', tr: 'Pratik süresi', pl: 'Czas praktyki' },
} as const;

function YearActivityScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { width } = useWindowDimensions();

  // Первый кадр из кэша: тот же peek, что у полоски (0 чтений базы).
  const [analytics, setAnalytics] = useState<Activity365Analytics | null>(() => {
    const snapshot = peekActivity365Analytics(studyTarget);
    console.log(`${LOG} вход: studyTarget=${studyTarget} кэш=${snapshot ? `есть(stale=${snapshot.stale}, дней=${snapshot.analytics.days.length})` : 'нет'}`); // guard-ok: вход экрана
    return snapshot?.analytics ?? null;
  });
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Тихое обновление тем же загрузчиком, что у полоски (его кэш и TTL общие): без спиннера, при ошибке остаёмся на кэше.
    loadActivity365Analytics(studyTarget)
      .then((fresh) => {
        if (cancelled) return;
        console.log(`${LOG} обновлено: дней=${fresh.days.length} активных=${fresh.activeDays}`); // guard-ok: итог загрузки
        setAnalytics(fresh);
      })
      .catch((error: unknown) => {
        console.warn(`${LOG} загрузка не удалась, остаёмся на кэше: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина в журнале
      });
    return () => { cancelled = true; };
  }, [studyTarget]);

  // зачем (координатор 13.10, results-009): dev_state?yearActivity=demo — заполненная сетка образца, только __DEV__ и память.
  const devDays = useMemo(() => peekDevYearActivityDays(), []);
  const days = devDays ?? analytics?.days ?? NO_DAYS;
  const model = useMemo(() => buildYearActivityModel(days), [days]);
  const canonical = useMemo(() => buildCanonicalYear(days), [days]);
  const palette = useMemo(() => heatPalette(themeMode, accentGraphicOf(t)), [themeMode, t]);
  useEffect(() => {
    console.log(`${LOG} модель: ячеек=${model.cells.length} рядов=${model.rows} год=${model.year} фраз=${model.phrasesLearned} минут=${model.minutes} активных=${model.activeDays}`); // guard-ok: итоговая модель
  }, [model]);

  const inner = width - SCREEN_PADDING * 2 - CARD_PADDING * 2;
  const cell = Math.floor((inner - (YEAR_ACTIVITY_COLS - 1) * CELL_GAP) / YEAR_ACTIVITY_COLS);
  const rows: (typeof model.cells)[number][][] = [];
  for (let i = 0; i < model.cells.length; i += YEAR_ACTIVITY_COLS) rows.push(model.cells.slice(i, i + YEAR_ACTIVITY_COLS) as (typeof model.cells)[number][]);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <View style={styles.header}>
            <ResultsGlassBackButton glass={glass} testID="year-activity-back" accessibilityLabel={triLang(lang, COPY.back)} onPress={() => safeRouterBack(router)} />
          </View>
          <ScrollView testID="year-activity-screen" contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text accessibilityRole="header" style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800', lineHeight: Math.round(f.h1 * 1.12), marginTop: 6 }}>
              {triLang(lang, COPY.title)}
            </Text>

            <View testID="year-activity-card" style={[styles.card, { boxShadow: plateBoxShadow(glass), marginTop: 22 }]}>
              <PlateFill g={glass} radius={22} />
              <View style={styles.cardHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>{triLang(lang, COPY.days)}</Text>
                  <Text style={{ color: glass.secondary, fontSize: f.body, marginTop: 2 }}>{triLang(lang, COPY.sub)}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: glass.opaqueControl }]}>
                  <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '700' }}>{String(model.year)}</Text>
                </View>
              </View>

              <View testID="year-activity-grid" style={{ marginTop: 20, gap: CELL_GAP }}>
                {rows.map((row, rowIndex) => (
                  <View key={`r${rowIndex}`} style={{ flexDirection: 'row', gap: CELL_GAP }}>
                    {row.map((day) => (
                      <TouchableOpacity
                        key={day.date}
                        accessibilityRole="button"
                        accessibilityLabel={day.date}
                        activeOpacity={0.76}
                        onPress={() => {
                          console.log(`${LOG} тап по дню ${day.date} → окно месяца ${day.date.slice(0, 7)}`); // guard-ok: действие пользователя
                          setSelectedMonthKey(day.date.slice(0, 7));
                        }}
                        style={{ width: cell, height: cell, borderRadius: 3, backgroundColor: palette[day.level] }}
                      />
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.legend}>
                <Text style={{ color: glass.mutedText, fontSize: 11 }}>{triLang(lang, COPY.less)}</Text>{/* guard-ok: подпись легенды «меньше … больше» по макету results.html, не расшифровка под названием */}
                {[0, 2, 4].map((i) => <View key={`legend-${i}`} /* guard-ok: три статичных образца ступеней легенды, порядок не меняется */ style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: palette[i] }} />)}
                <Text style={{ color: glass.mutedText, fontSize: 11 }}>{triLang(lang, COPY.more)}</Text>
              </View>
            </View>

            <View style={{ marginTop: 12, gap: 12 }}>
              {[
                { id: 'phrases', label: triLang(lang, COPY.phrases), value: String(model.phrasesLearned) },
                { id: 'time', label: triLang(lang, COPY.time), value: formatPracticeTime(model.minutes, lang) },
              ].map((row) => (
                <View key={row.id} testID={`year-activity-${row.id}`} style={[styles.row, { boxShadow: plateBoxShadow(glass) }]}>
                  <PlateFill g={glass} radius={20} />
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{row.label}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{row.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
      <MonthExplorerModal
        days={days}
        monthKeys={canonical.monthKeys}
        monthKey={selectedMonthKey}
        visible={selectedMonthKey !== null}
        onMonthChange={setSelectedMonthKey}
        onClose={() => setSelectedMonthKey(null)}
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  card: { borderRadius: 22, padding: CARD_PADDING, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { height: 30, borderRadius: 15, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: 20, paddingHorizontal: 18, overflow: 'hidden' },
});

export default memo(YearActivityScreen);
