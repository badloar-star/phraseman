import React, { useEffect, useState, useCallback } from 'react';
import { Image, View, Text, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
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
import { LESSONS_WITH_IRREGULAR_VERBS, IRREGULAR_VERB_COUNT_BY_LESSON, IRREGULAR_VERBS_BY_LESSON } from './irregular_verbs_data';
import { getLessonPrepositionPack, hasLessonPrepositionDrillForTarget } from './lesson_prepositions';
import CircularProgress from '../components/CircularProgress';
import { getMedalTier, getNextMedalHint, loadMedalInfo, getEarnedDots } from './medal_utils';
import {
  isLessonUnlocked,
  getLessonLockInfo,
  getLockMessageText,
  isLessonUnlockedByPremiumCourse,
} from './lesson_lock_system';
import { effectiveLessonStarScore } from './lesson_star_score';
import { perfScreenMount } from './perf-monitor';
import ThemedChoiceModal from '../components/ThemedChoiceModal';
import { emitAppEvent, onAppEvent } from './events';
import { isLessonFinishedOnce, getMasteryReplayPriceShards, MASTERY_REPLAY_BASE_SHARDS } from './mastery';
import MasteryReplayModal from '../components/MasteryReplayModal';
import { getVerifiedPremiumStatus } from './premium_guard';
import { oskolokImageForPackShards } from './oskolok';
import { isFreeLesson, lessonPaywallContext, requiresPremiumForLesson } from './monetization_policy';
import { getCourseLevelForLesson, getPreviousCourseLevel } from './course_levels';
import { getLessonScreenPrimed, primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import GoldBevel from '../components/GoldBevel';
import { lessonCefrLabelForStudyTarget, lessonNamesForStudyTarget } from './lesson_titles_for_study_target';
import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate';
import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate';
import {
  lastOpenedLessonKey,
  irregularVerbsGlobalKey,
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonPrepositionProgressKey,
  lessonProgressKey,
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
  const isLightTheme = false;
  const isGoldTheme = themeMode === 'gold';
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { energy, bonusEnergy, isUnlimited: menuEnergyUnlimited, energyReady: menuEnergyReady } = useEnergy();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = (Array.isArray(idParam) ? idParam[0] : idParam) || '1';
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
  const [passCount, setPassCount] = useState(cachedMenu?.passCount ?? 0);
  const [dataLoaded, setDataLoaded] = useState(Boolean(cachedMenu));
  const [soonOpen, setSoonOpen] = useState<null | 'frenchLesson' | 'frenchTheory' | 'vocab' | 'verbs' | 'prepositions'>(null);

  // Состояние блокировки урока
  const [isLessonLocked, setIsLessonLocked] = useState(false);
  const [lockReason, setLockReason] = useState<'premium' | 'level' | 'progress'>('progress');
  const [lockInfo, setLockInfo] = useState<Awaited<ReturnType<typeof getLessonLockInfo>> | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // Mastery: первый проход урока был → следующий запуск платный (или premium бесплатно)
  const [finishedOnce, setFinishedOnce] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showMasteryModal, setShowMasteryModal] = useState(false);
  const [masteryReplayPrice, setMasteryReplayPrice] = useState(MASTERY_REPLAY_BASE_SHARDS);

  const showMasteryPaywall = finishedOnce && !isPremium && !isLessonLocked;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      isLessonFinishedOnce(lessonId, studyTarget),
      getVerifiedPremiumStatus(),
    ]).then(([fin, prem]) => {
      if (cancelled) return;
      setFinishedOnce(fin);
      setIsPremium(prem);
    });
    return () => { cancelled = true; };
  }, [lessonId, studyTarget]);

  useEffect(() => {
    if (!showMasteryPaywall) return;
    let cancelled = false;
    void getMasteryReplayPriceShards(lessonId, studyTarget).then((p) => {
      if (!cancelled) setMasteryReplayPrice(p);
    });
    return () => { cancelled = true; };
  }, [lessonId, showMasteryPaywall, finishedOnce, isPremium, studyTarget]);

  useEffect(() => {
    const sub = onAppEvent('lesson_replay_started', (payload) => {
      if (payload?.lessonId !== lessonId) return;
      if ((payload.studyTarget ?? 'en') !== storageStudyTarget(studyTarget)) return;
      void getMasteryReplayPriceShards(lessonId, studyTarget).then(setMasteryReplayPrice);
    });
    return () => sub.remove();
  }, [lessonId, studyTarget]);

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
    (async () => {
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      if (noLimits === 'true') {
        setIsLessonLocked(false);
        setLockReason('progress');
        setLockInfo(null);
        return;
      }

      const premiumNow = await getVerifiedPremiumStatus();
      setIsPremium(premiumNow);

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

      if (isFreeLesson(lessonId)) {
        setIsLessonLocked(false);
        setLockReason('progress');
        setLockInfo(null);
        return;
      }

      let unlocked = await isLessonUnlocked(lessonId, studyTarget);
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
  }, [lessonId, studyTarget]);

  useEffect(() => {
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
  }, [lessonId, loadLockState, studyTarget]);

  const openLessonFromMenu = useCallback(() => {
    if (frenchLessonSourceGated) {
      setSoonOpen('frenchLesson');
      return;
    }
    void (async () => {
      await primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});
      router.push({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu' } });
    })();
  }, [frenchLessonSourceGated, lessonId, router, studyTarget]);

  const handleStartLesson = useCallback(() => {
    if (frenchLessonSourceGated) {
      setSoonOpen('frenchLesson');
      return;
    }
    void (async () => {
      await primeLessonScreenFromStorage(lessonId, studyTarget).catch(() => {});
      router.replace({ pathname: '/lesson1', params: { id: lessonId, from: 'lesson_menu' } });
    })();
  }, [frenchLessonSourceGated, lessonId, router, studyTarget]);

  const handleContinueLesson = openLessonFromMenu;

  const handleReplayIntroAndContinue = useCallback(() => {
    if (isLessonLocked || showMasteryPaywall) return;
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
  }, [frenchLessonSourceGated, isLessonLocked, lessonId, router, showMasteryPaywall, studyTarget]);

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
    /** Бейдж «цена в осколках» в правом нижнем углу карточки (перепрохождение). */
    cornerShardPrice?: number;
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
        : showMasteryPaywall
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
  ru: 'French откроется после source gate. English фразы не подставляются.',
  uk: 'French відкриється після source gate. English фрази не підставляються.',
  es: 'French se abrirá después del source gate.',
  "pt-BR": 'French será aberto após o source gate.',
  vi: 'French sẽ mở sau source gate.',
  id: 'French akan dibuka setelah source gate.',
  tr: 'French source gate sonrası açılacak.',
  pl: 'French otworzy się po source gate.',
})
        : showMasteryPaywall
        ? (isStarted
            ? `${progress} / 50  ★ ${score.toFixed(1)}`
            : triLang(lang, {
  ru: 'Условия повтора — в окне ниже',
  uk: 'Умови повтору — у вікні нижче',
  es: 'Condiciones de repetición — en el diálogo',
  "pt-BR": 'Condições de repetição — na janela abaixo',
  vi: 'Điều kiện học lại nằm trong cửa sổ bên dưới',
  id: 'Syarat pengulangan ada di jendela bawah',
  tr: 'Tekrar koşulları aşağıdaki pencerede',
  pl: 'Warunki powtórki są w oknie poniżej',
}))
        : (isStarted
            ? `${progress} / 50  ★ ${score.toFixed(1)}`
            : s.lessonMenu.fromScratch),
      icon: frenchLessonSourceGated
        ? 'shield-checkmark-outline'
        : isLessonLocked
        ? 'lock-closed'
        : showMasteryPaywall
          ? 'refresh-circle-outline'
          : (isStarted ? 'play-circle-outline' : 'rocket-outline'),
      pct: frenchLessonSourceGated || showMasteryPaywall ? undefined : Math.round(progress / 50 * 100),
      cornerShardPrice: showMasteryPaywall ? masteryReplayPrice : undefined,
      onPress: isLessonLocked
        ? handleLockedLessonPress
        : frenchLessonSourceGated
          ? () => setSoonOpen('frenchLesson')
        : showMasteryPaywall
          ? () => { hapticTap(); setShowMasteryModal(true); }
          : (isStarted
              ? handleContinueLesson
              : handleStartLesson),
      onLongPress: isStarted && !frenchLessonSourceGated && !isLessonLocked && !showMasteryPaywall ? handleReplayIntroAndContinue : undefined,
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
            ru: `${prepositionAnswered}/${prepositionTotal} заданий`,
            uk: `${prepositionAnswered}/${prepositionTotal} завдань`,
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
              messageRu: 'Недостаточно энергии. Дождитесь восстановления или используйте бонусную энергию.',
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
            es: 'Theory under review',
            "pt-BR": 'Theory under review',
            vi: 'Theory under review',
            id: 'Theory under review',
            tr: 'Theory under review',
            pl: 'Theory under review',
          })
        : s.lessonMenu.theory,
      sub: frenchTheorySourceGated
        ? triLang(lang, {
            ru: 'French theory откроется после source gate. English theory не подставляется.',
            uk: 'French theory відкриється після source gate. English theory не підставляється.',
            es: 'French theory opens after source gate.',
            "pt-BR": 'French theory opens after source gate.',
            vi: 'French theory opens after source gate.',
            id: 'French theory opens after source gate.',
            tr: 'French theory opens after source gate.',
            pl: 'French theory opens after source gate.',
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
      onPress: () => {
        hapticTap();
        if (frenchTheorySourceGated) {
          setSoonOpen('frenchTheory');
          return;
        }
        router.push({ pathname: '/lesson_help', params: { id: lessonId } });
      },
      unavailable: frenchTheorySourceGated,
    },
  ];

  // Заглушка для заблокированного урока
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
  ru: 'Уровень пока закрыт',
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
  ru: 'Этот урок входит в Premium.',
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
  ru: `Чтобы открыть уровень ${lessonLevel}, сначала сдайте зачёт ${prevLevel}.`,
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
  ru: 'Получить Premium',
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
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/lessons' as any);
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
            colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : [t.bgCard, t.bgCard, t.bgCard]}
            locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
            width:90,height:90,borderRadius:45,
            backgroundColor:t.bgCard,
            borderWidth:1,borderColor:isGoldTheme ? GOLD_RICH.hairline : t.border,
            justifyContent:'center',alignItems:'center',
            marginBottom:24,
            shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.2,shadowRadius:8,elevation:6,
            overflow:'hidden',
            ...(isGoldTheme ? goldShadow(2) : {}),
          }}>
            {isGoldTheme && <GoldBevel radius={45} intensity="normal" />}
            <Ionicons name={lockedIcon} size={40} color={isGoldTheme ? GOLD_RICH.champagne : t.textMuted}/>
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
                router.replace({ pathname: '/level_exam', params: { level: prevLevel } });
              } else {
                void (async () => {
                  await prefetchLessonMenuCache(prevId, studyTarget);
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
            <Text style={{color:t.textPrimary,fontSize:f.bodyLg,fontWeight:'600'}} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
              {lockedButtonLabel}
            </Text>
          </PremiumCard>
        </View>
        </ContentWrap>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
    <LessonArtBackdrop variant="menu" />
    <SafeAreaView style={{flex:1}}>
      <ContentWrap>
      {/* Хедер */}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:0.5,borderBottomColor:t.border}}>
        <PremiumCard testID="lesson-menu-back" level={1} onPress={()=>{
          hapticTap();
          // Safe-back: после онбординга стек может быть пуст — возвращаемся на список уроков.
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/lessons' as any);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
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
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </View>
              {progress > 0 && (
                <Text style={{color:t.heroTextMuted,fontSize:f.caption,textAlign:'center'}}>
                  {progress}/50  ★ {score.toFixed(1)}
                </Text>
              )}
              {(() => {
                const hint = getNextMedalHint(score, lang);
                return hint ? (
                  <Text style={{color:t.heroTextMuted,fontSize:f.sub,textAlign:'center'}}>
                    {hint}
                  </Text>
                ) : null;
              })()}
            </View>
          );
        })()}
      </View>

      {/* Меню */}
      <View style={{paddingHorizontal:16,gap:10}}>
        {menuItems.filter(item => !item.hidden).map((item,i)=>(
          <PremiumCard key={i} testID={item.testID} level={2} onPress={() => {
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
              ...(item.cornerShardPrice != null
                ? { position: 'relative' as const, minHeight: 86, paddingBottom: 22 }
                : {}),
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
                colors={isGoldTheme ? GOLD_GRADIENTS.mutedPanel : [t.bgSurface, t.bgSurface, t.bgSurface]}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                width:44,height:44,borderRadius:22,
                backgroundColor:t.bgSurface,
                borderWidth:StyleSheet.hairlineWidth,borderColor:isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border,
                overflow:'hidden',
              }}>
                {isGoldTheme && <GoldBevel radius={22} intensity="quiet" />}
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={isGoldTheme
                  ? (item.disabled || item.unavailable ? GOLD_GRADIENTS.mutedPanel : GOLD_GRADIENTS.raisedTile)
                  : [((item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface), ((item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface), ((item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface)]}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                width:44,height:44,borderRadius:22,
                backgroundColor: (item.disabled || item.unavailable) ? t.bgPrimary : t.bgSurface,
                borderTopWidth:0.5, borderLeftWidth:0.5,
                borderRightWidth:0.5, borderBottomWidth:0.5,
                borderTopColor:isGoldTheme ? GOLD_RICH.hairlineStrong : t.borderHighlight, borderLeftColor:isGoldTheme ? GOLD_RICH.hairline : t.borderHighlight,
                borderRightColor:isGoldTheme ? GOLD_RICH.hairlineQuiet : t.border, borderBottomColor:isGoldTheme ? GOLD_RICH.hairlineDark : t.border,
                justifyContent:'center', alignItems:'center',
                overflow:'hidden',
              }}>
                {isGoldTheme && <GoldBevel radius={22} intensity={(item.disabled || item.unavailable) ? 'quiet' : 'normal'} />}
                <Ionicons name={item.icon} size={22} color={(item.disabled || item.unavailable) ? t.textGhost : isGoldTheme ? GOLD_RICH.champagne : t.textSecond}/>
              </LinearGradient>
            )}
            <View style={{flex:1}}>
              <Text style={{color:(item.disabled || item.unavailable) ? t.textGhost : t.textPrimary,fontSize: f.bodyLg,fontWeight:'600'}}>{item.label}</Text>
              <Text style={{color:t.textMuted,fontSize: f.sub,marginTop:3}}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={item.disabled ? t.textGhost : t.textGhost}/>
            {item.cornerShardPrice != null ? (
              <LinearGradient
                pointerEvents="none"
                colors={isGoldTheme ? GOLD_GRADIENTS.raisedTile : ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.28)']}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  right: 14,
                  bottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  borderWidth: 1,
                  borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : 'rgba(255,215,0,0.5)',
                  overflow: 'hidden',
                }}
              >
                {isGoldTheme && <GoldBevel radius={8} intensity="normal" />}
                <Image
                  source={oskolokImageForPackShards(item.cornerShardPrice ?? MASTERY_REPLAY_BASE_SHARDS)}
                  style={[{ width: 14, height: 14 }, isGoldTheme ? { tintColor: GOLD_RICH.champagne } : null]}
                  resizeMode="contain"
                />
                <Text style={{ color: isGoldTheme ? GOLD_RICH.champagne : '#FFD700', fontSize: 11, fontWeight: '900' }} maxFontSizeMultiplier={1}>
                  {item.cornerShardPrice}
                </Text>
              </LinearGradient>
            ) : null}
          </PremiumCard>
        ))}
      </View>

      </ScrollView>
      {/* Модальное окно блокировки */}
      <Modal transparent animationType="fade" visible={showLockModal} onRequestClose={() => setShowLockModal(false)}>
        <Pressable style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)'}} onPress={() => setShowLockModal(false)}>
          <View style={{flex:1, justifyContent:'flex-end'}}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <LinearGradient
                colors={isGoldTheme ? GOLD_GRADIENTS.premiumPanel : [t.bgCard, t.bgCard, t.bgCard]}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                backgroundColor:t.bgCard,
                borderTopLeftRadius:24, borderTopRightRadius:24,
                padding:28, paddingBottom:40,
                borderTopWidth:0.5, borderColor:isGoldTheme ? GOLD_RICH.hairlineStrong : t.border,
                alignItems:'center',
                overflow:'hidden',
              }}>
                {isGoldTheme && <GoldBevel radius={24} intensity="strong" />}
                <Text style={{fontSize:56, marginBottom:16}}>🔐</Text>
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
                <TouchableOpacity
                  style={{
                    backgroundColor:t.accent,
                    borderRadius:14, padding:16, width:'100%', alignItems:'center',
                    overflow:'hidden',
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
                  <Text style={{color:t.correctText, fontSize:f.body, fontWeight:'700'}}>
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
                </TouchableOpacity>
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
  ru: 'Французский урок ещё закрыт source gate. Мы не будем открывать английские фразы, интро или прогресс как замену French.',
  uk: 'Французький урок ще закритий source gate. Ми не відкриватимемо англійські фрази, інтро або прогрес як заміну French.',
  es: 'La lección de French sigue bloqueada por source gate.',
  "pt-BR": 'A lição de French ainda está bloqueada pelo source gate.',
  vi: 'Bài French vẫn bị khóa bởi source gate.',
  id: 'Pelajaran French masih dikunci oleh source gate.',
  tr: 'French dersi source gate tarafından hâlâ kapalı.',
  pl: 'Lekcja French jest nadal zablokowana przez source gate.',
})
            : soonOpen === 'frenchTheory'
              ? triLang(lang, {
  ru: 'Французская теория ещё закрыта source gate. Мы не будем открывать английскую теорию, интро или примеры как замену French.',
  uk: 'Французька теорія ще закрита source gate. Ми не відкриватимемо англійську теорію, інтро або приклади як заміну French.',
  es: 'French theory is still blocked by source gate.',
  "pt-BR": 'French theory is still blocked by source gate.',
  vi: 'French theory is still blocked by source gate.',
  id: 'French theory is still blocked by source gate.',
  tr: 'French theory is still blocked by source gate.',
  pl: 'French theory is still blocked by source gate.',
})
            : soonOpen === 'vocab'
            ? triLang(lang, {
  ru: 'Словарь для этого урока ещё готовится',
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
  ru: 'Понятно',
  uk: 'Зрозуміло',
  es: 'Entendido',
  "pt-BR": 'Entendi',
  vi: 'Đã hiểu',
  id: 'Mengerti',
  tr: 'Anladım',
  pl: 'Rozumiem',
}), onPress: () => {} }]}
        onRequestClose={() => setSoonOpen(null)}
      />

      {/* Mastery: перепрохождение за осколки (Premium = бесплатно) */}
      <MasteryReplayModal
        visible={showMasteryModal}
        lessonId={lessonId}
        isPremium={isPremium}
        studyTarget={studyTarget}
        onClose={() => setShowMasteryModal(false)}
        onReplayed={(id) => {
          delete lessonMenuCacheById[lessonMenuCacheKey(id, studyTarget)];
          loadProgress();
          if (!frenchLessonRuntimeAvailableForTarget(studyTarget, id)) {
            setSoonOpen('frenchLesson');
            return;
          }
          router.replace({ pathname: '/lesson1', params: { id, from: 'lesson_menu' } });
        }}
      />
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
