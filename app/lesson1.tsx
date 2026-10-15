import Ionicons from '@expo/vector-icons/Ionicons';
import { isAttemptsStopEffect } from './session_attempts/session_attempts_stop';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
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
import { studySpeechLocale } from './study_speech_locale';
import ScreenGradient from '../components/ScreenGradient';
import DuoPressable from '../components/DuoPressable';
import LessonArtBackdrop from '../components/LessonArtBackdrop';
import LessonFirstFrame from '../modules/lesson_first_frame';
import { theoryEntryFor, triLang, type Lang } from '../constants/i18n';
import { FONT_SCALE, getCardShadow, useTheme } from '../components/ThemeContext';
import { useAccentGraphics } from '../hooks/use_accent_graphics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PracticeBackButton, PracticeHeaderTitle } from '../components/practice/PracticeChrome';
import { PracticeStatePanel } from '../components/practice/PracticeStates';
import { screenTextOnGradient, ThemeMode } from '../constants/theme';
import { isCorrectAnswer, normalizeLessonAssemblyAnswer } from '../constants/contractions';
import { checkAchievements } from './achievements';
import { bumpStatsDaily } from './stats_daily_breakdown';
import { trackActivity, trackFeatureBlocked, trackFeatureError, trackFeatureStart, trackFeatureSuccess } from './app_activity';
import { useEffectivePlatformOS } from './platform_ui_preview';
import AddToFlashcard from '../components/AddToFlashcard';
import TapScale from '../components/TapScale';
import LessonReviewSheet from '../components/LessonReviewSheet';
import SpeakingPanel, { buildSpeakingPanelTheme, type SpeakingVerdictReason } from '../components/SpeakingPanel';
import SpeakingInlineSlot from '../components/SpeakingInlineSlot';
import SpeechUnavailableNote from '../components/SpeechUnavailableNote';
import { speechUnavailableOnDeviceText, useSpeechUnavailableOnDevice } from './speech_device_availability';
import SpeakingInlineResultStars, { type SpeakingAttemptResult } from '../components/SpeakingInlineResultStars';
import SpeechFailBlock from '../components/speech/SpeechFailBlock';
import { getVerifiedPremiumAccessStatus, isTesterNoLimitsActive } from './premium_guard';
import { useVoiceAttemptGate } from '../hooks/use_voice_attempt_gate';
import MicAllowanceBadge from '../components/MicAllowanceBadge';
import { hapticTap } from '../hooks/use-haptics';
import { useScreen } from '../hooks/use-screen';
import { useAudio } from '../hooks/use-audio';
import { phraseAudioClipStartTimeoutMs } from '../modules/audio/phrase_audio_timing';
import { prefetchPhraseAudio } from '../hooks/phrase_audio_prefetch';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import fk from './feedback/feedback_kit';
import { comboLevelFor } from './feedback/combo_engine';
import ComboRing from '../components/feedback/ComboRing';
import { getDevShortLessonCells } from './dev_short_lesson';
import { captureObjectiveAttempt } from './mistake_practice_capture';
import { isMistakeStudyTargetValue } from '../modules/mistake-practice/contracts';
import { getStableId } from './stable_id';
import { resolvePhraseMistakeToken } from './mistake_token_resolver';
import { lessonMistakeFacet } from './lesson_mistake_facet';
import { beginLessonRunErrors, collectLessonRunMistakeId, rememberLessonRunErrors } from './lesson_run_errors_memory';
import type { PhraseMistakeInput } from './phrase_analytics';
import { logLessonComplete, logLessonStart, logLessonAbandoned, logLessonAnswer, logEnergyLimitHit } from './firebase';
import {
  createLessonAnalyticsAttempt,
  lessonAttemptElapsedMs,
  markLessonAttemptStarted,
  markLessonAttemptTerminal,
} from './lesson_analytics_attempt';
import { trackLessonStart, trackLessonAbandoned, trackAnswer, trackEnergyHit } from './user_stats';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { useFirstQuestionEnergyGate } from '../hooks/useFirstQuestionEnergyGate';
import { canChargeClassicLessonEntry } from './energy_contract';
import { beginEnergySpendTrace, endEnergySpendTrace, markEnergySpendStage } from './energy_spend_latency_trace';
import {
  buildCombinedLessonPlan,
  parseCombinedLessonTopicsParam,
} from './combined_lesson_pool';
import { getLessonData, getLessonEncouragementScreens, getLessonIntroScreens } from './lesson_data_all';
import { isInteractiveTheoryLesson } from './theory_topic_accents';
import type { LessonPhrase } from './lesson_data_types';
import { answerDisplayLineWithCanonicalPunctuation, phraseAnswerAlternatives, phraseAnswerDisplayLine, phraseCanonicalAnswer, phraseHasStudyTargetContent, phrasePrimarySurface, phraseWordRowsForStudyTarget, ttsLocaleForStudyTarget } from './phrase_target_utils';
import { navOnce } from './nav_once'; // зачем (аудит Optimistic UI Уроков, 13.10): двойной тап по «Теории» открывал два экрана теории
import { noteSwallowedAs, noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
import { lessonPhraseReportDataId } from './error_report';
import ReportErrorButton from '../components/ReportErrorButton';
import ExplainSheet from '../components/ExplainSheet';
import AiMistakeCard from '../components/AiMistakeCard';
import MistakeEli5Modal from '../components/MistakeEli5Modal';
import AiExplainConsentModal from '../components/AiExplainConsentModal';
import MedalToast from '../components/MedalToast';
import NoEnergyModal from '../components/NoEnergyModal';
import { isDevOverlaysOff } from './dev_overlays_off';
import { isDevLessonIntroSkip } from './dev_cards_state';
import { withLessonRuntimeAccessBoundary } from './lesson_runtime_access_boundary';
import { withComboPlusGate } from './combo_lesson_gate';
import { MOTION_DURATION } from '../constants/motion';
import { fiftyFiftyUsageKey, grammarHintSeenKey, lastOpenedLessonKey, lessonIntroShownKey, lessonProgressKey, lessonSessionKey } from './target_storage_keys';
import { recordHomeContinueLegacy } from './home_continue_mark';
import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate';
import { loadFrenchRemoteLessonRows } from './french_lesson_remote_runtime';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { emitAppEvent } from './events';
import { patchHomeScreenHydration } from './home_screen_hydration';
import { useMistakeExplain } from './use_mistake_explain';
import { isExplainEnabled } from './explain_phrase_flags';
import { resolveLessonAnswerFontSize } from '../lib/lesson_answer_layout';
import { makeLessonServerAttemptId, normalizeLessonServerAttemptId } from './lesson_attempt_identity';
import SessionAttemptsHud, { type SessionAttemptsEnergyModel } from '../components/session_attempts/SessionAttemptsHud';
import PracticeRuneCounter from '../components/PracticeRuneCounter';
import EnergyBar from '../components/EnergyBar';
import { lv2Alpha } from '../components/learning-v2/LearningV2Glass';
import { PracticeCta } from '../components/practice/PracticeStates';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight'; // зачем (PM-052, D75): полёт монет вместо рун
import CoinRewardFlight from '../components/rewards/CoinRewardFlight';
import { nestedBoxShadow, plateBoxShadow } from '../components/v2/ShadowSurface';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { captureAccountGeneration } from './account_generation';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { KIT_MOTION, SESSION_ATTEMPTS_MOTION } from '../constants/motionHybrid';

import { noAndroidOutline } from '../constants/androidGlow';
import { DebugLogger } from './debug-logger';
import { traceLessonExit } from './lesson_exit_trace';
import { useMomentsV3Enabled } from '../components/streak/moments/use_moments_v3_flag';
// зачем (m15, владелец 14.10, за флагом moments_v3): шторка «Выйти из урока?» грузится лениво и только когда флаг включён и человек нажал «назад»
const LessonExitSheet = lazy(() => import('../components/lesson_exit/LessonExitSheet'));
const GRAMMAR_HINTS = [
  {
    key: 'grammar_hint_articles',
    lessonTeaches: 20,
    detect: (en: string) => /\b(a|an|the)\b/i.test(en),
    textRu: 'Артикли a, an, the встречаются здесь раньше урока 20, где мы изучим их подробно. Пока просто используй как показано — без них предложение не построить.',
    textUk: 'Артиклі a, an, the зустрічаються тут раніше уроку 20, де ми вивчимо їх докладно. Поки просто використовуй як показано — без них речення не побудувати.',
    textEs:
      'Los artículos a, an y the aparecen aquí antes de la lección 20, donde los veremos en detalle. Por ahora úsalos como en el ejemplo; sin ellos la frase no encaja.',
    // зачем (владелец 12.10, реестр п.76: английский интерфейс в R1): en раньше читал textRu — английский интерфейс видел русский.
    textEn:
      'The articles a, an and the show up here before lesson 20, where we cover them in detail. For now, just use them as shown — the sentence doesn’t work without them.',
  },
  {
    key: 'grammar_hint_some_any',
    lessonTeaches: 21,
    detect: (en: string) => /\b(some|any)\b/i.test(en),
    textRu: 'Слова some и any встречаются здесь раньше урока 21, где мы разберём их подробно. Пока просто используй как показано.',
    textUk: 'Слова some і any зустрічаються тут раніше уроку 21, де ми розберемо їх докладно. Поки просто використовуй як показано.',
    textEs:
      'Some y any salen aquí antes de la lección 21, donde las explicamos a fondo. Por ahora empléalas tal como ves en la frase.',
    textEn:
      'The words some and any show up here before lesson 21, where we go through them in detail. For now, just use them as shown.',
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


const FULL_LESSON_TOTAL = 50;
// зачем (координатор 15.10): dev_state?shortLesson=N — урок из N заданий, чтобы Сверка честно дошла до итога (серия, монеты, звёзды —
// боевой код). Подменяется только число позиций; в стор-сборке dev_short_lesson — заглушка (null), урок всегда 50.
function lessonTotal(): number {
  return getDevShortLessonCells() ?? FULL_LESSON_TOTAL;
}
const SETTINGS_KEY = 'user_settings';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const LESSON_ENTER_MS = MOTION_DURATION.normal;
// зачем (координатор 10.10, «ощущаемый» стандарт kit.css `.t`): вдавливание 90 мс до 0.97, отпускание 240 мс cubic-bezier(.3,1.4,.5,1) —
// как у остальных кнопок приложения; раньше 70 мс до 0.975 и пружина.
const PRESS_IN_MS = KIT_MOTION.pressDownMs;
const PRESS_RELEASE_EASING = Easing.bezier(...KIT_MOTION.pressEase);
const ERROR_REPLAY_DELAY_ANSWERS = 2;
const COMBO_ACHIEVEMENT_THRESHOLDS = new Set([3, 10, 20, 50, 100, 150, 250, 500]);
const WORD_DISPATCH_LOCK_MS = 90;
// зачем (владелец, 2026-09-17): аварийный потолок ожидания озвучки результата
// перед переходом на lesson_complete — на случай, если settle() из эффекта
// эха (onDone/onStopped/onError) почему-то не придёт вовсе. Выведен из ТОГО ЖЕ
// timing-контракта, что и старт клипа (phraseAudioClipStartTimeoutMs — download
// timeout + player watchdog + audio session settle grace), плюс запас на саму
// длительность речи и небольшую паузу — чтобы потолок не мог оказаться короче
// худшего случая холодного старта клипа, как было с прежним фиксированным 1500мс.
const LESSON_COMPLETION_SPEECH_FALLBACK_MS = phraseAudioClipStartTimeoutMs(Platform.OS) + 6_000;

function isValidLessonPhraseOrder(order: unknown, phraseCount: number): order is number[] {
  const count = Math.min(phraseCount, lessonTotal());
  if (!Array.isArray(order) || order.length !== count) return false;
  if (new Set(order).size !== order.length) return false;
  return order.every((idx) => Number.isInteger(idx) && idx >= 0 && idx < phraseCount);
}

function hasUsableLessonPhraseOrder(order: unknown, phraseCount: number): order is number[] {
  if (!isValidLessonPhraseOrder(order, phraseCount)) return false;
  return phraseCount <= 1 || new Set(order).size > 1;
}

function shuffleLessonPhraseOrder(phraseCount: number): number[] {
  const count = Math.min(phraseCount, lessonTotal());
  const order = Array.from({ length: phraseCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, count);
}

/**
 * зачем (Сверка learn-028/029, макет learn.html lhead: «⚡ N» в шапке урока): пилюля энергии показывается всегда, кроме безлимита
 * (у Plus в макете её нет). Только показ баланса: списание 20 ⚡ при входе и замки урока не затронуты.
 */
function LessonEnergyPill() {
  const { isUnlimited } = useEnergy();
  if (isUnlimited) return null;
  return <EnergyBar glass size={30} />;
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
  pressScale = KIT_MOTION.pressScale,
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
      android_ripple={disabled || suppressFeedback ? undefined : { color: 'rgba(255,255,255,0.08)' }} // theme-exempt: DEV-подсказка и нативная рябь касания — вне темы
      onPressIn={(event) => {
        if (!disabled && !suppressFeedback) animateTo(pressScale);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!disabled && !suppressFeedback) {
          Animated.timing(scale, {
            toValue: 1,
            duration: KIT_MOTION.pressMs,
            easing: PRESS_RELEASE_EASING,
            useNativeDriver: true,
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
    .catch(noteSwallowedHandler('lesson1:syncLessonIntroShownFlagNow.call'));
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
  /**
   * Тема ТЕКУЩЕЙ фразы. В обычном уроке равна lessonId; в комбинированном
   * (владелец 2026-09-17) фразы приходят из разных тем, и «Теория» обязана
   * открывать тему показанной фразы, а не тему из маршрута.
   */
  topicLessonId: number;
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
  attemptsRemaining: 0 | 1 | 2 | 3;
  /** Режим энергии Б (Ядро 11.10): объект `useSessionAttempts` целиком — шапка сама решает, рисовать сердечки или энергию. */
  attemptsEnergy?: SessionAttemptsEnergyModel;
  /** Руны, накопленные в этой сессии урока (владелец, 2026-08-27). */
  practiceRunesEarned: number;
  /** Источник/цель полёта руны (владелец, 2026-08-28): та же механика, что на
      остальных шести экранах — раньше на самом Уроке её не было вообще. */
  runeFlightOriginRef: React.RefObject<View | null>;
  runeFlightCounterRef: React.RefObject<View | null>;
  progress: string[];
  totalCells: number;
  comboCount: number;
  showTapHint: boolean;
  setShowTapHint: (val: boolean) => void;
  phraseWordIdx: number;
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
  lessonTheorySupportBlocked: boolean;
  lessonHintSupportBlocked: boolean;
}

const LessonContent = React.memo(function LessonContent({
  introGateReady,
  lessonId,
  topicLessonId,
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
  attemptsRemaining,
  attemptsEnergy,
  practiceRunesEarned,
  runeFlightOriginRef,
  runeFlightCounterRef,
  progress,
  totalCells,
  comboCount,
  showTapHint,
  setShowTapHint,
  phraseWordIdx,
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
  realPhraseIdx,
  studyTarget,
  onReplayPhraseAudio,
  reviewPhrases,
  onPlayReviewAudio,
  toastAnim,
  from,
  onHeaderBack,
  lessonTheorySupportBlocked,
  lessonHintSupportBlocked,
}: LessonContentProps) {
  // зачем (владелец 15.10, m08 «Молния» за moments_v3: «ДА ДЕЛАЙ, НА КОЛЬЦЕ»): кольцо серии греется 3 → 5 → 10, плашка «N подряд», «серия сброшена»; модуль — require только при флаге
  const comboMomentsOn = useMomentsV3Enabled();
  const ComboHeatSlot = comboMomentsOn ? (require('../components/feedback/ComboHeatSlot') as typeof import('../components/feedback/ComboHeatSlot')).default : null;
  const accentGfx = useAccentGraphics(); // зачем (светлый акцент, аудит 13.10 §1): графика на сыром accent невидима в светлых градиентных темах — глубокий токен accentBorder (в тёмном ≈ accent, вид не меняется)
  const effectiveOs = useEffectivePlatformOS();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { bottomInset } = useScreen();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  // зачем (владелец 2026-09-30): экран урока — 1:1 по learn.html (Liquid Glass); поверхности,
  // кнопки, плитки и шапка берут токены стекла, зелёный/красный отклик остаётся у t.correct/t.wrong.
  const { liquidGlassThemeId, fontSize: appFontSize, uiScale } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const progressCellTheme = useMemo(() => ({ ...t, bgSurface2: glass.line }), [t, glass.line]);
  // зачем (Сверка learn-028/029, макет learn.html .pill.hearts): попытки — нейтральная пилюля стекла (светлые сердца, потерянные гаснут до 22 %), как в занятии Learning V2
  const heartsPill = useMemo(() => ({ fill: glass.text, empty: lv2Alpha(glass.text, 0.22), plate: glass.opaqueControl }), [glass.text, glass.opaqueControl]);
  const toolChip = {
    flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, minHeight: 56,
    marginHorizontal: 3, paddingVertical: 8, borderRadius: 18, backgroundColor: glass.opaqueControl,
  };
  // зачем (Макеты 079659ed8, energy-modes-001/002/003/004/016; D139/D145: обычный текст по умолчанию — 13; координатор 13.10: выбор «размера текста» человека должен работать): подписи плиток нижней панели урока
  // и счётчик «1/50» брали `f.label` = 12 × FONT_SCALE[размер] × uiScale окна: по умолчанию (стандарт 1.15) это 14 на эталонном окне, у «большого» — 15–16. Теперь база 13 — ровно на ДЕФОЛТЕ,
  // а выбор человека сохраняется как отношение к дефолту: 13 × (FONT_SCALE[размер] / FONT_SCALE.medium) × uiScale (мелкий ≈11, большой ≈15). Системный масштаб шрифта ОС остаётся (без ужатия).
  const TOOL_LABEL_FONT = Math.round(13 * (FONT_SCALE[appFontSize] / FONT_SCALE.medium) * uiScale);
  const toolLabelLoggedRef = useRef('');
  useEffect(() => {
    const trace = JSON.stringify({ fontSize: appFontSize, fontScale: FONT_SCALE[appFontSize], defaultScale: FONT_SCALE.medium, uiScale: Number(uiScale.toFixed(3)), fLabel: f.label, toolLabel: TOOL_LABEL_FONT, window: `${Math.round(screenW)}x${Math.round(screenH)}` });
    if (toolLabelLoggedRef.current === trace) return;
    toolLabelLoggedRef.current = trace;
    console.log('[FONT-SCALE] lesson1 panel', trace); // guard-ok: значения масштаба текста панели урока при смене (energy-modes-001: «17 против 13»)
  }, [TOOL_LABEL_FONT, appFontSize, f.label, screenH, screenW, uiScale]);
  const progressCellCount = Math.max(1, totalCells);
  const linkedSliceCompact = false;
  const lessonHorizontalPadding = linkedSliceCompact ? 14 : 20;
  const linkedSlicePromptFont = Math.max(f.h2, f.h2 + (linkedSliceCompact ? 0 : 6));
  const linkedSliceAnswerFont = Math.max(f.bodyLg, f.h1 - (linkedSliceCompact ? 4 : 0));

  // [SPEAKING] Premium "say it out loud" mode. Free users hit the paywall;
  // premium users get the SpeakingPanel (mic + waveform + 90% scoring).
  // зачем (владелец, 2026-09-13): дневной лимит голосовых попыток обычного
  // аккаунта вместо глухого «только в Plus»; замок горит только при исчерпании.
  // зачем (владелец 15.10, D196): общий дневной счётчик голоса 3/день на все микрофоны — гейт и цифра остатка вместо замка; прежняя серверная квота «speaking» убрана
  const speakingGate = useVoiceAttemptGate({ surface: 'lessons', source: 'lesson_speaking' });
  const speakingFeatureEnabled = true;
  const phraseEnterKey = phrase ? `${String(phrase.id ?? '')}:${String(phrase.english ?? phrase.spanish ?? '')}` : '';
  const speakingPhraseKey = `${displayCell}:${realPhraseIdx}:${phraseEnterKey}`;
  const [speakingOpen, setSpeakingOpen] = useState(false);
  const [speakingHoldActive, setSpeakingHoldActive] = useState(false);
  // зачем (координатор 15.10, «не засчитано»): панель в onScore отдаёт ещё и пропущенные слова строгой проверки (`missingWords`) — по ним блок по эталону Макетов
  const [speakingResult, setSpeakingResult] = useState<(SpeakingAttemptResult & { transcript?: string; missingWords?: readonly string[]; reason?: SpeakingVerdictReason }) | null>(null);
  const speakingOpenedForPhraseRef = useRef<string | null>(null);
  // зачем (§SPEECH-NA, владелец 04.10): на устройстве без распознавателя «Устно»
  // заранее отключено (перечёркнутый микрофон); тап не тратит попытку и не ведёт
  // на пейвол, а показывает в слоте панели короткое «не работает на этом устройстве».
  // Урок идёт дальше обычным ответом — голос здесь необязательный шаг.
  const speechNa = useSpeechUnavailableOnDevice();
  const [speechNaNoteKey, setSpeechNaNoteKey] = useState<string | null>(null);

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
    if (speechNa) {
      console.warn('[SPEECH-AVAIL] lesson1: «Устно» tap on device without recognizer — show note, no attempt', JSON.stringify({ phrase: speakingPhraseKey }));
      setSpeechNaNoteKey(speakingPhraseKey);
      return;
    }
    if (!speakingGate.canStartAttempt()) return; // R43 (Ревизор 15.10): тут удержание — автостарт после ожидания доступа НЕ передаём (палец уже отпущен, запись повисла бы), остаётся подсказка «Проверяем подписку…»; зачем (координатор 15.10, правило владельца D194 «попытка = НАЧАТАЯ запись»): тап только проверяет лимит (при нуле — пейвол), а попытка списывается, когда запись реально пошла (статус «listening»): отказ микрофона и отмена до старта не списывают; списание — в onSpeakingPanelStatus
    // Замораживаем авто-переход у родителя: панель произносит эталон в фоне и даёт
    // «Моя запись» / «Сказать ещё раз», и 4-сек таймер не должен увести урок
    // вперёд, пока панель открыта. Переход дальше — только по явному действию юзера.
    onSpeakingActiveChange?.(true);
    speakingOpenedForPhraseRef.current = speakingPhraseKey;
    setSpeakingResult(null);
    setSpeakingOpen(true);
    setSpeakingHoldActive(true);
  }, [speakingGate, onSpeakingActiveChange, speakingPhraseKey, speechNa]);

  const endSpeakingHold = useCallback(() => setSpeakingHoldActive(false), []);
  const commitSpeakingAttempt = speakingGate.commitStartedAttempt;
  const speakingStatusRef = useRef('idle');
  // зачем (координатор 15.10, правило владельца D194 «попытка = НАЧАТАЯ запись»): тап только проверяет лимит (при нуле — пейвол), а попытка списывается, когда запись реально пошла (статус «listening»): отказ микрофона и отмена до старта не списывают; один переход в listening = одна попытка
  const onSpeakingPanelStatus = useCallback((status: string) => {
    const previous = speakingStatusRef.current;
    speakingStatusRef.current = status;
    if (status === 'listening' && previous !== 'listening') commitSpeakingAttempt();
  }, [commitSpeakingAttempt]);

  const closeSpeaking = useCallback(() => {
    speakingOpenedForPhraseRef.current = null;
    setSpeakingHoldActive(false);
    setSpeakingOpen(false);
    // Не перезапускаем авто-переход автоматически — юзер сам жмёт «Далее», когда
    // готов (кнопка lesson1-next доступна в состоянии result).
    onSpeakingActiveChange?.(false);
  }, [onSpeakingActiveChange]);

  const handleSpeakingScore = useCallback((result: SpeakingAttemptResult & { transcript?: string; missingWords?: readonly string[]; reason?: SpeakingVerdictReason }) => {
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
        displayText,
      };
    });
  }, [shuffled, phraseEnterKey, phraseWordIdx, contrExpanded, currentCorrectWord, currentValidContraction, s.lesson.noArticle]);
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
        const seen = await AsyncStorage.getItem(seenKey).catch(noteSwallowedAs('lesson1:useCallback.getItem', null));
        if (generation !== grammarHintGenerationRef.current) return;
        if (seen) grammarHintSeenCacheRef.current.add(seenKey);
        if (seen) continue;
        grammarHintSeenCacheRef.current.add(seenKey);
        void AsyncStorage.setItem(seenKey, '1').catch(noteSwallowedHandler('lesson1:useCallback.setItem'));
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
  // Слова ученика против эталона — той же цепочкой, что isCorrectAnswer/phraseCanonicalAnswer.
  const wrongResultTokens = (() => {
    if (!phrase || status !== 'result' || !wasWrong) return [] as { word: string; isWrong: boolean }[];
    const userAnswer = settings.hardMode ? typedText : selectedWords.join(' ');
    const userWords = normalizeLessonAssemblyAnswer(userAnswer).split(/\s+/).filter(w => w.length > 0);
    const correctWords = normalizeLessonAssemblyAnswer(phraseCanonicalAnswer(phrase, studyTarget))
      .split(/\s+/)
      .filter(w => w.length > 0);
    return userWords.map((word, i) => ({ word, isWrong: word !== correctWords[i] }));
  })();
  // зачем (эталон Макетов 15.10): красная маска `t____` снята — после речи фраза показывается целиком (анти-чит отменён решением эталона)
  const speakingPrimaryLine = speakingResult ? spokenTargetLine : '';
  // зачем (координатор 15.10, «не засчитано» по эталону Макетов 91eee157a, строгая проверка речи): при провале с названным словом вместо звёзд — фраза целиком, пропущенные слова мягким красным и строка
  // «Не услышали слово «X» — скажи фразу целиком»; пропущенные слова — из результата панели (`missingWords`). Пусто (слово не названо) — прежний вид.
  const speakingFailWords: readonly string[] = speakingResult && !speakingResult.passed && status !== 'result' && spokenTargetLine
    && speakingResult.reason === 'missing_words'
    ? (speakingResult.missingWords ?? [])
    : [];
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
        {/* зачем: шапка макета D — круглая «‹» 34 (область нажатия 44) + «Урок N» 20/700; подзаголовка-уровня в данных урока нет. */}
        <PracticeBackButton
          glass={glass}
          color={glass.text}
          onPress={onHeaderBack}
          testID="lesson1-header-back"
          accessibilityLabel={triLang(lang, {
            uk: 'Назад', ru: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
          })}
        />
        <PracticeHeaderTitle
          glass={glass}
          oneLine
          title={`${triLang(lang, {
            uk: 'Урок',
            ru: 'Урок',
            en: 'Lesson',
            es: 'Lección',
            'pt-BR': 'Lição',
            vi: 'Bài',
            id: 'Pelajaran',
            tr: 'Ders',
            pl: 'Lekcja',
          })} ${lessonId}`}
        />
        {/* Right side: attempts + combo badge + stats. Energy is paid once on entry. */}
        <View
          style={{
            flexShrink: 1,
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
          {/* зачем (режим энергии Б, ревью Ядра п.3): в режиме Б энергию показывает сама шапка попыток (EnergyMistakeHud) — вторая пилюля была бы дублем. */}
          {attemptsEnergy?.mistakeChargeActive ? null : <LessonEnergyPill />}

          <SessionAttemptsHud
            remaining={attemptsRemaining}
            attempts={attemptsEnergy}
            locale={lang}
            testID="lesson1-session-attempts"
            glassPill={heartsPill}
          />

          <View ref={runeFlightCounterRef} collapsable={false}>
            <PracticeRuneCounter
              runes={practiceRunesEarned}
              lang={lang}
              backgroundColor={t.bgCard}
              color={t.textPrimary}
              testID="lesson1-practice-runes"
            />
          </View>

          {ComboHeatSlot ? <ComboHeatSlot comboCount={comboCount} lang={lang} size={34} /> : comboCount >= 3 && (
            <ComboRing value={comboCount} level={comboLevelFor(comboCount)} size={34} />
          )}
          {/* Stats row — legacy reward toast floats absolutely; row wrap + shrink so ●wrong не режется у края */}
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
          />
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
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!linkedSliceCompact}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[questionEnterStyle, { width: '100%' }]}>
        <Text
          testID="lesson1-task-instruction"
          style={{ color: glass.secondary, fontSize: f.caption, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}
        >
          {triLang(lang, {
            ru: settings.hardMode ? 'Напечатай фразу:' : 'Собери фразу:',
            uk: settings.hardMode ? 'Надрукуй фразу:' : 'Склади фразу:',
            en: settings.hardMode ? 'Type the phrase:' : 'Build the phrase:',
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
              color: glass.text,
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

          <View
            ref={runeFlightOriginRef}
            collapsable={false}
            testID="lesson1-answer-divider"
            style={{ minHeight: linkedSliceCompact ? 46 : 60, alignSelf: 'stretch', alignItems: 'center', borderBottomWidth: 1 /* shadow-ok: линия-подчёркивание зоны ответа, не контейнер */, borderBottomColor: emptyTapFlash ? glass.warn : glass.line, marginBottom: speakingResult ? 4 : (linkedSliceCompact ? 8 : (compact ? 12 : 20)), justifyContent: 'center', backgroundColor: emptyTapFlash ? `${glass.warn.slice(0, 7)}14` : 'transparent', borderRadius: emptyTapFlash ? 8 : 0 } as any}>
            {speakingFailWords.length > 0 ? (
              <View testID="lesson1-primary-answer-row" style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <SpeechFailBlock
                  targetText={spokenTargetLine}
                  missingWords={speakingFailWords}
                  lang={lang}
                  glass={glass}
                  kicker={triLang(lang, {
                    ru: 'Сказано', uk: 'Сказано', en: 'Spoken', es: 'Dicho', 'pt-BR': 'Falado',
                    vi: 'Đã nói', id: 'Diucapkan', tr: 'Söylenen', pl: 'Powiedziano',
                  })}
                  testID="lesson1-speech-fail"
                />
              </View>
            ) : (status === 'result' || speakingResult) ? (
              <View testID="lesson1-primary-answer-row" style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }}>
                  {/* зачем: ученики писали «нажал waist — появилось waste», «нажал know — вышло
                      remember», «пишу them — ставит they». Приложение ничего не подменяло, но при
                      неверном ответе на МЕСТЕ собранной фразы зелёным появлялся эталон, а свой
                      ответ уезжал в красную плашку без подписи. Теперь при ошибке здесь остаются
                      слова ученика (неверные — красным), а эталон — зелёным в плашке ниже. */}
                  {status === 'result' && wasWrong && wrongResultTokens.length > 0 ? (
                    <Text
                      testID="lesson1-user-answer-on-wrong"
                      style={{ fontSize: resultAnswerFont, textAlign: 'center', flexShrink: 1 }}
                    >
                      {wrongResultTokens.map((token, i) => (
                        <Text
                          key={i}
                          style={{
                            color: token.isWrong ? t.wrong : t.textPrimary,
                            fontWeight: token.isWrong ? '700' : '500',
                            textDecorationLine: token.isWrong ? 'line-through' : 'none',
                          }}
                        >
                          {i > 0 ? ' ' : ''}{token.word}
                        </Text>
                      ))}
                    </Text>
                  ) : (
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
                  )}
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
                cursorColor={accentGfx.border}
                selectionColor={`${accentGfx.border}55`}
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
                <Animated.Text style={{ color: t.accentText, opacity: selectedWords.length > 0 ? 1 : cursorAnim }}>
                  {selectedWords.length > 0 ? (phraseWordIdx < phraseTokens.length ? '…' : '') : '|'}
                </Animated.Text>
              </Text>
            )}
          </View>

          {speakingResult && speakingFailWords.length === 0 && (
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
                <View style={{ backgroundColor: t.wrongBg, padding: linkedSliceCompact ? 12 : 16, borderRadius: 18, marginBottom: linkedSliceCompact ? 6 : 10, boxShadow: nestedBoxShadow(glass) }}>
                  <Text
                    testID="lesson1-correct-answer-on-wrong"
                    // зачем (Сверка 21:05, светлая тема): зелёный t.correct на розовой плашке ошибки почти не читается — в светлой берём цвет текста темы
                    style={{ color: glass.isLight ? glass.text : t.correct, fontWeight: '600', fontSize: interactiveAnswerFont, textAlign: 'center' }}
                  >
                    {resultCorrectLine}
                  </Text>
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
                    fallback={mistakeExplain.aiMistakeFallback}
                    onRefresh={mistakeExplain.refreshMistakeExplain}
                    onExplain={explainCurrentMistake}
                    onOpenSimple={openEli5Modal}
                    targetAnswer={aiMistakeTargetLine}
                    userAnswer={aiMistakeAnswerLine}
                  />
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
              {speechNa && speechNaNoteKey === speakingPhraseKey && (
                <SpeechUnavailableNote lang={lang} color={glass.secondary} background={glass.opaqueControl} testID="lesson1-speech-unavailable" />
              )}
              {speakingVisible && (
                <SpeakingPanel
                  targetText={cleanPhraseForDisplay(gradeTarget)}
                  // зачем (R49, 15.10): без локали панель слушала en-US и на es/fr/de/it-уроках
                  recognitionLocale={studySpeechLocale(studyTarget, 'lesson1')}
                  lang={lang}
                  theme={buildSpeakingPanelTheme(t)}
                  presentation="inline"
                  holdActive={speakingHoldActive}
                  onStatusChange={onSpeakingPanelStatus}
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
            backgroundColor: glass.card,
            borderRadius: 18,
            padding: 14,
            boxShadow: plateBoxShadow(glass), // зачем («Тень» 12.10): подсказка — плашка без кромки
          }}>
            <Text style={{ color: glass.secondary, fontSize: f.small, lineHeight: Math.round(f.small * 1.45) }}>{grammarHintText}</Text>
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
              {wordOptionItems.map(({ optionKey, word, index: i, isCorrectOption, displayText }) => {
                return (
                  <Animated.View
                    key={optionKey}
                    style={{
                    width: '48%',
                    marginBottom: linkedSliceCompact ? 5 : (compact ? 7 : 10),
                    // зачем: владелец убрал подсказку-пульсацию правильного слова на первых
                    // фразах урока 1 — осталось только приглушение от «50 на 50».
                    opacity: (fiftyFiftyActive && fiftyFiftyDimmed.has(i)) ? 0.22 : 1
                  }}>
                    {(() => {
                      // Плитка вспыхивает АКЦЕНТНЫМ цветом темы при нажатии (единый
                      // фирменный цвет на любой тап). Объём — через DuoPressable (3D-кромка).
                      const isFlashing = flashWord?.optionKey === optionKey;
                      return (
                    <DuoPressable
                      // зачем (координатор 12.10, съёмка R1 energy-modes-002…005/016): робот не знает, какой номер неверный —
                      // в dev первый неверный вариант помечен `lesson1-word-option-wrong` (ошибка по шагу). В стор-сборке __DEV__ = false.
                      testID={isCorrectOption ? 'lesson1-word-option-correct' : (__DEV__ && wordOptionItems.find((o) => !o.isCorrectOption)?.index === i ? 'lesson1-word-option-wrong' : `lesson1-word-option-${i}`)}
                      pressedExternally={isFlashing}
                      withHaptic={false}
                      disabled={wordDispatchPending}
                      style={{
                        width: '100%',
                        backgroundColor: isFlashing ? glass.cta : glass.plateFillFrom,
                        paddingVertical: linkedSliceCompact ? 7 : (compact ? 10 : 15),
                        minHeight: 52,
                        borderRadius: 18,
                        boxShadow: plateBoxShadow(glass), // зачем («Тень» 12.10): кнопка-слово — плашка без кромки
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
                      <FlowText testID="lesson-word-tile" provenance="authored" style={{ color: isFlashing ? glass.ctaInk : glass.text, fontSize: f.numMd, fontWeight: isFlashing ? '700' : '500' }}>{displayText}</FlowText>
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
                      fontSize: 13,
                      lineHeight: 17,
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
                    backgroundColor: i === displayCell ? glass.text : getProgressCellColor(progress[i], passCount, progressCellTheme, false),
                  }} />
                ))}
              </View>
            </View>
            <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, minWidth: 34, textAlign: 'right' }}>{displayCell + 1}/{progressCellCount}</Text>
          </View>
        </View>

        {/* ФУТЕР */}
        <View style={{ paddingTop: linkedSliceCompact ? 8 : 14, paddingBottom: (linkedSliceCompact ? 8 : 14) + bottomInset, paddingHorizontal: 11 }}>
        <View style={{ flexDirection: 'row' }}>
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
                  style={{ ...toolChip, opacity: canUse50 ? 1 : 0.35 }}
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
                    // зачем (владелец 2026-08-30): звук подсказки удалён НАВСЕГДА —
                    // в раунде 5 отверг все варианты («ни один — не надо их вообще»).
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
                    <Ionicons name="cut-outline" size={26} color={canUse50 ? glass.text : glass.mutedText} />
                    <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: canUse50 ? glass.cta : glass.mutedText, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: glass.accentInk, fontSize: 13, fontWeight: '700', lineHeight: 17 }}>{explainHintsLeft}</Text>
                    </View>
                  </View>
                  <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }}>50/50</Text>
                </LessonPressable>
              );
            })()
          )}


          {/* Theory Button */}
          {/* зачем (координатор 12.10): своей теории для языка интерфейса нет (английский) — кнопку не показываем; pt-BR/vi/id/tr/pl — в lesson_help на их языке. */}
          {(lessonTheorySupportBlocked || theoryEntryFor(lang, isInteractiveTheoryLesson(topicLessonId), 'lesson1') !== 'hidden') && (
          <LessonPressable testID="lesson1-theory" style={toolChip} onPress={() => { fk.tap(); if (!navOnce(`lesson1:theory:${topicLessonId}`)) return; /* зачем (владелец 2026-09-17): в комбинированном уроке тему задаёт ТЕКУЩАЯ фраза, а не маршрут — иначе открылась бы чужая теория. */ if (lessonTheorySupportBlocked) { router.push({ pathname: '/lesson_help', params: { id: topicLessonId } }); return; } const entry = theoryEntryFor(lang, isInteractiveTheoryLesson(topicLessonId), 'lesson1'); if (entry === 'hidden') return; router.push(entry === 'hint' ? { pathname: '/hint', params: { id: topicLessonId } } : { pathname: '/lesson_help', params: { id: topicLessonId } }); }}>
            <Ionicons name={lessonTheorySupportBlocked ? 'shield-checkmark-outline' : 'book-outline'} size={26} color={glass.text} />
            <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }}>
              {lessonTheorySupportBlocked ? triLang(lang, {
                ru: 'Теория',
                uk: 'Теорія',
                en: 'Theory',
                es: 'Teoría',
                'pt-BR': 'Teoria',
                vi: 'Lý thuyết',
                id: 'Teori',
                tr: 'Teori',
                pl: 'Teoria',
              }) : s.lesson.theory}
            </Text>
          </LessonPressable>
          )}

          {/* [SPEAKING] "Устно" — premium: произнести фразу вслух (микрофон + эквалайзер) */}
          {speakingFeatureEnabled && status === 'playing' && !!gradeTarget && (
            <LessonPressable
              testID="lesson1-speaking"
              accessibilityRole="button"
              accessibilityLabel={speechNa ? speechUnavailableOnDeviceText(lang) : triLang(lang, {
                ru: 'Сказать фразу вслух',
                uk: 'Сказати вислів вголос',
                en: 'Say the phrase out loud',
                es: 'Decir la frase en voz alta',
                'pt-BR': 'Dizer a frase em voz alta',
                vi: 'Nói câu này thành tiếng',
                id: 'Ucapkan frasa dengan lantang',
                tr: 'Cümleyi sesli söyle',
                pl: 'Powiedz frazę na głos',
              })}
              accessibilityState={{ disabled: speechNa }}
              style={[toolChip, speechNa ? { opacity: 0.45 } : null]}
              onPressIn={startSpeakingHold}
              onPressOut={endSpeakingHold}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name={speechNa ? 'mic-off-outline' : 'mic-outline'} size={26} color={glass.text} />
                {!speechNa ? <MicAllowanceBadge size="sm" testID="lesson-speaking-allowance" /> : null}
              </View>
              <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }}>
                {triLang(lang, {
                  ru: 'Устно',
                  uk: 'Усно',
                  en: 'Speak',
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
                uk: 'Переглянути пройдені вислови',
                en: 'View completed phrases',
                es: 'Ver frases ya completadas',
                'pt-BR': 'Ver frases já concluídas',
                vi: 'Xem các câu đã hoàn thành',
                id: 'Lihat frasa yang sudah selesai',
                tr: 'Tamamlanan cümleleri gör',
                pl: 'Zobacz ukończone frazy',
              })}
              style={toolChip}
              onPress={openReview}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name="arrow-undo-outline" size={26} color={glass.text} />
                <View style={{ position: 'absolute', top: -3, right: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: t.correct }} />
              </View>
              <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: 'Назад',
                  uk: 'Назад',
                  en: 'Back',
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
                uk: 'Пояснити вислів простими словами',
                en: 'Explain the phrase simply',
                es: 'Explicar la frase con palabras simples',
                'pt-BR': 'Explicar a frase em palavras simples',
                vi: 'Giải thích câu bằng lời đơn giản',
                id: 'Jelaskan frasa dengan kata sederhana',
                tr: 'Cümleyi basit kelimelerle açıkla',
                pl: 'Wyjaśnij frazę prościej',
              })}
              style={toolChip}
              onPress={() => {
                fk.tap();
                setExplainOpen(true);
              }}
            >
              <Ionicons name="bulb-outline" size={26} color={glass.text} />
              <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }} numberOfLines={1}>
                {triLang(lang, {
                  ru: 'Объяснить',
                  uk: 'Пояснити',
                  en: 'Explain',
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
                uk: 'Повторити озвучку вислову',
                en: 'Replay the phrase audio',
                es: 'Repetir audio de la frase',
                'pt-BR': 'Repetir audio da frase',
                vi: 'Phát lại âm thanh của câu',
                id: 'Putar ulang audio frasa',
                tr: 'Cümlenin sesini tekrar çal',
                pl: 'Powtórz nagranie frazy',
              })}
              style={toolChip}
              onPress={() => {
                fk.tap();
                onReplayPhraseAudio();
              }}
            >
              <Ionicons name="volume-high" size={26} color={glass.text} />
              <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }}>
                {triLang(lang, {
                  ru: 'Повтор',
                  uk: 'Повтор',
                  en: 'Replay',
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

          {/* зачем (Сверка learn-031, макет learn.html D4): в результате вместо пятой иконки — большая кнопка «Дальше →» под рядом инструментов (ниже) */}
          {status !== 'result' && (
          <LessonPressable
            testID="lesson1-undo"
            style={{ ...toolChip, opacity: (status === 'playing' && (settings.hardMode ? typedText.trim().length === 0 : selectedWords.length === 0)) ? 0.3 : 1 }}
            onPress={() => {
              fk.tap();
              if (settings.hardMode) {
                const words = typedText.trim().split(/\s+/);
                words.pop();
                setTypedText(words.join(' '));
                return;
              }
              if (selectedWords.length > 0) { undoLastWord(); return; }
            }}
          >
            <Ionicons name="arrow-undo" size={26} color={glass.text} />
            <Text style={{ color: glass.secondary, fontSize: TOOL_LABEL_FONT, marginTop: 4 }}>{s.lesson.undo}</Text>
          </LessonPressable>
          )}

          {/* Check Button - видна только когда все слова введены и autoCheck выключен */}
          {canManuallyCheckAnswer && (
            <LessonPressable
              testID="lesson1-check"
              style={toolChip}
              onPress={() => {
                if (!canManuallyCheckAnswer) return;
                fk.tap();
                checkAnswer(selectedAnswer);
              }}
            >
              <Ionicons name="checkmark-circle" size={26} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: TOOL_LABEL_FONT, marginTop: 4 }}>{s.lesson.check}</Text>
            </LessonPressable>
          )}
        </View>
        {status === 'result' && (
          <PracticeCta
            glass={glass}
            testID="lesson1-next"
            trailingArrow
            label={triLang(lang, { ru: 'Дальше', uk: 'Далі', en: 'Next', es: 'Siguiente', 'pt-BR': 'Próximo', vi: 'Tiếp theo', id: 'Lanjut', tr: 'İleri', pl: 'Dalej' })}
            onPress={() => { fk.tap(); goNext(); }}
            style={{ marginTop: 12 }}
          />
        )}
        </View>

        {/* зачем (координатор 12.10): плашка не должна попадать в кадры робота — при dev overlays=off её нет */}
        {__DEV__ && !isDevOverlaysOff() && (
          <TapScale
            style={{ position: 'absolute', bottom: 90, right: 12, backgroundColor: 'rgba(40,40,40,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, zIndex: 999 }} // theme-exempt: DEV-подсказка и нативная рябь касания — вне темы
            onPress={() => {
              void triggerGrammarHint('the', true);
            }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>DEV: grammar hint</Text>{/* i18n-ok: dev-кнопка только __DEV__ */}{/* theme-exempt: DEV-подсказка и нативная рябь касания — вне темы */}
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
        {/* зачем: шторка вынесена в LessonReviewSheet (Liquid Glass, learn.html D9); логика и обработчики прежние. */}
        <LessonReviewSheet
          visible={reviewOpen}
          lang={lang}
          index={reviewIndex}
          count={reviewCount}
          current={reviewCurrent}
          onClose={closeReview}
          onPrev={reviewGoPrev}
          onNext={reviewGoNext}
          onPlay={onPlayReviewAudio}
        />

        <MistakeEli5Modal
          visible={eli5ModalOpen}
          onClose={mistakeExplain.eli5.onClose}
          lang={lang}
          state={eli5State}
          text={eli5Text}
          onRetry={mistakeExplain.eli5.onRetry}
          fallback={mistakeExplain.eli5.fallback}
          onRefresh={mistakeExplain.eli5.onRefresh}
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
  const { theme: t , f, themeMode, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
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
    devRunesSeed: devRunesSeedParam,
    combo: comboParam,
  } = useLocalSearchParams<{
    id?: string | string[];
    from?: string | string[];
    replayIntro?: string | string[];
    replayIntroAt?: string | string[];
    serverAttemptId?: string | string[];
    devRunesSeed?: string | string[];
    /** Комбинированный урок: id тем через запятую, напр. "3,10,20". */
    combo?: string | string[];
  }>();
  // зачем (владелец 2026-09-17): «комбинированный урок» — фразы нескольких тем
  // вперемешку. Экран остаётся ТЕМ ЖЕ (копия на 4000 строк разошлась бы с
  // оригиналом за месяц), меняется только источник фраз и ключи хранилища.
  const comboTopicIds = useMemo(
    () => parseCombinedLessonTopicsParam(comboParam),
    [comboParam],
  );
  const comboActive = comboTopicIds.length > 0;
  // зачем (владелец, 2026-08-27): «Проверка рун» из DEV-хаба — настоящий Урок
  // 1, но счётчик рун и legacy reward стартуют со случайного числа вместо реального
  // прогресса. Диск и сеть не трогаются в этом режиме.
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(devRunesSeedParam),
    [devRunesSeedParam],
  );
  const id = (Array.isArray(idParam) ? idParam[0] : idParam) || '1';
  const from = Array.isArray(fromParam) ? fromParam[0] : fromParam;
  const routeServerAttemptId = normalizeLessonServerAttemptId(serverAttemptIdParam);
  const replayIntro = (Array.isArray(replayIntroParam) ? replayIntroParam[0] : replayIntroParam) === '1';
  const replayIntroAt = Array.isArray(replayIntroAtParam) ? replayIntroAtParam[0] : replayIntroAtParam;
  const replayIntroToken = replayIntro ? (replayIntroAt || 'manual') : '';
  const lessonId = parseInt(id, 10) || 1;
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `lesson:${studyTarget}:${lessonId}`,
    initialQuestionId: `lesson:${lessonId}:loading`,
  });
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const attemptsModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (attemptsModalTimerRef.current) clearTimeout(attemptsModalTimerRef.current);
  }, []);
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
      .catch((error: unknown) => {
        noteSwallowedHandler('lesson1:remoteFrenchLessons')(error); // зачем: сбой загрузки французских уроков был немым — экран «не загрузилось» без причины
        if (cancelled) return;
        setRemoteFrenchLessonRows([]);
        setRemoteFrenchLessonLoadState('failed');
      });
    return () => { cancelled = true; };
  }, [frenchRemoteLessonRequired, frenchRemoteSourceLocale, lessonId, remoteFrenchLessonReloadNonce]);
  // зачем (владелец 2026-09-17): комбо пишет прогресс в СВОИ ключи. Запись в
  // ключи тем («зачёт только в комбо») затёрла бы честно заработанные медали и
  // проценты — это единственная точка, через которую идут ВСЕ ключи ниже,
  // поэтому изоляция делается здесь, а не в каждом ключе отдельно.
  const lessonStorageId = comboActive ? `combo_${comboTopicIds.join('_')}` : lessonId;
  const LESSON_KEY = lessonProgressKey(lessonStorageId, studyTarget);
  const CELL_KEY   = lessonSessionKey(lessonStorageId, 'cellIndex', studyTarget);
  const ORDER_KEY  = lessonSessionKey(lessonStorageId, 'phraseOrder', studyTarget);
  const ERROR_REPLAY_QUEUE_KEY   = lessonSessionKey(lessonStorageId, 'errorReplayQueue', studyTarget);
  const ERROR_REPLAY_SINCE_KEY   = lessonSessionKey(lessonStorageId, 'errorReplaySince', studyTarget);
  const ERROR_REPLAY_OVERRIDE_KEY = lessonSessionKey(lessonStorageId, 'errorReplayOverride', studyTarget);
  const SERVER_ATTEMPT_KEY = lessonSessionKey(lessonStorageId, 'serverAttemptId', studyTarget);
  // зачем: ключ сессии рун строится тем же паттерном, что и остальные
  // *_KEY выше, но lessonSessionKey типизирован узким union полей — не трогаем
  // его сигнатуру ради одного нового поля 'runes'.
  const RUNE_SESSION_KEY = `lesson${lessonStorageId}_runes_${studyTarget}`;

  // зачем (владелец 2026-09-17): в комбо фразы приходят из НЕСКОЛЬКИХ тем и уже
  // перемешаны с чередованием (две подряд не из одной темы). Рядом держим карту
  // «позиция → тема», чтобы кнопка «Теория» и подпись знали тему текущей фразы.
  const comboPlan = useMemo(() => {
    if (!comboActive) return null;
    try {
      return buildCombinedLessonPlan({ topicIds: comboTopicIds });
    } catch (e) {
      // Немой catch запрещён: без причины экран просто показал бы пустой урок.
      console.warn('[COMBO-LESSON] сборка пула не удалась', String(e), JSON.stringify({ comboTopicIds }));
      return null;
    }
  }, [comboActive, comboTopicIds]);

  // Фильтруем только фразы с .words — словарные слова (без .words) не показываем в режиме кнопок
  const LESSON_DATA = useMemo(
    () => {
      const rows = comboPlan
        ? comboPlan.entries.map((entry) => entry.phrase)
        : (remoteFrenchLessonRows ?? getLessonData(lessonId));
      return rows.filter(p => {
        if (!p || !phraseHasStudyTargetContent(p, studyTarget)) return false;
        return p.words && p.words.length > 0;
      });
    },
    [comboPlan, remoteFrenchLessonRows, lessonId, studyTarget],
  );
  // Если в уроке меньше 50 фраз — не повторяем. effectiveTotal = реальное кол-во фраз.
  const effectiveTotal = Math.min(LESSON_DATA.length, lessonTotal());
  const hasPlayableLessonRows = effectiveTotal > 0;
  const lessonTheorySupportBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId);
  const lessonHintSupportBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_hint', lessonId);
  const { startCell: initialStartCell, initialOrder: initialOrderFromPrime } = getInitialOrderAndCell(lessonStorageId, LESSON_DATA.length, effectiveTotal, studyTarget);
  const initialOverridePhraseCell = getInitialOverridePhraseCell(lessonStorageId, effectiveTotal, studyTarget);
  const { energy: currentEnergy, bonusEnergy, maxEnergy: currentMaxEnergy, isUnlimited: testerEnergyDisabled, energyReady } = useEnergy();
  const lessonEnergyIntent = useEnergySessionIntent('lesson', String(lessonId));

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
  const [typedText,    setTypedText]    = useState('');
  const [showTapHint,  setShowTapHint]  = useState(false);
  // CHANGE v5: contraction branching state
  const [phraseWordIdx, setPhraseWordIdx] = useState(0);        // position in original phrase words
  const [contrExpanded, setContrExpanded] = useState<string[] | null>(null); // pending expansion tokens
  const correctStreakRef = useRef(0);  // серия правильных ответов + combo badge
  const userNameRef      = useRef<string | null>(null); // кешируем имя чтобы не читать AsyncStorage на каждый ответ
  // [COMBO] Отображаемое значение комбо для UI-бейджа. Обновляется в setState.
  const [comboCount, setComboCount] = useState(0);
  const [fiftyFiftyUsedToday, setFiftyFiftyUsedToday] = useState(0);
  const [bonusHints, setBonusHints] = useState(0);
  const [passCount, setPassCount]   = useState(0);
  // зачем: completionOrdinal = passCount + 1 — сколько раз ЭТА сессия урока
  // уже была пройдена (0 при первом заходе), +1 переводит в 1-based номер
  // текущего прохождения для серверной расписки.
  const practiceRunes = usePracticeRunes({
    activity: 'lesson',
    sessionKey: RUNE_SESSION_KEY,
    completionOrdinal: passCount + 1,
    devFakeStartRunes: devRunesFake?.runes,
  });
  // зачем (владелец, 2026-08-28): на самом Уроке полёта руны не было вообще —
  // подключён только на остальных шести экранах. Тот же паттерн measureInWindow,
  // что в lesson_words.tsx/lesson_irregular_verbs.tsx.
  const runeFlight = useCoinRewardFlight();
  const [insufficientEnergy, setInsufficientEnergy] = useState(false);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [shouldShake, setShouldShake] = useState(false); // Trigger shake animation when energy is empty
  const [testerNoLimits, setTesterNoLimits] = useState(false); // Тестерская функция - без ограничений
  // ==================== NEW: Intro & Encouragement Screens ====================
  const [showIntroScreens, setShowIntroScreens] = useState(false);
  const [introGateReady, setIntroGateReady] = useState(false);
  const consumedReplayIntroTokenRef = useRef<string | null>(null);
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
  // зачем (ревью Авторизации 13.10): записи ошибок в «Мои ошибки» асинхронны — переход на итог ждёт их до 300 мс, чтобы ошибка последнего вопроса попала в «Добить (N)»; начало прохода сбрасывает сборщик id
  const lessonMistakeWritesRef = useRef<Promise<unknown>[]>([]);
  useEffect(() => { lessonMistakeWritesRef.current = []; beginLessonRunErrors(lessonId); }, [lessonId]);
  const isReplayRef        = useRef(false); // true если урок уже был пройден полностью
  const isCompletingRef    = useRef(false); // true пока идёт задержка перед переходом на lesson_complete
  // зачем (владелец, 2026-09-17): переход на lesson_complete раньше был на
  // ФИКСИРОВАННОМ таймере 1500мс, не зависящем от того, дозвучала ли озвучка
  // результата. Клип может стартовать до ~9с на холодном кэше (download
  // timeout + player watchdog + settle grace, см. phrase_audio_timing.ts) —
  // переход срабатывал заведомо раньше, а router.replace размонтирует экран
  // и через cleanup useAudio() обрывает звук. lessonCompletionNavigateRef
  // хранит саму функцию перехода; эффект эха результата (ниже) вызывает её по
  // сигналу «речь реально закончилась», а не по фиксированному времени.
  const lessonCompletionNavigateRef = useRef<(() => void) | null>(null);
  const lessonCompletionFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // зачем: checkAnswer асинхронна и до первого await не поднимала никакого флага, а UI
  // блокировался только через status === 'playing' — setStatus('result') отрабатывает уже
  // ПОСЛЕ await, поэтому два быстрых тапа (или тап + тап по фону) успевали пройти оба и
  // засчитать один ответ дважды: двойной legacy reward, сбитый счётчик серии. Синхронный ref-флаг
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
    ]).catch(noteSwallowedHandler('lesson1:useCallback.multiSet'));
  }, [ERROR_REPLAY_QUEUE_KEY, ERROR_REPLAY_OVERRIDE_KEY, ERROR_REPLAY_SINCE_KEY]);
  const [replaySolvedCorrectly, setReplaySolvedCorrectly] = useState(false); // ошибка только что исправлена — стрелка зеленеет

  // [SHUFFLE] Перемешанный порядок фраз внутри урока. Инициализируется один раз при загрузке.
  // phraseOrderRef[position] → индекс в LESSON_DATA.
  // зачем (владелец 2026-09-17): в комбо LESSON_DATA собран из НЕСКОЛЬКИХ тем,
  // поэтому прежняя фраза «Только фразы текущего урока» здесь больше не верна.
  // Тему текущей фразы нельзя брать из маршрута — её определяет сама фраза
  // (см. comboLessonIdByPhraseId ниже), иначе «Теория» открывала бы чужую тему.
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

  // зачем (владелец 2026-09-17): карта «id фразы → её тема». Экран перемешивает
  // порядок сам (phraseOrderRef), поэтому определять тему по позиции нельзя —
  // только по самой фразе. Без этого «Теория» в комбо открывала бы тему из
  // маршрута, то есть чужую.
  const comboLessonIdByPhraseId = useMemo(() => {
    if (!comboPlan) return null;
    const map = new Map<string, number>();
    for (const entry of comboPlan.entries) map.set(String(entry.phrase.id), entry.lessonId);
    return map;
  }, [comboPlan]);

  /** Тема, к которой относится показанная сейчас фраза. В обычном уроке — она же. */
  const activeTopicLessonId = useMemo(() => {
    if (!comboLessonIdByPhraseId || !phrase) return lessonId;
    const found = comboLessonIdByPhraseId.get(String(phrase.id));
    if (found == null) {
      // Ранний выход обязан называть причину: иначе теория тихо уехала бы не туда.
      if (__DEV__) {
        console.log('[COMBO-LESSON] тема фразы не найдена', JSON.stringify({ phraseId: String(phrase.id) }));
      }
      return lessonId;
    }
    return found;
  }, [comboLessonIdByPhraseId, phrase, lessonId]);
  const attemptsQuestionId = [
    'lesson',
    String(lessonId),
    String(overridePhraseCell ?? cellIndex),
    String(phrase?.id ?? phrase?.english ?? phrase?.spanish ?? 'loading'),
  ].join(':');
  useEffect(() => {
    attempts.updateQuestion(attemptsQuestionId);
  }, [attempts.updateQuestion, attemptsQuestionId]);

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
        .catch(noteSwallowedHandler('lesson1:useEffect.getItem'));
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

    // зачем (Макеты 12.10, съёмка energy-modes): dev `lessonintro=skip` — вступление считается показанным только в памяти, отметка на диск не пишется.
    if (isDevLessonIntroSkip()) {
      console.warn(`[DEV-STATE] lesson1: вступление пропущено (lessonintro=skip) lessonId=${lessonId}`); // guard-ok: dev-ветка
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
          void AsyncStorage.setItem(introKey, 'true').catch(noteSwallowedHandler('lesson1:useEffect.setItem'));
          syncLessonIntroShownFlagNow();
        }
        setShowIntroScreens(shouldShowIntro);
        setIntroGateReady(true);
      })
      .catch((error: unknown) => {
        // зачем: немой catch прятал сбой чтения отметки — вступление показывалось повторно без следа в журнале.
        console.warn(`[LESSON-INTRO] отметка вступления не прочитана lessonId=${lessonId} → показываем: ${error instanceof Error ? error.message : String(error)}`);
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
          try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(ss) }); } catch (e) {
      DebugLogger.error('lesson1:cancelled', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        }
      });
      return () => { cancelled = true; };
    }, [])
  );

  useEffect(() => () => {
    if (replayAudioTimerRef.current) clearTimeout(replayAudioTimerRef.current);
    // зачем (владелец, 2026-09-17): без сброса отложенный переход на
    // lesson_complete (см. lessonCompletionNavigateRef выше) мог бы прийти
    // ПОСЛЕ unmount — либо по settle() из эха (маловероятно, эхо само гасится
    // stopAudio() ниже), либо по фолбэк-таймеру, и дёрнуть router.replace на
    // уже мёртвом экране.
    lessonCompletionNavigateRef.current = null;
    if (lessonCompletionFallbackTimerRef.current) {
      clearTimeout(lessonCompletionFallbackTimerRef.current);
      lessonCompletionFallbackTimerRef.current = null;
    }
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
    // зачем (владелец, 2026-09-17): settle() сигналит «речь реально кончилась»
    // переходу на lesson_complete (см. lessonCompletionNavigateRef выше) — тот
    // ждёт этот сигнал вместо фиксированного таймера. РОВНО один раз (settled),
    // иначе поздний onStopped от следующей фразы после того как эта функция
    // отработала могла бы дёрнуть переход второй раз.
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      const navigate = lessonCompletionNavigateRef.current;
      if (!navigate) return;
      lessonCompletionNavigateRef.current = null;
      if (lessonCompletionFallbackTimerRef.current) {
        clearTimeout(lessonCompletionFallbackTimerRef.current);
        lessonCompletionFallbackTimerRef.current = null;
      }
      navigate();
    };
    speakAudio(line, settings.speechRate, {
      language: ttsLocaleForStudyTarget(studyTarget),
      speechText: pronunciationOverrideForLessonPhrase(line),
      onDone: settle,
      onStopped: settle,
      onError: settle,
    });
  }, [cellIndex, lessonRuntimeActive, phrase, resultAudioLine, settings.speechRate, settings.voiceOut, speakAudio, status, studyTarget]);

  // зачем: раньше клип фразы качался холодно в момент показа результата, с
  // таймаутом на скачивание — на первых фразах урока (худший случай, кэш пуст)
  // это часто било во внешний CLIP_START_TIMEOUT_MS раньше, чем файл успевал
  // докачаться, и фраза звучала роботом expo-speech, хотя клип физически есть
  // (см. hooks/phrase_audio_prefetch.ts). Прогреваем пачкой все фразы урока в
  // фоне сразу при заходе — начиная с текущей позиции, чтобы то, что человек
  // услышит первым, качалось первым. Только для en: клипы озвучены EN-only.
  useEffect(() => {
    if (studyTarget !== 'en' || !hasPlayableLessonRows) return;
    const ordered: string[] = [];
    for (let i = 0; i < effectiveTotal; i++) {
      const cell = (cellIndex + i) % effectiveTotal;
      const p = getPhraseForCell(cell);
      if (!p) continue;
      const line = phraseAnswerDisplayLine(p, studyTarget, lang);
      if (line) ordered.push(line);
    }
    const handle = prefetchPhraseAudio(ordered);
    return () => handle.cancel();
    // getPhraseForCell зависит от phraseOrderRef (ref) + LESSON_DATA; перечислять ref не нужно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyTarget, hasPlayableLessonRows, effectiveTotal, LESSON_DATA, lang, lessonId]);

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
  // Прогресс/legacy reward НЕ трогаем — это чистое чтение, без markTrainerResult/начисления.
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
    trackEnergyHit().catch(noteSwallowedHandler('lesson1:useCallback.trackEnergyHit'));
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
    traceLessonExit('navigateUp:enter', { lessonId, from: String(from), canGoBack: router.canGoBack(), branch: from === 'lesson_menu' ? 'to_menu' : (router.canGoBack() ? 'back_home_has_history' : 'back_home_empty_stack') });
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
        .catch(noteSwallowedHandler('lesson1:useCallback.call'));
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

  // зачем (аудит кнопок R58 #10, координатор 15.10): после последнего ответа переход на итог ждёт конца озвучки (до нескольких секунд),
  // а все записи завершения — разблокировка, аналитика, монеты и медаль экрана итога — идут в этом переходе. «Назад» в эту паузу гасил
  // таймер и терял завершение целиком (и писал «урок брошен»). Теперь «Назад» в паузе = пропустить ожидание: итог открывается сразу.
  const finishPendingCompletionNow = useCallback((from: string): boolean => {
    const run = lessonCompletionNavigateRef.current;
    if (!run) return false;
    lessonCompletionNavigateRef.current = null;
    if (lessonCompletionFallbackTimerRef.current) {
      clearTimeout(lessonCompletionFallbackTimerRef.current);
      lessonCompletionFallbackTimerRef.current = null;
    }
    console.log('[LESSON-RESULT] back_during_completion', JSON.stringify({ lessonId, from })); // guard-ok: один раз на урок
    run();
    return true;
  }, [lessonId]);

  const handleLessonHeaderBack = useCallback(() => {
    if (finishPendingCompletionNow('headerBack')) return;
    if (lessonExitInFlightRef.current) {
      traceLessonExit('headerBack:ignored', { lessonId, cellIndex, exitInFlight: true });
      return;
    }
    if (!beginLessonExit()) {
      traceLessonExit('headerBack:ignored', { lessonId, cellIndex, beginLessonExit: false });
      return;
    }
    traceLessonExit('headerBack:exit', { lessonId, cellIndex, effectiveTotal });
    const attempt = lessonAnalyticsAttemptRef.current!;
    if (markLessonAttemptTerminal(attempt, 'abandon')) {
      logLessonAbandoned(lessonId, cellIndex, effectiveTotal, attempt.id, lessonAttemptElapsedMs(attempt));
    }
    trackLessonAbandoned().catch(noteSwallowedHandler('lesson1:useCallback.trackLessonAbandoned'));
    navigateUpFromLessonScreen();
  }, [beginLessonExit, finishPendingCompletionNow, lessonId, cellIndex, effectiveTotal, navigateUpFromLessonScreen]);

  // зачем (m15, координатор 14.10): за флагом moments_v3 «назад» посреди урока сначала спрашивает; «Выйти» зовёт прежний handleLessonHeaderBack (abandon + навигация, двойной тап защищён lessonExitInFlightRef),
  // «Продолжить»/фон/«назад» закрывают шторку. Флаг выкл, интро-экраны (попытки ещё нет) или выход уже идёт — прежнее поведение без шторки.
  const momentsV3 = useMomentsV3Enabled();
  // зачем (владелец 15.10, m08 «Молния»: монета «НЕ УБИРАЕМ А ОСТАВЛЯЕМ»): молния, вспышка, холодная виньетка и монета поверх урока — только при флаге, модуль require'ом
  const ComboMomentLayer = momentsV3 ? (require('../components/feedback/ComboMomentLayer') as typeof import('../components/feedback/ComboMomentLayer')).default : null;
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const [exitSheetMounted, setExitSheetMounted] = useState(false);
  const requestLessonExit = useCallback(() => {
    if (finishPendingCompletionNow('exitRequest')) return; // R58 #10: урок уже пройден — без шторки «Выйти?», сразу итог
    if (!momentsV3 || showIntroScreens || lessonExitInFlightRef.current) {
      traceLessonExit('exitSheet:skip', { lessonId, cellIndex, momentsV3, intro: showIntroScreens, exitInFlight: lessonExitInFlightRef.current });
      handleLessonHeaderBack();
      return;
    }
    traceLessonExit('exitSheet:open', { lessonId, cellIndex, effectiveTotal });
    setExitSheetMounted(true);
    setExitSheetOpen(true);
  }, [finishPendingCompletionNow, momentsV3, showIntroScreens, handleLessonHeaderBack, lessonId, cellIndex, effectiveTotal]);
  const closeExitSheet = useCallback(() => {
    traceLessonExit('exitSheet:continue', { lessonId, cellIndex });
    setExitSheetOpen(false);
  }, [lessonId, cellIndex]);
  const confirmLessonExit = useCallback(() => {
    traceLessonExit('exitSheet:leave', { lessonId, cellIndex });
    setExitSheetOpen(false);
    handleLessonHeaderBack();
  }, [handleLessonHeaderBack, lessonId, cellIndex]);

  const handleIntroDone = useCallback(async () => {
    if (replayIntro) consumedReplayIntroTokenRef.current = replayIntroToken || 'manual';
    // зачем (аудит R58 #28, 15.10, Optimistic UI): «Старт» вступления раньше ждал запись отметки — пауза на тапе. Экран урока открываем СРАЗУ,
    // отметку пишем и выгружаем фоном (выгрузка строго после записи — она читает хранилище).
    setShowIntroScreens(false);
    const introShownKey = lessonIntroShownKey(lessonId, studyTargetRef.current);
    void AsyncStorage.setItem(introShownKey, 'true')
      .catch((error: unknown) => {
        console.warn(`[LESSON-INTRO] отметка вступления не записана lessonId=${lessonId} key=${introShownKey} reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя записи
      })
      .then(() => { syncLessonIntroShownFlagNow(); });
  }, [lessonId, replayIntro, replayIntroToken]);

  const resetNoEnergyModal = useCallback(() => {
    setShowNoEnergyModal(false);
    isShowingEnergyFeedbackRef.current = false;
  }, []);

  // Закрытие окна (фон, «назад»): если списание не прошло — выход из урока, а не бесплатное продолжение.
  const closeNoEnergyModalImplRef = useRef<() => void>(() => {});
  const closeNoEnergyModal = useCallback(() => closeNoEnergyModalImplRef.current(), []);
  const dismissEnergyModal = useCallback(() => {
    if (lessonExitInFlightRef.current) {
      traceLessonExit('energyModal:ignored', { lessonId, exitInFlight: true });
      return;
    }
    if (!beginLessonExit()) {
      traceLessonExit('energyModal:ignored', { lessonId, beginLessonExit: false });
      return;
    }
    traceLessonExit('energyModal:exit', { lessonId, cellIndex });
    resetNoEnergyModal();
    navigateUpFromLessonScreen();
  }, [beginLessonExit, navigateUpFromLessonScreen, resetNoEnergyModal, lessonId, cellIndex]);
  closeNoEnergyModalImplRef.current = () => {
    console.warn(`[ENERGY-GATE] lesson1 modal closed blocked=${String(energyGateBlockedRef.current)} → ${energyGateBlockedRef.current ? 'exit' : 'stay'}`);
    if (energyGateBlockedRef.current) dismissEnergyModal();
    else resetNoEnergyModal();
  };

  // зачем (§126): размонтирование урока без парной записи headerBack/energyModal/navigateUp = выход по внешней причине
  // (router.replace из корневого лейаута, сброс навигации). Состояние держим в ref, чтобы запись на размонтировании была свежей.
  const lessonExitSnapshotRef = useRef({ lessonId, cellIndex, status: String(status) });
  lessonExitSnapshotRef.current = { lessonId, cellIndex, status: String(status) };
  useEffect(() => () => {
    traceLessonExit('unmount', { ...lessonExitSnapshotRef.current, exitInFlight: lessonExitInFlightRef.current });
  }, []);

  // Android: системный «Назад» = тот же выход, что и кнопка (без дублей в стеке).
  useEffect(() => {
    if (!lessonRuntimeActive || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showNoEnergyModal) {
        resetNoEnergyModal();
        return true;
      }
      requestLessonExit();
      return true;
    });
    return () => sub.remove();
  }, [lessonRuntimeActive, showNoEnergyModal, requestLessonExit, resetNoEnergyModal]);

  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);

  // Энергия за урок: 1 ⚡ за попытку (D06), в момент показа первого задания (D72).
  // Ошибки внутри урока заряд не жгут. Латч списания живёт в гейте по operationId
  // попытки и НЕ сбрасывается по фокусу: ушёл в теорию (/hint, /lesson_help) или
  // на пейвол и вернулся — второй раз не спишет. Переход на ДРУГОЙ урок (новый
  // lessonId → новый intent) честно платится заново (D67).
  // зачем: трассировка [ENERGY-SPEND-LAT] начинается на МОНТИРОВАНИИ экрана, а
  // не на energyReady — иначе ожидание самого гейта (главный подозреваемый в
  // «анимация не сразу») осталось бы за кадром замера.
  useEffect(() => {
    beginEnergySpendTrace(`spend:${String(lessonId)}`);
  }, [lessonId]);

  // зачем: D72/D87/PM-084 — списание через единый гейт первого вопроса. Урок
  // готов и интро закрыто = первое задание на экране → −1 один раз на попытку
  // (operationId попытки; ре-рендеры от смены баланса больше не гасят ack);
  // уход/падение до показа — возврат. Plus — без списания (D07).
  const lessonFirstQuestionVisible = canChargeClassicLessonEntry({
    energyReady,
    lessonHydrated,
    introGateReady,
    introVisible: showIntroScreens,
    hasPlayableRows: hasPlayableLessonRows,
    remoteSourceReady: !frenchRemoteLessonRequired || remoteFrenchLessonLoadState === 'ready',
  });
  useEffect(() => {
    markEnergySpendStage(
      `spend:${String(lessonId)}`,
      lessonFirstQuestionVisible ? 'gate passed (first question visible), charging via gate' : 'lesson not ready for paid entry',
    );
  }, [lessonFirstQuestionVisible, lessonId]);
  // зачем (координатор 12.10, energy-modes-017: «урок открылся при ⚡0, окна нет» — сначала логи): списание за урок (режим А)
  // идёт не на «Начать», а когда виден ПЕРВЫЙ вопрос; до этого (интро, загрузка) энергия не проверяется. Видно, какое
  // условие держит гейт, и сколько энергии видит экран. Временная трасса — убрать после диагноза.
  useEffect(() => {
    console.log('[ENERGY-GATE] lesson1 entry', JSON.stringify({ // guard-ok: временная трасса диагноза energy-modes-017
      lessonId,
      firstQuestionVisible: lessonFirstQuestionVisible,
      energyReady,
      lessonHydrated,
      introGateReady,
      introVisible: showIntroScreens,
      hasPlayableRows: hasPlayableLessonRows,
      remoteSourceReady: !frenchRemoteLessonRequired || remoteFrenchLessonLoadState === 'ready',
      screenEnergy: currentEnergy,
      screenBonus: bonusEnergy,
      plusOrUnlimited: testerEnergyDisabled,
      op: lessonEnergyIntent.operationId,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonFirstQuestionVisible, energyReady, lessonHydrated, introGateReady, showIntroScreens, hasPlayableLessonRows, remoteFrenchLessonLoadState, lessonId]);
  // зачем (D159, владелец 04.10): энергия окончательно списывается после ПЕРВОГО ОТВЕТА; вышел без ответа — возврат;
  // повторный вход в тот же раздел урока в течение 10 мин — бесплатно.
  // зачем (energy-modes-017, координатор 13.10, деньги): при ⚡0 окно «Энергия закончилась» закрывалось тапом по фону / «назад» /
  // переходом в Plus через onClose = resetNoEnergyModal — окно пряталось, урок оставался, энергия НЕ списана, слова нажимались →
  // урок бесплатно. Пока списание не прошло, ответы заблокированы; закрытие окна без энергии — выход из урока.
  const energyGateBlockedRef = useRef(false);
  const [energyGateBlocked, setEnergyGateBlocked] = useState(false);
  const energyGateRetryInFlightRef = useRef(false);
  const lessonEnergyGate = useFirstQuestionEnergyGate({
    intent: lessonEnergyIntent,
    screen: 'lesson1',
    finalizeOn: 'first_answer',
    firstQuestionVisible: lessonFirstQuestionVisible,
    onResult: (result) => endEnergySpendTrace(`spend:${String(lessonId)}`, String(result)),
    onInsufficient: () => {
      energyGateBlockedRef.current = true;
      setEnergyGateBlocked(true);
      console.warn(`[ENERGY-GATE] lesson1 blocked: insufficient lessonId=${lessonId} energy=${currentEnergy} bonus=${bonusEnergy} unlimited=${String(testerEnergyDisabled)}`);
      showEnergyEmptyFeedback();
    },
    onCancelled: () => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any),
  });
  useEffect(() => {
    if (!energyGateBlocked || energyGateRetryInFlightRef.current) return;
    if (!testerEnergyDisabled && currentEnergy + bonusEnergy <= 0) return;
    energyGateRetryInFlightRef.current = true;
    console.warn(`[ENERGY-GATE] lesson1 retry: энергия появилась energy=${currentEnergy} bonus=${bonusEnergy} unlimited=${String(testerEnergyDisabled)}`);
    void lessonEnergyGate.charge().then((result) => {
      energyGateRetryInFlightRef.current = false;
      console.warn(`[ENERGY-GATE] lesson1 retry: result=${result}`);
      if (result === 'spent' || result === 'unlimited') {
        energyGateBlockedRef.current = false;
        setEnergyGateBlocked(false);
        lessonEnergyGate.markShown();
        setShowNoEnergyModal(false);
        isShowingEnergyFeedbackRef.current = false;
      }
    }).catch((error: unknown) => {
      energyGateRetryInFlightRef.current = false;
      console.warn('[ENERGY-GATE] lesson1 retry: failed', error instanceof Error ? error.message : String(error));
    });
  }, [energyGateBlocked, currentEnergy, bonusEnergy, testerEnergyDisabled, lessonEnergyGate]);

  const loadData = async () => {
    if (!isLessonScreenPrimedThisSession(lessonStorageId, LESSON_DATA.length, effectiveTotal)) {
      setLessonHydrated(false);
    }
    try {
      const attempt = lessonAnalyticsAttemptRef.current!;
      if (markLessonAttemptStarted(attempt)) {
        logLessonStart(lessonId, effectiveTotal, attempt.id);
      }
      trackLessonStart().catch(noteSwallowedHandler('lesson1:loadData.trackLessonStart'));
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
      if (!introShownRaw && !isDevLessonIntroSkip() && getLessonIntroScreens(lessonId, studyTargetRef.current).length > 0) {
        await AsyncStorage.setItem(introKey, 'true').catch(noteSwallowedHandler('lesson1:loadData.setItem'));
        syncLessonIntroShownFlagNow();
        setShowIntroScreens(true);
        setLessonHydrated(true); // снимаем спиннер — рендерим интро поверх
      }

      // Проверяем тестерские функции
      const noLimits = await isTesterNoLimitsActive();
      setTesterNoLimits(noLimits);
      // energy state comes from EnergyContext — no local load needed

      loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
      const [sp, ss, ci, savedOrder, errQRaw, errSinceRaw, errOvRaw, serverAttemptRaw] = await Promise.all([
        AsyncStorage.getItem(LESSON_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(CELL_KEY),
        AsyncStorage.getItem(ORDER_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_QUEUE_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_SINCE_KEY),
        AsyncStorage.getItem(ERROR_REPLAY_OVERRIDE_KEY),
        AsyncStorage.getItem(SERVER_ATTEMPT_KEY),
      ]);
      const serverAttemptId = routeServerAttemptId || serverAttemptRaw || makeLessonServerAttemptId();
      serverAttemptIdRef.current = serverAttemptId;
      if (serverAttemptRaw !== serverAttemptId) {
        AsyncStorage.setItem(SERVER_ATTEMPT_KEY, serverAttemptId).catch(noteSwallowedHandler('lesson1:loadData.setItem_2'));
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
        ]).catch(noteSwallowedHandler('lesson1:loadData.multiRemove'));
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
          } catch (e) {
      // keep empty
      DebugLogger.error('lesson1:parsed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
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
        const count = Math.min(n, lessonTotal());
        let restoredOrder: number[] | null = null;
        if (savedOrder) {
          try {
            const parsed = JSON.parse(savedOrder) as unknown;
            // Валидируем: длина совпадает и все индексы в диапазоне
            if (isValidLessonPhraseOrder(parsed, n)) {
              restoredOrder = parsed;
            } else {
              AsyncStorage.removeItem(ORDER_KEY).catch(noteSwallowedHandler('lesson1:loadData.removeItem'));
            }
          } catch {
            AsyncStorage.removeItem(ORDER_KEY).catch(noteSwallowedHandler('lesson1:loadData.removeItem_2'));
          }
        }
        if (restoredOrder) {
          phraseOrderRef.current = restoredOrder;
        } else {
          phraseOrderRef.current = shuffleLessonPhraseOrder(n);
          // Сохраняем новый порядок сразу
          AsyncStorage.setItem(ORDER_KEY, JSON.stringify(phraseOrderRef.current)).catch(noteSwallowedHandler('lesson1:loadData.setItem_3'));
        }
      } else if (LESSON_DATA.length > 0 && !hasUsableLessonPhraseOrder(phraseOrderRef.current, LESSON_DATA.length)) {
        phraseOrderRef.current = shuffleLessonPhraseOrder(LESSON_DATA.length);
        AsyncStorage.setItem(ORDER_KEY, JSON.stringify(phraseOrderRef.current)).catch(noteSwallowedHandler('lesson1:loadData.setItem_4'));
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
      setBonusHints(0);

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
    if (energyGateBlockedRef.current) {
      console.warn('[ENERGY-GATE] lesson1 check blocked — энергия не списана, урок не начат');
      showEnergyEmptyFeedbackRef.current();
      return;
    }
    // зачем: guard СИНХРОННЫЙ и стоит до первого await — иначе два быстрых тапа успевают
    // войти оба (setStatus('result') отрабатывает только после await, и кнопка, завязанная
    // на status === 'playing', ещё не успела перерисоваться). Тот же приём, что
    // locked.current в lesson_words.tsx. Снимается в goNext при возврате в 'playing'.
    if (answerInFlightRef.current) return;
    // зачем: numeric energy — за вход в урок уже списаны 20 ⚡, а внутри урока
    // энергия не тратится вообще. Значит блокировать ОТВЕТЫ по нулевому балансу
    // нельзя: иначе оплаченный урок обрывался бы на первом же ответе (заряд ушёл
    // именно на этот вход). Гейт остался ровно один — на входе, выше.
    answerInFlightRef.current = true;
    lessonEnergyGate.markAnswered();
    const st = studyTargetRef.current;
    const expected = phraseCanonicalAnswer(phrase, st);
    const answerAlts = phraseAnswerAlternatives(phrase, st);
    const isRight = isCorrectAnswer(answer, expected, answerAlts)
      || (settings.hardMode && isCorrectLessonHardModeTypedAnswer(phrase, st, answer));
    // зачем (владелец, 2026-08-27): руна засчитывается за правильный ответ на
    // ЭТУ ячейку. Идентификатор — тот же overridePhraseCell ?? cellIndex, что
    // используют attemptSessionId и AttemptId ниже: одна ячейка = один платёж,
    // независимо от того, сколько раз к ней вернулись через replay ошибок.
    if (isRight) {
      const awarded = practiceRunes.onCorrectAnswer(String(overridePhraseCell ?? cellIndex), correctStreakRef.current + 1);
      if (awarded > 0) runeFlight.fly(awarded);
    }
    logLessonAnswer(lessonId, isRight, cellIndex, effectiveTotal, lessonAnalyticsAttemptRef.current!.id);
    void trackActivity('lesson:answer_result', {
      feature: 'lesson',
      screen: 'lesson1',
      result: isRight ? 'success' : 'blocked',
      tags: { lessonId, cellIndex, isRight, replay: overridePhraseCell !== null },
    });
    trackAnswer(isRight).catch(noteSwallowedHandler('lesson1:useCallback.trackAnswer'));
    const np = [...progress];

    // КЛЮЧЕВАЯ ЛОГИКА:
    // Правильный ответ → ячейка зеленеет
    // Неправильный ответ → ячейка краснеет
    //   В режиме повтора (isReplay) ошибка может перекрыть зелёную ячейку → оценка падает
    if (isCompletingRef.current) {
      // зачем (аудит Optimistic UI «Главная и Уроки», 12.10): ранний выход держал замок ответа взведённым и молчал — если экран
      // остаётся (возврат со страницы итога), ответы перестали бы приниматься. Замок снимаем, причину пишем.
      answerInFlightRef.current = false;
      console.warn(`[LESSON-ANSWER] ответ пропущен: урок уже завершается (lessonId=${lessonId} cell=${cellIndex})`); // guard-ok: ранний выход называет причину
      return;
    }
    sessionAnswerCount.current += 1;
    const attemptEffect = attempts.registerVerdict({
      answerAttemptId: [
        attemptSessionId,
        String(overridePhraseCell ?? cellIndex),
        String(sessionAnswerCount.current),
      ].join(':'),
      verdict: isRight ? 'correct' : 'pedagogical_wrong',
    });
    // [FeedbackKit] Значение серии ДО любых сбросов этого ответа (ветка ошибки
    // сбрасывает correctStreakRef ниже). Нужно, чтобы отличить обрыв серии
    // (comboBreak) от обычной ошибки (wrong). Только для ОЩУЩЕНИЙ — legacy reward-формула
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
      // зачем (PM-190-A1, координатор 13.10): без языка учёт шёл в ключ по умолчанию (en) — фразы es/fr/de/it попадали в английскую статистику
      if (!wasLearned) void bumpStatsDaily('phrases_learned', 1, studyTargetRef.current);
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
      // Replay attempts can earn legacy reward too, so a mistake must always break the combo.
      correctStreakRef.current = 0;
      // Новая долгосрочная система «Ошибки» только фиксирует объективный fail.
      // Локальный обязательный replay этого урока остаётся выше и не зависит от Plus.
      {
        const stRm = studyTargetRef.current;
        const analyticsPhraseKey = phraseCanonicalAnswer(phrase, stRm);
        {
          const canonKey = phraseCanonicalAnswer(phrase, stRm);
          const correctTokens = canonKey.split(/\s+/).filter(Boolean);
          // зачем (аудит Optimistic UI Уроков, 13.10): раньше здесь стоял `selectedWords.join(' ')` — переменная замыкания, которой нет в deps колбэка (устаревшее значение) и которая пуста в режиме ввода.
          // Тип ошибки и слово-промах считались по пустому ответу → почти всё записывалось как «пропущено слово». Берём фактический `answer`.
          const resolvedToken = resolvePhraseMistakeToken(canonKey, answer);
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
          // зачем (22.09): узкий список языков не пускал запись ошибки для
          // испанского и немецкого — урок не пополнял «Мои ошибки».
          if (isMistakeStudyTargetValue(stRm)) {
            const mistakeFacetKind = lessonMistakeFacet({ expectedPhrase: canonKey, answeredPhrase: answer });
            console.log('[MISTAKE-CAPTURE] facet', JSON.stringify({ phraseId: phrase.id, answer, answerSource: 'checkAnswer.arg', staleSelectedWords: selectedWords.join(' '), facet: mistakeFacetKind, tokenIndex, errWord })); // guard-ok: одна строка на неверный ответ, видно по какому ответу считан тип ошибки
            const attemptScope = serverAttemptIdRef.current
              || lessonAnalyticsAttemptRef.current?.id
              || String(lessonStorageId);
            const captureWrite = getStableId()
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
                // зачем (репорт #15 Ольга, 2026-09-20): здесь стоял жёсткий
                // 'word_order', поэтому ЛЮБАЯ ошибка урока приходила в раздел
                // с подсказкой «Сверь порядок слов». Тип считаем по промаху.
                facet: {
                  kind: mistakeFacetKind,
                  tokenIndex: tokenIndex >= 0 ? tokenIndex : undefined,
                  expected: tokenRow?.correct ?? tokenRow?.text ?? errWord,
                },
              }))
              // зачем (владелец 13.10, «Добить: Ещё учу (N)»): id записанной ошибки нужен итогу урока, чтобы запустить повтор именно этих ошибок.
              .then((captured) => { if (captured.kind === 'captured') collectLessonRunMistakeId(lessonId, captured.mistakeId); })
              .catch(noteSwallowedHandler('lesson1:useCallback.getStableId'));
            lessonMistakeWritesRef.current.push(captureWrite);
          }
        }
      }
    }

    // Серия правильных ответов — используется для комбо-достижений.
    if (isRight) {
      correctStreakRef.current += 1;
      setComboCount(correctStreakRef.current);
      // Проверка combo читает/пишет состояние всех достижений. Она нужна только
      // на реальных порогах, а не после каждого правильного ответа.
      if (COMBO_ACHIEVEMENT_THRESHOLDS.has(correctStreakRef.current)) {
        checkAchievements({ type: 'combo', count: correctStreakRef.current, studyTarget: st }).catch(noteSwallowedHandler('lesson1:useCallback.checkAchievements'));
      }
    } else {
      correctStreakRef.current = 0;
      setComboCount(0);
      // зачем: владелец 2026-08-23 — энергия БОЛЬШЕ НЕ ТРАТИТСЯ ЗА ОШИБКИ.
      // Единственная трата — 20 ⚡ при входе в урок (см. гейт входа выше).
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
      // correctStreakRef уже инкрементирован в блоке legacy reward выше.
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

    fadeAnim.stopAnimation(() => {
      if (reduceMotion) {
        fadeAnim.setValue(1);
        return;
      }
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    });

    // зачем (режим энергии Б, ревью Ядра п.1): 'energy_exhausted' — ошибка на последней энергии; как и при исчерпанных сердечках,
    // остаёмся на ЭТОМ вопросе и никуда не листаем (без рунного окна и сброса монет — их в режиме Б нет). Дальше карточка остановки.
    if (isAttemptsStopEffect(attemptEffect)) {
      if (attemptEffect === 'energy_exhausted') console.log('[ENERGY-MODE] lesson1 stop on energy_exhausted', JSON.stringify({ cellIndex, overridePhraseCell }));
      return;
    }

    const nextCell = (cellIndex + 1) % effectiveTotal;
    void AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np)).catch(noteSwallowedHandler('lesson1:useCallback.setItem_3'));
    void AsyncStorage.setItem(CELL_KEY, String(nextCell)).catch(noteSwallowedHandler('lesson1:useCallback.setItem_4'));
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
      // Preserve the identity that earned this run's answer legacy reward before rotating
      // storage to the next replay. Completion dedupe follows the real attempt,
      // never pass_count (whose medal semantics are independent).
      const completedAttemptId = normalizeLessonServerAttemptId(serverAttemptIdRef.current)
        ?? makeLessonServerAttemptId();
      const nextAttemptId = makeLessonServerAttemptId();
      serverAttemptIdRef.current = nextAttemptId;
      AsyncStorage.setItem(SERVER_ATTEMPT_KEY, nextAttemptId).catch(noteSwallowedHandler('lesson1:useCallback.setItem_5'));
      void trackFeatureStart('lesson', 'complete', { lessonId, effectiveTotal }, 'lesson1');
      sessionAnswerCount.current = 0; // сброс для следующего повтора
      isReplayRef.current = true;
      isCompletingRef.current = true;
      // НЕ сбрасываем phraseOrderRef здесь: пока экран «результат» виден, phrase =
      // getPhraseForCell(cellIndex) ещё должен использовать тот же shuffle — иначе русский/
      // эталон EN перескакивают на LESSON_DATA[cell], а selectedWords остаются от реальной фразы.
      // зачем (Ревизор 15.10, 🟡 к e85eb2ccb): сбой перехода на итог возвращает ссылку, и повтор снова проходит весь путь — счётчик дня и
      // аналитика успеха засчитались бы дважды. Флаг живёт в замыкании прохода: повтор того же прохода их пропускает.
      let completionStatsCounted = false;
      const runLessonCompletionNavigation = async () => {
        const resetShuffleForNextPass = () => {
          phraseOrderRef.current = [];
          AsyncStorage.removeItem(ORDER_KEY).catch(noteSwallowedHandler('lesson1:resetShuffleForNextPass.removeItem'));
          errorQueueRef.current = [];
          questionsSinceErrorRef.current = 0;
          setPassAnsweredCells(new Set()); // [REVIEW] новый проход — обнуляем «пройдено за проход»
          void AsyncStorage.multiRemove([
            ERROR_REPLAY_QUEUE_KEY,
            ERROR_REPLAY_SINCE_KEY,
            ERROR_REPLAY_OVERRIDE_KEY,
          ]).catch(noteSwallowedHandler('lesson1:resetShuffleForNextPass.multiRemove'));
        };
        // Получаем финальную оценку урока перед переходом на lesson_complete
        const correct = np.filter(x => x === 'correct' || x === 'replay_correct').length;
        // зачем (владелец 2026-09-17): в комбинированном уроке человек пришёл
        // узнать, КАКАЯ тема проседает при переключении. Считаем разбивку здесь,
        // пока ещё известны и состояния ячеек (np), и карта «фраза → тема»:
        // на экране завершения этих данных уже нет.
        const comboBreakdown = comboLessonIdByPhraseId
          ? (() => {
              const byTopic = new Map<number, { ok: number; total: number }>();
              for (let cell = 0; cell < effectiveTotal; cell += 1) {
                const state = np[cell];
                if (state !== 'correct' && state !== 'replay_correct' && state !== 'wrong') continue;
                const cellPhrase = getPhraseForCell(cell);
                const topicId = cellPhrase ? comboLessonIdByPhraseId.get(String(cellPhrase.id)) : undefined;
                if (topicId == null) continue;
                const row = byTopic.get(topicId) ?? { ok: 0, total: 0 };
                row.total += 1;
                if (state !== 'wrong') row.ok += 1;
                byTopic.set(topicId, row);
              }
              // Порядок тем — как выбрал человек, чтобы список не прыгал между заходами.
              return comboTopicIds
                .filter((topicId) => byTopic.has(topicId))
                .map((topicId) => {
                  const row = byTopic.get(topicId)!;
                  return `${topicId}:${row.ok}:${row.total}`;
                })
                .join(',');
            })()
          : '';
        const comboRouteParams = comboActive
          ? { combo: comboTopicIds.join(','), comboBreakdown }
          : {};
        let finalScore = parseFloat((correct / effectiveTotal * 5).toFixed(1));
        try {

        // Если включен режим "Без ограничений", даём 5 баллов автоматически
        const noLimits = await isTesterNoLimitsActive();
        if (noLimits) {
          finalScore = 5;
        }

        // Free после урока 3 не должен ни записывать lesson 4 в старый список
        // unlocks, ни передавать экрану результата ложный флаг «разблокирован».
        // Проверка свежая и fail-closed; dev no-limits сохраняет свой bypass.
        const hasPremiumAccess = noLimits || await getVerifiedPremiumAccessStatus({
          bypassCache: true,
          allowCloudRefresh: false,
        }).catch(noteSwallowedAs('lesson1:runLessonCompletionNavigation.getVerifiedPremiumAccessStatus', false));
        const didUnlock = await tryUnlockNextLesson(
          lessonId,
          finalScore,
          studyTarget,
          hasPremiumAccess,
        );
        if (didUnlock && lessonId === 1) {
          void import('./cloud_sync')
            .then((m) => m.syncToCloud({ forceNow: true }))
            .catch(noteSwallowedHandler('lesson1:runLessonCompletionNavigation.call'));
          // зачем (§57 координатора): подтяжка жемчуга через 2 с после урока 1 снята — жемчуг удалён (D70/D103).
        }

        const analyticsAttempt = lessonAnalyticsAttemptRef.current!;
        if (markLessonAttemptTerminal(analyticsAttempt, 'complete')) {
          logLessonComplete(lessonId, analyticsAttempt.id, lessonAttemptElapsedMs(analyticsAttempt));
        }
        if (completionStatsCounted) {
          console.log('[LESSON-RESULT] retry_skip_stats', JSON.stringify({ lessonId })); // guard-ok: повтор перехода
        } else {
          completionStatsCounted = true;
          void trackFeatureSuccess('lesson', 'complete', {
            lessonId,
            finalScore,
            didUnlock,
            correct,
            effectiveTotal,
          }, 'lesson1');
          void bumpStatsDaily('lessons_completed', 1, studyTargetRef.current);
        }

        // зачем: диагнозы тренера удалены вместе с разделом «Моя практика»
        // (осколок коммита 4ccd8c4f4) — маршрут больше не несёт coach-параметров.
        const coachRouteParams = {};

        const navigate = async () => {
          resetShuffleForNextPass();
          // зачем (ревью Авторизации 13.10): ждём записи ошибок прохода не дольше 300 мс — иначе ошибка последнего вопроса не попадёт в «Добить (N)»
          {
            const pending = lessonMistakeWritesRef.current;
            if (pending.length > 0) {
              const waitStartedAt = Date.now();
              await Promise.race([Promise.allSettled(pending), new Promise((resolve) => setTimeout(resolve, 300))]);
              console.log(`[LESSON-RESULT] переход: ждали записи ошибок ${pending.length} шт. ${Date.now() - waitStartedAt} мс`); // guard-ok: журнал ожидания
            }
          }
          // зачем (владелец 13.10, «почему на итоге нет всех элементов»): список «Ошибки» итога урока (макет practice.html#done) берёт промахи прохода отсюда — до обнуления.
          rememberLessonRunErrors(lessonId, lessonWrongMistakesRef.current);
          lessonWrongMistakesRef.current = [];
          markNextNavigationAsReplace();
          router.replace({
            pathname: '/lesson_complete',
            params: {
              id: String(lessonId),
              unlocked: didUnlock ? '1' : '0',
              completedAttemptId,
              repeatAttemptId: nextAttemptId,
              passed: finalScore >= 2.5 ? '1' : '0',
              // зачем (владелец, 2026-08-27): руны засчитываются на экране
              // празднования, не здесь. lesson_complete восстанавливает ту же
              // копилку по (lessonId, studyTarget, completionOrdinal) и сам
              // зовёт settle() при монтировании.
              runeCompletionOrdinal: String(passCount + 1),
              // зачем (координатор 13.10): счёт прохода едет в маршруте — итог не зависит от хранилища прогресса и не рисуется пустым.
              resultCorrect: String(correct),
              resultTotal: String(effectiveTotal),
              ...(devRunesSeedParam ? { devRunesSeed: devRunesSeedParam } : {}),
              ...comboRouteParams,
              ...coachRouteParams,
            },
          });
        };

        // There is one completion surface: go straight to lesson_complete.
        await navigate();
        } catch (e) {
          void trackFeatureError('lesson', 'complete', e, { lessonId }, 'lesson1');
          // Fallback: navigate to lesson_complete even if tracking fails
          resetShuffleForNextPass();
          rememberLessonRunErrors(lessonId, lessonWrongMistakesRef.current);
          lessonWrongMistakesRef.current = [];
          try {
            markNextNavigationAsReplace();
            router.replace({
              pathname: '/lesson_complete',
              params: {
                id: String(lessonId),
                unlocked: '0',
                completedAttemptId,
                repeatAttemptId: nextAttemptId,
                passed: finalScore >= 2.5 ? '1' : '0',
                runeCompletionOrdinal: String(passCount + 1),
                // зачем (координатор 13.10): счёт прохода едет в маршруте — итог не зависит от хранилища прогресса и не рисуется пустым.
                resultCorrect: String(correct),
                resultTotal: String(effectiveTotal),
                ...(devRunesSeedParam ? { devRunesSeed: devRunesSeedParam } : {}),
                ...comboRouteParams,
              },
            });
          } catch (replaceError) {
            // зачем (Ревизор 15.10, 🟡 к #27): переход на итог упал — ссылка уже обнулена, и «Дальше» молчал до перезахода
            // (isCompletingRef держит урок в завершении). Возвращаем ссылку: следующий тап «Дальше»/«Назад» повторит переход.
            console.warn('[LESSON-RESULT] replace_failed', JSON.stringify({ lessonId, reason: replaceError instanceof Error ? replaceError.message : String(replaceError) })); // guard-ok: причина в журнале
            lessonCompletionNavigateRef.current = () => { void runLessonCompletionNavigation(); };
          }
        }
      };

      // зачем (владелец, 2026-09-17): если озвучка выключена в настройках,
      // эффект эха результата даже не запустится (его собственный ранний
      // выход на !settings.voiceOut) — значит settle() оттуда никогда не
      // придёт, и ждать нечего. Тогда используем прежнюю короткую паузу
      // «дать увидеть результат». Если озвучка включена — ждём settle(),
      // но не бесконечно: длинный fallback покрывает холодный старт клипа
      // (download timeout + player watchdog + settle grace, см.
      // phrase_audio_timing.ts) плюс саму длительность речи, с запасом.
      if (!settings.voiceOut) {
        // зачем (аудит Optimistic UI Уроков, 13.10): таймер без ссылки не чистился при выходе — «Назад» в первые 1,5 с возвращал человека на итог. Теперь он в том же ref, что и запасной, и гасится при размонтировании.
        lessonCompletionNavigateRef.current = () => { void runLessonCompletionNavigation(); };
        lessonCompletionFallbackTimerRef.current = setTimeout(() => {
          lessonCompletionFallbackTimerRef.current = null;
          const navigate = lessonCompletionNavigateRef.current;
          lessonCompletionNavigateRef.current = null;
          navigate?.();
        }, 1500);
      } else {
        lessonCompletionNavigateRef.current = () => { void runLessonCompletionNavigation(); };
        lessonCompletionFallbackTimerRef.current = setTimeout(() => {
          lessonCompletionFallbackTimerRef.current = null;
          const navigate = lessonCompletionNavigateRef.current;
          lessonCompletionNavigateRef.current = null;
          navigate?.();
        }, LESSON_COMPLETION_SPEECH_FALLBACK_MS);
      }
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
  }, [lessonEnergyGate, progress, cellIndex, phrase, settings, fadeAnim, lessonId, overridePhraseCell, lang, lessonRuntimeActive, persistErrorReplayToStorage, reduceMotion, studyTarget, lessonStorageId, SERVER_ATTEMPT_KEY, attempts.registerVerdict, attemptSessionId]);

  const retryCurrentLessonPhraseAfterSessionRuneForfeit = useCallback(() => {
    setShowAttemptsModal(false);
    setStatus('playing');
    setWasWrong(false);
    setTypedText('');
    setContrExpanded(null);
    answerInFlightRef.current = false;
    fadeAnim.stopAnimation(() => fadeAnim.setValue(0));

    const phraseWords = getPhraseTokens(phrase, studyTarget);
    let nextWordIndex = 0;
    const initialSelection: string[] = [];
    while (nextWordIndex < phraseWords.length && isZeroArticlePosition(phraseWords, nextWordIndex)) {
      initialSelection.push(phraseWords[nextWordIndex]);
      nextWordIndex += 1;
    }
    setSelectedWords(initialSelection);
    setPhraseWordIdx(nextWordIndex);
    setShuffled(nextWordIndex < phraseWords.length ? safeGetDistracts(phrase, nextWordIndex, studyTarget) : []);
    if (settings.hardMode) setTimeout(() => textInputRef.current?.focus(), 50);
  }, [fadeAnim, phrase, settings.hardMode, studyTarget]);

  useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    hydrationTrusted: attempts.hydrationTrusted,
    forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
    restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
    onRestored: retryCurrentLessonPhraseAfterSessionRuneForfeit,
  });

  const goNext = useCallback(async (_currentProgress?: string[]) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    // зачем (аудит кнопок R58 #27, 15.10): «Дальше» на последнем экране во время паузы перед итогом начинал НОВЫЙ проход (cellIndex по
    // кругу, статус «играем»), пока переход на итог ещё шёл. Во время завершения «Дальше» = пропустить паузу и открыть итог; если переход
    // уже идёт — повторный тап ничего не делает (с причиной в журнале).
    if (isCompletingRef.current) {
      if (finishPendingCompletionNow('next')) return;
      console.log('[LESSON-RESULT] next_ignored', JSON.stringify({ lessonId, reason: 'completion_navigation_in_flight' })); // guard-ok: ранний выход называет причину
      return;
    }

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
    try { await AsyncStorage.setItem(CELL_KEY, String(nextCell)); } catch (e) {
      DebugLogger.error('lesson1:npIdx', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    touchLessonScreenPrimed(lessonStorageId, { cell: nextCell, order: phraseOrderRef.current, progress, override: replayCell }, studyTargetRef.current);
  }, [finishPendingCompletionNow, cellIndex, progress, fadeAnim, LESSON_DATA, persistErrorReplayToStorage, lessonStorageId]);

  // CHANGE v5: rewritten for contraction branching using phraseWordIdx
  // Energy is only spent on mistakes — no gate here, users can always attempt answers
  const handleWordPress = useCallback((word: string) => {
    if (status === 'result') return;
    if (showNoEnergyModal) return;
    if (energyGateBlockedRef.current) {
      console.warn('[ENERGY-GATE] lesson1 tap blocked — энергия не списана, урок не начат');
      showEnergyEmptyFeedbackRef.current();
      return;
    }

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
    // зачем (аудит R58 #7, координатор 15.10): прежде ранний выход по lastOpenedSyncedRef глушил ВСЕ обновления после входа —
    // карточка «Продолжить» на Главной оставалась с прогрессом момента входа. Диск и отметка времени — один раз на урок,
    // а снимок в памяти и событие для живой Главной — на каждое изменение correctCount (дёшево: без диска и сети).
    const homeScore = (correctCount / 50 * 5).toFixed(1);
    if (!lastOpenedSyncedRef.current) {
      lastOpenedSyncedRef.current = true;
      void AsyncStorage.setItem(lastOpenedLessonKey(studyTarget), String(lessonId)).catch(noteSwallowedHandler('lesson1:useEffect.setItem_2'));
      recordHomeContinueLegacy(studyTarget); // зачем (P23): карточка «Продолжить» сравнивает время старого урока и занятия V2
    }
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
    AsyncStorage.setItem(todayKey, String(newCount)).catch(noteSwallowedHandler('lesson1:useCallback.setItem_6'));
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
            <PracticeStatePanel
              glass={glass}
              icon="cloud-offline-outline"
              testID="lesson1-remote-failed"
              message={triLang(lang, {
                ru: 'Не удалось загрузить французский урок',
                uk: 'Не вдалося завантажити французький урок',
                en: 'Couldn’t load the French lesson',
                es: 'No se pudo cargar la lección de francés',
                'pt-BR': 'Não foi possível carregar a aula de francês',
                vi: 'Không tải được bài học tiếng Pháp',
                id: 'Pelajaran bahasa Prancis gagal dimuat',
                tr: 'Fransızca ders yüklenemedi',
                pl: 'Nie udało się załadować lekcji francuskiego',
              })}
              action={{
                label: triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }),
                icon: 'refresh',
                onPress: () => setRemoteFrenchLessonReloadNonce((value) => value + 1),
              }}
            />
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
            <PracticeStatePanel
              glass={glass}
              icon="cloud-offline-outline"
              testID="lesson1-french-pack-blocked"
              title={triLang(lang, {
                ru: 'Французский пакет не загружен',
                uk: 'Французький пакет не завантажено',
                en: 'French pack not loaded',
                es: 'El paquete de francés no está cargado',
                'pt-BR': 'O pacote de francês não foi carregado',
                vi: 'Gói tiếng Pháp chưa được tải',
                id: 'Paket bahasa Prancis belum dimuat',
                tr: 'Fransızca paketi yüklenmedi',
                pl: 'Pakiet francuski nie został załadowany',
              })}
              message={triLang(lang, {
                ru: 'Сейчас недоступно. Попробуй загрузить ещё раз.',
                uk: 'Зараз недоступно. Спробуй завантажити ще раз.',
                en: 'Unavailable right now. Try loading again.',
                es: 'No disponible ahora. Prueba a cargar de nuevo.',
                'pt-BR': 'Indisponível agora. Tente carregar de novo.',
                vi: 'Hiện không khả dụng. Hãy tải lại.',
                id: 'Belum tersedia. Coba muat lagi.',
                tr: 'Şu an kullanılamıyor. Yeniden yüklemeyi dene.',
                pl: 'Teraz niedostępne. Spróbuj wczytać ponownie.',
              })}
              action={{
                label: triLang(lang, { ru: 'К урокам', uk: 'До уроків', en: 'To lessons', es: 'A lecciones', 'pt-BR': 'Para aulas', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derslere', pl: 'Do lekcji' }),
                onPress: () => { markNextNavigationAsReplace(); router.replace('/lessons_list' as any); },
              }}
            />
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
            topicLessonId={activeTopicLessonId}
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
            attemptsRemaining={attempts.state.remainingAttempts}
            attemptsEnergy={attempts}
            practiceRunesEarned={practiceRunes.runes}
            runeFlightOriginRef={runeFlight.originRef}
            runeFlightCounterRef={runeFlight.counterRef}
            progress={progress}
            totalCells={effectiveTotal}
            comboCount={comboCount}
            showTapHint={showTapHint}
            setShowTapHint={setShowTapHint}
            phraseWordIdx={phraseWordIdx}
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
            realPhraseIdx={(() => { const order = phraseOrderRef.current; const cell = overridePhraseCell ?? cellIndex; if (order.length === 0) return cell % (LESSON_DATA?.length || 1); return order[cell] ?? order[cell % order.length]; })()}
            studyTarget={studyTarget}
            onReplayPhraseAudio={replayResultPhraseAudio}
            reviewPhrases={reviewPhrases}
            onPlayReviewAudio={onPlayReviewAudio}
            toastAnim={toastAnim}
            from={from}
                onHeaderBack={requestLessonExit}
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
        {runeFlight.flight && (
          <CoinRewardFlight
            key={runeFlight.flight.key}
            from={runeFlight.flight.from}
            to={runeFlight.flight.to}
            count={runeFlight.flight.count}
            onDone={runeFlight.clearFlight}
          />
        )}
        {ComboMomentLayer ? <ComboMomentLayer comboCount={comboCount} /> : null}
      </ScreenGradient>
    </TouchableWithoutFeedback>
    {momentsV3 && exitSheetMounted ? (
      <Suspense fallback={null}>
        <LessonExitSheet lang={lang} visible={exitSheetOpen} energyNote={!testerEnergyDisabled} onContinue={closeExitSheet} onLeave={confirmLessonExit} />
      </Suspense>
    ) : null}
    <NoEnergyModal variant="learn"
      visible={showNoEnergyModal}
      activity="classic_lesson"
      onClose={closeNoEnergyModal}
      onBeforeOpenPremium={resetNoEnergyModal}
      onGotIt={dismissEnergyModal}
      paywallContext="no_energy"
    />
    </>
  );
}

// зачем (граница доступа, аудит R58 #24): прямая ссылка lesson1?combo= без Plus не показывает комбо — см. combo_lesson_gate.tsx
export default withComboPlusGate(withLessonRuntimeAccessBoundary(LessonScreen));
