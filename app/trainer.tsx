import React, { useCallback, useMemo, useRef, useState } from 'react';
/* eslint-disable import/no-duplicates -- точная строка default-импорта ниже требуется контрактом tests/bouncy_screen_chrome_contract.test.ts */
import Reanimated from 'react-native-reanimated';
import { FadeInDown } from 'react-native-reanimated';
/* eslint-enable import/no-duplicates */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import TapScale from '../components/TapScale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import { LinearGradient } from '../components/SafeLinearGradient';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import { clearTrainerStore, devSeedTrainer, type TrainerDashboard, type TrainerQueue, } from './trainer_store';
import { ENABLE_DEV_TOOLS } from './config';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { type PhraseAnalyticsResult, type WordCategoryStat, } from './phrase_analytics';
import { getDiagnosisTraining } from './diagnosis_trainings';
import type { ResolvedPersonalTrainingsState } from './diagnosis_training_progress';
import { personalPracticeCoachEnabledForTarget } from './personal_practice_target_gate';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { choosePersonalTrainingCandidate } from './personal_training_taxonomy';
import { isStudyTargetSourceUiLang } from './study_target_lang_dev';
import { getCachedTrainerPracticeSnapshot, prefetchTrainerPracticeSnapshot } from './trainer_practice_prefetch';
import { practiceHallDurationMinutes, selectPracticeHallQueue } from './trainer_practice_hall';
import { GOLD_RICH } from '../constants/goldTheme';
import { statsHairline, statsThemeAccent, statsThemeSoftBg } from '../constants/statsThemeChrome';
import { streakCalendarShortWeekdays } from '../constants/streak_stats_i18n';
import { StatBars, type StatBar } from '../components/stats/StatBars';
import { StatScoreRing } from '../components/stats/StatScoreRing';
import { safeRouterBack } from './navigation_back';
import { startReservedTrainerSession } from './trainer_session_navigation';
import { getVerifiedPremiumStatus } from './premium_guard';
import ErrorBoundary from '../components/ErrorBoundary';

type RoutePath = '/trainer_words_session' | '/trainer_phrases_session';

/**
 * Очередь «арены» — это фразовые ошибки из быстрых тренировок; отдельного
 * экрана арены больше нет, поэтому честно ведём её в фразовую сессию
 * (раньше роут '/trainer_arena_session' указывал в никуда).
 */
function routeForQueue(queue: TrainerQueue): RoutePath {
    return queue === 'words' ? '/trainer_words_session' : '/trainer_phrases_session';
}

const EMPTY_TRAINER_DASHBOARD: TrainerDashboard = {
    due: { words: 0, phrases: 0, arena: 0 },
    totalDue: 0,
    overdue: 0,
    totalTracked: 0,
    active: 0,
    future: 0,
    archived: 0,
    hardestQueue: null,
    hardestMistakes: 0,
    hardestCategory: null,
    hardestCategoryMistakes: 0,
    hardestCategoryPriority: 0,
    hardestCategoryRecovery: 0,
    memoryScore: 0,
    posMasteryXp: 0,
    posMasteryTop: [],
    nextQueue: null,
};
const CATEGORY_LABELS_INLINE: Record<string, {
    ru: string;
    uk: string;
    es: string;
} & Record<PlannedInterfaceLang, string>> = {
    verb: { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', 'pt-BR': 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
    noun: { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', 'pt-BR': 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
    pronoun: { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
    adjective: { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', 'pt-BR': 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
    adverb: { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', 'pt-BR': 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
    preposition: { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', 'pt-BR': 'Preposições', vi: 'Giới từ', id: 'Preposisi', tr: 'Edatlar', pl: 'Przyimki' },
    article: { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos', 'pt-BR': 'Artigos', vi: 'Mạo từ', id: 'Artikel', tr: 'Artikeller', pl: 'Przedimki' },
    'to-be': { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be', 'pt-BR': 'Verbo to be', vi: 'Động từ to be', id: 'Kata kerja to be', tr: 'To be fiili', pl: 'Czasownik to be' },
    conjunction: { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', 'pt-BR': 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
    modal: { ru: 'Модальные', uk: 'Модальні', es: 'Modales', 'pt-BR': 'Modais', vi: 'Động từ khuyết thiếu', id: 'Modal', tr: 'Modal fiiller', pl: 'Czasowniki modalne' },
    existential: { ru: 'There is/are', uk: 'There is/are', es: 'There is/are', 'pt-BR': 'There is/are', vi: 'There is/are', id: 'There is/are', tr: 'There is/are', pl: 'There is/are' },
    phrasal_particle: { ru: 'Частицы', uk: 'Частки', es: 'Partículas', 'pt-BR': 'Partículas', vi: 'Tiểu từ', id: 'Partikel', tr: 'Parçacıklar', pl: 'Partykuły' },
    modifier: { ru: 'Modifiers', uk: 'Modifiers', es: 'Modificadores', 'pt-BR': 'Modificadores', vi: 'Từ bổ nghĩa', id: 'Modifier', tr: 'Niteleyiciler', pl: 'Modyfikatory' },
    determiner: { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes', 'pt-BR': 'Determinantes', vi: 'Từ hạn định', id: 'Determiner', tr: 'Belirleyiciler', pl: 'Określniki' },
    other: { ru: 'Другое', uk: 'Інше', es: 'Otros', 'pt-BR': 'Outros', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
};

function trainerCategoryLabel(category: string, lang: Lang): string {
    const copy = CATEGORY_LABELS_INLINE[category];
    if (!copy) return category;
    return triLang(lang, {
        ru: copy.ru,
        uk: copy.uk,
        es: copy.es,
        'pt-BR': copy['pt-BR'],
        vi: copy.vi,
        id: copy.id,
        tr: copy.tr,
        pl: copy.pl,
    });
}

/** Единое славянское правило множественного числа (ru/uk/pl): 1 — one, 2-4 — few, остальные — many. */
function pluralSlavic(n: number, one: string, few: string, many: string): string {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (last === 1 && abs !== 11) return one;
    if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) return few;
    return many;
}

/** «N ошибок ждут разбора» с честным склонением для каждого языка интерфейса. */
function errorsAwaitingText(total: number, lang: Lang): string {
    switch (lang) {
        case 'uk': return pluralSlavic(total, 'помилка чекає розбору', 'помилки чекають розбору', 'помилок чекають розбору');
        case 'es': return total === 1 ? 'error espera repaso' : 'errores esperan repaso';
        case 'pt-BR': return total === 1 ? 'erro espera revisão' : 'erros esperam revisão';
        case 'vi': return 'lỗi đang chờ phân tích';
        case 'id': return 'kesalahan menunggu dibahas';
        case 'tr': return 'hata inceleme bekliyor';
        case 'pl': return pluralSlavic(total, 'błąd czeka na analizę', 'błędy czekają na analizę', 'błędów czeka na analizę');
        default: return pluralSlavic(total, 'ошибка ждёт разбора', 'ошибки ждут разбора', 'ошибок ждут разбора');
    }
}

/** «доля ошибок за N дней» — подпись окна аналитики под слабым местом. */
function errorsShareWindowText(days: number, lang: Lang): string {
    switch (lang) {
        case 'uk': return `частка помилок за ${days} ${pluralSlavic(days, 'день', 'дні', 'днів')}`;
        case 'es': return `parte de los errores en ${days} días`;
        case 'pt-BR': return `parcela dos erros em ${days} dias`;
        case 'vi': return `tỷ lệ lỗi trong ${days} ngày`;
        case 'id': return `porsi kesalahan dalam ${days} hari`;
        case 'tr': return `son ${days} gündeki hata payı`;
        case 'pl': return `udział błędów w ciągu ${days} dni`;
        default: return `доля ошибок за ${days} ${pluralSlavic(days, 'день', 'дня', 'дней')}`;
    }
}

/** Компактная подпись минут для скраб-пузыря недельного графика («12 мин» / «1 ч 5 мин»). */
function practiceMinutesLabel(minutes: number, lang: Lang): string {
    const total = Math.max(0, Math.round(minutes));
    const minuteWord = triLang(lang, { ru: 'мин', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min' });
    if (total < 60) return `${total} ${minuteWord}`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    const hourWord = triLang(lang, { ru: 'ч', uk: 'год', es: 'h', 'pt-BR': 'h', vi: 'g', id: 'jam', tr: 'sa', pl: 'godz.' });
    return rest > 0 ? `${hours} ${hourWord} ${rest} ${minuteWord}` : `${hours} ${hourWord}`;
}

function resolvedDiagnosisIdSet(resolved: ResolvedPersonalTrainingsState | null): Set<string> {
    return new Set(Object.keys(resolved?.diagnoses ?? {}));
}
function chooseInlineDiagnosis(stat: WordCategoryStat, resolved: ResolvedPersonalTrainingsState | null): string | null {
    const words = new Set(stat.topWords.map((word) => word.trim().toLowerCase()).filter(Boolean));
    const has = (...candidates: string[]) => candidates.some((word) => words.has(word));
    const hasPart = (...parts: string[]) => [...words].some((word) => parts.some((part) => word.includes(part)));
    const candidates: Record<string, string[]> = {
        article: has('a', 'an') ? ['article_a_an'] : has('the') ? ['article_the_specific'] : ['article_zero', 'article_a_an'],
        preposition: has('for', 'since') ? ['preposition_duration_for_since'] : has('to', 'into', 'from', 'out of') ? ['preposition_direction_to_into_from'] : ['preposition_time_in_on_at', 'preposition_common_verb_patterns'],
        verb: has('am', 'is', 'are', 'be', 'been') ? ['to_be_present_agreement'] : has('was', 'were') ? ['verb_was_were'] : has('do', 'does', "don't", "doesn't", 'did') ? ['verb_present_simple_negative_question'] : hasPart('ing') ? ['verb_present_continuous_basic'] : ['verb_present_simple_statement', 'verb_third_person'],
        'to-be': ['to_be_present_agreement', 'verb_was_were'],
        noun: ['noun_singular_plural_basic'],
        pronoun: has('my', 'mine', 'your', 'yours', 'his', 'her', 'hers', 'our', 'ours', 'their', 'theirs') ? ['pronoun_possessive'] : ['pronoun_case'],
        adjective: ['adjective_comparison', 'adjective_vs_adverb'],
        adverb: ['adverb_frequency_position', 'adjective_vs_adverb'],
        modal: has('may', 'might') ? ['modal_may_might_probability'] : has('can', 'could') ? ['modal_can_could_ability_request'] : has('should', 'must') ? ['modal_should_must_have_to'] : ['modal_base_form'],
        modifier: has('very', 'really', 'quite') ? ['modifier_very_really_quite'] : ['too_enough'],
        syntax: ['word_order_basic_statement', 'word_order_basic_question'],
        conjunction: ['conjunction_logic'],
        determiner: has('this', 'that', 'these', 'those') ? ['determiner_this_that_these_those'] : ['quantifier_some_any'],
        existential: ['there_is_are'],
    };
    const routedId = choosePersonalTrainingCandidate(candidates[stat.category] ?? [], resolvedDiagnosisIdSet(resolved));
    return routedId && getDiagnosisTraining(routedId) ? routedId : null;
}

/**
 * «Слабое место» — главная слабая тема бесплатно и сразу: кольцо с долей
 * ошибок, название категории, окно аналитики и ghost-кнопка «Тренировать».
 * Если персональные тренировки доступны и для категории есть диагноз — ведёт
 * в /problem_coach, иначе — на полный экран аналитики.
 */
function WeakSpotCard({ stat, windowDays, lang, t, f, router, resolvedPersonalTrainings, personalTrainingEnabled = true, accent, softBg, ringTrack }: {
    stat: WordCategoryStat;
    windowDays: number;
    lang: Lang;
    t: ReturnType<typeof useTheme>['theme'];
    f: ReturnType<typeof useTheme>['f'];
    router: ReturnType<typeof useRouter>;
    resolvedPersonalTrainings: ResolvedPersonalTrainingsState | null;
    personalTrainingEnabled?: boolean;
    accent: string;
    softBg: string;
    ringTrack: string;
}) {
    const diagnosisId = personalTrainingEnabled ? chooseInlineDiagnosis(stat, resolvedPersonalTrainings) : null;
    const openWeakSpot = () => {
        hapticTap();
        if (diagnosisId) {
            router.push({
                pathname: '/problem_coach',
                params: { microDiagnosisId: diagnosisId, category: stat.category },
            } as any);
            return;
        }
        router.push('/phrase_analytics_screen' as any);
    };
    return (
      <TouchableOpacity accessibilityRole="button" onPress={openWeakSpot} activeOpacity={0.86} style={[styles.weakCard, { backgroundColor: t.bgCard }]}>
        <StatScoreRing
          progress={stat.pct}
          centerValue={`${stat.pct}%`}
          accent={accent}
          trackColor={ringTrack}
          size={58}
          strokeWidth={6}
          centerColor={t.textPrimary}
          subColor={t.textMuted}
          centerTextStyle={{ fontSize: 14, lineHeight: 17 }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
            {trainerCategoryLabel(stat.category, lang)}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption - 1, fontWeight: '600', marginTop: 2 }}>
            {errorsShareWindowText(windowDays, lang)}
          </Text>
        </View>
        <View style={[styles.ghostBtn, { backgroundColor: softBg }]}>
          <Text style={{ color: accent, fontSize: f.caption, fontWeight: '800' }}>
            {triLang(lang, {
              ru: 'Тренировать',
              uk: 'Тренувати',
              es: 'Entrenar',
              'pt-BR': 'Treinar',
              vi: 'Luyện ngay',
              id: 'Latih',
              tr: 'Çalış',
              pl: 'Trenuj',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
}

// Тихая ревалидация: dashboard/analytics/resolvedPersonalTrainings приходят как новые
// объектные ссылки на каждый фокус экрана, даже когда контент не изменился. Сравниваем
// по значению (JSON.stringify — объекты небольшие) перед setState, чтобы не перерисовывать
// экран и не мигать карточками аналитики без реальных изменений данных.
function jsonEqualQuiet<T>(a: T, b: T): boolean {
    if (a === b) return true;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch {
        return false;
    }
}
function TrainerScreenInner() {
    const router = useRouter();
    const { theme: t, f, themeMode } = useTheme();
    const isGoldTheme = themeMode === 'gold';
    const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
    const { lang } = useLang();
    const { studyTarget } = useStudyTarget();
    const sourceLocale = isStudyTargetSourceUiLang(lang) ? lang : 'ru';
    const prefetchedPractice = getCachedTrainerPracticeSnapshot(studyTarget, sourceLocale);
    const initialDataReadyRef = useRef(prefetchedPractice != null);
    const trainerSessionStartLockRef = useRef(false);
    const [dashboard, setDashboard] = useState<TrainerDashboard>(() => prefetchedPractice?.dashboard ?? EMPTY_TRAINER_DASHBOARD);
    const [initialDataReady, setInitialDataReady] = useState(() => initialDataReadyRef.current);
    const [loadError, setLoadError] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [hasPremium, setHasPremium] = useState(() => prefetchedPractice?.hasPremium ?? false);
    const [analytics, setAnalytics] = useState<PhraseAnalyticsResult | null>(() => prefetchedPractice?.analytics ?? null);
    const [resolvedPersonalTrainings, setResolvedPersonalTrainings] = useState<ResolvedPersonalTrainingsState | null>(() => prefetchedPractice?.resolvedPersonalTrainings ?? null);
    const [activityDays, setActivityDays] = useState(() => prefetchedPractice?.activityDays ?? []);
    const personalPracticeCoachEnabled = personalPracticeCoachEnabledForTarget(studyTarget);
    const trainerSessionEnabled = trainerSessionContentAvailableForTarget(studyTarget);
    const trainerGateCopy = frenchTrainerGateCopy(lang);
    const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
    const bouncyStyle = useBouncyStyle(bouncyStretch);
    const loadData = useCallback(async () => {
        try {
            const snapshot = await prefetchTrainerPracticeSnapshot({ studyTarget, sourceLocale, force: true });
            // Тихая ревалидация: snapshot.* приходит новыми ссылками на каждый фокус даже
            // когда содержимое не изменилось — сравниваем перед setState, чтобы не мигать
            // аналитикой/карточками на повторном фокусе экрана.
            setDashboard(prev => (jsonEqualQuiet(prev, snapshot.dashboard) ? prev : snapshot.dashboard));
            setHasPremium(snapshot.hasPremium);
            setAnalytics(prev => (jsonEqualQuiet(prev, snapshot.analytics) ? prev : snapshot.analytics));
            setResolvedPersonalTrainings(prev => (jsonEqualQuiet(prev, snapshot.resolvedPersonalTrainings) ? prev : snapshot.resolvedPersonalTrainings));
            setActivityDays(prev => (jsonEqualQuiet(prev, snapshot.activityDays) ? prev : snapshot.activityDays));
            initialDataReadyRef.current = true;
            setInitialDataReady(true);
            setLoadError(false);
        }
        catch {
            // Keep the previous dashboard on refresh failure so the scroll layout does not collapse.
            // Surface a retry affordance only when we never managed an initial load — otherwise the
            // stale-but-valid dashboard stays on screen and a transient refresh hiccup is invisible.
            setLoadError(prev => prev || !initialDataReadyRef.current);
        }
    }, [sourceLocale, studyTarget]);
    useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));
    const total = dashboard?.totalDue ?? 0;
    const practiceHallQueue = useMemo(() => selectPracticeHallQueue(dashboard), [dashboard]);
    const practiceHallRoute = useMemo(() => (practiceHallQueue ? routeForQueue(practiceHallQueue) : null), [practiceHallQueue]);
    const practiceHallDuration = useMemo(() => practiceHallDurationMinutes(total), [total]);
    // Единый акцент темы (тот же, что на экране статистики) — без премиум-жёлтого и мёртвых тем.
    const accent = statsThemeAccent(themeMode);
    const accentSoftBg = statsThemeSoftBg(themeMode, 'normal');
    const quietSoftBg = statsThemeSoftBg(themeMode, 'quiet');
    const shownAnalytics: PhraseAnalyticsResult = analytics ?? {
        categoryStats: [],
        lessonStats: [],
        topMistakePhrases: [],
        insights: [],
        totalMistakes: 0,
        windowDays: 30,
    };
    // Слабые места — до трёх категорий с максимальным приоритетом, бесплатно и без аккордеона.
    const weakSpotStats = useMemo(() => [...shownAnalytics.categoryStats]
        .sort((a, b) => (b.priorityScore ?? b.weaknessScore) - (a.priorityScore ?? a.weaknessScore))
        .slice(0, 3), [shownAnalytics.categoryStats]);
    const showWeakSpots = shownAnalytics.totalMistakes > 0 && weakSpotStats.length > 0;
    // Ритм недели: последние 7 наблюдаемых дней активности (future-плейсхолдеры не показываем).
    const weekBars = useMemo((): StatBar[] => {
        const days = activityDays.filter((day) => !day.future).slice(-7);
        if (days.length === 0) return [];
        const wdays = streakCalendarShortWeekdays(lang, false);
        const maxMinutes = Math.max(1, ...days.map((day) => day.minutes));
        return days.map((day, index) => {
            const date = new Date(`${day.date}T12:00:00`);
            return {
                key: day.date,
                ratio: day.minutes / maxMinutes,
                active: day.active,
                bottomLabel: wdays[date.getDay()] ?? '',
                highlight: index === days.length - 1,
                scrubLabel: practiceMinutesLabel(day.minutes, lang),
            };
        });
    }, [activityDays, lang]);
    // Разбивка очереди по типам: «арена» — это фразовые ошибки, поэтому показываем её вместе с фразами.
    const queueRows = useMemo(() => ([
        {
            key: 'phrases' as const,
            icon: 'chatbubbles' as const,
            count: (dashboard.due.phrases ?? 0) + (dashboard.due.arena ?? 0),
            route: '/trainer_phrases_session' as RoutePath,
            title: triLang(lang, { ru: 'Фразы', uk: 'Фрази', es: 'Frases', 'pt-BR': 'Frases', vi: 'Cụm từ', id: 'Frasa', tr: 'İfadeler', pl: 'Frazy' }),
            accessibility: triLang(lang, { ru: 'Начать практику фраз', uk: 'Почати практику фраз', es: 'Empezar práctica de frases', 'pt-BR': 'Começar prática de frases', vi: 'Bắt đầu luyện cụm từ', id: 'Mulai latihan frasa', tr: 'İfade pratiğine başla', pl: 'Rozpocznij praktykę fraz' }),
        },
        {
            key: 'words' as const,
            icon: 'library' as const,
            count: dashboard.due.words ?? 0,
            route: '/trainer_words_session' as RoutePath,
            title: triLang(lang, { ru: 'Слова', uk: 'Слова', es: 'Palabras', 'pt-BR': 'Palavras', vi: 'Từ vựng', id: 'Kata', tr: 'Kelimeler', pl: 'Słowa' }),
            accessibility: triLang(lang, { ru: 'Начать практику слов', uk: 'Почати практику слів', es: 'Empezar práctica de palabras', 'pt-BR': 'Começar prática de palavras', vi: 'Bắt đầu luyện từ vựng', id: 'Mulai latihan kata', tr: 'Kelime pratiğine başla', pl: 'Rozpocznij praktykę słów' }),
        },
    ]), [dashboard, lang]);
    const openTrainerSession = useCallback(async (route: RoutePath) => {
        await startReservedTrainerSession({
            route,
            router,
            studyTarget,
            premiumAccess: () => hasPremium ? Promise.resolve(true) : getVerifiedPremiumStatus(),
            lock: trainerSessionStartLockRef,
        });
    }, [hasPremium, router, studyTarget]);
    const startSmartMix = useCallback(async () => {
        hapticTap();
        if (total <= 0 || !practiceHallRoute)
            return;
        await openTrainerSession(practiceHallRoute);
    }, [openTrainerSession, practiceHallRoute, total]);
    const startQueueRow = useCallback(async (row: { count: number; route: RoutePath }) => {
        hapticTap();
        if (row.count <= 0)
            return;
        await openTrainerSession(row.route);
    }, [openTrainerSession]);
    const minuteWord = triLang(lang, { ru: 'мин', uk: 'хв', es: 'min', 'pt-BR': 'min', vi: 'phút', id: 'mnt', tr: 'dk', pl: 'min' });
    if (loadError && !initialDataReady) {
        return (<ScreenGradient>
          <SafeAreaView style={{ flex: 1 }} testID="screen-trainer-error">
            <ContentWrap>
              <View style={styles.headerRow}>
                <TapScale accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeRouterBack(router)} style={{ padding: 4, marginRight: 12 }}>
                  <Ionicons name="chevron-back" size={28} color={sx.primary}/>
                </TapScale>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.h2 }]}>
                    {triLang(lang, {
                      ru: 'Моя практика', uk: 'Моя практика', es: 'Mi práctica',
                      'pt-BR': 'Minha prática', vi: 'Luyện tập của tôi', id: 'Latihanku',
                      tr: 'Pratiğim', pl: 'Moja praktyka',
                    })}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
                <Ionicons name="cloud-offline-outline" size={48} color={t.textMuted}/>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, {
                    ru: 'Не удалось загрузить практику', uk: 'Не вдалося завантажити практику',
                    es: 'No se pudo cargar la práctica', 'pt-BR': 'Não foi possível carregar a prática',
                    vi: 'Không tải được phần luyện tập', id: 'Gagal memuat latihan',
                    tr: 'Pratik yüklenemedi', pl: 'Nie udało się wczytać praktyki',
                  })}
                </Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => { hapticTap(); void loadData(); }} style={{ backgroundColor: accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 }}>
                  <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
                    {triLang(lang, {
                      ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente',
                      vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </ContentWrap>
          </SafeAreaView>
        </ScreenGradient>);
    }
    return (<ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} testID="screen-trainer">
        <ContentWrap>
          <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
          <View style={styles.headerRow}>
            <TapScale accessibilityRole="button" accessibilityLabel="Back" onPress={() => safeRouterBack(router)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary}/>
            </TapScale>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.h2 }]}>
                {triLang(lang, {
            ru: 'Моя практика',
            uk: 'Моя практика',
            es: 'Mi práctica',
            'pt-BR': "Minha prática",
            vi: "Luyện tập của tôi",
            id: "Latihanku",
            tr: "Pratiğim",
            pl: "Moja praktyka",
        })}
              </Text>
            </View>
            <ReportErrorButton
              screen="trainer"
              dataId="trainer_dashboard"
              dataText={triLang(lang, {
                ru: 'Экран Моя практика',
                uk: 'Екран Моя практика',
                es: 'Pantalla Mi práctica',
                'pt-BR': 'Tela Minha prática',
                vi: 'Màn hình Luyện tập của tôi',
                id: 'Layar Latihanku',
                tr: 'Pratiğim ekranı',
                pl: 'Ekran Moja praktyka',
              })}
              variant="icon-flag"
              accessibilityLabel="Сообщить о баге на экране практики"
              style={[
                { width: 38, height: 38, borderRadius: 19, backgroundColor: t.bgCard },
              ]}
            />
          </View>

          <BouncyWrap>
          <ScrollView decelerationRate="normal" bounces alwaysBounceVertical overScrollMode="always" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 30 }} showsVerticalScrollIndicator={false} onScroll={onBouncyScroll} scrollEventThrottle={16}>
            {!trainerSessionEnabled && (<View style={[styles.card, { backgroundColor: t.bgCard, borderWidth: 0, borderRadius: 18 }]}>
                <View style={styles.queueIcon}>
                  <Ionicons name="lock-closed-outline" size={22} color={isGoldTheme ? GOLD_RICH.metalGold : t.textMuted}/>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                    {trainerGateCopy.title}
                  </Text>
                  <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
                    {trainerGateCopy.body}
                  </Text>
                </View>
              </View>)}

            {/* Hero старта: сколько ошибок собрано на сегодня и одна большая кнопка. */}
            <Reanimated.View entering={FadeInDown.delay(40).duration(320)} style={[styles.hero, { backgroundColor: t.bgCard, borderWidth: 0 }]}>
              <LinearGradient colors={total > 0 ? [`${accent}42`, t.bgCard, t.bgCard] : [t.bgSurface, t.bgCard]} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFillObject} />
              <View style={[styles.heroGlow, { backgroundColor: `${accent}18` }]} />
              <Text style={[styles.heroTag, { color: t.textMuted, fontSize: f.label }]}>
                {triLang(lang, { ru: 'На сегодня собрано', uk: 'На сьогодні зібрано', es: 'Recopilados hoy', 'pt-BR': 'Coletados hoje', vi: 'Đã gom hôm nay', id: 'Terkumpul hari ini', tr: 'Bugün toplandı', pl: 'Zebrane na dziś' })}
              </Text>
              {total > 0 ? (<>
                <View style={styles.heroBigRow}>
                  <Text style={[styles.heroBig, { color: t.textPrimary, fontSize: Math.round(f.numLg * 1.6), lineHeight: Math.round(f.numLg * 1.6) + 4 }]}>{total}</Text>
                  <Text style={[styles.heroBigSpan, { color: t.textMuted, fontSize: f.body }]}>{errorsAwaitingText(total, lang)}</Text>
                </View>
                <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
                  {triLang(lang, { ru: 'из ваших ответов в уроках и карточках', uk: 'з ваших відповідей на уроках і в картках', es: 'de tus respuestas en lecciones y tarjetas', 'pt-BR': 'das suas respostas em lições e cartões', vi: 'từ câu trả lời của bạn trong bài học và thẻ', id: 'dari jawabanmu di pelajaran dan kartu', tr: 'derslerdeki ve kartlardaki cevaplarından', pl: 'z twoich odpowiedzi w lekcjach i fiszkach' })}
                </Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Начать практику ошибок', uk: 'Почати практику помилок', es: 'Empezar práctica de errores', 'pt-BR': 'Iniciar prática de erros', vi: 'Bắt đầu luyện lỗi', id: 'Mulai latihan kesalahan', tr: 'Hata pratiğine başla', pl: 'Rozpocznij praktykę błędów' })} onPress={() => { if (trainerSessionEnabled) void startSmartMix(); }} disabled={!trainerSessionEnabled} style={[styles.primaryBtn, { backgroundColor: trainerSessionEnabled ? accent : t.bgSurface }]}>
                  <Text style={{ color: trainerSessionEnabled ? t.correctText : t.textMuted, fontSize: f.bodyLg, fontWeight: '900' }}>{triLang(lang, { ru: 'Начать практику', uk: 'Почати практику', es: 'Empezar práctica', 'pt-BR': 'Começar prática', vi: 'Bắt đầu luyện tập', id: 'Mulai latihan', tr: 'Pratiğe başla', pl: 'Rozpocznij praktykę' })}{` · ${practiceHallDuration} ${minuteWord}`}</Text>
                  <Ionicons name="arrow-forward" size={19} color={trainerSessionEnabled ? t.correctText : t.textMuted} />
                </TouchableOpacity>
              </>) : (<>
                <Text style={[styles.heroBig, { color: t.textPrimary, fontSize: f.h1, marginTop: 10 }]}>
                  {triLang(lang, { ru: 'Ошибки под контролем', uk: 'Помилки під контролем', es: 'Errores bajo control', 'pt-BR': 'Erros sob controle', vi: 'Lỗi đã được kiểm soát', id: 'Kesalahan terkendali', tr: 'Hatalar kontrol altında', pl: 'Błędy pod kontrolą' })}
                </Text>
                <Text style={[styles.cardSub, { color: t.textMuted, fontSize: f.caption }]}>
                  {triLang(lang, { ru: 'Сейчас в очереди нет ошибок — новые появятся здесь после уроков и карточек.', uk: 'Зараз у черзі немає помилок — нові з’являться тут після уроків і карток.', es: 'Ahora no hay errores en la cola: los nuevos aparecerán aquí después de las lecciones y tarjetas.', 'pt-BR': 'Não há erros na fila agora — novos aparecerão aqui depois das lições e cartões.', vi: 'Hiện không có lỗi nào trong hàng đợi — lỗi mới sẽ xuất hiện ở đây sau bài học và thẻ.', id: 'Saat ini tidak ada kesalahan di antrean — kesalahan baru akan muncul di sini setelah pelajaran dan kartu.', tr: 'Şu anda kuyrukta hata yok — yenileri derslerden ve kartlardan sonra burada görünecek.', pl: 'W kolejce nie ma teraz błędów — nowe pojawią się tutaj po lekcjach i fiszkach.' })}
                </Text>
              </>)}
            </Reanimated.View>

            {/* Из чего состоит практика: тап по строке запускает сессию только этого типа. */}
            <Reanimated.View entering={FadeInDown.delay(110).duration(320)} style={{ gap: 8 }}>
              {queueRows.map((row) => (
                <TouchableOpacity key={row.key} accessibilityRole="button" accessibilityLabel={row.accessibility} onPress={() => { void startQueueRow(row); }} activeOpacity={0.86} style={[styles.queueRow, { backgroundColor: quietSoftBg }]}>
                  <View style={[styles.queueIcon, { backgroundColor: accentSoftBg }]}>
                    <Ionicons name={row.icon} size={18} color={accent}/>
                  </View>
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{row.title}</Text>
                  <Text style={{ color: row.count > 0 ? accent : t.textMuted, fontSize: f.bodyLg, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{row.count}</Text>
                </TouchableOpacity>
              ))}
            </Reanimated.View>

            {/* Слабые места — бесплатно и сразу, без премиум-стены. */}
            {showWeakSpots ? (
              <Reanimated.View entering={FadeInDown.delay(180).duration(320)} style={{ gap: 8 }}>
                <Text style={[styles.weakLabel, { color: t.textGhost, fontSize: f.label - 1 }]}>
                  {weakSpotStats.length > 1
                    ? triLang(lang, { ru: 'Слабые места', uk: 'Слабкі місця', es: 'Puntos débiles', 'pt-BR': 'Pontos fracos', vi: 'Các điểm yếu', id: 'Titik-titik lemah', tr: 'Zayıf noktalar', pl: 'Słabe punkty' })
                    : triLang(lang, { ru: 'Слабое место', uk: 'Слабке місце', es: 'Punto débil', 'pt-BR': 'Ponto fraco', vi: 'Điểm yếu', id: 'Titik lemah', tr: 'Zayıf nokta', pl: 'Słaby punkt' })}
                </Text>
                {weakSpotStats.map((stat) => (
                  <WeakSpotCard
                    key={stat.category}
                    stat={stat}
                    windowDays={shownAnalytics.windowDays}
                    lang={lang}
                    t={t}
                    f={f}
                    router={router}
                    resolvedPersonalTrainings={resolvedPersonalTrainings}
                    personalTrainingEnabled={personalPracticeCoachEnabled}
                    accent={accent}
                    softBg={accentSoftBg}
                    ringTrack={quietSoftBg}
                  />
                ))}
              </Reanimated.View>
            ) : null}

            {/* Ритм недели: значения только по зажатию (scrub), как на экране статистики. */}
            {weekBars.length > 0 ? (
              <Reanimated.View entering={FadeInDown.delay(250).duration(320)} style={[styles.rhythmCard, { backgroundColor: t.bgCard, borderWidth: 0 }]}>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Практика по дням · зажмите график для значений', uk: 'Практика по днях · затисніть графік для значень', es: 'Práctica por días · mantén el gráfico para ver valores', 'pt-BR': 'Prática por dia · segure o gráfico para ver valores', vi: 'Luyện tập theo ngày · giữ biểu đồ để xem giá trị', id: 'Latihan per hari · tahan grafik untuk nilai', tr: 'Günlere göre pratik · değerler için grafiği basılı tut', pl: 'Praktyka po dniach · przytrzymaj wykres, by zobaczyć wartości' })}
                </Text>
                <StatBars
                  bars={weekBars}
                  accent={accent}
                  accentSoft={`${accent}CC`}
                  inactiveColor={quietSoftBg}
                  todayDotColor={accent}
                  height={80}
                  topLabelColor={t.textPrimary}
                  topLabelMutedColor={t.textGhost}
                  bottomLabelColor={t.textPrimary}
                  bottomLabelMutedColor={t.textMuted}
                  scrubEnabled
                  scrubHighlightColor={accent}
                  scrubBubbleBg={t.bgCard}
                  scrubBubbleBorder={isGoldTheme ? GOLD_RICH.hairlineQuiet : statsHairline(themeMode, 'practiceBalance')}
                  scrubValueColor={accent}
                  scrubCaptionColor={t.textMuted}
                />
              </Reanimated.View>
            ) : null}

            {ENABLE_DEV_TOOLS && (<View style={[styles.devPanel, { backgroundColor: t.bgCard, borderColor: 'transparent', borderRadius: 14 }]}>
                <Text style={{ color: accent, fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 }}>
                  DEV TOOLS
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={async () => {
                setSeeding(true);
                await devSeedTrainer(studyTarget);
                await loadData();
                setSeeding(false);
            }} testID="trainer-dev-seed" style={[styles.devBtn, { backgroundColor: accentSoftBg, borderColor: 'transparent', borderRadius: 12, flex: 1 }]}>
                    <Text style={{ color: accent, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      {seeding ? 'Seeding...' : 'Random seed'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => {
                await clearTrainerStore(studyTarget);
                await loadData();
            }} testID="trainer-dev-clear" style={[styles.devBtn, { backgroundColor: quietSoftBg, borderColor: 'transparent', borderRadius: 12 }]}>
                    <Ionicons name="trash" size={16} color={t.textMuted}/>
                  </TouchableOpacity>
                </View>
              </View>)}
            </ScrollView>
          </BouncyWrap>
          </Reanimated.View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>);
}

export default function TrainerScreen() {
    return (
      <ErrorBoundary>
        <TrainerScreenInner />
      </ErrorBoundary>
    );
}
const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    headerTitle: { fontWeight: '900' },
    hero: {
        borderRadius: 22,
        padding: 16,
        overflow: 'hidden',
    },
    heroGlow: { position: 'absolute', width: 210, height: 210, right: -92, top: -128, borderRadius: 105 },
    heroTag: { fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
    heroBigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
    heroBig: { fontWeight: '900', letterSpacing: -2 },
    heroBigSpan: { fontWeight: '700', flexShrink: 1 },
    primaryBtn: {
        minHeight: 52,
        borderRadius: 14,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    queueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 16,
    },
    queueIcon: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weakCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        borderRadius: 18,
        padding: 14,
    },
    weakLabel: { fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    ghostBtn: {
        height: 40,
        paddingHorizontal: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    rhythmCard: {
        borderRadius: 18,
        padding: 14,
        gap: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    cardTitle: { fontWeight: '900' },
    cardSub: { lineHeight: 18, marginTop: 3 },
    devPanel: {
        borderRadius: 14,
        borderWidth: 0,
        padding: 12,
        marginTop: 8,
    },
    devBtn: {
        borderRadius: 10,
        borderWidth: 0,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
