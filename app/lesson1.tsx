import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { withOptionalPersonalPlanSunsetGuard } from './personal_plan_sunset_guard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlowText } from '../components/text-integrity/FlowText';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import DuoPressable from '../components/DuoPressable';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import LessonFirstFrame from '../modules/lesson_first_frame';
import { triLang, type Lang } from '../constants/i18n';
import { getCardShadow, useTheme } from '../components/ThemeContext';
import { screenTextOnGradient, ThemeMode } from '../constants/theme';
import { isCorrectAnswer, normalizeLessonAssemblyAnswer } from '../constants/contractions';
import { checkAchievements } from './achievements';
import { bumpStatsDaily } from './stats_daily_breakdown';
import { getCurrentMultiplierBreakdown, getLessonDifficultyMultiplier, registerXP } from './xp_manager';
import { trackActivity, trackFeatureBlocked, trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { useEffectivePlatformOS } from './platform_ui_preview';
import AddToFlashcard from '../components/AddToFlashcard';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import TapScale from '../components/TapScale';
import SpeakingPanel, { buildSpeakingPanelTheme } from '../components/SpeakingPanel';
import SpeakingInlineSlot from '../components/SpeakingInlineSlot';
import SpeakingInlineResultStars, { type SpeakingAttemptResult } from '../components/SpeakingInlineResultStars';
import { isSpeakingEnabled } from './remote_flags';
import { isTesterNoLimitsActive } from './premium_guard';
import { usePremium, useFeatureAccess } from '../components/PremiumContext';
import { hapticTap } from '../hooks/use-haptics';
import { useScreen } from '../hooks/use-screen';
import { useAudio } from '../hooks/use-audio';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useHintRevealCue } from '../hooks/use-hint-reveal-cue';
import fk from './feedback/feedback_kit';
import { comboLevelFor } from './feedback/combo_engine';
import ComboRing from '../components/feedback/ComboRing';
import { captureObjectiveAttempt } from './mistake_practice_capture';
import { getStableId } from './stable_id';
import { resolvePhraseMistakeToken } from './mistake_token_resolver';
import {
  lessonTeachingNoteSeenStorageKey,
  parseLessonTeachingNoteSeenIds,
  resolvePhraseTeachingNote,
  serializeLessonTeachingNoteSeenIds,
  shouldShowLessonTeachingNote,
  type ResolvedLessonTeachingNote,
} from './lesson_teaching_notes';
import type { PhraseMistakeInput } from './phrase_analytics';
import { logLessonComplete, logLessonStart, logLessonAbandoned, logLessonAnswer, logEnergyLimitHit } from './firebase';
import {
  createLessonAnalyticsAttempt,
  lessonAttemptElapsedMs,
  markLessonAttemptStarted,
  markLessonAttemptTerminal,
} from './lesson_analytics_attempt';
import { trackLessonStart, trackLessonAbandoned, trackAnswer, trackEnergyHit } from './user_stats';
import { useEnergy } from '../components/EnergyContext';
import { getLessonData, getLessonEncouragementScreens, getLessonIntroScreens } from './lesson_data_all';
import { isInteractiveTheoryLesson } from './theory_topic_accents';
import type { LessonPhrase } from './lesson_data_types';
import { answerDisplayLineWithCanonicalPunctuation, phraseAnswerAlternatives, phraseAnswerDisplayLine, phraseCanonicalAnswer, phraseHasStudyTargetContent, phrasePrimarySurface, phraseWordRowsForStudyTarget, ttsLocaleForStudyTarget } from './phrase_target_utils';

// Enabled by default with the same emergency build-time rollback as the shared
// navigation helper. Native dismissTo releases the abandoned lesson stack.
const NATIVE_LESSON_DISMISS_ENABLED =
  typeof process === 'undefined' || process.env.EXPO_PUBLIC_NATIVE_POP_TO_BACK !== '0';
import { isCorrectLessonHardModeTypedAnswer } from './lesson_hard_mode_answer_tolerance';
import { frenchStudyActive, spanishLessonUiStringsActive, spanishStudyActive, spanishSurfacesEnabled } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';
import BouncyScrollView from '../components/BouncyScrollView';
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
  getInitialOverridePhraseCell,
  getInitialProgressArray,
  isLessonScreenPrimedThisSession,
  touchLessonScreenPrimed,
} from './lesson_screen_bootstrap';
import { getBonusHintsToday } from './level_gift_system';
import { lessonPhraseReportDataId } from './error_report';
import ReportErrorButton from '../components/ReportErrorButton';
import ExplainSheet from '../components/ExplainSheet';
import AiMistakeCard from '../components/AiMistakeCard';
import MistakeEli5Modal from '../components/MistakeEli5Modal';
import AiExplainConsentModal from '../components/AiExplainConsentModal';
import MedalToast from '../components/MedalToast';
import NoEnergyModal from '../components/NoEnergyModal';
import { openLessonGateByRuntime, shouldBlockLessonAccess } from './lesson_premium_gate';
import { MOTION_DURATION } from '../constants/motion';
import { fiftyFiftyUsageKey, grammarHintSeenKey, lastOpenedLessonKey, lessonIntroShownKey, lessonProgressKey, lessonSessionKey } from './target_storage_keys';
import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate';
import { loadFrenchRemoteLessonRows } from './french_lesson_remote_runtime';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { emitAppEvent } from './events';
import { patchHomeScreenHydration } from './home_screen_hydration';
import { useMistakeExplain } from './use_mistake_explain';
import { isExplainEnabled } from './explain_phrase_flags';
import { resolveLessonAnswerFontSize } from '../lib/lesson_answer_layout';
import { maskSpokenPhraseKeepInitial } from './speaking_word_report';
import { makeLessonServerAttemptId, normalizeLessonServerAttemptId } from './lesson_attempt_identity';
import { LESSON_REPLAY_XP_RATE, resolveLessonAnswerBaseXp } from './lesson_replay_reward';

import { noAndroidOutline } from '../constants/androidGlow';
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

function isPlannedLessonSourceLang(lang: Lang): lang is 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' {
  return lang === 'pt-BR' || lang === 'vi' || lang === 'id' || lang === 'tr' || lang === 'pl';
}

function lessonPhraseMeaningForLang(
  phrase: Pick<LessonPhrase, 'russian' | 'ukrainian' | 'spanish' | 'english' | 'sourceLocales'>,
  lang: Lang,
  studyTarget: StudyTargetLang,
): string {
  if (isPlannedLessonSourceLang(lang)) {
    return phrase.sourceLocales?.[lang]?.trim() || phrase.russian || phrase.ukrainian || phrase.spanish || '';
  }
  if (lang === 'uk') return phrase.ukrainian || phrase.russian || '';
  if (spanishStudyActive(studyTarget)) {
    if (lang === 'es') return phrase.spanish ?? phrase.russian ?? '';
    return phrase.russian ?? '';
  }
  if (lang === 'es') return phrase.russian || phrase.ukrainian || phrase.english || '';
  return phrase.russian ?? '';
}

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

const safeProgressEventPart = (value: unknown, max = 40): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';

const MAX_LESSON_MULTIPLIER_PARAM_LENGTH = 512;
const MAX_LESSON_MULTIPLIER_COUNT = 6;
type ConfirmedLessonMultiplierEntry = { multiplier: number; xpDelta: number };

const sanitizeConfirmedLessonMultiplier = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 1 || numeric > 20) return 1;
  return Math.round(numeric * 100) / 100;
};

const encodeConfirmedLessonMultipliers = (
  entries: ReadonlyMap<string, ConfirmedLessonMultiplierEntry>,
): string => {
  const compact = [...entries.values()]
    .filter((entry) => entry.multiplier > 1 && entry.xpDelta > 0)
    .sort((left, right) => left.multiplier - right.multiplier)
    .slice(0, MAX_LESSON_MULTIPLIER_COUNT)
    .map((entry) => [entry.multiplier, Math.round(entry.xpDelta)]);
  const encoded = JSON.stringify(compact);
  return encoded.length <= MAX_LESSON_MULTIPLIER_PARAM_LENGTH ? encoded : '[]';
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
  const phraseId = String(phrase?.id ?? '');
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
const ERROR_REPLAY_DELAY_ANSWERS = 2;
const COMBO_ACHIEVEMENT_THRESHOLDS = new Set([3, 10, 20, 50, 100, 150, 250, 500]);
const WORD_DISPATCH_LOCK_MS = 90;

function isValidLessonPhraseOrder(order: unknown, phraseCount: number): order is number[] {
  const count = Math.min(phraseCount, TOTAL);
  if (!Array.isArray(order) || order.length !== count) return false;
  if (new Set(order).size !== order.length) return false;
  return order.every((idx) => Number.isInteger(idx) && idx >= 0 && idx < phraseCount);
}

function hasUsableLessonPhraseOrder(order: unknown, phraseCount: number): order is number[] {
  if (!isValidLessonPhraseOrder(order, phraseCount)) return false;
  return phraseCount <= 1 || new Set(order).size > 1;
}

function shuffleLessonPhraseOrder(phraseCount: number): number[] {
  const count = Math.min(phraseCount, TOTAL);
  const order = Array.from({ length: phraseCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, count);
}

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

/**
 * [REVIEW] Одна пройденная фраза для режима «Назад к фразам» (просмотр/сравнение, read-only).
 */
interface ReviewPhrase {
  key: string;
  position: number;
  en: string;
  meaning: string;
}

/**
 * LessonContent: Renders the playable lesson UI.
 * Extracted as separate component to ensure SafeAreaView receives exactly ONE child.
 */
interface LessonContentProps {
  introGateReady: boolean;
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
  onSpeakingFillAnswer: (text: string) => void;
  /** Заморозить/разморозить авто-переход к следующей фразе, пока открыта панель
   *  «Скажи вслух» (иначе таймер уводит урок, пока юзер слушает/перезаписывает). */
  onSpeakingActiveChange?: (active: boolean) => void;
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
  totalCells: number;
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
  /** Списать один дневной кредит «Объясни» (бывш. 50/50; тот же счётчик/«подарок»). */
  onConsumeExplainCredit: () => void;
  fiftyFiftyUsedToday: number;
  bonusHints: number;
  displayCell: number;
  isErrorReplay: boolean;
  replaySolvedCorrectly: boolean;
  xpToastVisible: boolean;
  xpToastAmount: number;
  xpToastAnim: Animated.Value;
  realPhraseIdx: number;
  /** Язык, который учим (dev: en|es); упражнение по словам пока по EN, озвучка/ответ могут быть ES. */
  studyTarget: StudyTargetLang;
  onReplayPhraseAudio: () => void;
  /** [REVIEW] Уже пройденные фразы урока для просмотра «Назад к фразам» (read-only). */
  reviewPhrases: ReviewPhrase[];
  /** [REVIEW] Озвучить произвольную пройденную фразу в окне просмотра. */
  onPlayReviewAudio: (en: string) => void;
  toastAnim: Animated.Value;
  from?: string;
  onHeaderBack: () => void;
  lessonTeachingNote: ResolvedLessonTeachingNote | null;
  lessonTheorySupportBlocked: boolean;
  lessonHintSupportBlocked: boolean;
}

const LessonContent = React.memo(function LessonContent({
  introGateReady,
  lessonId,
  compact,
  isSmallScreen,
  phrase,
  selectedWords,
  status,
  handleBgTap,
  handleWordPress,
  undoLastWord,
  onSpeakingFillAnswer,
  onSpeakingActiveChange,
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
  totalCells,
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
  onConsumeExplainCredit,
  fiftyFiftyUsedToday,
  bonusHints,
  displayCell,
  isErrorReplay,
  replaySolvedCorrectly,
  xpToastVisible,
  xpToastAmount,
  xpToastAnim,
  realPhraseIdx,
  studyTarget,
  onReplayPhraseAudio,
  reviewPhrases,
  onPlayReviewAudio,
  toastAnim,
  from,
  onHeaderBack,
  lessonTeachingNote,
  lessonTheorySupportBlocked,
  lessonHintSupportBlocked,
}: LessonContentProps) {
  const effectiveOs = useEffectivePlatformOS();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { bottomInset } = useScreen();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const progressCellCount = Math.max(1, totalCells);
  const linkedSliceCompact = false;
  const lessonHorizontalPadding = linkedSliceCompact ? 14 : 20;
  const linkedSlicePromptFont = Math.max(f.h2, f.h2 + (linkedSliceCompact ? 0 : 6));
  const linkedSliceAnswerFont = Math.max(f.bodyLg, f.h1 - (linkedSliceCompact ? 4 : 0));

  // [SPEAKING] Premium "say it out loud" mode. Free users hit the paywall;
  // premium users get the SpeakingPanel (mic + waveform + 90% scoring).
  // Remote kill-switch (default ON): ops can disable speaking app-wide without a
  // release if the on-device recognizer misbehaves in production.
  // «Устно»: учитываем «Пульт» — если фича переведена в «Фри», замок снят у всех.
  const speakingIsPremium = useFeatureAccess('speaking');
  const { playHintReveal } = useHintRevealCue();
  const speakingFeatureEnabled = isSpeakingEnabled();
  const phraseEnterKey = phrase ? `${String(phrase.id ?? '')}:${String(phrase.english ?? phrase.spanish ?? '')}` : '';
  const speakingPhraseKey = `${displayCell}:${realPhraseIdx}:${phraseEnterKey}`;
  const [speakingOpen, setSpeakingOpen] = useState(false);
  const [speakingHoldActive, setSpeakingHoldActive] = useState(false);
  const [speakingResult, setSpeakingResult] = useState<SpeakingAttemptResult | null>(null);
  const speakingOpenedForPhraseRef = useRef<string | null>(null);

  // [REVIEW] Окно «Назад к фразам» — просмотр уже пройденных фраз урока (read-only).
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewCount = reviewPhrases.length;
  const openReview = useCallback(() => {
    if (reviewPhrases.length === 0) return;
    hapticTap();
    setReviewIndex(reviewPhrases.length - 1); // последняя пройденная — ближайшая
    setReviewOpen(true);
  }, [reviewPhrases.length]);
  const closeReview = useCallback(() => setReviewOpen(false), []);
  const reviewGoPrev = useCallback(() => setReviewIndex(i => Math.max(0, i - 1)), []);
  const reviewGoNext = useCallback(() => setReviewIndex(i => Math.min(reviewCount - 1, i + 1)), [reviewCount]);
  const reviewCurrent = reviewOpen ? (reviewPhrases[reviewIndex] ?? null) : null;
  const startSpeakingHold = useCallback(() => {
    hapticTap();
    if (!speakingIsPremium) {
      router.push({ pathname: '/premium_modal', params: { context: 'speaking' } } as any);
      return;
    }
    // Замораживаем авто-переход у родителя: панель произносит эталон в фоне и даёт
    // «Моя запись» / «Сказать ещё раз», и 4-сек таймер не должен увести урок
    // вперёд, пока панель открыта. Переход дальше — только по явному действию юзера.
    onSpeakingActiveChange?.(true);
    speakingOpenedForPhraseRef.current = speakingPhraseKey;
    setSpeakingResult(null);
    setSpeakingOpen(true);
    setSpeakingHoldActive(true);
  }, [speakingIsPremium, router, onSpeakingActiveChange, speakingPhraseKey]);

  const endSpeakingHold = useCallback(() => setSpeakingHoldActive(false), []);

  const closeSpeaking = useCallback(() => {
    speakingOpenedForPhraseRef.current = null;
    setSpeakingHoldActive(false);
    setSpeakingOpen(false);
    // Не перезапускаем авто-переход автоматически — юзер сам жмёт «Далее», когда
    // готов (кнопка lesson1-next доступна в состоянии result).
    onSpeakingActiveChange?.(false);
  }, [onSpeakingActiveChange]);

  const handleSpeakingScore = useCallback((result: SpeakingAttemptResult) => {
    setSpeakingResult(result);
    closeSpeaking();
  }, [closeSpeaking]);

  useEffect(() => {
    const openedForPhrase = speakingOpenedForPhraseRef.current;
    if (openedForPhrase == null || openedForPhrase === speakingPhraseKey) return;
    speakingOpenedForPhraseRef.current = null;
    setSpeakingHoldActive(false);
    setSpeakingOpen(false);
    onSpeakingActiveChange?.(false);
  }, [speakingPhraseKey, onSpeakingActiveChange]);

  // Проверяется прямо во время рендера: новая фраза не успевает получить ни одного
  // кадра с результатом предыдущей попытки, даже до запуска эффекта выше.
  const speakingVisible = speakingOpen && speakingOpenedForPhraseRef.current === speakingPhraseKey;

  useEffect(() => {
    setSpeakingResult(null);
  }, [speakingPhraseKey]);

  // [50/50] Затемняет неправильные плитки до ответа. Тратит тот же дневной кредит, что и «Объясни».
  const [fiftyFiftyActive, setFiftyFiftyActive] = useState(false);
  // Индексы неверных плиток, затемнённых 50/50. Раньше затемнялись ВСЕ неверные —
  // оставалась одна яркая, что = показ правильного ответа. Настоящее 50/50 убирает
  // лишь половину неверных, оставляя правильный среди ещё нескольких бликующих.
  const [fiftyFiftyDimmed, setFiftyFiftyDimmed] = useState<Set<number>>(() => new Set());
  // Сбрасываем 50/50 при КАЖДОЙ смене банка плиток: переход к следующему слову
  // (phraseWordIdx), вход/выход из ветки сокращений (contrExpanded), пересборка
  // плиток (shuffled, в т.ч. новая фраза). КРИТИЧНО: fiftyFiftyDimmed — это набор
  // ИНДЕКСОВ плиток; без сброса при смене банка старые индексы падают на новые
  // плитки и гасят в т.ч. ПРАВИЛЬНУЮ. Раньше зависело только от status → баг.
  useEffect(() => {
    setFiftyFiftyActive(false);
    setFiftyFiftyDimmed(new Set());
  }, [status, phraseWordIdx, contrExpanded, shuffled]);
  // [EXPLAIN] «Объясни проще» — только ПОСЛЕ ответа. Тот же дневной лимит (fifty_fifty_* счётчик).
  const [explainOpen, setExplainOpen] = useState(false);
  // Флаг-гейт фичи «Объясни проще» (kill-switch из «Пульта»/env). Кнопка в футере
  // видна на экране результата НЕЗАВИСИМО от того, верно ответил юзер или нет —
  // объясняет САМУ фразу простыми словами (CF explainPhrase, кэш per-(фраза+язык)).
  const explainFeatureOn = isExplainEnabled();
  const explainHintsLeft = Math.max(0, 3 + bonusHints - fiftyFiftyUsedToday);
  // До ответа: открыть, только если ещё есть кредиты. Кредит НЕ списываем здесь —
  // только когда шторка реально сгенерит (cache MISS) в onExplainResolved: бесплатный
  // кэш-хит или сетевая ошибка кредит НЕ тратят.
  // Резолв запроса шторки. Списываем кредит только за live-генерацию без ошибки.
  const onExplainResolved = useCallback(
    (info: { fromCache: boolean; status: string; error: boolean }) => {
      if (info.error || info.fromCache) return;
      if (info.status !== 'ok') return; // rejected/exhausted/pending do not spend a credit
      onConsumeExplainCredit();
    },
    [onConsumeExplainCredit],
  );
  // [ARROW] Анимированная стрелка над прогресс-баром
  const arrowAnim  = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  const prevDisplayCell = useRef(displayCell);

  const [grammarHintText, setGrammarHintText] = useState<string | null>(null);
  const grammarHintAnim = useRef(new Animated.Value(0)).current;
  const grammarHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grammarHintAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const grammarHintGenerationRef = useRef(0);
  const grammarHintSeenCacheRef = useRef(new Set<string>());
  // Вспышка плитки при тапе слова привязана к конкретной опции и шагу фразы.
  // Чёткий визуальный отклик «выбрано/верно/неверно» (раньше плитка никак не реагировала).
  const [flashWord, setFlashWord] = useState<{ optionKey: string; correct: boolean } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerWordFlash = useCallback((optionKey: string, correct: boolean) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashWord({ optionKey, correct });
    flashTimerRef.current = setTimeout(() => setFlashWord(null), 260);
  }, []);
  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);
  // Ответ применяется сразу; короткий lock нужен только против двойного тапа,
  // чтобы второй нативный press не успел выбрать соседнюю плитку в том же жесте.
  const [wordDispatchPending, setWordDispatchPending] = useState(false);
  const wordDispatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (wordDispatchTimerRef.current) clearTimeout(wordDispatchTimerRef.current); }, []);
  const questionEnterAnim = useRef(new Animated.Value(1)).current;
  // Mirror of phraseEnterKey, read inside async callbacks to drop stale AI-explain responses
  // that resolve after the user has already moved to another phrase.
  const phraseEnterKeyRef = useRef(phraseEnterKey);
  phraseEnterKeyRef.current = phraseEnterKey;
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
      const optionKey = `${phraseEnterKey}:${phraseWordIdx}:${i}:${word}`;
      const strippedRaw = stripMarkers(word);
      const stripped = strippedRaw.toLowerCase();
      // ВАЖНО: подлинно правильное слово (currentCorrectWord) считаем верным в ЛЮБОМ
      // режиме. Раньше при contrExpanded!==null проверялся ТОЛЬКО expansionCorrect, и если
      // contrExpanded оставался «протухшим» от прошлой фразы с сокращением (рассинхрон со
      // shuffled), правильная плитка НЕ помечалась → 50/50 её гасил. Доп. ветка currentCorrectWord
      // в expansion-режиме ничего лишнего не подсвечивает: там shuffled = makeExpansionOptions(...),
      // а текущее слово (само сокращение, напр. "don't") среди них отсутствует.
      const isCorrectOption = contrExpanded !== null
        ? (expansionCorrect != null && stripped === expansionCorrect.toLowerCase())
          || (currentCorrectWord != null && stripped === currentCorrectWord.toLowerCase())
        : currentCorrectWord != null && (
          stripped === currentCorrectWord.toLowerCase() ||
          (currentValidContraction != null && stripped === currentValidContraction.toLowerCase())
        );
      const displayText = (() => {
        if (strippedRaw === '') return s.lesson.noArticle;
        // Preserve acronyms / multi-capital tokens verbatim (e.g. "TV", "PM"),
        // otherwise they get mangled to "Tv"/"tv".
        if (/[A-Z]/.test(strippedRaw.slice(1))) return strippedRaw;
        const cap = currentCorrectWord !== null && /^[A-Z]/.test(currentCorrectWord);
        if (cap) return strippedRaw.charAt(0).toUpperCase() + strippedRaw.slice(1);
        return strippedRaw === 'I' ? 'I' : strippedRaw.toLowerCase();
      })();
      return {
        optionKey,
        word,
        index: i,
        isCorrectOption,
        shouldShowHint: showToBeHint && cellIndex < 2 && isCorrectOption,
        displayText,
      };
    });
  }, [shuffled, phraseEnterKey, phraseWordIdx, contrExpanded, currentCorrectWord, currentValidContraction, showToBeHint, cellIndex, s.lesson.noArticle]);
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
    if (lessonHintSupportBlocked) return;
    const generation = ++grammarHintGenerationRef.current;
    if (grammarHintTimerRef.current) clearTimeout(grammarHintTimerRef.current);
    grammarHintAnimationRef.current?.stop();
    grammarHintAnim.stopAnimation();
    for (const hint of GRAMMAR_HINTS) {
      if (lessonId >= hint.lessonTeaches) continue;
      if (!hint.detect(currentWord)) continue;
      if (!force) {
        // Ключ «подсказка уже показана» скоупится по языку-цели: en — легаси-ключ,
        // fr — отдельный namespace, чтобы прогресс подсказок en/fr не смешивался.
        const seenKey = grammarHintSeenKey(hint.key, studyTarget);
        // Один и тот же артикль встречается много раз за урок. После первой
        // проверки держим ключ в памяти: повторный AsyncStorage bridge-call на
        // каждом слове создавал очередь и через несколько фраз тормозил UI.
        if (grammarHintSeenCacheRef.current.has(seenKey)) continue;
        const seen = await AsyncStorage.getItem(seenKey).catch(() => null);
        if (generation !== grammarHintGenerationRef.current) return;
        if (seen) grammarHintSeenCacheRef.current.add(seenKey);
        if (seen) continue;
        grammarHintSeenCacheRef.current.add(seenKey);
        void AsyncStorage.setItem(seenKey, '1').catch(() => {});
      }
      const text = grammarHintLine(lang, hint, studyTarget);
      const fadeOut = Animated.timing(grammarHintAnim, { toValue: 0, duration: 100, useNativeDriver: true });
      grammarHintAnimationRef.current = fadeOut;
      fadeOut.start(({ finished }) => {
        if (!finished || generation !== grammarHintGenerationRef.current) return;
        setGrammarHintText(text);
        const fadeIn = Animated.timing(grammarHintAnim, { toValue: 1, duration: 400, useNativeDriver: true });
        grammarHintAnimationRef.current = fadeIn;
        fadeIn.start();
        grammarHintTimerRef.current = setTimeout(() => {
          if (generation !== grammarHintGenerationRef.current) return;
          const dismiss = Animated.timing(grammarHintAnim, { toValue: 0, duration: 400, useNativeDriver: true });
          grammarHintAnimationRef.current = dismiss;
          dismiss.start(({ finished: dismissed }) => {
            if (dismissed && generation === grammarHintGenerationRef.current) setGrammarHintText(null);
          });
        }, 10000);
      });
      return;
    }
  }, [grammarHintAnim, lessonHintSupportBlocked, lessonId, lang, studyTarget]);

  const hideGrammarHint = useCallback(() => {
    grammarHintGenerationRef.current += 1;
    if (grammarHintTimerRef.current) clearTimeout(grammarHintTimerRef.current);
    grammarHintTimerRef.current = null;
    grammarHintAnimationRef.current?.stop();
    grammarHintAnimationRef.current = null;
    grammarHintAnim.stopAnimation();
    const dismiss = Animated.timing(grammarHintAnim, { toValue: 0, duration: 120, useNativeDriver: true });
    grammarHintAnimationRef.current = dismiss;
    dismiss.start(({ finished }) => {
      if (finished) setGrammarHintText(null);
    });
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
    const cellW = (barWidth - (progressCellCount - 1) * 2) / progressCellCount;
    const targetX = displayCell * (cellW + 2); // левый край ячейки
    const isBack = displayCell < prevDisplayCell.current;
    prevDisplayCell.current = displayCell;
    Animated.spring(arrowAnim, {
      toValue: targetX,
      useNativeDriver: true,
      tension: isBack ? 280 : 140,  // назад — резкий прыжок, вперёд — плавно
      friction: isBack ? 10 : 12,
    }).start();
  }, [displayCell, barWidth, progressCellCount]);

  useEffect(() => {
    if (!phraseEnterKey || status !== 'playing') return;
    questionEnterAnim.setValue(0);
    const anim = Animated.timing(questionEnterAnim, {
      toValue: 1,
      duration: LESSON_ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
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

  const acceptedUserAnswerLine = settings.hardMode
    ? reportUserAnswer.replace(/\s+/g, ' ').trim()
    : cleanPhraseForDisplay(selectedAnswer).replace(/\s+/g, ' ').trim();
  const canonicalResultLine = phrase ? phraseAnswerDisplayLine(phrase, studyTarget, lang) : '';
  const resultCorrectLine = phrase
    ? (status === 'result' && !wasWrong && acceptedUserAnswerLine.length > 0
      ? answerDisplayLineWithCanonicalPunctuation(acceptedUserAnswerLine, canonicalResultLine)
      : canonicalResultLine)
    : '';
  const spokenTargetLine = cleanPhraseForDisplay(gradeTarget);
  const speakingPrimaryLine = speakingResult
    ? (speakingResult.passed ? spokenTargetLine : maskSpokenPhraseKeepInitial(spokenTargetLine))
    : '';
  const interactiveAnswerText = settings.hardMode
    ? typedText
    : selectedWords.map((word) => stripMarkers(word)).filter(Boolean).join(' ');
  const interactiveAnswerFont = resolveLessonAnswerFontSize(
    linkedSliceAnswerFont,
    screenW,
    interactiveAnswerText,
  );
  const resultAnswerFont = resolveLessonAnswerFontSize(
    linkedSliceAnswerFont,
    screenW,
    resultCorrectLine,
  );
  const sourcePromptLine = useMemo(() => {
    if (!phrase) return '';
    return lessonPhraseMeaningForLang(phrase, lang, studyTarget);
  }, [phrase, lang, studyTarget]);
  const aiMistakeAnswerLine = reportUserAnswer || acceptedUserAnswerLine;
  const aiMistakeTargetLine = phrase ? phraseCanonicalAnswer(phrase, studyTarget) : '';

  // ИИ-разбор ошибки + «Объяснить проще» — общая механика (та же в планах).
  const mistakeExplain = useMistakeExplain({
    active: Boolean(phrase) && status === 'result' && wasWrong,
    phraseKey: phraseEnterKey,
    lessonId,
    phraseId: phrase ? String(phrase.id ?? lessonPhraseReportDataId(lessonId, phrase, realPhraseIdx)) : '',
    studyTarget,
    interfaceLang: lang,
    prompt: sourcePromptLine,
    userAnswer: aiMistakeAnswerLine,
    targetAnswer: aiMistakeTargetLine,
  });
  const aiMistakeState = mistakeExplain.aiMistakeState;
  const aiMistakeText = mistakeExplain.aiMistakeText;
  const aiMistakeRemaining = mistakeExplain.aiMistakeRemaining;
  const explainCurrentMistake = mistakeExplain.explain;
  const openEli5Modal = mistakeExplain.eli5.onOpen;
  const eli5ModalOpen = mistakeExplain.eli5.open;
  const eli5State = mistakeExplain.eli5.state;
  const eli5Text = mistakeExplain.eli5.text;

  // зачем: раньше тут был голый <View flex:1/> без фона (белая/чёрная вспышка
  // между экраном списка уроков и загруженным уроком) — теперь тот же скелетон,
  // что и ниже для !phrase, чтобы первый кадр совпадал по фону/геометрии с
  // финальным контентом (Performance Bible: instant first frame).
  if (!introGateReady) {
    return (
      <LessonFirstFrame theme={t} compact={linkedSliceCompact} horizontalPadding={lessonHorizontalPadding} />
    );
  }

  // Main lesson UI
  // зачем: полноэкранный ActivityIndicator дёргал геометрию (спиннер по центру
  // вместо шапки+карточки+плиток) — заменён на скелетон с зарезервированной
  // геометрией загруженного урока (шапка, задание, ответная строка, плитки,
  // прогресс-бар), сохраняя геометрию рабочего состояния экрана.
  if (!phrase) {
    return (
      <LessonFirstFrame theme={t} compact={linkedSliceCompact} horizontalPadding={lessonHorizontalPadding} />
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={effectiveOs === 'ios' ? 'padding' : 'height'}>
      {/* ХЕДЕР — flex + minWidth:0 + wrap, иначе на узких экранах правый блок вылезает за край */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: isSmallScreen ? 10 : 15,
          paddingVertical: linkedSliceCompact ? 7 : 12,
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
            paddingHorizontal: linkedSliceCompact ? 8 : (isSmallScreen ? 8 : 12),
            paddingVertical: linkedSliceCompact ? 5 : 7,
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
          <View style={{ paddingVertical: linkedSliceCompact ? 3 : 8 }}>
            <LessonEnergyLightning energyCount={currentEnergy} maxEnergy={currentMaxEnergy} shouldShake={shouldShake} />
          </View>

          {comboCount >= 3 && (
            <ComboRing value={comboCount} level={comboLevelFor(comboCount)} size={34} />
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
          </View>
        </View>
      </View>

      <BouncyScrollView
        testID="lesson1-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: lessonHorizontalPadding,
          paddingTop: linkedSliceCompact ? 2 : 10,
          paddingBottom: linkedSliceCompact ? 4 + bottomInset : (status === 'result' ? 100 + bottomInset : 8 + bottomInset),
          flexGrow: linkedSliceCompact ? 0 : undefined,
        }}
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!linkedSliceCompact}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[questionEnterStyle, { width: '100%' }]}>
        <Text
          testID="lesson1-task-instruction"
          style={{ color: sx.muted, fontSize: f.caption, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}
        >
          {triLang(lang, {
            ru: settings.hardMode ? 'Напечатай фразу:' : 'Собери фразу:',
            uk: settings.hardMode ? 'Надрукуй фразу:' : 'Склади фразу:',
            es: settings.hardMode ? 'Escribe la frase:' : 'Forma la frase:',
            'pt-BR': settings.hardMode ? 'Digite a frase:' : 'Monte a frase:',
            vi: settings.hardMode ? 'Hãy gõ câu:' : 'Hãy ghép câu:',
            id: settings.hardMode ? 'Ketik frasa:' : 'Susun frasa:',
            tr: settings.hardMode ? 'Cümleyi yaz:' : 'Cümleyi kur:',
            pl: settings.hardMode ? 'Wpisz zdanie:' : 'Ułóż zdanie:',
          })}
        </Text>
        <Pressable onPress={status === 'result' ? undefined : handleBgTap} style={{ width: '100%' }}>
          <Text
            testID="lesson1-source-prompt"
            style={{
              color: sx.primary,
              fontSize: linkedSlicePromptFont,
              lineHeight: Math.round(linkedSlicePromptFont * 1.16),
              marginBottom: linkedSliceCompact ? 8 : (compact ? 12 : 20),
              textAlign: 'center',
              flexShrink: 1,
            }}
            maxFontSizeMultiplier={1.2}
          >{(() => {
            if (!phrase) return '';
            return lessonPhraseMeaningForLang(phrase, lang, studyTarget);
          })()}</Text>

          <View testID="lesson1-answer-divider" style={{ minHeight: linkedSliceCompact ? 46 : 60, alignSelf: 'stretch', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: emptyTapFlash ? '#F5A623' : t.border, marginBottom: speakingResult ? 4 : (linkedSliceCompact ? 8 : (compact ? 12 : 20)), justifyContent: 'center', backgroundColor: emptyTapFlash ? 'rgba(245,166,35,0.08)' : 'transparent', borderRadius: emptyTapFlash ? 8 : 0 } as any}>
            {(status === 'result' || speakingResult) ? (
              <View testID="lesson1-primary-answer-row" style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }}>
                  <Text
                    style={{
                      color: status === 'result' || speakingResult?.passed ? t.correct : t.wrong,
                      fontSize: status === 'result' ? resultAnswerFont : interactiveAnswerFont,
                      textAlign: 'center',
                      flexShrink: 1,
                    }}
                  >
                    {status === 'result' ? resultCorrectLine : speakingPrimaryLine}
                  </Text>
                  {status === 'result' && (
                    <View testID="lesson1-primary-save" style={{ marginLeft: 6 }}>
                      <AddToFlashcard
                        en={resultCorrectLine}
                        ru={phrase.russian}
                        uk={phrase.ukrainian || phrase.russian}
                        es={spanishSurfacesEnabled(lang, studyTarget) ? phrase.spanish : undefined}
                        sourceLocales={phrase.sourceLocales}
                        source="lesson"
                        sourceId={String(lessonId)}
                      />
                    </View>
                  )}
                </View>
              </View>
            ) : settings.hardMode ? (
              /* Keep TextInput always mounted in hardMode — prevents keyboard slide animation between questions */
              <TextInput
                testID="lesson1-typed-input"
                ref={textInputRef}
                style={{ color: sx.primary, fontSize: interactiveAnswerFont, padding: 0, minHeight: linkedSliceCompact ? 34 : 40, opacity: status === 'playing' ? 1 : 0, width: '100%', textAlign: 'center' }}
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
              <Text
                testID="lesson1-selected-answer"
                style={{ color: sx.primary, fontSize: interactiveAnswerFont, fontWeight: '600', width: '100%', textAlign: 'center' }}
              >
                {selectedWords.length > 0
                  ? (() => {
                      const cleaned = selectedWords.map(w => stripMarkers(w)).filter(w => w.length > 0);
                      if (cleaned.length === 0) return '';
                      // Capitalize only the sentence-start letter; keep the rest of the
                      // word verbatim so acronyms ("TV"), proper nouns ("Tuesday"), etc.
                      // are not corrupted into "Tv"/"tuesday". Each tile already carries
                      // its own correct casing from the canonical/source token.
                      const first = cleaned[0].charAt(0).toUpperCase() + cleaned[0].slice(1);
                      const rest = cleaned.slice(1).map(w => {
                        if (w.toLowerCase() === 'i') return 'I';
                        return w;
                      }).join(' ');
                      return first + (rest ? ' ' + rest : '');
                    })()
                  : ''
                }{selectedWords.length > 0 && phraseWordIdx < phraseTokens.length ? '\u00A0' : ''}
                <Animated.Text style={{ color: t.accent, opacity: selectedWords.length > 0 ? 1 : cursorAnim }}>
                  {selectedWords.length > 0 ? (phraseWordIdx < phraseTokens.length ? '…' : '') : '|'}
                </Animated.Text>
              </Text>
            )}
          </View>

          {speakingResult && (
            <View testID="lesson1-speaking-score-below-divider" style={{ minHeight: 24, marginBottom: linkedSliceCompact ? 8 : (compact ? 12 : 20), justifyContent: 'center' }}>
              <SpeakingInlineResultStars
                testID="lesson1-speaking-score"
                result={speakingResult}
                theme={buildSpeakingPanelTheme(t)}
              />
            </View>
          )}

          </Pressable>
          </Animated.View>
          {status === 'result' && (
            <Animated.View style={{
              opacity: fadeAnim,
              width: '100%',
              transform: [{
                translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
              }, {
                translateX: fadeAnim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: wasWrong ? [0, -3, 3, -2, 0] : [0, 0, 0, 0, 0],
                }),
              }, {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: wasWrong ? [1, 1, 1, 1, 1] : [0.98, 1, 1, 1, 1],
                }),
              }],
            }}>
              {wasWrong && (
                <View style={{ backgroundColor: t.wrongBg, padding: linkedSliceCompact ? 10 : 15, borderRadius: 10, marginBottom: linkedSliceCompact ? 6 : 10, borderLeftWidth: 3, borderLeftColor: t.wrong }}>
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
                            fontSize: interactiveAnswerFont,
                          }}>
                            {word}
                          </Text>
                        );
                      });
                    })()}
                  </View>
                </View>
              )}
              {status === 'result' && wasWrong && (
                <View style={{ marginTop: linkedSliceCompact ? 6 : 10 }}>
                  <AiMistakeCard
                    lang={lang}
                    state={aiMistakeState}
                    explanation={aiMistakeText}
                    remaining={aiMistakeRemaining}
                    waitLine={mistakeExplain.aiMistakeWaitLine}
                    onExplain={explainCurrentMistake}
                    onOpenSimple={openEli5Modal}
                    targetAnswer={aiMistakeTargetLine}
                    userAnswer={aiMistakeAnswerLine}
                  />
                </View>
              )}

              {lessonTeachingNote && (
                <View
                  testID="lesson-teaching-note"
                  style={{
                    backgroundColor: lessonTeachingNote.tone === 'wrong' ? t.wrongBg : t.bgCard,
                    padding: linkedSliceCompact ? 10 : 14,
                    borderRadius: 12,
                    marginTop: linkedSliceCompact ? 6 : 10,
                    borderLeftWidth: 3,
                    borderLeftColor: lessonTeachingNote.tone === 'wrong' ? t.wrong : t.correct,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900', marginBottom: 5 }}>
                    {lessonTeachingNote.title}
                  </Text>
                  <Text
                    style={{ color: t.textSecond, fontSize: linkedSliceCompact ? f.small : f.body, lineHeight: Math.round((linkedSliceCompact ? f.small : f.body) * 1.35), fontWeight: '700' }}
                    numberOfLines={linkedSliceCompact ? 2 : undefined}
                  >
                    {lessonTeachingNote.body}
                  </Text>
                </View>
              )}

              <ReportErrorButton
                screen={`lesson_${lessonId}`}
                dataId={lessonPhraseReportDataId(lessonId, phrase, realPhraseIdx)}
                dataText={[
                  `EN: ${resultCorrectLine}`,
                  `RU: ${phrase.russian ?? ''}`,
                  phrase.ukrainian ? `UK: ${phrase.ukrainian}` : '',
                  spanishSurfacesEnabled(lang, studyTarget) && phrase.spanish ? `ES: ${phrase.spanish}` : '',
                ].filter(Boolean).join('\n')}
                userAnswer={reportUserAnswer}
                style={{ alignSelf: 'flex-end', marginTop: linkedSliceCompact ? 2 : 4 }}
                textColor={sx.muted}
              />

            </Animated.View>
          )}

          {speakingFeatureEnabled && !!gradeTarget && (
            <SpeakingInlineSlot variant="lesson" style={{ marginTop: linkedSliceCompact ? 14 : 18 }}>
              {speakingVisible && (
                <SpeakingPanel
                  targetText={cleanPhraseForDisplay(gradeTarget)}
                  lang={lang}
                  theme={buildSpeakingPanelTheme(t)}
                  presentation="inline"
                  holdActive={speakingHoldActive}
                  onScore={handleSpeakingScore}
                  onPass={({ score }) => {
                    void trackFeatureSuccess('speaking', 'attempt', { lessonId, score }, 'lesson1');
                    onSpeakingFillAnswer(cleanPhraseForDisplay(gradeTarget));
                  }}
                  onClose={closeSpeaking}
                />
              )}
            </SpeakingInlineSlot>
          )}
        </BouncyScrollView>

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
            style={{ alignSelf: 'flex-end', marginHorizontal: lessonHorizontalPadding, marginBottom: linkedSliceCompact ? 2 : 6 }}
            textColor={sx.muted}
          />
        )}

        {/* КНОПКИ СЛОВ — снаружи ScrollView, тап по любому месту работает */}
        {status === 'playing' && !settings.hardMode && (
          <Pressable
            onPress={handleBgTap}
            style={{ paddingHorizontal: lessonHorizontalPadding, paddingTop: linkedSliceCompact ? 2 : 4, paddingBottom: linkedSliceCompact ? 2 : 4 }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
              {wordOptionItems.map(({ optionKey, word, index: i, isCorrectOption, shouldShowHint, displayText }) => {
                return (
                  <Animated.View
                    key={optionKey}
                    style={{
                    width: '48%',
                    marginBottom: linkedSliceCompact ? 5 : (compact ? 7 : 10),
                    opacity: (fiftyFiftyActive && fiftyFiftyDimmed.has(i)) ? 0.22 : (shouldShowHint ? hintPulseAnim : hintPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1] }))
                  }}>
                    {(() => {
                      // Плитка вспыхивает АКЦЕНТНЫМ цветом темы при нажатии (единый
                      // фирменный цвет на любой тап). Объём — через DuoPressable (3D-кромка).
                      const isFlashing = flashWord?.optionKey === optionKey;
                      return (
                    <DuoPressable
                      testID={isCorrectOption ? 'lesson1-word-option-correct' : `lesson1-word-option-${i}`}
                      edgeHeight={5}
                      edgeColor={isFlashing ? t.accent : (false ? t.border : 'rgba(0,0,0,0.30)')}
                      pressedExternally={isFlashing}
                      withHaptic={false}
                      disabled={wordDispatchPending}
                      style={{
                        width: '100%',
                        backgroundColor: isFlashing ? t.accent : t.bgCard,
                        paddingVertical: linkedSliceCompact ? 7 : (compact ? 9 : 14),
                        borderRadius: 12,
                        borderWidth: 0,
                        borderColor: isFlashing ? t.accent : t.border,
                      }}
                      onPress={() => {
                        if (showTapHint) setShowTapHint(false);
                        if (settings.hardMode) {
                          // В hardMode нажатие на кнопку вставляет слово в текстовое поле
                          const w = stripMarkers(word);
                          const current = typedText.trimEnd();
                          setTypedText(current ? current + ' ' + w : w);
                          setTimeout(() => textInputRef.current?.focus(), 50);
                        } else {
                          // Вспышка плитки начинается сразу, но сам ответ тоже обязан
                          // примениться в этот же кадр. Прежняя задержка 170 мс ради
                          // вспышки делала каждую кнопку ощутимо «тормозной».
                          if (wordDispatchTimerRef.current) return;
                          setWordDispatchPending(true);
                          triggerWordFlash(optionKey, isCorrectOption);
                          wordDispatchTimerRef.current = setTimeout(() => {
                            wordDispatchTimerRef.current = null;
                            setWordDispatchPending(false);
                          }, WORD_DISPATCH_LOCK_MS);
                          handleWordPress(word);
                        }
                        // [FeedbackKit] Решение владельца: плитки слов — БЕЗ клик-звука
                        // (звук только на управляющих кнопках). Оставляем родную вибрацию.
                        void hapticTap();
                      }}
                    >
                      {/* зачем: 3 юзера писали, что длинные слова в плитках обрезаны
                          («understands», «documents») и приходится угадывать. Плитка — 48%
                          ширины, при штатном «среднем» шрифте влезает ~10 знаков, а в данных
                          уроков есть слова до 15-16 знаков. Шрифт НЕ ужимаем (правило
                          владельца) — разрешаем вторую строку: фиксированной высоты у плитки
                          нет (DuoPressable: только minHeight), поэтому обрезки не будет. */}
                      <FlowText testID="lesson-word-tile" provenance="authored" style={{ color: isFlashing ? (t.correctText ?? '#fff') : t.textPrimary, fontSize: f.numMd, fontWeight: isFlashing ? '700' : '500' }}>{displayText}</FlowText>
                    </DuoPressable>
                      );
                    })()}
                  </Animated.View>
                );
              })}
            </View>
          </Pressable>
        )}

        {/* ГОРИЗОНТАЛЬНЫЙ ПРОГРЕСС-БАР */}
        <View style={{ paddingHorizontal: 14, paddingVertical: linkedSliceCompact ? 3 : 6 }}>
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
                      width: (barWidth - (progressCellCount - 1) * 2) / progressCellCount,
                    }}>▼</Text>
                  </Animated.View>
                </View>
              )}
              {/* Ячейки прогресса */}
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: progressCellCount }).map((_, i) => (
                  <View key={i} style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: getProgressCellColor(progress[i], passCount, t, i === displayCell),
                  }} />
                ))}
              </View>
            </View>
            <Text style={{ color: sx.muted, fontSize: f.label, minWidth: 34, textAlign: 'right' }}>{displayCell + 1}/{progressCellCount}</Text>
          </View>
        </View>

        {/* ФУТЕР */}
        <View style={{ flexDirection: 'row', paddingTop: linkedSliceCompact ? 8 : 14, paddingBottom: (linkedSliceCompact ? 8 : 14) + bottomInset, borderTopWidth: 0.5, borderTopColor: t.border }}>
          {/* 50/50 — затемнить неверные плитки. Общий лимит с «Объясни» (fifty_fifty_* счётчик).
              Прячем, когда плиток-вариантов уже нет (ответ собран, ждём «Проверить») — гасить
              нечего, кнопка висела бесполезно. */}
          {!settings.hardMode && status === 'playing' && shuffled.length > 0 && (
            (() => {
              const canUse50 = explainHintsLeft > 0 && !fiftyFiftyActive;
              return (
                <LessonPressable
                  testID="lesson1-fifty-fifty"
                  accessibilityRole="button"
                  accessibilityLabel="50/50"
                  style={{ flex: 1, alignItems: 'center', opacity: canUse50 ? 1 : 0.35 }}
                  disabled={!canUse50}
                  onPress={() => {
                    if (!canUse50) return;
                    fk.tap();
                    // Настоящее 50/50: затемняем ровно половину НЕВЕРНЫХ плиток (округление
                    // вверх), правильная всегда остаётся видимой среди других бликующих.
                    const wrongIdx = wordOptionItems.filter(o => !o.isCorrectOption).map(o => o.index);
                    // Страховка: если НИ одна плитка не помечена правильной (рассинхрон состояния),
                    // 50/50 затемнил бы и правильный ответ. В таком случае подсказку не применяем,
                    // чтобы никогда не спрятать верный вариант. Кредит при этом не тратим.
                    const hasCorrectTile = wordOptionItems.some(o => o.isCorrectOption);
                    if (!hasCorrectTile) return;
                    // зачем: звук подсказки — ПОСЛЕ страховки выше. Если 50/50 не
                    // применилось (рассинхрон плиток) и кредит не потрачен, звучать
                    // нечему: пользователь подсказку так и не получил.
                    playHintReveal();
                    const totalTiles = wordOptionItems.length;
                    const keepCount = Math.max(2, Math.ceil(totalTiles / 2));
                    const dimCount = Math.min(wrongIdx.length, Math.max(0, totalTiles - keepCount));
                    const shuffledWrong = [...wrongIdx];
                    for (let k = shuffledWrong.length - 1; k > 0; k -= 1) {
                      const j = Math.floor(Math.random() * (k + 1));
                      [shuffledWrong[k], shuffledWrong[j]] = [shuffledWrong[j], shuffledWrong[k]];
                    }
                    setFiftyFiftyDimmed(new Set(shuffledWrong.slice(0, dimCount)));
                    setFiftyFiftyActive(true);
                    onConsumeExplainCredit();
                  }}
                >
                  <View style={{ position: 'relative' }}>
                    <Ionicons name="cut-outline" size={26} color={canUse50 ? t.accent : sx.second} />
                    <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: canUse50 ? t.accent : t.textMuted, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: t.correctText, fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{explainHintsLeft}</Text>
                    </View>
                  </View>
                  <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>50/50</Text>
                </LessonPressable>
              );
            })()
          )}


          {/* Theory Button */}
          <LessonPressable testID="lesson1-theory" style={{ flex: 1, alignItems: 'center' }} onPress={() => { fk.tap(); if (lessonTheorySupportBlocked) { router.push({ pathname: '/lesson_help', params: { id: lessonId } }); return; } router.push(isInteractiveTheoryLesson(lessonId) ? { pathname: '/hint', params: { id: lessonId } } : { pathname: '/lesson_help', params: { id: lessonId } }); }}>
            <Ionicons name={lessonTheorySupportBlocked ? 'shield-checkmark-outline' : 'book-outline'} size={26} color={sx.second} />
            <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>
              {lessonTheorySupportBlocked ? triLang(lang, {
                ru: 'Теория',
                uk: 'Теорія',
                es: 'Teoría',
                'pt-BR': 'Teoria',
                vi: 'Đang duyệt',
                id: 'Ditinjau',
                tr: 'İncelemede',
                pl: 'Teoria',
              }) : s.lesson.theory}
            </Text>
          </LessonPressable>

          {/* [SPEAKING] "Устно" — premium: произнести фразу вслух (микрофон + эквалайзер) */}
          {speakingFeatureEnabled && status === 'playing' && !!gradeTarget && (
            <LessonPressable
              testID="lesson1-speaking"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Сказать фразу вслух',
                uk: 'Сказати фразу вголос',
                es: 'Decir la frase en voz alta',
                'pt-BR': 'Dizer a frase em voz alta',
                vi: 'Nói câu này thành tiếng',
                id: 'Ucapkan frasa dengan lantang',
                tr: 'Cümleyi sesli söyle',
                pl: 'Powiedz frazę na głos',
              })}
              style={{ flex: 1, alignItems: 'center' }}
              onPressIn={startSpeakingHold}
              onPressOut={endSpeakingHold}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="mic-outline" size={26} color={sx.second} />
                {!speakingIsPremium && (
                  <View style={{ position: 'absolute', top: -4, right: -8 }}>
                    <Ionicons name="lock-closed" size={12} color={t.accent} />
                  </View>
                )}
              </View>
              <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>
                {triLang(lang, {
                  ru: 'Устно',
                  uk: 'Усно',
                  es: 'Hablar',
                  'pt-BR': 'Falar',
                  vi: 'Nói',
                  id: 'Ucap',
                  tr: 'Sesli',
                  pl: 'Mów',
                })}
              </Text>
            </LessonPressable>
          )}

          {/* [REVIEW] «Назад к фразам» — открыть просмотр уже пройденных фраз урока (read-only).
              Видна только на экране результата и только если есть хотя бы одна пройденная фраза.
              Запрошено пользователем: вернуться и сравнить логику прошлых заданий. */}
          {status === 'result' && reviewPhrases.length > 0 && (
            <LessonPressable
              testID="lesson1-review-back"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Посмотреть пройденные фразы',
                uk: 'Переглянути пройдені фрази',
                es: 'Ver frases ya completadas',
                'pt-BR': 'Ver frases já concluídas',
                vi: 'Xem các câu đã hoàn thành',
                id: 'Lihat frasa yang sudah selesai',
                tr: 'Tamamlanan cümleleri gör',
                pl: 'Zobacz ukończone frazy',
              })}
              style={{ flex: 1, alignItems: 'center' }}
              onPress={openReview}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="arrow-undo-outline" size={26} color={sx.second} />
                <View style={{ position: 'absolute', top: -3, right: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: t.correct }} />
              </View>
              <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: 'Назад',
                  uk: 'Назад',
                  es: 'Atrás',
                  'pt-BR': 'Voltar',
                  vi: 'Xem lại',
                  id: 'Kembali',
                  tr: 'Geri',
                  pl: 'Wstecz',
                })}
              </Text>
            </LessonPressable>
          )}

          {/* [EXPLAIN] «Объясни проще» — в футере на экране результата, НЕЗАВИСИМО от того,
              верно ответил юзер или нет. Объясняет саму фразу простыми словами через общую
              шторку ExplainSheet (CF explainPhrase, глобальный кэш per-(фраза+язык)). */}
          {status === 'result' && explainFeatureOn && (
            <LessonPressable
              testID="lesson1-explain"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Объяснить фразу простыми словами',
                uk: 'Пояснити фразу простими словами',
                es: 'Explicar la frase con palabras simples',
                'pt-BR': 'Explicar a frase em palavras simples',
                vi: 'Giải thích câu bằng lời đơn giản',
                id: 'Jelaskan frasa dengan kata sederhana',
                tr: 'Cümleyi basit kelimelerle açıkla',
                pl: 'Wyjaśnij frazę prościej',
              })}
              style={{ flex: 1, alignItems: 'center' }}
              onPress={() => {
                fk.tap();
                setExplainOpen(true);
              }}
            >
              <Ionicons name="bulb-outline" size={26} color={sx.second} />
              <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: 'Объяснить',
                  uk: 'Пояснити',
                  es: 'Explicar',
                  'pt-BR': 'Explicar',
                  vi: 'Giải thích',
                  id: 'Jelaskan',
                  tr: 'Açıkla',
                  pl: 'Wyjaśnij',
                })}
              </Text>
            </LessonPressable>
          )}

          {/* Undo Button - всегда доступна когда есть выбранные слова или текст */}
          {status === 'result' && (
            <LessonPressable
              testID="lesson1-replay-audio"
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, {
                ru: 'Повторить озвучку фразы',
                uk: 'Повторити озвучку фрази',
                es: 'Repetir audio de la frase',
                'pt-BR': 'Repetir audio da frase',
                vi: 'Phát lại âm thanh của câu',
                id: 'Putar ulang audio frasa',
                tr: 'Cümlenin sesini tekrar çal',
                pl: 'Powtórz nagranie frazy',
              })}
              style={{ flex: 1, alignItems: 'center' }}
              onPress={() => {
                fk.tap();
                onReplayPhraseAudio();
              }}
            >
              <Ionicons name="volume-high" size={26} color={sx.second} />
              <Text style={{ color: sx.muted, fontSize: f.label, marginTop: 4 }}>
                {triLang(lang, {
                  ru: 'Повтор',
                  uk: 'Повтор',
                  es: 'Repetir',
                  'pt-BR': 'Repetir',
                  vi: 'Phát lại',
                  id: 'Ulangi',
                  tr: 'Tekrar',
                  pl: 'Powtórz',
                })}
              </Text>
            </LessonPressable>
          )}

          <LessonPressable
            testID={status === 'result' ? 'lesson1-next' : 'lesson1-undo'}
            style={{ flex: 1, alignItems: 'center', opacity: (status === 'playing' && (settings.hardMode ? typedText.trim().length === 0 : selectedWords.length === 0)) ? 0.3 : 1 }}
            onPress={() => {
              fk.tap();
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
                fk.tap();
                checkAnswer(selectedAnswer);
              }}
            >
              <Ionicons name="checkmark-circle" size={26} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: f.label, marginTop: 4 }}>{s.lesson.check}</Text>
            </LessonPressable>
          )}
        </View>

        {__DEV__ && (
          <TapScale
            style={{ position: 'absolute', bottom: 90, right: 12, backgroundColor: 'rgba(40,40,40,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, zIndex: 999 }}
            onPress={() => {
              void triggerGrammarHint('the', true);
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>DEV: grammar hint</Text>
          </TapScale>
        )}

        {/* [EXPLAIN] Общая шторка «Объясни проще» из футера. Объясняет английскую фразу/грамматику, НЕ русский смысл. */}
        {phrase && (
          <ExplainSheet
            visible={explainOpen}
            onClose={() => setExplainOpen(false)}
            onResolved={onExplainResolved}
            phraseEn={aiMistakeTargetLine || ((status === 'result' && resultCorrectLine) ? resultCorrectLine : phraseAnswerDisplayLine(phrase, studyTarget, lang))}
            phraseMeaning={lessonPhraseMeaningForLang(phrase, lang, studyTarget)}
            lang={lang}
          />
        )}

        {/* [REVIEW] Окно «Назад к фразам» — просмотр уже пройденных фраз (read-only, свайп/стрелки).
            Очки НЕ начисляются, текущий ответ не сбивается — это чистое чтение для сравнения. */}
        <Modal visible={reviewOpen} transparent animationType="fade" onRequestClose={closeReview}>
          <Pressable
            onPress={closeReview}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          >
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: t.bgCard,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                paddingHorizontal: 14,
                paddingTop: 16,
                paddingBottom: 28,
              }}
            >
              {/* Заголовок + закрыть */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ color: sx.primary, fontSize: f.bodyLg, fontWeight: '600' }}>
                  {triLang(lang, {
                    ru: 'Пройденные фразы',
                    uk: 'Пройдені фрази',
                    es: 'Frases completadas',
                    'pt-BR': 'Frases concluídas',
                    vi: 'Câu đã hoàn thành',
                    id: 'Frasa selesai',
                    tr: 'Tamamlanan cümleler',
                    pl: 'Ukończone frazy',
                  })}
                </Text>
                <TapScale onPress={closeReview} accessibilityLabel="Close" style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={sx.second} />
                </TapScale>
              </View>

              {/* Карточка фразы со стрелками */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TapScale
                  onPress={reviewGoPrev}
                  disabled={reviewIndex <= 0}
                  accessibilityLabel="Previous"
                  style={{ padding: 6, opacity: reviewIndex <= 0 ? 0.25 : 1 }}
                >
                  <Ionicons name="chevron-back" size={28} color={sx.second} />
                </TapScale>

                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
                  <Text style={{ color: sx.primary, fontSize: f.numMd, fontWeight: '600', textAlign: 'center', marginBottom: 12 }}>
                    {reviewCurrent?.en ?? ''}
                  </Text>
                  <View style={{ height: 0.5, backgroundColor: t.border, width: '70%', marginBottom: 12 }} />
                  <Text style={{ color: sx.second, fontSize: f.body, textAlign: 'center' }}>
                    {reviewCurrent?.meaning ?? ''}
                  </Text>
                  <TapScale
                    onPress={() => { if (reviewCurrent?.en) onPlayReviewAudio(reviewCurrent.en); }}
                    accessibilityLabel={triLang(lang, {
                      ru: 'Озвучить фразу', uk: 'Озвучити фразу', es: 'Reproducir audio',
                      'pt-BR': 'Reproduzir audio', vi: 'Phát âm thanh', id: 'Putar audio',
                      tr: 'Sesi çal', pl: 'Odtwórz dźwięk',
                    })}
                    style={{ marginTop: 16, padding: 6 }}
                  >
                    <Ionicons name="volume-high" size={26} color={t.correct} />
                  </TapScale>
                </View>

                <TapScale
                  onPress={reviewGoNext}
                  disabled={reviewIndex >= reviewCount - 1}
                  accessibilityLabel="Next"
                  style={{ padding: 6, opacity: reviewIndex >= reviewCount - 1 ? 0.25 : 1 }}
                >
                  <Ionicons name="chevron-forward" size={28} color={sx.second} />
                </TapScale>
              </View>

              {/* Индикатор позиции */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <Text style={{ color: sx.muted, fontSize: f.label }}>
                  {reviewCount > 0 ? `${reviewIndex + 1} / ${reviewCount}` : ''}
                </Text>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <MistakeEli5Modal
          visible={eli5ModalOpen}
          onClose={mistakeExplain.eli5.onClose}
          lang={lang}
          state={eli5State}
          text={eli5Text}
          onRetry={mistakeExplain.eli5.onRetry}
        />

        <AiExplainConsentModal
          visible={mistakeExplain.consentGate.visible}
          lang={lang}
          onAccept={mistakeExplain.consentGate.onAccept}
          onDecline={mistakeExplain.consentGate.onDecline}
        />

    </KeyboardAvoidingView>

    </>
  );
});

function pronunciationOverrideForLessonPhrase(line: string): string | undefined {
  if (!/^we heard that strict teacher read that long list of rules\.?$/i.test(line.trim())) return undefined;
  // The reported lesson expects the present pronunciation /ri:d/ while the
  // visible spelling remains `read`; `reed` gives the system TTS that sound.
  return line.replace(/\bread\b/i, 'reed');
}

function LessonScreen() {
  const lessonRuntimeActive = useRuntimeActive();
  const router = useRouter();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const { height: windowH, width: windowW } = useWindowDimensions();
  const compact = windowH < 780;
  const isSmallScreen = windowW < 400; // compact header/spacing on narrow widths (lesson top bar used to clip past ~380)
  const { theme: t , f, themeMode } = useTheme();
  const reduceMotion = useReduceMotion();
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const studyTargetRef = useRef(studyTarget);
  studyTargetRef.current = studyTarget;
  // iOS / expo-router: query params may arrive as string[] — strict `from === 'lesson_menu'` must not break.
  const {
    id: idParam,
    from: fromParam,
    replayIntro: replayIntroParam,
    replayIntroAt: replayIntroAtParam,
    serverAttemptId: serverAttemptIdParam,
  } = useLocalSearchParams<{
    id?: string | string[];
    from?: string | string[];
    replayIntro?: string | string[];
    replayIntroAt?: string | string[];
    serverAttemptId?: string | string[];
  }>();
  const id = (Array.isArray(idParam) ? idParam[0] : idParam) || '1';
  const from = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const routeServerAttemptId = normalizeLessonServerAttemptId(serverAttemptIdParam);
  const replayIntro = (Array.isArray(replayIntroParam) ? replayIntroParam[0] : replayIntroParam) === '1';
  const replayIntroAt = Array.isArray(replayIntroAtParam) ? replayIntroAtParam[0] : replayIntroAtParam;
  const replayIntroToken = replayIntro ? (replayIntroAt || 'manual') : '';
  const lessonId = parseInt(id, 10) || 1;
  const frenchRemoteSourceLocale = lang === 'uk' ? 'uk' : 'ru';
  const frenchRemoteLessonRequired = frenchStudyActive(studyTarget);
  const [remoteFrenchLessonRows, setRemoteFrenchLessonRows] = useState<LessonPhrase[] | null>(null);
  const [remoteFrenchLessonLoadState, setRemoteFrenchLessonLoadState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [remoteFrenchLessonReloadNonce, setRemoteFrenchLessonReloadNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (!frenchRemoteLessonRequired) {
      setRemoteFrenchLessonRows(null);
      setRemoteFrenchLessonLoadState('idle');
      return () => { cancelled = true; };
    }
    setRemoteFrenchLessonLoadState('loading');
    setRemoteFrenchLessonRows(null);
    loadFrenchRemoteLessonRows(lessonId, frenchRemoteSourceLocale)
      .then((rows) => {
        if (cancelled) return;
        setRemoteFrenchLessonRows(rows);
        setRemoteFrenchLessonLoadState(rows.length > 0 ? 'ready' : 'failed');
      })
      .catch(() => {
        if (cancelled) return;
        setRemoteFrenchLessonRows([]);
        setRemoteFrenchLessonLoadState('failed');
      });
    return () => { cancelled = true; };
  }, [frenchRemoteLessonRequired, frenchRemoteSourceLocale, lessonId, remoteFrenchLessonReloadNonce]);
  const lessonStorageId = lessonId;
  const LESSON_KEY = lessonProgressKey(lessonStorageId, studyTarget);
  const CELL_KEY   = lessonSessionKey(lessonStorageId, 'cellIndex', studyTarget);
  const ORDER_KEY  = lessonSessionKey(lessonStorageId, 'phraseOrder', studyTarget);
  const ERROR_REPLAY_QUEUE_KEY   = lessonSessionKey(lessonStorageId, 'errorReplayQueue', studyTarget);
  const ERROR_REPLAY_SINCE_KEY   = lessonSessionKey(lessonStorageId, 'errorReplaySince', studyTarget);
  const ERROR_REPLAY_OVERRIDE_KEY = lessonSessionKey(lessonStorageId, 'errorReplayOverride', studyTarget);
  const SERVER_ATTEMPT_KEY = lessonSessionKey(lessonStorageId, 'serverAttemptId', studyTarget);

  // Фильтруем только фразы с .words — словарные слова (без .words) не показываем в режиме кнопок
  const LESSON_DATA = useMemo(
    () => (remoteFrenchLessonRows ?? getLessonData(lessonId)).filter(p => {
      if (!p || !phraseHasStudyTargetContent(p, studyTarget)) return false;
      return p.words && p.words.length > 0;
    }),
    [remoteFrenchLessonRows, lessonId, studyTarget],
  );
  // Если в уроке меньше 50 фраз — не повторяем. effectiveTotal = реальное кол-во фраз.
  const effectiveTotal = Math.min(LESSON_DATA.length, TOTAL);
  const hasPlayableLessonRows = effectiveTotal > 0;
  const lessonTheorySupportBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId);
  const lessonHintSupportBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_hint', lessonId);
  const { startCell: initialStartCell, initialOrder: initialOrderFromPrime } = getInitialOrderAndCell(lessonStorageId, LESSON_DATA.length, effectiveTotal, studyTarget);
  const initialOverridePhraseCell = getInitialOverridePhraseCell(lessonStorageId, effectiveTotal, studyTarget);
  const { energy: currentEnergy, bonusEnergy, maxEnergy: currentMaxEnergy, isUnlimited: testerEnergyDisabled, confirmSpendOne, energyReady } = useEnergy();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const blocked = await shouldBlockLessonAccess(lessonId, studyTarget);
      if (!cancelled && blocked) await openLessonGateByRuntime(router, lessonId, studyTarget);
    })();
    return () => { cancelled = true; };
  }, [lessonId, router, studyTarget]);
  // Refs to avoid stale closures in useCallback (checkAnswer has [progress,...] deps, not energy)
  const confirmSpendOneRef = useRef(confirmSpendOne);
  useEffect(() => { confirmSpendOneRef.current = confirmSpendOne; }, [confirmSpendOne]);

  // cellIndex — позиция в прогресс-баре (0..49), двигается строго по кругу
  const [cellIndex,    setCellIndex]    = useState(initialStartCell);
  const [status,       setStatus]       = useState<'playing' | 'result'>('playing');
  const [selectedWords,setSelectedWords]= useState<string[]>([]);
  const [shuffled,     setShuffled]     = useState<string[]>([]);
  const preparedPhraseStartKeyRef = useRef<string | null>(null);
  const [progress,     setProgress]     = useState<string[]>(() => getInitialProgressArray(effectiveTotal, lessonStorageId, studyTarget));
  // [REVIEW] Ячейки, реально отвеченные за ТЕКУЩИЙ проход. «Назад к фразам» показывает
  // только их — нельзя листать фразы, до которых юзер ещё не дошёл в этом проходе
  // (важно для повторных проходов, где progress[] уже полностью заполнен с прошлого раза).
  const [passAnsweredCells, setPassAnsweredCells] = useState<ReadonlySet<number>>(() => new Set());
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const spokenResultKeyRef = useRef('');
  const [wasWrong,     setWasWrong]     = useState(false);
  const [lessonTeachingNote, setLessonTeachingNote] = useState<ResolvedLessonTeachingNote | null>(null);
  // Снимок заметок загружается вместе с остальным состоянием урока. Нельзя
  // ходить в AsyncStorage перед показом результата каждого правильного ответа:
  // нативный мост задерживает кадр, а через несколько фраз очередь растёт.
  const teachingNoteSeenIdsRef = useRef<string[]>([]);
  const [typedText,    setTypedText]    = useState('');
  const [showTapHint,  setShowTapHint]  = useState(false);
  // CHANGE v5: contraction branching state
  const [phraseWordIdx, setPhraseWordIdx] = useState(0);        // position in original phrase words
  const [contrExpanded, setContrExpanded] = useState<string[] | null>(null); // pending expansion tokens
  const correctStreakRef = useRef(0);  // серия правильных ответов + combo badge
  const userNameRef      = useRef<string | null>(null); // кешируем имя чтобы не читать AsyncStorage на каждый ответ
  // [COMBO] Отображаемое значение комбо для UI-бейджа. Обновляется в setState.
  const [comboCount, setComboCount] = useState(0);
  const [xpToastAmount, setXpToastAmount] = useState(0);
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const xpToastAnim = useRef(new Animated.Value(0)).current;
  const xpToastSequenceRef = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => () => {
    xpToastSequenceRef.current?.stop();
    xpToastAnim.stopAnimation();
  }, [xpToastAnim]);
  const lessonXpEstimateMultiplierRef = useRef(1);
  // The completion screen reports only XP that registerXP actually committed.
  // Keep its in-flight awards so navigation cannot race their final multipliers.
  const lessonEarnedXpRef = useRef(0);
  const lessonEarnedBaseXpRef = useRef(0);
  const lessonEarnedMultipliersRef = useRef<Map<string, ConfirmedLessonMultiplierEntry>>(new Map());
  const pendingLessonXpAwardsRef = useRef<Promise<void>[]>([]);
  const replayNormalBaseXpRef = useRef(0);
  const replayAwardedBaseXpRef = useRef(0);
  const replayXpScope = `${lessonStorageId}:${studyTarget}:${routeServerAttemptId ?? 'stored'}`;
  const replayXpScopeRef = useRef(replayXpScope);
  if (replayXpScopeRef.current !== replayXpScope) {
    replayXpScopeRef.current = replayXpScope;
    replayNormalBaseXpRef.current = 0;
    replayAwardedBaseXpRef.current = 0;
  }
  const [fiftyFiftyUsedToday, setFiftyFiftyUsedToday] = useState(0);
  const [bonusHints, setBonusHints] = useState(0);
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
  /**
   * false until loadData finishes, unless we primed from AsyncStorage before navigation
   * (see lesson_menu / primeLessonScreenFromStorage) — then first paint is already at saved cell.
   */
  const [lessonHydrated, setLessonHydrated] = useState(
    () => isLessonScreenPrimedThisSession(lessonStorageId, LESSON_DATA.length, effectiveTotal)
  );
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const toastAnim   = useRef(new Animated.Value(0)).current;
  const cursorAnim  = useRef(new Animated.Value(1)).current;
  const hintPulseAnim = useRef(new Animated.Value(0.4)).current;
  const hintLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const autoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Пока в дочернем LessonContent открыта панель «Скажи вслух», авто-переход к
  // следующей фразе заморожен: юзер хочет остаться на фразе (переслушать эталон/
  // свою запись, перезаписать). Флаг синхронный — колбэк таймера читает его без
  // устаревания. Дочерний компонент дёргает setSpeakingAdvanceSuspended.
  const speakingSuspendRef = useRef(false);
  const setSpeakingAdvanceSuspended = useCallback((suspended: boolean) => {
    speakingSuspendRef.current = suspended;
    // Открытие панели должно погасить уже заряженный 4-сек таймер немедленно.
    if (suspended && autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);
  const replayAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textInputRef = useRef<any>(null);
  const sessionAnswerCount = useRef(0);   // кол-во ответов в текущей сессии
  // A repeat opened from lesson_complete receives its fresh attempt id in the
  // route, so Android cannot race the asynchronous AsyncStorage write and reuse
  // the previous pass id (which made every reward look like a duplicate).
  const serverAttemptIdRef = useRef<string>(routeServerAttemptId ?? '');
  const lessonWrongMistakesRef = useRef<PhraseMistakeInput[]>([]);
  const isReplayRef        = useRef(false); // true если урок уже был пройден полностью
  const isCompletingRef    = useRef(false); // true пока идёт задержка перед переходом на lesson_complete
  // зачем: checkAnswer асинхронна и до первого await не поднимала никакого флага, а UI
  // блокировался только через status === 'playing' — setStatus('result') отрабатывает уже
  // ПОСЛЕ await, поэтому два быстрых тапа (или тап + тап по фону) успевали пройти оба и
  // засчитать один ответ дважды: двойной XP, сбитый счётчик серии. Синхронный ref-флаг
  // закрывает окно так же, как locked.current в lesson_words.tsx и settlingRef в
  // flashcards_swipe.tsx. Снимается сразу после setStatus('result') — дальше барьером
  // работает сам статус, поэтому флаг не залипает на путях, минующих goNext.
  const answerInFlightRef  = useRef(false);
  const lessonExitInFlightRef = useRef(false);
  const lessonAnalyticsKey = `${lessonId}:${lessonStorageId}:${studyTarget}`;
  const lessonAnalyticsKeyRef = useRef(lessonAnalyticsKey);
  const lessonAnalyticsAttemptRef = useRef<ReturnType<typeof createLessonAnalyticsAttempt> | null>(null);
  if (!lessonAnalyticsAttemptRef.current || lessonAnalyticsKeyRef.current !== lessonAnalyticsKey) {
    lessonAnalyticsKeyRef.current = lessonAnalyticsKey;
    lessonAnalyticsAttemptRef.current = createLessonAnalyticsAttempt(Crypto.randomUUID);
  }
  useEffect(() => {
    let cancelled = false;
    const lessonMultiplier = getLessonDifficultyMultiplier(lessonId);
    lessonXpEstimateMultiplierRef.current = lessonMultiplier;
    getCurrentMultiplierBreakdown()
      .then((breakdown) => {
        const multiplierWithoutOneShotChest = Math.max(1, breakdown.total - Math.max(0, breakdown.leagueChestM - 1));
        if (!cancelled) lessonXpEstimateMultiplierRef.current = Math.max(1, multiplierWithoutOneShotChest * lessonMultiplier);
      })
      .catch(() => {
        if (!cancelled) lessonXpEstimateMultiplierRef.current = lessonMultiplier;
      });
    return () => { cancelled = true; };
  }, [lessonId]);

  // [IMMEDIATE ERROR REPLAY] Очередь ячеек с ошибками для повтора через 2-3 вопроса
  const errorQueueRef          = useRef<number[]>([]); // cellIndex ячеек где была ошибка
  const questionsSinceErrorRef = useRef(0);            // сколько вопросов прошло после добавления в очередь
  const [overridePhraseCell, setOverridePhraseCell] = useState<number | null>(initialOverridePhraseCell); // если задан — показываем эту фразу вместо текущей
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
    if (!hasUsableLessonPhraseOrder(order, LESSON_DATA.length)) {
      return LESSON_DATA[cell % LESSON_DATA.length] ?? null;
    }
    // order теперь имеет длину TOTAL — прямой индекс без %
    const raw = order[cell] ?? order[cell % order.length];
    const idx = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (idx < 0 || idx >= LESSON_DATA.length) return LESSON_DATA[0] ?? null;
    return LESSON_DATA[idx] ?? null;
  };

  // Фраза определяется позицией ячейки с учётом shuffle и возможного replay ошибки
  const phrase = getPhraseForCell(overridePhraseCell ?? cellIndex);

  const phraseStartKey = (
    cell: number,
    overrideCell: number | null,
    target: StudyTargetLang,
    p: any,
  ): string => `${cell}:${overrideCell ?? 'none'}:${target}:${String(p?.id ?? p?.english ?? p?.spanish ?? '')}`;


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
    if (!lessonRuntimeActive || selectedWords.length > 0) {
      cursorAnim.stopAnimation();
      cursorAnim.setValue(1);
      return;
    }
    const blink = Animated.loop(Animated.sequence([
      Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    blink.start();
    return () => blink.stop();
  }, [cursorAnim, lessonRuntimeActive, selectedWords.length]);


  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void loadData();
      // Кешируем имя один раз при монтировании — избегаем async lookup на каждый ответ
      AsyncStorage.getItem('user_name')
        .then(n => {
          userNameRef.current = n;
        })
        .catch(() => {});
    });
    return () => {
      task.cancel();
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [lang, lessonId, lessonStorageId, studyTarget]);

  useEffect(() => {
    let cancelled = false;
    const introKey = lessonIntroShownKey(lessonId, studyTarget);
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
      let cancelled = false;
      AsyncStorage.getItem(SETTINGS_KEY).then(ss => {
        if (cancelled) return;
        if (ss) {
          try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(ss) }); } catch {}
        }
      });
      return () => { cancelled = true; };
    }, [])
  );

  useEffect(() => () => {
    if (replayAudioTimerRef.current) clearTimeout(replayAudioTimerRef.current);
    stopAudio();
  }, [stopAudio]);

  useEffect(() => {
    if (lessonRuntimeActive) return;
    if (autoTimer.current) { clearTimeout(autoTimer.current); autoTimer.current = null; }
    if (replayAudioTimerRef.current) { clearTimeout(replayAudioTimerRef.current); replayAudioTimerRef.current = null; }
    stopAudio();
  }, [lessonRuntimeActive, stopAudio]);

  const resultAudioLine = useMemo(() => {
    if (!phrase) return '';
    const canonicalLine = phraseAnswerDisplayLine(phrase, studyTarget, lang);
    if (status !== 'result' || wasWrong) return canonicalLine;
    const acceptedLine = (settings.hardMode
      ? typedText
      : cleanPhraseForDisplay(selectedWords.join(' ')))
      .replace(/\s+/g, ' ')
      .trim();
    return acceptedLine
      ? answerDisplayLineWithCanonicalPunctuation(acceptedLine, canonicalLine)
      : canonicalLine;
  }, [lang, phrase, selectedWords, settings.hardMode, status, studyTarget, typedText, wasWrong]);

  useEffect(() => {
    if (!lessonRuntimeActive || status !== 'result' || !phrase || !settings.voiceOut) return;
    const line = resultAudioLine;
    const key = `${String(phrase.id ?? cellIndex)}:${line}`;
    if (!line || spokenResultKeyRef.current === key) return;
    spokenResultKeyRef.current = key;
    speakAudio(line, settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget), speechText: pronunciationOverrideForLessonPhrase(line) });
  }, [cellIndex, lessonRuntimeActive, phrase, resultAudioLine, settings.speechRate, settings.voiceOut, speakAudio, status, studyTarget]);

  const replayResultPhraseAudio = useCallback(() => {
    if (!lessonRuntimeActive || status !== 'result' || !phrase) return;
    const line = resultAudioLine;
    if (!line) return;
    stopAudio();
    if (replayAudioTimerRef.current) clearTimeout(replayAudioTimerRef.current);
    replayAudioTimerRef.current = setTimeout(() => {
      replayAudioTimerRef.current = null;
      speakAudio(line, settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget), speechText: pronunciationOverrideForLessonPhrase(line) });
    }, Platform.OS === 'android' ? 90 : 30);
  }, [lessonRuntimeActive, phrase, resultAudioLine, settings.speechRate, speakAudio, status, stopAudio, studyTarget]);

  // [REVIEW] «Назад к фразам» — список уже пройденных фраз урока для просмотра/сравнения
  // (read-only). Запрошено пользователем: вернуться и сравнить логику прошлых заданий.
  // Только пройденные ячейки (progress[i] непустой), исключая текущую позицию.
  // Прогресс/XP НЕ трогаем — это чистое чтение, без markTrainerResult/начисления.
  const reviewPhrases = useMemo<ReviewPhrase[]>(() => {
    const out: ReviewPhrase[] = [];
    const activeCell = overridePhraseCell ?? cellIndex;
    const cellCount = Math.max(effectiveTotal, progress.length);
    for (let i = 0; i < cellCount; i += 1) {
      // Только фразы, реально пройденные за ТЕКУЩИЙ проход. Не даём листать вперёд/
      // к фразам, до которых юзер ещё не дошёл в этом проходе.
      if (!passAnsweredCells.has(i)) continue;
      // Прячем активную ячейку ТОЛЬКО во время immediate-error-replay: тогда overridePhraseCell
      // закрепляет activeCell на повторяемой фразе, которая уже в passAnsweredCells, и без этого
      // условия список «Назад к фразам» схлопывался до одной фразы (см. регрессию строки 2193).
      // На обычном экране результата только что отвеченную фразу НАДО показывать.
      if (overridePhraseCell !== null && i === activeCell) continue;
      const p = getPhraseForCell(i);
      if (!p) continue;
      const en = phraseAnswerDisplayLine(p, studyTarget, lang);
      const meaning = lessonPhraseMeaningForLang(p, lang, studyTarget);
      if (!en) continue;
      out.push({ key: `${i}:${String(p?.id ?? en)}`, position: i, en, meaning });
    }
    return out;
    // getPhraseForCell зависит от phraseOrderRef (ref) + LESSON_DATA; перечислять ref не нужно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passAnsweredCells, progress, effectiveTotal, overridePhraseCell, cellIndex, studyTarget, lang]);

  const onPlayReviewAudio = useCallback((en: string) => {
    const line = (en ?? '').trim();
    if (!line) return;
    stopAudio();
    if (replayAudioTimerRef.current) clearTimeout(replayAudioTimerRef.current);
    replayAudioTimerRef.current = setTimeout(() => {
      replayAudioTimerRef.current = null;
      speakAudio(line, settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget), speechText: pronunciationOverrideForLessonPhrase(line) });
    }, Platform.OS === 'android' ? 90 : 30);
  }, [settings.speechRate, speakAudio, stopAudio, studyTarget]);

  // Pulsing animation for to-be hint (only on first phrase of lesson 1)
  useEffect(() => {
    if (lessonRuntimeActive && showToBeHint && cellIndex < 2) {
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
  }, [cellIndex, hintPulseAnim, lessonRuntimeActive, showToBeHint]);

  // Reset failed tap counter when energy recovers or phrase changes
  useEffect(() => {
    if (currentEnergy > 0) {
      setFailedTapCount(0);
    }
  }, [currentEnergy]);

  useEffect(() => {
    setFailedTapCount(0);
    // Перезагружаем доступные кнопки при смене фразы/ячейки
    // BUGFIX: используем overridePhraseCell если есть (replay), иначе cellIndex
    if (status === 'playing') {
      const p = getPhraseForCell(overridePhraseCell ?? cellIndex);
      const startKey = phraseStartKey(cellIndex, overridePhraseCell, studyTarget, p);
      if (preparedPhraseStartKeyRef.current === startKey) return;
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
      preparedPhraseStartKeyRef.current = startKey;
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
   * Выход с урока. Не используем replace('/lessons_list'): при canGoBack() === false
   * replace подменяет только верхний экран, и под ним снова оказывается тот же lesson_menu —
   * визуально «то же окно» и лишний шаг в стеке.
   * НЕ используем router.dismiss(1): это нативный imperative dismiss, который на
   * Android/Fabric ломает teardown стекового (не модального) экрана и даёт чёрный
   * неотзывчивый экран (см. предупреждение про native back в navigation_back.ts).
   * safeRouterBack — тот же безопасный путь (replace вместо native back/dismiss),
   * которым пользуется весь остальной код.
   */
  const navigateUpFromLessonScreen = useCallback(() => {
    if (from === 'lesson_menu') {
      const popToMenu = () => {
        if (router.canGoBack()) {
          safeRouterBack(router, { pathname: '/lessons_list', params: { id: String(lessonId) } } as any);
          return;
        }
        if (NATIVE_LESSON_DISMISS_ENABLED) {
          router.dismissTo({ pathname: '/lessons_list', params: { id: String(lessonId) } });
          return;
        }
        void trackActivity('navigation:native_lesson_dismiss_skipped', {
          feature: 'navigation',
          screen: 'lesson1',
          result: 'info',
          tags: { lessonId, from },
        });
        safeRouterBack(router, { pathname: '/lessons_list', params: { id: String(lessonId) } } as any);
      };
      void import('./lesson_menu')
        .then((m) => m.prefetchLessonMenuCache(lessonId, studyTargetRef.current))
        .catch(() => {});
      popToMenu();
      return;
    }
    if (router.canGoBack()) {
      safeRouterBack(router, '/(tabs)/home' as any);
    } else {
      // Стек пуст (например, deeplink или router.replace без истории) — возвращаемся на главную,
      // а не на /lesson_menu: иначе lesson_menu тоже окажется без истории, и его «назад»
      // не сработает (юзер застрянет после онбординга).
      safeRouterBack(router, '/(tabs)/home' as any);
    }
  }, [router, from, lessonId]);

  const beginLessonExit = useCallback(() => {
    if (lessonExitInFlightRef.current) return false;
    lessonExitInFlightRef.current = true;
    return true;
  }, []);

  const handleLessonHeaderBack = useCallback(() => {
    if (lessonExitInFlightRef.current) return;
    if (!beginLessonExit()) return;
    const attempt = lessonAnalyticsAttemptRef.current!;
    if (markLessonAttemptTerminal(attempt, 'abandon')) {
      logLessonAbandoned(lessonId, cellIndex, effectiveTotal, attempt.id, lessonAttemptElapsedMs(attempt));
    }
    trackLessonAbandoned().catch(() => {});
    navigateUpFromLessonScreen();
  }, [beginLessonExit, lessonId, cellIndex, effectiveTotal, navigateUpFromLessonScreen]);

  const handleIntroDone = useCallback(async () => {
    if (replayIntro) consumedReplayIntroTokenRef.current = replayIntroToken || 'manual';
    await AsyncStorage.setItem(lessonIntroShownKey(lessonId, studyTargetRef.current), 'true').catch(() => {});
    syncLessonIntroShownFlagNow();
    setShowIntroScreens(false);
  }, [lessonId, replayIntro, replayIntroToken]);

  const resetNoEnergyModal = useCallback(() => {
    setShowNoEnergyModal(false);
    isShowingEnergyFeedbackRef.current = false;
  }, []);

  const dismissEnergyModal = useCallback(() => {
    if (lessonExitInFlightRef.current) return;
    if (!beginLessonExit()) return;
    resetNoEnergyModal();
    navigateUpFromLessonScreen();
  }, [beginLessonExit, navigateUpFromLessonScreen, resetNoEnergyModal]);

  // Android: системный «Назад» = тот же выход, что и кнопка (без дублей в стеке).
  useEffect(() => {
    if (!lessonRuntimeActive || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showNoEnergyModal) {
        resetNoEnergyModal();
        return true;
      }
      handleLessonHeaderBack();
      return true;
    });
    return () => sub.remove();
  }, [lessonRuntimeActive, showNoEnergyModal, handleLessonHeaderBack, resetNoEnergyModal]);

  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);

  // Энергия при входе в урок: списываем РОВНО 1 ⚡ за старт.
  // зачем: владелец 2026-08-23 — единое правило экономики. Энергия платится за
  // ПОПЫТКУ (вход в активность), а не за ошибки внутри неё. Ошибка больше не
  // жжёт заряд, поэтому урок не может оборваться на середине.
  // Списание идемпотентно на урок за один заход (entryEnergyGateLessonRef): при
  // ре-рендерах и смене энергии повторно не снимаем. Ноль энергии → модалка и
  // отказ от входа (обрабатывает вызывающий экран, здесь — блок ответов ниже).
  const entryEnergyGateLessonRef = useRef<number | null>(null);
  // зачем: латч НЕ сбрасывается по useFocusEffect. Раньше сброс на фокусе был
  // безобиден — эффект только показывал модалку про нулевую энергию. Теперь он
  // СПИСЫВАЕТ единицу, и сброс на каждом возврате фокуса списывал бы повторно:
  // ушёл в теорию (/hint, /lesson_help) или на пейвол и вернулся — минус ещё
  // одна единица за тот же урок. Латч живёт по lessonId, поэтому переход на
  // ДРУГОЙ урок (смена lessonId) честно платится заново, а возврат в тот же —
  // нет. Размонтирование экрана сбрасывает ref естественным образом.
  useEffect(() => {
    if (!energyReady) return;
    if (entryEnergyGateLessonRef.current === lessonId) return;
    entryEnergyGateLessonRef.current = lessonId;
    let active = true;
    void confirmSpendOneRef.current().then(result => {
      if (!active) return;
      if (result === 'insufficient') showEnergyEmptyFeedback();
      if (result === 'cancelled') safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any);
    });
    return () => { active = false; };
  }, [energyReady, lessonId, currentEnergy, bonusEnergy, testerEnergyDisabled, showEnergyEmptyFeedback]);

  const loadData = async () => {
    if (!isLessonScreenPrimedThisSession(lessonStorageId, LESSON_DATA.length, effectiveTotal)) {
      setLessonHydrated(false);
    }
    try {
      const attempt = lessonAnalyticsAttemptRef.current!;
      if (markLessonAttemptStarted(attempt)) {
        logLessonStart(lessonId, effectiveTotal, attempt.id);
      }
      trackLessonStart().catch(() => {});
      if (!hasPlayableLessonRows) {
        phraseOrderRef.current = [];
        errorQueueRef.current = [];
        questionsSinceErrorRef.current = 0;
        setOverridePhraseCell(null);
        setProgress([]);
        setPassAnsweredCells(new Set()); // [REVIEW]
        setShuffled([]);
        setSelectedWords([]);
        setTypedText('');
        teachingNoteSeenIdsRef.current = [];
        setPhraseWordIdx(0);
        setContrExpanded(null);
        touchLessonScreenPrimed(lessonStorageId, {
          cell: 0,
          order: [],
          progress: [],
          override: null,
        }, studyTarget);
        setLessonHydrated(true);
        return;
      }

      // Показываем intro-экраны при первом открытии урока (если контент есть).
      // Проверку делаем РАНЬШЕ тяжёлых await, чтобы экран появился мгновенно;
      // данные урока продолжают грузиться параллельно — к моменту тапа «Начать»
      // всё уже готово.
      const introKey = lessonIntroShownKey(lessonId, studyTargetRef.current);
      const introShownRaw = await AsyncStorage.getItem(introKey);
      if (!introShownRaw && getLessonIntroScreens(lessonId, studyTargetRef.current).length > 0) {
        await AsyncStorage.setItem(introKey, 'true').catch(() => {});
        syncLessonIntroShownFlagNow();
        setShowIntroScreens(true);
        setLessonHydrated(true); // снимаем спиннер — рендерим интро поверх
      }

      // Проверяем тестерские функции
      const noLimits = await isTesterNoLimitsActive();
      setTesterNoLimits(noLimits);
      // energy state comes from EnergyContext — no local load needed

      loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
      const teachingNoteMemoryKey = lessonTeachingNoteSeenStorageKey(lessonStorageId, studyTargetRef.current);
      const [sp, ss, ci, savedOrder, errQRaw, errSinceRaw, errOvRaw, serverAttemptRaw, teachingNoteSeenRaw] = await Promise.all([
        AsyncStorage.getItem(LESSON_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(CELL_KEY),
        AsyncStorage.getItem(ORDER_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_QUEUE_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_SINCE_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_OVERRIDE_KEY),
        AsyncStorage.getItem(SERVER_ATTEMPT_KEY),
        AsyncStorage.getItem(teachingNoteMemoryKey),
      ]);
      teachingNoteSeenIdsRef.current = parseLessonTeachingNoteSeenIds(teachingNoteSeenRaw);
      const serverAttemptId = routeServerAttemptId || serverAttemptRaw || makeLessonServerAttemptId();
      serverAttemptIdRef.current = serverAttemptId;
      if (serverAttemptRaw !== serverAttemptId) {
        AsyncStorage.setItem(SERVER_ATTEMPT_KEY, serverAttemptId).catch(() => {});
      }

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
        // зачем: второй рубеж против «залипшего повтора» (репорт «не можу закінчити раунд»).
        // Раньше условие пропускало пару override=N + пустая очередь, если ячейка помечена
        // 'wrong': после ПРОВАЛЕННОГО повтора ячейка остаётся красной навсегда, а из очереди
        // уже удалена — и экран открывался на фразе N после каждого remount. Единственный
        // честный признак незавершённого повтора — ячейка всё ещё в очереди.
        if (restoredOverride !== null && !restoredErrQueue.includes(restoredOverride)) {
          restoredOverride = null;
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

      // [REVIEW] Сид «пройдено за проход» при загрузке.
      // Первый проход (не replay): фразы из restoredProgress уже пройдены в этом проходе.
      // Повтор (все ячейки correct с прошлого раза): начинаем с пустого — нельзя листать
      // то, что не переотвечено в текущем круге.
      if (isReplayRef.current) {
        setPassAnsweredCells(new Set());
      } else {
        const seeded = new Set<number>();
        restoredProgress.forEach((st, i) => {
          if (st === 'correct' || st === 'replay_correct') seeded.add(i);
        });
        setPassAnsweredCells(seeded);
      }

      // Восстанавливаем позицию строго из CELL_KEY — каждый индикатор = конкретная фраза
      const parsedStartCell = ci !== null ? (parseInt(ci, 10) || 0) : 0;
      const startCell = Math.max(0, Math.min(parsedStartCell, Math.max(0, effectiveTotal - 1)));

      // [SHUFFLE] Порядок фраз — без повторов внутри одного прохода.
      // Сохраняем в AsyncStorage чтобы при повторном входе (remount) не перегенерировать —
      // иначе уже отвеченные фразы могут снова попасть в оставшуюся часть нового shuffle.
      if (phraseOrderRef.current.length === 0 && LESSON_DATA.length > 0) {
        const n = LESSON_DATA.length;
        const count = Math.min(n, TOTAL);
        let restoredOrder: number[] | null = null;
        if (savedOrder) {
          try {
            const parsed = JSON.parse(savedOrder) as unknown;
            // Валидируем: длина совпадает и все индексы в диапазоне
            if (isValidLessonPhraseOrder(parsed, n)) {
              restoredOrder = parsed;
            } else {
              AsyncStorage.removeItem(ORDER_KEY).catch(() => {});
            }
          } catch {
            AsyncStorage.removeItem(ORDER_KEY).catch(() => {});
          }
        }
        if (restoredOrder) {
          phraseOrderRef.current = restoredOrder;
        } else {
          phraseOrderRef.current = shuffleLessonPhraseOrder(n);
          // Сохраняем новый порядок сразу
          AsyncStorage.setItem(ORDER_KEY, JSON.stringify(phraseOrderRef.current)).catch(() => {});
        }
      } else if (LESSON_DATA.length > 0 && !hasUsableLessonPhraseOrder(phraseOrderRef.current, LESSON_DATA.length)) {
        phraseOrderRef.current = shuffleLessonPhraseOrder(LESSON_DATA.length);
        AsyncStorage.setItem(ORDER_KEY, JSON.stringify(phraseOrderRef.current)).catch(() => {});
      }

      // Подсказка (подсветка правильного слова) только для урока 1 при первом посещении
      if (lessonId === 1 && startCell === 0 && !sp) {
        setShowToBeHint(true);
      } else {
        setShowToBeHint(false);
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
        const spSel: string[] = [];
        while (spIdx < spWords.length && isZeroArticlePosition(spWords, spIdx)) {
          spSel.push(spWords[spIdx]);
          spIdx++;
        }
        setSelectedWords(spSel);
        setPhraseWordIdx(spIdx);
        setTypedText('');
        setContrExpanded(null);
        setShuffled(spIdx < spWords.length ? safeGetDistracts(startPhrase, spIdx, st) : []);
        preparedPhraseStartKeyRef.current = phraseStartKey(startCell, restoredOverrideForUi, st, startPhrase);
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
      touchLessonScreenPrimed(lessonStorageId, {
        cell: startCell,
        order: phraseOrderRef.current,
        progress: restoredProgress,
        override: restoredOverrideForUi,
      }, studyTargetRef.current);

      // Загружаем счётчик подсказок 50/50 за сегодня (en — легаси-ключ, fr — свой namespace)
      const todayKey = fiftyFiftyUsageKey(new Date().toISOString().slice(0, 10), studyTargetRef.current);
      const ffCount = await AsyncStorage.getItem(todayKey);
      setFiftyFiftyUsedToday(ffCount ? parseInt(ffCount, 10) : 0);
      // Подарок «+N подсказок» пишется в ключ с учётом языка-цели (fr — отдельный
      // namespace), поэтому читать нужно с тем же target, иначе бонус не виден.
      const bonus = await getBonusHintsToday(studyTargetRef.current);
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
    // зачем: guard СИНХРОННЫЙ и стоит до первого await — иначе два быстрых тапа успевают
    // войти оба (setStatus('result') отрабатывает только после await, и кнопка, завязанная
    // на status === 'playing', ещё не успела перерисоваться). Тот же приём, что
    // locked.current в lesson_words.tsx. Снимается в goNext при возврате в 'playing'.
    if (answerInFlightRef.current) return;
    // зачем: владелец 2026-08-23 — за вход в урок уже списана 1 ⚡, а внутри урока
    // энергия не тратится вообще. Значит блокировать ОТВЕТЫ по нулевому балансу
    // нельзя: иначе оплаченный урок обрывался бы на первом же ответе (заряд ушёл
    // именно на этот вход). Гейт остался ровно один — на входе, выше.
    answerInFlightRef.current = true;
    const st = studyTargetRef.current;
    const expected = phraseCanonicalAnswer(phrase, st);
    const answerAlts = phraseAnswerAlternatives(phrase, st);
    const isRight = isCorrectAnswer(answer, expected, answerAlts)
      || (settings.hardMode && isCorrectLessonHardModeTypedAnswer(phrase, st, answer));
    const teachingMistakeToken = isRight
      ? undefined
      : resolvePhraseMistakeToken(expected, answer)?.tokenIndex;
    const shouldResolveTeachingNote = shouldShowLessonTeachingNote();
    const teachingNoteMemoryKey = lessonTeachingNoteSeenStorageKey(lessonStorageId, st);
    const seenTeachingNoteIds = isRight ? teachingNoteSeenIdsRef.current : [];
    const nextTeachingNote = shouldResolveTeachingNote
      ? resolvePhraseTeachingNote(
        phrase,
        st,
        !isRight,
        lang,
        teachingMistakeToken,
        seenTeachingNoteIds,
      )
      : null;
    setLessonTeachingNote(nextTeachingNote);
    if (isRight && nextTeachingNote) {
      const nextSeenTeachingNoteIds = [...seenTeachingNoteIds, nextTeachingNote.id];
      teachingNoteSeenIdsRef.current = nextSeenTeachingNoteIds;
      void AsyncStorage.setItem(
        teachingNoteMemoryKey,
        serializeLessonTeachingNoteSeenIds(nextSeenTeachingNoteIds),
      ).catch(() => {});
    }
    logLessonAnswer(lessonId, isRight, cellIndex, effectiveTotal, lessonAnalyticsAttemptRef.current!.id);
    void trackActivity('lesson:answer_result', {
      feature: 'lesson',
      screen: 'lesson1',
      result: isRight ? 'success' : 'blocked',
      tags: { lessonId, cellIndex, isRight, replay: overridePhraseCell !== null },
    });
    trackAnswer(isRight).catch(() => {});
    const np = [...progress];

    // КЛЮЧЕВАЯ ЛОГИКА:
    // Правильный ответ → ячейка зеленеет
    // Неправильный ответ → ячейка краснеет
    //   В режиме повтора (isReplay) ошибка может перекрыть зелёную ячейку → оценка падает
    if (isCompletingRef.current) return;
    sessionAnswerCount.current += 1;
    // [FeedbackKit] Значение серии ДО любых сбросов этого ответа (ветка ошибки
    // сбрасывает correctStreakRef ниже). Нужно, чтобы отличить обрыв серии
    // (comboBreak) от обычной ошибки (wrong). Только для ОЩУЩЕНИЙ — XP-формула
    // ниже читает correctStreakRef.current как и раньше.
    // Определяем реальную ячейку прогресса: при replay ошибки обновляем ячейку из очереди, не текущую
    const progressCell = overridePhraseCell ?? cellIndex;
    if (isRight) {
      const prevPhraseCellState = progress[progressCell];
      if (overridePhraseCell !== null) {
        // Правильный ответ в режиме replay → убираем из очереди, ячейка зеленеет
        errorQueueRef.current = errorQueueRef.current.filter(c => c !== overridePhraseCell);
        setReplaySolvedCorrectly(true); // стрелка зеленеет пока показывается экран результата
      } else if (errorQueueRef.current.includes(progressCell)) {
        // Правильный ответ в обычном режиме, но ячейка ещё в очереди ошибок (дошли по кругу).
        // Считаем это исправлением — убираем из очереди и засчитываем как правильно.
        // Без этого: визуально "правильно" но score падает (золото слетает).
        errorQueueRef.current = errorQueueRef.current.filter(c => c !== progressCell);
      }
      np[progressCell] = isReplayRef.current ? 'replay_correct' : 'correct';
      const wasLearned = prevPhraseCellState === 'correct' || prevPhraseCellState === 'replay_correct';
      if (!wasLearned) void bumpStatsDaily('phrases_learned', 1);
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
      // Replay attempts can earn XP too, so a mistake must always break the combo.
      correctStreakRef.current = 0;
      // Новая долгосрочная система «Ошибки» только фиксирует объективный fail.
      // Локальный обязательный replay этого урока остаётся выше и не зависит от Plus.
      {
        const stRm = studyTargetRef.current;
        const analyticsPhraseKey = phraseCanonicalAnswer(phrase, stRm);
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
          lessonWrongMistakesRef.current.push({ phrase: analyticsPhraseKey || canonKey, ...mistakeMeta });
          if (stRm === 'en' || stRm === 'fr') {
            const attemptScope = serverAttemptIdRef.current
              || lessonAnalyticsAttemptRef.current?.id
              || String(lessonStorageId);
            void getStableId()
              .then((accountScope) => captureObjectiveAttempt({
                accountScope,
                attemptId: [
                  attemptScope,
                  'answer',
                  String(sessionAnswerCount.current),
                  String(progressCell),
                ].join(':'),
                studyTarget: stRm,
                verdict: 'wrong',
                objective: true,
                content: {
                  sourceKind: 'lesson_phrase',
                  sourceId: `lesson-${lessonId}:phrase-${String(phrase.id ?? canonKey)}`,
                  canonicalTarget: canonKey,
                  sourceMeaning: lessonPhraseMeaningForLang(phrase, lang, stRm),
                  lessonId: String(lessonId),
                  tokens: correctTokens,
                  distractors: shuffled,
                },
                facet: {
                  kind: 'word_order',
                  tokenIndex: tokenIndex >= 0 ? tokenIndex : undefined,
                  expected: tokenRow?.correct ?? tokenRow?.text ?? errWord,
                },
              }))
              .catch(() => {});
          }
        }
      }
    }

    // Серия ответов + XP
    if (isRight) {
      correctStreakRef.current += 1;
      setComboCount(correctStreakRef.current);
      // Начисляем XP: 5 базовых × комбо-множитель (за серию без ошибок подряд внутри урока)
      const comboM = correctStreakRef.current >= 25 ? 3.0
        : correctStreakRef.current >= 15 ? 2.5
        : correctStreakRef.current >= 10 ? 2.0
        : correctStreakRef.current >= 5  ? 1.5
        : 1.0;
      const normalBaseXp = Math.round(5 * comboM);
      const answerBaseXp = resolveLessonAnswerBaseXp(normalBaseXp, isReplayRef.current, {
        normalBaseXpTotal: replayNormalBaseXpRef.current,
        awardedBaseXpTotal: replayAwardedBaseXpRef.current,
      });
      replayNormalBaseXpRef.current = answerBaseXp.normalBaseXpTotal;
      replayAwardedBaseXpRef.current = answerBaseXp.awardedBaseXpTotal;
      const xpAmount = answerBaseXp.baseXp;

      // Local-first XP: show the toast now and write the answer XP immediately.
      const answerCell = overridePhraseCell ?? cellIndex;
      const answerOrdinal = sessionAnswerCount.current;
      const optimisticXpAmount = Math.max(1, Math.round(xpAmount * lessonXpEstimateMultiplierRef.current));

      const awardPromise = registerXP(xpAmount, 'lesson_answer', userNameRef.current || '', lang, lessonId, {
        eventId: [
          'lesson',
          safeProgressEventPart(lessonStorageId, 40),
          safeProgressEventPart(studyTargetRef.current),
          safeProgressEventPart(serverAttemptIdRef.current || 'local_attempt', 40),
          'answer',
          String(answerOrdinal),
          String(answerCell),
          safeProgressEventPart(phrase.id ?? answerCell, 50),
          overridePhraseCell !== null ? 'replay' : 'main',
        ].join(':'),
        payload: {
          surface: 'lesson1_answer',
          studyTarget: studyTargetRef.current,
          lessonStorageId: String(lessonStorageId),
          attemptId: serverAttemptIdRef.current || null,
          answerOrdinal,
          cellIndex: answerCell,
          phraseId: phrase.id ?? null,
          baseAnswerXp: xpAmount,
          normalBaseAnswerXp: answerBaseXp.normalBaseXp,
          replayRewardRate: isReplayRef.current ? LESSON_REPLAY_XP_RATE : 1,
          optimisticAnswerXp: optimisticXpAmount,
          combo: correctStreakRef.current,
          replay: overridePhraseCell !== null,
          lessonReplay: isReplayRef.current,
        },
      }).then(({ finalDelta, multiplier }) => {
        const confirmedFinalDelta = Number.isFinite(finalDelta)
          ? Math.max(0, Math.round(finalDelta))
          : 0;
        if (confirmedFinalDelta <= 0) return;
        const confirmedBaseXp = Math.max(0, Math.round(xpAmount));
        lessonEarnedXpRef.current += confirmedFinalDelta;
        lessonEarnedBaseXpRef.current += confirmedBaseXp;

        const confirmedMultiplier = sanitizeConfirmedLessonMultiplier(multiplier);
        const multiplierXpDelta = Math.max(0, confirmedFinalDelta - confirmedBaseXp);
        if (confirmedMultiplier <= 1 || multiplierXpDelta <= 0) return;
        const multiplierKey = String(confirmedMultiplier);
        const current = lessonEarnedMultipliersRef.current.get(multiplierKey);
        if (!current && lessonEarnedMultipliersRef.current.size >= MAX_LESSON_MULTIPLIER_COUNT) return;
        lessonEarnedMultipliersRef.current.set(multiplierKey, {
          multiplier: confirmedMultiplier,
          xpDelta: (current?.xpDelta ?? 0) + multiplierXpDelta,
        });
      }).catch(() => {}).then(() => {});
      pendingLessonXpAwardsRef.current.push(awardPromise);
      void awardPromise.finally(() => {
        pendingLessonXpAwardsRef.current = pendingLessonXpAwardsRef.current.filter((pending) => pending !== awardPromise);
      });

      setXpToastAmount(optimisticXpAmount);
      setXpToastVisible(true);
      xpToastSequenceRef.current?.stop();
      xpToastAnim.stopAnimation();
      xpToastAnim.setValue(0);
      const xpToastSequence = Animated.sequence([
        Animated.timing(xpToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(xpToastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]);
      xpToastSequenceRef.current = xpToastSequence;
      xpToastSequence.start(({ finished }) => {
        if (finished) setXpToastVisible(false);
      });
      // Проверка combo читает/пишет состояние всех достижений. Она нужна только
      // на реальных порогах, а не после каждого правильного ответа.
      if (COMBO_ACHIEVEMENT_THRESHOLDS.has(correctStreakRef.current)) {
        checkAchievements({ type: 'combo', count: correctStreakRef.current, studyTarget: st }).catch(() => {});
      }
    } else {
      correctStreakRef.current = 0;
      setComboCount(0);
      // зачем: владелец 2026-08-23 — энергия БОЛЬШЕ НЕ ТРАТИТСЯ ЗА ОШИБКИ.
      // Единственная трата — 1 ⚡ при входе в урок (см. гейт входа выше).
      // Ошибка теперь стоит только времени, а не заряда: учиться можно спокойно.
    }

    setWasWrong(!isRight);
    setProgress(np);
    // [REVIEW] Отмечаем фразу как пройденную за этот проход (для «Назад к фразам»).
    // Только реально решённые верно — ошибку листать назад смысла нет.
    if (isRight) {
      const answeredCell = progressCell;
      setPassAnsweredCells(prev => {
        if (prev.has(answeredCell)) return prev;
        const next = new Set(prev);
        next.add(answeredCell);
        return next;
      });
    }
    // зачем: репорт «не можу закінчити раунд» — экран возвращал юзера на одну и ту же
    // фразу после каждого remount (модалка энергии, сворачивание). Причина: вызов без
    // аргумента брал overridePhraseCellRef, который синхронизируется с состоянием через
    // useEffect (строка ~2280), т.е. ЗДЕСЬ, внутри синхронного checkAnswer, он ещё хранит
    // «мы на повторе ячейки N». В сторадж уходило override=N при уже пустой очереди, а
    // сторож восстановления (inQ/'wrong') такую пару не чистит — ячейка после провала
    // replay остаётся 'wrong'. Ответ на replay ЗАВЕРШАЕТ повтор, поэтому override здесь
    // всегда null; какой будет следующая позиция — решает goNext и пишет сам.
    persistErrorReplayToStorage(null);

    // [FeedbackKit] Ощущения исхода (звук+вибра). Экономика/серия уже посчитаны
    // выше — здесь только «мягкость». fk сам уважает тумблеры звука/вибры.
    if (isRight) {
      // correctStreakRef уже инкрементирован в блоке XP выше.
      fk.verdict({ correct: true });
    } else {
      fk.verdict({ correct: false });
    }

    // Сразу показываем результат — НЕ ждать AsyncStorage (await раньше давал 1–3 с задержки UI).
    setStatus('result');
    // зачем: с этого момента барьером служит сам статус ('result' блокирует и кнопку, и
    // handleBgTap, и выбор слова), поэтому ref-флаг свою работу сделал и снимается здесь, а
    // не в goNext. Так он не залипнет ни на одном из путей, где goNext не вызывается:
    // завершение урока (уход на lesson_complete), ранний выход по isCompletingRef, а также
    // при исключении в коде ниже — иначе экран навсегда перестал бы принимать ответы.
    answerInFlightRef.current = false;

    // ==================== NEW: Handle to-be hint and encouragement screens ====================
    if (isRight) {
      // Disable correct-word hint after first two tests
      if (cellIndex === 1) {
        setShowToBeHint(false);
      }

    }
    fadeAnim.stopAnimation(() => {
      if (reduceMotion) {
        fadeAnim.setValue(1);
        return;
      }
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    });

    const nextCell = (cellIndex + 1) % effectiveTotal;
    void AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np)).catch(() => {});
    void AsyncStorage.setItem(CELL_KEY, String(nextCell)).catch(() => {});
    touchLessonScreenPrimed(lessonStorageId, { cell: nextCell, order: phraseOrderRef.current, progress: np, override: overridePhraseCell }, studyTargetRef.current);

    const pendingCycleEndReplay = nextCell === 0 && errorQueueRef.current.length > 0;
    if (pendingCycleEndReplay) {
      // At the lesson boundary there may be no natural "two questions later".
      // Prime the existing replay queue so the next tap opens the missed phrase
      // before the congratulations screen.
      questionsSinceErrorRef.current = Math.max(questionsSinceErrorRef.current, ERROR_REPLAY_DELAY_ANSWERS - 1);
      persistErrorReplayToStorage(overridePhraseCell);
    }

    // Урок закрывается по кругу позиций: дошли до последней позиции и ответили.
    // Ошибки, replay и очередь ошибок влияют только на оценку/модалку, но не блокируют финал.
    if (nextCell === 0 && !pendingCycleEndReplay) {
      // Preserve the identity that earned this run's answer XP before rotating
      // storage to the next replay. Completion dedupe follows the real attempt,
      // never pass_count (whose medal semantics are independent).
      const completedAttemptId = normalizeLessonServerAttemptId(serverAttemptIdRef.current)
        ?? makeLessonServerAttemptId();
      const nextAttemptId = makeLessonServerAttemptId();
      serverAttemptIdRef.current = nextAttemptId;
      AsyncStorage.setItem(SERVER_ATTEMPT_KEY, nextAttemptId).catch(() => {});
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
          setPassAnsweredCells(new Set()); // [REVIEW] новый проход — обнуляем «пройдено за проход»
          void AsyncStorage.multiRemove([
            ERROR_REPLAY_QUEUE_KEY,
            ERROR_REPLAY_SINCE_KEY,
            ERROR_REPLAY_OVERRIDE_KEY,
          ]).catch(() => {});
        };
        // Получаем финальную оценку урока перед переходом на lesson_complete
        const correct = np.filter(x => x === 'correct' || x === 'replay_correct').length;
        let finalScore = parseFloat((correct / effectiveTotal * 5).toFixed(1));
        try {

        // Если включен режим "Без ограничений", даём 5 баллов автоматически
        const noLimits = await isTesterNoLimitsActive();
        if (noLimits) {
          finalScore = 5;
        }

        // Пытаемся разблокировать следующий урок
        const didUnlock = await tryUnlockNextLesson(lessonId, finalScore, studyTarget);
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

        const analyticsAttempt = lessonAnalyticsAttemptRef.current!;
        if (markLessonAttemptTerminal(analyticsAttempt, 'complete')) {
          logLessonComplete(lessonId, analyticsAttempt.id, lessonAttemptElapsedMs(analyticsAttempt));
        }
        void trackFeatureSuccess('lesson', 'complete', {
          lessonId,
          finalScore,
          didUnlock,
          correct,
          effectiveTotal,
        }, 'lesson1');
        void bumpStatsDaily('lessons_completed', 1, studyTargetRef.current);

        // зачем: диагнозы тренера удалены вместе с разделом «Моя практика»
        // (осколок коммита 4ccd8c4f4) — маршрут больше не несёт coach-параметров.
        const coachRouteParams = {};

        const navigate = async () => {
          await Promise.all(pendingLessonXpAwardsRef.current);
          resetShuffleForNextPass();
          lessonWrongMistakesRef.current = [];
          markNextNavigationAsReplace();
          router.replace({
            pathname: '/lesson_complete',
            params: {
              id: String(lessonId),
              unlocked: didUnlock ? '1' : '0',
              earnedXp: String(lessonEarnedXpRef.current),
              earnedBaseXp: String(lessonEarnedBaseXpRef.current),
              earnedMultipliers: encodeConfirmedLessonMultipliers(lessonEarnedMultipliersRef.current),
              completedAttemptId,
              repeatAttemptId: nextAttemptId,
              passed: finalScore >= 2.5 ? '1' : '0',
              ...coachRouteParams,
            },
          });
        };

        // There is one completion surface: go straight to lesson_complete.
        await navigate();
        } catch (e) {
          void trackFeatureError('lesson', 'complete', e, { lessonId }, 'lesson1');
          // Fallback: navigate to lesson_complete even if tracking fails
          await Promise.all(pendingLessonXpAwardsRef.current);
          resetShuffleForNextPass();
          lessonWrongMistakesRef.current = [];
          markNextNavigationAsReplace();
          router.replace({
            pathname: '/lesson_complete',
            params: {
              id: String(lessonId),
              unlocked: '0',
              earnedXp: String(lessonEarnedXpRef.current),
              earnedBaseXp: String(lessonEarnedBaseXpRef.current),
              earnedMultipliers: encodeConfirmedLessonMultipliers(lessonEarnedMultipliersRef.current),
              completedAttemptId,
              repeatAttemptId: nextAttemptId,
              passed: finalScore >= 2.5 ? '1' : '0',
            },
          });
        }
      }, 1500);
      return;
    }

    // Панель «Скажи вслух» открыта → не заряжаем авто-переход (юзер хочет остаться
    // на фразе: переслушать эталон/запись, перезаписать). И даже если таймер
    // как-то был заряжен, колбэк ещё раз проверит флаг перед прыжком.
    if (settings.autoAdvance && lessonRuntimeActive && isRight && !speakingSuspendRef.current) {
      autoTimer.current = setTimeout(() => {
        autoTimer.current = null;
        if (!lessonRuntimeActive || speakingSuspendRef.current) return;
        goNext(np);
      }, 4000);
    }
  }, [progress, cellIndex, phrase, settings, fadeAnim, lessonId, overridePhraseCell, lang, lessonRuntimeActive, persistErrorReplayToStorage, reduceMotion, studyTarget, lessonStorageId, SERVER_ATTEMPT_KEY]);

  const goNext = useCallback(async (_currentProgress?: string[]) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);

    // [IMMEDIATE ERROR REPLAY] Определяем ДО того как двигать cellIndex
    questionsSinceErrorRef.current += 1;
    let replayCell: number | null = null;
    if (questionsSinceErrorRef.current >= ERROR_REPLAY_DELAY_ANSWERS && errorQueueRef.current.length > 0) {
      replayCell = errorQueueRef.current[0];
      questionsSinceErrorRef.current = 0;
    }

    // BUGFIX: при replay НЕ двигаем cellIndex вперёд — иначе позиция пропускается.
    // Если replay — остаёмся на текущей позиции; иначе — +1 по кругу.
    const nextCell = replayCell !== null ? cellIndex : (cellIndex + 1) % effectiveTotal;
    setCellIndex(nextCell);

    stopAudio();
    // Страховка: флаг уже снят в checkAnswer после setStatus('result'), но goNext вызывается
    // и по авто-переходу, и вручную — снимаем повторно, чтобы новая фраза гарантированно
    // принимала ответ даже если сюда пришли по пути, минующему показ результата.
    answerInFlightRef.current = false;
    setStatus('playing');
    setLessonTeachingNote(null);
    setSelectedWords([]);
    setTypedText('');
    setWasWrong(false);
    setPhraseWordIdx(0);    // CHANGE v5: reset contraction branching
    setContrExpanded(null); // CHANGE v5
    fadeAnim.stopAnimation(() => fadeAnim.setValue(0));
    if (settings.hardMode) setTimeout(() => textInputRef.current?.focus(), 50);

    setOverridePhraseCell(replayCell);
    setReplaySolvedCorrectly(false); // сбрасываем зелёный флаг — стрелка возвращается на текущую позицию
    persistErrorReplayToStorage(replayCell);

    // Фраза для следующей позиции (с учётом replay и shuffle)
    const phraseCell = replayCell ?? nextCell;
    const nextPhrase = getPhraseForCell(phraseCell);
    {
      const st = studyTargetRef.current;
      const transitionStartKey = phraseStartKey(nextCell, replayCell, st, nextPhrase);
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
      preparedPhraseStartKeyRef.current = transitionStartKey;
    }

    // Сохраняем позицию
    try { await AsyncStorage.setItem(CELL_KEY, String(nextCell)); } catch {}
    touchLessonScreenPrimed(lessonStorageId, { cell: nextCell, order: phraseOrderRef.current, progress, override: replayCell }, studyTargetRef.current);
  }, [cellIndex, progress, fadeAnim, LESSON_DATA, persistErrorReplayToStorage, lessonStorageId]);

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
    if (typedText.trim() && status === 'playing') {
      textInputRef.current?.blur();
      Keyboard.dismiss();
      checkAnswer(typedText);
    }
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

  // «Устно» → после «Готово» кладём произнесённую (= эталонную) фразу в поле
  // ответа и сдвигаем указатель в конец, чтобы кнопка «Проверить» стала активной
  // (canManuallyCheckAnswer требует phraseWordIdx >= phraseTokens.length). Юзер
  // дальше сам жмёт «Проверить». В hardMode заполняем текстовое поле.
  const handleSpeakingFillAnswer = useCallback((text: string) => {
    if (!phrase || status !== 'playing') return;
    const clean = (text ?? '').trim();
    if (!clean) return;
    if (settings.hardMode) {
      setTypedText(clean);
      checkAnswer(clean);
      return;
    }
    const phraseWords = getPhraseTokens(phrase, studyTargetRef.current);
    setContrExpanded(null);
    setShuffled([]);
    setSelectedWords(phraseWords);
    setPhraseWordIdx(phraseWords.length);
    checkAnswer(phraseWords.join(' '));
  }, [phrase, status, settings.hardMode, checkAnswer]);


  const correctCount = useMemo(() => progress.filter(p => p === 'correct' || p === 'replay_correct').length, [progress]);
  const wrongCount   = useMemo(() => progress.filter(p => p === 'wrong').length, [progress]);
  const score = useMemo(() => Number((correctCount / effectiveTotal * 5).toFixed(1)), [correctCount, effectiveTotal]);
  // зачем: владелец — «зашёл в урок, а плашка "Продолжить урок" на Главной ещё старая,
  // пока не перезайду в приложение». Раньше last-opened писался только в AsyncStorage —
  // это переживает перезапуск, но НЕ обновляет уже смонтированный home.tsx (он лежит на
  // соседнем табе и просто не знает, что что-то изменилось, пока сам не перечитает данные).
  // Патчим снапшот в памяти (на случай что home.tsx перемонтируется) И эмитим событие
  // (на случай что home.tsx уже жив на табе) — так плашка меняется в кадре входа в урок,
  // а не на следующем полном заходе в приложение. correctCount/50 (не /effectiveTotal) —
  // та же формула, что home.tsx использует при собственном loadData(), чтобы цифра не
  // «прыгнула» при следующем полном перечитывании.
  const lastOpenedSyncedRef = useRef(false);
  useEffect(() => {
    if (lessonId < 1 || lessonId > 32) return;
    lastOpenedSyncedRef.current = false;
  }, [lessonId]);
  useEffect(() => {
    if (lessonId < 1 || lessonId > 32) return;
    if (lastOpenedSyncedRef.current) return;
    lastOpenedSyncedRef.current = true;
    const homeScore = (correctCount / 50 * 5).toFixed(1);
    void AsyncStorage.setItem(lastOpenedLessonKey(studyTarget), String(lessonId)).catch(() => {});
    patchHomeScreenHydration({
      lastLessonId: lessonId,
      lastLessonProgress: correctCount,
      lastLessonScore: homeScore,
    }, studyTarget);
    emitAppEvent('last_opened_lesson_changed', {
      lessonId,
      progress: correctCount,
      score: homeScore,
      studyTarget,
    });
  }, [lessonId, studyTarget, correctCount]);

  // ── Medal tier change toast ──────────────────────────────────────────────────
  const prevMedalTierRef = useRef<MedalTier>('none');
  const medalToastInitializedRef = useRef(false);
  const [medalToast, setMedalToast] = useState<{ tier: MedalTier; promoted: boolean } | null>(null);
  const medalToastAnim = useRef(new Animated.Value(0)).current;
  const medalToastSequenceRef = useRef<Animated.CompositeAnimation | null>(null);

  const dismissMedalToast = useCallback(() => {
    medalToastSequenceRef.current?.stop();
    medalToastSequenceRef.current = null;
    medalToastAnim.stopAnimation();
    medalToastAnim.setValue(0);
    setMedalToast(null);
  }, [medalToastAnim]);

  const showMedalToast = useCallback((tier: MedalTier, promoted: boolean) => {
    medalToastSequenceRef.current?.stop();
    medalToastAnim.stopAnimation();
    setMedalToast({ tier, promoted });
    medalToastAnim.setValue(0);
    const sequence = Animated.sequence([
      Animated.spring(medalToastAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(2200),
      Animated.timing(medalToastAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]);
    medalToastSequenceRef.current = sequence;
    sequence.start(({ finished }) => {
      if (finished) setMedalToast(null);
    });
  }, [medalToastAnim]);

  useEffect(() => () => {
    medalToastSequenceRef.current?.stop();
    medalToastAnim.stopAnimation();
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

  // Списать один дневной кредит. Раньше это был 50/50 (затемнение слов); теперь кредит
  // тратится на «Объясни проще» ДО ответа (Фаза 5). Дневной счётчик и «подарок» те же;
  // для en ключ остаётся легаси `fifty_fifty_*` (история не сбрасывается), для fr —
  // отдельный target-namespace (контракт Густава: en/fr не делят счётчики).
  const consumeExplainCredit = useCallback(() => {
    if (fiftyFiftyUsedToday >= 3 + bonusHints || !phrase) return;
    const newCount = fiftyFiftyUsedToday + 1;
    setFiftyFiftyUsedToday(newCount);
    const todayKey = fiftyFiftyUsageKey(new Date().toISOString().slice(0, 10), studyTargetRef.current);
    AsyncStorage.setItem(todayKey, String(newCount));
  }, [fiftyFiftyUsedToday, bonusHints, phrase]);

  const frenchLessonRemotePending = frenchRemoteLessonRequired && (remoteFrenchLessonLoadState === 'idle' || remoteFrenchLessonLoadState === 'loading');
  const frenchLessonRemoteFailed = frenchRemoteLessonRequired && remoteFrenchLessonLoadState === 'failed' && !hasPlayableLessonRows;
  const frenchLessonSourceGateBlocked = frenchStudyActive(studyTarget) && !hasPlayableLessonRows && !frenchLessonRemotePending && !frenchLessonRemoteFailed;
  // зачем: тот же полноэкранный ActivityIndicator дёргал геометрию при загрузке
  // французского урока с сервера — переиспользуем один скелетон-компонент вместо
  // третьего отдельного спиннерного состояния (было 3 разных состояния подряд).
  if (frenchLessonRemotePending) {
    return (
      <TouchableWithoutFeedback onPress={undefined}>
        <LessonFirstFrame
          theme={t}
          compact={false}
          horizontalPadding={20}
        />
      </TouchableWithoutFeedback>
    );
  }

  if (frenchLessonRemoteFailed) {
    return (
      <TouchableWithoutFeedback onPress={undefined}>
        <ScreenGradient>
          <LessonArtBackdrop variant="practice" />
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, {
                ru: 'Не удалось загрузить французский урок',
                uk: 'Не вдалося завантажити французький урок',
                es: 'No se pudo cargar la lección de francés',
                'pt-BR': 'Não foi possível carregar a aula de francês',
                vi: 'Không tải được bài học tiếng Pháp',
                id: 'Pelajaran bahasa Prancis gagal dimuat',
                tr: 'Fransızca ders yüklenemedi',
                pl: 'Nie udało się załadować lekcji francuskiego',
              })}
            </Text>
            <TapScale
              accessibilityRole="button"
              onPress={() => setRemoteFrenchLessonReloadNonce((value) => value + 1)}
              scaleTo={0.96}
              style={{ backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
              </Text>
            </TapScale>
          </SafeAreaView>
        </ScreenGradient>
      </TouchableWithoutFeedback>
    );
  }

  if (frenchLessonSourceGateBlocked) {
    return (
      <TouchableWithoutFeedback onPress={undefined}>
        <ScreenGradient>
          <LessonArtBackdrop variant="practice" />
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              {triLang(lang, {
                ru: 'Французский пакет не загружен',
                uk: 'Французький пакет не завантажено',
                es: 'El paquete de francés no está cargado',
                'pt-BR': 'O pacote de francês não foi carregado',
                vi: 'Nội dung đang chờ kiểm duyệt',
                id: 'Materi menunggu peninjauan',
                tr: 'Fransızca paketi yüklenmedi',
                pl: 'Pakiet francuski nie został załadowany',
              })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body + 6, marginBottom: 18 }}>
              {triLang(lang, {
                ru: 'Проверь интернет и повтори загрузку. Английские фразы не используются как замена.',
                uk: 'Перевір інтернет і повтори завантаження. Англійські фрази не використовуються як заміна.',
                es: 'Este lesson no usará frases inglesas como reemplazo.',
                'pt-BR': 'Este lesson não usará frases inglesas como substituição.',
                vi: 'Bài này sẽ không dùng câu tiếng Anh thay thế.',
                id: 'Pelajaran ini tidak memakai frasa Inggris sebagai pengganti.',
                tr: 'Bu ders İngilizce ifadeleri yedek olarak kullanmayacak.',
                pl: 'Ta lekcja nie użyje angielskich fraz jako zamiennika.',
              })}
            </Text>
            <TapScale
              accessibilityRole="button"
              onPress={() => { markNextNavigationAsReplace(); router.replace('/lessons_list' as any); }}
              scaleTo={0.96}
              style={{ backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 }}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                {triLang(lang, { ru: 'К урокам', uk: 'До уроків', es: 'A lecciones', 'pt-BR': 'Para aulas', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derslere', pl: 'Do lekcji' })}
              </Text>
            </TapScale>
          </SafeAreaView>
        </ScreenGradient>
      </TouchableWithoutFeedback>
    );
  }

  if (introGateReady && showIntroScreens) {
    return (
      <LessonIntroScreens
        introScreens={getLessonIntroScreens(lessonId, studyTarget)}
        lessonId={lessonId}
        onComplete={handleIntroDone}
        onBack={handleLessonHeaderBack}
      />
    );
  }

  return (
    <>
    <TouchableWithoutFeedback onPress={settings.hardMode ? undefined : handleBgTap}>
      <ScreenGradient>
        <LessonArtBackdrop variant="practice" />
        <SafeAreaView style={{ flex: 1 }}>
          <LessonContent
            introGateReady={introGateReady}
            lessonId={lessonId}
            compact={compact}
            isSmallScreen={isSmallScreen}
            phrase={lessonHydrated ? phrase : null}
            selectedWords={selectedWords}
            status={status}
            handleBgTap={handleBgTap}
            handleWordPress={handleWordPress}
            undoLastWord={undoLastWord}
            onSpeakingFillAnswer={handleSpeakingFillAnswer}
            onSpeakingActiveChange={setSpeakingAdvanceSuspended}
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
            totalCells={effectiveTotal}
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
            onConsumeExplainCredit={consumeExplainCredit}
            fiftyFiftyUsedToday={fiftyFiftyUsedToday}
            bonusHints={bonusHints}
            displayCell={overridePhraseCell ?? cellIndex}
            isErrorReplay={overridePhraseCell !== null}
            replaySolvedCorrectly={replaySolvedCorrectly}
            xpToastVisible={xpToastVisible}
            xpToastAmount={xpToastAmount}
            xpToastAnim={xpToastAnim}
            realPhraseIdx={(() => { const order = phraseOrderRef.current; const cell = overridePhraseCell ?? cellIndex; if (order.length === 0) return cell % (LESSON_DATA?.length || 1); return order[cell] ?? order[cell % order.length]; })()}
            studyTarget={studyTarget}
            onReplayPhraseAudio={replayResultPhraseAudio}
            reviewPhrases={reviewPhrases}
            onPlayReviewAudio={onPlayReviewAudio}
            toastAnim={toastAnim}
            from={from}
                onHeaderBack={handleLessonHeaderBack}
                lessonTeachingNote={lessonTeachingNote}
                lessonTheorySupportBlocked={lessonTheorySupportBlocked}
                lessonHintSupportBlocked={lessonHintSupportBlocked}
                  />
        </SafeAreaView>

        {/* ── Medal tier toast (premium) ── */}
        {medalToast && (
          <MedalToast
            tier={medalToast.tier}
            promoted={medalToast.promoted}
            anim={medalToastAnim}
            bg={t.bgCard}
            isLightTheme={false}
            lang={lang}
            spanishUiActive={spanishLessonUiStringsActive(lang, studyTarget)}
            onDismiss={dismissMedalToast}
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
    </>
  );
}

export default withOptionalPersonalPlanSunsetGuard(LessonScreen, ['planTask']);
