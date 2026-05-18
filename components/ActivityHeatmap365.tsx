/**
 * Premium yearly activity analytics: compact "year pulse", expandable 365 grid,
 * day details, filters, goal forecast and monthly report.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import type { Theme } from '../constants/theme';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import GoldBevel from './GoldBevel';
import StatsCardArtSurface from './StatsCardArtSurface';
import {
  RewardModalBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';
import {
  ACTIVITY_365_GOAL_KEY,
  type Activity365Analytics,
  type Activity365Day,
  type Activity365Filter,
  invalidateActivity365Cache,
  loadActivity365Analytics,
  levelForFilter,
} from '../app/activity_365_analytics';

const WINDOW_DAYS = 365;
const CELL_GAP = 2;
const GOALS = [100, 180, 365] as const;
const FILTERS: Activity365Filter[] = ['all', 'lessons', 'quizzes', 'review', 'arena'];
const YEAR_GRID_ROWS = 7;
const YEAR_GRID_COLS = Math.ceil(WINDOW_DAYS / YEAR_GRID_ROWS);

const EMPTY_GOAL = {
  goal: 120,
  activeDays: 0,
  remainingDays: 120,
  forecastDate: null,
  requiredDaysPerWeek: 0,
  onTrack: false,
};

function computeYearGrid(innerW: number, gap: number): { cols: number; rows: number; cellSize: number; width: number; height: number } {
  // Вписываем всё в ширину: 14 рядов → ~27 колонок → ячейка ~12-14px
  const rows = 14;
  const cols = Math.ceil(WINDOW_DAYS / rows);
  const fitCell = innerW > 4 ? (innerW - (cols - 1) * gap) / cols : 12;
  const cellSize = Math.max(10, Math.min(16, fitCell));
  return {
    cols,
    rows,
    cellSize,
    width: cols * cellSize + (cols - 1) * gap,
    height: rows * cellSize + (rows - 1) * gap,
  };
}

function parseThemeHex(hex: string): { r: number; g: number; b: number } | null {
  const n = hex.trim().replace(/^#/, '');
  if (n.length !== 6) return null;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

function lerpRgb(bg: { r: number; g: number; b: number }, fg: { r: number; g: number; b: number }, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  return `rgb(${Math.round(bg.r + (fg.r - bg.r) * t)},${Math.round(bg.g + (fg.g - bg.g) * t)},${Math.round(bg.b + (fg.b - bg.b) * t)})`;
}

function heatmapPalette(t: Theme): { empty: string; l1: string; l2: string; l3: string; l4: string } {
  if (t.bgPrimary === GOLD_RICH.blackVoid) {
    return {
      empty: GOLD_RICH.graphite,
      l1: GOLD_RICH.bronzeDark,
      l2: GOLD_RICH.agedGold,
      l3: GOLD_RICH.metalGold,
      l4: GOLD_RICH.champagne,
    };
  }
  const bg = parseThemeHex(t.bgSurface2) ?? parseThemeHex(t.bgCard);
  const fg = parseThemeHex(t.correct) ?? parseThemeHex(t.accent);
  if (!bg || !fg) return { empty: t.bgSurface2, l1: t.correctBg, l2: t.correct, l3: t.correct, l4: t.correct };
  return {
    empty: t.bgSurface2,
    l1: lerpRgb(bg, fg, 0.22),
    l2: lerpRgb(bg, fg, 0.48),
    l3: lerpRgb(bg, fg, 0.76),
    l4: t.correct,
  };
}

function levelColor(level: 0 | 1 | 2 | 3 | 4, palette: ReturnType<typeof heatmapPalette>): string {
  if (level <= 0) return palette.empty;
  if (level === 1) return palette.l1;
  if (level === 2) return palette.l2;
  if (level === 3) return palette.l3;
  return palette.l4;
}

type ActivityMonthLang = Lang | PlannedInterfaceLang;

function monthName(month: number, lang: ActivityMonthLang): string {
  const ru = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const uk = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
  const es = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const ptBR = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const vi = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];
  const id = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const pl = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
  const idx = Math.max(0, Math.min(11, month - 1));
  if (lang === 'uk') return uk[idx]!;
  if (lang === 'es') return es[idx]!;
  if (lang === 'pt-BR') return ptBR[idx]!;
  if (lang === 'vi') return vi[idx]!;
  if (lang === 'id') return id[idx]!;
  if (lang === 'tr') return tr[idx]!;
  if (lang === 'pl') return pl[idx]!;
  return ru[idx]!;
}

function formatDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${d}.${m}.${y}`;
}

function activeDaysLabel(days: number, lang: Lang): string {
  const n = Math.max(0, Math.floor(days));
  if (lang === 'es') return `${n} ${n === 1 ? 'día activo' : 'días activos'}`;
  if (lang === 'uk') return `${n} ${n === 1 ? 'активний день' : 'активних днів'}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'активный день'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? 'активных дня'
      : 'активных дней';
  return `${n} ${word}`;
}

function activityStatus(activeDays: number, lang: Lang): string {
  if (activeDays >= 180) return triLang(lang, {
    ru: 'Сильный годовой ритм',
    uk: 'Сильний річний ритм',
    es: 'Ritmo anual fuerte',
    'pt-BR': "Ritmo anual forte",
    vi: "Nhịp cả năm rất tốt",
    id: "Ritme tahunan kuat",
    tr: "Güçlü yıllık ritim",
    pl: "Silny rytm roczny",
  });
  if (activeDays >= 60) return triLang(lang, {
    ru: 'Ритм уже заметен',
    uk: 'Ритм уже помітний',
    es: 'El ritmo ya se nota',
    'pt-BR': "O ritmo já aparece",
    vi: "Nhịp đã rõ hơn",
    id: "Ritme sudah terlihat",
    tr: "Ritim artık fark ediliyor",
    pl: "Rytm jest już widoczny",
  });
  if (activeDays >= 7) return triLang(lang, {
    ru: 'Ритм набирается',
    uk: 'Ритм набирається',
    es: 'El ritmo está creciendo',
    'pt-BR': "O ritmo está crescendo",
    vi: "Nhịp đang tăng lên",
    id: "Ritme sedang tumbuh",
    tr: "Ritim büyüyor",
    pl: "Rytm rośnie",
  });
  return triLang(lang, {
    ru: 'Пульс только начинается',
    uk: 'Пульс тільки починається',
    es: 'El pulso empieza',
    'pt-BR': "O pulso começa",
    vi: "Nhịp bắt đầu",
    id: "Denyut mulai terasa",
    tr: "Nabız başlıyor",
    pl: "Puls się zaczyna",
  });
}

function filterLabel(filter: Activity365Filter, lang: Lang): string {
  const labels: Record<Activity365Filter, { ru: string; uk: string; es: string }> = {
    all: { ru: 'Все', uk: 'Усе', es: 'Todo' },
    lessons: { ru: 'Уроки', uk: 'Уроки', es: 'Lecciones' },
    quizzes: { ru: 'Квизы', uk: 'Квізи', es: 'Tests' },
    review: { ru: 'Повтор', uk: 'Повтор', es: 'Repaso' },
    arena: { ru: 'Арена', uk: 'Арена', es: 'Arena' },
  };
  return labels[filter][lang] ?? labels[filter].ru;
}

function insightText(insight: Activity365Analytics['insights'][number], lang: Lang) {
  if (lang === 'uk') return { title: insight.titleUk, body: insight.bodyUk };
  if (lang === 'es') return { title: insight.titleEs, body: insight.bodyEs };
  return { title: insight.titleRu, body: insight.bodyRu };
}

function monthLabel(month: Activity365Analytics['bestMonth'], lang: ActivityMonthLang): string {
  return month ? `${monthName(month.month, lang)} ${month.year}` : '-';
}

function metricTotals(days: Activity365Day[]) {
  return days.reduce(
    (acc, day) => ({
      xp: acc.xp + day.xp,
      minutes: acc.minutes + day.minutes,
      lessons: acc.lessons + day.metrics.lessons,
      quizzes: acc.quizzes + day.metrics.quizzes,
      review: acc.review + day.metrics.review,
      arena: acc.arena + day.metrics.arena,
      words: acc.words + day.metrics.wordsLearned,
      phrases: acc.phrases + day.metrics.phrasesLearned,
    }),
    { xp: 0, minutes: 0, lessons: 0, quizzes: 0, review: 0, arena: 0, words: 0, phrases: 0 },
  );
}

const FOCUS_RELOAD_THROTTLE_MS = 30_000; // don't reload more often than every 30s on tab focus

function useActivity365AnalyticsData() {
  const [analytics, setAnalytics] = useState<Activity365Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const lastReloadRef = useRef(0);

  const reload = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastReloadRef.current < FOCUS_RELOAD_THROTTLE_MS) return;
    lastReloadRef.current = now;
    setLoading(true);
    try {
      setAnalytics(await loadActivity365Analytics());
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
      return undefined;
    }, [reload]),
  );

  return { analytics, loading, reload: () => reload(true) };
}

function StatPill({ label, value, t, f }: { label: string; value: string | number; t: Theme; f: any }) {
  const isGoldTheme = t.bgPrimary === GOLD_RICH.blackVoid;
  return (
    <View style={[styles.statPill, { backgroundColor: isGoldTheme ? GOLD_RICH.graphiteWarm : t.bgSurface2, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}>
      <Text style={{ color: t.textGhost, fontSize: f.caption - 2 }} numberOfLines={1}>{label}</Text>
      <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '800', marginTop: 2 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function DayDetailModal({ day, onClose }: { day: Activity365Day | null; onClose: () => void }) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const modalAccent = rewardModalAccentColor(themeMode, t);
  if (!day) return null;
  const rows = [
    { icon: 'star-outline', label: 'XP', value: day.xp },
    { icon: 'time-outline', label: triLang(lang, {
      ru: 'Минуты',
      uk: 'Хвилини',
      es: 'Minutos',
      'pt-BR': "Minutos",
      vi: "Phút",
      id: "Menit",
      tr: "Dakika",
      pl: "Minuty",
    }), value: day.minutes },
    { icon: 'school-outline', label: triLang(lang, {
      ru: 'Уроки',
      uk: 'Уроки',
      es: 'Lecciones',
      'pt-BR': "Lições",
      vi: "Bài học",
      id: "Pelajaran",
      tr: "Dersler",
      pl: "Lekcje",
    }), value: day.metrics.lessons },
    { icon: 'help-circle-outline', label: triLang(lang, {
      ru: 'Квизы',
      uk: 'Квізи',
      es: 'Tests',
      'pt-BR': "Testes",
      vi: "Bài kiểm tra",
      id: "Tes",
      tr: "Testler",
      pl: "Testy",
    }), value: day.metrics.quizzes },
    { icon: 'repeat-outline', label: triLang(lang, {
      ru: 'Повторение',
      uk: 'Повторення',
      es: 'Repaso',
      'pt-BR': "Revisão",
      vi: "Ôn tập",
      id: "Pengulangan",
      tr: "Tekrar",
      pl: "Powtórka",
    }), value: day.metrics.review },
    { icon: 'trophy-outline', label: triLang(lang, {
      ru: 'Арена',
      uk: 'Арена',
      es: 'Arena',
      'pt-BR': "Arena",
      vi: "Đấu trường",
      id: "Arena",
      tr: "Arena",
      pl: "Arena",
    }), value: day.metrics.arena },
    { icon: 'text-outline', label: triLang(lang, {
      ru: 'Слова',
      uk: 'Слова',
      es: 'Palabras',
      'pt-BR': "Palavras",
      vi: "Từ",
      id: "Kata",
      tr: "Kelimeler",
      pl: "Słowa",
    }), value: day.metrics.wordsLearned },
    { icon: 'chatbubble-ellipses-outline', label: triLang(lang, {
      ru: 'Фразы',
      uk: 'Фрази',
      es: 'Frases',
      'pt-BR': "Frases",
      vi: "Cụm từ",
      id: "Frasa",
      tr: "İfadeler",
      pl: "Zwroty",
    }), value: day.metrics.phrasesLearned },
  ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalBackdrop}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <TouchableOpacity testID="activity-365-day-modal" activeOpacity={1} onPress={() => {}} style={[styles.modalCard, { backgroundColor: 'transparent', borderColor: rewardModalPanelBorder(themeMode, t), shadowColor: modalAccent }]}>
          <LinearGradient colors={rewardModalPanelColors(themeMode, t)} style={styles.modalGlow}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
                  {formatDay(day.date)}
                </Text>
                <Text style={{ color: day.active ? modalAccent : t.textMuted, fontSize: f.caption, marginTop: 4 }}>
                  {day.active
                    ? triLang(lang, {
                      ru: 'Активный день',
                      uk: 'Активний день',
                      es: 'Día activo',
                      'pt-BR': "Dia ativo",
                      vi: "Ngày hoạt động",
                      id: "Hari aktif",
                      tr: "Aktif gün",
                      pl: "Aktywny dzień",
                    })
                    : triLang(lang, {
                      ru: 'Без активности',
                      uk: 'Без активності',
                      es: 'Sin actividad',
                      'pt-BR': "Sem atividade",
                      vi: "Không có hoạt động",
                      id: "Tanpa aktivitas",
                      tr: "Aktivite yok",
                      pl: "Brak aktywności",
                    })}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={t.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.detailGrid}>
              {rows.map(row => (
                <View key={row.label} style={[styles.detailTile, { borderColor: rewardModalPanelBorder(themeMode, t), backgroundColor: rewardModalSoftSurface(themeMode, t) }]}>
                  <Ionicons name={row.icon as any} size={18} color={modalAccent} />
                  <Text style={{ color: t.textGhost, fontSize: f.caption - 2, marginTop: 7 }}>{row.label}</Text>
                  <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 2 }}>{row.value}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function MonthlyReportModal({ analytics, onClose }: { analytics: Activity365Analytics | null; onClose: () => void }) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const isGoldTheme = themeMode === 'gold';
  const modalAccent = rewardModalAccentColor(themeMode, t);
  const m = analytics?.currentMonth;
  const currentMonthDays = useMemo(() => (
    analytics && m ? analytics.days.filter(day => day.date.slice(0, 7) === m.key && !day.future) : []
  ), [analytics, m]);
  const totals = useMemo(() => metricTotals(currentMonthDays), [currentMonthDays]);
  const bestDay = useMemo(() => (
    currentMonthDays.length ? [...currentMonthDays].sort((a, b) => (b.xp - a.xp) || (b.minutes - a.minutes))[0] : null
  ), [currentMonthDays]);
  return (
    <Modal visible={!!analytics} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalBackdrop}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <TouchableOpacity testID="activity-365-monthly-report-modal" activeOpacity={1} onPress={() => {}} style={[styles.modalCard, { backgroundColor: 'transparent', borderColor: rewardModalPanelBorder(themeMode, t), shadowColor: modalAccent }]}>
          <LinearGradient colors={rewardModalPanelColors(themeMode, t)} style={styles.modalGlow}>
            <View style={styles.modalHeader}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
                {triLang(lang, {
                  ru: 'Мини-отчёт месяца',
                  uk: 'Міні-звіт місяця',
                  es: 'Informe del mes',
                  'pt-BR': "Relatório do mês",
                  vi: "Báo cáo tháng",
                  id: "Laporan bulan",
                  tr: "Ay raporu",
                  pl: "Raport miesiąca",
                })}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={t.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.35, marginTop: 10 }}>
              {m
                ? triLang(lang, {
                  ru: `В ${monthName(m.month, 'ru')} ты занимался ${m.activeDays} дней, набрал ${m.totalXp} XP и провёл в приложении ${m.totalMinutes} мин.`,
                  uk: `У ${monthName(m.month, 'uk')} ти займався ${m.activeDays} днів, набрав ${m.totalXp} XP і провів у застосунку ${m.totalMinutes} хв.`,
                  es: `En ${monthName(m.month, 'es')} estudiaste ${m.activeDays} días, ganaste ${m.totalXp} XP y pasaste ${m.totalMinutes} min en la app.`,
                  'pt-BR': `Em ${monthName(m.month, 'pt-BR')} você estudou ${m.activeDays} dias, ganhou ${m.totalXp} XP e passou ${m.totalMinutes} min no app.`,
                  vi: `Trong ${monthName(m.month, 'vi')}, bạn học ${m.activeDays} ngày, kiếm ${m.totalXp} XP và dùng ${m.totalMinutes} phút trong app.`,
                  id: `Pada ${monthName(m.month, 'id')}, kamu belajar ${m.activeDays} hari, mendapat ${m.totalXp} XP, dan menghabiskan ${m.totalMinutes} menit di aplikasi.`,
                  tr: `${monthName(m.month, 'tr')} ayında ${m.activeDays} gün çalıştın, ${m.totalXp} XP kazandın ve uygulamada ${m.totalMinutes} dk geçirdin.`,
                  pl: `W miesiącu ${monthName(m.month, 'pl')} uczysz się przez ${m.activeDays} dni, zdobywasz ${m.totalXp} XP i spędzasz ${m.totalMinutes} min w aplikacji.`,
                })
                : triLang(lang, {
                  ru: 'В этом месяце пока нет активности.',
                  uk: 'Цього місяця ще немає активності.',
                  es: 'Aún no hay actividad este mes.',
                  'pt-BR': "Ainda não há atividade neste mês.",
                  vi: "Tháng này chưa có hoạt động.",
                  id: "Belum ada aktivitas bulan ini.",
                  tr: "Bu ay henüz aktivite yok.",
                  pl: "W tym miesiącu nie ma jeszcze aktywności.",
                })}
            </Text>
            <View style={styles.statsRow}>
              <StatPill label={triLang(lang, {
                ru: 'Стабильность',
                uk: 'Стабільність',
                es: 'Constancia',
                'pt-BR': "Constância",
                vi: "Độ đều đặn",
                id: "Konsistensi",
                tr: "İstikrar",
                pl: "Systematyczność",
              })} value={`${analytics?.consistencyScore ?? 0}/100`} t={t} f={f} />
              <StatPill label={triLang(lang, {
                ru: 'Лучший день',
                uk: 'Найкращий день',
                es: 'Mejor día',
                'pt-BR': "Melhor dia",
                vi: "Ngày tốt nhất",
                id: "Hari terbaik",
                tr: "En iyi gün",
                pl: "Najlepszy dzień",
              })} value={bestDay ? formatDay(bestDay.date).slice(0, 5) : '-'} t={t} f={f} />
            </View>
            <View style={styles.statsRow}>
              <StatPill label={triLang(lang, {
                ru: 'Уроки',
                uk: 'Уроки',
                es: 'Lecciones',
                'pt-BR': "Lições",
                vi: "Bài học",
                id: "Pelajaran",
                tr: "Dersler",
                pl: "Lekcje",
              })} value={totals.lessons} t={t} f={f} />
              <StatPill label={triLang(lang, {
                ru: 'Квизы',
                uk: 'Квізи',
                es: 'Tests',
                'pt-BR': "Testes",
                vi: "Bài kiểm tra",
                id: "Tes",
                tr: "Testler",
                pl: "Testy",
              })} value={totals.quizzes} t={t} f={f} />
              <StatPill label={triLang(lang, {
                ru: 'Повтор',
                uk: 'Повтор',
                es: 'Repaso',
                'pt-BR': "Revisão",
                vi: "Ôn tập",
                id: "Pengulangan",
                tr: "Tekrar",
                pl: "Powtórka",
              })} value={totals.review} t={t} f={f} />
            </View>
            <View style={[styles.reportSummary, { borderColor: rewardModalPanelBorder(themeMode, t), backgroundColor: rewardModalSoftSurface(themeMode, t) }]}>
              <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }}>
                {triLang(lang, {
                  ru: 'Вывод месяца',
                  uk: 'Висновок місяця',
                  es: 'Conclusión del mes',
                  'pt-BR': "Conclusão do mês",
                  vi: "Kết luận tháng",
                  id: "Kesimpulan bulan",
                  tr: "Ay özeti",
                  pl: "Wniosek z miesiąca",
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.caption, lineHeight: f.caption * 1.4, marginTop: 5 }}>
                {triLang(lang, {
                  ru: `Лучший месяц: ${monthLabel(analytics?.bestMonth ?? null, 'ru')}. Слабый период: ${monthLabel(analytics?.weakestMonth ?? null, 'ru')}.`,
                  uk: `Найкращий місяць: ${monthLabel(analytics?.bestMonth ?? null, 'uk')}. Слабкий період: ${monthLabel(analytics?.weakestMonth ?? null, 'uk')}.`,
                  es: `Mejor mes: ${monthLabel(analytics?.bestMonth ?? null, 'es')}. Periodo débil: ${monthLabel(analytics?.weakestMonth ?? null, 'es')}.`,
                  'pt-BR': `Melhor mês: ${monthLabel(analytics?.bestMonth ?? null, 'pt-BR')}. Período fraco: ${monthLabel(analytics?.weakestMonth ?? null, 'pt-BR')}.`,
                  vi: `Tháng tốt nhất: ${monthLabel(analytics?.bestMonth ?? null, 'vi')}. Giai đoạn yếu: ${monthLabel(analytics?.weakestMonth ?? null, 'vi')}.`,
                  id: `Bulan terbaik: ${monthLabel(analytics?.bestMonth ?? null, 'id')}. Periode lemah: ${monthLabel(analytics?.weakestMonth ?? null, 'id')}.`,
                  tr: `En iyi ay: ${monthLabel(analytics?.bestMonth ?? null, 'tr')}. Zayıf dönem: ${monthLabel(analytics?.weakestMonth ?? null, 'tr')}.`,
                  pl: `Najlepszy miesiąc: ${monthLabel(analytics?.bestMonth ?? null, 'pl')}. Słaby okres: ${monthLabel(analytics?.weakestMonth ?? null, 'pl')}.`,
                })}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function ActivityHeatmap365() {
  const { theme: t, f, themeMode } = useTheme();
  const isGoldTheme = themeMode === 'gold';
  const { lang } = useLang();
  const { width: screenW } = useWindowDimensions();
  const { analytics, loading, reload } = useActivity365AnalyticsData();
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Activity365Filter>('all');
  const [selectedDay, setSelectedDay] = useState<Activity365Day | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [gridInnerW, setGridInnerW] = useState(0);
  const revealAnim = useRef(new Animated.Value(0)).current;

  const heatPalette = useMemo(() => heatmapPalette(t), [t]);
  const days = analytics?.days ?? [];
  const yearGrid = useMemo(() => {
    const w = gridInnerW > 8 ? gridInnerW : Math.max(120, Math.round(screenW - 64));
    return computeYearGrid(w, CELL_GAP);
  }, [gridInnerW, screenW]);

  const { cellSize, height: gridHeight, width: gridWidth } = yearGrid;
  const previewCols = 73;
  const previewRows = Math.ceil(WINDOW_DAYS / previewCols);
  const previewGap = 1;
  const previewWidth = gridInnerW > 8 ? gridInnerW : Math.max(120, Math.round(screenW - 64));
  const previewCell = Math.max(2.5, Math.min(5, (previewWidth - (previewCols - 1) * previewGap) / previewCols));
  const previewHeight = previewRows * previewCell + (previewRows - 1) * previewGap;
  const legendApprox = Math.max(7, Math.min(10, Math.round(cellSize)));

  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 1) return;
    setGridInnerW((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);

  const updateGoal = useCallback(async (goal: number) => {
    await AsyncStorage.setItem(ACTIVITY_365_GOAL_KEY, String(goal));
    invalidateActivity365Cache();
    await reload();
  }, [reload]);

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: expanded ? 1 : 0,
      duration: expanded ? 260 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded, revealAnim]);

  const safeAnalytics = analytics ?? {
    days: [] as Activity365Day[],
    activeDays: 0,
    currentStreak: 0,
    longestStreak: 0,
    biggestGap: 0,
    last30ActiveDays: 0,
    consistencyScore: 0,
    bestMonth: null,
    weakestMonth: null,
    currentMonth: null,
    insights: [],
    goal: EMPTY_GOAL,
  };

  const bestMonthText = safeAnalytics.bestMonth ? monthName(safeAnalytics.bestMonth.month, lang) : '-';
  const activeDaysText = activeDaysLabel(safeAnalytics.activeDays, lang);
  const statusText = activityStatus(safeAnalytics.activeDays, lang);
  const nextStepText = safeAnalytics.activeDays < 7
    ? triLang(lang, {
      ru: 'Начни с 3 коротких занятий на этой неделе.',
      uk: 'Почни з 3 коротких занять цього тижня.',
      es: 'Empieza con 3 sesiones cortas esta semana.',
      'pt-BR': "Comece com 3 sessões curtas nesta semana.",
      vi: "Bắt đầu với 3 buổi ngắn trong tuần này.",
      id: "Mulai dengan 3 sesi singkat minggu ini.",
      tr: "Bu hafta 3 kısa seansla başla.",
      pl: "Zacznij od 3 krótkich sesji w tym tygodniu.",
    })
    : safeAnalytics.currentStreak > 0
      ? triLang(lang, {
        ru: 'Продолжай серию короткой практикой сегодня.',
        uk: 'Продовж серію короткою практикою сьогодні.',
        es: 'Mantén la racha con una práctica corta hoy.',
        'pt-BR': "Mantenha a sequência com uma prática curta hoje.",
        vi: "Giữ chuỗi bằng một buổi luyện ngắn hôm nay.",
        id: "Jaga rangkaian dengan latihan singkat hari ini.",
        tr: "Bugün kısa bir pratikle seriyi koru.",
        pl: "Utrzymaj serię krótkim ćwiczeniem dziś.",
      })
      : triLang(lang, {
        ru: 'Верни ритм одним коротким занятием сегодня.',
        uk: 'Поверни ритм одним коротким заняттям сьогодні.',
        es: 'Recupera el ritmo con una práctica corta hoy.',
        'pt-BR': "Recupere o ritmo com uma prática curta hoje.",
        vi: "Lấy lại nhịp bằng một buổi luyện ngắn hôm nay.",
        id: "Pulihkan ritme dengan latihan singkat hari ini.",
        tr: "Bugün kısa bir pratikle ritmi geri al.",
        pl: "Odzyskaj rytm krótkim ćwiczeniem dziś.",
      });
  const insights = safeAnalytics.insights.map(item => insightText(item, lang));
  const goalProgress = Math.min(100, Math.round((safeAnalytics.goal.activeDays / Math.max(1, safeAnalytics.goal.goal)) * 100));
  const luxuryLocations = isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined;
  const cardGradient = isGoldTheme ? GOLD_GRADIENTS.premiumPanel : t.cardGradient;
  const activeAccent = isGoldTheme ? GOLD_RICH.champagne : t.correct;
  const weakAccent = isGoldTheme ? GOLD_RICH.antiqueGold : '#FFB020';
  const quietPanel = isGoldTheme ? GOLD_RICH.bronzeWash : 'rgba(255,255,255,0.045)';
  const revealStyle = {
    opacity: revealAnim,
    transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  return (
    <StatsCardArtSurface testID="activity-365-card" name="weekRhythm" theme={t} isGoldTheme={isGoldTheme} gradientColors={cardGradient} gradientLocations={luxuryLocations} radius={18} style={[styles.card, { borderColor: isGoldTheme ? GOLD_RICH.hairline : t.border }, isGoldTheme ? goldShadow(2) : null]}>
      {isGoldTheme && <GoldBevel radius={18} intensity="normal" />}
      <TouchableOpacity testID="activity-365-toggle" activeOpacity={0.88} onPress={() => setExpanded(prev => !prev)} style={styles.topBar}>
        <View style={[styles.iconOrb, { backgroundColor: isGoldTheme ? GOLD_RICH.wash : t.correct + '1F' }]}>
          <Ionicons name="pulse-outline" size={22} color={activeAccent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'АКТИВНОСТЬ ЗА ГОД',
              uk: 'АКТИВНІСТЬ ЗА РІК',
              es: 'ACTIVIDAD ANUAL',
              'pt-BR': "ATIVIDADE ANUAL",
              vi: "HOẠT ĐỘNG CẢ NĂM",
              id: "AKTIVITAS TAHUNAN",
              tr: "YILLIK AKTİVİTE",
              pl: "AKTYWNOŚĆ ROCZNA",
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>
            {activeDaysText}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
            {loading ? triLang(lang, {
              ru: 'Обновляем данные...',
              uk: 'Оновлюємо дані...',
              es: 'Actualizando datos...',
              'pt-BR': "Atualizando dados...",
              vi: "Đang cập nhật dữ liệu...",
              id: "Memperbarui data...",
              tr: "Veriler güncelleniyor...",
              pl: "Aktualizowanie danych...",
            }) : statusText}
          </Text>
        </View>
        <View style={[styles.headerStatusPill, { backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : t.correct + '1A', borderColor: isGoldTheme ? GOLD_RICH.hairline : t.correct + '33' }]}>
          <Text style={{ color: activeAccent, fontSize: f.caption - 1, fontWeight: '900' }}>{goalProgress}%</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={t.textMuted} />
      </TouchableOpacity>

      <View style={styles.metricRail}>
        <View style={styles.metricItem}>
          <Text style={{ color: t.textGhost, fontSize: f.caption - 2, fontWeight: '800' }}>{triLang(lang, {
            ru: 'Серия',
            uk: 'Серія',
            es: 'Racha',
            'pt-BR': "Sequência",
            vi: "Chuỗi",
            id: "Rangkaian",
            tr: "Seri",
            pl: "Seria",
          })}</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900', marginTop: 2 }}>{analytics?.currentStreak ?? 0}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={{ color: t.textGhost, fontSize: f.caption - 2, fontWeight: '800' }}>{triLang(lang, {
            ru: 'Лучший месяц',
            uk: 'Кращий місяць',
            es: 'Mejor mes',
            'pt-BR': "Melhor mês",
            vi: "Tháng tốt nhất",
            id: "Bulan terbaik",
            tr: "En iyi ay",
            pl: "Najlepszy miesiąc",
          })}</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>{bestMonthText}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={{ color: t.textGhost, fontSize: f.caption - 2, fontWeight: '800' }}>{triLang(lang, {
            ru: 'До цели',
            uk: 'До цілі',
            es: 'Meta',
            'pt-BR': "Meta",
            vi: "Mục tiêu",
            id: "Target",
            tr: "Hedef",
            pl: "Cel",
          })}</Text>
          <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900', marginTop: 2 }}>{goalProgress}%</Text>
        </View>
      </View>

      {expanded ? (
        <View style={styles.filterRow}>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => setFilter(FILTERS[(FILTERS.indexOf(filter) - 1 + FILTERS.length) % FILTERS.length])}
            style={styles.filterArrow}
          >
            <Ionicons name="chevron-back" size={18} color={t.textMuted} />
          </TouchableOpacity>
          <View style={[styles.filterChipBig, { backgroundColor: isGoldTheme ? GOLD_RICH.paleGold : t.correct }]}>
            <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
              {filterLabel(filter, lang)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.72}
            onPress={() => setFilter(FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length])}
            style={styles.filterArrow}
          >
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        testID={expanded ? 'activity-365-map-expanded' : 'activity-365-map-collapsed'}
        activeOpacity={expanded ? 1 : 0.92}
        onPress={() => setExpanded(true)}
        style={[styles.mapShell, { backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}
        onLayout={onGridLayout}
      >
        <View
          style={{
            width: expanded ? gridWidth : previewCols * previewCell + (previewCols - 1) * previewGap,
            height: expanded ? gridHeight : previewHeight,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: expanded ? CELL_GAP : previewGap,
            alignSelf: 'center',
          }}
        >
          {days.slice(0, WINDOW_DAYS).map((day, idx) => {
            const size = expanded ? cellSize : previewCell;
            const level = expanded ? levelForFilter(days, day, filter) : day.level;
            const rounded = expanded ? Math.max(2, Math.min(3, size * 0.32)) : Math.max(0.75, size * 0.25);
            const cellStyle = {
              width: size,
              height: size,
              backgroundColor: levelColor(level, heatPalette),
              borderColor: level <= 0 ? t.border : 'transparent',
              borderWidth: expanded && level <= 0 ? StyleSheet.hairlineWidth : 0,
              borderRadius: rounded,
            };
            if (!expanded) {
              // Preview mode: plain View — avoids 365 touch responders on the JS thread
              return <View key={`${day.date}-${idx}`} style={cellStyle} />;
            }
            return (
              <TouchableOpacity
                key={`${day.date}-${idx}`}
                testID={`activity-365-day-${day.date}`}
                activeOpacity={0.7}
                onPress={() => setSelectedDay(day)}
                style={cellStyle}
                accessibilityRole="button"
                accessibilityLabel={day.date}
              />
            );
          })}
        </View>
      </TouchableOpacity>

      <View style={[styles.nextStepBar, { backgroundColor: isGoldTheme ? GOLD_RICH.bronzeWash : t.correct + '12', borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.correct + '26' }]}>
        <Ionicons name="sparkles-outline" size={16} color={activeAccent} />
        <Text style={{ color: isGoldTheme ? GOLD_RICH.ivoryMuted : t.textSecond, fontSize: f.caption, fontWeight: '800', flex: 1, lineHeight: f.caption * 1.25 }}>
          {nextStepText}
        </Text>
      </View>

      {expanded && analytics ? (
        <Animated.View style={revealStyle}>
          <View testID="activity-365-goal-card" style={[styles.goalCard, { backgroundColor: quietPanel, borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }}>
                  {triLang(lang, {
                    ru: 'Цель на год',
                    uk: 'Ціль на рік',
                    es: 'Objetivo anual',
                    'pt-BR': "Objetivo anual",
                    vi: "Mục tiêu năm",
                    id: "Target tahunan",
                    tr: "Yıllık hedef",
                    pl: "Cel roczny",
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }}>
                  {safeAnalytics.goal.forecastDate
                    ? triLang(lang, {
                      ru: `Прогноз: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/нед.`,
                      uk: `Прогноз: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/тиж.`,
                      es: `Previsión: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/sem.`,
                      'pt-BR': `Previsão: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/sem.`,
                      vi: `Dự báo: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/tuần`,
                      id: `Perkiraan: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/minggu`,
                      tr: `Tahmin: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/hafta`,
                      pl: `Prognoza: ${formatDay(safeAnalytics.goal.forecastDate)} · ${safeAnalytics.goal.requiredDaysPerWeek}/tydz.`,
                    })
                    : triLang(lang, {
                      ru: 'Начни серию, и прогноз появится.',
                      uk: 'Почни серію, і прогноз з\'явиться.',
                      es: 'Empieza una racha y aparecerá la previsión.',
                      'pt-BR': "Comece uma sequência e a previsão aparecerá.",
                      vi: "Bắt đầu một chuỗi và dự báo sẽ xuất hiện.",
                      id: "Mulai rangkaian dan perkiraan akan muncul.",
                      tr: "Bir seri başlat, tahmin görünecek.",
                      pl: "Zacznij serię, a pojawi się prognoza.",
                    })}
                </Text>
              </View>
              <Text style={{ color: safeAnalytics.goal.onTrack ? activeAccent : weakAccent, fontSize: f.body, fontWeight: '900' }}>
                {safeAnalytics.goal.activeDays}/{safeAnalytics.goal.goal}
              </Text>
            </View>
            <View style={[styles.goalTrack, { backgroundColor: t.bgSurface2 }]}>
              <View style={[styles.goalFill, { width: `${goalProgress}%`, backgroundColor: safeAnalytics.goal.onTrack ? activeAccent : weakAccent }]} />
            </View>
            <View style={styles.goalOptions}>
              {GOALS.map(goal => (
                <TouchableOpacity
                  key={goal}
                  activeOpacity={0.82}
                  onPress={() => void updateGoal(goal)}
                  style={[styles.goalBtn, { backgroundColor: safeAnalytics.goal.goal === goal ? (isGoldTheme ? GOLD_RICH.paleGold : t.correct) : 'transparent', borderColor: safeAnalytics.goal.goal === goal ? activeAccent : isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border }]}
                >
                  <Text style={{ color: safeAnalytics.goal.goal === goal ? t.correctText : t.textMuted, fontSize: f.caption, fontWeight: '900' }}>{goal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.periodGrid}>
            <LinearGradient colors={isGoldTheme ? [GOLD_RICH.washStrong, GOLD_RICH.mist] : ['rgba(90,200,120,0.16)', 'rgba(90,200,120,0.04)']} style={[styles.periodCard, { borderColor: isGoldTheme ? GOLD_RICH.hairline : 'rgba(90,200,120,0.34)' }]}>
              <Ionicons name="trending-up-outline" size={18} color={activeAccent} />
              <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Лучший месяц',
                  uk: 'Найкращий місяць',
                  es: 'Mejor mes',
                  'pt-BR': "Melhor mês",
                  vi: "Tháng tốt nhất",
                  id: "Bulan terbaik",
                  tr: "En iyi ay",
                  pl: "Najlepszy miesiąc",
                })}
              </Text>
              <Text style={{ color: activeAccent, fontSize: f.body, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>
                {monthLabel(safeAnalytics.bestMonth, lang)}
              </Text>
              <Text style={{ color: t.textGhost, fontSize: f.caption - 2, marginTop: 2 }}>
                {safeAnalytics.bestMonth ? `${safeAnalytics.bestMonth.activeDays} / ${safeAnalytics.bestMonth.totalXp} XP` : '-'}
              </Text>
            </LinearGradient>
            <LinearGradient colors={isGoldTheme ? [GOLD_RICH.bronzeWashStrong, 'rgba(60,42,11,0.04)'] : ['rgba(255,176,32,0.16)', 'rgba(255,176,32,0.04)']} style={[styles.periodCard, { borderColor: isGoldTheme ? GOLD_RICH.hairlineDark : 'rgba(255,176,32,0.34)' }]}>
              <Ionicons name="warning-outline" size={18} color={weakAccent} />
              <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900', marginTop: 8 }}>
                {triLang(lang, {
                  ru: 'Слабый период',
                  uk: 'Слабкий період',
                  es: 'Periodo débil',
                  'pt-BR': "Período fraco",
                  vi: "Giai đoạn yếu",
                  id: "Periode lemah",
                  tr: "Zayıf dönem",
                  pl: "Słaby okres",
                })}
              </Text>
              <Text style={{ color: weakAccent, fontSize: f.body, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>
                {monthLabel(safeAnalytics.weakestMonth, lang)}
              </Text>
              <Text style={{ color: t.textGhost, fontSize: f.caption - 2, marginTop: 2 }}>
                {triLang(lang, {
                  ru: `Провал ${safeAnalytics.biggestGap} дн.`,
                  uk: `Провал ${safeAnalytics.biggestGap} дн.`,
                  es: `Brecha ${safeAnalytics.biggestGap} d.`,
                  'pt-BR': `Lacuna ${safeAnalytics.biggestGap} d.`,
                  vi: `Khoảng trống ${safeAnalytics.biggestGap} ngày`,
                  id: `Jeda ${safeAnalytics.biggestGap} h`,
                  tr: `Boşluk ${safeAnalytics.biggestGap} g.`,
                  pl: `Przerwa ${safeAnalytics.biggestGap} d.`,
                })}
              </Text>
            </LinearGradient>
          </View>

          {insights.map((insight, idx) => (
            <LinearGradient key={`${insight.title}-${idx}`} colors={isGoldTheme ? (idx === 0 ? [GOLD_RICH.washStrong, GOLD_RICH.mist] : [GOLD_RICH.bronzeWash, 'rgba(0,0,0,0)']) : idx === 0 ? ['rgba(255,215,0,0.16)', 'rgba(255,215,0,0.04)'] : ['rgba(82,160,255,0.14)', 'rgba(82,160,255,0.04)']} style={[styles.insightCard, { borderColor: isGoldTheme ? (idx === 0 ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet) : idx === 0 ? 'rgba(255,215,0,0.38)' : 'rgba(82,160,255,0.30)' }]}>
              <Ionicons name={idx === 0 ? 'sparkles-outline' : 'bulb-outline'} size={20} color={isGoldTheme ? (idx === 0 ? GOLD_RICH.champagne : GOLD_RICH.antiqueGold) : idx === 0 ? '#FFD166' : t.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }}>{insight.title}</Text>
                <Text style={{ color: t.textSecond, fontSize: f.caption, lineHeight: f.caption * 1.35, marginTop: 3 }}>{insight.body}</Text>
              </View>
            </LinearGradient>
          ))}

          <View style={styles.footerTools}>
            <Text style={{ color: t.textGhost, fontSize: f.caption - 2 }}>{triLang(lang, {
              ru: 'Меньше',
              uk: 'Менше',
              es: 'Menos',
              'pt-BR': "Menos",
              vi: "Ít hơn",
              id: "Lebih sedikit",
              tr: "Daha az",
              pl: "Mniej",
            })}</Text>
            {([0, 1, 2, 3, 4] as const).map((lv) => (
              <View key={lv} style={{ width: legendApprox, height: legendApprox, borderRadius: Math.max(1, legendApprox / 5), backgroundColor: levelColor(lv, heatPalette), borderColor: t.border, borderWidth: StyleSheet.hairlineWidth }} />
            ))}
            <Text style={{ color: t.textGhost, fontSize: f.caption - 2 }}>{triLang(lang, {
              ru: 'Больше',
              uk: 'Більше',
              es: 'Más',
              'pt-BR': "Mais",
              vi: "Nhiều hơn",
              id: "Lebih banyak",
              tr: "Daha çok",
              pl: "Więcej",
            })}</Text>
            <TouchableOpacity testID="activity-365-report-open" activeOpacity={0.8} onPress={() => setReportOpen(true)} style={[styles.reportBtn, { borderColor: t.border, backgroundColor: t.bgSurface2 }]}>
              <Ionicons name="document-text-outline" size={14} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.caption - 2, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Отчёт',
                  uk: 'Звіт',
                  es: 'Informe',
                  'pt-BR': "Relatório",
                  vi: "Báo cáo",
                  id: "Laporan",
                  tr: "Rapor",
                  pl: "Raport",
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : null}

      <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      <MonthlyReportModal analytics={reportOpen ? analytics : null} onClose={() => setReportOpen(false)} />
    </StatsCardArtSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  title: {
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconOrb: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRail: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginHorizontal: 8,
  },
  headerStatusPill: {
    minWidth: 44,
    height: 28,
    borderRadius: 999,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  filterRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterArrow: {
    width: 36,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipBig: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapShell: {
    marginTop: 12,
    marginBottom: 2,
    overflow: 'hidden',
    borderRadius: 13,
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  nextStepBar: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  insightCard: {
    marginTop: 12,
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  periodGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  periodCard: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 12,
    minHeight: 104,
  },
  goalCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 12,
  },
  goalTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  goalOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  goalBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 0.5,
    paddingVertical: 9,
    alignItems: 'center',
  },
  reportBtn: {
    marginLeft: 'auto',
    borderRadius: 999,
    borderWidth: 0.5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 18,
  },
  modalGlow: {
    padding: 18,
  },
  reportSummary: {
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  detailTile: {
    width: '31.5%',
    minWidth: 86,
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 10,
  },
});
