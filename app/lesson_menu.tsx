import React, { useEffect, useState, useCallback, useRef } from 'react';
import Reanimated from 'react-native-reanimated';
import TapScale from '../components/TapScale';
import { useBouncy, useBouncyStyle } from '../components/BouncyScrollView';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet, InteractionManager, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../components/SafeLinearGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { LESSONS_WITH_WORDS, WORD_COUNT_BY_LESSON, WORD_KEYS_BY_LESSON } from './lesson_words';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { LESSONS_WITH_IRREGULAR_VERBS, IRREGULAR_VERB_COUNT_BY_LESSON, IRREGULAR_VERBS_BY_LESSON } from './irregular_verbs_data';
import { getLessonPrepositionPack, hasLessonPrepositionDrillForTarget } from './lesson_prepositions';
import CircularProgress from '../components/CircularProgress';
import { getMedalTier, loadMedalInfo, getEarnedDots } from './medal_utils';
import {
  isLessonUnlockedByEarnedProgress,
  getLessonLockInfo,
  getLockMessageText,
  isLessonUnlockedByPremiumCourse,
} from './lesson_lock_system';
import { effectiveLessonStarScore } from './lesson_star_score';
import { perfScreenMount } from './perf-monitor';
import ThemedChoiceModal from '../components/ThemedChoiceModal';
import { emitAppEvent, onAppEvent } from './events';
import { isLessonFinishedOnce } from './mastery';
import { getVerifiedPremiumStatus } from './premium_guard';
import { lessonPaywallContext, requiresPremiumForLesson } from './monetization_policy';
import { getCourseLevelForLesson, getPreviousCourseLevel } from './course_levels';
import { getLessonScreenPrimed, primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import GoldBevel from '../components/GoldBevel';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';
import { lessonCefrLabelForStudyTarget, lessonNamesForStudyTarget } from './lesson_titles_for_study_target';
import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate';
import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate';
import { isInteractiveTheoryLesson } from './theory_topic_accents';
import {
  lastOpenedLessonKey,
  irregularVerbsGlobalKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonPrepositionProgressKey,
  lessonProgressKey,
  lessonTheoryXpClaimedKey,
  lessonWordsKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';

// Medal images
const MEDAL_IMAGES: Record<string, any> = {
  bronze:  require('../assets/images/levels/bronza.webp'),
  silver:  require('../assets/images/levels/serebro.webp'),
  gold:    require('../assets/images/levels/zoloto.webp'),
  ruby:    require('../assets/images/levels/rubin.webp'),
  emerald: require('../assets/images/levels/izumrud.webp'),
  diamond: require('../assets/images/levels/almaz.webp'),
};
type LessonMenuCache = {
  score: number;
  progress: number;
  progressArr: string[];
  wordsLearned: number;
  irregularLearned: number;
  prepositionAnswered: number;
  prepositionTotal: number;
  passCount: number;
};

const lessonMenuCacheById: Record<string, LessonMenuCache> = {};
const LESSON_MENU_PREP_HINT_SEEN_KEY = 'lesson_menu_prep_hint_seen_v1';

function lessonMenuCacheKey(lessonId: number, studyTarget?: RuntimeStudyTarget): string {
  return `${storageStudyTarget(studyTarget)}:${lessonId}`;
}

const emptyProgress = () => new Array(50).fill('empty');

function countAnsweredProgress(progressArr: string[]): number {
  return progressArr.filter(x => x === 'correct' || x === 'replay_correct' || x === 'wrong').length;
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
): Pick<LessonMenuCache, 'score' | 'progress' | 'progressArr'> {
  try {
    if (progressRaw) {
      const progressArr: string[] = JSON.parse(progressRaw);
      const denominator = Math.min(progressArr.length, 50);
      const { score, correctCount } = effectiveLessonStarScore(bestScoreRaw, progressRaw);
      return {
        score,
        progress: Math.min(correctCount, denominator),
        progressArr: progressArr.length === 50 ? progressArr : emptyProgress(),
      };
    }
  } catch { /* keep defaults */ }
  const bestScore = parseFloat(bestScoreRaw ?? '0') || 0;
  return { score: bestScore, progress: 0, progressArr: emptyProgress() };
}

function parseWordsLearned(lessonId: number, wordsRaw: string | null): number {
  try {
    if (!wordsRaw) return 0;
    const counts: Record<string, number> = JSON.parse(wordsRaw);
    const validKeys = WORD_KEYS_BY_LESSON[lessonId];
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
    const [entries, medalInfo] = await Promise.all([
      AsyncStorage.multiGet([
        progressKey,
        bestScoreKey,
        wordsKey,
        irregularKey,
        prepositionProgressKey,
      ]),
      loadMedalInfo(id, studyTarget),
    ]);
    const map = Object.fromEntries(entries) as Record<string, string | null>;
    const prep = parsePrepositionAnswered(id, map[prepositionProgressKey] ?? null, studyTarget);
    lessonMenuCacheById[lessonMenuCacheKey(id, studyTarget)] = {
      ...parseProgress(freshestProgressRaw(id, map[progressKey] ?? null, studyTarget), map[bestScoreKey] ?? null),
      wordsLearned: parseWordsLearned(id, map[wordsKey] ?? null),
      irregularLearned: parseIrregularLearned(id, map[irregularKey] ?? null),
      prepositionAnswered: prep.answered,
      prepositionTotal: prep.total,
      passCount: medalInfo.passCount,
    };
  } catch { /* prefetch should never block navigation */ }
}

export default function LessonMenu() {
  useEffect(() => { perfScreenMount('lesson_menu'); }, []);
  const router = useRouter();
  const { theme:t, f, themeMode } = useTheme();
  const { GestureWrap: BouncyWrap, stretch: bouncyStretch, onBouncyScroll } = useBouncy();
  const bouncyStyle = useBouncyStyle(bouncyStretch);
  const isLightTheme = false;
  const isGoldTheme = themeMode === 'gold';
  const isCompassTheme = false;
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
  ru: `Урок ${lessonId}`,
  uk: `Урок ${lessonId}`,
  es: `Lección ${lessonId}`,
  "pt-BR": `Lição ${lessonId}`,
  vi: `Bài ${lessonId}`,
  id: `Pelajaran ${lessonId}`,
  tr: `Ders ${lessonId}`,
  pl: `Lekcja ${lessonId}`,
});
  const lessonName = lessonNames[lessonId - 1] || defaultLessonTitle;
  const lessonCefrLabel = lessonCefrLabelForStudyTarget(lessonId, studyTarget);
  const cachedMenu = lessonMenuCacheById[lessonMenuCacheKey(lessonId, studyTarget)];
  const hideEnglishOnlyAuxiliary = studyTarget === 'fr';
  const frenchLessonSourceGated = !frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId);
  const frenchTheorySourceGated = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId);

  const [score,setScore] = useState(cachedMenu?.score ?? 0);
  const [progress,setProgress] = useState(cachedMenu?.progress ?? 0);
  const [, setProgressArr] = useState<string[]>(cachedMenu?.progressArr ?? emptyProgress());
  const [wordsLearned, setWordsLearned] = useState(cachedMenu?.wordsLearned ?? 0);
  const [irregularLearned, setIrregularLearned] = useState(cachedMenu?.irregularLearned ?? 0);
  const [prepositionAnswered, setPrepositionAnswered] = useState(cachedMenu?.prepositionAnswered ?? 0);
  const [prepositionTotal, setPrepositionTotal] = useState(cachedMenu?.prepositionTotal ?? 0);
  // Теория «пройдена» = XP за теорию урока забран (флаг theory_xp_claimed_{id}).
  // Нужно, чтобы у плитки «Теория» появилась галочка/кольцо — юзеры жаловались,
  // что теория «не ставит 100%» и думали, что из-за этого урок не закрывается
  // (баг-репорты theory_lesson_*). Урок по-прежнему завершается по 50/50 упражнениям.
  const [theoryClaimed, setTheoryClaimed] = useState(false);
  const [passCount, setPassCount] = useState(cachedMenu?.passCount ?? 0);
  const [dataLoaded, setDataLoaded] = useState(Boolean(cachedMenu));
  const [uiReady, setUiReady] = useState(Boolean(cachedMenu));
  const [soonOpen, setSoonOpen] = useState<null | 'frenchLesson' | 'frenchTheory' | 'vocab' | 'verbs' | 'prepositions'>(null);

  // Состояние блокировки урока
  const [isLessonLocked, setIsLessonLocked] = useState(false);
  const [lockStateLoaded, setLockStateLoaded] = useState(false);
  const [lockReason, setLockReason] = useState<'premium' | 'level' | 'progress'>('progress');
  const [lockInfo, setLockInfo] = useState<Awaited<ReturnType<typeof getLessonLockInfo>> | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  // Гард: премиум-пейвол открываем один раз, чтобы не зациклить редирект.
  const premiumPaywallDispatchedRef = useRef(false);

  // Премиум-урок: вместо промежуточной «заглушки про Premium» сразу открываем пейвол.
  // Сюда сходятся все in-screen guard'ы уроков (openLessonAccessGate → /lesson_menu),
  // поэтому это единая точка, где премиум-лок превращается в открытие пейвола.
  useEffect(() => {
    if (!lockStateLoaded || !isLessonLocked || lockReason !== 'premium') return;
    if (premiumPaywallDispatchedRef.current) return;
    premiumPaywallDispatchedRef.current = true;
    router.replace({
      pathname: '/premium_modal',
      params: {
        context: lessonPaywallContext(lessonId),
        lessons_done: String(Math.max(0, lessonId - 1)),
      },
    } as any);
  }, [lockStateLoaded, isLessonLocked, lockReason, lessonId, router]);

  // Служебный флаг первого завершения: после него основной CTA подписывается как replay.
  const [finishedOnce, setFinishedOnce] = useState(false);
  const [lessonPrepHintVisible, setLessonPrepHintVisible] = useState(false);

  const showReplayCta = finishedOnce && !isLessonLocked;
  const canShowLessonPrepHint = !hideEnglishOnlyAuxiliary && !frenchTheorySourceGated;
  const lessonPrepHintText = triLang(lang, {
    ru: 'Загляни в «Словарь» и «Теорию» — там правила, конструкции и новые слова урока. Вернуться можно в любой момент.',
    uk: 'Перед уроком можна зазирнути до «Словника» і потренувати нові слова. А в розділі «Теорія» докладно розібрані правила й конструкції. До цих матеріалів можна повернутися будь-коли.',
    es: 'Antes de la lección puedes abrir «Vocabulario» y practicar palabras nuevas. En «Teoría» encontrarás reglas y estructuras explicadas en detalle. Puedes volver a estos materiales en cualquier momento.',
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
    let cancelled = false;
    AsyncStorage.getItem(LESSON_MENU_PREP_HINT_SEEN_KEY)
      .then((seen) => {
        if (!cancelled) setLessonPrepHintVisible(seen !== '1');
      })
      .catch(() => {
        if (!cancelled) setLessonPrepHintVisible(true);
      });
    return () => { cancelled = true; };
  }, [canShowLessonPrepHint]);

  useEffect(() => {
    if (!lessonPrepHintVisible || !canShowLessonPrepHint || isLessonLocked || !lockStateLoaded) return;
    const timer = setTimeout(() => {
      void AsyncStorage.setItem(LESSON_MENU_PREP_HINT_SEEN_KEY, '1').catch(() => {});
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
    setLockStateLoaded(false);
    (async () => {
      try {
        const noLimits = await AsyncStorage.getItem('tester_no_limits');
        if (noLimits === 'true') {
          setIsLessonLocked(false);
          setLockReason('progress');
          setLockInfo(null);
          return;
        }

        const premiumNow = await getVerifiedPremiumStatus();

        if (!premiumNow && requiresPremiumForLesson(lessonId)) {
          setIsLessonLocked(true);
          setLockReason('premium');
          setLockInfo(await getLessonLockInfo(lessonId, studyTarget));
          return;
        }

        if (premiumNow) {
          const premiumUnlocked = await isLessonUnlockedByPremiumCourse(lessonId, studyTarget);
          setIsLessonLocked(!premiumUnlocked);
          setLockReason(premiumUnlocked ? 'progress' : 'level');
          setLockInfo(premiumUnlocked ? null : await getLessonLockInfo(lessonId, studyTarget));
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

          if (prevScore >= 2.5) {
            const { unlockLesson } = await import('./lesson_lock_system');
            await unlockLesson(lessonId, studyTarget);
            unlocked = true;
          }
        }

        setIsLessonLocked(!unlocked);
        if (!unlocked) {
          setLockReason('progress');
          const info = await getLessonLockInfo(lessonId, studyTarget);
          setLockInfo(info);
        } else {
          setLockInfo(null);
        }
      } finally {
        setLockStateLoaded(true);
      }
    })();
  }, [lessonId, studyTarget]);

  const loadProgress = useCallback(() => {
    const progressKey = lessonProgressKey(lessonId, studyTarget);
    const bestScoreKey = lessonBestScoreKey(lessonId, studyTarget);
    const wordsKey = lessonWordsKey(lessonId, studyTarget);
    const irregularKey = irregularVerbsGlobalKey(studyTarget);
    const prepositionProgressKey = lessonPrepositionProgressKey(lessonId, studyTarget);
    AsyncStorage.multiGet([
      progressKey,
      bestScoreKey,
    ]).then(entries => {
      const map = Object.fromEntries(entries) as Record<string, string | null>;
      const saved = freshestProgressRaw(lessonId, map[progressKey] ?? null, studyTarget);
      const bestRaw = map[bestScoreKey] ?? null;
      try {
        if (saved) {
          const p: string[] = JSON.parse(saved);
          const denominator = Math.min(p.length, 50);
          const { score: effectiveScore, correctCount } = effectiveLessonStarScore(bestRaw, saved);
          setScore(effectiveScore);
          setProgress(Math.min(correctCount, denominator));
          setProgressArr(p.length === 50 ? p : new Array(50).fill('empty'));
        } else {
          setScore(parseFloat(bestRaw ?? '0') || 0); setProgress(0);
          setProgressArr(new Array(50).fill('empty'));
        }
      } catch { setScore(parseFloat(bestRaw ?? '0') || 0); setProgress(0); setProgressArr(new Array(50).fill('empty')); }
      setDataLoaded(true);
    });
    loadMedalInfo(lessonId, studyTarget).then(info => setPassCount(info.passCount));
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
        const validKeys = WORD_KEYS_BY_LESSON[lessonId];
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
    }).catch(() => {
      const prep = parsePrepositionAnswered(lessonId, null, studyTarget);
      setPrepositionAnswered(prep.answered);
      setPrepositionTotal(prep.total);
    });
    AsyncStorage.getItem(lessonTheoryXpClaimedKey(lessonId, studyTarget))
      .then(v => setTheoryClaimed(v === '1' || v === 'true'))
      .catch(() => setTheoryClaimed(false));
  }, [lessonId, studyTarget]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setUiReady(true);
      void AsyncStorage.setItem(lastOpenedLessonKey(studyTarget), String(lessonId));
      loadLockState();
      // Не сбрасываем dataLoaded вслепую: это ломало мгновенный UI после prefetch и
      // оставляло пустые кольца до первого getItem(progress). Если кэш уже есть — сразу гидратим.
      const warm = lessonMenuCacheById[lessonMenuCacheKey(lessonId, studyTarget)];
      if (warm) {
        setScore(warm.score);
        setProgress(warm.progress);
        setProgressArr(warm.progressArr);
        setWordsLearned(warm.wordsLearned);
        setIrregularLearned(warm.irregularLearned);
        setPrepositionAnswered(warm.prepositionAnswered);
        setPrepositionTotal(warm.prepositionTotal);
        setPassCount(warm.passCount);
        setDataLoaded(true);
      } else {
        setDataLoaded(false);
      }
    });
    return () => task.cancel();
  }, [lessonId, loadLockState, studyTarget]);

  const openLessonFromMenu = useCallback(() => {
    if (frenchLessonSourceGated) {
      setSoonOpen('frenchLesson');
      return;
    }
    void (async () => {
      await primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});
      router.push({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu', ...planLessonParams } });
    })();
  }, [frenchLessonSourceGated, lessonId, router, studyTarget]);

  const handleStartLesson = useCallback(() => {
    if (frenchLessonSourceGated) {
      setSoonOpen('frenchLesson');
      return;
    }
    void (async () => {
      await primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});
      router.replace({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu', ...planLessonParams } });
    })();
  }, [frenchLessonSourceGated, lessonId, router, studyTarget]);

  const handleContinueLesson = openLessonFromMenu;

  const handleReplayIntroAndContinue = useCallback(() => {
    if (isLessonLocked) return;
    if (frenchLessonSourceGated) {
      setSoonOpen('frenchLesson');
      return;
    }
    void (async () => {
      await primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});
      router.push({
        pathname: '/lesson1',
        params: { id: lessonId, from: 'lesson_menu', replayIntro: '1', replayIntroAt: String(Date.now()) },
      });
    })();
  }, [frenchLessonSourceGated, isLessonLocked, lessonId, router, studyTarget]);

  const handleLockedLessonPress = useCallback(() => {
    hapticTap();
    setShowLockModal(true);
  }, []);

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
  ru: 'Материал на проверке',
  uk: 'Матеріал на перевірці',
  es: 'Material pendiente',
  "pt-BR": 'Material em revisão',
  vi: 'Nội dung đang chờ duyệt',
  id: 'Materi sedang ditinjau',
  tr: 'Materyal inceleniyor',
  pl: 'Materiał weryfikowany',
})
        : showReplayCta
        ? triLang(lang, {
  ru: 'Перепройти',
  uk: 'Перепройти',
  es: 'Repetir',
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
  "pt-BR": 'Esta lição está sendo preparada. Em breve estará disponível.',
  vi: 'Bài học này đang được chuẩn bị. Sắp ra mắt.',
  id: 'Pelajaran ini sedang disiapkan. Segera tersedia.',
  tr: 'Bu ders hazırlanıyor. Yakında açılacak.',
  pl: 'Ta lekcja jest w przygotowaniu. Wkrótce będzie dostępna.',
})
        : showReplayCta
        ? `${progress} / 50  ★ ${score.toFixed(1)}`
        : (isStarted
            ? `${progress} / 50  ★ ${score.toFixed(1)}`
            : s.lessonMenu.fromScratch),
      icon: frenchLessonSourceGated
        ? 'shield-checkmark-outline'
        : isLessonLocked
        ? 'lock-closed'
        : showReplayCta
          ? 'refresh-circle-outline'
          : (isStarted ? 'play-circle-outline' : 'rocket-outline'),
      pct: frenchLessonSourceGated || showReplayCta ? undefined : Math.round(progress / 50 * 100),
      onPress: isLessonLocked
        ? handleLockedLessonPress
        : frenchLessonSourceGated
          ? () => setSoonOpen('frenchLesson')
        : showReplayCta
          ? handleStartLesson
          : (isStarted
              ? handleContinueLesson
              : handleStartLesson),
      onLongPress: isStarted && !frenchLessonSourceGated && !isLessonLocked && !showReplayCta ? handleReplayIntroAndContinue : undefined,
      disabled: isLessonLocked,
      unavailable: frenchLessonSourceGated,
    },
    {
      testID: 'lesson-menu-words',
      hidden: hideEnglishOnlyAuxiliary,
      label: s.lessonMenu.vocab,
      sub: LESSONS_WITH_WORDS.has(lessonId)
        ? (() => {
            const total = WORD_COUNT_BY_LESSON[lessonId] ?? 0;
            if (total > 0) {
              return triLang(lang, {
                ru: `${wordsLearned}/${total} слов`,
                uk: `${wordsLearned}/${total} слів`,
                es: `${wordsLearned}/${total} palabras`,
                'pt-BR': `${wordsLearned}/${total} palavras`,
                vi: `${wordsLearned}/${total} từ`,
                id: `${wordsLearned}/${total} kata`,
                tr: `${wordsLearned}/${total} kelime`,
                pl: `${wordsLearned}/${total} słów`,
              });
            }
            return triLang(lang, {
              ru: 'Слова этого урока',
              uk: 'Слова цього уроку',
              es: 'Palabras de esta lección',
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
            'pt-BR': 'Palavras desta lição',
            vi: 'Từ vựng của bài này',
            id: 'Kosakata pelajaran ini',
            tr: 'Bu dersin kelimeleri',
            pl: 'Słowa z tej lekcji',
          }),
      icon: 'book-outline',
      pct: (() => {
        if (!LESSONS_WITH_WORDS.has(lessonId)) return undefined;
        const total = WORD_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0 ? Math.round(wordsLearned / total * 100) : undefined;
      })(),
      onPress: () => {
        if (LESSONS_WITH_WORDS.has(lessonId)) {
          router.push({ pathname: '/lesson_words', params: { id: lessonId, tab: 'list' } });
        } else {
          setSoonOpen('vocab');
        }
      },
    },
    {
      testID: 'lesson-menu-irregular-verbs',
      hidden: hideEnglishOnlyAuxiliary || !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId),
      label: s.lessonMenu.verbs,
      sub: LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)
        ? (() => {
            const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
            return total > 0
              ? triLang(lang, {
                  ru: `${irregularLearned}/${total} глаголов`,
                  uk: `${irregularLearned}/${total} дієслів`,
                  es: `${irregularLearned}/${total} verbos`,
                  'pt-BR': `${irregularLearned}/${total} verbos`,
                  vi: `${irregularLearned}/${total} động từ`,
                  id: `${irregularLearned}/${total} kata kerja`,
                  tr: `${irregularLearned}/${total} fiil`,
                  pl: `${irregularLearned}/${total} czasowników`,
                })
              : triLang(lang, {
                  ru: 'Неправильные глаголы урока',
                  uk: 'Неправильні дієслова уроку',
                  es: 'Formas verbales irregulares de esta lección',
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
            'pt-BR': 'Verbos irregulares desta lição',
            vi: 'Động từ bất quy tắc của bài này',
            id: 'Kata kerja tak beraturan pelajaran ini',
            tr: 'Bu dersin düzensiz fiilleri',
            pl: 'Czasowniki nieregularne z tej lekcji',
          }),
      icon: 'flash-outline' as const,
      pct: (() => {
        if (!LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) return undefined;
        const total = IRREGULAR_VERB_COUNT_BY_LESSON[lessonId] ?? 0;
        return total > 0 ? Math.round(irregularLearned / total * 100) : undefined;
      })(),
      onPress: () => {
        hapticTap();
        if (LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)) {
          router.push({ pathname: '/lesson_irregular_verbs', params: { id: lessonId } });
        } else {
          setSoonOpen('verbs');
        }
      },
    },
    {
      testID: 'lesson-menu-prepositions',
      hidden: !hasLessonPrepositionDrillForTarget(lessonId, studyTarget),
      label: triLang(lang, {
  ru: 'Тренажёр предлогов',
  uk: 'Тренажер прийменників',
  es: 'Práctica de preposiciones',
  "pt-BR": 'Treino de preposições',
  vi: 'Luyện giới từ',
  id: 'Latihan preposisi',
  tr: 'Edat alıştırması',
  pl: 'Trening przyimków',
}),
      sub: prepositionTotal > 0
        ? triLang(lang, {
            ru: `${prepositionAnswered}/${prepositionTotal} вызовов`,
            uk: `${prepositionAnswered}/${prepositionTotal} викликів`,
            es: `${prepositionAnswered}/${prepositionTotal} ejercicios`,
            'pt-BR': `${prepositionAnswered}/${prepositionTotal} exercícios`,
            vi: `${prepositionAnswered}/${prepositionTotal} bài tập`,
            id: `${prepositionAnswered}/${prepositionTotal} latihan`,
            tr: `${prepositionAnswered}/${prepositionTotal} alıştırma`,
            pl: `${prepositionAnswered}/${prepositionTotal} ćwiczeń`,
          })
        : triLang(lang, {
            ru: 'Предлоги этого урока',
            uk: 'Прийменники цього уроку',
            es: 'Preposiciones de esta lección',
            'pt-BR': 'Preposições desta lição',
            vi: 'Giới từ của bài này',
            id: 'Preposisi pelajaran ini',
            tr: 'Bu dersin edatları',
            pl: 'Przyimki z tej lekcji',
          }),
      icon: 'funnel-outline' as const,
      pct: prepositionTotal > 0 ? Math.round(prepositionAnswered / prepositionTotal * 100) : undefined,
      onPress: () => {
        hapticTap();
        if (hasLessonPrepositionDrillForTarget(lessonId, studyTarget)) {
          if (menuEnergyReady && !menuEnergyUnlimited && energy + bonusEnergy <= 0) {
            emitAppEvent('action_toast', {
              type: 'error',
              messageRu: 'Не хватает энергии. Подожди восстановления или используй бонусную.',
              messageUk: 'Недостатньо енергії. Дочекайтесь відновлення або використайте бонусну енергію.',
              messageEs: 'No tienes suficiente energía. Espera a que se recargue o usa energía bonus.',
            });
            return;
          }
          router.push({ pathname: '/preposition_drill', params: { id: lessonId } });
        } else {
          setSoonOpen('prepositions');
        }
      },
    },
    {
      testID: 'lesson-menu-theory',
      label: frenchTheorySourceGated
        ? triLang(lang, {
            ru: 'Теория на проверке',
            uk: 'Теорія на перевірці',
            es: 'Teoría en revisión',
            "pt-BR": 'Teoria em revisão',
            vi: 'Lý thuyết đang được duyệt',
            id: 'Teori sedang ditinjau',
            tr: 'Teori inceleniyor',
            pl: 'Teoria w trakcie weryfikacji',
          })
        : s.lessonMenu.theory,
      sub: frenchTheorySourceGated
        ? triLang(lang, {
            ru: 'Теория этого урока пока готовится. Скоро откроется.',
            uk: 'Теорія цього уроку ще готується. Скоро відкриється.',
            es: 'La teoría de esta lección se está preparando. Pronto estará disponible.',
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
  "pt-BR": 'Regras e explicações',
  vi: 'Quy tắc và giải thích',
  id: 'Aturan dan penjelasan',
  tr: 'Kurallar ve açıklamalar',
  pl: 'Zasady i wyjaśnienia',
}),
      icon: frenchTheorySourceGated ? 'shield-checkmark-outline' as const : 'book-outline' as const,
      // Кольцо/галочка на теории: 100% когда XP за теорию забран, иначе 0%.
      // Снимает путаницу «теория не ставит 100%» (баг-репорты). На теории «на
      // проверке» кольца нет. Завершение урока по-прежнему по 50/50 упражнениям —
      // это кольцо лишь отражает «теория прочитана», не гейтит закрытие урока.
      pct: frenchTheorySourceGated ? undefined : (theoryClaimed ? 100 : 0),
      onPress: () => {
        hapticTap();
        if (frenchTheorySourceGated) {
          setSoonOpen('frenchTheory');
          return;
        }
        // Уроки с новым интерактивным форматом → аккордеон-экран; остальные — старый lesson_help.
        if (isInteractiveTheoryLesson(lessonId)) {
          router.push({ pathname: '/lesson_theory_v2', params: { id: lessonId } });
          return;
        }
        router.push({ pathname: '/lesson_help', params: { id: lessonId } });
      },
      unavailable: frenchTheorySourceGated,
    },
  ];

  // Премиум-лок: заглушку не рисуем — редирект-эффект уже уводит на пейвол.
  // Возвращаем пустой фон, чтобы не мелькал промежуточный экран «доступно в Premium».
  if (isLessonLocked && lockReason === 'premium') {
    return (
      <ScreenGradient>
        <LessonArtBackdrop variant="menu" />
      </ScreenGradient>
    );
  }

  // Заглушка для заблокированного урока (уровень / прогресс)
  if (isLessonLocked) {
    const prevId = Math.max(1, lessonId - 1);
    const lessonLevel = getCourseLevelForLesson(lessonId);
    const prevLevel = getPreviousCourseLevel(lessonLevel);
    const lockedIcon = lockReason === 'premium'
      ? 'diamond-outline'
      : lockReason === 'level'
        ? 'school-outline'
        : 'lock-closed';
    const lockedTitle = lockReason === 'premium'
      ? triLang(lang, {
  ru: 'Premium',
  uk: 'Premium',
  es: 'Premium',
  "pt-BR": 'Premium',
  vi: 'Premium',
  id: 'Premium',
  tr: 'Premium',
  pl: 'Premium',
})
      : lockReason === 'level'
        ? triLang(lang, {
  ru: 'Уровень ещё не открыт',
  uk: 'Рівень поки закритий',
  es: 'Nivel bloqueado',
  "pt-BR": 'Nível bloqueado',
  vi: 'Cấp độ đang bị khóa',
  id: 'Level masih terkunci',
  tr: 'Seviye henüz kilitli',
  pl: 'Poziom jest jeszcze zablokowany',
})
        : triLang(lang, {
  ru: 'Урок заблокирован',
  uk: 'Урок заблоковано',
  es: 'Lección bloqueada',
  "pt-BR": 'Lição bloqueada',
  vi: 'Bài học bị khóa',
  id: 'Pelajaran terkunci',
  tr: 'Ders kilitli',
  pl: 'Lekcja zablokowana',
});
    const lockedMessage = lockReason === 'premium'
      ? triLang(lang, {
  ru: 'Этот урок доступен в Premium.',
  uk: 'Цей урок входить до Premium.',
  es: 'Esta lección forma parte de Premium.',
  "pt-BR": 'Esta lição faz parte do Premium.',
  vi: 'Bài học này thuộc Premium.',
  id: 'Pelajaran ini termasuk Premium.',
  tr: 'Bu ders Premium kapsamındadır.',
  pl: 'Ta lekcja jest częścią Premium.',
})
      : lockReason === 'level' && prevLevel
        ? triLang(lang, {
  ru: `Чтобы открыть уровень ${lessonLevel}, сначала сдай зачёт ${prevLevel}.`,
  uk: `Щоб відкрити рівень ${lessonLevel}, спочатку складіть залік ${prevLevel}.`,
  es: `Para abrir el nivel ${lessonLevel}, primero supera el examen de ${prevLevel}.`,
  "pt-BR": `Para abrir o nível ${lessonLevel}, primeiro passe no teste ${prevLevel}.`,
  vi: `Để mở cấp ${lessonLevel}, trước tiên hãy vượt qua bài kiểm tra ${prevLevel}.`,
  id: `Untuk membuka level ${lessonLevel}, selesaikan dulu ujian ${prevLevel}.`,
  tr: `${lessonLevel} seviyesini açmak için önce ${prevLevel} sınavını geç.`,
  pl: `Aby odblokować poziom ${lessonLevel}, najpierw zdaj test ${prevLevel}.`,
})
        : triLang(lang, {
  ru: `Пройдите урок ${prevId} с оценкой 2.5 или больше, чтобы открыть этот урок`,
  uk: `Пройдіть урок ${prevId} з оцінкою 2.5 або більше, щоб відкрити цей урок`,
  es: `Completa la lección ${prevId} con nota mínima de 2,5 para desbloquear esta lección`,
  "pt-BR": `Conclua a lição ${prevId} com nota 2,5 ou maior para desbloquear esta lição`,
  vi: `Hoàn thành bài ${prevId} với điểm 2.5 trở lên để mở bài này`,
  id: `Selesaikan pelajaran ${prevId} dengan nilai 2,5 atau lebih untuk membuka pelajaran ini`,
  tr: `Bu dersi açmak için ${prevId}. dersi 2.5 veya üzeri puanla bitir`,
  pl: `Ukończ lekcję ${prevId} z oceną 2,5 lub wyższą, aby odblokować tę lekcję`,
});
    const lockedButtonLabel = lockReason === 'premium'
      ? triLang(lang, {
  ru: 'Открыть Premium',
  uk: 'Отримати Premium',
  es: 'Obtener Premium',
  "pt-BR": 'Obter Premium',
  vi: 'Nhận Premium',
  id: 'Dapatkan Premium',
  tr: 'Premium al',
  pl: 'Zdobądź Premium',
})
      : lockReason === 'level' && prevLevel
        ? triLang(lang, {
  ru: `К зачёту ${prevLevel}`,
  uk: `До заліку ${prevLevel}`,
  es: `Ir al examen ${prevLevel}`,
  "pt-BR": `Ir para o teste ${prevLevel}`,
  vi: `Đến bài kiểm tra ${prevLevel}`,
  id: `Ke ujian ${prevLevel}`,
  tr: `${prevLevel} sınavına git`,
  pl: `Do testu ${prevLevel}`,
})
        : triLang(lang, {
  ru: `Перейти к уроку ${prevId}`,
  uk: `Перейти до уроку ${prevId}`,
  es: `Ir a la lección ${prevId}`,
  "pt-BR": `Ir para a lição ${prevId}`,
  vi: `Đi tới bài ${prevId}`,
  id: `Buka pelajaran ${prevId}`,
  tr: `${prevId}. derse git`,
  pl: `Przejdź do lekcji ${prevId}`,
});
    return (
      <ScreenGradient>
      <LessonArtBackdrop variant="menu" />
      <SafeAreaView style={{flex:1}}>
        <ContentWrap>
        {/* Хедер */}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:t.border}}>
          <PremiumCard level={1} onPress={()=>{
            hapticTap();
            // Safe-back: после онбординга стек может быть пуст — возвращаемся на список уроков.
            safeRouterBack(router, '/(tabs)/lessons' as any);
          }}
            style={{width:38,height:38,borderRadius:19}}
            innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
          >
            <Ionicons name="chevron-back" size={22} color={t.heroTextPrimary}/>
          </PremiumCard>
          <Text style={{color:t.heroTextPrimary,fontSize:f.body,fontWeight:'700',letterSpacing:0.5}}>
            {triLang(lang, {
  ru: 'УРОК',
  uk: 'УРОК',
  es: 'LECCIÓN',
  "pt-BR": 'LIÇÃO',
  vi: 'BÀI',
  id: 'PELAJARAN',
  tr: 'DERS',
  pl: 'LEKCJA',
})} {lessonId}
          </Text>
          <View style={{width:38}}/>
        </View>

        {/* Заглушка */}
        <View style={{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:32}}>
          <LinearGradient
            colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : isCompassTheme ? COMPASS_GRADIENTS.raisedTile : [t.bgCard, t.bgCard, t.bgCard]}
            locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            width:90,height:90,borderRadius:isCompassTheme ? 16 : 45,
            backgroundColor:isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
            borderWidth:1,borderColor:isGoldTheme ? GOLD_RICH.hairline : isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
            justifyContent:'center',alignItems:'center',
            marginBottom:24,
            shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.2,shadowRadius:8,elevation:6,
            overflow:'hidden',
            ...(isGoldTheme ? goldShadow(2) : isCompassTheme ? compassShadow(2) : {}),
          }}>
            {isGoldTheme && <GoldBevel radius={45} intensity="normal" />}
            {isCompassTheme && <CompassDepthSurface radius={16} selected />}
            <Ionicons name={lockedIcon} size={40} color={isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? COMPASS_RICH.champagne : t.textMuted}/>
          </LinearGradient>
          <Text style={{color:t.heroTextPrimary,fontSize:f.h2,fontWeight:'700',textAlign:'center',marginBottom:12}}>
            {lockedTitle}
          </Text>
          <Text style={{color:t.heroTextMuted,fontSize:f.bodyLg,textAlign:'center',lineHeight:24,marginBottom:32}}>
            {lockedMessage}
          </Text>
          <PremiumCard level={2}
            onPress={() => {
              hapticTap();
              if (lockReason === 'premium') {
                router.push({
                  pathname: '/premium_modal',
                  params: {
                    context: lessonPaywallContext(lessonId),
                    lessons_done: String(Math.max(0, lessonId - 1)),
                  },
                } as any);
              } else if (lockReason === 'level' && prevLevel) {
                // Свапаем заблокированное по уровню меню на зачёт. Без пометки replace
                // это меню осталось бы в стеке и «назад» из зачёта возвращало бы на тот же
                // заблокированный экран, снова предлагающий этот зачёт → петля.
                markNextNavigationAsReplace();
                router.replace({ pathname: '/level_exam', params: { level: prevLevel } });
              } else {
                void (async () => {
                  await prefetchLessonMenuCache(prevId, studyTarget);
                  markNextNavigationAsReplace();
                  router.replace({ pathname: '/lesson_menu', params: { id: prevId } });
                })();
              }
            }}
            innerStyle={{paddingHorizontal:28,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:10}}
          >
            <Ionicons
              name={lockReason === 'premium' ? 'diamond-outline' : lockReason === 'level' ? 'school-outline' : 'arrow-back-outline'}
              size={20}
              color={t.textPrimary}
            />
            <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'600'}} numberOfLines={1}>
              {lockedButtonLabel}
            </Text>
          </PremiumCard>
        </View>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!uiReady && !cachedMenu) {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <ScreenGradient>
    <LessonArtBackdrop variant="menu" />
    <SafeAreaView style={{flex:1}}>
      <ContentWrap>
      <Reanimated.View style={[{ flex: 1 }, bouncyStyle]}>
      {/* Хедер */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <PremiumCard testID="lesson-menu-back" level={1} onPress={()=>{
          hapticTap();
          // Safe-back: после онбординга стек может быть пуст — возвращаемся на список уроков.
          safeRouterBack(router, '/(tabs)/lessons' as any);
        }}
          style={{width:38,height:38,borderRadius:19}}
          innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
        >
          <Ionicons name="chevron-back" size={22} color={t.heroTextPrimary}/>
        </PremiumCard>
        <Text style={{color:t.heroTextPrimary,fontSize: f.body,fontWeight:'700',letterSpacing:0.5}}>
          {triLang(lang, {
  ru: 'УРОК',
  uk: 'УРОК',
  es: 'LECCIÓN',
  "pt-BR": 'LIÇÃO',
  vi: 'BÀI',
  id: 'PELAJARAN',
  tr: 'DERS',
  pl: 'LEKCJA',
})} {lessonId}{'  '}<Text style={{fontSize: f.label,fontWeight:'700',color:
            lessonId<=8  ? (isLightTheme?'#86EFAC':'#4CAF72') :
            lessonId<=18 ? (isLightTheme?'#93C5FD':'#40B4E8') :
            lessonId<=28 ? (isLightTheme?'#FDE047':'#D4A017') :
                           (isLightTheme?'#FCA5A5':'#DC6428')
          }}>{lessonCefrLabel}</Text>
        </Text>
        <EnergyBar size={30} />
        <PremiumCard level={1} onPress={()=>{ hapticTap(); router.push('/settings_edu'); }}
          style={{width:38,height:38,borderRadius:19,marginLeft:8}}
          innerStyle={{width:38,height:38,borderRadius:19,justifyContent:'center',alignItems:'center'}}
        >
          <Ionicons name="settings-outline" size={20} color={t.heroTextMuted}/>
        </PremiumCard>
      </View>

      <BouncyWrap>
      <ScrollView decelerationRate="normal" bounces alwaysBounceVertical overScrollMode="always" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} onScroll={onBouncyScroll} scrollEventThrottle={16}>
      {/* Тема урока */}
      <Text style={{color:t.heroTextMuted,fontSize: f.bodyLg,textAlign:'center',marginTop:20,marginHorizontal:30,lineHeight:24}}>
        {lessonName}
      </Text>

      {/* Медали прогресса */}
      <View style={{alignItems:'center',marginTop:12,marginBottom:8}}>
        {(() => {
          const earnedDots = getEarnedDots(getMedalTier(score), passCount);
          const medalSize = 60;
          const gap = 8;
          return (
            <View style={{gap:8}}>
              <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap, alignItems:'center'}}>
                {earnedDots.map((dot, i) => (
                  <View key={i} style={{
                    width: medalSize,
                    height: medalSize,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 4,
                  }}>
                    <Image
                      source={MEDAL_IMAGES[dot]}
                      style={{ width: medalSize, height: medalSize }}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </View>
              {progress > 0 && (
                <Text style={{color:t.heroTextMuted,fontSize:f.caption,textAlign:'center'}}>
                  {progress}/50  ★ {score.toFixed(1)}
                </Text>
              )}
            </View>
          );
        })()}
      </View>

      {/* Меню */}
      <View style={{paddingHorizontal:16,gap:10}}>
        {menuItems.filter(item => !item.hidden).map((item)=>(
          <PremiumCard key={item.testID} testID={item.testID} level={2} onPress={() => {
            if (item.disabled) return;
            hapticTap();
            item.onPress();
          }}
            onLongPress={item.onLongPress && !item.disabled ? item.onLongPress : undefined}
            delayLongPress={550}
            innerStyle={{
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: (item.disabled || item.unavailable) ? 0.5 : 1,
            }}
          >
            {item.pct !== undefined && dataLoaded ? (
              <CircularProgress
                pct={item.pct}
                size={44}
                sw={4}
                color={t.accent}
                bg={t.bgSurface}
                textColor={t.textPrimary}
                fontSize={9}
              />
            ) : item.pct !== undefined ? (
              <LinearGradient
                colors={isGoldTheme ? GOLD_GRADIENTS.mutedPanel : isCompassTheme ? COMPASS_GRADIENTS.recessedPanel : [t.bgSurface, t.bgSurface, t.bgSurface]}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                width:44,height:44,borderRadius:isCompassTheme ? 9 : 22,
                backgroundColor:isCompassTheme ? COMPASS_RICH.charcoal : t.bgSurface,
                borderWidth:StyleSheet.hairlineWidth,borderColor:isGoldTheme ? GOLD_RICH.hairlineQuiet : isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                overflow:'hidden',
              }}>
                {isGoldTheme && <GoldBevel radius={22} intensity="quiet" />}
                {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={isGoldTheme
                  ? (item.disabled || item.unavailable ? GOLD_GRADIENTS.mutedPanel : GOLD_GRADIENTS.raisedTile)
                  : isCompassTheme
                    ? ((item.disabled || item.unavailable) ? COMPASS_GRADIENTS.recessedPanel : COMPASS_GRADIENTS.raisedTile)
                  : [((item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface), ((item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface), ((item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface)]}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                width:44,height:44,borderRadius:isCompassTheme ? 9 : 22,
                backgroundColor: isCompassTheme ? ((item.disabled || item.unavailable) ? COMPASS_RICH.charcoal : COMPASS_RICH.charcoalRaised) : (item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface,
                borderTopWidth:0.5, borderLeftWidth:0.5,
                borderRightWidth:0.5, borderBottomWidth:0.5,
                borderTopColor:isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? COMPASS_RICH.edgeLight : t.borderHighlight, borderLeftColor:isGoldTheme ? GOLD_RICH.hairline : isCompassTheme ? COMPASS_RICH.hairline : t.borderHighlight,
                borderRightColor:isGoldTheme ? GOLD_RICH.hairlineQuiet : isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border, borderBottomColor:isGoldTheme ? GOLD_RICH.hairlineDark : isCompassTheme ? COMPASS_RICH.edgeShade : t.border,
                justifyContent:'center', alignItems:'center',
                overflow:'hidden',
              }}>
                {isGoldTheme && <GoldBevel radius={22} intensity={(item.disabled || item.unavailable) ? 'quiet' : 'normal'} />}
                {isCompassTheme && <CompassDepthSurface radius={9} quiet={item.disabled || item.unavailable} />}
                <Ionicons name={item.icon} size={22} color={(item.disabled || item.unavailable) ? t.textGhost : isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? COMPASS_RICH.champagne : t.textSecond}/>
              </LinearGradient>
            )}
            <View style={{flex:1}}>
              <Text style={{color:(item.disabled || item.unavailable) ? t.textGhost : t.textPrimary,fontSize: f.bodyLg,fontWeight:'600'}}>{item.label}</Text>
              <Text style={{color:t.textMuted,fontSize: f.sub,marginTop:3}}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={item.disabled ? t.textGhost : t.textGhost}/>
          </PremiumCard>
        ))}
      </View>

      {lessonPrepHintVisible && canShowLessonPrepHint && !isLessonLocked && lockStateLoaded ? (
        <View testID="lesson-menu-prep-hint" style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <LinearGradient
            colors={isGoldTheme ? GOLD_GRADIENTS.mutedPanel : isCompassTheme ? COMPASS_GRADIENTS.recessedPanel : ['rgba(255,255,255,0.070)', 'rgba(255,255,255,0.045)', 'rgba(255,255,255,0.035)']}
            locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: isCompassTheme ? 10 : 18,
              borderWidth: 1,
              borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              overflow: 'hidden',
            }}
          >
            {isGoldTheme && <GoldBevel radius={18} intensity="quiet" />}
            {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: isCompassTheme ? 8 : 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : isGoldTheme ? 'rgba(232,195,108,0.10)' : t.bgSurface,
                borderWidth: 1,
                borderColor: isGoldTheme ? GOLD_RICH.hairlineQuiet : isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? COMPASS_RICH.champagne : t.accent}
              />
            </View>
            <Text style={{ flex: 1, color: t.heroTextMuted, fontSize: f.sub, lineHeight: 20 }}>
              {lessonPrepHintText}
            </Text>
          </LinearGradient>
        </View>
      ) : null}

      </ScrollView>
      </BouncyWrap>
      </Reanimated.View>
      {/* Модальное окно блокировки */}
      <Modal transparent animationType="fade" visible={showLockModal} onRequestClose={() => setShowLockModal(false)}>
        <Pressable style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)'}} onPress={() => setShowLockModal(false)}>
          <View style={{flex:1, justifyContent:'flex-end'}}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <LinearGradient
                colors={isGoldTheme ? GOLD_GRADIENTS.premiumPanel : isCompassTheme ? COMPASS_GRADIENTS.premiumPanel : [t.bgCard, t.bgCard, t.bgCard]}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                backgroundColor:isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderTopLeftRadius:isCompassTheme ? 14 : 24, borderTopRightRadius:isCompassTheme ? 14 : 24,
                padding:28, paddingBottom:40,
                borderTopWidth:0.5, borderColor:isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                alignItems:'center',
                overflow:'hidden',
                ...(isCompassTheme ? compassShadow(3) : {}),
              }}>
                {isGoldTheme && <GoldBevel radius={24} intensity="strong" />}
                {isCompassTheme && <CompassDepthSurface radius={14} selected />}
                <LinearGradient
                  colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : isCompassTheme ? COMPASS_GRADIENTS.raisedTile : [t.bgSurface, t.bgSurface, t.bgSurface]}
                  locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: isCompassTheme ? 12 : 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? COMPASS_RICH.hairlineStrong : t.border,
                    overflow: 'hidden',
                    ...(isCompassTheme ? compassShadow(1) : {}),
                  }}
                >
                  {isGoldTheme && <GoldBevel radius={32} intensity="normal" />}
                  {isCompassTheme && <CompassDepthSurface radius={12} />}
                  <Ionicons name="lock-closed" size={30} color={isGoldTheme ? GOLD_RICH.champagne : isCompassTheme ? COMPASS_RICH.champagne : t.textMuted} />
                </LinearGradient>
                <Text style={{color:t.textPrimary, fontSize:f.h2, fontWeight:'700', textAlign:'center', marginBottom:12}}>
                  {triLang(lang, {
  ru: 'Урок заблокирован',
  uk: 'Урок заблоковано',
  es: 'Lección bloqueada',
  "pt-BR": 'Lição bloqueada',
  vi: 'Bài học bị khóa',
  id: 'Pelajaran terkunci',
  tr: 'Ders kilitli',
  pl: 'Lekcja zablokowana',
})}
                </Text>
                <Text style={{color:t.textMuted, fontSize:f.body, textAlign:'center', marginBottom:28, lineHeight:22}}>
                  {lockInfo ? getLockMessageText(lockInfo, lang) : ''}
                </Text>
                <TapScale scaleTo={0.96}
                  style={{
                    backgroundColor:isCompassTheme ? COMPASS_RICH.champagne : t.accent,
                    borderRadius:isCompassTheme ? 9 : 14, padding:16, width:'100%', alignItems:'center',
                    overflow:'hidden',
                    borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : 0,
                    borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
                    ...(isCompassTheme ? compassShadow(1) : {}),
                  }}
                  onPress={() => {
                    hapticTap();
                    setShowLockModal(false);
                  }}
                >
                  {isGoldTheme && (
                    <>
                      <LinearGradient colors={GOLD_GRADIENTS.primaryButton} locations={[0, 0.36, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                      <GoldBevel radius={14} intensity="strong" />
                    </>
                  )}
                  {isCompassTheme && <CompassDepthSurface radius={9} cream />}
                  <Text style={{color:isCompassTheme ? COMPASS_RICH.textDark : t.correctText, fontSize:f.body, fontWeight:'700'}}>
                    {triLang(lang, {
  ru: 'Понимаю',
  uk: 'Розумію',
  es: 'Entendido',
  "pt-BR": 'Entendi',
  vi: 'Tôi hiểu',
  id: 'Mengerti',
  tr: 'Anladım',
  pl: 'Rozumiem',
})}
                  </Text>
                </TapScale>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <ThemedChoiceModal
        visible={soonOpen !== null}
        title={triLang(lang, {
  ru: 'Скоро',
  uk: 'Скоро',
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
  uk: 'Словник для цього урока ще готується',
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
  es: 'La práctica de preposiciones no está disponible por ahora.',
  "pt-BR": 'O treino de preposições não está disponível no momento.',
  vi: 'Phần luyện giới từ hiện chưa khả dụng.',
  id: 'Latihan preposisi sementara tidak tersedia.',
  tr: 'Edat alıştırması şu anda kullanılamıyor.',
  pl: 'Trening przyimków jest chwilowo niedostępny.',
})
              : ''
        }
        choices={[{ label: triLang(lang, {
  ru: 'Закрыть',
  uk: 'Закрити',
  es: 'Cerrar',
  "pt-BR": 'Fechar',
  vi: 'Đóng',
  id: 'Tutup',
  tr: 'Kapat',
  pl: 'Zamknij',
}), onPress: () => {} }]}
        onRequestClose={() => setSoonOpen(null)}
      />
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
