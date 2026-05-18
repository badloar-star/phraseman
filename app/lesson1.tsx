import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity, TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import { triLang, type Lang } from '../constants/i18n';
import { getCardShadow, useTheme } from '../components/ThemeContext';
import { screenTextOnGradient, ThemeMode } from '../constants/theme';
import { isCorrectAnswer, normalizeLessonAssemblyAnswer } from '../constants/contractions';
import { checkAchievements } from './achievements';
import { resetAndUpdateTaskProgress, updateMultipleTaskProgress } from './daily_tasks';
import { bumpStatsDaily } from './stats_daily_breakdown';
import { registerXP } from './xp_manager';
import { trackActivity, trackFeatureBlocked, trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { useEffectivePlatformOS } from './platform_ui_preview';
// [SRS] Модуль интервального повторения (active_recall.ts).
// recordMistake() вызывается при каждом неверном ответе в уроке.
// Фраза попадает в AsyncStorage ('active_recall_items') с алгоритмом SM-2:
//   interval=1 день, easeFactor=2.5. При повторных ошибках easeFactor снижается.
// Связь: review.tsx — getDueItems(..., { commitSessionOverflow: true }).
// Связь: home.tsx — countDueItemsToday() на бейдже.
import AddToFlashcard from '../components/AddToFlashcard';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import { hapticTap } from '../hooks/use-haptics';
import { useAudio } from '../hooks/use-audio';
import { recordMistake } from './active_recall';
import { logMistake } from './mistake_log';
import { resolvePhraseMistakeToken } from './mistake_token_resolver';
import { recordPhraseMistake } from './trainer_store';
import { checkCoachToastNeededWithAnalytics, coachToastDecisionToRouteParams } from './coach_toast_trigger';
import type { PhraseMistakeInput } from './phrase_analytics';
import { logLessonComplete, logLessonStart, logLessonAbandoned, logLessonAnswer, logEnergyLimitHit } from './firebase';
import { trackLessonStart, trackLessonAbandoned, trackAnswer, trackEnergyHit } from './user_stats';
import { useEnergy } from '../components/EnergyContext';
import { getLessonData, getLessonEncouragementScreens, getLessonIntroScreens } from './lesson_data_all';
import { phraseAnswerAlternatives, phraseAnswerDisplayLine, phraseCanonicalAnswer, phrasePrimarySurface, phraseWordRowsForStudyTarget, ttsLocaleForStudyTarget } from './phrase_target_utils';
import { spanishLessonUiStringsActive, spanishStudyActive, spanishSurfacesEnabled } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';
import LessonIntroScreens from './lesson_intro_screens';
import { getMedalTier, getProgressCellColor, loadMedalInfo } from './medal_utils';
import type { MedalTier } from './medal_utils';

import { grammarHintLine } from './lesson_locale_utils';
import {
  getContractionFor,
  getPerWordDistracts,
  getPhraseWords, lookupContraction,
  makeExpansionOptions,
} from './lesson1_smart_options';
import { tryUnlockNextLesson } from './lesson_lock_system';
import {
  getInitialOrderAndCell,
  getInitialProgressArray,
  isLessonScreenPrimedThisSession,
  touchLessonScreenPrimed,
} from './lesson_screen_bootstrap';
import { getBonusHintsToday } from './level_gift_system';
import { lessonPhraseReportDataId } from './error_report';
import ReportErrorButton from '../components/ReportErrorButton';
import MedalToast from '../components/MedalToast';
import NoEnergyModal from '../components/NoEnergyModal';
import { openLessonAccessGate, shouldBlockLessonAccess } from './lesson_premium_gate';
import { MOTION_DURATION } from '../constants/motion';

const GRAMMAR_HINTS = [
  {
    key: 'grammar_hint_articles',
    lessonTeaches: 20,
    detect: (en: string) => /\b(a|an|the)\b/i.test(en),
    textRu: 'Артикли a, an, the встречаются здесь раньше урока 20, где мы изучим их подробно. Пока просто используй как показано — без них предложение не построить.',
    textUk: 'Артиклі a, an, the зустрічаються тут раніше уроку 20, де ми вивчимо їх докладно. Поки просто використовуй як показано — без них речення не побудувати.',
    textEs:
      'Los artículos a, an y the aparecen aquí antes de la lección 20, donde los veremos en detalle. Por ahora úsalos como en el ejemplo; sin ellos la frase no encaja.',
  },
  {
    key: 'grammar_hint_some_any',
    lessonTeaches: 21,
    detect: (en: string) => /\b(some|any)\b/i.test(en),
    textRu: 'Слова some и any встречаются здесь раньше урока 21, где мы разберём их подробно. Пока просто используй как показано.',
    textUk: 'Слова some і any зустрічаються тут раніше уроку 21, де ми розберемо їх докладно. Поки просто використовуй як показано.',
    textEs:
      'Some y any salen aquí antes de la lección 21, donde las explicamos a fondo. Por ahora empléalas tal como ves en la frase.',
  },
];

// Strip special article/marker symbols from display text.
// Bare standalone '-' (zero-article marker) → '' (empty, skip).
// Legacy «-»/«»/«a» forms also handled for safety.
const stripMarkers = (word: string): string => {
  const stripped = word
    .replace(/^\/|\/$/g, '')
    .replace(/«-»/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;]+$/, '')
    .trim();
  // Standalone '-' is the zero-article marker (no article in English)
  return stripped === '-' ? '' : stripped;
};

// Clean phrase.english for display: strip article markers, remove empty tokens
// e.g. 'I bought a new - phone.' → 'I bought a new phone.'
const cleanPhraseForDisplay = (english: string): string =>
  english.split(' ').map(stripMarkers).filter(w => w.length > 0).join(' ');

// Returns true if the phrase word at the given position is a zero-article marker '-'
// (correct answer is empty — skip this position in word-select mode)
const isZeroArticlePosition = (phraseWords: string[], idx: number): boolean =>
  idx >= 0 && idx < phraseWords.length && stripMarkers(phraseWords[idx]) === '';

// Returns the canonical word token list for a phrase (language depends on learnTarget).
const getPhraseTokens = (phrase: any, studyTarget: StudyTargetLang): string[] => {
  if (!phrase) return [];
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (rows.length > 0) {
    return rows.map((w: any) => w.correct ?? w.text);
  }
  return getPhraseWords(phrase?.english ?? '');
};

/** Word-bank phrase is ready to grade (all slots filled or early match on an accepted alternative). */
function isPhraseAssemblyComplete(
  phrase: any,
  studyTarget: StudyTargetLang,
  selectedWords: string[],
  phraseWordIdx: number,
): boolean {
  if (!phrase) return false;
  const tokens = getPhraseTokens(phrase, studyTarget);
  const assembled = selectedWords.join(' ');
  const canon = phraseCanonicalAnswer(phrase, studyTarget);
  const alts = phraseAnswerAlternatives(phrase, studyTarget);
  if (isCorrectAnswer(assembled, canon, alts)) return true;
  return phraseWordIdx >= tokens.length;
}

// Safe wrapper: if getPerWordDistracts returns [] (phraseWordIdx out of bounds),
// fall back to the last valid position so buttons never disappear mid-phrase.
// phraseWordIdx is now always in sync with phrase.words indices (via getPhraseTokens).
const dedupeOptions = (opts: string[]): string[] => {
  const seen = new Set<string>();
  return opts.filter(w => { const k = w.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
};

const safeGetDistracts = (phrase: any, wordIndex: number, studyTarget: StudyTargetLang): string[] => {
  const result = getPerWordDistracts(phrase, wordIndex, studyTarget);
  // Same token list as handleWordPress (phrase.words authoritative; avoids tokenization mismatch)
  const correctWord = getPhraseTokens(phrase, studyTarget)[wordIndex];
  if (result.length > 0) {
    if (correctWord && !result.some((w: string) => w.toLowerCase() === correctWord.toLowerCase())) {
      return dedupeOptions([...result.slice(0, result.length - 1), correctWord]);
    }
    return dedupeOptions(result);
  }
  // Walk back to find the last position with data
  for (let i = wordIndex - 1; i >= 0; i--) {
    const fallback = getPerWordDistracts(phrase, i, studyTarget);
    if (fallback.length > 0) {
      if (correctWord && !fallback.some((w: string) => w.toLowerCase() === correctWord.toLowerCase())) {
        return dedupeOptions([...fallback.slice(0, fallback.length - 1), correctWord]);
      }
      return dedupeOptions(fallback);
    }
  }
  return result;
};

let tapHintShownThisSession = false;


const TOTAL = 50;
const SETTINGS_KEY = 'user_settings';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const LESSON_ENTER_MS = MOTION_DURATION.normal;
const PRESS_IN_MS = 70;

type LessonPressableProps = React.ComponentProps<typeof Pressable> & {
  pressScale?: number;
  suppressFeedback?: boolean;
};

function LessonPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressScale = 0.975,
  suppressFeedback = false,
  style,
  ...props
}: LessonPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback((toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: PRESS_IN_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      android_ripple={disabled || suppressFeedback ? undefined : { color: 'rgba(255,255,255,0.08)' }}
      onPressIn={(event) => {
        if (!disabled && !suppressFeedback) animateTo(pressScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!disabled && !suppressFeedback) {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 260,
            friction: 12,
          }).start();
        }
        onPressOut?.(event);
      }}
      style={[style as any, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

function syncLessonIntroShownFlagNow(): void {
  void import('./cloud_sync')
    .then((m) => m.syncToCloud({ forceNow: true }))
    .catch(() => {});
}

interface Settings {
  autoAdvance: boolean; hardMode: boolean; autoCheck: boolean; haptics: boolean; voiceOut: boolean; speechRate: number;
}
const DEFAULT_SETTINGS: Settings = {
  autoAdvance: false,
  voiceOut: true,
  speechRate: 0.9,
  hardMode: false, autoCheck: false, haptics: true,
};


// ── Гексагональный прогресс-индикатор ────────────────────────────────────────
// LessonHexProgress is now imported from components/LessonHexProgress.tsx

// ── Модалка "Конец цикла урока" ───────────────────────────────────────────────
export const CYCLE_END_SHOWN_KEY = 'lesson_cycle_end_intro_shown';

function LessonCycleEndModal({ visible, hasErrors, lang, studyTarget, t, f, onClose }: {
  visible: boolean;
  hasErrors: boolean;
  lang: Lang;
  studyTarget: StudyTargetLang;
  t: any;
  f: any;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const isUK = lang === 'uk';
  const isES = spanishLessonUiStringsActive(lang, studyTarget);
  const title = isES ? '🎉 ¡Has cerrado todo el ciclo!' : isUK ? '🎉 Ти пройшов увесь урок!' : '🎉 Ты прошёл весь урок!';
  const subtitle = isES
    ? 'Puedes seguir todas las vueltas que quieras; cada nueva ronda afianza mejor tu resultado.'
    : isUK
      ? 'Можеш продовжувати скільки завгодно разів — кожне нове коло покращує твій результат.'
      : 'Можешь проходить сколько угодно раз — каждый новый круг улучшает твой результат.';
  const errorText = isES
    ? 'Hubo errores: repásalo otra vez para corregirlos y fijar lo aprendido.'
    : isUK
      ? 'У тебе були помилки — пройди ще раз, щоб виправити їх і закріпити знання.'
      : 'У тебя были ошибки — пройди ещё раз, чтобы исправить их и закрепить знания.';
  const btnLabel = isES ? 'Continuar' : isUK ? 'Продовжити' : 'Продолжить';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Animated.View style={{
          backgroundColor: t.bgCard,
          borderRadius: 24,
          padding: 28,
          width: '100%',
          maxWidth: 360,
          alignItems: 'center',
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 12,
        }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🏆</Text>
          <Text style={{ fontSize: f.h2, fontWeight: '700', color: t.textPrimary, textAlign: 'center', marginBottom: 10 }}>
            {title}
          </Text>
          <Text style={{ fontSize: f.body, color: t.textSecond, textAlign: 'center', lineHeight: 22, marginBottom: hasErrors ? 12 : 24 }}>
            {subtitle}
          </Text>
          {hasErrors && (
            <View style={{ backgroundColor: t.accentBg, borderRadius: 12, padding: 12, marginBottom: 24, width: '100%' }}>
              <Text style={{ fontSize: f.body, color: t.accent, textAlign: 'center', lineHeight: 20 }}>
                {errorText}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center' }}
          >
            <Text style={{ fontSize: f.bodyLg, fontWeight: '700', color: t.correctText }}>{btnLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * LessonContent: Renders the lesson UI (intro screens, encouragement, or main lesson).
 * Extracted as separate component to ensure SafeAreaView receives exactly ONE child.
 */
interface LessonContentProps {
  showIntroScreens: boolean;
  introGateReady: boolean;
  setShowIntroScreens: (val: boolean) => void;
  onIntroDone: () => void;
  lessonId: number;
  // All the main lesson UI props
  compact: boolean;
  isSmallScreen: boolean;
  phrase: any;
  selectedWords: string[];
  status: 'playing' | 'result';
  handleBgTap: () => void;
  handleWordPress: (word: string) => void;
  undoLastWord: () => void;
  goNext: () => void;
  handleTypedSubmit: () => void;
  typedText: string;
  setTypedText: (val: string) => void;
  shuffled: string[];
  cursorAnim: Animated.Value;
  fadeAnim: Animated.Value;
  cellIndex: number;
  passCount: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  currentEnergy: number;
  currentMaxEnergy: number;
  progress: string[];
  comboCount: number;
  showTapHint: boolean;
  setShowTapHint: (val: boolean) => void;
  showToBeHint: boolean;
  phraseWordIdx: number;
  hintPulseAnim: Animated.Value;
  wasWrong: boolean;
  textInputRef: React.RefObject<TextInput>;
  settings: any;
  router: any;
  s: any;
  t: any;
  f: any;
  themeMode: ThemeMode;
  lang: Lang;
  emptyTapFlash: boolean;
  setEmptyTapFlash: (val: boolean) => void;
  shouldShake: boolean;
  setShouldShake: (val: boolean) => void;
  recoveryTimeText: string;
  setFailedTapCount: (val: number | ((prev: number) => number)) => void;
  checkAnswer: (answer: string) => Promise<void>;
  contrExpanded: string[] | null;
  onFiftyFifty: () => void;
  fiftyFiftyUsedToday: number;
  bonusHints: number;
  dimmedWords: Set<string>;
  displayCell: number;
  isErrorReplay: boolean;
  replaySolvedCorrectly: boolean;
  xpToastVisible: boolean;
  xpToastAmount: number;
  xpToastAnim: Animated.Value;
  realPhraseIdx: number;
  /** Язык, который учим (dev: en|es); упражнение по словам пока по EN, озвучка/ответ могут быть ES. */
  studyTarget: StudyTargetLang;
  toastAnim: Animated.Value;
  from?: string;
  onHeaderBack: () => void;
}

const LessonContent = React.memo(function LessonContent({
  showIntroScreens,
  introGateReady,
  setShowIntroScreens,
  onIntroDone,
  lessonId,
  compact,
  isSmallScreen,
  phrase,
  selectedWords,
  status,
  handleBgTap,
  handleWordPress,
  undoLastWord,
  goNext,
  handleTypedSubmit,
  typedText,
  setTypedText,
  shuffled,
  cursorAnim,
  fadeAnim,
  cellIndex,
  passCount,
  correctCount,
  wrongCount,
  score,
  currentEnergy,
  currentMaxEnergy,
  progress,
  comboCount,
  showTapHint,
  setShowTapHint,
  showToBeHint,
  phraseWordIdx,
  hintPulseAnim,
  wasWrong,
  textInputRef,
  settings,
  router,
  s,
  t,
  f,
  themeMode,
  lang,
  emptyTapFlash,
  setEmptyTapFlash,
  shouldShake,
  setShouldShake,
  recoveryTimeText,
  setFailedTapCount,
  checkAnswer,
  contrExpanded,
  onFiftyFifty,
  fiftyFiftyUsedToday,
  bonusHints,
  dimmedWords,
  displayCell,
  isErrorReplay,
  replaySolvedCorrectly,
  xpToastVisible,
  xpToastAmount,
  xpToastAnim,
  realPhraseIdx,
  studyTarget,
  toastAnim,
  from,
  onHeaderBack,
}: LessonContentProps) {
  const effectiveOs = useEffectivePlatformOS();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);


  // [ARROW] Анимированная стрелка над прогресс-баром
  const arrowAnim  = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  const prevDisplayCell = useRef(displayCell);

  const [grammarHintText, setGrammarHintText] = useState<string | null>(null);
  const grammarHintAnim = useRef(new Animated.Value(0)).current;
  const grammarHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionEnterAnim = useRef(new Animated.Value(1)).current;
  const phraseEnterKey = phrase ? `${String(phrase.id ?? '')}:${String(phrase.english ?? phrase.spanish ?? '')}` : '';
  const phraseTokens = phrase ? getPhraseTokens(phrase, studyTarget) : [];
  const selectedAnswer = selectedWords.join(' ');
  const reportUserAnswer = (settings.hardMode ? typedText : selectedAnswer).trim();
  const gradeTarget = phrase ? phraseCanonicalAnswer(phrase, studyTarget) : '';
  const gradeAlts = phrase ? phraseAnswerAlternatives(phrase, studyTarget) : undefined;
  const currentCorrectWord = phraseTokens[phraseWordIdx] ?? null;
  const currentNextCorrectWord = phraseTokens[phraseWordIdx + 1] ?? null;
  const currentValidContraction = currentCorrectWord && currentNextCorrectWord
    ? getContractionFor(currentCorrectWord, currentNextCorrectWord)
    : null;
  const wordOptionItems = useMemo(() => {
    const expansionCorrect = contrExpanded !== null && contrExpanded.length > 0
      ? contrExpanded[0]
      : null;
    return shuffled.map((word, i) => {
      const strippedRaw = stripMarkers(word);
      const stripped = strippedRaw.toLowerCase();
      const isCorrectOption = contrExpanded !== null
        ? expansionCorrect != null && stripped === expansionCorrect.toLowerCase()
        : currentCorrectWord != null && (
          stripped === currentCorrectWord.toLowerCase() ||
          (currentValidContraction != null && stripped === currentValidContraction.toLowerCase())
        );
      const displayText = (() => {
        if (strippedRaw === '') return s.lesson.noArticle;
        const cap = currentCorrectWord !== null && /^[A-Z]/.test(currentCorrectWord);
        if (cap) return strippedRaw.charAt(0).toUpperCase() + strippedRaw.slice(1);
        return strippedRaw === 'I' ? 'I' : strippedRaw.toLowerCase();
      })();
      return {
        word,
        index: i,
        isCorrectOption,
        shouldShowHint: showToBeHint && cellIndex < 2 && isCorrectOption,
        isDimmed: dimmedWords.has(word),
        displayText,
      };
    });
  }, [shuffled, contrExpanded, currentCorrectWord, currentValidContraction, showToBeHint, cellIndex, dimmedWords, s.lesson.noArticle]);
  const selectedAnswerMatchesAlternative = Boolean(
    gradeAlts?.length && isCorrectAnswer(selectedAnswer, gradeTarget, gradeAlts)
  );
  const canManuallyCheckAnswer = !settings.hardMode
    && selectedWords.length > 0
    && !settings.autoCheck
    && status === 'playing'
    && (phraseWordIdx >= phraseTokens.length || selectedAnswerMatchesAlternative);

  const triggerGrammarHint = useCallback(async (currentWord: string, force = false) => {
    if (!currentWord) return;
    if (grammarHintTimerRef.current) clearTimeout(grammarHintTimerRef.current);
    for (const hint of GRAMMAR_HINTS) {
      if (lessonId >= hint.lessonTeaches) continue;
      if (!hint.detect(currentWord)) continue;
      if (!force) {
        const seen = await AsyncStorage.getItem(hint.key);
        if (seen) continue;
        await AsyncStorage.setItem(hint.key, '1');
      }
      const text = grammarHintLine(lang, hint, studyTarget);
      Animated.timing(grammarHintAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        setGrammarHintText(text);
        Animated.timing(grammarHintAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        grammarHintTimerRef.current = setTimeout(() => {
          Animated.timing(grammarHintAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setGrammarHintText(null));
        }, 10000);
      });
      return;
    }
  }, [lessonId, lang, studyTarget]);

  const hideGrammarHint = useCallback(() => {
    if (grammarHintTimerRef.current) clearTimeout(grammarHintTimerRef.current);
    Animated.timing(grammarHintAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setGrammarHintText(null));
  }, [grammarHintAnim]);

  useEffect(() => {
    if (!phrase) return;
    const tokens = getPhraseTokens(phrase, studyTarget);
    const word = tokens[phraseWordIdx] ?? '';
    triggerGrammarHint(word, false);
    return hideGrammarHint;
  }, [phrase?.english, phrase?.spanish, phraseWordIdx, studyTarget, triggerGrammarHint, hideGrammarHint]);

  useEffect(() => {
    if (barWidth === 0) return;
    const cellW = (barWidth - (TOTAL - 1) * 2) / TOTAL;
    const targetX = displayCell * (cellW + 2); // левый край ячейки
    const isBack = displayCell < prevDisplayCell.current;
    prevDisplayCell.current = displayCell;
    Animated.spring(arrowAnim, {
      toValue: targetX,
      useNativeDriver: true,
      tension: isBack ? 280 : 140,  // назад — резкий прыжок, вперёд — плавно
      friction: isBack ? 10 : 12,
    }).start();
  }, [displayCell, barWidth]);

  useEffect(() => {
    if (!phraseEnterKey || status !== 'playing') return;
    questionEnterAnim.setValue(0);
    Animated.timing(questionEnterAnim, {
      toValue: 1,
      duration: LESSON_ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [phraseEnterKey, displayCell, status, questionEnterAnim]);

  const questionEnterStyle = {
    opacity: questionEnterAnim,
    transform: [
      {
        translateY: questionEnterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        scale: questionEnterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  if (!introGateReady) {
    return <View style={{ flex: 1 }} />;
  }

  // Show intro screens on first visit
  if (showIntroScreens) {
    return (
      <LessonIntroScreens
        introScreens={getLessonIntroScreens(lessonId, studyTarget)}
        lessonId={lessonId}
        onComplete={onIntroDone}
        onBack={onHeaderBack}
      />
    );
  }

  // Main lesson UI
  if (!phrase) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textPrimary }} />
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={effectiveOs === 'ios' ? 'padding' : undefined}>
      {/* ХЕДЕР — flex + minWidth:0 + wrap, иначе на узких экранах правый блок вылезает за край */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: isSmallScreen ? 10 : 15,
          paddingVertical: 12,
          gap: 6,
        }}
      >
        {/* Кнопка назад совмещена с названием урока — как на скриншоте */}
        <LessonPressable
          testID="lesson1-header-back"
          onPress={onHeaderBack}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            flexShrink: 1,
            minWidth: 0,
            maxWidth: '44%',
            backgroundColor: t.bgCard,
            borderRadius: 20,
            paddingHorizontal: isSmallScreen ? 8 : 12,
            paddingVertical: 7,
            borderWidth: 0.5,
            borderColor: t.border,
          }}
        >
          <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: t.textPrimary, fontSize: isSmallScreen ? f.body : f.bodyLg, fontWeight: '600', flexShrink: 1 }}
          >
            {triLang(lang, {
              uk: 'Урок',
              ru: 'Урок',
              es: 'Lección',
              'pt-BR': 'Lição',
              vi: 'Bài',
              id: 'Pelajaran',
              tr: 'Ders',
              pl: 'Lekcja',
            })} {lessonId}
          </Text>
        </LessonPressable>
        {/* Right side: energy icons + combo badge + stats */}
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            alignContent: 'flex-end',
            rowGap: 4,
            columnGap: isSmallScreen ? 4 : 8,
          }}
        >
          {/* Energy icons at top */}
          <View style={{ paddingVertical: 8 }}>
            <LessonEnergyLightning energyCount={currentEnergy} maxEnergy={currentMaxEnergy} shouldShake={shouldShake} />
          </View>

          {comboCount >= 3 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FF9500', borderRadius: 10, paddingHorizontal: isSmallScreen ? 5 : 7, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11 }}>🔥</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: isSmallScreen ? 10 : f.label }}>+{comboCount >= 5 ? '200' : '100'}%</Text>
            </View>
          )}
          {/* Stats row — XP toast floats absolutely; row wrap + shrink so ●wrong не режется у края */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              flexShrink: 1,
              minWidth: 0,
              gap: isSmallScreen ? 4 : 6,
              position: 'relative',
            }}
          >
            {xpToastVisible && (
              <Animated.Text style={{ position: 'absolute', right: 0, bottom: '100%', color: '#F5A623', fontWeight: '800', fontSize: isSmallScreen ? 10 : f.label, opacity: xpToastAnim, transform: [{ translateY: xpToastAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
                +{xpToastAmount} XP
              </Animated.Text>
            )}
            <Text style={{ color: t.gold, fontSize: isSmallScreen ? 10 : f.label, fontWeight: '700' }}>★{score}</Text>
            <Text style={{ color: t.correct, fontSize: isSmallScreen ? 10 : f.label, fontWeight: '700' }}>●{correctCount}</Text>
            <Text style={{ color: t.wrong, fontSize: isSmallScreen ? 10 : f.label, fontWeight: '700' }}>●{wrongCount}</Text>
          </View>
        </View>
      </View>

      {/* ОСНОВНАЯ ЗОНА */}
      <ScrollView
        testID="lesson1-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: status === 'result' ? 100 : 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[questionEnterStyle, { width: '100%' }]}>
        <Pressable onPress={status === 'result' ? undefined : handleBgTap} style={{ width: '100%' }}>
          <Text style={{ color: sx.primary, fontSize: f.h2 + 6, marginBottom: compact ? 12 : 20, textAlign: 'center' }} numberOfLines={3} adjustsFontSizeToFit>{(() => {
            if (!phrase) return '';
            if (lang === 'uk') return (phrase.ukrainian || phrase.russian);
            if (spanishStudyActive(studyTarget)) {
              if (lang === 'es') return (phrase.spanish ?? phrase.russian);
              return phrase.russian;
            }
            if (lang === 'es') return (phrase.russian || phrase.ukrainian || phrase.english);
            return phrase.russian;
          })()}</Text>

          <View style={{ minHeight: 60, alignSelf: 'stretch', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: emptyTapFlash ? '#F5A623' : t.border, marginBottom: compact ? 12 : 20, justifyContent: 'center', backgroundColor: emptyTapFlash ? 'rgba(245,166,35,0.08)' : 'transparent', borderRadius: emptyTapFlash ? 8 : 0 } as any}>
            {settings.hardMode ? (
              /* Keep TextInput always mounted in hardMode — prevents keyboard slide animation between questions */
              <TextInput
                testID="lesson1-typed-input"
                ref={textInputRef}
                style={{ color: sx.second, fontSize: f.h1, padding: 0, minHeight: 40, opacity: status === 'playing' ? 1 : 0, width: '100%', textAlign: 'center' }}
                value={typedText}
                onChangeText={setTypedText}
                onSubmitEditing={handleTypedSubmit}
                placeholder={status === 'playing' ? s.lesson.typeHere : ''}
                placeholderTextColor={sx.ghost}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                cursorColor={t.accent}
                selectionColor={`${t.accent}55`}
                blurOnSubmit={false}
                editable={status === 'playing'}
              />
            ) : (
              <Text style={{ color: sx.second, fontSize: f.h1, width: '100%', textAlign: 'center' }}>
                {selectedWords.length > 0
                  ? (() => {
                      const cleaned = selectedWords.map(w => stripMarkers(w)).filter(w => w.length > 0);
                      if (cleaned.length === 0) return '';
                      const first = cleaned[0].charAt(0).toUpperCase() + cleaned[0].slice(1).toLowerCase();
                      const rest = cleaned.slice(1).map((w, j) => {
                        const wordIdx = j + 1;
                        const rowsLive = phrase ? phraseWordRowsForStudyTarget(phrase, studyTarget) : [];
                        const canonical = rowsLive[wordIdx]?.correct as string | undefined;
                        if (w.toLowerCase() === 'i') return 'I';
                        if (canonical && /^[A-ZÁÉÍÓÚÑ]/.test(canonical)) {
                          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                        }
                        return w.toLowerCase();
                      }).join(' ');
                      return first + (rest ? ' ' + rest : '');
                    })()
                  : ''
                }{status !== 'result' && <Animated.Text style={{ color: sx.primary, opacity: cursorAnim }}>|</Animated.Text>}
              </Text>
            )}
          </View>

          </Pressable>
          </Animated.View>
          {status === 'result' && (
            <Animated.View style={{
              opacity: fadeAnim,
              width: '100%',
              transform: [{
                translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              }],
            }}>
              {wasWrong && (
                <View style={{ backgroundColor: t.wrongBg, padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: t.wrong }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {(() => {
                      const userAnswer = settings.hardMode ? typedText : selectedWords.join(' ');
                      // Same pipeline as isCorrectAnswer / phraseCanonicalAnswer (per-token punct strip)
                      const expandedWords = normalizeLessonAssemblyAnswer(userAnswer).split(/\s+/).filter(w => w.length > 0);
                      const correctWords = normalizeLessonAssemblyAnswer(phraseCanonicalAnswer(phrase, studyTarget))
                        .split(/\s+/)
                        .filter(w => w.length > 0);
                      return expandedWords.map((word, i) => {
                        const correctWord = correctWords[i];
                        const isWrong = word !== correctWord;
                        return (
                          <Text key={i} style={{
                            color: isWrong ? t.wrong : t.textPrimary,
                            fontWeight: isWrong ? '700' : '500',
                            fontSize: f.h1,
                          }}>
                            {word}
                          </Text>
                        );
                      });
                    })()}
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: t.correctBg, padding: 15, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: t.correct, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: t.correct, fontSize: f.h1, flex: 1, textAlign: 'left' }}>
                  {phraseAnswerDisplayLine(phrase, studyTarget, lang)}
                </Text>
                <AddToFlashcard
                  en={phraseAnswerDisplayLine(phrase, studyTarget, lang)}
                  ru={phrase.russian}
                  uk={phrase.ukrainian || phrase.russian}
                  source="lesson" sourceId={String(lessonId)}
                />
              </View>

              <ReportErrorButton
                screen={`lesson_${lessonId}`}
                dataId={lessonPhraseReportDataId(lessonId, phrase, realPhraseIdx)}
                dataText={[
                  `EN: ${phraseAnswerDisplayLine(phrase, studyTarget, lang)}`,
                  `RU: ${phrase.russian ?? ''}`,
                  phrase.ukrainian ? `UK: ${phrase.ukrainian}` : '',
                  spanishSurfacesEnabled(lang, studyTarget) && phrase.spanish ? `ES: ${phrase.spanish}` : '',
                ].filter(Boolean).join('\n')}
                userAnswer={reportUserAnswer}
                style={{ alignSelf: 'flex-end', marginTop: 4 }}
                textColor={sx.muted}
              />

            </Animated.View>
          )}
        </ScrollView>

{/* ПОДСКАЗКА О ГРАММАТИКЕ — появляется один раз при первом появлении конструкции */}
        {grammarHintText !== null && (
          <Animated.View style={{
            opacity: grammarHintAnim,
            marginHorizontal: 20,
            marginBottom: 6,
            backgroundColor: t.bgCard,
            borderRadius: 10,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: t.accent,
          }}>
            <Text style={{ color: t.textSecond, fontSize: f.small, lineHeight: Math.round(f.small * 1.45) }}>{grammarHintText}</Text>
          </Animated.View>
        )}

        {status === 'playing' && phrase && (
          <ReportErrorButton
            screen={`lesson_${lessonId}`}
            dataId={lessonPhraseReportDataId(lessonId, phrase, realPhraseIdx)}
            dataText={[
              `EN: ${phraseAnswerDisplayLine(phrase, studyTarget, lang)}`,
              `RU: ${phrase.russian ?? ''}`,
              phrase.ukrainian ? `UK: ${phrase.ukrainian}` : '',
              spanishSurfacesEnabled(lang, studyTarget) && phrase.spanish ? `ES: ${phrase.spanish}` : '',
            ].filter(Boolean).join('\n')}
            userAnswer={reportUserAnswer}
            style={{ alignSelf: 'flex-end', marginHorizontal: 20, marginBottom: 6 }}
            textColor={sx.muted}
          />
        )}

        {/* КНОПКИ СЛОВ — снаружи ScrollView, тап по любому месту работает */}
        {status === 'playing' && !settings.hardMode && (
          <Pressable
            onPress={handleBgTap}
            style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
              {wordOptionItems.map(({ word, index: i, isCorrectOption, shouldShowHint, isDimmed, displayText }) => {
                return (
                  <Animated.View
                    key={`${phrase?.id ?? 'phrase'}-${phraseWordIdx}-${word}-${i}`}
                    style={{
                    width: '48%',
                    marginBottom: compact ? 7 : 10,
                    opacity: isDimmed ? 0.25 : (shouldShowHint ? hintPulseAnim : hintPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1] }))
                  }}>
                    <LessonPressable
                      testID={isCorrectOption ? 'lesson1-word-option-correct' : `lesson1-word-option-${i}`}
                      style={{ width: '100%', backgroundColor: t.bgCard, paddingVertical: compact ? 9 : 14, alignItems: 'center', borderRadius: 12, borderWidth: themeMode === 'neon' ? 1 : 0.5, borderColor: t.border, ...getCardShadow(themeMode, t.glow) }}
                      suppressFeedback={isDimmed}
                      onPress={() => {
                        if (isDimmed) return;
                        if (showTapHint) setShowTapHint(false);
                        if (settings.hardMode) {
                          // В hardMode нажатие на кнопку вставляет слово в текстовое поле
                          const w = stripMarkers(word);
                          const current = typedText.trimEnd();
                          setTypedText(current ? current + ' ' + w : w);
                          setTimeout(() => textInputRef.current?.focus(), 50);
                        } else {
                          handleWordPress(word);
                        }
                        requestAnimationFrame(() => { void hapticTap(); });
                      }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '500' }} adjustsFontSizeToFit numberOfLines={1}>{displayText}</Text>
                    </LessonPressable>
                  </Animated.View>
                );
              })}
            </View>
          </Pressable>
        )}

        {/* ГОРИЗОНТАЛЬНЫЙ ПРОГРЕСС-БАР */}
        <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{ flex: 1, flexDirection: 'column', gap: 2 }}
              onLayout={e => setBarWidth(e.nativeEvent.layout.width)}
            >
              {/* Стрелка над текущей ячейкой */}
              {barWidth > 0 && (
                <View style={{ height: 10, position: 'relative' }}>
                  <Animated.View style={{
                    position: 'absolute',
                    top: 0,
                    transform: [{ translateX: arrowAnim }],
                  }}>
                    <Text style={{
                      color: replaySolvedCorrectly ? t.correct : (isErrorReplay ? t.wrong : t.correct),
                      fontSize: 8,
                      lineHeight: 10,
                      textAlign: 'center',
                      width: (barWidth - (TOTAL - 1) * 2) / TOTAL,
                    }}>▼</Text>
                  </Animated.View>
                </View>
              )}
              {/* Ячейки прогресса */}
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: TOTAL }).map((_, i) => (
                  <View key={i} style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: getProgressCellColor(progress[i], passCount, t, i === displayCell),
                  }} />
                ))}
              </View>
            </View>
            <Text style={{ color: sx.muted, fontSize: f.label, minWidth: 34, textAlign: 'right' }}>{displayCell + 1}/{TOTAL}</Text>
          </View>
        </View>

        {/* ФУТЕР */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: t.border }}>
          {/* 50/50 Button — вместо Шпаргалки */}
          {!settings.hardMode && (
            (() => {
              const hintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday);
              const canUse = hintsLeft > 0 && status === 'playing' && dimmedWords.size === 0;
              return (
                <LessonPressable
                  testID="lesson1-fifty-fifty"
                  style={{ flex: 1, alignItems: 'center', opacity: canUse ? 1 : 0.35 }}
                  disabled={!canUse}
                  onPress={() => {
                    hapticTap();
                    onFiftyFifty();
                  }}
                >
                  <View style={{ position: 'relative' }}>
                    <Text style={{ color: canUse ? t.accent : sx.second, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>½</Text>
                    <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: canUse ? t.accent : t.textMuted, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: t.correctText, fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{hintsLeft}</Text>
                    </View>
                  </View>
                  <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>50/50</Text>
                </LessonPressable>
              );
            })()
          )}

          {/* Theory Button */}
          <LessonPressable testID="lesson1-theory" style={{ flex: 1, alignItems: 'center' }} onPress={() => { hapticTap(); router.push({ pathname: '/lesson_help', params: { id: lessonId } }); }}>
            <Ionicons name="book-outline" size={26} color={sx.second} />
            <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>{s.lesson.theory}</Text>
          </LessonPressable>

          {/* Undo Button - всегда доступна когда есть выбранные слова или текст */}
          <LessonPressable
            testID={status === 'result' ? 'lesson1-next' : 'lesson1-undo'}
            style={{ flex: 1, alignItems: 'center', opacity: (status === 'playing' && (settings.hardMode ? typedText.trim().length === 0 : selectedWords.length === 0)) ? 0.3 : 1 }}
            onPress={() => {
              hapticTap();
              if (status === 'result') { goNext(); return; }
              if (settings.hardMode) {
                const words = typedText.trim().split(/\s+/);
                words.pop();
                setTypedText(words.join(' '));
                return;
              }
              if (selectedWords.length > 0) { undoLastWord(); return; }
            }}
          >
            {status === 'result' ? (
              <>
                <Ionicons name="play-forward" size={26} color={sx.second} />
                <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>{s.lesson.next}</Text>
              </>
            ) : (
              <>
                <Ionicons name="arrow-undo" size={26} color={sx.second} />
                <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>{s.lesson.undo}</Text>
              </>
            )}
          </LessonPressable>

          {/* Check Button - видна только когда все слова введены и autoCheck выключен */}
          {canManuallyCheckAnswer && (
            <LessonPressable
              testID="lesson1-check"
              style={{ flex: 1, alignItems: 'center' }}
              onPress={() => {
                if (!canManuallyCheckAnswer) return;
                hapticTap();
                checkAnswer(selectedAnswer);
              }}
            >
              <Ionicons name="checkmark-circle" size={26} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: f.label, marginTop: 4 }}>{s.lesson.check}</Text>
            </LessonPressable>
          )}
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 90, right: 12, backgroundColor: 'rgba(40,40,40,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, zIndex: 999 }}
            onPress={() => {
              const hint = GRAMMAR_HINTS[0];
              if (grammarHintTimerRef.current) clearTimeout(grammarHintTimerRef.current);
              const text = grammarHintLine(lang, hint, studyTarget);
              Animated.timing(grammarHintAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
                setGrammarHintText(text);
                Animated.timing(grammarHintAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
                grammarHintTimerRef.current = setTimeout(() => {
                  Animated.timing(grammarHintAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setGrammarHintText(null));
                }, 10000);
              });
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>DEV: grammar hint</Text>
          </TouchableOpacity>
        )}

    </KeyboardAvoidingView>

    </>
  );
});

export default function LessonScreen() {
  const router = useRouter();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const { height: windowH, width: windowW } = useWindowDimensions();
  const compact = windowH < 780;
  const isSmallScreen = windowW < 400; // compact header/spacing on narrow widths (lesson top bar used to clip past ~380)
  const { theme: t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const studyTargetRef = useRef(studyTarget);
  studyTargetRef.current = studyTarget;
  // iOS / expo-router: query params may arrive as string[] — strict `from === 'lesson_menu'` must not break.
  const { id: idParam, from: fromParam, replayIntro: replayIntroParam, replayIntroAt: replayIntroAtParam } = useLocalSearchParams<{
    id?: string | string[];
    from?: string | string[];
    replayIntro?: string | string[];
    replayIntroAt?: string | string[];
  }>();
  const id = (Array.isArray(idParam) ? idParam[0] : idParam) || '1';
  const from = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const replayIntro = (Array.isArray(replayIntroParam) ? replayIntroParam[0] : replayIntroParam) === '1';
  const replayIntroAt = Array.isArray(replayIntroAtParam) ? replayIntroAtParam[0] : replayIntroAtParam;
  const replayIntroToken = replayIntro ? (replayIntroAt || 'manual') : '';
  const lessonId = parseInt(id, 10) || 1;
  const LESSON_KEY = `lesson${lessonId}_progress`;
  const CELL_KEY   = `lesson${lessonId}_cellIndex`;
  const ORDER_KEY  = `lesson${lessonId}_phraseOrder`;
  const ERROR_REPLAY_QUEUE_KEY   = `lesson${lessonId}_errorReplayQueue`;
  const ERROR_REPLAY_SINCE_KEY   = `lesson${lessonId}_errorReplaySince`;
  const ERROR_REPLAY_OVERRIDE_KEY = `lesson${lessonId}_errorReplayOverride`;

  // Фильтруем только фразы с .words — словарные слова (без .words) не показываем в режиме кнопок
  const LESSON_DATA = getLessonData(lessonId).filter(p => p.words && p.words.length > 0);
  // Если в уроке меньше 50 фраз — не повторяем. effectiveTotal = реальное кол-во фраз.
  const effectiveTotal = Math.min(LESSON_DATA.length, TOTAL);
  const { startCell: initialStartCell, initialOrder: initialOrderFromPrime } = getInitialOrderAndCell(lessonId, LESSON_DATA.length, effectiveTotal);
  const { energy: currentEnergy, bonusEnergy, maxEnergy: currentMaxEnergy, isUnlimited: testerEnergyDisabled, spendOne, energyReady } = useEnergy();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const blocked = await shouldBlockLessonAccess(lessonId);
      if (!cancelled && blocked) openLessonAccessGate(router, lessonId);
    })();
    return () => { cancelled = true; };
  }, [lessonId, router]);
  // Refs to avoid stale closures in useCallback (checkAnswer has [progress,...] deps, not energy)
  const currentEnergyRef = useRef(currentEnergy);
  const bonusEnergyRef = useRef(bonusEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { bonusEnergyRef.current = bonusEnergy; }, [bonusEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  // cellIndex — позиция в прогресс-баре (0..49), двигается строго по кругу
  const [cellIndex,    setCellIndex]    = useState(initialStartCell);
  const [status,       setStatus]       = useState<'playing' | 'result'>('playing');
  const [selectedWords,setSelectedWords]= useState<string[]>([]);
  const [shuffled,     setShuffled]     = useState<string[]>([]);
  const [progress,     setProgress]     = useState<string[]>(() => getInitialProgressArray(effectiveTotal, lessonId));
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const spokenResultKeyRef = useRef('');
  const [wasWrong,     setWasWrong]     = useState(false);
  const [typedText,    setTypedText]    = useState('');
  const [showTapHint,  setShowTapHint]  = useState(false);
  // CHANGE v5: contraction branching state
  const [phraseWordIdx, setPhraseWordIdx] = useState(0);        // position in original phrase words
  const [contrExpanded, setContrExpanded] = useState<string[] | null>(null); // pending expansion tokens
  const correctStreakRef = useRef(0);  // для задания correct_streak + combo badge
  const todayAnswersRef  = useRef(0);  // для задания total_answers
  const userNameRef      = useRef<string | null>(null); // кешируем имя чтобы не читать AsyncStorage на каждый ответ
  // [COMBO] Отображаемое значение комбо для UI-бейджа. Обновляется в setState.
  const [comboCount, setComboCount] = useState(0);
  const [xpToastAmount, setXpToastAmount] = useState(0);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const xpToastAnim = useRef(new Animated.Value(0)).current;
  const [fiftyFiftyUsedToday, setFiftyFiftyUsedToday] = useState(0);
  const [bonusHints, setBonusHints] = useState(0);
  const [dimmedWords, setDimmedWords] = useState<Set<string>>(new Set());
  // Сбрасываем затемнение при смене набора слов (новое слово/фраза)
  useEffect(() => { setDimmedWords(new Set()); }, [shuffled]);
  const [passCount, setPassCount]   = useState(0);
  const [insufficientEnergy, setInsufficientEnergy] = useState(false);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [shouldShake, setShouldShake] = useState(false); // Trigger shake animation when energy is empty
  const [testerNoLimits, setTesterNoLimits] = useState(false); // Тестерская функция - без ограничений
  // ==================== NEW: Intro & Encouragement Screens ====================
  const [showIntroScreens, setShowIntroScreens] = useState(false);
  const [introGateReady, setIntroGateReady] = useState(false);
  const consumedReplayIntroTokenRef = useRef<string | null>(null);
  const [showToBeHint, setShowToBeHint] = useState(false);
  // No energy modal after 3 failed taps
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false);
  const [failedTapCount, setFailedTapCount] = useState(0);
  const [recoveryTimeText, setRecoveryTimeText] = useState('');
  const [showCycleEndModal, setShowCycleEndModal] = useState(false);
  const [cycleEndHasErrors, setCycleEndHasErrors] = useState(false);
  /**
   * false until loadData finishes, unless we primed from AsyncStorage before navigation
   * (see lesson_menu / primeLessonScreenFromStorage) — then first paint is already at saved cell.
   */
  const [lessonHydrated, setLessonHydrated] = useState(
    () => isLessonScreenPrimedThisSession(lessonId, LESSON_DATA.length, effectiveTotal)
  );
  // Ref для хранения колбека после закрытия модалки (навигация на lesson_complete)
  const cycleEndCallbackRef = useRef<(() => void) | null>(null);

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const toastAnim   = useRef(new Animated.Value(0)).current;
  const cursorAnim  = useRef(new Animated.Value(1)).current;
  const hintPulseAnim = useRef(new Animated.Value(0.4)).current;
  const hintLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const autoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textInputRef = useRef<any>(null);
  const sessionAnswerCount = useRef(0);   // кол-во ответов в текущей сессии
  const lessonWrongMistakesRef = useRef<PhraseMistakeInput[]>([]);
  const isReplayRef        = useRef(false); // true если урок уже был пройден полностью
  const isCompletingRef    = useRef(false); // true пока идёт задержка перед переходом на lesson_complete
  const differentLessonTrackedRef = useRef(false); // засчитали different_lessons для этого урока сегодня

  // [IMMEDIATE ERROR REPLAY] Очередь ячеек с ошибками для повтора через 2-3 вопроса
  const errorQueueRef          = useRef<number[]>([]); // cellIndex ячеек где была ошибка
  const questionsSinceErrorRef = useRef(0);            // сколько вопросов прошло после добавления в очередь
  const [overridePhraseCell, setOverridePhraseCell] = useState<number | null>(null); // если задан — показываем эту фразу вместо текущей
  const overridePhraseCellRef = useRef<number | null>(null);
  useEffect(() => { overridePhraseCellRef.current = overridePhraseCell; }, [overridePhraseCell]);

  const persistErrorReplayToStorage = useCallback((overrideForStore?: number | null) => {
    const q = errorQueueRef.current;
    const s = questionsSinceErrorRef.current;
    const o = overrideForStore !== undefined ? overrideForStore : overridePhraseCellRef.current;
    void AsyncStorage.multiSet([
      [ERROR_REPLAY_QUEUE_KEY, JSON.stringify(q)],
      [ERROR_REPLAY_SINCE_KEY, String(s)],
      [ERROR_REPLAY_OVERRIDE_KEY, o === null ? 'null' : String(o)],
    ]).catch(() => {});
  }, [ERROR_REPLAY_QUEUE_KEY, ERROR_REPLAY_OVERRIDE_KEY, ERROR_REPLAY_SINCE_KEY]);
  const [replaySolvedCorrectly, setReplaySolvedCorrectly] = useState(false); // ошибка только что исправлена — стрелка зеленеет

  // [SHUFFLE] Перемешанный порядок фраз внутри урока. Инициализируется один раз при загрузке.
  // phraseOrderRef[position] → индекс в LESSON_DATA. Только фразы текущего урока.
  const phraseOrderRef = useRef<number[]>(initialOrderFromPrime);
  const getPhraseForCell = (cell: number): any => {
    if (!LESSON_DATA || LESSON_DATA.length === 0) return null;
    const order = phraseOrderRef.current;
    if (order.length === 0) return LESSON_DATA[cell % LESSON_DATA.length];
    // order теперь имеет длину TOTAL — прямой индекс без %
    const raw = order[cell] ?? order[cell % order.length];
    const idx = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (idx < 0 || idx >= LESSON_DATA.length) return LESSON_DATA[0] ?? null;
    return LESSON_DATA[idx] ?? null;
  };

  // Фраза определяется позицией ячейки с учётом shuffle и возможного replay ошибки
  const phrase = getPhraseForCell(overridePhraseCell ?? cellIndex);


  // Safety net: если кнопки исчезли посреди предложения — восстанавливаем их
  const phraseRef = useRef<any>(null);
  const phraseWordIdxRef = useRef(0);
  phraseRef.current = phrase;
  phraseWordIdxRef.current = phraseWordIdx;
  useEffect(() => {
    if (shuffled.length > 0) return;
    const p = phraseRef.current;
    const idx = phraseWordIdxRef.current;
    if (!phraseWordRowsForStudyTarget(p, studyTarget).length) return;
    const totalWords = getPhraseTokens(p, studyTarget).length;
    if (idx >= totalWords) return; // предложение завершено — нормально
    const recovered = safeGetDistracts(p, idx, studyTarget);
    if (recovered.length > 0) setShuffled(recovered);
  }, [shuffled, studyTarget]);

  // CHANGE v5: cursor blinks only when no words are selected yet; stays solid while composing
  useEffect(() => {
    if (selectedWords.length > 0) {
      cursorAnim.setValue(1);
      return;
    }
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, [selectedWords.length]);


  useEffect(() => {
    loadData();
    // Кешируем имя один раз при монтировании — избегаем async lookup на каждый ответ
    AsyncStorage.getItem('user_name').then(n => { userNameRef.current = n; });
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [lang, lessonId]);

  useEffect(() => {
    let cancelled = false;
    const introKey = `lesson${lessonId}_intro_shown`;
    const hasIntroScreens = getLessonIntroScreens(lessonId, studyTarget).length > 0;
    if (!hasIntroScreens) {
      setShowIntroScreens(false);
      setIntroGateReady(true);
      return () => {
        cancelled = true;
      };
    }

    const shouldReplayIntro = replayIntro && replayIntroToken !== consumedReplayIntroTokenRef.current;
    if (shouldReplayIntro) {
      setShowIntroScreens(true);
      setIntroGateReady(true);
      return () => {
        cancelled = true;
      };
    }

    setIntroGateReady(false);
    AsyncStorage.getItem(introKey)
      .then((introShownRaw) => {
        if (cancelled) return;
        const shouldShowIntro = !introShownRaw;
        if (shouldShowIntro) {
          void AsyncStorage.setItem(introKey, 'true').catch(() => {});
          syncLessonIntroShownFlagNow();
        }
        setShowIntroScreens(shouldShowIntro);
        setIntroGateReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setShowIntroScreens(true);
        setIntroGateReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, replayIntro, replayIntroToken, studyTarget]);

  // Показываем подсказку один раз за сессию
  useEffect(() => {
    if (!settings.autoCheck && !settings.hardMode && !tapHintShownThisSession) {
      setShowTapHint(true);
      tapHintShownThisSession = true;
    }
  }, [settings.autoCheck, settings.hardMode]);

  // Перечитываем настройки при возврате на экран (например из settings_edu)
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(SETTINGS_KEY).then(ss => {
        if (ss) {
          try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(ss) }); } catch {}
        }
      });
    }, [])
  );

  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  useEffect(() => {
    if (status !== 'result' || !phrase || !settings.voiceOut) return;
    const line = phraseAnswerDisplayLine(phrase, studyTarget, lang);
    const key = `${String(phrase.id ?? cellIndex)}:${line}`;
    if (!line || spokenResultKeyRef.current === key) return;
    spokenResultKeyRef.current = key;
    speakAudio(line, settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget) });
  }, [cellIndex, lang, phrase, settings.speechRate, settings.voiceOut, speakAudio, status, studyTarget]);

  // Pulsing animation for to-be hint (only on first phrase of lesson 1)
  useEffect(() => {
    if (showToBeHint && cellIndex < 2) {
      hintLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(hintPulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(hintPulseAnim, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      hintLoopRef.current.start();
    } else {
      hintPulseAnim.setValue(0.4);
    }
    return () => {
      hintLoopRef.current?.stop();
    };
  }, [showToBeHint, cellIndex]);

  // Reset failed tap counter when energy recovers or phrase changes
  useEffect(() => {
    if (currentEnergy > 0) {
      setFailedTapCount(0);
    }
  }, [currentEnergy]);

  useLayoutEffect(() => {
    setFailedTapCount(0);
    // Перезагружаем доступные кнопки при смене фразы/ячейки
    // BUGFIX: используем overridePhraseCell если есть (replay), иначе cellIndex
    if (status === 'playing') {
      const p = getPhraseForCell(overridePhraseCell ?? cellIndex);
      // Skip any leading «-» zero-article positions at the start of the phrase
      const pWords = getPhraseTokens(p, studyTarget);
      let startIdx = 0;
      let startSel: string[] = [];
      while (startIdx < pWords.length && isZeroArticlePosition(pWords, startIdx)) {
        startSel.push(pWords[startIdx]);
        startIdx++;
      }
      setShuffled(startIdx < pWords.length ? safeGetDistracts(p, startIdx, studyTarget) : []);
      setSelectedWords(startSel);
      setTypedText('');
      setPhraseWordIdx(startIdx);
      setContrExpanded(null);
    }
  }, [cellIndex, overridePhraseCell, studyTarget, status]);

  // Блокирующий модал при пустой энергии — общий `NoEnergyModal` (осколки + Premium с градиентом)
  const isShowingEnergyFeedbackRef = useRef(false);
  const showEnergyEmptyFeedbackRef = useRef<() => void>(() => {});
  const showEnergyEmptyFeedback = useCallback(() => {
    if (isShowingEnergyFeedbackRef.current) return;
    isShowingEnergyFeedbackRef.current = true;
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 800);
    logEnergyLimitHit('lesson');
    trackEnergyHit().catch(() => {});
    setShowNoEnergyModal(true);
  }, [setShouldShake, setShowNoEnergyModal]);
  /**
   * Выход с урока. Не используем replace('/lesson_menu'): при canGoBack() === false
   * replace подменяет только верхний экран, и под ним снова оказывается тот же lesson_menu —
   * визуально «то же окно» и лишний шаг в стеке. dismiss(1) / dismissTo снимают копию.
   */
  const navigateUpFromLessonScreen = useCallback(() => {
    if (from === 'lesson_menu') {
      const popToMenu = () => {
        if (router.canDismiss()) {
          router.dismiss(1);
          return;
        }
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.dismissTo({ pathname: '/lesson_menu', params: { id: String(lessonId) } });
      };
      void import('./lesson_menu')
        .then((m) => m.prefetchLessonMenuCache(lessonId))
        .then(popToMenu)
        .catch(popToMenu);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      // Стек пуст (например, deeplink или router.replace без истории) — возвращаемся на главную,
      // а не на /lesson_menu: иначе lesson_menu тоже окажется без истории, и его «назад»
      // не сработает (юзер застрянет, как в сценарии после онбординга).
      router.replace('/(tabs)/home' as any);
    }
  }, [router, from, lessonId]);

  const handleLessonHeaderBack = useCallback(() => {
    logLessonAbandoned(lessonId, cellIndex, 50);
    trackLessonAbandoned().catch(() => {});
    navigateUpFromLessonScreen();
  }, [lessonId, cellIndex, navigateUpFromLessonScreen]);

  const resetNoEnergyModal = useCallback(() => {
    setShowNoEnergyModal(false);
    isShowingEnergyFeedbackRef.current = false;
  }, []);

  const dismissEnergyModal = useCallback(() => {
    resetNoEnergyModal();
    navigateUpFromLessonScreen();
  }, [navigateUpFromLessonScreen, resetNoEnergyModal]);

  // Android: системный «Назад» = тот же выход, что и кнопка (без дублей в стеке).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showNoEnergyModal) {
        resetNoEnergyModal();
        return true;
      }
      handleLessonHeaderBack();
      return true;
    });
    return () => sub.remove();
  }, [showNoEnergyModal, handleLessonHeaderBack, resetNoEnergyModal]);

  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);

  // Проверяем энергию при входе — сразу, без задержки
  const entryEnergyGateLessonRef = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      entryEnergyGateLessonRef.current = null;
    }, [lessonId])
  );

  useEffect(() => {
    if (!energyReady) return;
    if (testerEnergyDisabled) return;
    if (currentEnergy > 0 || bonusEnergy > 0) return;
    if (entryEnergyGateLessonRef.current === lessonId) return;
    entryEnergyGateLessonRef.current = lessonId;
    showEnergyEmptyFeedback();
  }, [energyReady, lessonId, currentEnergy, bonusEnergy, testerEnergyDisabled, showEnergyEmptyFeedback]);

  const loadData = async () => {
    if (!isLessonScreenPrimedThisSession(lessonId, LESSON_DATA.length, effectiveTotal)) {
      setLessonHydrated(false);
    }
    try {
      logLessonStart(lessonId);
      trackLessonStart().catch(() => {});

      // Показываем intro-экраны при первом открытии урока (если контент есть).
      // Проверку делаем РАНЬШЕ тяжёлых await, чтобы экран появился мгновенно;
      // данные урока продолжают грузиться параллельно — к моменту тапа «Начать»
      // всё уже готово.
      const introShownRaw = await AsyncStorage.getItem(`lesson${lessonId}_intro_shown`);
      if (!introShownRaw && getLessonIntroScreens(lessonId, studyTargetRef.current).length > 0) {
        await AsyncStorage.setItem(`lesson${lessonId}_intro_shown`, 'true').catch(() => {});
        syncLessonIntroShownFlagNow();
        setShowIntroScreens(true);
        setLessonHydrated(true); // снимаем спиннер — рендерим интро поверх
      }

      // Проверяем тестерские функции
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      setTesterNoLimits(noLimits === 'true');
      // energy state comes from EnergyContext — no local load needed

      loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
      const [sp, ss, ci, savedOrder, errQRaw, errSinceRaw, errOvRaw] = await Promise.all([
        AsyncStorage.getItem(LESSON_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(CELL_KEY),
        AsyncStorage.getItem(ORDER_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_QUEUE_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_SINCE_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_OVERRIDE_KEY),
      ]);

      let restoredProgress = new Array(effectiveTotal).fill('empty');
      if (sp) {
        const p: string[] = JSON.parse(sp);
        if (p.length === effectiveTotal) restoredProgress = p;
      }
      setProgress(restoredProgress);

      // Очередь «повтори ошибку через один» — только в памяти → терялась после модалки энергии / remount.
      let restoredOverrideForUi: number | null = null;
      if (!sp) {
        errorQueueRef.current = [];
        questionsSinceErrorRef.current = 0;
        setOverridePhraseCell(null);
        void AsyncStorage.multiRemove([
          ERROR_REPLAY_QUEUE_KEY,
          ERROR_REPLAY_SINCE_KEY,
          ERROR_REPLAY_OVERRIDE_KEY,
        ]).catch(() => {});
      } else {
        let restoredErrQueue: number[] = [];
        if (errQRaw) {
          try {
            const parsed = JSON.parse(errQRaw) as unknown;
            if (Array.isArray(parsed)) {
              restoredErrQueue = parsed.filter(
                (x): x is number =>
                  typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < effectiveTotal,
              );
            }
          } catch { /* keep empty */ }
        }
        let restoredSince = 0;
        if (errSinceRaw != null && errSinceRaw !== '') {
          const n = parseInt(errSinceRaw, 10);
          if (Number.isFinite(n) && n >= 0) restoredSince = Math.min(n, 1000);
        }
        let restoredOverride: number | null = null;
        if (errOvRaw != null && errOvRaw !== '' && errOvRaw !== 'null') {
          const o = parseInt(errOvRaw, 10);
          if (Number.isFinite(o) && o >= 0 && o < effectiveTotal) restoredOverride = o;
        }
        errorQueueRef.current = restoredErrQueue;
        questionsSinceErrorRef.current = restoredSince;
        if (restoredOverride !== null) {
          const stCell = restoredProgress[restoredOverride];
          const inQ = restoredErrQueue.includes(restoredOverride);
          if (!inQ && stCell !== 'wrong') restoredOverride = null;
        }
        restoredOverrideForUi = restoredOverride;
        setOverridePhraseCell(restoredOverride);
      }

      // Синхронизируем prevMedalTierRef с реальным тиром восстановленного прогресса,
      // чтобы useEffect не показывал тост при открытии урока
      const restoredCorrect = restoredProgress.filter(p => p === 'correct' || p === 'replay_correct').length;
      const restoredScore = Number((restoredCorrect / effectiveTotal * 5).toFixed(1));
      prevMedalTierRef.current = getMedalTier(restoredScore);

      // Режим повтора: если все ячейки уже correct — крутим по кругу без автозавершения
      sessionAnswerCount.current = 0;
      isCompletingRef.current = false;
      isReplayRef.current = restoredProgress.every(x => x === 'correct' || x === 'replay_correct');

      // Восстанавливаем позицию строго из CELL_KEY — каждый индикатор = конкретная фраза
      const startCell = ci !== null ? (parseInt(ci) || 0) : 0;

      // [SHUFFLE] Порядок фраз — без повторов внутри одного прохода.
      // Сохраняем в AsyncStorage чтобы при повторном входе (remount) не перегенерировать —
      // иначе уже отвеченные фразы могут снова попасть в оставшуюся часть нового shuffle.
      if (phraseOrderRef.current.length === 0 && LESSON_DATA.length > 0) {
        const n = LESSON_DATA.length;
        const count = Math.min(n, TOTAL);
        let restoredOrder: number[] | null = null;
        if (savedOrder) {
          try {
            const parsed: number[] = JSON.parse(savedOrder);
            // Валидируем: длина совпадает и все индексы в диапазоне
            if (parsed.length === count && parsed.every(i => i >= 0 && i < n)) {
              restoredOrder = parsed;
            }
          } catch {}
        }
        if (restoredOrder) {
          phraseOrderRef.current = restoredOrder;
        } else {
          const fisher = (arr: number[]) => {
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
          };
          phraseOrderRef.current = fisher(Array.from({ length: n }, (_, i) => i)).slice(0, count);
          // Сохраняем новый порядок сразу
          AsyncStorage.setItem(ORDER_KEY, JSON.stringify(phraseOrderRef.current)).catch(() => {});
        }
      }

      // Подсказка (подсветка правильного слова) только для урока 1 при первом посещении
      if (lessonId === 1 && startCell === 0 && !sp) {
        setShowToBeHint(true);
      }
      setCellIndex(startCell);

      // Перемешиваем слова для стартовой фразы (с пропуском ведущих «-» позиций)
      const order = phraseOrderRef.current;
      const phraseCellBoot = restoredOverrideForUi !== null ? restoredOverrideForUi : startCell;
      const startPhrase = order.length > 0
        ? LESSON_DATA[order[phraseCellBoot] ?? order[phraseCellBoot % order.length]]
        : LESSON_DATA[phraseCellBoot % LESSON_DATA.length];
      {
        const st = studyTargetRef.current;
        const spWords = getPhraseTokens(startPhrase, st);
        let spIdx = 0;
        while (spIdx < spWords.length && isZeroArticlePosition(spWords, spIdx)) spIdx++;
        setShuffled(spIdx < spWords.length ? safeGetDistracts(startPhrase, spIdx, st) : []);
      }

      if (ss) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(ss) };
        setSettings(loaded);
      }

      setInsufficientEnergy(false);

      // Сразу показываем урок (до вторичных await) — иначе React может сделать commit между
      // setCellIndex и setLessonHydrated в разных батчах вокруг await и кратковременно
      // показать 1/50 и первую фразу.
      setLessonHydrated(true);
      touchLessonScreenPrimed(lessonId, {
        cell: startCell,
        order: phraseOrderRef.current,
        progress: restoredProgress,
      });

      // Загружаем счётчик подсказок 50/50 за сегодня
      const todayKey = `fifty_fifty_${new Date().toISOString().slice(0, 10)}`;
      const ffCount = await AsyncStorage.getItem(todayKey);
      setFiftyFiftyUsedToday(ffCount ? parseInt(ffCount, 10) : 0);
      const bonus = await getBonusHintsToday();
      setBonusHints(bonus);

      // (проверка энергии при входе — в отдельном useEffect ниже)
    } catch (e) {
      void trackFeatureError('lesson', 'hydrate', e, { lessonId }, 'lesson1');
    } finally {
      setLessonHydrated(true);
    }
  };

  const shuffleWords = (words: string[]) => setShuffled(words);

  const checkAnswer = useCallback(async (answer: string) => {
    if (!phrase) return;
    // Блокируем ответ если энергия закончилась
    if (!testerEnergyDisabledRef.current && currentEnergyRef.current <= 0 && bonusEnergyRef.current <= 0) {
      void trackFeatureBlocked('lesson', 'answer', 'no_energy', { lessonId, cellIndex }, 'lesson1');
      showEnergyEmptyFeedbackRef.current();
      return;
    }
    const st = studyTargetRef.current;
    const expected = phraseCanonicalAnswer(phrase, st);
    const answerAlts = phraseAnswerAlternatives(phrase, st);
    const isRight = isCorrectAnswer(answer, expected, answerAlts);
    logLessonAnswer(lessonId, isRight);
    void trackActivity('lesson:answer_result', {
      feature: 'lesson',
      screen: 'lesson1',
      result: isRight ? 'success' : 'blocked',
      tags: { lessonId, cellIndex, isRight, replay: overridePhraseCell !== null },
    });
    trackAnswer(isRight).catch(() => {});
    if (isRight && !differentLessonTrackedRef.current) {
      differentLessonTrackedRef.current = true;
      (async () => {
        const lessonKey = `lesson_visited_${new Date().toISOString().split('T')[0]}`;
        const visitedRaw = await AsyncStorage.getItem(lessonKey);
        let visited: number[] = [];
        try { visited = visitedRaw ? JSON.parse(visitedRaw) : []; } catch { visited = []; }
        if (!Array.isArray(visited)) visited = [];
        if (!visited.includes(lessonId)) {
          visited.push(lessonId);
          await AsyncStorage.setItem(lessonKey, JSON.stringify(visited));
          updateMultipleTaskProgress([{ type: 'different_lessons', increment: 1 }]).catch(() => {});
        }
      })();
    }
    const np = [...progress];

    // КЛЮЧЕВАЯ ЛОГИКА:
    // Правильный ответ → ячейка зеленеет
    // Неправильный ответ → ячейка краснеет
    //   В режиме повтора (isReplay) ошибка может перекрыть зелёную ячейку → оценка падает
    if (isCompletingRef.current) return;
    sessionAnswerCount.current += 1;
    // Определяем реальную ячейку прогресса: при replay ошибки обновляем ячейку из очереди, не текущую
    const progressCell = overridePhraseCell ?? cellIndex;
    if (isRight) {
      const prevPhraseCellState = progress[progressCell];
      if (overridePhraseCell !== null) {
        // Правильный ответ в режиме replay → убираем из очереди, ячейка зеленеет
        errorQueueRef.current = errorQueueRef.current.filter(c => c !== overridePhraseCell);
        setReplaySolvedCorrectly(true); // стрелка зеленеет пока показывается экран результата
      }
      // Если ячейка всё ещё в очереди ошибок (обычный режим дошёл до неё по кругу) — не зеленим,
      // она должна оставаться красной до исправления через replay
      const stillPendingReplay = overridePhraseCell === null && errorQueueRef.current.includes(progressCell);
      np[progressCell] = stillPendingReplay ? 'wrong'
        : (isReplayRef.current ? 'replay_correct' : 'correct');
      if (!stillPendingReplay) {
        const wasLearned = prevPhraseCellState === 'correct' || prevPhraseCellState === 'replay_correct';
        if (!wasLearned) void bumpStatsDaily('phrases_learned', 1);
      }
    } else {
      // Ошибка всегда перезаписывает ячейку красной (даже если была зелёной)
      np[progressCell] = 'wrong';
      // [IMMEDIATE ERROR REPLAY] Добавляем в очередь если ещё не там.
      // Если ошибка в режиме replay (overridePhraseCell !== null) — убираем из очереди:
      // одна попытка replay за цикл, следующая встреча только на следующем полном круге.
      // Если обычная ошибка — добавляем в очередь (сброс questionsSince только при первой).
      if (overridePhraseCell !== null) {
        // Провалили replay — выкидываем из очереди, больше не повторяем в этом цикле
        errorQueueRef.current = errorQueueRef.current.filter(c => c !== overridePhraseCell);
      } else if (!errorQueueRef.current.includes(progressCell)) {
        const wasEmpty = errorQueueRef.current.length === 0;
        errorQueueRef.current.push(progressCell);
        if (wasEmpty) {
          questionsSinceErrorRef.current = 0;
        }
      }
      if (!isReplayRef.current) {
        correctStreakRef.current = 0;
      }
      // [SRS] Записываем ошибку в хранилище интервального повторения.
      // phraseCanonicalAnswer(...) — ключ как при проверке (совпадает со слотами words).
      // phrase.russian — подсказка (русский/украинский перевод, будет показан на лицевой стороне карточки).
      // lessonId — для фильтрации по уроку (getItemsByLesson) и отображения метки на карточке.
      // Если фраза уже есть в базе — errorCount++, interval сбрасывается к 1 дню.
      // Если фраза новая — добавляется с nextDue = завтра.
      {
        const stRm = studyTargetRef.current;
        // Аналитический лог ошибки (mistake_log.ts)
        const analyticsPhraseKey = phraseCanonicalAnswer(phrase, stRm);
        // Тренер: записываем фразу с errorWord (слово на котором ошибся)
        {
          const canonKey = phraseCanonicalAnswer(phrase, stRm);
          const correctTokens = canonKey.split(/\s+/).filter(Boolean);
          const resolvedToken = resolvePhraseMistakeToken(canonKey, selectedWords.join(' '));
          const tokenRows = phraseWordRowsForStudyTarget(phrase, stRm);
          const tokenIndex = resolvedToken?.tokenIndex ?? 0;
          const tokenRow = tokenIndex >= 0 ? tokenRows[tokenIndex] : undefined;
          const errWord = resolvedToken?.tokenText ?? tokenRow?.correct ?? tokenRow?.text ?? correctTokens[0] ?? canonKey;
          const mistakeMeta = {
            phraseId: phrase.id,
            tokenText: errWord,
            tokenIndex: tokenIndex >= 0 ? tokenIndex : undefined,
            expected: tokenRow?.correct ?? tokenRow?.text ?? errWord,
            picked: resolvedToken?.picked,
            rawCategory: tokenRow?.category,
          };
          recordMistake(
            canonKey,
            phrase.russian,
            lessonId,
            phrase.ukrainian,
            'lesson',
            spanishSurfacesEnabled(lang, stRm) ? phrase.spanish : undefined,
            mistakeMeta,
          );
          logMistake(analyticsPhraseKey || canonKey, lessonId, 'lesson', 'wrong_pick', mistakeMeta);
          lessonWrongMistakesRef.current.push({ phrase: analyticsPhraseKey || canonKey, ...mistakeMeta });
          void recordPhraseMistake(
            canonKey,
            phrase.russian,
            phrase.ukrainian ?? phrase.russian,
            lessonId,
            errWord,
            tokenRow?.category,
            phrase.spanish,
          );
        }
      }
    }

    // Триггеры ежедневных заданий + XP
    if (isRight) {
      correctStreakRef.current += 1;
      todayAnswersRef.current += 1;
      setComboCount(correctStreakRef.current);
      const lessonUpdates: Parameters<typeof updateMultipleTaskProgress>[0] = [
        { type: 'correct_streak' },
        { type: 'lesson_no_mistakes' },
        { type: 'total_answers' },
        { type: 'daily_active' },
      ];
      const hour = new Date().getHours();
      if (hour < 12) lessonUpdates.push({ type: 'morning_session' });
      if (hour >= 18) lessonUpdates.push({ type: 'evening_session' });
      updateMultipleTaskProgress(lessonUpdates);
      // Начисляем XP: 5 базовых × комбо-множитель (за серию без ошибок подряд внутри урока)
      const comboM = correctStreakRef.current >= 25 ? 3.0
        : correctStreakRef.current >= 15 ? 2.5
        : correctStreakRef.current >= 10 ? 2.0
        : correctStreakRef.current >= 5  ? 1.5
        : 1.0;
      const xpAmount = Math.round(5 * comboM);
      
      if (userNameRef.current) {
        // Run XP registration in background — do NOT await (blocks JS thread on every answer → ANR)
        registerXP(xpAmount, 'lesson_answer', userNameRef.current, lang, lessonId)
          .then(xpResult => {
            if (xpResult.finalDelta > 0) {
              setXpToastAmount(xpResult.finalDelta);
              setXpToastVisible(true);
              xpToastAnim.setValue(0);
              Animated.sequence([
                Animated.timing(xpToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.delay(900),
                Animated.timing(xpToastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
              ]).start(() => setXpToastVisible(false));
            }
          })
          .catch(() => {});
      }
      // [COMBO] Ачивки за серию правильных ответов
      checkAchievements({ type: 'combo', count: correctStreakRef.current }).catch(() => {});
      // [TIME] Ачивки за ночное/утреннее обучение
      if (correctStreakRef.current === 1) {
        checkAchievements({ type: 'time_of_day' }).catch(() => {});
      }
    } else {
      correctStreakRef.current = 0;
      setComboCount(0);
      todayAnswersRef.current += 1;
      if (!isReplayRef.current) {
        // Атомарно сбрасываем streak-задания и считаем total_answers
        resetAndUpdateTaskProgress(
          ['lesson_no_mistakes', 'correct_streak'],
          [{ type: 'total_answers' }],
        );
      } else {
        updateMultipleTaskProgress([{ type: 'total_answers' }]);
      }

      // При ОШИБКЕ: тратим энергию через контекст (используем refs — нет stale closure)
      if ((currentEnergyRef.current > 0 || bonusEnergyRef.current > 0) && !testerEnergyDisabledRef.current) {
        spendOneRef.current().then(success => {
          if (success) {
            updateMultipleTaskProgress([{ type: 'energy_spend', increment: 1 }]).catch(() => {});
            if (currentEnergyRef.current === 0 && bonusEnergyRef.current === 0) {
              setTimeout(() => { showEnergyEmptyFeedbackRef.current(); }, 1000);
            }
          }
        }).catch(() => {});
      }
    }

    setWasWrong(!isRight);
    setProgress(np);
    persistErrorReplayToStorage();

    if (!isRight && settings.haptics) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    // Сразу показываем результат — НЕ ждать AsyncStorage (await раньше давал 1–3 с задержки UI).
    setStatus('result');

    // ==================== NEW: Handle to-be hint and encouragement screens ====================
    if (isRight) {
      // Disable correct-word hint after first two tests
      if (cellIndex === 1) {
        setShowToBeHint(false);
      }

    }
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();

    const nextCell = (cellIndex + 1) % effectiveTotal;
    void AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np)).catch(() => {});
    void AsyncStorage.setItem(CELL_KEY, String(nextCell)).catch(() => {});
    touchLessonScreenPrimed(lessonId, { cell: nextCell, order: phraseOrderRef.current, progress: np });

    // Проверяем завершение урока: только когда юзер дошёл до конца круга (nextCell === 0)
    // и ответил минимум на effectiveTotal вопросов в сессии.
    // Исключаем replay-ответы — при них cellIndex не двигается вперёд по кругу.
    if (nextCell === 0 && overridePhraseCell === null && sessionAnswerCount.current >= effectiveTotal) {
      void trackFeatureStart('lesson', 'complete', { lessonId, effectiveTotal }, 'lesson1');
      sessionAnswerCount.current = 0; // сброс для следующего повтора
      isReplayRef.current = true;
      isCompletingRef.current = true;
      // НЕ сбрасываем phraseOrderRef здесь: пока экран «результат» виден ~1.5 с, phrase =
      // getPhraseForCell(cellIndex) ещё должен использовать тот же shuffle — иначе русский/
      // эталон EN перескакивают на LESSON_DATA[cell], а selectedWords остаются от реальной фразы.
      setTimeout(async () => {
        const resetShuffleForNextPass = () => {
          phraseOrderRef.current = [];
          AsyncStorage.removeItem(ORDER_KEY).catch(() => {});
          errorQueueRef.current = [];
          questionsSinceErrorRef.current = 0;
          void AsyncStorage.multiRemove([
            ERROR_REPLAY_QUEUE_KEY,
            ERROR_REPLAY_SINCE_KEY,
            ERROR_REPLAY_OVERRIDE_KEY,
          ]).catch(() => {});
        };
        try {
        // Получаем финальную оценку урока перед переходом на lesson_complete
        const correct = np.filter(x => x === 'correct' || x === 'replay_correct').length;
        let finalScore = parseFloat((correct / effectiveTotal * 5).toFixed(1));

        // Если включен режим "Без ограничений", даём 5 баллов автоматически
        const noLimits = await AsyncStorage.getItem('tester_no_limits');
        if (noLimits === 'true') {
          finalScore = 5;
        }

        // Пытаемся разблокировать следующий урок
        const didUnlock = await tryUnlockNextLesson(lessonId, finalScore);
        if (didUnlock && lessonId === 1) {
          void import('./cloud_sync')
            .then((m) => m.syncToCloud({ forceNow: true }))
            .catch(() => {});
          void import('./shards_system')
            .then((m) => {
              setTimeout(() => m.loadShardsFromCloud().catch(() => {}), 2000);
            })
            .catch(() => {});
        }

        logLessonComplete(lessonId);
        void trackFeatureSuccess('lesson', 'complete', {
          lessonId,
          finalScore,
          didUnlock,
          correct,
          effectiveTotal,
        }, 'lesson1');
        updateMultipleTaskProgress([{ type: 'lesson_complete', increment: 1 }]).catch(() => {});

        let coachRouteParams = {};
        try {
          const decision = await checkCoachToastNeededWithAnalytics(lessonWrongMistakesRef.current);
          coachRouteParams = coachToastDecisionToRouteParams(decision);
        } catch {
          coachRouteParams = {};
        }

        const navigate = () => {
          resetShuffleForNextPass();
          lessonWrongMistakesRef.current = [];
          router.replace({
            pathname: '/lesson_complete',
            params: { id: String(lessonId), unlocked: didUnlock ? '1' : '0', ...coachRouteParams },
          });
        };

        const hasErrors = np.some(x => x !== 'correct' && x !== 'replay_correct');
        cycleEndCallbackRef.current = navigate;
        setCycleEndHasErrors(hasErrors);
        setShowCycleEndModal(true);
        } catch (e) {
          void trackFeatureError('lesson', 'complete', e, { lessonId }, 'lesson1');
          // Fallback: navigate to lesson_complete even if tracking fails
          resetShuffleForNextPass();
          lessonWrongMistakesRef.current = [];
          router.replace({ pathname: '/lesson_complete', params: { id: String(lessonId), unlocked: '0' } });
        }
      }, 1500);
      return;
    }

    if (settings.autoAdvance && isRight) {
      autoTimer.current = setTimeout(() => goNext(np), 4000);
    }
  }, [progress, cellIndex, phrase, settings, fadeAnim, lessonId, overridePhraseCell, lang, persistErrorReplayToStorage]);

  const goNext = useCallback(async (_currentProgress?: string[]) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);

    // [IMMEDIATE ERROR REPLAY] Определяем ДО того как двигать cellIndex
    questionsSinceErrorRef.current += 1;
    let replayCell: number | null = null;
    if (questionsSinceErrorRef.current >= 2 && errorQueueRef.current.length > 0) {
      replayCell = errorQueueRef.current[0];
      questionsSinceErrorRef.current = 0;
    }

    // BUGFIX: при replay НЕ двигаем cellIndex вперёд — иначе позиция пропускается.
    // Если replay — остаёмся на текущей позиции; иначе — +1 по кругу.
    const nextCell = replayCell !== null ? cellIndex : (cellIndex + 1) % effectiveTotal;
    setCellIndex(nextCell);

    stopAudio();
    setStatus('playing');
    setSelectedWords([]);
    setTypedText('');
    setWasWrong(false);
    setPhraseWordIdx(0);    // CHANGE v5: reset contraction branching
    setContrExpanded(null); // CHANGE v5
    fadeAnim.setValue(0);
    if (settings.hardMode) setTimeout(() => textInputRef.current?.focus(), 50);

    setOverridePhraseCell(replayCell);
    setReplaySolvedCorrectly(false); // сбрасываем зелёный флаг — стрелка возвращается на текущую позицию
    persistErrorReplayToStorage(replayCell);

    // Фраза для следующей позиции (с учётом replay и shuffle)
    const phraseCell = replayCell ?? nextCell;
    const nextPhrase = getPhraseForCell(phraseCell);
    {
      const st = studyTargetRef.current;
      const npWords = getPhraseTokens(nextPhrase, st);
      let npIdx = 0;
      const npSel: string[] = [];
      while (npIdx < npWords.length && isZeroArticlePosition(npWords, npIdx)) {
        npSel.push(npWords[npIdx]);
        npIdx++;
      }
      if (npSel.length > 0) {
        setSelectedWords(npSel);
        setPhraseWordIdx(npIdx);
      }
      setShuffled(npIdx < npWords.length ? safeGetDistracts(nextPhrase, npIdx, st) : []);
    }

    // Сохраняем позицию
    try { await AsyncStorage.setItem(CELL_KEY, String(nextCell)); } catch {}
    touchLessonScreenPrimed(lessonId, { cell: nextCell, order: phraseOrderRef.current, progress });
  }, [cellIndex, progress, fadeAnim, LESSON_DATA, persistErrorReplayToStorage]);

  // CHANGE v5: rewritten for contraction branching using phraseWordIdx
  // Energy is only spent on mistakes — no gate here, users can always attempt answers
  const handleWordPress = useCallback((word: string) => {
    if (status === 'result') return;
    if (showNoEnergyModal) return;

    const phraseWords = getPhraseTokens(phrase, studyTargetRef.current);
    const totalPhraseWords = phraseWords.length;
    const next = [...selectedWords, word];

    // Helper: advance past any «-» zero-article positions starting from idx,
    // collecting them into the selected words array silently.
    const skipZeroArticles = (fromIdx: number, currentSel: string[]): { idx: number; sel: string[] } => {
      let idx = fromIdx;
      let sel = currentSel;
      while (idx < totalPhraseWords && isZeroArticlePosition(phraseWords, idx)) {
        sel = [...sel, phraseWords[idx]];
        idx++;
      }
      return { idx, sel };
    };

    // Expansion mode: collecting the second token of a contraction (e.g. "not" after "do")
    if (contrExpanded !== null && contrExpanded.length > 0) {
      const remaining = contrExpanded.slice(1);
      if (remaining.length === 0) {
        // All expansion tokens collected — advance to next phrase word (skip «-» if needed)
        const rawIdx = phraseWordIdx + 1;
        const { idx: newIdx, sel: newSel } = skipZeroArticles(rawIdx, next);
        setContrExpanded(null);
        setSelectedWords(newSel);
        setPhraseWordIdx(newIdx);
        if (newIdx >= totalPhraseWords) {
          setShuffled([]);
          if (settings.autoCheck) checkAnswer(newSel.join(' '));
        } else {
          setShuffled(safeGetDistracts(phrase, newIdx, studyTargetRef.current));
        }
      } else {
        setSelectedWords(next);
        setContrExpanded(remaining);
        setShuffled(makeExpansionOptions(remaining[0]));
      }
      return;
    }

    // Normal mode: check if user picked the first expanded token of the expected contraction
    const correctWord = phraseWords[phraseWordIdx];
    const contrEntry = lookupContraction(correctWord ?? '');
    if (contrEntry && word.toLowerCase() === contrEntry[0].toLowerCase()) {
      // User picked expanded[0] (e.g. "do" when expected "don\'t") — enter expansion mode
      setSelectedWords(next);
      setContrExpanded(contrEntry.slice(1)); // ["not"]
      // phraseWordIdx stays — still on the same original contraction word
      setShuffled(makeExpansionOptions(contrEntry[1]));
      return;
    }

    // Check if user picked a contraction that covers current word + next word
    // e.g. expected "do" + "not" but user picked "don\'t" → skip "not"
    const currentExpected = phraseWords[phraseWordIdx] ?? '';
    const nextExpected = phraseWords[phraseWordIdx + 1] ?? '';
    const matchingContraction = getContractionFor(currentExpected, nextExpected);
    if (matchingContraction && word.toLowerCase() === matchingContraction.toLowerCase()) {
      // Contraction chosen — skip the next word (e.g. "not") and advance by 2, then skip «-»
      const rawSkipIdx = phraseWordIdx + 2;
      const { idx: skipIdx, sel: skipSel } = skipZeroArticles(rawSkipIdx, next);
      setSelectedWords(skipSel);
      setPhraseWordIdx(skipIdx);
      if (skipIdx >= totalPhraseWords) {
        setShuffled([]);
        if (settings.autoCheck) checkAnswer(skipSel.join(' '));
      } else {
        setShuffled(safeGetDistracts(phrase, skipIdx, studyTargetRef.current));
      }
      return;
    }

    // Regular word picked (or contraction picked directly)
    const rawNewIdx = phraseWordIdx + 1;
    const { idx: newIdx, sel: newSel } = skipZeroArticles(rawNewIdx, next);
    setSelectedWords(newSel);
    setPhraseWordIdx(newIdx);

    // Early completion: assembled answer already matches an alternative (e.g. optional word skipped)
    const assembled = newSel.join(' ');
    const stEarly = studyTargetRef.current;
    const canonEarly = phrase ? phraseCanonicalAnswer(phrase, stEarly) : '';
    const altsEarly = phrase ? phraseAnswerAlternatives(phrase, stEarly) : undefined;
    if (altsEarly?.length && phrase && isCorrectAnswer(assembled, canonEarly, altsEarly)) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(assembled);
      return;
    }

    if (newIdx >= totalPhraseWords) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(newSel.join(' '));
    } else {
      setShuffled(safeGetDistracts(phrase, newIdx, studyTargetRef.current));
    }
  }, [status, currentEnergy, testerNoLimits, testerEnergyDisabled, selectedWords, phrase, phraseWordIdx, contrExpanded, settings.autoCheck, checkAnswer]);

  const handleTypedSubmit = useCallback(() => {
    if (typedText.trim() && status === 'playing') checkAnswer(typedText);
  }, [typedText, status, checkAnswer]);

  // CHANGE v5: updated for contraction branching undo
  const undoLastWord = useCallback(() => {
    if (status === 'result') return;
    if (settings.hardMode) {
      const words = typedText.trim().split(/\s+/);
      words.pop();
      setTypedText(words.join(' '));
    } else {
      if (!selectedWords.length) return;
      if (contrExpanded !== null) {
        // In expansion mode: undo the first expansion token picked, exit expansion mode
        setSelectedWords((p: string[]) => p.slice(0, -1));
        setContrExpanded(null);
        setShuffled(safeGetDistracts(phrase, phraseWordIdx, studyTargetRef.current));
        return;
      }
      // Normal undo: pop last word + any trailing auto-skipped '-' tokens, decrement phraseWordIdx.
      // Auto-skipped '-' tokens are added silently when advancing past zero-article positions.
      // Count how many trailing '-' tokens exist in selectedWords (all auto-skipped).
      let autoSkipCount = 0;
      for (let i = selectedWords.length - 1; i >= 0; i--) {
        if (selectedWords[i] === '-') autoSkipCount++;
        else break;
      }
      const totalPopCount = 1 + autoSkipCount; // 1 manual word + auto-skipped '-'
      const newSelected = selectedWords.slice(0, -totalPopCount);
      // Get the last MANUALLY selected word (before auto-skipped tokens)
      const lastWord = selectedWords[selectedWords.length - 1 - autoSkipCount] ?? '';
      const phraseWordsForUndo = getPhraseTokens(phrase, studyTargetRef.current);
      // When checking for 2-word contraction, look at positions before any auto-skips
      const baseIdx = phraseWordIdx - autoSkipCount;
      const twoWordContr = baseIdx >= 2
        ? getContractionFor(phraseWordsForUndo[baseIdx - 2] ?? '', phraseWordsForUndo[baseIdx - 1] ?? '')
        : null;
      const wasSkip2 = twoWordContr != null && lastWord.toLowerCase() === twoWordContr.toLowerCase();
      const newPhraseIdx = Math.max(0, phraseWordIdx - totalPopCount - (wasSkip2 ? 1 : 0));
      setSelectedWords(newSelected);
      setPhraseWordIdx(newPhraseIdx);
      // Check if last remaining word is expansion[0] of the contraction at newPhraseIdx
      // (happens when undoing the last expansion token, e.g. undoing "not" after "do")
      if (newSelected.length > 0) {
        const phraseWords = getPhraseTokens(phrase, studyTargetRef.current);
        const origWord = phraseWords[newPhraseIdx];
        const prevContr = lookupContraction(origWord ?? '');
        if (prevContr && newSelected[newSelected.length - 1].toLowerCase() === prevContr[0].toLowerCase()) {
          // Restore expansion mode — user needs to pick the second token again
          setContrExpanded(prevContr.slice(1));
          setShuffled(makeExpansionOptions(prevContr[1]));
          return;
        }
      }
      setShuffled(safeGetDistracts(phrase, newPhraseIdx, studyTargetRef.current));
    }
  }, [status, settings.hardMode, typedText, selectedWords, contrExpanded, phrase, phraseWordIdx]);


  const correctCount = useMemo(() => progress.filter(p => p === 'correct' || p === 'replay_correct').length, [progress]);
  const wrongCount   = useMemo(() => progress.filter(p => p === 'wrong').length, [progress]);
  const score = useMemo(() => Number((correctCount / effectiveTotal * 5).toFixed(1)), [correctCount, effectiveTotal]);

  // ── Medal tier change toast ──────────────────────────────────────────────────
  const prevMedalTierRef = useRef<MedalTier>('none');
  const medalToastInitializedRef = useRef(false);
  const [medalToast, setMedalToast] = useState<{ tier: MedalTier; promoted: boolean } | null>(null);
  const medalToastAnim = useRef(new Animated.Value(0)).current;

  const showMedalToast = useCallback((tier: MedalTier, promoted: boolean) => {
    setMedalToast({ tier, promoted });
    medalToastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(medalToastAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(2200),
      Animated.timing(medalToastAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setMedalToast(null));
  }, [medalToastAnim]);

  useEffect(() => {
    const current = getMedalTier(score);
    if (!medalToastInitializedRef.current) {
      // On screen open/restored progress, sync baseline without showing toast.
      prevMedalTierRef.current = current;
      medalToastInitializedRef.current = true;
      return;
    }

    const prev = prevMedalTierRef.current;
    const tierOrder: MedalTier[] = ['none', 'bronze', 'silver', 'gold'];
    const prevIdx = tierOrder.indexOf(prev);
    const curIdx  = tierOrder.indexOf(current);
    if (curIdx !== prevIdx) {
      // Only show after at least a few answers to avoid toast on load
      if (correctCount > 0) {
        if (curIdx > prevIdx) showMedalToast(current, true);
        else showMedalToast(prev, false);
      }
      prevMedalTierRef.current = current;
    }
  }, [score, correctCount, showMedalToast]);
  // ────────────────────────────────────────────────────────────────────────────

  // Жёлтая подсветка для поля ввода когда 0 слов + тап
  const [emptyTapFlash, setEmptyTapFlash] = useState(false);

  const handleBgTap = useCallback(() => {
    if (showNoEnergyModal) return;
    if (settings.hardMode) return; // hard mode — нет тапа по фону, только клавиатура
    if (status === 'result') return;
    // Скрываем хинт при первом тапе
    if (showTapHint) setShowTapHint(false);
    if (selectedWords.length === 0) {
      // 0 слов — мигаем жёлтым, не считаем за ошибку
      setEmptyTapFlash(true);
      setTimeout(() => setEmptyTapFlash(false), 700);
    } else {
      // Не оцениваем неполную фразу по тапу фона — иначе ложные ошибки при промахе мимо чипов
      if (!isPhraseAssemblyComplete(phrase, studyTarget, selectedWords, phraseWordIdx)) {
        setEmptyTapFlash(true);
        setTimeout(() => setEmptyTapFlash(false), 700);
        return;
      }
      checkAnswer(selectedWords.join(' '));
    }
  }, [status, settings.hardMode, showTapHint, selectedWords, phrase, studyTarget, phraseWordIdx, checkAnswer]);

  const handleFiftyFifty = useCallback(() => {
    if (fiftyFiftyUsedToday >= 3 + bonusHints || !phrase) return;

    const phraseWordsList = getPhraseTokens(phrase, studyTargetRef.current);
    const correctWord = phraseWordsList[phraseWordIdx] ?? null;
    const nextCorrectWord = phraseWordsList[phraseWordIdx + 1] ?? null;
    const validContraction = correctWord && nextCorrectWord
      ? getContractionFor(correctWord, nextCorrectWord)
      : null;

    const isCorrect = (word: string): boolean => {
      const stripped = stripMarkers(word).toLowerCase();
      if (contrExpanded !== null && contrExpanded.length > 0) {
        return stripped === contrExpanded[0].toLowerCase();
      }
      return correctWord != null && (
        stripped === correctWord.toLowerCase() ||
        (validContraction != null && stripped === validContraction.toLowerCase())
      );
    };

    const wrong = shuffled.filter(w => !isCorrect(w));
    if (wrong.length < 1) return; // нечего затемнять

    // Затемняем ровно 3 неправильных дистрактора
    const shuffledWrong = [...wrong].sort(() => Math.random() - 0.5);
    const toDim = shuffledWrong.slice(0, Math.min(3, wrong.length));

    setDimmedWords(new Set(toDim));

    const newCount = fiftyFiftyUsedToday + 1;
    setFiftyFiftyUsedToday(newCount);
    const todayKey = `fifty_fifty_${new Date().toISOString().slice(0, 10)}`;
    AsyncStorage.setItem(todayKey, String(newCount));
  }, [fiftyFiftyUsedToday, bonusHints, phrase, phraseWordIdx, shuffled, contrExpanded]);

  return (
    <>
    <TouchableWithoutFeedback onPress={settings.hardMode ? undefined : handleBgTap}>
      <ScreenGradient>
        <LessonArtBackdrop variant="practice" />
        <SafeAreaView style={{ flex: 1 }}>
          <LessonContent
            showIntroScreens={showIntroScreens}
            introGateReady={introGateReady}
            setShowIntroScreens={setShowIntroScreens}
            onIntroDone={async () => {
              if (replayIntro) consumedReplayIntroTokenRef.current = replayIntroToken || 'manual';
              await AsyncStorage.setItem(`lesson${lessonId}_intro_shown`, 'true').catch(() => {});
              syncLessonIntroShownFlagNow();
              setShowIntroScreens(false);
            }}
            lessonId={lessonId}
            compact={compact}
            isSmallScreen={isSmallScreen}
            phrase={phrase}
            selectedWords={selectedWords}
            status={status}
            handleBgTap={handleBgTap}
            handleWordPress={handleWordPress}
            undoLastWord={undoLastWord}
            goNext={goNext}
            handleTypedSubmit={handleTypedSubmit}
            typedText={typedText}
            setTypedText={setTypedText}
            shuffled={shuffled}
            cursorAnim={cursorAnim}
            fadeAnim={fadeAnim}
            cellIndex={cellIndex}
            passCount={passCount}
            correctCount={correctCount}
            wrongCount={wrongCount}
            score={score}
            currentEnergy={currentEnergy}
            currentMaxEnergy={currentMaxEnergy}
            progress={progress}
            comboCount={comboCount}
            showTapHint={showTapHint}
            setShowTapHint={setShowTapHint}
            showToBeHint={showToBeHint}
            phraseWordIdx={phraseWordIdx}
            hintPulseAnim={hintPulseAnim}
            wasWrong={wasWrong}
            textInputRef={textInputRef}
            settings={settings}
            router={router}
            s={s}
            t={t}
            f={f}
            themeMode={themeMode}
            lang={lang}
            emptyTapFlash={emptyTapFlash}
            setEmptyTapFlash={setEmptyTapFlash}
            shouldShake={shouldShake}
            setShouldShake={setShouldShake}
            recoveryTimeText={recoveryTimeText}
            setFailedTapCount={setFailedTapCount}
            checkAnswer={checkAnswer}
            contrExpanded={contrExpanded}
            onFiftyFifty={handleFiftyFifty}
            fiftyFiftyUsedToday={fiftyFiftyUsedToday}
            bonusHints={bonusHints}
            dimmedWords={dimmedWords}
            displayCell={overridePhraseCell ?? cellIndex}
            isErrorReplay={overridePhraseCell !== null}
            replaySolvedCorrectly={replaySolvedCorrectly}
            xpToastVisible={xpToastVisible}
            xpToastAmount={xpToastAmount}
            xpToastAnim={xpToastAnim}
            realPhraseIdx={(() => { const order = phraseOrderRef.current; const cell = overridePhraseCell ?? cellIndex; if (order.length === 0) return cell % (LESSON_DATA?.length || 1); return order[cell] ?? order[cell % order.length]; })()}
            studyTarget={studyTarget}
            toastAnim={toastAnim}
            from={from}
            onHeaderBack={handleLessonHeaderBack}
          />
        </SafeAreaView>

        {/* ── Medal tier toast (premium) ── */}
        {medalToast && (
          <MedalToast
            tier={medalToast.tier}
            promoted={medalToast.promoted}
            anim={medalToastAnim}
            bg={t.bgCard}
            isLightTheme={themeMode === 'minimalLight'}
            lang={lang}
            spanishUiActive={spanishLessonUiStringsActive(lang, studyTarget)}
          />
        )}
        {/* ────────────────────────────── */}
      </ScreenGradient>
    </TouchableWithoutFeedback>
    <NoEnergyModal
      visible={showNoEnergyModal}
      onClose={resetNoEnergyModal}
      onGotIt={dismissEnergyModal}
      paywallContext="no_energy"
    />
    <LessonCycleEndModal
      visible={showCycleEndModal}
      hasErrors={cycleEndHasErrors}
      lang={lang}
      studyTarget={studyTarget}
      t={t}
      f={f}
      onClose={() => {
        setShowCycleEndModal(false);
        cycleEndCallbackRef.current?.();
        cycleEndCallbackRef.current = null;
      }}
    />
    </>
  );
}
