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
import { ThemeMode } from '../constants/theme';
import { isCorrectAnswer, normalize } from '../constants/contractions';
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
import { logLessonComplete } from './firebase';
import { useEnergy } from '../components/EnergyContext';
import { getErrorTrapsByIndex } from './error_traps/index';
import { findAllExplanations } from './feedback_engine';
import { ALL_LESSONS_RU, ALL_LESSONS_UK, getLessonData, getLessonEncouragementScreens, getLessonIntroScreens } from './lesson_data_all';
import LessonIntroScreens from './lesson_intro_screens';
import { getMedalTier, getProgressCellColor, loadMedalInfo } from './medal_utils';
import type { MedalTier } from './medal_utils';
import type { FeedbackResult } from './types/feedback';

import { ENERGY_MESSAGES_RU, ENERGY_MESSAGES_UK } from './lesson1_energy';
import {
  getContractionFor,
  getPerWordDistracts,
  getPhraseWords, lookupContraction,
  makeExpansionOptions,
} from './lesson1_smart_options';
import { tryUnlockNextLesson } from './lesson_lock_system';
import { getPhraseCard } from './lesson_cards_data';

// Strip special article/marker symbols from display text
// /the/ → the, «a» → a, «-» → (empty, skip)
const stripMarkers = (word: string): string =>
  word.replace(/^\/|\/$/g, '').replace(/«-»/g, '').replace(/[«»]/g, '').replace(/[.!?,;]+$/, '').trim();

// Safe wrapper: if getPerWordDistracts returns [] (phraseWordIdx out of bounds),
// fall back to the last valid position so buttons never disappear mid-phrase
const safeGetDistracts = (phrase: any, wordIndex: number): string[] => {
  const result = getPerWordDistracts(phrase, wordIndex);
  if (result.length > 0) return result;
  // Walk back to find the last position with data
  for (let i = wordIndex - 1; i >= 0; i--) {
    const fallback = getPerWordDistracts(phrase, i);
    if (fallback.length > 0) return fallback;
  }
  return result;
};

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
  showHints: boolean;
}
const DEFAULT_SETTINGS: Settings = {
  speechRate: 1.0, voiceOut: true, autoAdvance: false,
  hardMode: false, autoCheck: false, haptics: true, showHints: true,
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
  lang: 'ru' | 'uk';
  emptyTapFlash: boolean;
  setEmptyTapFlash: (val: boolean) => void;
  shouldShake: boolean;
  setShouldShake: (val: boolean) => void;
  showNoEnergyModal: boolean;
  setShowNoEnergyModal: (val: boolean) => void;
  recoveryTimeText: string;
  setFailedTapCount: (val: number | ((prev: number) => number)) => void;
  checkAnswer: (answer: string) => Promise<void>;
  contrExpanded: string[] | null;
  onFiftyFifty: () => void;
  fiftyFiftyUsedToday: number;
  dimmedWords: Set<string>;
}

const LessonContent = React.memo(function LessonContent({
  showIntroScreens,
  setShowIntroScreens,
  onIntroDone,
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
  recoveryTimeText,
  setFailedTapCount,
  checkAnswer,
  contrExpanded,
  onFiftyFifty,
  fiftyFiftyUsedToday,
  dimmedWords,
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
          <Text style={{ color: t.textPrimary, fontSize: f.h2 + 6, marginBottom: compact ? 12 : 20, textAlign: 'center' }} numberOfLines={3} adjustsFontSizeToFit>{(lang === 'uk' ? phrase?.ukrainian : phrase?.russian) || 'Loading...'}</Text>

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
                      const first = cleaned[0].charAt(0).toUpperCase() + cleaned[0].slice(1);
                      const rest = cleaned.slice(1).map(w => w.toLowerCase() === 'i' ? 'I' : w.toLowerCase()).join(' ');
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
                      const expandedWords = normalize(selectedWords.join(' ')).split(/\s+/);
                      const correctWords = (phrase?.english || '').split(/\s+/).map((w: string) => w.replace(/[.!?,;]+$/, '').toLowerCase());
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
              <TouchableOpacity activeOpacity={0.75} onPress={() => { hapticTap(); Speech.stop(); Speech.speak(phrase.english, { language: 'en-US', rate: settings.speechRate }); }} style={{ backgroundColor: t.correctBg, padding: 15, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: t.correct, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                  uk={(ALL_LESSONS_UK[lessonId] || []).find((p: any) => p.english === phrase.english)?.ukrainian ?? phrase.ukrainian}
                  source="lesson" sourceId={String(lessonId)}
                />
              </TouchableOpacity>

              {(() => {
                const _ld = getLessonData(lessonId);
                const phraseIdx = _ld && _ld.length > 0 ? (cellIndex % _ld.length) + 1 : cellIndex + 1;
                const card = getPhraseCard(lessonId, phraseIdx);
                const hasCard = card && (card.correctRu || card.correctUk) && settings.showHints;
                if (hasCard) {
                  const mainText = wasWrong
                    ? (lang === 'uk' ? card.wrongUk : card.wrongRu)
                    : (lang === 'uk' ? card.correctUk : card.correctRu);
                  const secretText = lang === 'uk' ? card.secretUk : card.secretRu;
                  return (
                    <View style={{ marginTop: 20 }}>
                      <View style={{
                        backgroundColor: wasWrong ? 'rgba(255,107,107,0.12)' : 'rgba(74,222,128,0.12)',
                        borderRadius: 14,
                        padding: 16,
                        marginBottom: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: wasWrong ? '#ff6b6b' : '#4ade80',
                      }}>
                        <Text style={{ color: wasWrong ? '#ff6b6b' : '#4ade80', fontSize: f.body, lineHeight: f.body * 1.6 }}>
                          {mainText}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: 'rgba(212,160,23,0.10)',
                        borderRadius: 14,
                        padding: 16,
                        borderLeftWidth: 3,
                        borderLeftColor: '#D4A017',
                      }}>
                        <Text style={{ color: '#D4A017', fontSize: f.body, lineHeight: f.body * 1.6 }}>
                          {secretText}
                        </Text>
                      </View>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: 36 }}
                    onPress={() => Speech.speak(phrase.english, { language: 'en-US', rate: settings.speechRate })}
                  >
                    <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: t.correct, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="volume-high" size={42} color={t.bgPrimary} />
                    </View>
                  </TouchableOpacity>
                );
              })()}

            </Animated.View>
          )}
        </ScrollView>

        {/* КНОПКИ СЛОВ — снаружи ScrollView, тап по любому месту работает */}
        {status === 'playing' && !settings.hardMode && (
          <Pressable
            onPress={handleBgTap}
            style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
              {shuffled.map((word, i) => {
                const phraseWordsList = phrase ? getPhraseWords(phrase.english) : [];
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
                  <Animated.View key={i} style={{
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
                      <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '500' }} adjustsFontSizeToFit numberOfLines={1}>{(() => { const w = stripMarkers(word); return w === 'I' ? 'I' : w.toLowerCase(); })()}</Text>
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
          {/* 50/50 Button — вместо Шпаргалки */}
          {!settings.hardMode && (
            (() => {
              const hintsLeft = Math.max(0, 3 - fiftyFiftyUsedToday);
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
                      <Text style={{ color: t.bgPrimary, fontSize: 10, fontWeight: '700', lineHeight: 12 }}>{hintsLeft}</Text>
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
          {!settings.hardMode && selectedWords.length > 0 && !settings.autoCheck && status === 'playing' && (
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
          <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }} onPress={() => { setShowNoEnergyModal(false); setFailedTapCount(0); }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 24, gap: 16, maxWidth: 300, width: '100%' }}>
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
                  {lang === 'uk' ? 'Зрозуміло' : 'Понятно'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
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
  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, formattedTime: energyFormattedTime, spendOne } = useEnergy();
  // Refs to avoid stale closures in useCallback (checkAnswer has [progress,...] deps, not energy)
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

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
  const [fiftyFiftyUsedToday, setFiftyFiftyUsedToday] = useState(0);
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
  const [failedTapCount, setFailedTapCount] = useState(0);
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
    if (showToBeHint && cellIndex < 2) {
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
      setShuffled(getPerWordDistracts(p, 0));
      setSelectedWords([]);
      setTypedText('');
      setPhraseWordIdx(0);
      setContrExpanded(null);
    }
  }, [cellIndex]);

  const loadData = async () => {
    try {
      // Intro screens disabled — always skip
      await AsyncStorage.setItem(`lesson${lessonId}_intro_shown`, 'true');

      // Проверяем тестерские функции
      const noLimits = await AsyncStorage.getItem('tester_no_limits');
      setTesterNoLimits(noLimits === 'true');
      // energy state comes from EnergyContext — no local load needed

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

      // Восстанавливаем позицию строго из CELL_KEY — каждый индикатор = конкретная фраза
      const startCell = ci !== null ? (parseInt(ci) || 0) : 0;

      // Подсказка (подсветка правильного слова) только для урока 1 при первом посещении
      if (lessonId === 1 && startCell === 0 && !sp) {
        setShowToBeHint(true);
      }
      setCellIndex(startCell);

      // Перемешиваем слова для стартовой фразы
      const startPhrase = LESSON_DATA[startCell % LESSON_DATA.length];
      setShuffled(getPerWordDistracts(startPhrase, 0));

      if (ss) {
        const loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(ss) };
        setSettings(loaded);
      }

      setInsufficientEnergy(false);

      // Загружаем счётчик подсказок 50/50 за сегодня
      const todayKey = `fifty_fifty_${new Date().toISOString().slice(0, 10)}`;
      const ffCount = await AsyncStorage.getItem(todayKey);
      setFiftyFiftyUsedToday(ffCount ? parseInt(ffCount, 10) : 0);
    } catch {}
  };

  const shuffleWords = (words: string[]) => setShuffled(words);

  const checkAnswer = useCallback(async (answer: string) => {
    if (!phrase) return;
    const isRight = isCorrectAnswer(answer, phrase.english, phrase.alternatives);
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
          ukPhrase?.ukrainian,
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
        try { await registerXP(xpAmount, 'lesson_answer', userNameRef.current, lang, lessonId); } catch {}
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
          if (success && currentEnergyRef.current - 1 === 0) {
            setTimeout(() => { setInsufficientEnergy(true); }, 1000);
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

    // СОХРАНЯЕМ СЛЕДУЮЩУЮ ПОЗИЦИЮ — строго +1, каждый индикатор = конкретная фраза
    try {
      const nextCell = (cellIndex + 1) % TOTAL;
      await AsyncStorage.setItem(CELL_KEY, String(nextCell));
    } catch {}
    setStatus('result');

    // ==================== NEW: Handle to-be hint and encouragement screens ====================
    if (isRight) {
      // Disable correct-word hint after first two tests
      if (cellIndex === 1) {
        setShowToBeHint(false);
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
        const didUnlock = await tryUnlockNextLesson(lessonId, finalScore);

        logLessonComplete(lessonId);
        router.replace({ pathname: '/lesson_complete', params: { id: lessonId, unlocked: didUnlock ? '1' : '0' } });
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
  // Energy is only spent on mistakes — no gate here, users can always attempt answers
  const handleWordPress = useCallback((word: string) => {
    if (status === 'result') return;

    const phraseWords = getPhraseWords(phrase?.english ?? '');
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
          setShuffled(safeGetDistracts(phrase, newIdx));
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

    // Check if user picked a contraction that covers current word + next word
    // e.g. expected "do" + "not" but user picked "don't" → skip "not"
    const currentExpected = phraseWords[phraseWordIdx] ?? '';
    const nextExpected = phraseWords[phraseWordIdx + 1] ?? '';
    const matchingContraction = getContractionFor(currentExpected, nextExpected);
    if (matchingContraction && word.toLowerCase() === matchingContraction.toLowerCase()) {
      // Contraction chosen — skip the next word (e.g. "not") and advance by 2
      const skipIdx = phraseWordIdx + 2;
      setPhraseWordIdx(skipIdx);
      if (skipIdx >= totalPhraseWords) {
        setShuffled([]);
        if (settings.autoCheck) checkAnswer(next.join(' '));
      } else {
        setShuffled(safeGetDistracts(phrase, skipIdx));
      }
      return;
    }

    // Regular word picked (or contraction picked directly)
    const newIdx = phraseWordIdx + 1;
    setPhraseWordIdx(newIdx);

    // Early completion: assembled answer already matches an alternative (e.g. optional word skipped)
    const assembled = next.join(' ');
    if (phrase?.alternatives && isCorrectAnswer(assembled, phrase.english, phrase.alternatives)) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(assembled);
      return;
    }

    if (newIdx >= totalPhraseWords) {
      setShuffled([]);
      if (settings.autoCheck) checkAnswer(next.join(' '));
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
      // Normal undo: pop last word, decrement phraseWordIdx
      const newSelected = selectedWords.slice(0, -1);
      // If the last word was a contraction that skipped 2 phrase words (e.g. "aren't" = "are"+"not"),
      // we need to step back 2 positions, not 1.
      const lastWord = selectedWords[selectedWords.length - 1] ?? '';
      const phraseWordsForUndo = getPhraseWords(phrase?.english ?? '');
      const twoWordContr = phraseWordIdx >= 2
        ? getContractionFor(phraseWordsForUndo[phraseWordIdx - 2] ?? '', phraseWordsForUndo[phraseWordIdx - 1] ?? '')
        : null;
      const wasSkip2 = twoWordContr != null && lastWord.toLowerCase() === twoWordContr.toLowerCase();
      const newPhraseIdx = Math.max(0, phraseWordIdx - (wasSkip2 ? 2 : 1));
      setSelectedWords(newSelected);
      setPhraseWordIdx(newPhraseIdx);
      // Check if last remaining word is expansion[0] of the contraction at newPhraseIdx
      // (happens when undoing the last expansion token, e.g. undoing "not" after "do")
      if (newSelected.length > 0) {
        const phraseWords = getPhraseWords(phrase?.english ?? '');
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
  const score = useMemo(() => Number((correctCount / TOTAL * 5).toFixed(1)), [correctCount, TOTAL]);

  // ── Medal tier change toast ──────────────────────────────────────────────────
  const prevMedalTierRef = useRef<MedalTier>('none');
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
    const prev = prevMedalTierRef.current;
    const current = getMedalTier(score);
    const tierOrder: MedalTier[] = ['none', 'bronze', 'silver', 'gold'];
    const prevIdx = tierOrder.indexOf(prev);
    const curIdx  = tierOrder.indexOf(current);
    if (curIdx !== prevIdx) {
      // Only show after at least a few answers to avoid toast on load
      if (correctCount > 0) {
        if (curIdx > prevIdx) showMedalToast(current, true);
        else showMedalToast(current, false);
      }
      prevMedalTierRef.current = current;
    }
  }, [score, correctCount, showMedalToast]);
  // ────────────────────────────────────────────────────────────────────────────

  // Жёлтая подсветка для поля ввода когда 0 слов + тап
  const [emptyTapFlash, setEmptyTapFlash] = useState(false);

  const handleBgTap = useCallback(() => {
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
    if (fiftyFiftyUsedToday >= 3 || !phrase) return;

    const phraseWordsList = getPhraseWords(phrase.english);
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
    // Затемняем половину неправильных, оставляя итого ~4 варианта
    const correct = shuffled.filter(isCorrect);
    const keepWrongCount = Math.max(0, 4 - correct.length);
    const shuffledWrong = [...wrong].sort(() => Math.random() - 0.5);
    const toDim = shuffledWrong.slice(keepWrongCount);

    setDimmedWords(new Set(toDim));

    const newCount = fiftyFiftyUsedToday + 1;
    setFiftyFiftyUsedToday(newCount);
    const todayKey = `fifty_fifty_${new Date().toISOString().slice(0, 10)}`;
    AsyncStorage.setItem(todayKey, String(newCount));
  }, [fiftyFiftyUsedToday, phrase, phraseWordIdx, shuffled, contrExpanded]);

  return (
    <TouchableWithoutFeedback onPress={settings.hardMode ? undefined : handleBgTap}>
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
            recoveryTimeText={recoveryTimeText}
            setFailedTapCount={setFailedTapCount}
            checkAnswer={checkAnswer}
            contrExpanded={contrExpanded}
            onFiftyFifty={handleFiftyFifty}
            fiftyFiftyUsedToday={fiftyFiftyUsedToday}
            dimmedWords={dimmedWords}
          />
        </SafeAreaView>

        {/* ── Medal tier toast ── */}
        {medalToast && (() => {
          const { tier, promoted } = medalToast;
          const MEDAL_COLORS: Record<MedalTier, string> = {
            none:   '#888',
            bronze: '#CD7F32',
            silver: '#A8A9AD',
            gold:   '#FFD700',
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
          const color  = MEDAL_COLORS[tier];
          const emoji  = MEDAL_EMOJI[tier];
          const labels = lang === 'uk' ? LABELS_UK[tier] : LABELS_RU[tier];
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
  );
}
