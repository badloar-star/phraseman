import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useAudio } from '../hooks/use-audio';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
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
import { triLang, type Lang } from '../constants/i18n';
import { getCardShadow, useTheme } from '../components/ThemeContext';
import { ThemeMode } from '../constants/theme';
import { isCorrectAnswer, normalize } from '../constants/contractions';
import { MOTION_SCALE } from '../constants/motion';
import { checkAchievements } from './achievements';
import { resetAndUpdateTaskProgress, updateMultipleTaskProgress } from './daily_tasks';
import { registerXP } from './xp_manager';
// [SRS] Модуль интервального повторения (active_recall.ts).
// recordMistake() вызывается при каждом неверном ответе в уроке.
// Фраза попадает в AsyncStorage ('active_recall_items') с алгоритмом SM-2:
//   interval=1 день, easeFactor=2.5. При повторных ошибках easeFactor снижается.
// Связь: review.tsx — getDueItems(..., { commitSessionOverflow: true }).
// Связь: home.tsx — countDueItemsToday() на бейдже.
import AddToFlashcard from '../components/AddToFlashcard';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import { hapticTap } from '../hooks/use-haptics';
import { recordMistake } from './active_recall';
import { logLessonComplete, logLessonStart, logLessonAbandoned, logLessonAnswer, logEnergyLimitHit } from './firebase';
import { trackLessonStart, trackLessonAbandoned, trackAnswer, trackEnergyHit } from './user_stats';
import { useEnergy } from '../components/EnergyContext';
import { getLessonData, getLessonEncouragementScreens, getLessonIntroScreens } from './lesson_data_all';
import { phraseAnswerAlternatives, phraseAnswerDisplayLine, phraseCanonicalAnswer, phrasePrimarySurface, phraseWordRowsForStudyTarget, ttsLocaleForStudyTarget } from './phrase_target_utils';
import type { StudyTargetLang } from './study_target_lang_dev';
import LessonIntroScreens from './lesson_intro_screens';
import { getMedalTier, getProgressCellColor, loadMedalInfo } from './medal_utils';
import type { MedalTier } from './medal_utils';

import { grammarHintLine, lessonEnergyMessages, phraseCardFace as pickPhraseCardFace } from './lesson_locale_utils';
import {
  getContractionFor,
  getPerWordDistracts,
  getPhraseWords, lookupContraction,
  makeExpansionOptions,
} from './lesson1_smart_options';
import { emitAppEvent } from './events';
import { tryUnlockNextLesson } from './lesson_lock_system';
import {
  getInitialOrderAndCell,
  getInitialProgressArray,
  isLessonScreenPrimedThisSession,
  touchLessonScreenPrimed,
} from './lesson_screen_bootstrap';
import { getBonusHintsToday } from './level_gift_system';
import { getPhraseCard } from './lesson_cards_data';
import ReportErrorButton from '../components/ReportErrorButton';

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
  const rows = phraseWordRowsForStudyTarget(phrase, studyTarget);
  if (rows.length > 0) {
    return rows.map((w: any) => w.correct ?? w.text);
  }
  return getPhraseWords(phrase?.english ?? '');
};

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

interface Settings {
  speechRate: number; voiceOut: boolean;
  autoAdvance: boolean; hardMode: boolean; autoCheck: boolean; haptics: boolean;
  showHints: boolean;
}
const DEFAULT_SETTINGS: Settings = {
  speechRate: 0.9, voiceOut: true, autoAdvance: false,
  hardMode: false, autoCheck: false, haptics: true, showHints: true,
};


// ── Гексагональный прогресс-индикатор ────────────────────────────────────────
// LessonHexProgress is now imported from components/LessonHexProgress.tsx

// ── Модалка "Конец цикла урока" — показывается один раз за всю жизнь ──────────
export const CYCLE_END_SHOWN_KEY = 'lesson_cycle_end_intro_shown';

function LessonCycleEndModal({ visible, hasErrors, lang, t, f, onClose }: {
  visible: boolean;
  hasErrors: boolean;
  lang: Lang;
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
  const isES = lang === 'es';
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

// ── Золотая кнопка Премиум (для модала об окончании энергии) ─────────────────
function PremiumGoldButton({ lang, f, router, onDismiss }: { lang: Lang; f: any; router: any; onDismiss: () => void }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const sparkleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: MOTION_SCALE.nudge, duration: 720, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 720, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();
    sparkleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    sparkleLoopRef.current.start();
    return () => {
      pulseLoopRef.current?.stop();
      sparkleLoopRef.current?.stop();
      pulseAnim.stopAnimation();
      sparkleAnim.stopAnimation();
    };
  }, [pulseAnim, sparkleAnim]);

  const sparkleOpacity1 = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] });
  const sparkleOpacity2 = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] });

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', marginTop: 2 }}>
      <TouchableOpacity
        onPress={() => { onDismiss(); router.push({ pathname: '/premium_modal', params: { context: 'no_energy' } } as any); }}
        activeOpacity={0.85}
        style={{
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#B8860B',
          borderWidth: 1.5,
          borderColor: '#FFD700',
          shadowColor: '#FFD700',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 8,
          flexDirection: 'row',
          gap: 6,
        }}
      >
        <Animated.Text style={{ fontSize: 14, opacity: sparkleOpacity1 }}>✨</Animated.Text>
        <Text style={{ color: '#FFFFFF', fontSize: f.body, fontWeight: '800', letterSpacing: 0.5 }}>
          {lang === 'uk' ? '👑 Отримати Преміум' : lang === 'es' ? '👑 Conseguir Premium' : '👑 Получить Премиум'}
        </Text>
        <Animated.Text style={{ fontSize: 14, opacity: sparkleOpacity2 }}>✨</Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * LessonContent: Renders the lesson UI (intro screens, encouragement, or main lesson).
 * Extracted as separate component to ensure SafeAreaView receives exactly ONE child.
 */
interface LessonContentProps {
  showIntroScreens: boolean;
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
  showNoEnergyModal: boolean;
  setShowNoEnergyModal: (val: boolean) => void;
  energyMsg: string;
  onDismissEnergyModal: () => void;
  recoveryTimeText: string;
  energyFormattedTime: string;
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
  showNoEnergyModal,
  setShowNoEnergyModal,
  energyMsg,
  onDismissEnergyModal,
  recoveryTimeText,
  energyFormattedTime,
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
  const { speak: speakAudio } = useAudio();
  const { width: screenW, height: screenH } = useWindowDimensions();


  // [ARROW] Анимированная стрелка над прогресс-баром
  const arrowAnim  = useRef(new Animated.Value(0)).current;
  const [barWidth, setBarWidth] = useState(0);
  const prevDisplayCell = useRef(displayCell);

  const [grammarHintText, setGrammarHintText] = useState<string | null>(null);
  const grammarHintAnim = useRef(new Animated.Value(0)).current;
  const grammarHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseTokens = phrase ? getPhraseTokens(phrase, studyTarget) : [];
  const selectedAnswer = selectedWords.join(' ');
  const gradeTarget = phrase ? phraseCanonicalAnswer(phrase, studyTarget) : '';
  const gradeAlts = phrase ? phraseAnswerAlternatives(phrase, studyTarget) : undefined;
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
      const text = grammarHintLine(lang, hint);
      Animated.timing(grammarHintAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
        setGrammarHintText(text);
        Animated.timing(grammarHintAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        grammarHintTimerRef.current = setTimeout(() => {
          Animated.timing(grammarHintAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setGrammarHintText(null));
        }, 10000);
      });
      return;
    }
  }, [lessonId, lang]);

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

  // Show intro screens on first visit
  if (showIntroScreens) {
    return (
      <LessonIntroScreens
        introScreens={getLessonIntroScreens(lessonId)}
        lessonId={lessonId}
        onComplete={onIntroDone}
      />
    );
  }

  // Main lesson UI
  if (!phrase) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.textPrimary }}>Loading lesson...</Text>
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ХЕДЕР */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12 }}>
        {/* Кнопка назад совмещена с названием урока — как на скриншоте */}
        <TouchableOpacity
          onPress={onHeaderBack}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 0.5, borderColor: t.border }}
        >
          <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {triLang(lang, { uk: 'Урок', ru: 'Урок', es: 'Lección' })} {lessonId}
          </Text>
        </TouchableOpacity>
        {/* Right side: energy icons + combo badge + stats */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSmallScreen ? 4 : 8 }}>
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
          {/* Stats row — XP toast floats absolutely over it to avoid pushing stats off-screen */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isSmallScreen ? 4 : 6 }}>
            {xpToastVisible && (
              <Animated.Text style={{ position: 'absolute', right: 0, bottom: '100%', color: (themeMode === 'ocean' || themeMode === 'sakura') ? '#92400E' : '#F5A623', fontWeight: '800', fontSize: isSmallScreen ? 10 : f.label, opacity: xpToastAnim, transform: [{ translateY: xpToastAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: status === 'result' ? 100 : 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={handleBgTap} style={{ width: '100%' }}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, marginBottom: compact ? 12 : 20, textAlign: 'center' }} numberOfLines={3} adjustsFontSizeToFit>{(lang === 'uk' ? (phrase?.ukrainian || phrase?.russian) : lang === 'es' ? (phrase?.spanish ?? phrase?.russian) : phrase?.russian) || triLang(lang, { ru: 'Загрузка...', uk: 'Завантаження...', es: 'Cargando...' })}</Text>

          <View style={{ minHeight: 60, borderBottomWidth: 1, borderBottomColor: emptyTapFlash ? '#F5A623' : t.border, marginBottom: compact ? 12 : 20, justifyContent: 'center', backgroundColor: emptyTapFlash ? 'rgba(245,166,35,0.08)' : 'transparent', borderRadius: emptyTapFlash ? 8 : 0 } as any}>
            {settings.hardMode ? (
              /* Keep TextInput always mounted in hardMode — prevents keyboard slide animation between questions */
              <TextInput
                ref={textInputRef}
                style={{ color: t.textSecond, fontSize: f.h1, padding: 0, minHeight: 40, opacity: status === 'playing' ? 1 : 0 }}
                value={typedText}
                onChangeText={setTypedText}
                onSubmitEditing={handleTypedSubmit}
                placeholder={status === 'playing' ? s.lesson.typeHere : ''}
                placeholderTextColor={t.textGhost}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                editable={status === 'playing'}
              />
            ) : (
              <Text style={{ color: t.textSecond, fontSize: f.h1 }}>
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
                }{status !== 'result' && <Animated.Text style={{ color: t.textPrimary, opacity: cursorAnim }}>|</Animated.Text>}
              </Text>
            )}
          </View>

          </Pressable>
          {status === 'result' && (
            <Animated.View style={{ opacity: fadeAnim, width: '100%' }}>
              {wasWrong && (
                <View style={{ backgroundColor: t.wrongBg, padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: t.wrong }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {(() => {
                      const userAnswer = settings.hardMode ? typedText : selectedWords.join(' ');
                      // Normalize contractions, then strip «»/«-» article markers and filter empty tokens
                      const expandedWords = normalize(userAnswer).split(/\s+/).map(stripMarkers).filter(w => w.length > 0);
                      // Same treatment for correct answer
                      const correctWords = normalize(phraseCanonicalAnswer(phrase, studyTarget))
                        .split(/\s+/)
                        .map(stripMarkers)
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
              <TouchableOpacity activeOpacity={0.75} onPress={() => { hapticTap(); speakAudio(phrasePrimarySurface(phrase, studyTarget), settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget) }); }} style={{ backgroundColor: t.correctBg, padding: 15, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: t.correct, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: t.correct, fontSize: f.h1, flex: 1 }}>
                  {phraseAnswerDisplayLine(phrase, studyTarget, lang)}
                </Text>
                <AddToFlashcard
                  en={phrase.english}
                  ru={phrase.russian}
                  uk={phrase.ukrainian || phrase.russian}
                  source="lesson" sourceId={String(lessonId)}
                />
              </TouchableOpacity>

              <ReportErrorButton
                screen={`lesson_${lessonId}`}
                dataId={
                  phrase?.id != null && String(phrase.id).trim() !== ''
                    ? String(phrase.id)
                    : `lesson_${lessonId}_phrase_${realPhraseIdx + 1}`
                }
                dataText={[
                  `EN: ${phrase.english}`,
                  `RU: ${phrase.russian ?? ''}`,
                  phrase.ukrainian ? `UK: ${phrase.ukrainian}` : '',
                  phrase.spanish ? `ES: ${phrase.spanish}` : '',
                ].filter(Boolean).join('\n')}
                style={{ alignSelf: 'flex-end', marginTop: 4 }}
              />

              {(() => {
                const phraseIdx = realPhraseIdx + 1;
                const card = getPhraseCard(lessonId, phraseIdx);
                const hasCard =
                  card &&
                  (card.correctRu || card.correctUk || (card as { correctEs?: string }).correctEs) &&
                  settings.showHints;
                if (hasCard) {
                  const { main: mainText, secret: secretText } = pickPhraseCardFace(lang, card, wasWrong);
                  return (
                    <View style={{ marginTop: 20 }}>
                      <View style={{
                        backgroundColor: wasWrong
                          ? (themeMode === 'ocean' || themeMode === 'sakura' ? '#FFD6D6' : 'rgba(255,107,107,0.12)')
                          : (themeMode === 'ocean' || themeMode === 'sakura' ? '#C8F5D8' : 'rgba(74,222,128,0.12)'),
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: wasWrong ? '#E53935' : '#2E7D32',
                      }}>
                        <Text style={{ color: (themeMode === 'ocean' || themeMode === 'sakura') ? (wasWrong ? '#B71C1C' : '#1B5E20') : (wasWrong ? '#ff6b6b' : '#4ade80'), fontSize: f.body, lineHeight: f.body * 1.6, fontWeight: '500' }}>
                          {mainText}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: themeMode === 'ocean' || themeMode === 'sakura' ? '#FFF3C4' : 'rgba(212,160,23,0.10)',
                        borderRadius: 14,
                        padding: 16,
                        borderLeftWidth: 4,
                        borderLeftColor: '#F59E0B',
                      }}>
                        <Text style={{ color: (themeMode === 'ocean' || themeMode === 'sakura') ? '#92400E' : '#D4A017', fontSize: f.body, lineHeight: f.body * 1.6, fontWeight: '500' }}>
                          {secretText}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: 36 }}
                    onPress={() => speakAudio(phrasePrimarySurface(phrase, studyTarget), settings.speechRate, { language: ttsLocaleForStudyTarget(studyTarget) })}
                  >
                    <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: t.correct, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="volume-high" size={42} color={t.correctText} />
                    </View>
                  </TouchableOpacity>
                );
              })()}

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

        {/* КНОПКИ СЛОВ — снаружи ScrollView, тап по любому месту работает */}
        {status === 'playing' && !settings.hardMode && (
          <Pressable
            onPress={handleBgTap}
            style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
              {shuffled.map((word, i) => {
                const phraseWordsList = phrase ? getPhraseTokens(phrase, studyTarget) : [];
                const correctWord = phraseWordsList[phraseWordIdx] ?? null;
                const nextCorrectWord = phraseWordsList[phraseWordIdx + 1] ?? null;
                const validContraction = correctWord && nextCorrectWord
                  ? getContractionFor(correctWord, nextCorrectWord)
                  : null;
                const stripped = stripMarkers(word).toLowerCase();
                // In expansion mode (user picked "do" when expected "don't"), correct token = contrExpanded[0]
                const expansionCorrect = contrExpanded !== null && contrExpanded.length > 0
                  ? contrExpanded[0]
                  : null;
                const isCorrectOption = contrExpanded !== null
                  ? expansionCorrect != null && stripped === expansionCorrect.toLowerCase()
                  : correctWord != null && (
                    stripped === correctWord.toLowerCase() ||
                    (validContraction != null && stripped === validContraction.toLowerCase())
                  );
                const shouldShowHint = showToBeHint && cellIndex < 2 && isCorrectOption;
                const isDimmed = dimmedWords.has(word);

                return (
                  <Animated.View
                    key={`${phrase?.id ?? 'phrase'}-${phraseWordIdx}-${word}-${i}`}
                    style={{
                    width: '48%',
                    marginBottom: compact ? 7 : 10,
                    opacity: isDimmed ? 0.25 : (shouldShowHint ? hintPulseAnim : hintPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1] }))
                  }}>
                    <TouchableOpacity
                      style={{ width: '100%', backgroundColor: t.bgCard, paddingVertical: compact ? 9 : 14, alignItems: 'center', borderRadius: 12, borderWidth: themeMode === 'neon' ? 1 : 0.5, borderColor: t.border, ...getCardShadow(themeMode, t.glow) }}
                      onPress={() => {
                        if (isDimmed) return;
                        hapticTap();
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
                      }}
                      activeOpacity={isDimmed ? 1 : 0.7}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '500' }} adjustsFontSizeToFit numberOfLines={1}>{(() => { const w = stripMarkers(word); if (w === '') return s.lesson.noArticle; const cap = correctWord !== null && /^[A-Z]/.test(correctWord); return cap ? w.charAt(0).toUpperCase() + w.slice(1) : (w === 'I' ? 'I' : w.toLowerCase()); })()}</Text>
                    </TouchableOpacity>
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
            <Text style={{ color: t.textMuted, fontSize: f.label, minWidth: 34, textAlign: 'right' }}>{displayCell + 1}/{TOTAL}</Text>
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
                <TouchableOpacity
                  style={{ flex: 1, alignItems: 'center', opacity: canUse ? 1 : 0.35 }}
                  onPress={() => {
                    if (!canUse) return;
                    hapticTap();
                    onFiftyFifty();
                  }}
                >
                  <View style={{ position: 'relative' }}>
                    <Text style={{ color: canUse ? t.accent : t.textSecond, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>½</Text>
                    <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: canUse ? t.accent : t.textMuted, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: t.correctText, fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{hintsLeft}</Text>
                    </View>
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>50/50</Text>
                </TouchableOpacity>
              );
            })()
          )}

          {/* Theory Button */}
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => { hapticTap(); router.push({ pathname: '/lesson_help', params: { id: lessonId } }); }}>
            <Ionicons name="book-outline" size={26} color={t.textSecond} />
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>{s.lesson.theory}</Text>
          </TouchableOpacity>

          {/* Undo Button - всегда доступна когда есть выбранные слова или текст */}
          <TouchableOpacity
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
                <Ionicons name="play-forward" size={26} color={t.textSecond} />
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>{s.lesson.next}</Text>
              </>
            ) : (
              <>
                <Ionicons name="arrow-undo" size={26} color={t.textSecond} />
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>{s.lesson.undo}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Check Button - видна только когда все слова введены и autoCheck выключен */}
          {canManuallyCheckAnswer && (
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center' }}
              onPress={() => {
                if (!canManuallyCheckAnswer) return;
                hapticTap();
                checkAnswer(selectedAnswer);
              }}
            >
              <Ionicons name="checkmark-circle" size={26} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: f.label, marginTop: 4 }}>{s.lesson.check}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* No Energy Modal — блокирующий экран с кнопкой */}
        {showNoEnergyModal && (
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.72)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 28,
          }}>
            <View style={{
              backgroundColor: t.bgCard,
              borderRadius: 22,
              padding: 28,
              width: '100%',
              alignItems: 'center',
              gap: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 20,
            }}>
              <Text style={{ fontSize: 44 }}>⚡</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.title ?? 18, fontWeight: '700', textAlign: 'center' }}>
                {lang === 'uk' ? 'Енергія закінчилась' : lang === 'es' ? 'Se acabó la energía' : 'Энергия закончилась'}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center', lineHeight: 22 }}>
                {energyMsg}
              </Text>
              <TouchableOpacity
                onPress={onDismissEnergyModal}
                style={{
                  backgroundColor: t.accent ?? '#7C3AED',
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 40,
                  marginTop: 6,
                }}
              >
                <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '700' }}>
                  {lang === 'uk' ? 'Зрозуміло' : lang === 'es' ? 'Entendido' : 'Понятно'}
                </Text>
              </TouchableOpacity>
              <PremiumGoldButton lang={lang} f={f} router={router} onDismiss={onDismissEnergyModal} />
            </View>
          </View>
        )}

        {__DEV__ && (
          <TouchableOpacity
            style={{ position: 'absolute', bottom: 90, right: 12, backgroundColor: 'rgba(40,40,40,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, zIndex: 999 }}
            onPress={() => {
              const hint = GRAMMAR_HINTS[0];
              if (grammarHintTimerRef.current) clearTimeout(grammarHintTimerRef.current);
              const text = grammarHintLine(lang, hint);
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
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const router = useRouter();
  const { height: windowH, width: windowW } = useWindowDimensions();
  const compact = windowH < 780;
  const isSmallScreen = windowW < 380; // dynamic — recalculates on orientation change and accounts for safe area
  const { theme: t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const studyTargetRef = useRef(studyTarget);
  studyTargetRef.current = studyTarget;
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const lessonId = parseInt(id || '1', 10);
  const LESSON_KEY = `lesson${lessonId}_progress`;
  const CELL_KEY   = `lesson${lessonId}_cellIndex`;
  const ORDER_KEY  = `lesson${lessonId}_phraseOrder`;

  // Фильтруем только фразы с .words — словарные слова (без .words) не показываем в режиме кнопок
  const LESSON_DATA = getLessonData(lessonId).filter(p => p.words && p.words.length > 0);
  // Если в уроке меньше 50 фраз — не повторяем. effectiveTotal = реальное кол-во фраз.
  const effectiveTotal = Math.min(LESSON_DATA.length, TOTAL);
  const { startCell: initialStartCell, initialOrder: initialOrderFromPrime } = getInitialOrderAndCell(lessonId, LESSON_DATA.length, effectiveTotal);
  const { energy: currentEnergy, maxEnergy: currentMaxEnergy, isUnlimited: testerEnergyDisabled, formattedTime: energyFormattedTime, spendOne } = useEnergy();
  // Refs to avoid stale closures in useCallback (checkAnswer has [progress,...] deps, not energy)
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  const energyFormattedTimeRef = useRef(energyFormattedTime);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);
  useEffect(() => { energyFormattedTimeRef.current = energyFormattedTime; }, [energyFormattedTime]);

  // cellIndex — позиция в прогресс-баре (0..49), двигается строго по кругу
  const [cellIndex,    setCellIndex]    = useState(initialStartCell);
  const [status,       setStatus]       = useState<'playing' | 'result'>('playing');
  const [selectedWords,setSelectedWords]= useState<string[]>([]);
  const [shuffled,     setShuffled]     = useState<string[]>([]);
  const [progress,     setProgress]     = useState<string[]>(() => getInitialProgressArray(effectiveTotal, lessonId));
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
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
  const [showToBeHint, setShowToBeHint] = useState(false);
  // No energy modal after 3 failed taps
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false);
  // Та же идея, что NoEnergyModal: встроенная «энергия 0» → не дублировать тутором на главной
  useEffect(() => {
    if (!showNoEnergyModal) return;
    void AsyncStorage.setItem('energy_onboarding_shown', '1');
    emitAppEvent('bug_hunt_eligible_check');
  }, [showNoEnergyModal]);
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
  const isReplayRef        = useRef(false); // true если урок уже был пройден полностью
  const isCompletingRef    = useRef(false); // true пока идёт задержка перед переходом на lesson_complete
  const differentLessonTrackedRef = useRef(false); // засчитали different_lessons для этого урока сегодня

  // [IMMEDIATE ERROR REPLAY] Очередь ячеек с ошибками для повтора через 2-3 вопроса
  const errorQueueRef          = useRef<number[]>([]); // cellIndex ячеек где была ошибка
  const questionsSinceErrorRef = useRef(0);            // сколько вопросов прошло после добавления в очередь
  const [overridePhraseCell, setOverridePhraseCell] = useState<number | null>(null); // если задан — показываем эту фразу вместо текущей
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

  // Блокирующий модал при пустой энергии
  const [energyMsg, setEnergyMsg] = useState('');
  const isShowingEnergyFeedbackRef = useRef(false);
  const showEnergyEmptyFeedbackRef = useRef<() => void>(() => {});
  const showEnergyEmptyFeedback = useCallback(() => {
    if (isShowingEnergyFeedbackRef.current) return;
    isShowingEnergyFeedbackRef.current = true;
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 800);
    const messages = lessonEnergyMessages(lang);
    const msg = messages[Math.floor(Math.random() * messages.length)];
    setEnergyMsg(msg.replace('{time}', energyFormattedTimeRef.current || '...'));
    logEnergyLimitHit('lesson');
    trackEnergyHit().catch(() => {});
    setShowNoEnergyModal(true);
  }, [lang, setShouldShake, setShowNoEnergyModal]);
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
      router.replace('/(tabs)/home');
    }
  }, [router, from, lessonId]);

  const handleLessonHeaderBack = useCallback(() => {
    logLessonAbandoned(lessonId, cellIndex, 50);
    trackLessonAbandoned().catch(() => {});
    navigateUpFromLessonScreen();
  }, [lessonId, cellIndex, navigateUpFromLessonScreen]);

  // Android: системный «Назад» = тот же выход, что и кнопка (без дублей в стеке).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showNoEnergyModal) {
        setShowNoEnergyModal(false);
        isShowingEnergyFeedbackRef.current = false;
        return true;
      }
      handleLessonHeaderBack();
      return true;
    });
    return () => sub.remove();
  }, [showNoEnergyModal, handleLessonHeaderBack]);

  const dismissEnergyModal = useCallback(() => {
    setShowNoEnergyModal(false);
    isShowingEnergyFeedbackRef.current = false;
    navigateUpFromLessonScreen();
  }, [navigateUpFromLessonScreen, setShowNoEnergyModal]);
  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);

  // Проверяем энергию при входе — сразу, без задержки
  useEffect(() => {
    if (currentEnergy === 0 && !testerEnergyDisabled) {
      showEnergyEmptyFeedback();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (!introShownRaw && getLessonIntroScreens(lessonId).length > 0) {
        setShowIntroScreens(true);
        setLessonHydrated(true); // снимаем спиннер — рендерим интро поверх
      }

      // Проверяем тестерские функции
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      setTesterNoLimits(noLimits === 'true');
      // energy state comes from EnergyContext — no local load needed

      loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
      const [sp, ss, ci, savedOrder] = await Promise.all([
        AsyncStorage.getItem(LESSON_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(CELL_KEY),
        AsyncStorage.getItem(ORDER_KEY),
      ]);

      let restoredProgress = new Array(effectiveTotal).fill('empty');
      if (sp) {
        const p: string[] = JSON.parse(sp);
        if (p.length === effectiveTotal) restoredProgress = p;
      }
      setProgress(restoredProgress);

      // Синхронизируем prevMedalTierRef с реальным тиром восстановленного прогресса,
      // чтобы useEffect не показывал тост при открытии урока
      const restoredCorrect = restoredProgress.filter(p => p === 'correct' || p === 'replay_correct').length;
      const restoredScore = Number((restoredCorrect / effectiveTotal * 5).toFixed(1));
      prevMedalTierRef.current = getMedalTier(restoredScore);

      // Режим повтора: если все ячейки уже correct — крутим по кругу без автозавершения
      sessionAnswerCount.current = 0;
      isReplayRef.current = restoredProgress.every(x => x === 'correct');

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
      const startPhrase = order.length > 0
        ? LESSON_DATA[order[startCell % order.length]]
        : LESSON_DATA[startCell % LESSON_DATA.length];
      {
        const spWords = getPhraseTokens(startPhrase);
        let spIdx = 0;
        while (spIdx < spWords.length && isZeroArticlePosition(spWords, spIdx)) spIdx++;
        setShuffled(spIdx < spWords.length ? safeGetDistracts(startPhrase, spIdx) : []);
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
    } catch {
    } finally {
      setLessonHydrated(true);
    }
  };

  const shuffleWords = (words: string[]) => setShuffled(words);

  const checkAnswer = useCallback(async (answer: string) => {
    if (!phrase) return;
    // Блокируем ответ если энергия закончилась
    if (currentEnergyRef.current === 0 && !testerEnergyDisabledRef.current) {
      showEnergyEmptyFeedbackRef.current();
      return;
    }
    const isRight = isCorrectAnswer(answer, phrase.english, phrase.alternatives);
    logLessonAnswer(lessonId, isRight);
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
      // phrase.english — ключ (английская фраза, будет показана как ответ в review.tsx).
      // phrase.russian — подсказка (русский/украинский перевод, будет показан на лицевой стороне карточки).
      // lessonId — для фильтрации по уроку (getItemsByLesson) и отображения метки на карточке.
      // Если фраза уже есть в базе — errorCount++, interval сбрасывается к 1 дню.
      // Если фраза новая — добавляется с nextDue = завтра.
      {
        recordMistake(
          phrase.english,
          phrase.russian,
          lessonId,
          phrase.ukrainian,
          'lesson',
          phrase.spanish,
        );
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
      if (currentEnergyRef.current > 0 && !testerEnergyDisabledRef.current) {
        spendOneRef.current().then(success => {
          if (success) {
            updateMultipleTaskProgress([{ type: 'energy_spend', increment: 1 }]).catch(() => {});
            if (currentEnergyRef.current === 0) {
              setTimeout(() => { showEnergyEmptyFeedbackRef.current(); }, 1000);
            }
          }
        }).catch(() => {});
      }
    }

    setWasWrong(!isRight);
    setProgress(np);

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

    if (settings.voiceOut) {
      const st = studyTargetRef.current;
      speakAudio(phrasePrimarySurface(phrase, st), settings.speechRate, { language: ttsLocaleForStudyTarget(st) });
    }
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();

    const nextCell = (cellIndex + 1) % effectiveTotal;
    void AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np)).catch(() => {});
    void AsyncStorage.setItem(CELL_KEY, String(nextCell)).catch(() => {});
    touchLessonScreenPrimed(lessonId, { cell: nextCell, order: phraseOrderRef.current, progress: np });

    // Проверяем завершение урока
    // В режиме повтора требуем минимум TOTAL ответов в сессии,
    // чтобы не сразу закрыться если все ячейки изначально были correct
    if (sessionAnswerCount.current >= effectiveTotal) {
      sessionAnswerCount.current = 0; // сброс для следующего повтора
      isReplayRef.current = true;
      isCompletingRef.current = true;
      // Сбрасываем сохранённый порядок — следующий проход получит новый shuffle
      phraseOrderRef.current = [];
      AsyncStorage.removeItem(ORDER_KEY).catch(() => {});
      setTimeout(async () => {
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
        updateMultipleTaskProgress([{ type: 'lesson_complete', increment: 1 }]).catch(() => {});

        const navigate = () =>
          router.replace({ pathname: '/lesson_complete', params: { id: lessonId, unlocked: didUnlock ? '1' : '0' } });

        // Показываем модалку "конец цикла" один раз за всю жизнь игрока
        const alreadyShown = await AsyncStorage.getItem(CYCLE_END_SHOWN_KEY);
        if (!alreadyShown) {
          await AsyncStorage.setItem(CYCLE_END_SHOWN_KEY, '1');
          const hasErrors = np.some(x => x !== 'correct' && x !== 'replay_correct');
          cycleEndCallbackRef.current = navigate;
          setCycleEndHasErrors(hasErrors);
          setShowCycleEndModal(true);
        } else {
          navigate();
        }
        } catch {
          // Fallback: navigate to lesson_complete even if tracking fails
          router.replace({ pathname: '/lesson_complete', params: { id: String(lessonId), unlocked: '0' } });
        }
      }, 1500);
      return;
    }

    if (settings.autoAdvance && isRight) {
      autoTimer.current = setTimeout(() => goNext(np), 4000);
    }
  }, [progress, cellIndex, phrase, settings, fadeAnim, lessonId, overridePhraseCell]);

  const goNext = useCallback(async (_currentProgress?: string[]) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    stopAudio(); // отменяем любой in-flight createAsync или TTS предыдущей фразы

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

    // Фраза для следующей позиции (с учётом replay и shuffle)
    const phraseCell = replayCell ?? nextCell;
    const nextPhrase = getPhraseForCell(phraseCell);
    {
      const npWords = getPhraseTokens(nextPhrase);
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
      setShuffled(npIdx < npWords.length ? safeGetDistracts(nextPhrase, npIdx) : []);
    }

    // Сохраняем позицию
    try { await AsyncStorage.setItem(CELL_KEY, String(nextCell)); } catch {}
    touchLessonScreenPrimed(lessonId, { cell: nextCell, order: phraseOrderRef.current, progress });
  }, [cellIndex, progress, fadeAnim, LESSON_DATA, stopAudio]);

  // CHANGE v5: rewritten for contraction branching using phraseWordIdx
  // Energy is only spent on mistakes — no gate here, users can always attempt answers
  const handleWordPress = useCallback((word: string) => {
    if (status === 'result') return;
    if (showNoEnergyModal) return;

    const phraseWords = getPhraseTokens(phrase);
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
          setShuffled(safeGetDistracts(phrase, newIdx));
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
      // User picked expanded[0] (e.g. "do" when expected "don't") — enter expansion mode
      setSelectedWords(next);
      setContrExpanded(contrEntry.slice(1)); // ["not"]
      // phraseWordIdx stays — still on the same original contraction word
      setShuffled(makeExpansionOptions(contrEntry[1]));
      return;
    }

    // Check if user picked a contraction that covers current word + next word
    // e.g. expected "do" + "not" but user picked "don't" → skip "not"
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
        setShuffled(safeGetDistracts(phrase, skipIdx));
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
    if (phrase?.alternatives && isCorrectAnswer(assembled, phrase.english, phrase.alternatives)) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(assembled);
      return;
    }

    if (newIdx >= totalPhraseWords) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(newSel.join(' '));
    } else {
      setShuffled(safeGetDistracts(phrase, newIdx));
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
        setShuffled(safeGetDistracts(phrase, phraseWordIdx));
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
      const phraseWordsForUndo = getPhraseTokens(phrase);
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
        const phraseWords = getPhraseTokens(phrase);
        const origWord = phraseWords[newPhraseIdx];
        const prevContr = lookupContraction(origWord ?? '');
        if (prevContr && newSelected[newSelected.length - 1].toLowerCase() === prevContr[0].toLowerCase()) {
          // Restore expansion mode — user needs to pick the second token again
          setContrExpanded(prevContr.slice(1));
          setShuffled(makeExpansionOptions(prevContr[1]));
          return;
        }
      }
      setShuffled(safeGetDistracts(phrase, newPhraseIdx));
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
    if (status === 'result') { goNext(); return; } // тап на результате → следующая фраза
    // Скрываем хинт при первом тапе
    if (showTapHint) setShowTapHint(false);
    if (selectedWords.length === 0) {
      // 0 слов — мигаем жёлтым, не считаем за ошибку
      setEmptyTapFlash(true);
      setTimeout(() => setEmptyTapFlash(false), 700);
    } else {
      // ≥1 слово — сразу проверяем (неполный ответ = неправильный)
      checkAnswer(selectedWords.join(' '));
    }
  }, [status, settings.hardMode, showTapHint, selectedWords, goNext, checkAnswer]);

  const handleFiftyFifty = useCallback(() => {
    if (fiftyFiftyUsedToday >= 3 + bonusHints || !phrase) return;

    const phraseWordsList = getPhraseTokens(phrase);
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
        <SafeAreaView style={{ flex: 1 }}>
          {!lessonHydrated ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={t.accent} />
            </View>
          ) : (
          <LessonContent
            showIntroScreens={showIntroScreens}
            setShowIntroScreens={setShowIntroScreens}
            onIntroDone={async () => {
              await AsyncStorage.setItem(`lesson${lessonId}_intro_shown`, 'true');
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
            showNoEnergyModal={showNoEnergyModal}
            setShowNoEnergyModal={setShowNoEnergyModal}
            energyMsg={energyMsg}
            onDismissEnergyModal={dismissEnergyModal}
            recoveryTimeText={recoveryTimeText}
            energyFormattedTime={energyFormattedTime}
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
          )}
        </SafeAreaView>

        {/* ── Medal tier toast ── */}
        {medalToast && (() => {
          const { tier, promoted } = medalToast;
          const isLight = themeMode === 'ocean' || themeMode === 'sakura';
          const MEDAL_COLORS: Record<MedalTier, string> = {
            none:   isLight ? '#555'     : '#888',
            bronze: isLight ? '#7B3F00'  : '#CD7F32',
            silver: isLight ? '#3A3A3A'  : '#A8A9AD',
            gold:   t.gold,   // всегда тематический: тёмный на светлых, яркий на тёмных
          };
          const MEDAL_EMOJI: Record<MedalTier, string> = {
            none: '',
            bronze: '🥉',
            silver: '🥈',
            gold:   '🥇',
          };
          const LABELS_RU: Record<MedalTier, { up: string; upSub: string; down: string; downSub: string }> = {
            none:   { up: '', upSub: '', down: '', downSub: '' },
            bronze: { up: 'Есть Бронза!', upSub: 'Так держать — продолжай!', down: 'Оценка упала...', downSub: 'Ещё пара верных ответов' },
            silver: { up: 'Уже Серебро!', upSub: 'Отличный результат!', down: 'Соскользнул до Бронзы', downSub: 'Давай — вернём Серебро!' },
            gold:   { up: 'Золото! Идеально!', upSub: 'Урок пройден на отлично!', down: 'Слетело Золото...', downSub: 'Нужен ещё один круг' },
          };
          const LABELS_UK: Record<MedalTier, { up: string; upSub: string; down: string; downSub: string }> = {
            none:   { up: '', upSub: '', down: '', downSub: '' },
            bronze: { up: 'Є Бронза!', upSub: 'Так тримати — продовжуй!', down: 'Оцінка впала...', downSub: 'Ще пара вірних відповідей' },
            silver: { up: 'Вже Срібло!', upSub: 'Чудовий результат!', down: 'Злетів до Бронзи', downSub: 'Давай — повернемо Срібло!' },
            gold:   { up: 'Золото! Ідеально!', upSub: 'Урок пройдено на відмінно!', down: 'Злетіло Золото...', downSub: 'Потрібне ще одне коло' },
          };
          const LABELS_ES: Record<MedalTier, { up: string; upSub: string; down: string; downSub: string }> = {
            none:   { up: '', upSub: '', down: '', downSub: '' },
            bronze: { up: '¡Bronce!', upSub: 'Sigue así.', down: 'Bajaste de nivel…', downSub: 'Un par de aciertos más' },
            silver: { up: '¡Plata!', upSub: 'Muy bien.', down: 'Pasaste a bronce', downSub: 'Vamos por la plata otra vez' },
            gold:   { up: '¡Oro!', upSub: 'Lección excelente.', down: 'Perdiste el oro…', downSub: 'Hace falta otra ronda' },
          };
          const color  = MEDAL_COLORS[tier];
          const emoji  = MEDAL_EMOJI[tier];
          const labels =
            lang === 'uk' ? LABELS_UK[tier] : lang === 'es' ? LABELS_ES[tier] : LABELS_RU[tier];
          const title  = promoted ? labels.up   : labels.down;
          const sub    = promoted ? labels.upSub : labels.downSub;
          return (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute', bottom: 120, left: 24, right: 24,
                opacity: medalToastAnim,
                transform: [
                  { translateY: medalToastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                  { scale: medalToastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                ],
                backgroundColor: t.bgCard,
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                borderWidth: 2,
                borderColor: color + '99',
                shadowColor: color,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 12,
              }}
            >
              <Text style={{ fontSize: 36 }}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color, fontSize: 17, fontWeight: '900', marginBottom: 2 }}>{title}</Text>
                <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: '500' }}>{sub}</Text>
              </View>
            </Animated.View>
          );
        })()}
        {/* ────────────────────── */}
      </ScreenGradient>
    </TouchableWithoutFeedback>
    <LessonCycleEndModal
      visible={showCycleEndModal}
      hasErrors={cycleEndHasErrors}
      lang={lang}
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
