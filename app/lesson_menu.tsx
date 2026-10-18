import React, { useEffect, useState, useCallback, useRef } from 'react';
import Reanimated from 'react-native-reanimated';
import TapScale from '../components/TapScale';
import { isLightThemeMode } from '../constants/theme';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet, InteractionManager, Animated } from 'react-native';
import { LinearGradient } from '../components/SafeLinearGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import {
  LessonMenuHeader,
  LessonMenuRoundButton,
  LessonMenuRow,
  LessonMenuSummary,
  LessonMenuTip,
} from '../components/lessons/LessonMenuGlass';
import { V2 } from '../constants/v2Style';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import EnergyBar from '../components/EnergyBar';
import { useEnergy } from '../components/EnergyContext';
import PremiumCard from '../components/PremiumCard';
import { useStudyTarget } from '../components/StudyTargetContext';
import { theoryEntryFor, triLang } from '../constants/i18n';
import { noAndroidOutline } from '../constants/androidGlow';
import { hapticTap } from '../hooks/use-haptics';
import fk from './feedback/feedback_kit';
// зачем (холодный старт 04.10): счётчик и ключи слов — по запросу урока, а не таблицами при импорте.
import { LESSONS_WITH_WORDS, lessonWordCount, lessonWordKeys } from './lesson_words';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { LESSONS_WITH_IRREGULAR_VERBS, IRREGULAR_VERB_COUNT_BY_LESSON, IRREGULAR_VERBS_BY_LESSON } from './irregular_verbs_data';
import { getLessonPrepositionPack, hasLessonPrepositionDrillForTarget } from './lesson_prepositions';
import CircularProgress from '../components/CircularProgress';
import {
  isLessonUnlockedByEarnedProgress,
  getLessonLockInfo,
  // getLockMessageText больше не нужен: его читал удалённый модал блокировки
  // этого экрана. Причину замка теперь называет модал в списке уроков.
  isLessonUnlockedByPremiumCourse,
  isLessonUnlocked,
} from './lesson_lock_system';
import { effectiveLessonStarScore } from './lesson_star_score';
import { perfScreenMount } from './perf-monitor';
import { GlassAlertDialog } from '../components/v2/GlassAlertDialog';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { peekLessonGateDecision } from './lesson_premium_gate';
import { isLessonFinishedOnce } from './mastery';
import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from './premium_guard';
import { isAlwaysOpenLesson } from './main_course_access';
import {
  lessonPaywallContext,
  requiresPremiumForLesson,
} from './monetization_policy';
import { lessonStarCountFromPercent, previousLessonScoreOpensNext } from './lesson_star_scale';
import { lessonPurchaseContinuationParams } from './paywall_lesson_continuation';
// getPreviousCourseLevel больше не нужен: его читала удалённая заглушка «Ещё рано».
import { getCourseLevelForLesson } from './course_levels';
import { getLessonScreenPrimed, primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import GoldBevel from '../components/GoldBevel';
import { lessonCefrLabelForStudyTarget, lessonNamesForStudyTarget } from './lesson_titles_for_study_target';
import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate';
import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate';
import { isInteractiveTheoryLesson } from './theory_topic_accents';
import {
  countCompletedTheoryDrills,
  parseTheorySeenProgress,
  theoryOverallProgressPct,
} from './theory_progress';
import {
  lastOpenedLessonKey,
  irregularVerbsGlobalKey,
  lessonBestScoreKey,
  lessonPrepositionProgressKey,
  lessonProgressKey,
  lessonTheorySectionsSeenKey,
  lessonWordsKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { recordHomeContinueLegacy } from './home_continue_mark';
import { DebugLogger } from './debug-logger';
import LessonMenuGateSkeleton from '../components/lessons/LessonMenuGateSkeleton'; // зачем (координатор 13.10): скелет вместо пустого первого кадра, пока идёт fail-closed проверка доступа
import { captureAccountGeneration } from './account_generation'; // зачем: stableId в ключ подтверждения доступа (Ревизор 7d564d137)
import { navOnce } from './nav_once'; // зачем (аудит Optimistic UI Уроков, 13.10): двойной тап по «Начать/Продолжить» открывал два урока
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { useLineScale } from '../hooks/useLineScale';

type LessonMenuCache = {
  score: number;
  scoreKnown: boolean;
  progress: number;
  progressArr: string[];
  wordsLearned: number;
  irregularLearned: number;
  prepositionAnswered: number;
  prepositionTotal: number;
  theoryProgressPct: number;
};

const lessonMenuCacheById: Record<string, LessonMenuCache> = {};
const LESSON_MENU_PREP_HINT_SEEN_KEY = 'lesson_menu_prep_hint_seen_v1';

// зачем: владелец жаловался на «прыжки» при входе в урок — подсказка про Словарь/Теорию
// прилетала в поток после async getItem и сдвигала плитки под собой. Флаг «уже видел»
// кэшируется в модуле: после первого чтения он доступен СИНХРОННО, поэтому на первом
// кадре подсказка либо уже есть, либо её нет вовсе — геометрия не меняется.
let prepHintSeenCache: boolean | null = null;

function peekPrepHintSeen(): boolean | null {
  return prepHintSeenCache;
}

function rememberPrepHintSeen(seen: boolean): void {
  prepHintSeenCache = seen;
}

function lessonMenuCacheKey(lessonId: number, studyTarget?: RuntimeStudyTarget): string {
  return `${storageStudyTarget(studyTarget)}:${lessonId}`;
}

const emptyProgress = () => new Array(50).fill('empty');

/** D36/D121: 1★ below 60%, 2★ from 60–84%, 3★ from 85% — one shared scale. */
export function lessonMenuStarCountFromPercent(scorePercent: number): 0 | 1 | 2 | 3 {
  // зачем (D121): порог открытия урока и 2★ обязаны быть одним числом — берём шкалу из общего модуля.
  return lessonStarCountFromPercent(scorePercent);
}

/** Project the canonical persisted 0…5 lesson score through the D36 percent scale. */
export function lessonMenuStarCount(score: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(score) || score < 0 || score > 5) return 0;
  return lessonMenuStarCountFromPercent(score * 20);
}

function parseStoredLessonScore(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 5 ? parsed : null;
}

function countAnsweredProgress(progressArr: string[]): number {
  return progressArr.filter(x => x === 'correct' || x === 'replay_correct' || x === 'wrong').length;
}

// Тихая ревалидация: строковые массивы (progressArr) и плоские объекты (lockInfo)
// приходят из AsyncStorage новыми ссылками при каждом фокусе, даже если контент не
// изменился, — это лишний ре-рендер. Сравниваем перед setState.
function stringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function shallowObjectsEqual<T extends Record<string, unknown>>(a: T | null, b: T | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => a[k] === b[k]);
}

function freshestProgressRaw(
  lessonId: number,
  progressRaw: string | null,
  studyTarget?: RuntimeStudyTarget,
): string | null {
  const primed = getLessonScreenPrimed(lessonId, studyTarget)?.progress;
  if (!primed || primed.length === 0) return progressRaw;
  if (!progressRaw) return JSON.stringify(primed);
  try {
    const saved = JSON.parse(progressRaw) as unknown;
    if (!Array.isArray(saved)) return JSON.stringify(primed);
    return countAnsweredProgress(primed) >= countAnsweredProgress(saved as string[])
      ? JSON.stringify(primed)
      : progressRaw;
  } catch {
    return JSON.stringify(primed);
  }
}

function parseProgress(
  progressRaw: string | null,
  bestScoreRaw?: string | null,
): Pick<LessonMenuCache, 'score' | 'scoreKnown' | 'progress' | 'progressArr'> {
  const storedScore = parseStoredLessonScore(bestScoreRaw);
  try {
    if (progressRaw) {
      const progressArr: string[] = JSON.parse(progressRaw);
      const denominator = Math.min(progressArr.length, 50);
      const { score, correctCount } = effectiveLessonStarScore(bestScoreRaw, progressRaw);
      return {
        score,
        scoreKnown: storedScore !== null || countAnsweredProgress(progressArr) > 0,
        progress: Math.min(correctCount, denominator),
        progressArr: progressArr.length === 50 ? progressArr : emptyProgress(),
      };
    }
  } catch (e) {
      // keep defaults
      DebugLogger.error('lesson_menu:denominator', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  return {
    score: storedScore ?? 0,
    scoreKnown: storedScore !== null,
    progress: 0,
    progressArr: emptyProgress(),
  };
}

function parseWordsLearned(lessonId: number, wordsRaw: string | null): number {
  try {
    if (!wordsRaw) return 0;
    const counts: Record<string, number> = JSON.parse(wordsRaw);
    const validKeys = lessonWordKeys(lessonId);
    return validKeys
      ? Object.entries(counts).filter(([k, c]) => c >= 3 && validKeys.has(k)).length
      : Object.values(counts).filter(c => c >= 3).length;
  } catch {
    return 0;
  }
}

function parseIrregularLearned(lessonId: number, irregularRaw: string | null): number {
  if (!LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) return 0;
  try {
    const counts: Record<string, number> = irregularRaw ? JSON.parse(irregularRaw) : {};
    const lessonVerbs = IRREGULAR_VERBS_BY_LESSON[lessonId] ?? [];
    return lessonVerbs.filter(v => (counts[v.base] ?? 0) >= 3).length;
  } catch {
    return 0;
  }
}

function parsePrepositionAnswered(
  lessonId: number,
  raw: string | null,
  studyTarget?: RuntimeStudyTarget,
): { answered: number; total: number } {
  const pack = getLessonPrepositionPack(lessonId, studyTarget);
  const total = pack?.items.length ?? 0;
  if (!pack || total === 0) return { answered: 0, total: 0 };
  try {
    const saved = raw ? JSON.parse(raw) : null;
    const validIds = new Set(pack.items.map(item => item.id));
    const answeredIds: string[] = Array.isArray(saved?.answeredIds) ? saved.answeredIds : [];
    const answered = answeredIds.filter(id => validIds.has(id)).length;
    return { answered: Math.min(answered, total), total };
  } catch {
    return { answered: 0, total };
  }
}

function parseTheoryMenuProgress(progressRaw: string | null): number {
  const seenProgress = parseTheorySeenProgress(progressRaw);
  if (seenProgress.total > 0 || seenProgress.drillTotal > 0) {
    return theoryOverallProgressPct(
      seenProgress.seen.length,
      seenProgress.total,
      countCompletedTheoryDrills(seenProgress.drills),
      seenProgress.drillTotal,
    );
  }
  return 0;
}

export async function prefetchLessonMenuCache(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const id = Math.max(1, Math.floor(lessonId || 1));
  try {
    const progressKey = lessonProgressKey(id, studyTarget);
    const bestScoreKey = lessonBestScoreKey(id, studyTarget);
    const wordsKey = lessonWordsKey(id, studyTarget);
    const irregularKey = irregularVerbsGlobalKey(studyTarget);
    const prepositionProgressKey = lessonPrepositionProgressKey(id, studyTarget);
    const theorySectionsKey = lessonTheorySectionsSeenKey(id, studyTarget);
    const entries = await AsyncStorage.multiGet([
      progressKey,
      bestScoreKey,
      wordsKey,
      irregularKey,
      prepositionProgressKey,
      theorySectionsKey,
    ]);
    const map = Object.fromEntries(entries) as Record<string, string | null>;
    const prep = parsePrepositionAnswered(id, map[prepositionProgressKey] ?? null, studyTarget);
    lessonMenuCacheById[lessonMenuCacheKey(id, studyTarget)] = {
      ...parseProgress(freshestProgressRaw(id, map[progressKey] ?? null, studyTarget), map[bestScoreKey] ?? null),
      wordsLearned: parseWordsLearned(id, map[wordsKey] ?? null),
      irregularLearned: parseIrregularLearned(id, map[irregularKey] ?? null),
      prepositionAnswered: prep.answered,
      prepositionTotal: prep.total,
      theoryProgressPct: parseTheoryMenuProgress(map[theorySectionsKey] ?? null),
    };
  } catch (e) {
      // prefetch should never block navigation
      DebugLogger.error('lesson_menu:prep', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// зачем (PM-086, владелец 2026-09-24): ENERGY_COST_MENU_ITEMS удалён — жил
// только ради гейта показа ценника энергии на пунктах меню, который убрали.

/** Предохранитель цикла lesson1 ↔ lesson_menu: не больше одного bounce на id урока за это окно (🔴 Моменты 15.10). */
export const LESSON_LOCK_BOUNCE_FUSE_MS = 5000;
const lessonLockBounceAt = new Map<number, number>();
/** Тосты запертого урока по причине замка, 9 языков (ключи рядом с местом использования — единственный потребитель). */
const LESSON_LOCK_TOAST = {
  progress: {
    ru: 'Этот урок ещё закрыт — сначала пройди предыдущий', uk: 'Цей урок ще закритий — спершу пройди попередній', en: 'This lesson is still locked — finish the previous one first',
    es: 'Esta lección aún está bloqueada: termina primero la anterior', 'pt-BR': 'Esta lição ainda está bloqueada — termine a anterior primeiro', vi: 'Bài này chưa mở — hãy hoàn thành bài trước',
    id: 'Pelajaran ini masih terkunci — selesaikan yang sebelumnya dulu', tr: 'Bu ders hâlâ kilitli — önce öncekini bitir', pl: 'Ta lekcja jest jeszcze zablokowana — najpierw skończ poprzednią',
  },
  threshold: {
    ru: 'Чтобы открыть урок, улучши результат в предыдущем', uk: 'Щоб відкрити урок, покращ результат у попередньому', en: 'To unlock this lesson, improve your score in the previous one',
    es: 'Para abrir esta lección, mejora tu resultado en la anterior', 'pt-BR': 'Para abrir esta lição, melhore seu resultado na anterior', vi: 'Để mở bài này, hãy cải thiện kết quả bài trước',
    id: 'Untuk membuka pelajaran ini, tingkatkan nilaimu di pelajaran sebelumnya', tr: 'Bu dersi açmak için önceki dersteki sonucunu yükselt', pl: 'Aby odblokować tę lekcję, popraw wynik w poprzedniej',
  },
  level: {
    ru: 'Сначала сдай экзамен предыдущего уровня', uk: 'Спершу склади іспит попереднього рівня', en: 'Pass the previous level’s exam first',
    es: 'Primero aprueba el examen del nivel anterior', 'pt-BR': 'Primeiro passe na prova do nível anterior', vi: 'Hãy vượt qua bài kiểm tra của cấp trước',
    id: 'Lulus ujian level sebelumnya dulu', tr: 'Önce bir önceki seviyenin sınavını geç', pl: 'Najpierw zdaj egzamin poprzedniego poziomu',
  },
  premium: {
    ru: 'Этот урок доступен с Plus', uk: 'Цей урок доступний з Plus', en: 'This lesson is available with Plus',
    es: 'Esta lección está disponible con Plus', 'pt-BR': 'Esta lição está disponível com o Plus', vi: 'Bài này có trong gói Plus',
    id: 'Pelajaran ini tersedia dengan Plus', tr: 'Bu ders Plus ile açılır', pl: 'Ta lekcja jest dostępna w Plus',
  },
} as const;

function LessonMenu() {
  const lh = useLineScale();
  useEffect(() => { perfScreenMount('lesson_menu'); }, []);
  const router = useRouter();
  const { theme:t, f, themeMode, liquidGlassThemeId } = useTheme();
  const lessonMenuGlass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  // зачем: стаб isLightTheme=false оставлял sagePorcelain средне-насыщенные
  // CEFR-тона (~2:1 на фарфоре); светлая ветка теперь живая, тона — тёмные sage.
  const isLightTheme = isLightThemeMode(themeMode);
  const isGoldTheme = themeMode === 'gold';
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { energy, bonusEnergy, isUnlimited: menuEnergyUnlimited, energyReady: menuEnergyReady } = useEnergy();
  const {
    id: idParam,
    planTask: planTaskParam,
    lessonShellMode: lessonShellModeParam,
    planPracticeMode: planPracticeModeParam,
    requiredPhrases: requiredPhrasesParam,
    requiredPhraseIds: requiredPhraseIdsParam,
    planTaskId: planTaskIdParam,
    planInstanceId: planInstanceIdParam,
    planId: planIdParam,
    planDayIndex: planDayIndexParam,
  } = useLocalSearchParams<{
    id?: string | string[];
    planTask?: string | string[];
    lessonShellMode?: string | string[];
    planPracticeMode?: string | string[];
    requiredPhrases?: string | string[];
    requiredPhraseIds?: string | string[];
    planTaskId?: string | string[];
    planInstanceId?: string | string[];
    planId?: string | string[];
    planDayIndex?: string | string[];
  }>();
  const id = (Array.isArray(idParam) ? idParam[0] : idParam) || '1';
  const planTask = (Array.isArray(planTaskParam) ? planTaskParam[0] : planTaskParam) === '1';
  const lessonShellMode = Array.isArray(lessonShellModeParam) ? lessonShellModeParam[0] : lessonShellModeParam;
  const planPracticeMode = Array.isArray(planPracticeModeParam) ? planPracticeModeParam[0] : planPracticeModeParam;
  const requiredPhrasesRaw = Array.isArray(requiredPhrasesParam) ? requiredPhrasesParam[0] : requiredPhrasesParam;
  const requiredPhraseIdsRaw = Array.isArray(requiredPhraseIdsParam) ? requiredPhraseIdsParam[0] : requiredPhraseIdsParam;
  const planTaskId = Array.isArray(planTaskIdParam) ? planTaskIdParam[0] : planTaskIdParam;
  const planInstanceId = Array.isArray(planInstanceIdParam) ? planInstanceIdParam[0] : planInstanceIdParam;
  const planId = Array.isArray(planIdParam) ? planIdParam[0] : planIdParam;
  const planDayIndex = Array.isArray(planDayIndexParam) ? planDayIndexParam[0] : planDayIndexParam;
  const requiredPhrases = Math.max(1, Math.min(50, parseInt(requiredPhrasesRaw ?? '0', 10) || 0));
  const planLessonParams = planTask && requiredPhrases > 0
    ? {
        planTask: '1',
        ...(lessonShellMode ? { lessonShellMode } : {}),
        ...(planPracticeMode ? { planPracticeMode } : {}),
        requiredPhrases: String(requiredPhrases),
        ...(requiredPhraseIdsRaw ? { requiredPhraseIds: requiredPhraseIdsRaw } : {}),
        ...(planTaskId ? { planTaskId } : {}),
        ...(planInstanceId ? { planInstanceId } : {}),
        ...(planId ? { planId } : {}),
        ...(planDayIndex ? { planDayIndex } : {}),
      }
    : {};
  const lessonId = parseInt(id, 10) || 1;

  const lessonNames = lessonNamesForStudyTarget(lang, studyTarget);
  const defaultLessonTitle = triLang(lang, {
  ru: `Урок\u00A0${lessonId}`,
  uk: `Урок\u00A0${lessonId}`,
  es: `Lección\u00A0${lessonId}`,
  en: `Lesson\u00A0${lessonId}`,
  "pt-BR": `Lição ${lessonId}`,
  vi: `Bài\u00A0${lessonId}`,
  id: `Pelajaran\u00A0${lessonId}`,
  tr: `Ders\u00A0${lessonId}`,
  pl: `Lekcja\u00A0${lessonId}`,
});
  const lessonName = lessonNames[lessonId - 1] || defaultLessonTitle;
  const lessonCefrLabel = lessonCefrLabelForStudyTarget(lessonId, studyTarget);
  const cachedMenu = lessonMenuCacheById[lessonMenuCacheKey(lessonId, studyTarget)];
  const frenchAuxiliarySourceGated = storageStudyTarget(studyTarget) === 'fr';
  const frenchLessonSourceGated = !frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId);
  const frenchTheorySourceGated = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId);
  const targetHasPrepositionDrill = hasLessonPrepositionDrillForTarget(lessonId, studyTarget);
  const englishHasPrepositionDrill = hasLessonPrepositionDrillForTarget(lessonId, 'en');
  const prepositionSourceGated = frenchAuxiliarySourceGated && englishHasPrepositionDrill && !targetHasPrepositionDrill;

  const [score,setScore] = useState(cachedMenu?.score ?? 0);
  const [scoreKnown, setScoreKnown] = useState(cachedMenu?.scoreKnown ?? false);
  const [progress,setProgress] = useState(cachedMenu?.progress ?? 0);
  const [, setProgressArr] = useState<string[]>(cachedMenu?.progressArr ?? emptyProgress());
  const [wordsLearned, setWordsLearned] = useState(cachedMenu?.wordsLearned ?? 0);
  const [irregularLearned, setIrregularLearned] = useState(cachedMenu?.irregularLearned ?? 0);
  const [prepositionAnswered, setPrepositionAnswered] = useState(cachedMenu?.prepositionAnswered ?? 0);
  const [prepositionTotal, setPrepositionTotal] = useState(cachedMenu?.prepositionTotal ?? 0);
  // Кольцо теории отражает открытые разделы и выполненные задания.
  const [theoryProgressPct, setTheoryProgressPct] = useState(cachedMenu?.theoryProgressPct ?? 0);
  const [dataLoaded, setDataLoaded] = useState(Boolean(cachedMenu));
  const [soonOpen, setSoonOpen] = useState<null | 'frenchLesson' | 'frenchTheory' | 'vocab' | 'verbs' | 'prepositions'>(null);

  // Состояние блокировки урока
  const [isLessonLocked, setIsLessonLocked] = useState(true);
  const [lockStateLoaded, setLockStateLoaded] = useState(false);
  // зачем (R58 #26): тихая перепроверка доступа на возврате фокуса — экран не мигает скелетом, но запуск закрыт, пока проверка не закончилась
  const [lockRevalidating, setLockRevalidating] = useState(false);
  const lockConfirmedKeyRef = useRef<string | null>(null);
  const lockGenerationRef = useRef(0);
  // зачем (координатор 13.10): сколько мс длится проверка доступа, пока на экране скелет, и чем она кончилась. Только журнал: решения гейта это не касается.
  const lockCheckStartedAtRef = useRef(Date.now());
  const [lockReason, setLockReason] = useState<'premium' | 'level' | 'progress'>('progress');
  const [lockInfo, setLockInfo] = useState<Awaited<ReturnType<typeof getLessonLockInfo>> | null>(null);
  // showLockModal удалён вместе со своим модалом: при закрытом уроке этот экран
  // больше не рисуется, показывать поверх него было нечего.
  const lessonLaunchBlocked = !lockStateLoaded || isLessonLocked || lockRevalidating;
  // Гард: премиум-пейвол открываем один раз, чтобы не зациклить редирект.
  const premiumPaywallDispatchedRef = useRef(false);

  // Премиум-урок: вместо промежуточной «заглушки про Premium» сразу открываем пейвол.
  // Сюда сходятся все in-screen guard'ы уроков (openLessonAccessGate → /lesson_menu),
  // поэтому это единая точка, где премиум-лок превращается в открытие пейвола.
  useEffect(() => {
    if (!lockStateLoaded || !isLessonLocked || lockReason !== 'premium') return;
    if (premiumPaywallDispatchedRef.current) return;
    premiumPaywallDispatchedRef.current = true;
    markNextNavigationAsReplace();
    router.replace({
      pathname: '/premium_modal',
      params: {
        context: lessonPaywallContext(lessonId),
        source: 'lesson_menu',
        lessons_done: String(Math.max(0, lessonId - 1)),
        ...lessonPurchaseContinuationParams(lessonId),
      },
    } as any);
  }, [lockStateLoaded, isLessonLocked, lockReason, lessonId, router]);

  // Замок по уровню/прогрессу: экран НЕ открываем — уходим назад в список,
  // где тап по закрытому уроку показывает модал (gateModal). Владелец 2026-09-21:
  // «модал и только модал, или пейвол если фри» — полноэкранная заглушка
  // «Ещё рано» была отдельным экраном и правило нарушала.
  //
  // Сюда вообще попадают только в обход: список ловит замок ДО навигации. Обход
  // был реален — дев-флаг DEV_CONTENT_UNLOCK в TestFlight считал все 32 урока
  // открытыми, список пропускал тап, а честная проверка здесь рисовала заглушку.
  // Флаг починен в config.ts, но возврат оставляем предохранителем: любой другой
  // путь сюда (deep link, continuation после покупки, устаревший кэш) обязан
  // приводить к модалу в списке, а не к тупиковому экрану.
  const lockedBackDispatchedRef = useRef(false);
  useEffect(() => {
    if (!lockStateLoaded || !isLessonLocked) return;
    if (lockReason === 'premium') return; // им занимается эффект выше (пейвол)
    if (lockedBackDispatchedRef.current) return;
    lockedBackDispatchedRef.current = true;
    // Ранний выход с экрана обязан логироваться и в релизе — без этого
    // «урок не открывается» снова станет немым багом.
    console.log('[LESSON-LOCK] menu:bounce_back', JSON.stringify({ // guard-ok: ранний выход логируется в релизе намеренно
      lessonId,
      lockReason,
      prevLessonId: lockInfo?.prevLessonId ?? null,
      requiredScore: lockInfo?.requiredScore ?? null,
    }));
    // зачем (🔴 Моменты 15.10: запертый урок 2 по dev-ссылке → [LESSON-LOCK] menu:bounce_back ≥50 раз в минуту, lesson1 ↔ lesson_menu без конца): раньше здесь был «назад по стеку» —
    // а под меню оказывался тот же lesson1, чей охранник снова делает replace на меню. Теперь запертый урок = ОДИН replace на список с тостом причины; назад по стеку меню не ходит
    // и lesson1 сам не открывает. Предохранитель: не больше одного bounce на id за 5 с (повтор — только журнал, без навигации).
    const nowMs = Date.now();
    const lastBounceAt = lessonLockBounceAt.get(lessonId);
    // зачем (Ревизор 3bed5434c): расхождение «меню говорит закрыто, охранник lesson1 говорил открыто» видно в журнале явно (menuLock vs gateLock)
    const gateLock = peekLessonGateDecision(lessonId);
    console.log('[LESSON-LOCK] access_gate', JSON.stringify({ lessonId, menuLock: { locked: true, reason: lockReason, requiredScore: lockInfo?.requiredScore ?? null }, gateLock, disagree: gateLock !== null && gateLock.gate === 'available' })); // guard-ok: сверка двух решений замка
    if (lastBounceAt !== undefined && nowMs - lastBounceAt < LESSON_LOCK_BOUNCE_FUSE_MS) {
      // зачем (Ревизор 3bed5434c 🟡 (1)): подавленный bounce не должен оставлять человека на меню запертого урока — уходим на список в любом случае, только без тоста
      console.log('[LESSON-LOCK] menu:bounce_suppressed', JSON.stringify({ lessonId, sinceLastMs: nowMs - lastBounceAt, fuseMs: LESSON_LOCK_BOUNCE_FUSE_MS, action: 'replace_without_toast' })); // guard-ok: предохранитель цикла
      router.replace('/(tabs)/lessons' as never);
      return;
    }
    lessonLockBounceAt.set(lessonId, nowMs);
    // зачем (Ревизор 3bed5434c 🟡 (2)): текст тоста — по причине замка (прогресс / уровень / порог оценки / Plus)
    // зачем (typecheck 0 к сборке 18.10, TS2367): замок 'premium' сюда не доходит — его увёл в пейвол ранний выход выше
    // (`if (lockReason === 'premium') return;`), поэтому ветка 'premium' была мёртвой; поведение тоста прежнее.
    const toastKind: 'level' | 'threshold' | 'progress' = lockReason === 'level' ? 'level' : lockInfo?.requiredScore ? 'threshold' : 'progress';
    emitAppEvent('action_toast', actionToastTri('info', LESSON_LOCK_TOAST[toastKind]));
    console.log('[LESSON-LOCK] menu:bounce_replace', JSON.stringify({ lessonId, toastKind, to: '/(tabs)/lessons', canGoBack: router.canGoBack() })); // guard-ok: один replace на список
    router.replace('/(tabs)/lessons' as never);
  }, [lockStateLoaded, isLessonLocked, lockReason, lessonId, lockInfo, router]);

  // зачем (Ревизор 2.77): журнал расхождения был немым — охранник записывает решение только при «закрыто», а сверка шла лишь в ветке закрытия меню. Теперь и при ОТКРЫТОМ меню:
  // свежее (< 60 с) решение охранника «не available» против «меню открыто» → [LESSON-LOCK] disagree.
  useEffect(() => {
    if (!lockStateLoaded || isLessonLocked) return;
    const gateLock = peekLessonGateDecision(lessonId);
    if (gateLock && gateLock.ageMs < 60_000 && gateLock.gate !== 'available') {
      console.log('[LESSON-LOCK] disagree', JSON.stringify({ lessonId, menuLock: { locked: false }, gateLock })); // guard-ok: охранник закрыл, меню открыто
    }
  }, [isLessonLocked, lessonId, lockStateLoaded]);

  // Служебный флаг первого завершения: после него основной CTA подписывается как replay.
  const [finishedOnce, setFinishedOnce] = useState(false);
  // Первый кадр = финальная геометрия: если флаг уже прочитан в этой сессии, берём его
  // синхронно. Первый вход за сессию (кэш пуст) — считаем, что подсказку показываем:
  // так она не «влетает» позже, а сразу стоит на своём месте.
  const [lessonPrepHintVisible, setLessonPrepHintVisible] = useState(() => peekPrepHintSeen() !== true);

  const showReplayCta = finishedOnce && !lessonLaunchBlocked;
  const canShowLessonPrepHint = !frenchAuxiliarySourceGated && !frenchTheorySourceGated;
  // зачем (координатор 12.10, Сверка evidence/lesson_menu_lang): где пункт теории скрыт (английский — своей теории нет), совет не должен
  // отсылать к «Theory» — только к словам урока.
  const theoryHiddenForLang = theoryEntryFor(lang, isInteractiveTheoryLesson(lessonId), 'lesson_menu') === 'hidden';
  const lessonPrepHintWithoutTheory = triLang(lang, {
    ru: 'Перед уроком загляни в «Слова урока» и потренируй новые слова. Вернуться к ним можно в любой момент.',
    uk: 'Перед уроком можна зазирнути до «Словника» і потренувати нові слова. Повернутися до них можна будь-коли.',
    es: 'Antes de la lección puedes abrir «Vocabulario» y practicar palabras nuevas. Puedes volver a ellas en cualquier momento.',
    en: 'Before the lesson, you can open "Vocabulary" and practice new words. You can come back to them any time.',
    'pt-BR': 'Antes da lição, você pode abrir o «Vocabulário» e treinar palavras novas. Você pode voltar a elas quando quiser.',
    vi: 'Trước bài học, bạn có thể mở «Từ vựng» và luyện các từ mới. Bạn có thể quay lại bất cứ lúc nào.',
    id: 'Sebelum pelajaran, kamu bisa membuka «Kosakata» dan melatih kata-kata baru. Kamu bisa kembali kapan saja.',
    tr: 'Dersten önce «Kelimeler» bölümüne bakıp yeni kelimeleri çalışabilirsin. İstediğin zaman geri dönebilirsin.',
    pl: 'Przed lekcją możesz zajrzeć do „Słownika” i przećwiczyć nowe słowa. Możesz do nich wrócić w każdej chwili.',
  });
  const lessonPrepHintText = theoryHiddenForLang ? lessonPrepHintWithoutTheory : triLang(lang, {
    ru: 'Загляни в «Слова урока» и «Теорию» — там новые слова, правила и конструкции. Вернуться можно в любой момент.',
    uk: 'Перед уроком можна зазирнути до «Словника» і потренувати нові слова. А в розділі «Теорія» докладно розібрані правила й конструкції. До цих матеріалів можна повернутися будь-коли.',
    es: 'Antes de la lección puedes abrir «Vocabulario» y practicar palabras nuevas. En «Teoría» encontrarás reglas y estructuras explicadas en detalle. Puedes volver a estos materiales en cualquier momento.',
    en: 'Before the lesson, you can open "Vocabulary" and practice new words. In "Theory" you\'ll find rules and structures explained in detail. You can come back to these materials any time.',
    'pt-BR': 'Antes da lição, você pode abrir o «Vocabulário» e treinar palavras novas. Em «Teoria», as regras e estruturas estão explicadas em detalhe. Você pode voltar a esses materiais quando quiser.',
    vi: 'Trước bài học, bạn có thể mở «Từ vựng» và luyện các từ mới. Trong «Lý thuyết», các quy tắc và cấu trúc được giải thích chi tiết. Bạn có thể quay lại các phần này bất cứ lúc nào.',
    id: 'Sebelum pelajaran, kamu bisa membuka «Kosakata» dan melatih kata-kata baru. Di «Teori», aturan dan struktur dijelaskan dengan rinci. Materi ini bisa dibuka lagi kapan saja.',
    tr: 'Dersten önce «Kelimeler» bölümüne bakıp yeni kelimeleri çalışabilirsin. «Teori» bölümünde kurallar ve yapılar ayrıntılı açıklanır. Bu materyallere istediğin zaman dönebilirsin.',
    pl: 'Przed lekcją możesz zajrzeć do „Słownika” i przećwiczyć nowe słowa. W sekcji „Teoria” znajdziesz szczegółowe omówienie zasad i konstrukcji. Do tych materiałów możesz wrócić w każdej chwili.',
  });

  useEffect(() => {
    let cancelled = false;
    void isLessonFinishedOnce(lessonId, studyTarget).then((fin) => {
      if (cancelled) return;
      setFinishedOnce(fin);
    });
    return () => { cancelled = true; };
  }, [lessonId, studyTarget]);

  useEffect(() => {
    if (!canShowLessonPrepHint) {
      setLessonPrepHintVisible(false);
      return;
    }
    // Кэш уже прогрет — состояние выставлено синхронно в useState, второй раз не читаем.
    if (peekPrepHintSeen() !== null) return;
    let cancelled = false;
    AsyncStorage.getItem(LESSON_MENU_PREP_HINT_SEEN_KEY)
      .then((seen) => {
        rememberPrepHintSeen(seen === '1');
        if (!cancelled) setLessonPrepHintVisible(seen !== '1');
      })
      .catch((error: unknown) => {
        noteSwallowedHandler('lesson_menu:prepHint')(error); // зачем: сбой чтения флага подсказки был немым
        rememberPrepHintSeen(false);
        if (!cancelled) setLessonPrepHintVisible(true);
      });
    return () => { cancelled = true; };
  }, [canShowLessonPrepHint]);

  useEffect(() => {
    if (!lessonPrepHintVisible || !canShowLessonPrepHint || isLessonLocked || !lockStateLoaded) return;
    const timer = setTimeout(() => {
      // Кэш обновляем сразу вместе с диском: следующий вход в урок решит судьбу
      // подсказки синхронно, на первом кадре, без сдвига плиток.
      rememberPrepHintSeen(true);
      void AsyncStorage.setItem(LESSON_MENU_PREP_HINT_SEEN_KEY, '1').catch(noteSwallowedHandler('lesson_menu:useEffect.setItem'));
    }, 1200);
    return () => clearTimeout(timer);
  }, [canShowLessonPrepHint, isLessonLocked, lessonPrepHintVisible, lockStateLoaded]);

  // Подписка на event «урок впервые завершён» — на случай если юзер вернулся
  // на lesson_menu сразу из lesson_complete без перезагрузки экрана.
  useEffect(() => {
    const sub = onAppEvent('lesson_finished_once', (payload) => {
      if ((payload?.studyTarget ?? 'en') !== storageStudyTarget(studyTarget)) return;
      if (payload?.lessonId === lessonId) setFinishedOnce(true);
    });
    return () => sub.remove();
  }, [lessonId, studyTarget]);

  const loadLockState = useCallback(() => {
    // Проверить, заблокирован ли урок (с учётом тестерской функции "Без ограничений")
    lockCheckStartedAtRef.current = Date.now();
    // зачем (аудит R58 #26, координатор 15.10): на каждом возврате фокуса меню сбрасывалось в скелет и теряло прокрутку. Для УЖЕ подтверждённого в этом заходе урока
    // экран остаётся как был, проверка идёт фоном, а запуск урока заблокирован (lockRevalidating) до её конца — fail-closed для действий сохраняется.
    // Новый урок/аккаунт (ключ другой) — прежний путь: скелет и закрытое состояние до подтверждения.
    // зачем (Ревизор 7d564d137): две проверки при быстром blur→focus шли внахлёст — ранняя снимала флаг и записывала устаревший результат. Поколение: результат и снятие флага — только у последней.
    // stableId в ключе подтверждения: подтверждение одного аккаунта не переносится на другой.
    const generation = ++lockGenerationRef.current;
    const lockKey = `${captureAccountGeneration()?.stableId ?? 'anon'}|${lessonId}|${String(studyTarget)}`;
    const gatedSetLocked = (value: boolean) => { if (lockGenerationRef.current === generation) setIsLessonLocked(value); };
    const gatedSetReason = (value: 'premium' | 'level' | 'progress') => { if (lockGenerationRef.current === generation) setLockReason(value); };
    const gatedSetInfo = (next: Awaited<ReturnType<typeof getLessonLockInfo>> | null) => { if (lockGenerationRef.current === generation) setLockInfoQuiet(next); };
    const silent = lockConfirmedKeyRef.current === lockKey;
    console.log(`[LESSON-MENU] lock:check ${JSON.stringify({ lessonId, studyTarget, silent })}`); // guard-ok: тихая ли перепроверка
    if (silent) {
      setLockRevalidating(true);
    } else {
      setLockStateLoaded(false);
      // Ревалидация тоже fail-closed: прежний успешный результат не даёт короткого
      // окна запуска, пока новый lessonId/аккаунт ещё не проверен.
      setIsLessonLocked(true);
      setLockReason('progress');
      setLockInfo(null);
    }
    // Тихая ревалидация: lockInfo — плоский объект, getLessonLockInfo() всегда
    // возвращает новую ссылку. Сравниваем перед setState, чтобы не дёргать
    // зависимые эффекты (lessonPrepHint) на каждый фокус, если ничего не изменилось.
    const setLockInfoQuiet = (next: Awaited<ReturnType<typeof getLessonLockInfo>> | null) => {
      setLockInfo(prev => (shallowObjectsEqual(prev, next) ? prev : next));
    };
    (async () => {
      try {
        // `isAlwaysOpenLesson` хранит системное исключение урока 1; Free 1–3 и
        // точные покупки проверяются следующим шагом единой access-логики.
        const noLimits = isAlwaysOpenLesson(lessonId) || await isTesterNoLimitsActive();
        if (noLimits) {
          console.log(`[LESSON-MENU] lock:resolved ${JSON.stringify({ lessonId, studyTarget, locked: false, by: isAlwaysOpenLesson(lessonId) ? 'always_open_lesson' : 'tester_no_limits' })}`);
          gatedSetLocked(false);
          gatedSetReason('progress');
          gatedSetInfo(null);
          return;
        }

        // Free lessons 1–3 and exact pearl purchases remain available without
        // consulting subscription or any legacy unlock projection.
        const freeOrPurchased = await isLessonUnlockedByEarnedProgress(lessonId, studyTarget);
        if (freeOrPurchased) {
          console.log(`[LESSON-MENU] lock:resolved ${JSON.stringify({ lessonId, studyTarget, locked: false, by: 'free_or_purchased' })}`);
          gatedSetLocked(false);
          gatedSetReason('progress');
          gatedSetInfo(null);
          return;
        }

        const premiumNow = await getVerifiedPremiumStatus();

        if (!premiumNow && requiresPremiumForLesson(lessonId)) {
          console.log(`[LESSON-MENU] lock:resolved ${JSON.stringify({ lessonId, studyTarget, locked: true, by: 'premium_required', premiumNow })}`);
          gatedSetLocked(true);
          gatedSetReason('premium');
          gatedSetInfo(await getLessonLockInfo(lessonId, studyTarget));
          return;
        }

        if (premiumNow) {
          const premiumUnlocked = await isLessonUnlockedByPremiumCourse(lessonId, studyTarget);
          console.log(`[LESSON-MENU] lock:resolved ${JSON.stringify({ lessonId, studyTarget, locked: !premiumUnlocked, by: 'premium_course', premiumNow })}`);
          gatedSetLocked(!premiumUnlocked);
          gatedSetReason('progress');
          gatedSetInfo(premiumUnlocked ? null : await getLessonLockInfo(lessonId, studyTarget));
          return;
        }

        let unlocked = await isLessonUnlockedByEarnedProgress(lessonId, studyTarget);
        // Fallback: если урок не в persisted unlock list, проверяем предыдущий урок
        // через best_score или динамически через прогресс (как в index.tsx)
        if (!unlocked && lessonId > 1) {
          const prevId = lessonId - 1;
          const prevBestRaw = await AsyncStorage.getItem(lessonBestScoreKey(prevId, studyTarget));
          let prevScore = parseFloat(prevBestRaw ?? '0') || 0;

          // Если best_score ещё не записан — считаем из прогресса (урок в процессе)
          if (prevScore === 0) {
            const savedProg = await AsyncStorage.getItem(lessonProgressKey(prevId, studyTarget));
            prevScore = effectiveLessonStarScore(prevBestRaw, savedProg).score;
          }

          // зачем (D121, владелец 30.09): следующий урок открывается от 2★ = 60%; уже
          // открытый по старому порогу (в unlocked_lessons) не закрываем — общий помощник.
          const alreadyPersisted = await isLessonUnlocked(lessonId, studyTarget);
          if (previousLessonScoreOpensNext(prevScore, alreadyPersisted)) {
            const { unlockLesson } = await import('./lesson_lock_system');
            await unlockLesson(lessonId, studyTarget);
            unlocked = true;
          }
        }

        console.log(`[LESSON-MENU] lock:resolved ${JSON.stringify({ lessonId, studyTarget, locked: !unlocked, by: 'earned_progress' })}`);
        gatedSetLocked(!unlocked);
        if (!unlocked) {
          gatedSetReason('progress');
          const info = await getLessonLockInfo(lessonId, studyTarget);
          gatedSetInfo(info);
        } else {
          gatedSetInfo(null);
        }
      } catch (error) {
        // Ошибка AsyncStorage/entitlement-проверки не является разрешением.
        console.warn(`[LESSON-MENU] lock:resolved ${JSON.stringify({ lessonId, studyTarget, locked: true, by: 'error_fail_closed', error: error instanceof Error ? error.message : String(error) })}`);
        gatedSetLocked(true);
        gatedSetReason('progress');
        gatedSetInfo(null);
        DebugLogger.error(
          'lesson_menu:access_gate',
          error instanceof Error ? error : new Error(String(error)),
          'warning',
        );
      } finally {
        if (lockGenerationRef.current === generation) {
          lockConfirmedKeyRef.current = lockKey;
          setLockRevalidating(false);
          setLockStateLoaded(true);
        } else {
          console.log(`[LESSON-MENU] lock:stale_result_dropped ${JSON.stringify({ lessonId, generation, latest: lockGenerationRef.current })}`); // guard-ok: устаревшая проверка отброшена
        }
      }
    })();
  }, [lessonId, studyTarget]);

  // зачем (координатор 13.10; сперва логи): начало и конец ожидания проверки доступа — пока `lockStateLoaded` ложно, на экране скелет, а не пустой фон. Итог проверки (закрыто/открыто, причина) читается из состояния, решение не принимается здесь.
  useEffect(() => {
    if (!lockStateLoaded) {
      console.log(`[LESSON-GATE-FIRSTFRAME] menu lesson=${lessonId} target=${String(studyTarget)}: проверка доступа идёт — рисуем скелет меню`); // guard-ok: одна строка на начало проверки
      return;
    }
    console.log(`[LESSON-GATE-FIRSTFRAME] menu lesson=${lessonId} target=${String(studyTarget)}: проверка заняла ${Date.now() - lockCheckStartedAtRef.current} мс → ${isLessonLocked ? `закрыто (${lockReason})` : 'открыто'}`); // guard-ok: одна строка на конец проверки
  }, [lockStateLoaded, isLessonLocked, lockReason, lessonId, studyTarget]);

  const loadProgress = useCallback(() => {
    const progressKey = lessonProgressKey(lessonId, studyTarget);
    const bestScoreKey = lessonBestScoreKey(lessonId, studyTarget);
    const wordsKey = lessonWordsKey(lessonId, studyTarget);
    const irregularKey = irregularVerbsGlobalKey(studyTarget);
    const prepositionProgressKey = lessonPrepositionProgressKey(lessonId, studyTarget);
    const theorySectionsKey = lessonTheorySectionsSeenKey(lessonId, studyTarget);
    AsyncStorage.multiGet([
      progressKey,
      bestScoreKey,
    ]).then(entries => {
      const map = Object.fromEntries(entries) as Record<string, string | null>;
      const saved = freshestProgressRaw(lessonId, map[progressKey] ?? null, studyTarget);
      const bestRaw = map[bestScoreKey] ?? null;
      // Тихая ревалидация: JSON.parse/new Array(...) даёт новую ссылку каждый раз,
      // даже когда контент не изменился — сравниваем перед setState.
      const setProgressArrQuiet = (next: string[]) => {
        setProgressArr(prev => (stringArraysEqual(prev, next) ? prev : next));
      };
      try {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const denominator = Math.min(p.length, 50);
          const { score: effectiveScore, correctCount } = effectiveLessonStarScore(bestRaw, saved);
          setScore(effectiveScore);
          setScoreKnown(parseStoredLessonScore(bestRaw) !== null || countAnsweredProgress(p) > 0);
          setProgress(Math.min(correctCount, denominator));
          setProgressArrQuiet(p.length === 50 ? p : emptyProgress());
        } else {
          const storedScore = parseStoredLessonScore(bestRaw);
          setScore(storedScore ?? 0); setScoreKnown(storedScore !== null); setProgress(0);
          setProgressArrQuiet(emptyProgress());
        }
      } catch {
        const storedScore = parseStoredLessonScore(bestRaw);
        setScore(storedScore ?? 0); setScoreKnown(storedScore !== null); setProgress(0); setProgressArrQuiet(emptyProgress());
      }
      setDataLoaded(true);
    });
    AsyncStorage.getItem(wordsKey).then(saved => {
      try {
        if (!saved) { setWordsLearned(0); return; }
        let counts: Record<string,number> = JSON.parse(saved);
        // Миграция урока 1: местоимения → auto-learned для старых юзеров
        if (lessonId === 1 && Object.values(counts).some(c => c >= 3)) {
          const pronouns = ['I', 'you', 'he', 'she', 'we', 'it'];
          let migrated = false;
          for (const p of pronouns) {
            if (!counts[p] || counts[p] < 3) { counts = { ...counts, [p]: 3 }; migrated = true; }
          }
          if (migrated) AsyncStorage.setItem(wordsKey, JSON.stringify(counts));
        }
        const validKeys = lessonWordKeys(lessonId);
        const learned = validKeys
          ? Object.entries(counts).filter(([k, c]) => c >= 3 && validKeys.has(k)).length
          : Object.values(counts).filter(c => c >= 3).length;
        setWordsLearned(learned);
      } catch { setWordsLearned(0); }
    });
    if (LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) {
      AsyncStorage.getItem(irregularKey).then(saved => {
        try {
          const counts: Record<string,number> = saved ? JSON.parse(saved) : {};
          const lessonVerbs = IRREGULAR_VERBS_BY_LESSON[lessonId] ?? [];
          setIrregularLearned(lessonVerbs.filter(v => (counts[v.base] ?? 0) >= 3).length);
        } catch { setIrregularLearned(0); }
      });
    }
    AsyncStorage.getItem(prepositionProgressKey).then(saved => {
      const prep = parsePrepositionAnswered(lessonId, saved, studyTarget);
      setPrepositionAnswered(prep.answered);
      setPrepositionTotal(prep.total);
    }).catch((error: unknown) => {
      noteSwallowedHandler('lesson_menu:prepositionProgress')(error); // зачем: сбой чтения прогресса предлогов был немым
      const prep = parsePrepositionAnswered(lessonId, null, studyTarget);
      setPrepositionAnswered(prep.answered);
      setPrepositionTotal(prep.total);
    });
    AsyncStorage.getItem(theorySectionsKey)
      .then(progressRaw => {
        setTheoryProgressPct(parseTheoryMenuProgress(progressRaw));
      })
      .catch((error: unknown) => {
        noteSwallowedHandler('lesson_menu:theoryProgress')(error); // зачем: сбой чтения прогресса теории был немым
        setTheoryProgressPct(0);
      });
  }, [lessonId, studyTarget]);

  // зачем: гидратация из прогретого кэша раньше ждала runAfterInteractions — цифры и
  // кольца догоняли вёрстку уже после анимации перехода. Кэш лежит в памяти, читается
  // синхронно, поэтому применяем его сразу при монтировании: первый кадр уже финальный.
  useEffect(() => {
    // Не сбрасываем dataLoaded вслепую: это ломало мгновенный UI после prefetch и
    // оставляло пустые кольца до первого getItem(progress). Если кэш уже есть — сразу гидратим.
    const warm = lessonMenuCacheById[lessonMenuCacheKey(lessonId, studyTarget)];
    if (warm) {
      setScore(warm.score);
      setScoreKnown(warm.scoreKnown);
      setProgress(warm.progress);
      setProgressArr(warm.progressArr);
      setWordsLearned(warm.wordsLearned);
      setIrregularLearned(warm.irregularLearned);
      setPrepositionAnswered(warm.prepositionAnswered);
      setPrepositionTotal(warm.prepositionTotal);
      setTheoryProgressPct(warm.theoryProgressPct);
      setDataLoaded(true);
    } else {
      setScoreKnown(false);
      setDataLoaded(false);
    }
  }, [lessonId, studyTarget]);

  // Запись «последний открытый урок» на первый кадр не влияет — откладываем её за
  // анимацию перехода, чтобы не занимать поток в момент открытия экрана.
  // зачем: запоминаем ТОЛЬКО доступный урок. Раньше заглянув в заблокированный
  // урок (напр. №2 из списка), пользователь записывал его как «последний
  // открытый», и кнопка «Урок» на Главной потом каждый раз приводила на экран
  // «Урок заблокирован» — выглядело как поломка приложения. Ждём результат
  // проверки блокировки (lockStateLoaded), чтобы не записать урок до неё.
  useEffect(() => {
    if (!lockStateLoaded || isLessonLocked) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void AsyncStorage.setItem(lastOpenedLessonKey(studyTarget), String(lessonId));
      recordHomeContinueLegacy(studyTarget); // зачем (P23): карточка «Продолжить» сравнивает время старого урока и занятия V2
    });
    return () => task.cancel();
  }, [lessonId, studyTarget, lockStateLoaded, isLessonLocked]);

  // зачем (координатор 12.10, «сперва логи»: кадры energy-modes ушли на Главную, а после тапа «Начать» в журнале не было НИ ОДНОЙ
  // строки): каждый обработчик старта пишет вход, каждое решение со значениями, каждый ранний выход и итог навигации.
  const lessonMenuTrace = useCallback((event: string, extra: Record<string, unknown> = {}) => {
    console.log(`[LESSON-MENU] ${event} ${JSON.stringify({
      lessonId, studyTarget, lockStateLoaded, isLessonLocked, lockReason, lessonLaunchBlocked, frenchLessonSourceGated,
      energy, bonusEnergy, energyReady: menuEnergyReady, energyUnlimited: menuEnergyUnlimited, ...extra,
    })}`);
  }, [lessonId, studyTarget, lockStateLoaded, isLessonLocked, lockReason, lessonLaunchBlocked, frenchLessonSourceGated, energy, bonusEnergy, menuEnergyReady, menuEnergyUnlimited]);

  const openLessonFromMenu = useCallback(() => {
    lessonMenuTrace('primary:continue');
    if (lessonLaunchBlocked) { lessonMenuTrace('primary:exit', { reason: 'launch_blocked' }); return; }
    if (frenchLessonSourceGated) {
      lessonMenuTrace('primary:exit', { reason: 'french_source_gated', shown: 'soon_sheet' });
      setSoonOpen('frenchLesson');
      return;
    }
    void primeLessonScreenFromStorage(lessonId, studyTarget).catch(noteSwallowedHandler('lesson_menu:useCallback.primeLessonScreenFromStorage'));
    if (!navOnce(`lesson_menu:open:${lessonId}`)) { lessonMenuTrace('primary:exit', { reason: 'double_tap' }); return; }
    lessonMenuTrace('primary:navigate', { to: '/lesson1', mode: 'push', from: 'continue', plan: planLessonParams });
    router.push({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu', ...planLessonParams } });
  }, [frenchLessonSourceGated, lessonId, lessonLaunchBlocked, lessonMenuTrace, router, studyTarget]);

  const handleStartLesson = useCallback(() => {
    lessonMenuTrace('primary:start');
    if (lessonLaunchBlocked) { lessonMenuTrace('primary:exit', { reason: 'launch_blocked' }); return; }
    if (frenchLessonSourceGated) {
      lessonMenuTrace('primary:exit', { reason: 'french_source_gated', shown: 'soon_sheet' });
      setSoonOpen('frenchLesson');
      return;
    }
    void primeLessonScreenFromStorage(lessonId, studyTarget).catch(noteSwallowedHandler('lesson_menu:useCallback.primeLessonScreenFromStorage_2'));
    // push (не replace): meню урока должно остаться в стеке, чтобы «назад» из lesson1
    // возвращал на lesson_menu, а не проваливался на список уроков (tabs/lessons).
    if (!navOnce(`lesson_menu:open:${lessonId}`)) { lessonMenuTrace('primary:exit', { reason: 'double_tap' }); return; }
    lessonMenuTrace('primary:navigate', { to: '/lesson1', mode: 'push', from: 'start', plan: planLessonParams });
    router.push({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu', ...planLessonParams } });
  }, [frenchLessonSourceGated, lessonId, lessonLaunchBlocked, lessonMenuTrace, router, studyTarget]);

  const handleContinueLesson = openLessonFromMenu;

  const handleReplayIntroAndContinue = useCallback(() => {
    if (lessonLaunchBlocked) return;
    if (frenchLessonSourceGated) {
      setSoonOpen('frenchLesson');
      return;
    }
    if (!navOnce(`lesson_menu:replay:${lessonId}`)) return; // зачем (аудит R58 #25, 15.10): двойной тап «Показать вступление» — один урок
    void primeLessonScreenFromStorage(lessonId, studyTarget).catch(noteSwallowedHandler('lesson_menu:useCallback.primeLessonScreenFromStorage_3'));
    router.push({
      pathname: '/lesson1',
      params: { id: lessonId, from: 'lesson_menu', replayIntro: '1', replayIntroAt: String(Date.now()) },
    });
  }, [frenchLessonSourceGated, lessonId, lessonLaunchBlocked, router, studyTarget]);

  // handleLockedLessonPress удалён: при закрытом уроке экран меню не рисуется,
  // и нажать эту плитку стало невозможно (ранний return уводит на пейвол или
  // назад в список под модал).

  useFocusEffect(loadProgress);
  useFocusEffect(loadLockState);

  const isStarted = progress > 0;

  type IconName = React.ComponentProps<typeof Ionicons>['name'];
  const menuItems: {
    testID: string;
    label: string;
    sub: string;
    icon: IconName;
    pct?: number;
    onPress: () => void;
    onLongPress?: () => void;
    disabled?: boolean;
    unavailable?: boolean;
    hidden?: boolean;
  }[] = [
    {
      testID: 'lesson-menu-primary',
      label: frenchLessonSourceGated
        ? triLang(lang, {
  ru: 'Загрузка пакета',
  uk: 'Завантаження пакета',
  es: 'Material pendiente',
  en: 'Loading pack',
  "pt-BR": 'Carregando pacote',
  vi: 'Nội dung đang chờ duyệt',
  id: 'Materi sedang ditinjau',
  tr: 'Paket yükleniyor',
  pl: 'Ładowanie zestawu',
})
        : showReplayCta
        ? triLang(lang, {
  ru: 'Перепройти',
  uk: 'Пройти знову',
  es: 'Repetir',
  en: 'Replay',
  "pt-BR": 'Repetir',
  vi: 'Học lại',
  id: 'Ulangi',
  tr: 'Tekrar et',
  pl: 'Powtórz',
})
        : (isStarted ? s.lessonMenu.continue : s.lessonMenu.start),
      sub: frenchLessonSourceGated
        ? triLang(lang, {
  ru: 'Этот урок пока готовится. Скоро откроется.',
  uk: 'Цей урок ще готується. Скоро відкриється.',
  es: 'Esta lección se está preparando. Pronto estará disponible.',
  en: 'This lesson is being prepared. It will open soon.',
  "pt-BR": 'Esta lição está sendo preparada. Em breve estará disponível.',
  vi: 'Bài học này đang được chuẩn bị. Sắp ra mắt.',
  id: 'Pelajaran ini sedang disiapkan. Segera tersedia.',
  tr: 'Bu ders hazırlanıyor. Yakında açılacak.',
  pl: 'Ta lekcja jest w przygotowaniu. Wkrótce będzie dostępna.',
})
        : showReplayCta
        ? `${progress} / 50  ·  ${lessonMenuStarCount(score)} / 3 ★`
        : isStarted
          ? `${progress} / 50  ·  ${lessonMenuStarCount(score)} / 3 ★`
          : '',
      icon: frenchLessonSourceGated
        ? 'shield-checkmark-outline'
        : isLessonLocked
        ? 'lock-closed'
        : showReplayCta
          ? 'refresh-circle-outline'
          : (isStarted ? 'play-circle-outline' : 'rocket-outline'),
      pct: frenchLessonSourceGated || showReplayCta ? undefined : Math.round(progress / 50 * 100),
      // Ветка isLessonLocked убрана: до отрисовки этой плитки при закрытом уроке
      // дело больше не доходит — ранний return выше уводит с экрана.
      onPress: frenchLessonSourceGated
          ? () => setSoonOpen('frenchLesson')
        : showReplayCta
          ? handleStartLesson
          : (isStarted
              ? handleContinueLesson
              : handleStartLesson),
      onLongPress: isStarted && !frenchLessonSourceGated && !isLessonLocked && !showReplayCta ? handleReplayIntroAndContinue : undefined,
      disabled: lessonLaunchBlocked,
      unavailable: frenchLessonSourceGated,
    },
    {
      testID: 'lesson-menu-words',
      // зачем (Сверка learn-020, макет learn.html B): в русском интерфейсе строка называется «Слова урока» (в остальных языках прежние названия — подсказка ниже ссылается на них)
      label: triLang(lang, { ru: 'Слова урока', uk: s.lessonMenu.vocab, en: s.lessonMenu.vocab, es: s.lessonMenu.vocab, 'pt-BR': s.lessonMenu.vocab, vi: s.lessonMenu.vocab, id: s.lessonMenu.vocab, tr: s.lessonMenu.vocab, pl: s.lessonMenu.vocab }),
      sub: frenchAuxiliarySourceGated
        ? triLang(lang, {
            ru: 'Французский словарь урока пока готовится. Английские слова скрыты.',
            uk: 'Французький словник уроку ще готується. Англійські слова приховано.',
            es: 'El vocabulario francés de esta lección se está preparando.',
            en: 'The French vocabulary for this lesson is being prepared. English words are hidden.',
            'pt-BR': 'O vocabulário francês desta lição está sendo preparado.',
            vi: 'Từ vựng tiếng Pháp của bài này đang được chuẩn bị.',
            id: 'Kosakata bahasa Prancis pelajaran ini sedang disiapkan.',
            tr: 'Bu dersin Fransızca kelime listesi hazırlanıyor.',
            pl: 'Francuskie słownictwo do tej lekcji jest przygotowywane.',
          })
        : LESSONS_WITH_WORDS.has(lessonId)
        ? (() => {
            const total = lessonWordCount(lessonId);
            if (total > 0) {
              return triLang(lang, {
                ru: `${wordsLearned}/${total}\u00A0слов`,
                uk: `${wordsLearned}/${total}\u00A0слів`,
                es: `${wordsLearned}/${total}\u00A0palabras`,
                en: `${wordsLearned}/${total}\u00A0words`,
                'pt-BR': `${wordsLearned}/${total}\u00A0palavras`,
                vi: `${wordsLearned}/${total}\u00A0từ`,
                id: `${wordsLearned}/${total}\u00A0kata`,
                tr: `${wordsLearned}/${total}\u00A0kelime`,
                pl: `${wordsLearned}/${total}\u00A0słów`,
              });
            }
            return triLang(lang, {
              ru: 'Слова этого урока',
              uk: 'Слова цього уроку',
              es: 'Palabras de esta lección',
              en: 'Words in this lesson',
              'pt-BR': 'Palavras desta lição',
              vi: 'Từ vựng của bài này',
              id: 'Kosakata pelajaran ini',
              tr: 'Bu dersin kelimeleri',
              pl: 'Słowa z tej lekcji',
            });
          })()
        : triLang(lang, {
            ru: 'Слова этого урока',
            uk: 'Слова цього уроку',
            es: 'Palabras de esta lección',
            en: 'Words in this lesson',
            'pt-BR': 'Palavras desta lição',
            vi: 'Từ vựng của bài này',
            id: 'Kosakata pelajaran ini',
            tr: 'Bu dersin kelimeleri',
            pl: 'Słowa z tej lekcji',
          }),
      icon: frenchAuxiliarySourceGated ? 'shield-checkmark-outline' as const : 'book-outline' as const,
      pct: (() => {
        if (frenchAuxiliarySourceGated) return undefined;
        if (!LESSONS_WITH_WORDS.has(lessonId)) return undefined;
        const total = lessonWordCount(lessonId);
        return total > 0 ? Math.round(wordsLearned / total * 100) : undefined;
      })(),
      onPress: () => {
        if (frenchAuxiliarySourceGated) {
          setSoonOpen('vocab');
          return;
        }
        if (LESSONS_WITH_WORDS.has(lessonId)) {
          if (!navOnce(`lesson_menu:words:${lessonId}`)) return; // зачем (аудит R58 #25, 15.10): двойной тап — один экран слов
          router.push({ pathname: '/lesson_words', params: { id: lessonId, tab: 'train' } });
        } else {
          setSoonOpen('vocab');
        }
      },
      unavailable: frenchAuxiliarySourceGated,
    },
    {
      testID: 'lesson-menu-irregular-verbs',
      hidden: !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId),
      // зачем (Сверка learn-020, макет learn.html B2): «Неправильные глаголы» (ru); остальные языки — прежние строки
      label: triLang(lang, { ru: 'Неправильные глаголы', uk: s.lessonMenu.verbs, en: s.lessonMenu.verbs, es: s.lessonMenu.verbs, 'pt-BR': s.lessonMenu.verbs, vi: s.lessonMenu.verbs, id: s.lessonMenu.verbs, tr: s.lessonMenu.verbs, pl: s.lessonMenu.verbs }),
      sub: frenchAuxiliarySourceGated
        ? triLang(lang, {
            ru: 'Французские глаголы урока пока готовятся. Английский список скрыт.',
            uk: 'Французькі дієслова уроку ще готуються. Англійський список приховано.',
            es: 'Los verbos franceses de esta lección se están preparando.',
            en: 'The French verbs for this lesson are being prepared. The English list is hidden.',
            'pt-BR': 'Os verbos franceses desta lição estão sendo preparados.',
            vi: 'Động từ tiếng Pháp của bài này đang được chuẩn bị.',
            id: 'Kata kerja bahasa Prancis pelajaran ini sedang disiapkan.',
            tr: 'Bu dersin Fransızca fiilleri hazırlanıyor.',
            pl: 'Francuskie czasowniki do tej lekcji są przygotowywane.',
          })
        : LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)
        ? (() => {
            const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
            return total > 0
              ? triLang(lang, {
                  ru: `${irregularLearned}/${total}\u00A0глаголов`,
                  uk: `${irregularLearned}/${total}\u00A0дієслів`,
                  es: `${irregularLearned}/${total}\u00A0verbos`,
                  en: `${irregularLearned}/${total}\u00A0verbs`,
                  'pt-BR': `${irregularLearned}/${total}\u00A0verbos`,
                  vi: `${irregularLearned}/${total}\u00A0động từ`,
                  id: `${irregularLearned}/${total}\u00A0kata kerja`,
                  tr: `${irregularLearned}/${total}\u00A0fiil`,
                  pl: `${irregularLearned}/${total}\u00A0czasowników`,
                })
              : triLang(lang, {
                  ru: 'Неправильные глаголы урока',
                  uk: 'Неправильні дієслова уроку',
                  es: 'Formas verbales irregulares de esta lección',
                  en: 'Irregular verbs in this lesson',
                  'pt-BR': 'Verbos irregulares desta lição',
                  vi: 'Động từ bất quy tắc của bài này',
                  id: 'Kata kerja tak beraturan pelajaran ini',
                  tr: 'Bu dersin düzensiz fiilleri',
                  pl: 'Czasowniki nieregularne z tej lekcji',
                });
          })()
        : triLang(lang, {
            ru: 'Неправильные глаголы урока',
            uk: 'Неправильні дієслова уроку',
            es: 'Formas verbales irregulares de esta lección',
            en: 'Irregular verbs in this lesson',
            'pt-BR': 'Verbos irregulares desta lição',
            vi: 'Động từ bất quy tắc của bài này',
            id: 'Kata kerja tak beraturan pelajaran ini',
            tr: 'Bu dersin düzensiz fiilleri',
            pl: 'Czasowniki nieregularne z tej lekcji',
          }),
      // зачем (Сверка learn-020, learn.html menuRow): значки строк по макету — глаголы «swap», предлоги «key», теория «list».
      icon: frenchAuxiliarySourceGated ? 'shield-checkmark-outline' as const : 'swap-horizontal-outline' as const,
      pct: (() => {
        if (frenchAuxiliarySourceGated) return undefined;
        if (!LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) return undefined;
        const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0 ? Math.round(irregularLearned / total * 100) : undefined;
      })(),
      onPress: () => {
        hapticTap();
        if (frenchAuxiliarySourceGated) {
          setSoonOpen('verbs');
          return;
        }
        if (LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) {
          if (!navOnce(`lesson_menu:irregular:${lessonId}`)) return; // зачем (аудит R58 #25, 15.10): двойной тап — один экран глаголов
          router.push({ pathname: '/lesson_irregular_verbs', params: { id: lessonId } });
        } else {
          setSoonOpen('verbs');
        }
      },
      unavailable: frenchAuxiliarySourceGated,
    },
    {
      testID: 'lesson-menu-prepositions',
      hidden: !targetHasPrepositionDrill && !prepositionSourceGated,
      label: triLang(lang, {
  ru: 'Тренажёр предлогов',
  uk: 'Тренажер прийменників',
  es: 'Práctica de preposiciones',
  en: 'Preposition practice',
  "pt-BR": 'Treino de preposições',
  vi: 'Luyện giới từ',
  id: 'Latihan preposisi',
  tr: 'Edat alıştırması',
  pl: 'Trening przyimków',
}),
      sub: prepositionTotal > 0
        ? triLang(lang, {
            ru: `${prepositionAnswered}/${prepositionTotal}\u00A0вызовов`,
            uk: `${prepositionAnswered}/${prepositionTotal}\u00A0викликів`,
            es: `${prepositionAnswered}/${prepositionTotal}\u00A0ejercicios`,
            en: `${prepositionAnswered}/${prepositionTotal}\u00A0exercises`,
            'pt-BR': `${prepositionAnswered}/${prepositionTotal}\u00A0exercícios`,
            vi: `${prepositionAnswered}/${prepositionTotal}\u00A0bài tập`,
            id: `${prepositionAnswered}/${prepositionTotal}\u00A0latihan`,
            tr: `${prepositionAnswered}/${prepositionTotal}\u00A0alıştırma`,
            pl: `${prepositionAnswered}/${prepositionTotal}\u00A0ćwiczeń`,
          })
        : triLang(lang, {
            ru: 'Предлоги этого урока',
            uk: 'Прийменники цього уроку',
            es: 'Preposiciones de esta lección',
            en: 'Prepositions in this lesson',
            'pt-BR': 'Preposições desta lição',
            vi: 'Giới từ của bài này',
            id: 'Preposisi pelajaran ini',
            tr: 'Bu dersin edatları',
            pl: 'Przyimki z tej lekcji',
          }),
      icon: prepositionSourceGated ? 'shield-checkmark-outline' as const : 'key-outline' as const,
      pct: prepositionSourceGated
        ? undefined
        : prepositionTotal > 0 ? Math.round(prepositionAnswered / prepositionTotal * 100) : undefined,
      onPress: () => {
        hapticTap();
        if (prepositionSourceGated) {
          setSoonOpen('prepositions');
          return;
        }
        if (targetHasPrepositionDrill) {
          if (menuEnergyReady && !menuEnergyUnlimited && energy + bonusEnergy <= 0) {
            emitAppEvent('action_toast', {
              type: 'error',
              messageRu: 'Не хватает энергии. Подожди восстановления или используй бонусную.',
              messageUk: 'Недостатньо енергії. Дочекайся відновлення або використай бонусну енергію.',
              // зачем (12.10, английский интерфейс в R1): без messageEn английский интерфейс показывал этот тост по-русски.
              messageEn: 'Not enough energy. Wait for it to recharge or use bonus energy.',
              messageEs: 'No tienes suficiente energía. Espera a que se recargue o usa energía bonus.',
            });
            return;
          }
          if (!navOnce(`lesson_menu:prepositions:${lessonId}`)) return; // зачем (аудит R58 #25, 15.10): двойной тап — один тренажёр предлогов
          router.push({ pathname: '/preposition_drill', params: { id: lessonId } });
        } else {
          setSoonOpen('prepositions');
        }
      },
      unavailable: prepositionSourceGated,
    },
    {
      testID: 'lesson-menu-theory',
      label: frenchTheorySourceGated
        ? triLang(lang, {
            ru: 'Теория',
            uk: 'Теорія',
            es: 'Teoría',
            en: 'Theory',
            "pt-BR": 'Teoria',
            vi: 'Lý thuyết đang được duyệt',
            id: 'Teori sedang ditinjau',
            tr: 'Teori',
            pl: 'Teoria',
          })
        : s.lessonMenu.theory,
      sub: frenchTheorySourceGated
        ? triLang(lang, {
            ru: 'Теория этого урока пока готовится. Скоро откроется.',
            uk: 'Теорія цього уроку ще готується. Скоро відкриється.',
            es: 'La teoría de esta lección se está preparando. Pronto estará disponible.',
            en: 'The theory for this lesson is being prepared. It will open soon.',
            "pt-BR": 'A teoria desta lição está sendo preparada. Em breve estará disponível.',
            vi: 'Lý thuyết của bài học này đang được chuẩn bị. Sắp ra mắt.',
            id: 'Teori pelajaran ini sedang disiapkan. Segera tersedia.',
            tr: 'Bu dersin teorisi hazırlanıyor. Yakında açılacak.',
            pl: 'Teoria tej lekcji jest w przygotowaniu. Wkrótce będzie dostępna.',
          })
        : triLang(lang, {
  ru: 'Правила и пояснения',
  uk: 'Правила та пояснення',
  es: 'Reglas y explicaciones',
  en: 'Rules and explanations',
  "pt-BR": 'Regras e explicações',
  vi: 'Quy tắc và giải thích',
  id: 'Aturan dan penjelasan',
  tr: 'Kurallar ve açıklamalar',
  pl: 'Zasady i wyjaśnienia',
}),
      icon: frenchTheorySourceGated ? 'shield-checkmark-outline' as const : 'list-outline' as const,
      // Кольцо отражает просмотренные разделы теории и не гейтит закрытие урока.
      pct: frenchTheorySourceGated ? undefined : theoryProgressPct,
      onPress: () => {
        hapticTap();
        if (frenchTheorySourceGated) {
          setSoonOpen('frenchTheory');
          return;
        }
        // зачем (координатор 12.10): маршрут теории по языку интерфейса — pt-BR/vi/id/tr/pl в lesson_help (их язык), en скрыт до решения владельца.
        const entry = theoryEntryFor(lang, isInteractiveTheoryLesson(lessonId), 'lesson_menu');
        if (entry === 'hidden') return;
        if (!navOnce(`lesson_menu:theory:${lessonId}`)) return; // зачем (аудит R58 #25, 15.10): двойной тап — одна теория
        router.push({ pathname: entry === 'hint' ? '/hint' : '/lesson_help', params: { id: lessonId } });
      },
      unavailable: frenchTheorySourceGated,
      // Своей теории для языка нет (английский) — пункт не показываем; список фильтрует hidden, пустой строки нет.
      hidden: theoryEntryFor(lang, isInteractiveTheoryLesson(lessonId), 'lesson_menu') === 'hidden',
    },
  ];

  // Урок закрыт — экран меню НЕ показываем ни в каком виде.
  // Премиум уводит на пейвол, уровень/прогресс — назад в список под модал
  // (оба редиректа живут в эффектах выше). Здесь только пустой фон, чтобы не
  // мелькал промежуточный кадр, пока навигация доигрывает.
  //
  // зачем (владелец 2026-09-21): тут стояла полноэкранная заглушка «Ещё рано»
  // со своей иконкой, текстом и кнопкой — фактически ВТОРОЙ экран отказа рядом
  // с модалом списка. Правило владельца: «модал и только модал, или пейвол если
  // фри». Заглушка удалена вместе со своими текстами; причину замка называет
  // модал в списке уроков, у него же лежит покупка за жемчужины.
  if (isLessonLocked) {
    // зачем (координатор 13.10): РЕШЕНИЯ ещё нет (`lockStateLoaded` ложно) — вместо пустого фона скелет меню: шапка урока (назад работает) и строки пунктов тех же размеров.
    // Решение «закрыто» (lockStateLoaded && isLessonLocked) по-прежнему рисует только фон — меню закрытого урока не показывается ни в каком виде. Скелет ничего не включает и не разрешает.
    if (!lockStateLoaded) {
      return (
        <ScreenGradient forceFullBleed>
          <LinearGradient pointerEvents="none" colors={[lessonMenuGlass.bgTop, lessonMenuGlass.bg, lessonMenuGlass.bgBottom]} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']} testID="lesson-menu-gate-pending">
            <ContentWrap>
              <View style={{ paddingHorizontal: V2.screenPad, paddingTop: 6, paddingBottom: 8 }}>
                <LessonMenuHeader
                  glass={lessonMenuGlass}
                  testID="lesson-menu-pending"
                  title={`${triLang(lang, { ru: 'Урок', uk: 'Урок', en: 'Lesson', es: 'Lección', 'pt-BR': 'Lição', vi: 'Bài', id: 'Pelajaran', tr: 'Ders', pl: 'Lekcja' })} ${lessonId}`} // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
                  subtitle={lessonCefrLabel}
                  onBack={() => { hapticTap(); safeRouterBack(router, '/(tabs)/home' as never); }}
                  backLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
                  right={<View style={{ width: 112, height: 30 }} />}
                />
              </View>
              <LessonMenuGateSkeleton glass={lessonMenuGlass} bottomInset={insets.bottom} />
            </ContentWrap>
          </SafeAreaView>
        </ScreenGradient>
      );
    }
    return (
      <ScreenGradient>
        <LessonArtBackdrop variant="menu" />
      </ScreenGradient>
    );
  }

  // зачем: тут стоял `return <View style={{flex:1}}/>` до окончания анимации перехода —
  // push доигрывал на пустом прозрачном экране, а вёрстка влетала уже после (главный
  // источник «прыжков» при входе в урок). Разметка не зависит от uiReady: имя урока,
  // плитки и хедер известны синхронно, поэтому рисуем финальный кадр сразу.
  // зачем (2.0, владелец 24.09): меню урока в новом стиле — ТОЛЬКО прежнее
  // содержимое (номер урока с уровнем, название, прогресс и звёзды, пункты, подсказка),
  // ничего нового из референсов не добавлено. Логика пунктов (menuItems) не тронута.
  return (
    <ScreenGradient forceFullBleed>
    <LinearGradient
      pointerEvents="none"
      colors={[lessonMenuGlass.bgTop, lessonMenuGlass.bg, lessonMenuGlass.bgBottom]}
      style={StyleSheet.absoluteFill}
    />
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
      <ContentWrap>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
      <View style={{ paddingHorizontal: V2.screenPad, paddingTop: 6, paddingBottom: 8 }}>
        <LessonMenuHeader
          glass={lessonMenuGlass}
          testID="lesson-menu"
          title={`${triLang(lang, { ru: 'Урок', uk: 'Урок', en: 'Lesson', es: 'Lección', 'pt-BR': 'Lição', vi: 'Bài', id: 'Pelajaran', tr: 'Ders', pl: 'Lekcja' })} ${lessonId}`} // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
          subtitle={lessonCefrLabel}
          onBack={() => {
            hapticTap();
            // Safe-back: после онбординга стек может быть пуст — возвращаемся на Главную.
            safeRouterBack(router, '/(tabs)/home' as never);
          }}
          backLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          right={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {menuEnergyReady ? (
              // зачем (learn.html B/C): меню урока на Liquid Glass — пилюля энергии стеклянная.
              <EnergyBar size={30} glass />
            ) : (
              <View
                testID="lesson-menu-energy-loading"
                // зачем (владелец 01.10: «никаких загружается»): пустое место под энергию — скрыто от чтения с экрана.
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                // зачем (владелец 01.10): у энергии нигде нет фона — место держим прозрачным, без капсулы.
                style={{ width: 60, height: 30 }}
              />
            )}
            <LessonMenuRoundButton
              glass={lessonMenuGlass}
              icon="settings-outline"
              testID="lesson-menu-settings"
              accessibilityLabel={triLang(lang, { ru: 'Настройки обучения', uk: 'Параметри навчання', en: 'Learning settings', es: 'Ajustes de aprendizaje', 'pt-BR': 'Configurações de estudo', vi: 'Cài đặt học', id: 'Pengaturan belajar', tr: 'Öğrenme ayarları', pl: 'Ustawienia nauki' })}
              onPress={() => { hapticTap(); if (!navOnce('lesson_menu:settings_edu')) return; router.push('/settings_edu'); }}
            />
            </View>
          )}
        />
      </View>

      <BouncyWrap>
      <ScrollView decelerationRate="fast" bounces alwaysBounceVertical overScrollMode="always" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: V2.screenPad, paddingBottom: Math.max(32, insets.bottom + 16), gap: 14 }} onScroll={onBouncyScroll} scrollEventThrottle={16}>
        {/* Реальный прогресс урока: 0–3 звезды, без старых медалей и десятичной оценки. */}
        <Text accessibilityRole="header" style={{ color: lessonMenuGlass.text, fontSize: 30, lineHeight: lh(36), fontWeight: '700', letterSpacing: -0.4, marginTop: 12 }}>{lessonName}</Text>
        {(() => {
          if (progress <= 0 && !scoreKnown) return null;
          const earnedStars = lessonMenuStarCount(score);
          return (
            <LessonMenuSummary
              glass={lessonMenuGlass}
              testID="lesson-menu-star-summary"
              accessibilityLabel={triLang(lang, {
                ru: `${progress}\u00A0из 50, ${earnedStars}\u00A0из 3 звёзд`,
                uk: `${progress}\u00A0із 50, ${earnedStars}\u00A0із 3 зірок`,
                en: `${progress}\u00A0of 50, ${earnedStars}\u00A0of 3 stars`,
                es: `${progress}\u00A0de 50, ${earnedStars}\u00A0de 3 estrellas`,
                'pt-BR': `${progress}\u00A0de 50, ${earnedStars}\u00A0de 3 estrelas`,
                vi: `${progress}\u00A0trên 50, ${earnedStars}\u00A0trên 3 sao`,
                id: `${progress}\u00A0dari 50, ${earnedStars}\u00A0dari 3 bintang`,
                tr: `50 üzerinden\u00A0${progress}, 3 yıldızdan\u00A0${earnedStars}`,
                pl: `${progress}\u00A0z 50, ${earnedStars}\u00A0z 3 gwiazdek`,
              })}
              progress={progress}
              earnedStars={earnedStars}
              // зачем (сверка learn-020 п.4, learn.html B): звёзды — только у пройденного урока; в процессе — полоса.
              showStars={scoreKnown && earnedStars > 0}
              unitLabel={triLang(lang, { ru: 'фраз', uk: 'висловів', en: 'phrases', es: 'frases', 'pt-BR': 'frases', vi: 'cụm từ', id: 'frasa', tr: 'ifade', pl: 'zwrotów' })}
            />
          );
        })()}

        {menuItems.filter(item => !item.hidden).map(item => (
          <LessonMenuRow
            key={item.testID}
            glass={lessonMenuGlass}
            testID={item.testID}
            icon={item.icon}
            title={item.label}
            subtitle={item.sub || undefined}
            dimmed={item.unavailable}
            disabled={item.disabled}
            onPress={() => {
              if (item.disabled) {
                lessonMenuTrace('row:tap_ignored', { row: item.testID, reason: 'disabled' });
                return;
              }
              lessonMenuTrace('row:tap', { row: item.testID });
              fk.tap();
              item.onPress();
            }}
            onLongPress={item.onLongPress && !item.disabled ? item.onLongPress : undefined}
          />
        ))}

        {/* зачем: подсказка перед уроком — «Небольшой совет» референса. */}
        {lessonPrepHintVisible && canShowLessonPrepHint && !isLessonLocked ? (
          <View testID="lesson-menu-prep-hint">
            <LessonMenuTip
              glass={lessonMenuGlass}
              icon="bulb-outline"
              title={triLang(lang, { ru: 'Небольшой совет', uk: 'Невелика порада', en: 'A quick tip', es: 'Un consejo', 'pt-BR': 'Uma dica', vi: 'Mẹo nhỏ', id: 'Tips singkat', tr: 'Küçük bir ipucu', pl: 'Mała wskazówka' })}
              body={lessonPrepHintText}
            />
          </View>
        ) : null}
      </ScrollView>
      </BouncyWrap>
      </Reanimated.View>
      {/* зачем (владелец 2026-09-21): здесь был модал блокировки ЭТОГО экрана.
          Он стал недостижим: при закрытом уроке экран меню больше не рисуется —
          ранний return выше уводит на пейвол (премиум) или назад в список
          (уровень/прогресс), где причину называет модал списка. Мёртвый модал
          удалён, чтобы не выглядел работающим запасным путём. */}
      {/* зачем (Сверка overlays-runtime 030–033, 05.10): «Скоро» — окно по центру (`.or-alert`) с белой «Закрыть»,
          а не шторка выбора со стрелкой «›». */}
      <GlassAlertDialog
        visible={soonOpen !== null}
        title={triLang(lang, {
  ru: 'Скоро',
  uk: 'Скоро',
  en: 'Coming soon',
  es: 'Próximamente',
  "pt-BR": 'Em breve',
  vi: 'Sắp có',
  id: 'Segera hadir',
  tr: 'Yakında',
  pl: 'Wkrótce',
})}
        message={
          soonOpen === 'frenchLesson'
            ? triLang(lang, {
  ru: 'Этот урок пока готовится. Мы откроем его, когда материал будет полностью готов.',
  uk: 'Цей урок ще готується. Ми відкриємо його, коли матеріал буде повністю готовий.',
  en: 'This lesson is still being prepared. We’ll unlock it once the material is fully ready.',
  es: 'Esta lección se está preparando. La abriremos cuando el material esté listo.',
  "pt-BR": 'Esta lição está sendo preparada. Vamos abri-la quando o material estiver pronto.',
  vi: 'Bài học này đang được chuẩn bị. Chúng tôi sẽ mở khi nội dung sẵn sàng.',
  id: 'Pelajaran ini sedang disiapkan. Akan kami buka saat materinya siap.',
  tr: 'Bu ders hazırlanıyor. Materyal tamamen hazır olunca açacağız.',
  pl: 'Ta lekcja jest w przygotowaniu. Otworzymy ją, gdy materiał będzie gotowy.',
})
            : soonOpen === 'frenchTheory'
              ? triLang(lang, {
  ru: 'Теория этого урока пока готовится. Мы откроем её, когда материал будет полностью готов.',
  uk: 'Теорія цього уроку ще готується. Ми відкриємо її, коли матеріал буде повністю готовий.',
  en: 'This lesson’s theory is still being prepared. We’ll unlock it once the material is fully ready.',
  es: 'La teoría de esta lección se está preparando. La abriremos cuando el material esté listo.',
  "pt-BR": 'A teoria desta lição está sendo preparada. Vamos abri-la quando o material estiver pronto.',
  vi: 'Lý thuyết của bài học này đang được chuẩn bị. Chúng tôi sẽ mở khi nội dung sẵn sàng.',
  id: 'Teori pelajaran ini sedang disiapkan. Akan kami buka saat materinya siap.',
  tr: 'Bu dersin teorisi hazırlanıyor. Materyal tamamen hazır olunca açacağız.',
  pl: 'Teoria tej lekcji jest w przygotowaniu. Otworzymy ją, gdy materiał będzie gotowy.',
})
            : soonOpen === 'vocab'
            ? triLang(lang, {
  ru: 'Словарь для этого урока скоро появится',
  uk: 'Словник для цього уроку ще готується',
  en: 'This lesson’s vocabulary is still being prepared.',
  es: 'El vocabulario de esta lección aún está en preparación.',
  "pt-BR": 'O vocabulário desta lição ainda está sendo preparado.',
  vi: 'Từ vựng cho bài học này vẫn đang được chuẩn bị.',
  id: 'Kosakata untuk pelajaran ini masih disiapkan.',
  tr: 'Bu dersin kelime listesi hâlâ hazırlanıyor.',
  pl: 'Słownictwo do tej lekcji jest jeszcze przygotowywane.',
})
            : soonOpen === 'verbs'
              ? triLang(lang, {
  ru: 'Материал для этого урока ещё готовится',
  uk: 'Матеріал для цього уроку ще готується',
  en: 'This lesson’s material is still being prepared.',
  es: 'El material de esta lección aún está en preparación.',
  "pt-BR": 'O material desta lição ainda está sendo preparado.',
  vi: 'Tài liệu cho bài học này vẫn đang được chuẩn bị.',
  id: 'Materi untuk pelajaran ini masih disiapkan.',
  tr: 'Bu dersin materyali hâlâ hazırlanıyor.',
  pl: 'Materiał do tej lekcji jest jeszcze przygotowywany.',
})
              : soonOpen === 'prepositions'
                ? triLang(lang, {
  ru: 'Тренажёр предлогов временно недоступен.',
  uk: 'Тренажер прийменників тимчасово недоступний.',
  en: 'The preposition trainer is temporarily unavailable.',
  es: 'La práctica de preposiciones no está disponible por ahora.',
  "pt-BR": 'O treino de preposições não está disponível no momento.',
  vi: 'Phần luyện giới từ hiện chưa khả dụng.',
  id: 'Latihan preposisi sementara tidak tersedia.',
  tr: 'Edat alıştırması şu anda kullanılamıyor.',
  pl: 'Trening przyimków jest chwilowo niedostępny.',
})
              : ''
        }
        actions={[{ label: triLang(lang, {
  ru: 'Закрыть',
  uk: 'Закрити',
  en: 'Close',
  es: 'Cerrar',
  "pt-BR": 'Fechar',
  vi: 'Đóng',
  id: 'Tutup',
  tr: 'Kapat',
  pl: 'Zamknij',
}), onPress: () => setSoonOpen(null) }]}
        onRequestClose={() => setSoonOpen(null)}
      />
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

export default LessonMenu;
