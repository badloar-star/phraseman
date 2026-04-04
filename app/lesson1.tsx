import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import ScreenGradient from '../components/ScreenGradient';
import { getCardShadow, useTheme } from '../components/ThemeContext';
import { isCorrectAnswer } from '../constants/contractions';
import { checkAchievements } from './achievements';
import { resetAndUpdateTaskProgress, updateMultipleTaskProgress } from './daily_tasks';
import { registerXP } from './xp_manager';
// [SRS] Модуль интервального повторения (active_recall.ts).
// recordMistake() вызывается при каждом неверном ответе в уроке.
// Фраза попадает в AsyncStorage ('active_recall_items') с алгоритмом SM-2:
//   interval=1 день, easeFactor=2.5. При повторных ошибках easeFactor снижается.
// Связь: review.tsx читает эти данные через getDueItems() и показывает карточки.
// Связь: home.tsx показывает счётчик getDueItems().length на главном экране.
import AddToFlashcard from '../components/AddToFlashcard';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import { hapticTap } from '../hooks/use-haptics';
import { recordMistake } from './active_recall';
import { checkAndRecover, spendEnergy } from './energy_system';
import { getErrorTrapsByIndex } from './error_traps/index';
import { findAllExplanations } from './feedback_engine';
import { ALL_LESSONS_RU, ALL_LESSONS_UK, getLessonData, getLessonEncouragementScreens, getLessonIntroScreens } from './lesson_data_all';
import LessonIntroScreens from './lesson_intro_screens';
import { getProgressCellColor, loadMedalInfo } from './medal_utils';
import type { FeedbackResult } from './types/feedback';

import { ENERGY_MESSAGES_RU, ENERGY_MESSAGES_UK } from './lesson1_energy';
import {
  getPerWordDistracts,
  getPhraseWords, lookupContraction,
  makeExpansionOptions,
} from './lesson1_smart_options';
import { tryUnlockNextLesson } from './lesson_lock_system';

let SpeechRec: any = null;
let tapHintShownThisSession = false;
try {
  SpeechRec = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  if (!SpeechRec) SpeechRec = null;
} catch { SpeechRec = null; }
const VOICE_OK = SpeechRec !== null;


const TOTAL = 50;
const SETTINGS_KEY = 'user_settings';

interface Settings {
  speechRate: number; voiceOut: boolean;
  autoAdvance: boolean; hardMode: boolean; autoCheck: boolean; haptics: boolean;
}
const DEFAULT_SETTINGS: Settings = {
  speechRate: 1.0, voiceOut: true, autoAdvance: false,
  hardMode: false, autoCheck: false, haptics: true,
};


// ── Гексагональный прогресс-индикатор ────────────────────────────────────────
// LessonHexProgress is now imported from components/LessonHexProgress.tsx

/**
 * LessonContent: Renders the lesson UI (intro screens, encouragement, or main lesson).
 * Extracted as separate component to ensure SafeAreaView receives exactly ONE child.
 */
interface LessonContentProps {
  showIntroScreens: boolean;
  setShowIntroScreens: (val: boolean) => void;
  onIntroDone: () => void;
  showEncouragementScreen: boolean;
  setShowEncouragementScreen: (val: boolean) => void;
  lessonId: number;
  // All the main lesson UI props
  compact: boolean;
  phrase: any;
  selectedWords: string[];
  status: 'playing' | 'result';
  feedbackResult: FeedbackResult | null;
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
  progress: string[];
  comboCount: number;
  showTapHint: boolean;
  setShowTapHint: (val: boolean) => void;
  showToBeHint: boolean;
  hintPulseAnim: Animated.Value;
  wasWrong: boolean;
  textInputRef: React.RefObject<TextInput>;
  settings: any;
  router: any;
  s: any;
  t: any;
  f: any;
  themeMode: string;
  lang: 'ru' | 'uk';
  emptyTapFlash: boolean;
  setEmptyTapFlash: (val: boolean) => void;
  shouldShake: boolean;
  setShouldShake: (val: boolean) => void;
  showNoEnergyModal: boolean;
  setShowNoEnergyModal: (val: boolean) => void;
  recoveryTimeText: string;
  setFailedTapCount: (val: (prev: number) => number) => void;
  checkAnswer: (answer: string) => Promise<void>;
}

const LessonContent = React.memo(function LessonContent({
  showIntroScreens,
  setShowIntroScreens,
  onIntroDone,
  showEncouragementScreen,
  setShowEncouragementScreen,
  lessonId,
  compact,
  phrase,
  selectedWords,
  status,
  feedbackResult,
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
  progress,
  comboCount,
  showTapHint,
  setShowTapHint,
  showToBeHint,
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
  recoveryTimeText,
  setFailedTapCount,
  checkAnswer,
}: LessonContentProps) {

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

  // Show encouragement screen between phrase groups
  if (showEncouragementScreen) {
    return (
      <LessonIntroScreens
        introScreens={getLessonEncouragementScreens(lessonId)}
        lessonId={lessonId}
        onComplete={() => setShowEncouragementScreen(false)}
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ХЕДЕР */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12 }}>
        {/* Кнопка назад совмещена с названием урока — как на скриншоте */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 0.5, borderColor: t.border }}
        >
          <Ionicons name="chevron-back" size={18} color={t.textPrimary} />
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {lang === 'uk' ? 'Урок' : 'Урок'} {lessonId}
          </Text>
        </TouchableOpacity>
        {/* Right side: energy icons + combo badge + stats */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Energy icons at top */}
          <View style={{ paddingVertical: 8 }}>
            <LessonEnergyLightning energyCount={currentEnergy} maxEnergy={5} shouldShake={shouldShake} />
          </View>

          {comboCount >= 3 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FF9500', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11 }}>🔥</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: f.label }}>×{comboCount >= 5 ? '3' : '2'}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: t.gold, fontSize: f.label, fontWeight: '700' }}>★{score}</Text>
            <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '700' }}>●{correctCount}</Text>
            <Text style={{ color: t.wrong, fontSize: f.label, fontWeight: '700' }}>●{wrongCount}</Text>
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
          <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, marginBottom: compact ? 12 : 20, textAlign: 'center' }} numberOfLines={3} adjustsFontSizeToFit>{phrase?.russian || 'Loading...'}</Text>

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
                  ? (selectedWords[0].charAt(0).toUpperCase() + selectedWords[0].slice(1)
                    + (selectedWords.length > 1 ? ' ' + selectedWords.slice(1).map(w => w.toLowerCase() === 'i' ? 'I' : (w[0] !== w[0].toLowerCase() ? w : w.toLowerCase())).join(' ') : ''))
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
                    {selectedWords.map((word, i) => {
                      const correctWord = phrase.english.split(/\s+/)[i]?.toLowerCase();
                      const isWrong = word.toLowerCase() !== correctWord;
                      return (
                        <Text key={i} style={{
                          color: isWrong ? t.wrong : t.textPrimary,
                          fontWeight: isWrong ? '700' : '500',
                          fontSize: f.h1,
                        }}>
                          {word}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: t.correctBg, padding: 15, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: t.correct, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: t.correct, fontSize: f.h1, flex: 1 }}>{
                  /[.?!]$/.test(phrase.english) ? phrase.english
                  : phrase.russian?.endsWith('?') ? phrase.english + '?'
                  : phrase.russian?.endsWith('!') ? phrase.english + '!'
                  : phrase.russian?.endsWith('.') ? phrase.english + '.'
                  : phrase.english
                }</Text>
                <AddToFlashcard
                  en={phrase.english}
                  ru={(ALL_LESSONS_RU[lessonId] || []).find((p: any) => p.english === phrase.english)?.russian ?? phrase.russian}
                  uk={(ALL_LESSONS_UK[lessonId] || []).find((p: any) => p.english === phrase.english)?.russian ?? phrase.russian}
                  source="lesson" sourceId={String(lessonId)}
                />
              </View>

              <TouchableOpacity
                style={{ alignSelf: 'center', marginTop: 36 }}
                onPress={() => Speech.speak(phrase.english, { language: 'en-US', rate: settings.speechRate })}
              >
                <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: t.correct, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="volume-high" size={42} color={t.bgPrimary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>

        {/* КНОПКИ СЛОВ — снаружи ScrollView, тап по любому месту работает */}
        {status === 'playing' && (
          <Pressable
            onPress={handleBgTap}
            style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
              {shuffled.map((word, i) => {
                const isToBeVerb = ['am', 'is', 'are', 'am not', 'is not', 'are not', "isn't", "aren't"].includes(word.toLowerCase());
                const shouldShowHint = showToBeHint && cellIndex === 0 && isToBeVerb;

                return (
                  <Animated.View key={i} style={{
                    width: '48%',
                    marginBottom: compact ? 7 : 10,
                    opacity: shouldShowHint ? hintPulseAnim : hintPulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1] })
                  }}>
                    <TouchableOpacity
                      style={{ width: '100%', backgroundColor: t.bgCard, paddingVertical: compact ? 9 : 14, alignItems: 'center', borderRadius: 12, borderWidth: themeMode === 'neon' ? 1 : 0.5, borderColor: t.border, ...getCardShadow(themeMode, t.glow) }}
                      onPress={() => { hapticTap(); if (showTapHint) setShowTapHint(false); handleWordPress(word); }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '500' }} adjustsFontSizeToFit numberOfLines={1}>{word === 'I' ? 'I' : (word[0] !== word[0].toLowerCase() ? word : word.toLowerCase())}</Text>
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
            <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <View key={i} style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: getProgressCellColor(progress[i], passCount, t, i === cellIndex),
                }} />
              ))}
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.label, minWidth: 34, textAlign: 'right' }}>{correctCount}/{TOTAL}</Text>
          </View>
        </View>

        {/* ФУТЕР */}
        <View style={{ flexDirection: 'row', paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: t.border }}>
          {/* Hint Button */}
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => { hapticTap(); router.push({ pathname: '/hint', params: { id: lessonId } }); }}>
            <Ionicons name="list" size={26} color={t.textSecond} />
            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 4 }}>{s.lesson.cheat}</Text>
          </TouchableOpacity>

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
          {!settings.hardMode && shuffled.length === 0 && selectedWords.length > 0 && !settings.autoCheck && status === 'playing' && (
            <TouchableOpacity
              style={{ flex: 1, alignItems: 'center' }}
              onPress={() => {
                hapticTap();
                checkAnswer(selectedWords.join(' '));
              }}
            >
              <Ionicons name="checkmark-circle" size={26} color={t.correct} />
              <Text style={{ color: t.correct, fontSize: f.label, marginTop: 4 }}>{s.lesson.check}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* No Energy Modal */}
        <Modal transparent animationType="fade" visible={showNoEnergyModal} onRequestClose={() => setShowNoEnergyModal(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setShowNoEnergyModal(false)}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 24, gap: 16, maxWidth: 300 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', textAlign: 'center' }}>
                  {lang === 'uk' ? '❤️ Ти на висоті!' : '❤️ Ты на высоте!'}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 20, textAlign: 'center' }}>
                  {lang === 'uk'
                    ? ENERGY_MESSAGES_UK[Math.floor(Math.random() * ENERGY_MESSAGES_UK.length)]?.replace('{time}', recoveryTimeText) || ''
                    : ENERGY_MESSAGES_RU[Math.floor(Math.random() * ENERGY_MESSAGES_RU.length)]?.replace('{time}', recoveryTimeText) || ''
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowNoEnergyModal(false);
                    setFailedTapCount(0);
                  }}
                  style={{ backgroundColor: t.accent, paddingVertical: 12, borderRadius: 8, marginTop: 8 }}
                >
                  <Text style={{ color: t.bgPrimary, fontSize: f.body, fontWeight: '600', textAlign: 'center' }}>
                    {lang === 'uk' ? 'Зрозумів' : 'Понял'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
    </KeyboardAvoidingView>
  );
});

export default function LessonScreen() {
  const router = useRouter();
  const { height: windowH } = useWindowDimensions();
  const compact = windowH < 780; // dynamic — recalculates on orientation change and accounts for safe area
  const { theme: t , f, themeMode } = useTheme();
  const { s, lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const LESSON_KEY = `lesson${lessonId}_progress`;
  const CELL_KEY   = `lesson${lessonId}_cellIndex`;

  const LESSON_DATA = getLessonData(lessonId);

  // cellIndex — позиция в прогресс-баре (0..49), двигается строго по кругу
  const [cellIndex,    setCellIndex]    = useState(0);
  const [status,       setStatus]       = useState<'playing' | 'result'>('playing');
  const [selectedWords,setSelectedWords]= useState<string[]>([]);
  const [shuffled,     setShuffled]     = useState<string[]>([]);
  const [progress,     setProgress]     = useState<string[]>(new Array(TOTAL).fill('empty'));
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const [wasWrong,     setWasWrong]     = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null);
  const [typedText,    setTypedText]    = useState('');
  const [isListening,  setIsListening]  = useState(false);
  const [showTapHint,  setShowTapHint]  = useState(false);
  // CHANGE v5: contraction branching state
  const [phraseWordIdx, setPhraseWordIdx] = useState(0);        // position in original phrase words
  const [contrExpanded, setContrExpanded] = useState<string[] | null>(null); // pending expansion tokens
  const correctStreakRef = useRef(0);  // для задания correct_streak + combo badge
  const todayAnswersRef  = useRef(0);  // для задания total_answers
  const userNameRef      = useRef<string | null>(null); // кешируем имя чтобы не читать AsyncStorage на каждый ответ
  // [COMBO] Отображаемое значение комбо для UI-бейджа. Обновляется в setState.
  const [comboCount, setComboCount] = useState(0);
  const [passCount, setPassCount]   = useState(0);
  const [insufficientEnergy, setInsufficientEnergy] = useState(false);
  const [showEnergyModal, setShowEnergyModal] = useState(false);
  const [currentEnergy, setCurrentEnergy] = useState(5); // для отображения молний
  const [shouldShake, setShouldShake] = useState(false); // Trigger shake animation when energy is empty
  const [testerNoLimits, setTesterNoLimits] = useState(false); // Тестерская функция - без ограничений
  // ==================== NEW: Intro & Encouragement Screens ====================
  const [showIntroScreens, setShowIntroScreens] = useState(false);
  const [showEncouragementScreen, setShowEncouragementScreen] = useState(false);
  const [showToBeHint, setShowToBeHint] = useState(false);
  // No energy modal after 3 failed taps
  const [failedTapCount, setFailedTapCount] = useState(0);
  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false);
  const [recoveryTimeText, setRecoveryTimeText] = useState('');

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const cursorAnim  = useRef(new Animated.Value(1)).current;
  const hintPulseAnim = useRef(new Animated.Value(0.4)).current;
  const autoTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textInputRef = useRef<any>(null);
  const voiceResultSub    = useRef<any>(null);
  const voiceErrorSub     = useRef<any>(null);
  const voiceEndSub       = useRef<any>(null);
  const sessionAnswerCount = useRef(0);   // кол-во ответов в текущей сессии
  const isReplayRef        = useRef(false); // true если урок уже был пройден полностью

  // Фраза определяется ТОЛЬКО позицией ячейки — строго цикличная привязка
  const phrase = LESSON_DATA && LESSON_DATA.length > 0 ? LESSON_DATA[cellIndex % LESSON_DATA.length] : null;

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

  // CRITICAL: Ensure hardMode is always false to keep word buttons visible
  useEffect(() => {
    if (settings.hardMode) {
      setSettings(prev => ({ ...prev, hardMode: false }));
    }
  }, [settings.hardMode]);

  useEffect(() => {
    loadData();
    // Кешируем имя один раз при монтировании — избегаем async lookup на каждый ответ
    AsyncStorage.getItem('user_name').then(n => { userNameRef.current = n; });
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      voiceResultSub.current?.remove();
      voiceErrorSub.current?.remove();
      voiceEndSub.current?.remove();
    };
  }, [lang]);

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
        if (ss) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(ss) });
      });
    }, [])
  );

  // Pulsing animation for to-be hint (only on first phrase of lesson 1)
  useEffect(() => {
    if (showToBeHint && cellIndex === 0) {
      Animated.loop(
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
      ).start();
    } else {
      hintPulseAnim.setValue(0.4);
    }
  }, [showToBeHint, cellIndex]);

  // Reset failed tap counter when energy recovers or phrase changes
  useEffect(() => {
    if (currentEnergy > 0) {
      setFailedTapCount(0);
    }
  }, [currentEnergy]);

  useEffect(() => {
    setFailedTapCount(0);
    // Перезагружаем доступные кнопки при смене фразы/ячейки
    if (status === 'playing') {
      const p = LESSON_DATA[cellIndex % LESSON_DATA.length];
      setShuffled(getPerWordDistracts(p, phraseWordIdx));
      setSelectedWords([]);
      setTypedText('');
      setPhraseWordIdx(0);
      setContrExpanded(null);
    }
  }, [cellIndex]);

  const loadData = async () => {
    try {
      // ==================== NEW: Check intro screens ====================
      const introShown = await AsyncStorage.getItem(`lesson${lessonId}_intro_shown`);
      if (!introShown) {
        setShowIntroScreens(true);
        return; // Don't load lesson yet, show intro first
      }

      // Проверяем тестерскую функцию "Без ограничений"
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      setTesterNoLimits(noLimits === 'true');

      // Проверяем энергию ПЕРЕД началом урока (только если НЕ включена тестерская функция без ограничений)
      if (noLimits !== 'true') {
        const energyState = await checkAndRecover();
        // Инициализируем энергию для отображения молний
        setCurrentEnergy(energyState.current);
      } else {
        // Если включена функция без ограничений, показываем полную энергию
        setCurrentEnergy(5);
      }

      // ==================== NEW: Initialize to-be hint for phrase 1 ====================
      setShowToBeHint(true);

      loadMedalInfo(lessonId).then(info => setPassCount(info.passCount));
      const [sp, ss, ci] = await Promise.all([
        AsyncStorage.getItem(LESSON_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(CELL_KEY),
      ]);

      let restoredProgress = new Array(TOTAL).fill('empty');
      if (sp) {
        const p: string[] = JSON.parse(sp);
        if (p.length === TOTAL) restoredProgress = p;
      }
      setProgress(restoredProgress);

      // Режим повтора: если все ячейки уже correct — крутим по кругу без автозавершения
      sessionAnswerCount.current = 0;
      isReplayRef.current = restoredProgress.every(x => x === 'correct');

      // Восстанавливаем позицию ячейки
      // Если сохранена — используем её, но проверяем что ячейка ещё не отвечена
      // Если нет — ищем первую не-correct ячейку
      let startCell = 0;
      if (ci !== null) {
        const saved = parseInt(ci) || 0;
        // Если эта ячейка уже правильно отвечена — находим следующую не-correct
        if (restoredProgress[saved] === 'correct' || restoredProgress[saved] === 'replay_correct') {
          const nextNotCorrect = restoredProgress.findIndex((x, i) => i > saved && x !== 'correct' && x !== 'replay_correct');
          startCell = nextNotCorrect >= 0 ? nextNotCorrect : saved;
        } else {
          startCell = saved;
        }
      } else {
        // Первый запуск — найти первую не-correct ячейку
        const firstNotCorrect = restoredProgress.findIndex(x => x !== 'correct');
        startCell = firstNotCorrect >= 0 ? firstNotCorrect : 0;
      }
      setCellIndex(startCell);

      // Перемешиваем слова для стартовой фразы
      const startPhrase = LESSON_DATA[startCell % LESSON_DATA.length];
      setShuffled(getPerWordDistracts(startPhrase, 0));

      if (ss) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(ss), hardMode: false };
        setSettings(loaded);
      }

      setInsufficientEnergy(false);
    } catch {}
  };

  const shuffleWords = (words: string[]) => setShuffled(words);

  const checkAnswer = useCallback(async (answer: string) => {
    if (!phrase) return;
    const isRight = isCorrectAnswer(answer, phrase.english);
    const np = [...progress];

    // КЛЮЧЕВАЯ ЛОГИКА:
    // Правильный ответ → ячейка зеленеет
    // Неправильный ответ → ячейка краснеет
    //   В режиме повтора (isReplay) ошибка может перекрыть зелёную ячейку → оценка падает
    sessionAnswerCount.current += 1;
    if (isRight) {
      // В режиме повтора правильные ответы — синие (replay_correct)
      np[cellIndex] = isReplayRef.current ? 'replay_correct' : 'correct';
    } else {
      // Ошибка всегда перезаписывает ячейку красной (даже если была зелёной)
      np[cellIndex] = 'wrong';
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
        const ruData = ALL_LESSONS_RU[lessonId] || [];
        const ukData = ALL_LESSONS_UK[lessonId] || [];
        const ruPhrase = ruData.find(p => p.english === phrase.english);
        const ukPhrase = ukData.find(p => p.english === phrase.english);
        recordMistake(
          phrase.english,
          ruPhrase?.russian ?? phrase.russian,
          lessonId,
          ukPhrase?.russian,
        );
      }
    }

    // Триггеры ежедневных заданий + XP
    if (isRight) {
      correctStreakRef.current += 1;
      todayAnswersRef.current += 1;
      setComboCount(correctStreakRef.current);
      updateMultipleTaskProgress([
        { type: 'correct_streak' },
        { type: 'lesson_no_mistakes' },
        { type: 'total_answers' },
        { type: 'daily_active' },
      ]);
      // Начисляем XP: 5 базовых × комбо-множитель (за серию без ошибок подряд внутри урока)
      const comboM = correctStreakRef.current >= 25 ? 3.0
        : correctStreakRef.current >= 15 ? 2.5
        : correctStreakRef.current >= 10 ? 2.0
        : correctStreakRef.current >= 5  ? 1.5
        : 1.0;
      const xpAmount = Math.round(5 * comboM);
      
      if (userNameRef.current) {
        await registerXP(xpAmount, 'lesson_answer', userNameRef.current, lang, lessonId);
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

      // При ОШИБКЕ: тратим энергию (пишем в AsyncStorage)
      if (currentEnergy > 0) {
        spendEnergy(1).then(success => {
          if (success) {
            setCurrentEnergy(prev => {
              const newEnergy = Math.max(0, prev - 1);
              if (newEnergy === 0) {
                setTimeout(() => { setInsufficientEnergy(true); }, 1000);
              }
              return newEnergy;
            });
          }
        }).catch(() => {});
      }
    }

    setWasWrong(!isRight);
    // ВСЕГДА показываем карточку объяснения — для правильных и неправильных ответов
    const userAnswer = settings.hardMode ? typedText : selectedWords.join(' ');
    const traps = getErrorTrapsByIndex(lessonId, cellIndex);
    const feedback = findAllExplanations(userAnswer, phrase.english, traps);
    setFeedbackResult(feedback);

    setProgress(np);

    if (!isRight && settings.haptics) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }

    try { await AsyncStorage.setItem(LESSON_KEY, JSON.stringify(np)); } catch {}

    // СОХРАНЯЕМ РЕЗУЛЬТАТ СРАЗУ при правильном ответе — автоматический переход к следующей фразе
    if (isRight) {
      try {
        // Находим следующую ячейку и сохраняем её как текущую позицию
        let nextCell = (cellIndex + 1) % TOTAL;
        const isDone = (x: string) => x === 'correct' || x === 'replay_correct';
        const hasNonDone = np.some(x => !isDone(x));
        if (hasNonDone) {
          let attempts = 0;
          while (isDone(np[nextCell]) && attempts < TOTAL) {
            nextCell = (nextCell + 1) % TOTAL;
            attempts++;
          }
        }
        // Сохраняем nextCell сразу — результат уже зафиксирован
        await AsyncStorage.setItem(CELL_KEY, String(nextCell));
      } catch {}
    }
    setStatus('result');

    // ==================== NEW: Handle to-be hint and encouragement screens ====================
    if (isRight) {
      // Disable to-be hint after phrase 1
      if (cellIndex === 0) {
        setShowToBeHint(false);
      }

      // Show encouragement screen after phrase 5
      if (cellIndex === 4) {
        setTimeout(() => {
          setShowEncouragementScreen(true);
        }, 1500);
      }
    }

    if (settings.voiceOut) {
      Speech.speak(phrase.english, { rate: settings.speechRate, language: 'en-US' });
    }
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();

    // Проверяем завершение урока
    // В режиме повтора требуем минимум TOTAL ответов в сессии,
    // чтобы не сразу закрыться если все ячейки изначально были correct
    const allCorrect = np.every(x => x === 'correct' || x === 'replay_correct');
    if (allCorrect && sessionAnswerCount.current >= TOTAL) {
      sessionAnswerCount.current = 0; // сброс для следующего повтора
      isReplayRef.current = true;
      setTimeout(async () => {
        // Получаем финальную оценку урока перед переходом на lesson_complete
        const correct = np.filter(x => x === 'correct' || x === 'replay_correct').length;
        let finalScore = parseFloat((correct / TOTAL * 5).toFixed(1));

        // Если включен режим "Без ограничений", даём 5 баллов автоматически
        const noLimits = await AsyncStorage.getItem('tester_no_limits');
        if (noLimits === 'true') {
          finalScore = 5;
        }

        // Пытаемся разблокировать следующий урок
        await tryUnlockNextLesson(lessonId, finalScore);

        router.replace({ pathname: '/lesson_complete', params: { id: lessonId } });
      }, 1500);
      return;
    }

    if (settings.autoAdvance && isRight) {
      autoTimer.current = setTimeout(() => goNext(np), 4000);
    }
  }, [progress, cellIndex, phrase, settings, fadeAnim, lessonId]);

  const goNext = useCallback(async (_currentProgress?: string[]) => {
    if (autoTimer.current) clearTimeout(autoTimer.current);

    // Уроки зациклены: всегда переходим на следующий вопрос по кругу
    const nextCell = (cellIndex + 1) % TOTAL;

    setCellIndex(nextCell);
    setStatus('playing');
    setSelectedWords([]);
    setTypedText('');
    setWasWrong(false);
    setFeedbackResult(null);
    setPhraseWordIdx(0);    // CHANGE v5: reset contraction branching
    setContrExpanded(null); // CHANGE v5
    fadeAnim.setValue(0);
    if (settings.hardMode) setTimeout(() => textInputRef.current?.focus(), 50);

    // Фраза для следующей ячейки
    const nextPhrase = LESSON_DATA[nextCell % LESSON_DATA.length];
    setShuffled(getPerWordDistracts(nextPhrase, 0));

    // Сохраняем позицию
    try { await AsyncStorage.setItem(CELL_KEY, String(nextCell)); } catch {}
  }, [cellIndex, progress, fadeAnim, LESSON_DATA]);

  // CHANGE v5: rewritten for contraction branching using phraseWordIdx
  const handleWordPress = useCallback((word: string) => {
    if (status === 'result') return;

    // Check if energy is empty - show shake animation instead of proceeding (but skip if tester has no limits)
    if (currentEnergy === 0 && !testerNoLimits) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 300);

      // Track failed taps and show modal after 3rd attempt
      setFailedTapCount(prev => {
        const newCount = prev + 1;
        if (newCount === 3) {
          // Get recovery time and show modal
          (async () => {
            const { getTimeUntilNextRecovery, formatTimeUntilRecovery } = await import('./energy_system');
            const timeMs = await getTimeUntilNextRecovery();
            if (timeMs !== null && timeMs > 0) {
              const formatted = formatTimeUntilRecovery(timeMs);
              setRecoveryTimeText(formatted);
              setShowNoEnergyModal(true);
            }
          })();
        }
        return newCount;
      });

      return;
    }

    const phraseWords = getPhraseWords(phrase.english);
    const totalPhraseWords = phraseWords.length;
    const next = [...selectedWords, word];
    setSelectedWords(next);

    // Expansion mode: collecting the second token of a contraction (e.g. "not" after "do")
    if (contrExpanded !== null && contrExpanded.length > 0) {
      const remaining = contrExpanded.slice(1);
      if (remaining.length === 0) {
        // All expansion tokens collected — advance to next phrase word
        const newIdx = phraseWordIdx + 1;
        setContrExpanded(null);
        setPhraseWordIdx(newIdx);
        if (newIdx >= totalPhraseWords) {
          setShuffled([]);
          if (settings.autoCheck) checkAnswer(next.join(' '));
        } else {
          setShuffled(getPerWordDistracts(phrase, newIdx));
        }
      } else {
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
      setContrExpanded(contrEntry.slice(1)); // ["not"]
      // phraseWordIdx stays — still on the same original contraction word
      setShuffled(makeExpansionOptions(contrEntry[1]));
      return;
    }

    // Regular word picked (or contraction picked directly)
    const newIdx = phraseWordIdx + 1;
    setPhraseWordIdx(newIdx);
    if (newIdx >= totalPhraseWords) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(next.join(' '));
    } else {
      setShuffled(getPerWordDistracts(phrase, newIdx));
    }
  }, [status, currentEnergy, testerNoLimits, selectedWords, phrase, phraseWordIdx, contrExpanded, settings.autoCheck, checkAnswer]);

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
        setShuffled(getPerWordDistracts(phrase, phraseWordIdx));
        return;
      }
      // Normal undo: pop last word, decrement phraseWordIdx
      const newSelected = selectedWords.slice(0, -1);
      const newPhraseIdx = Math.max(0, phraseWordIdx - 1);
      setSelectedWords(newSelected);
      setPhraseWordIdx(newPhraseIdx);
      // Check if last remaining word is expansion[0] of the contraction at newPhraseIdx
      // (happens when undoing the last expansion token, e.g. undoing "not" after "do")
      if (newSelected.length > 0) {
        const phraseWords = getPhraseWords(phrase.english);
        const origWord = phraseWords[newPhraseIdx];
        const prevContr = lookupContraction(origWord ?? '');
        if (prevContr && newSelected[newSelected.length - 1].toLowerCase() === prevContr[0].toLowerCase()) {
          // Restore expansion mode — user needs to pick the second token again
          setContrExpanded(prevContr.slice(1));
          setShuffled(makeExpansionOptions(prevContr[1]));
          return;
        }
      }
      setShuffled(getPerWordDistracts(phrase, newPhraseIdx));
    }
  }, [status, settings.hardMode, typedText, selectedWords, contrExpanded, phrase, phraseWordIdx]);

  const handleVoice = async () => {
    if (!VOICE_OK) { alert(lang === 'uk' ? 'Потребує EAS Build' : 'Требует EAS Build'); return; }
    if (isListening) { SpeechRec.stop(); setIsListening(false); return; }
    // Удаляем предыдущие слушатели перед добавлением новых
    voiceResultSub.current?.remove();
    voiceErrorSub.current?.remove();
    try {
      const { granted } = await SpeechRec.requestPermissionsAsync();
      if (!granted) return;
      setIsListening(true);
      SpeechRec.start({ lang: 'en-US', interimResults: false });
      voiceResultSub.current = SpeechRec.addListener('result', (e: any) => {
        // expo-speech-recognition: results[i] = { transcript, confidence }, not nested array
        const txt = (e.results?.[0]?.transcript ?? e.results?.[0]?.[0]?.transcript ?? '') as string;
        setIsListening(false);
        voiceEndSub.current?.remove();
        if (txt) checkAnswer(txt);
      });
      voiceErrorSub.current = SpeechRec.addListener('error', () => setIsListening(false));
      voiceEndSub.current   = SpeechRec.addListener('end',   () => setIsListening(false));
    } catch { setIsListening(false); }
  };

  const correctCount = useMemo(() => progress.filter(p => p === 'correct' || p === 'replay_correct').length, [progress]);
  const wrongCount   = useMemo(() => progress.filter(p => p === 'wrong').length, [progress]);
  const score = useMemo(() => (correctCount / TOTAL * 5).toFixed(1), [correctCount, TOTAL]);

  // Жёлтая подсветка для поля ввода когда 0 слов + тап
  const [emptyTapFlash, setEmptyTapFlash] = useState(false);

  const handleBgTap = useCallback(() => {
    if (status === 'result') { goNext(); return; } // тап на результате → следующая фраза
    if (settings.hardMode) return; // hard mode — кнопка/enter клавиатуры
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

  return (
    <TouchableWithoutFeedback onPress={handleBgTap}>
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <LessonContent
            showIntroScreens={showIntroScreens}
            setShowIntroScreens={setShowIntroScreens}
            onIntroDone={async () => {
              await AsyncStorage.setItem(`lesson${lessonId}_intro_shown`, 'true');
              setShowIntroScreens(false);
              loadData();
            }}
            showEncouragementScreen={showEncouragementScreen}
            setShowEncouragementScreen={setShowEncouragementScreen}
            lessonId={lessonId}
            compact={compact}
            phrase={phrase}
            selectedWords={selectedWords}
            status={status}
            feedbackResult={feedbackResult}
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
            progress={progress}
            comboCount={comboCount}
            showTapHint={showTapHint}
            setShowTapHint={setShowTapHint}
            showToBeHint={showToBeHint}
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
            recoveryTimeText={recoveryTimeText}
            setFailedTapCount={setFailedTapCount}
            checkAnswer={checkAnswer}
          />
        </SafeAreaView>
      </ScreenGradient>
    </TouchableWithoutFeedback>
  );
}
