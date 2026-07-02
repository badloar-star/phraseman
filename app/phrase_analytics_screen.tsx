// ═══════════════════════════════════════════════════════════════════════════
// phrase_analytics_screen.tsx — экран «Аналитика ошибок» (Premium)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useState, type ComponentProps } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TapScale from '../components/TapScale';
import SkeletonBlock from '../components/SkeletonShimmer';
import BouncyScrollView from '../components/BouncyScrollView';
import { LinearGradient } from '../components/SafeLinearGradient';
import { useFocusEffect, useRouter, type Router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { POS_ANALYTICS_AUDIT_ROUTE } from '../constants/devRoutes';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { hapticTap } from '../hooks/use-haptics';
import { ENABLE_DEV_TOOLS } from './config';
import {
  computePhraseAnalytics,
  type AnalyticsLocaleCopy,
  type PhraseAnalyticsResult,
  type WordCategoryStat,
  type LessonMistakeStat,
  type PersonalInsight,
  type WordCategory,
} from './phrase_analytics';
import { computeFrenchPhraseAnalytics } from './french_phrase_analytics';
import { loadResolvedPersonalTrainings, type ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import { frenchPersonalPracticeGateCopy, personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';
import { chooseDiagnosisForCategory } from './personal_practice_lesson_router';
import { lessonNameForStudyTarget } from './lesson_titles_for_study_target';
import { isStudyTargetSourceUiLang, type StudyTargetLang } from './study_target_lang_dev';
import { safeRouterBack } from './navigation_back';
import { monoIcon } from '../constants/monoIcon';
import { storageStudyTarget } from './target_storage_keys';

type IonName = ComponentProps<typeof Ionicons>['name'];

// ── Дизайн-токены ─────────────────────────────────────────────────────────────

const GATE_LUX = {
  panelDark: '#12100e',
  panelBorder: 'rgba(212, 175, 88, 0.28)',
  gold: '#C9A227',
  goldSoft: '#E8D5A3',
  prose: '#c4b8a4',
  iconRing: 'rgba(201, 162, 39, 0.12)',
} as const;

// Нейтральная палитра — никаких кислотных цветов
const SIGNAL = {
  weak: 'rgba(255,255,255,0.55)',      // слабые категории — приглушённый белый
  weakBorder: 'rgba(255,255,255,0.12)',
  strong: 'rgba(255,255,255,0.22)',    // сильные — ещё тише
  bar: {
    high: 'rgba(255,255,255,0.7)',     // > 30% — акцент на баре
    mid: 'rgba(255,255,255,0.45)',     // 15–30%
    low: 'rgba(255,255,255,0.2)',      // < 15%
  },
} as const;

const GATE_BENEFITS: Array<{ icon: IonName } & AnalyticsLocaleCopy> = [
  {
    icon: 'stats-chart-outline',
    ru: 'Топ категорий, где чаще всего промах.',
    uk: 'Топ категорій, де найчастіше промах.',
    es: 'Categorías donde más fallas.',
    ptBR: 'Categorias em que você mais erra.',
    'pt-BR': 'Categorias em que você mais erra.',
    vi: 'Các nhóm bạn hay mắc lỗi nhất.',
    id: 'Kategori tempat kamu paling sering salah.',
    tr: 'En çok hata yaptığın kategoriler.',
    pl: 'Kategorie, w których najczęściej się mylisz.',
  },
  {
    icon: 'school-outline',
    ru: 'Уроки с самым высоким % ошибок.',
    uk: 'Уроки з найвищим % помилок.',
    es: 'Lecciones con mayor % de errores.',
    ptBR: 'Lições com maior % de erros.',
    'pt-BR': 'Lições com maior % de erros.',
    vi: 'Bài học có % lỗi cao nhất.',
    id: 'Pelajaran dengan % kesalahan tertinggi.',
    tr: 'En yüksek hata yüzdesine sahip dersler.',
    pl: 'Lekcje z najwyższym % błędów.',
  },
  {
    icon: 'list-circle-outline',
    ru: 'Список фраз «уточнить и повторить».',
    uk: 'Список фраз «уточнити й повторити».',
    es: 'Lista de frases para repasar.',
    ptBR: 'Lista de frases para esclarecer e revisar.',
    'pt-BR': 'Lista de frases para esclarecer e revisar.',
    vi: 'Danh sách cụm từ cần làm rõ và ôn lại.',
    id: 'Daftar frasa untuk diperjelas dan diulang.',
    tr: 'Netleştirip tekrar edeceğin ifadeler listesi.',
    pl: 'Lista fraz do wyjaśnienia i powtórki.',
  },
];

// ── Метки категорий ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, AnalyticsLocaleCopy> = {
  verb: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', ptBR: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
  noun: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', ptBR: 'Substantivos', 'pt-BR': 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
  pronoun: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', ptBR: 'Pronomes', 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
  adjective: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', ptBR: 'Adjetivos', 'pt-BR': 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
  adverb: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', ptBR: 'Advérbios', 'pt-BR': 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
  preposition: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', ptBR: 'Preposições', 'pt-BR': 'Preposições', vi: 'Giới từ', id: 'Preposisi', tr: 'Edatlar', pl: 'Przyimki' },
  article: { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos', ptBR: 'Artigos', 'pt-BR': 'Artigos', vi: 'Mạo từ', id: 'Artikel', tr: 'Artikeller', pl: 'Przedimki' },
  existential: { ru: 'There is / There are', uk: 'There is / There are', es: 'There is / There are', ptBR: 'There is / There are', 'pt-BR': 'There is / There are', vi: 'There is / There are', id: 'There is / There are', tr: 'There is / There are', pl: 'There is / There are' },
  'to-be': { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be', ptBR: 'Verbo to be', 'pt-BR': 'Verbo to be', vi: 'Động từ to be', id: 'Kata kerja to be', tr: 'to be fiili', pl: 'Czasownik to be' },
  conjunction: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', ptBR: 'Conjunções', 'pt-BR': 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
  modal: { ru: 'Модальные', uk: 'Модальні', es: 'Modales', ptBR: 'Verbos modais', 'pt-BR': 'Verbos modais', vi: 'Động từ khuyết thiếu', id: 'Kata kerja modal', tr: 'Modal fiiller', pl: 'Czasowniki modalne' },
  phrasal_particle: { ru: 'Частицы', uk: 'Частки', es: 'Partículas', ptBR: 'Partículas de phrasal verbs', 'pt-BR': 'Partículas de phrasal verbs', vi: 'Tiểu từ trong phrasal verb', id: 'Partikel phrasal verb', tr: 'Phrasal verb parçacıkları', pl: 'Partykuły phrasal verbs' },
  modifier: { ru: 'Modifiers', uk: 'Modifiers', es: 'Modificadores', ptBR: 'Modificadores', 'pt-BR': 'Modificadores', vi: 'Từ bổ nghĩa', id: 'Modifier', tr: 'Niteleyiciler', pl: 'Modyfikatory' },
  determiner: { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes', ptBR: 'Determinantes', 'pt-BR': 'Determinantes', vi: 'Từ hạn định', id: 'Determiner', tr: 'Belirleyiciler', pl: 'Określniki' },
  other: { ru: 'Другое', uk: 'Інше', es: 'Otros', ptBR: 'Outros', 'pt-BR': 'Outros', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
};

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ pct }: { pct: number }) {
  const barColor = pct >= 30 ? SIGNAL.bar.high : pct >= 15 ? SIGNAL.bar.mid : SIGNAL.bar.low;

  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}

// ── InsightRow — минималистичный, без цветного бордера слева ─────────────────

function InsightRow({ insight }: { insight: PersonalInsight }) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const isCompassTheme = false;
  const rowRadius = isCompassTheme ? 8 : 14;
  const text = triLang(lang, {
    ru: insight.ru,
    uk: insight.uk,
    es: insight.es,
    'pt-BR': insight.ptBR,
    vi: insight.vi,
    id: insight.id,
    tr: insight.tr,
    pl: insight.pl,
  });
  const isPositive = insight.accent === 'green';
  const iconName: IonName = isPositive ? 'checkmark-circle-outline' : 'alert-circle-outline';

  return (
    <View style={[styles.insightRow, { borderBottomColor: t.border }]}>
      <Ionicons
        name={iconName}
        size={16}
        color={isPositive ? 'rgba(255,255,255,0.35)' : t.accent}
        style={{ marginTop: 1, flexShrink: 0 }}
      />
      <Text style={[styles.insightText, { color: isPositive ? t.textMuted : t.textSecond, fontSize: f.body }]}>
        {text}
      </Text>
    </View>
  );
}

// ── CategoryRow ───────────────────────────────────────────────────────────────

function CategoryRow({
  stat,
  router,
  resolvedPersonalTrainings,
  personalTrainingEnabled,
}: {
  stat: WordCategoryStat;
  router: Router;
  resolvedPersonalTrainings: ResolvedPersonalTrainingsState | null;
  personalTrainingEnabled: boolean;
}) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const isCompassTheme = false;
  const rowRadius = isCompassTheme ? 8 : 14;
  const categoryCopy = CATEGORY_LABELS[stat.category] ?? CATEGORY_LABELS.other;
  const label = triLang(lang, {
    ru: categoryCopy.ru,
    uk: categoryCopy.uk,
    es: categoryCopy.es,
    'pt-BR': categoryCopy.ptBR,
    vi: categoryCopy.vi,
    id: categoryCopy.id,
    tr: categoryCopy.tr,
    pl: categoryCopy.pl,
  });
  const priorityScore = stat.priorityScore ?? stat.weaknessScore;
  const recoveryScore = stat.recoveryScore ?? 0;
  const isWeak = priorityScore >= 55 || (stat.pct >= 15 && recoveryScore < 25);
  const pctOpacity = priorityScore >= 70 ? 1 : priorityScore >= 45 || stat.pct >= 15 ? 0.75 : 0.45;
  const diagnosisId = isWeak && personalTrainingEnabled ? chooseDiagnosisForCategory(stat, resolvedPersonalTrainings) : null;
  const openDiagnosis = () => {
    if (!diagnosisId) return;
    hapticTap();
    router.push({
      pathname: '/problem_coach',
      params: {
        microDiagnosisId: diagnosisId,
        category: stat.category,
      },
    } as any);
  };

  const inner = (
    <>
      <View style={styles.catMeta}>
        <Text style={[styles.catPctBig, { color: t.textPrimary, opacity: pctOpacity, fontSize: f.h2 }]}>
          {stat.pct}
        </Text>
        <Text style={[styles.catPctSign, { color: t.textMuted, fontSize: f.caption }]}>%</Text>
      </View>
      <View style={styles.catBody}>
        <Text style={[styles.catLabel, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={2}>
          {label}
        </Text>
        <ProgressBar pct={stat.pct} />
        {diagnosisId && (
          <View style={[styles.coachCta, { borderTopColor: t.border }]}>
            <Ionicons name="school-outline" size={12} color={t.accent} />
            <Text style={[styles.coachCtaText, { color: t.accent, fontSize: f.caption }]}>
              {triLang(lang, {
                ru: 'Персональное объяснение и упражнения',
                uk: 'Персональне пояснення та вправи',
                es: 'Explicación y ejercicios personalizados',
                'pt-BR': 'Explicação e exercícios personalizados',
                vi: 'Giải thích và bài tập cá nhân hóa',
                id: 'Penjelasan dan latihan personal',
                tr: 'Kişisel açıklama ve alıştırmalar',
                pl: 'Personalne wyjaśnienie i ćwiczenia',
              })}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={t.accent} style={{ opacity: 0.6 }} />
          </View>
        )}
      </View>
    </>
  );

  return (
    diagnosisId ? (
      <TouchableOpacity
        style={[
          styles.catRow,
          {
            backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
            borderRadius: rowRadius,
            overflow: 'hidden',
          },
          isCompassTheme && compassShadow(1),
        ]}
        onPress={openDiagnosis}
        activeOpacity={0.86}
      >
        {isCompassTheme ? <CompassDepthSurface radius={rowRadius} quiet /> : null}
        {inner}
      </TouchableOpacity>
    ) : (
      <View
        style={[
          styles.catRow,
          {
            backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
            borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
            borderRadius: rowRadius,
            overflow: 'hidden',
          },
          isCompassTheme && compassShadow(1),
        ]}
      >
        {isCompassTheme ? <CompassDepthSurface radius={rowRadius} quiet /> : null}
        {inner}
      </View>
    )
  );
}

// ── LessonRow ─────────────────────────────────────────────────────────────────

const ANALYTICS_LESSON_TITLE_UNAVAILABLE: Record<PlannedInterfaceLang, string> = {
  'pt-BR': 'Título da lição indisponível',
  vi: 'Chưa có tiêu đề bài học',
  id: 'Judul pelajaran belum tersedia',
  tr: 'Ders başlığı kullanılamıyor',
  pl: 'Tytuł lekcji jest niedostępny',
};

function isAnalyticsPlannedLang(lang: Lang): lang is PlannedInterfaceLang {
  return lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl';
}

export function phraseAnalyticsLessonTitle(stat: LessonMistakeStat, lang: Lang, studyTarget: StudyTargetLang): string {
  const localized = lessonNameForStudyTarget(lang, studyTarget, stat.lessonId)?.trim();
  if (localized) return localized;
  if (isAnalyticsPlannedLang(lang)) return ANALYTICS_LESSON_TITLE_UNAVAILABLE[lang];
  let legacyTitle = stat.lessonNameRU;
  if (lang === 'uk') legacyTitle = stat.lessonNameUK;
  if (lang === 'es') legacyTitle = stat.lessonNameES;
  return legacyTitle || `Lesson ${stat.lessonId}`;
}

function LessonRow({ stat, studyTarget }: { stat: LessonMistakeStat; studyTarget: StudyTargetLang }) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const name = phraseAnalyticsLessonTitle(stat, lang, studyTarget);
  const pctOpacity = stat.pct >= 25 ? 1 : stat.pct >= 12 ? 0.75 : 0.45;
  const isCompassTheme = false;
  const rowRadius = isCompassTheme ? 8 : 14;

  return (
    <View
      style={[
        styles.catRow,
        {
          backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
          borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
          borderRadius: rowRadius,
          overflow: 'hidden',
        },
        isCompassTheme && compassShadow(1),
      ]}
    >
      {isCompassTheme ? <CompassDepthSurface radius={rowRadius} quiet /> : null}
      <View style={styles.catMeta}>
        <Text style={[styles.catPctBig, { color: t.textPrimary, opacity: pctOpacity, fontSize: f.h2 }]}>
          {stat.pct}
        </Text>
        <Text style={[styles.catPctSign, { color: t.textMuted, fontSize: f.caption }]}>%</Text>
      </View>
      <View style={styles.catBody}>
        <View style={styles.lessonMeta}>
          <Text style={[styles.lessonNum, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lec.', 'pt-BR': 'Lição', vi: 'Bài', id: 'Pelajaran', tr: 'Ders', pl: 'Lek.' })} {stat.lessonId}
          </Text>
        </View>
        <Text style={[styles.catLabel, { color: t.textPrimary, fontSize: f.sub }]} numberOfLines={2}>
          {name}
        </Text>
        <ProgressBar pct={stat.pct} />
      </View>
    </View>
  );
}

// ── Главный экран ─────────────────────────────────────────────────────────────

/** B7: тёплая память последнего результата на процесс — повторные заходы рисуют
 * данные первым кадром; без неё каждый заход начинался с ложного «Пока нет данных». */
let phraseAnalyticsWarm: {
  key: string;
  data: PhraseAnalyticsResult | null;
  resolved: ResolvedPersonalTrainingsState | null;
} | null = null;

export default function PhraseAnalyticsScreen() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const isLightGate = false;
  const isCompassTheme = false;
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const sourceLocale = isStudyTargetSourceUiLang(lang) ? lang : 'ru';
  const { hasPremiumAccess: isPremium } = usePremium();
  const warmKey = `${storageStudyTarget(studyTarget)}:${sourceLocale}`;
  const [data, setData] = useState<PhraseAnalyticsResult | null>(
    () => (phraseAnalyticsWarm?.key === warmKey ? phraseAnalyticsWarm.data : null),
  );
  const [resolvedPersonalTrainings, setResolvedPersonalTrainings] = useState<ResolvedPersonalTrainingsState | null>(
    () => (phraseAnalyticsWarm?.key === warmKey ? phraseAnalyticsWarm.resolved : null),
  );
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'categories' | 'lessons' | 'phrases'>('categories');
  const personalPracticeCoachEnabled = personalPracticeCoachEnabledForTarget(studyTarget);
  const analyticsSourceGateOpen = personalPracticeCoachEnabled;
  const sourceGateCopy = frenchPersonalPracticeGateCopy(lang);
  const showDevAudit = ENABLE_DEV_TOOLS && personalPracticeCoachEnabled;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, resolved] = await Promise.all([
        analyticsSourceGateOpen
          ? storageStudyTarget(studyTarget) === 'fr'
            ? computeFrenchPhraseAnalytics({ sourceLocale })
            : computePhraseAnalytics()
          : Promise.resolve(null),
        personalPracticeCoachEnabled ? loadResolvedPersonalTrainings({ studyTarget, sourceLocale }) : Promise.resolve(null),
      ]);
      phraseAnalyticsWarm = { key: warmKey, data: result, resolved };
      setData(result);
      setResolvedPersonalTrainings(resolved);
    } finally {
      setLoading(false);
    }
  }, [analyticsSourceGateOpen, personalPracticeCoachEnabled, sourceLocale, studyTarget, warmKey]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const title = triLang(lang, { ru: 'Аналитика', uk: 'Аналітика', es: 'Analítica', 'pt-BR': 'Analítica', vi: 'Phân tích', id: 'Analitik', tr: 'Analiz', pl: 'Analityka' });
  const emptyText = triLang(lang, {
    ru: 'Пока нет данных. Пройди несколько уроков — аналитика появится здесь.',
    uk: 'Поки немає даних. Пройди кілька уроків — аналітика з\'явиться тут.',
    es: 'Sin datos aún. Completa algunas lecciones y la analítica aparecerá aquí.',
    'pt-BR': 'Ainda sem dados. Complete algumas lições e a analítica aparecerá aqui.',
    vi: 'Chưa có dữ liệu. Hãy hoàn thành vài bài học, phần phân tích sẽ xuất hiện ở đây.',
    id: 'Belum ada data. Selesaikan beberapa pelajaran, lalu analitik akan muncul di sini.',
    tr: 'Henüz veri yok. Birkaç dersi tamamla; analiz burada görünecek.',
    pl: 'Brak danych. Ukończ kilka lekcji, a analityka pojawi się tutaj.',
  });

  const tabs = [
    { key: 'categories' as const, label: triLang(lang, { ru: 'Категории', uk: 'Категорії', es: 'Categorías', 'pt-BR': 'Categorias', vi: 'Danh mục', id: 'Kategori', tr: 'Kategoriler', pl: 'Kategorie' }) },
    { key: 'lessons' as const, label: triLang(lang, { ru: 'Уроки', uk: 'Уроки', es: 'Lecciones', 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' }) },
    { key: 'phrases' as const, label: triLang(lang, { ru: 'Фразы', uk: 'Фрази', es: 'Frases', 'pt-BR': 'Frases', vi: 'Cụm từ', id: 'Frasa', tr: 'İfadeler', pl: 'Frazy' }) },
  ];

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TapScale
            onPress={() => { hapticTap(); safeRouterBack(router, '/trainer' as any); }}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </TapScale>
          <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          {showDevAudit ? (
            <TapScale
              onPress={() => { hapticTap(); router.push(POS_ANALYTICS_AUDIT_ROUTE as any); }}
              style={styles.auditBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="bug-outline" size={19} color={t.textPrimary} />
            </TapScale>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* ── Premium gate ── */}
        {!isPremium ? (
          <BouncyScrollView decelerationRate="normal" showsVerticalScrollIndicator={false} contentContainerStyle={styles.gateScroll}>
            <ContentWrap>
              <View
                style={[
                  styles.gateCard,
                  {
                    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isLightGate ? t.bgCard : GATE_LUX.panelDark,
                    borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : isLightGate ? t.border : GATE_LUX.panelBorder,
                    borderRadius: isCompassTheme ? 10 : 22,
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(3),
                ]}
              >
                {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
                {/* Icon + title */}
                <View style={styles.gateHeader}>
                  <LinearGradient
                    colors={['rgba(42,36,28,0.95)', 'rgba(18,16,14,0.98)']}
                    style={[styles.gateIconBox, { borderColor: GATE_LUX.panelBorder }]}
                  >
                    <View style={[styles.gateIconInner, { borderColor: 'rgba(232,213,163,0.35)' }]}>
                      <Ionicons name="diamond" size={24} color={monoIcon(themeMode, GATE_LUX.goldSoft)} />
                    </View>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.gateLabel, { color: isLightGate ? '#B8860B' : GATE_LUX.gold }]}>
                      PHRASEMAN
                    </Text>
                    <Text style={[styles.gateTitle, { color: isLightGate ? t.textPrimary : '#f2efe8', fontSize: Math.max(18, f.h2 * 0.88) }]}>
                      {triLang(lang, { ru: 'Разбор твоих ошибок', uk: 'Розбір твоїх помилок', es: 'Análisis de tus errores', 'pt-BR': 'Análise dos seus erros', vi: 'Phân tích lỗi của bạn', id: 'Analisis kesalahanmu', tr: 'Hatalarının analizi', pl: 'Analiza twoich błędów' })}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.gateProse, { color: isLightGate ? t.textSecond : GATE_LUX.prose, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: 'Покажем слабые темы, уроки и фразы, которые лучше повторить сейчас.',
                    uk: 'Покажемо слабкі теми, уроки й фрази, які краще повторити зараз.',
                    es: 'Verás temas débiles, lecciones y frases para repasar ahora.',
                    'pt-BR': 'Mostraremos temas fracos, lições e frases que vale revisar agora.',
                    vi: 'Chúng tôi sẽ hiển thị chủ đề yếu, bài học và cụm từ nên ôn lại ngay.',
                    id: 'Kami akan menampilkan topik lemah, pelajaran, dan frasa yang sebaiknya diulang sekarang.',
                    tr: 'Zayıf konuları, dersleri ve şimdi tekrar etmen gereken ifadeleri göstereceğiz.',
                    pl: 'Pokażemy słabe tematy, lekcje i frazy, które warto teraz powtórzyć.',
                  })}
                </Text>

                <Text style={[styles.gateSubLabel, { color: isLightGate ? t.textMuted : 'rgba(200,190,175,0.65)' }]}>
                  {triLang(lang, { ru: 'ЧТО ОТКРОЕТСЯ', uk: 'ЩО ВІДКРИЄТЬСЯ', es: 'QUÉ SE DESBLOQUEA', 'pt-BR': 'O QUE ABRE', vi: 'SẼ MỞ KHÓA', id: 'YANG TERBUKA', tr: 'NE AÇILIR', pl: 'CO SIĘ ODBLOKUJE' })}
                </Text>

                <View style={{ gap: 12 }}>
                  {GATE_BENEFITS.map((row, i) => (
                    <View key={i} style={styles.gateBenefit}>
                      <View style={[styles.gateBenefitIcon, { backgroundColor: isLightGate ? GATE_LUX.iconRing : 'rgba(201,162,39,0.1)' }]}>
                        <Ionicons name={row.icon} size={19} color={monoIcon(themeMode, isLightGate ? '#B8860B' : GATE_LUX.gold)} />
                      </View>
                      <Text style={[styles.gateBenefitText, { color: isLightGate ? t.textPrimary : '#ebe6dc', fontSize: f.body }]}>
                        {triLang(lang, { ru: row.ru, uk: row.uk, es: row.es, 'pt-BR': row.ptBR, vi: row.vi, id: row.id, tr: row.tr, pl: row.pl })}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => { hapticTap(); router.push({ pathname: '/premium_modal', params: { context: 'patterns' } } as any); }}
                  activeOpacity={0.88}
                  style={[
                    styles.gateBtn,
                    isCompassTheme && {
                      borderRadius: 9,
                      borderColor: COMPASS_RICH.hairlineStrong,
                      backgroundColor: COMPASS_RICH.champagne,
                    },
                    isCompassTheme && compassShadow(1),
                  ]}
                >
                  {isCompassTheme ? <CompassDepthSurface radius={9} cream /> : null}
                  <LinearGradient
                    colors={isCompassTheme ? [COMPASS_RICH.cream, COMPASS_RICH.champagne] : ['#6b5420', '#9a7b32', '#c9a227', '#9a7b32', '#6b5420']}
                    locations={isCompassTheme ? [0, 1] : [0, 0.25, 0.5, 0.75, 1]}
                    start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                    style={[styles.gateBtnInner, isCompassTheme && { borderRadius: 9 }]}
                  >
                    <Text style={[styles.gateBtnText, { fontSize: f.body }, isCompassTheme && { color: COMPASS_RICH.textDark }]}>
                      {triLang(lang, { ru: 'Открыть аналитику', uk: 'Відкрити аналітику', es: 'Abrir analítica', 'pt-BR': 'Abrir analítica', vi: 'Mở phân tích', id: 'Buka analitik', tr: 'Analizi aç', pl: 'Otwórz analitykę' })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ContentWrap>
          </BouncyScrollView>

        ) : !analyticsSourceGateOpen ? (
          <View style={styles.center}>
            <View style={[styles.emptyIconBox, { backgroundColor: t.accent + '18' }]}>
              <Ionicons name="lock-closed-outline" size={40} color={t.accent} />
            </View>
            <Text style={[styles.emptyText, { color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }]}>
              {sourceGateCopy.title}
            </Text>
            <Text style={[styles.emptyText, { color: t.textSecond, fontSize: f.body }]}>
              {sourceGateCopy.body}
            </Text>
          </View>

        ) : loading && !data ? (
          /* B7: скелетон первой загрузки — раньше первый кадр рисовал ложное «Пока нет данных» */
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <SkeletonBlock width="100%" height={72} borderRadius={16} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <SkeletonBlock width={96} height={34} borderRadius={17} />
              <SkeletonBlock width={96} height={34} borderRadius={17} />
              <SkeletonBlock width={96} height={34} borderRadius={17} />
            </View>
            <SkeletonBlock width="100%" height={120} borderRadius={16} style={{ marginTop: 16 }} />
            <SkeletonBlock width="100%" height={120} borderRadius={16} style={{ marginTop: 10 }} />
          </View>

        ) : !data || data.totalMistakes === 0 ? (
          <View style={styles.center}>
            <View style={[styles.emptyIconBox, { backgroundColor: t.accent + '18' }]}>
              <Ionicons name="bar-chart-outline" size={40} color={t.accent} />
            </View>
            <Text style={[styles.emptyText, { color: t.textSecond, fontSize: f.body }]}>{emptyText}</Text>
          </View>

        ) : (
          <BouncyScrollView decelerationRate="normal" showsVerticalScrollIndicator contentContainerStyle={styles.scrollContent}>
            <ContentWrap>

              {/* ── Сводка ── */}
              <View style={[styles.summaryRow, { borderColor: t.border }]}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: t.textPrimary, fontSize: f.h1 }]}>
                    {data.totalMistakes}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: 'ошибок', uk: 'помилок', es: 'errores', 'pt-BR': 'erros', vi: 'lỗi', id: 'kesalahan', tr: 'hata', pl: 'błędów' })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: t.textPrimary, fontSize: f.h1 }]}>
                    {data.windowDays}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: 'дней', uk: 'днів', es: 'días', 'pt-BR': 'dias', vi: 'ngày', id: 'hari', tr: 'gün', pl: 'dni' })}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: t.textPrimary, fontSize: f.h1 }]}>
                    {data.categoryStats.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: t.textMuted, fontSize: f.caption }]}>
                    {triLang(lang, { ru: 'категорий', uk: 'категорій', es: 'categorías', 'pt-BR': 'categorias', vi: 'danh mục', id: 'kategori', tr: 'kategori', pl: 'kategorii' })}
                  </Text>
                </View>
              </View>

              {/* ── Инсайты ── */}
              {data.insights.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: t.textMuted, fontSize: f.label }]}>
                    {triLang(lang, { ru: 'ВЫВОДЫ', uk: 'ВИСНОВКИ', es: 'CONCLUSIONES', 'pt-BR': 'CONCLUSÕES', vi: 'KẾT LUẬN', id: 'KESIMPULAN', tr: 'SONUÇLAR', pl: 'WNIOSKI' })}
                  </Text>
                  <View
                    style={[
                      styles.insightBlock,
                      {
                        backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                        borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                        borderRadius: isCompassTheme ? 8 : 14,
                      },
                      isCompassTheme && compassShadow(1),
                    ]}
                  >
                    {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                    {data.insights.map((ins, i) => (
                      <InsightRow key={i} insight={ins} />
                    ))}
                  </View>
                </View>
              )}

              {/* ── CTA тренировка ── */}
              {/* ── Вкладки ── */}
              <View
                style={[
                  styles.tabs,
                  {
                    backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgSurface,
                    borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                    borderWidth: isCompassTheme ? 1 : 0,
                    borderRadius: isCompassTheme ? 8 : 12,
                    overflow: 'hidden',
                  },
                  isCompassTheme && compassShadow(1),
                ]}
              >
                {tabs.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { hapticTap(); setTab(key); }}
                    style={[
                      styles.tabItem,
                      isCompassTheme && { borderRadius: 7, overflow: 'hidden' },
                      tab === key && {
                        backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : t.bgCard,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    {isCompassTheme && tab === key ? <CompassDepthSurface radius={7} quiet /> : null}
                    <Text style={[
                      styles.tabText,
                      { fontSize: f.sub },
                      tab === key
                        ? { color: t.textPrimary, fontWeight: '700' }
                        : { color: t.textMuted, fontWeight: '500' },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Контент вкладок ── */}
              {tab === 'categories' && (
                <View style={styles.list}>
                  {data.categoryStats.length === 0 ? (
                    <Text style={[styles.emptyTabText, { color: t.textMuted, fontSize: f.body }]}>
                      {triLang(lang, { ru: 'Нет данных по категориям', uk: 'Немає даних', es: 'Sin datos', 'pt-BR': 'Sem dados por categoria', vi: 'Không có dữ liệu theo danh mục', id: 'Tidak ada data kategori', tr: 'Kategori verisi yok', pl: 'Brak danych kategorii' })}
                    </Text>
                  ) : (
                    data.categoryStats.map((stat) => (
                      <CategoryRow
                        key={stat.category}
                        stat={stat}
                        router={router}
                        resolvedPersonalTrainings={resolvedPersonalTrainings}
                        personalTrainingEnabled={personalPracticeCoachEnabled}
                      />
                    ))
                  )}
                </View>
              )}

              {tab === 'lessons' && (
                <View style={styles.list}>
                  {data.lessonStats.slice(0, 10).map((stat) => (
                    <LessonRow key={stat.lessonId} stat={stat} studyTarget={studyTarget} />
                  ))}
                </View>
              )}

              {tab === 'phrases' && (
                <View style={styles.list}>
                  {data.topMistakePhrases.map(({ phrase, lessonId, count }, i) => (
                    <View
                      key={i}
                      style={[
                        styles.phraseRow,
                        {
                          backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                          borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                          borderRadius: isCompassTheme ? 8 : 14,
                          overflow: 'hidden',
                        },
                        isCompassTheme && compassShadow(1),
                      ]}
                    >
                      {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
                      <View style={[styles.phraseBadge, { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgSurface }]}>
                        <Text style={[styles.phraseBadgeText, { color: t.textPrimary, fontSize: f.label }]}>×{count}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.phraseText, { color: t.textPrimary, fontSize: f.body }]}>{phrase}</Text>
                        <Text style={[styles.phraseLesson, { color: t.textMuted, fontSize: f.caption }]}>
                          {lessonId > 0
                            ? `${triLang(lang, { ru: 'Урок', uk: 'Урок', es: 'Lección', 'pt-BR': 'Lição', vi: 'Bài', id: 'Pelajaran', tr: 'Ders', pl: 'Lekcja' })} ${lessonId}`
                            : triLang(lang, { ru: 'Из диагностики', uk: 'З діагностики', es: 'Del diagnóstico', 'pt-BR': 'Do diagnóstico', vi: 'Từ bài kiểm tra', id: 'Dari diagnostik', tr: 'Tanı testinden', pl: 'Z diagnozy' })}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

            </ContentWrap>
          </BouncyScrollView>
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  auditBtn: { width: 36, alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '700', letterSpacing: -0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 24, maxWidth: 280 },

  // ── Gate ──
  gateScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  gateCard: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    gap: 18,
  },
  gateHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  gateIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  gateIconInner: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gateLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2.4, marginBottom: 6 },
  gateTitle: { fontWeight: '800', lineHeight: 26 },
  gateProse: { lineHeight: 24, letterSpacing: 0.1 },
  gateSubLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  gateBenefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateBenefitIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  gateBenefitText: { flex: 1, lineHeight: 22, fontWeight: '500' },
  gateBtn: { borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212,175,88,0.3)' },
  gateBtnInner: { paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center' },
  gateBtnText: { color: '#140f08', fontWeight: '800', letterSpacing: 0.3 },

  // ── Content: боковые отступы здесь — ContentWrap задаёт только maxWidth по центру ──
  scrollContent: { paddingTop: 12, paddingBottom: 48, paddingHorizontal: 16 },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginBottom: 24,
    paddingVertical: 20,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  summaryItem: { alignItems: 'center', gap: 3 },
  summaryNum: { fontWeight: '700', letterSpacing: -0.5 },
  summaryLabel: { fontWeight: '500', letterSpacing: 0.3, textTransform: 'uppercase' },
  summaryDivider: { width: 0.5, height: 32, opacity: 0.5 },

  section: { marginBottom: 16 },
  sectionLabel: { fontWeight: '700', letterSpacing: 1.1, marginBottom: 8 },

  // инсайты — единый блок без разноцветных бордеров
  insightBlock: {
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  insightText: { flex: 1, lineHeight: 22, fontWeight: '500' },

  // Вкладки — pills style
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: { letterSpacing: 0.1 },

  list: { gap: 8 },

  // Строка категории — горизонтальный лейаут с большим числом
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  catMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 52,
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  catPctBig: { fontWeight: '700', letterSpacing: -0.5 },
  catPctSign: { marginLeft: 1, fontWeight: '500' },
  catBody: { flex: 1, gap: 5 },
  catLabel: { fontWeight: '600', letterSpacing: 0.1 },
  catSignals: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  catSignalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  catSignalText: { fontWeight: '700' },

  coachCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 0.5,
  },
  coachCtaText: { flex: 1, fontWeight: '600', letterSpacing: 0.1 },

  progressBg: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  lessonMeta: { flexDirection: 'row', alignItems: 'center' },
  lessonNum: { fontWeight: '600', letterSpacing: 0.2, textTransform: 'uppercase' },

  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 13,
    gap: 12,
  },
  phraseBadge: {
    width: 38, height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  phraseBadgeText: { fontWeight: '800' },
  phraseText: { fontWeight: '600', lineHeight: 22 },
  phraseLesson: { marginTop: 2, opacity: 0.6 },

  emptyTabText: { textAlign: 'center', paddingVertical: 24 },
});
