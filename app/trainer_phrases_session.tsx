// ═══════════════════════════════════════════════════════════════════════════
// trainer_phrases_session.tsx — Сессия фраз
//
// Два режима чередуются:
//   word_bank  — сборка фразы из перемешанных слов (как в уроке)
//   fill_gap   — вставь пропущенное слово (то слово где была ошибка)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reanimated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TapScale from '../components/TapScale';
import ReportErrorButton from '../components/ReportErrorButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import BouncyScrollView from '../components/BouncyScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import SpeakingButton from '../components/SpeakingButton';
import { trackEvent } from './analytics';
import ScreenGradient from '../components/ScreenGradient';
import { TrainerLoadingView, TrainerErrorView } from '../components/TrainerLoadStates';
import ContentWrap from '../components/ContentWrap';
import CompassDepthSurface from '../components/CompassDepthSurface';
import GradientProgressBar from '../components/GradientProgressBar';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { statsThemeAccent, statsThemeSoftBg } from '../constants/statsThemeChrome';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { useSpeakAnswer } from '../hooks/use-speak-answer';
import { useStudyTarget } from '../components/StudyTargetContext';
import {
  getCachedDueItems,
  getTrainerPremiumItemsForPlanQueue,
  markTrainerResult,
  trainerTranslationForLang,
  type TrainerItem,
} from './trainer_store';
import {
  buildSessionWordBank,
  buildTrainerSessionDeck,
  getPhraseSessionItems,
  mergePhraseSessionItems,
  normalizeGapToken,
  PHRASE_SESSION_LIMIT,
  sessionMeaningfulTokens,
  trainerGapTokenIndex,
  trainerSessionPhrase,
  WORD_SESSION_LIMIT,
  type SessionCard,
} from './trainer_practice_hall';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { checkAchievements } from './achievements';
import { type WordBankTile } from './review_evaluator';
import { getLessonData } from './lesson_data_all';
import { consumeTrainerSessionEntry } from './trainer_session';
import { isFeatureFreeForEveryone } from './feature_gates';
import { getVerifiedPremiumStatus } from './premium_guard';
import { logTrainerDirectGateBlocked } from './firebase';
import TrainerSessionReport from './trainer_session_report';
import { ensureFrenchRemotePersonalPractice } from './french_personal_practice_remote_runtime';
import { buildTrainerFillGapOptions } from './trainer_fill_gap_options';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import type { LessonWord } from './lesson_data_types';
import { isStudyTargetSourceUiLang, type StudyTargetLang } from './study_target_lang_dev';
import {
  markTrainerPlanTaskCompleted,
  readTrainerPlanTaskContext,
  type TrainerPlanTaskRouteParams,
} from './trainer_plan_task_route';

function lessonSourceDistractorsForItem(item: TrainerItem, errorWord: string): readonly string[] | undefined {
  if (!item.lessonId || !errorWord) return undefined;
  const phrase = getLessonData(item.lessonId).find(row => row.english.trim() === item.key.trim());
  const rows: readonly LessonWord[] = phrase?.wordsEn ?? phrase?.words ?? [];
  const errorKey = normalizeGapToken(errorWord);
  const row = rows.find(word => {
    const correct = normalizeGapToken(word.correct || word.text);
    const text = normalizeGapToken(word.text);
    return correct === errorKey || text === errorKey;
  });
  return row?.distractors;
}

// ── WordBank режим ────────────────────────────────────────────────────────────
interface WordBankProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
  onAdvance: () => void;
  // Озвучка живёт на родителе (TrainerPhrasesSession), а не внутри карточки:
  // при переходе к следующему заданию карточка размонтируется (меняется key),
  // и если бы useAudio() был здесь, его cleanup оборвал бы фразу на полуслове.
  speakAnswer: (text: string, studyTarget: StudyTargetLang) => Promise<void>;
}

function WordBankMode({ item, onResult, onAdvance, speakAnswer }: WordBankProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const accent = statsThemeAccent(themeMode);
  const answerSoftBg = statsThemeSoftBg(themeMode, 'strong');
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { playCorrect } = useCorrectSound();
  // Фраза для сессии: у арены key — вопрос с маркером пропуска, полная фраза
  // собирается подстановкой arenaQuestion.correct (trainerSessionPhrase).
  const { phrase } = trainerSessionPhrase(item);
  // Банк неизменен: взятые плитки не исчезают, а гаснут (opacity .18) — видно, что уже в ответе.
  // Пунктуационные токены («—», «/») отфильтрованы; слоты переупорядочены 0..n-1,
  // чтобы selected и speaking-autofill совпадали с банком по слотам.
  const [bank] = useState<WordBankTile[]>(() => buildSessionWordBank(phrase));
  const [selected, setSelected] = useState<WordBankTile[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const hasRecordedResult = useRef(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { flashKey, flash } = useWordFlash();

  const correctTokens = useMemo(() => sessionMeaningfulTokens(phrase), [phrase]);
  const canCheck = selected.length === correctTokens.length && correctTokens.length > 0;
  const usedSlots = useMemo(() => new Set(selected.map(tile => tile.slot)), [selected]);
  // Перевод-задание: у арены перевода нет — честно показываем нейтральную формулировку.
  const promptText = useMemo(() => {
    const translation = trainerTranslationForLang(item, lang).trim();
    if (translation) return translation;
    return triLang(lang, {
      ru: 'Собери английскую фразу из слов',
      uk: 'Склади англійську фразу зі слів',
      es: 'Forma la frase en inglés',
      'pt-BR': 'Monte a frase em inglês',
      vi: 'Sắp xếp câu tiếng Anh',
      id: 'Susun frasa bahasa Inggris',
      tr: 'İngilizce cümleyi kur',
      pl: 'Ułóż angielską frazę',
    });
  }, [item, lang]);

  const tapBank = (tile: WordBankTile) => {
    if (feedback !== 'none' || usedSlots.has(tile.slot)) return;
    setSelected(s => [...s, tile]);
  };

  const tapSelected = (tile: WordBankTile) => {
    if (feedback !== 'none') return;
    setSelected(s => s.filter(t => t.slot !== tile.slot));
  };

  const recordResult = (correct: boolean) => {
    if (hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    onResult(correct);
  };

  const check = () => {
    if (selected.length !== correctTokens.length) return;
    const userAnswer = selected.map(t => t.text).join(' ').toLowerCase();
    const correct = correctTokens.join(' ').toLowerCase();
    const isOk = userAnswer === correct;
    setFeedback(isOk ? 'correct' : 'wrong');
    if (isOk) {
      hapticSuccess();
      playCorrect();
      void speakAnswer(phrase, studyTarget);
      recordResult(true);
    } else {
      hapticError();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      recordResult(false);
    }
  };

  const retry = () => {
    if (feedback === 'none') return;
    void hapticTap();
    setSelected([]);
    setFeedback('none');
    shakeAnim.setValue(0);
  };

  const zoneBg = feedback === 'correct'
    ? t.correctBg
    : feedback === 'wrong'
      ? t.wrongBg
      : isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgSurface;
  const checkBtnBg = feedback === 'correct'
    ? t.correctBg
    : feedback === 'wrong'
      ? t.wrongBg
      : canCheck ? (isCompassTheme ? COMPASS_RICH.champagne : accent) : t.bgSurface;
  const checkBtnColor = feedback === 'correct'
    ? t.correct
    : feedback === 'wrong'
      ? t.wrong
      : canCheck ? (isCompassTheme ? COMPASS_RICH.textDark : t.correctText) : t.textMuted;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      {/* Перевод — карточка-задание */}
      <View style={[styles.promptCard, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderWidth: 0, borderRadius: isCompassTheme ? 9 : 20, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
        <Text style={[styles.promptTag, { color: t.textGhost, fontSize: f.label - 1 }]}>
          {triLang(lang, {
            ru: 'Составь фразу',
            uk: 'Склади фразу',
            es: 'Forma la frase',
            'pt-BR': 'Monte a frase',
            vi: 'Sắp xếp câu',
            id: 'Susun frasa',
            tr: 'Cümleyi kur',
            pl: 'Ułóż frazę',
          })}
        </Text>
        <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', lineHeight: Math.round(f.bodyLg * 1.35), marginTop: 5 }}>
          {promptText}
        </Text>
      </View>

      {/* Зона ответа — отдельная поверхность; плитки влетают с пружинкой */}
      <Animated.View style={[
        styles.answerZone,
        isCompassTheme && compassShadow(2),
        { backgroundColor: zoneBg, borderWidth: 0, borderRadius: isCompassTheme ? 10 : 18, overflow: isCompassTheme ? 'hidden' : 'visible', transform: [{ translateX: shakeAnim }] },
      ]}>
        {isCompassTheme ? <CompassDepthSurface radius={10} selected={feedback !== 'none'} quiet={feedback === 'none'} /> : null}
        {selected.length === 0
          ? <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {triLang(lang, {
                ru: 'Тут появятся слова…',
                uk: 'Тут з\'являться слова…',
                es: 'Aquí aparecerán las palabras…',
                'pt-BR': 'As palavras aparecerão aqui…',
                vi: 'Các từ sẽ xuất hiện ở đây…',
                id: 'Kata-kata akan muncul di sini…',
                tr: 'Kelimeler burada görünecek…',
                pl: 'Tutaj pojawią się słowa…',
              })}
            </Text>
          : <View style={styles.tilesRow}>
              {selected.map(tile => (
                // Влёт снизу с пружинкой — как в макете (bTileIn: translateY +16 → 0, fade).
                <Reanimated.View key={tile.slot} entering={FadeInUp.springify().damping(12).stiffness(180)}>
                  <TouchableOpacity
                    onPress={() => tapSelected(tile)}
                    style={[styles.tile, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : answerSoftBg, borderRadius: isCompassTheme ? 8 : 11, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
                  >
                    {isCompassTheme ? <CompassDepthSurface radius={8} selected /> : null}
                    <Text style={[styles.tileText, { color: t.textPrimary, fontSize: f.body, fontWeight: '800' }]}>{tile.text}</Text>
                  </TouchableOpacity>
                </Reanimated.View>
              ))}
            </View>
        }
      </Animated.View>

      {/* Банк слов — использованные гаснут, а не исчезают */}
      <View style={styles.tilesRow}>
        {bank.map(tile => {
          const used = usedSlots.has(tile.slot);
          const tileKey = `${tile.slot}`;
          const on = flashKey === tileKey;
          return (
            <DuoPressable
              key={tile.slot}
              withHaptic={false}
              disabled={used || feedback !== 'none'}
              edgeHeight={5}
              edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
              style={[
                styles.tile,
                isCompassTheme && compassShadow(1),
                {
                  backgroundColor: on ? t.accent : (isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgSurface2),
                  borderColor: 'transparent',
                  borderWidth: 0,
                  borderRadius: isCompassTheme ? 8 : 11,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                  opacity: used ? 0.18 : 1,
                },
              ]}
              onPress={() => {
                flash(tileKey);
                requestAnimationFrame(() => { void hapticTap(); });
                tapBank(tile);
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
              <Text style={[styles.tileText, { color: on ? t.correctText : t.textPrimary, fontSize: f.body, fontWeight: on ? '700' : '600' }]}>{tile.text}</Text>
            </DuoPressable>
          );
        })}
      </View>

          {/* Кнопка проверки: при верном ответе сама становится зелёной «Верно!» */}
          <TouchableOpacity
            onPress={check}
            disabled={!canCheck || feedback !== 'none'}
            style={[styles.checkBtn, {
              backgroundColor: checkBtnBg,
              borderWidth: 0,
              borderRadius: isCompassTheme ? 9 : 14,
              overflow: isCompassTheme ? 'hidden' : 'visible',
              opacity: canCheck || feedback !== 'none' ? 1 : 0.4,
              marginTop: 'auto',
            }]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={9} cream={canCheck} quiet={!canCheck} /> : null}
        <Text style={[styles.checkBtnText, { color: checkBtnColor, fontSize: f.body }]}>
          {feedback === 'correct'
            ? triLang(lang, { ru: 'Верно!', uk: 'Вірно!', es: '¡Correcto!', 'pt-BR': 'Correto!', vi: 'Đúng rồi!', id: 'Benar!', tr: 'Doğru!', pl: 'Poprawnie!' })
            : feedback === 'wrong'
              ? triLang(lang, { ru: 'Неверно', uk: 'Невірно', es: 'Incorrecto', 'pt-BR': 'Incorreto', vi: 'Sai rồi', id: 'Salah', tr: 'Yanlış', pl: 'Niepoprawnie' })
              : triLang(lang, {
                ru: 'Проверить',
                uk: 'Перевірити',
                es: 'Comprobar',
                'pt-BR': 'Verificar',
                vi: 'Kiểm tra',
                id: 'Periksa',
                tr: 'Kontrol et',
                pl: 'Sprawdź',
              })}
        </Text>
      </TouchableOpacity>

      {/* [SPEAKING] Произнести фразу вслух (premium). Говорение — необязательная
          надстройка: XP не начисляем (нет двойного счёта и обещания XP на пейволе);
          фиксируем успех только в аналитике.
          Как в уроке (lesson1 → handleSpeakingFillAnswer): верный устный ответ САМ
          раскладывает правильные слова по ячейкам и засчитывает фразу — юзеру не
          надо после «Готово» вручную собирать слова. */}
      <SpeakingButton
        targetText={correctTokens.join(' ')}
        lang={lang}
        variant="pill"
        onPass={({ score }) => {
          void trackEvent('speaking_attempt_passed', { source: 'trainer', score });
          if (feedback !== 'none') return; // карточка уже оценена — не вмешиваемся
          // Заполняем поле ответа каноническими словами (слоты совпадают с банком,
          // поэтому все плитки банка гаснут как использованные).
          setSelected(correctTokens.map((text, slot) => ({ slot, text })));
          // Верный устный ответ = правильная фраза, поэтому засчитываем сразу, не
          // дожидаясь асинхронного selected (иначе check() прочитал бы старое состояние).
          setFeedback('correct');
          hapticSuccess();
          playCorrect();
          void speakAnswer(phrase, studyTarget);
          recordResult(true);
        }}
      />

      {feedback !== 'none' ? (
        <View style={styles.resultActions}>
          <TouchableOpacity
            onPress={onAdvance}
            style={[styles.resultActionButton, { backgroundColor: t.correct }]}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Готово, перейти к следующей фразе', uk: 'Готово, перейти до наступної фрази', es: 'Listo, pasar a la siguiente frase', 'pt-BR': 'Concluído, ir para a próxima frase', vi: 'Xong, chuyển sang câu tiếp theo', id: 'Selesai, lanjut ke frasa berikutnya', tr: 'Tamam, sonraki ifadeye geç', pl: 'Gotowe, przejdź do następnej frazy' })}
          >
            <Text style={[styles.resultActionText, { color: t.correctText, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Готово →', uk: 'Готово →', es: 'Listo →', 'pt-BR': 'Concluído →', vi: 'Xong →', id: 'Selesai →', tr: 'Tamam →', pl: 'Gotowe →' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={retry}
            style={[styles.resultActionButton, { backgroundColor: t.bgSurface2 }]}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Повторить эту фразу ещё раз', uk: 'Повторити цю фразу ще раз', es: 'Repetir esta frase otra vez', 'pt-BR': 'Repetir esta frase mais uma vez', vi: 'Lặp lại câu này một lần nữa', id: 'Ulangi frasa ini sekali lagi', tr: 'Bu ifadeyi tekrar et', pl: 'Powtórz tę frazę jeszcze raz' })}
          >
            <Text style={[styles.resultActionText, { color: t.textPrimary, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Повторить ещё раз', uk: 'Повторити ще раз', es: 'Repetir otra vez', 'pt-BR': 'Repetir mais uma vez', vi: 'Lặp lại lần nữa', id: 'Ulangi sekali lagi', tr: 'Tekrar et', pl: 'Powtórz jeszcze raz' })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── Fill Gap режим ────────────────────────────────────────────────────────────
interface FillGapProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
  onAdvance: () => void;
  // См. комментарий к WordBankProps.speakAnswer — озвучка принадлежит родителю,
  // чтобы фраза не обрывалась при размонтировании карточки на следующем задании.
  speakAnswer: (text: string, studyTarget: StudyTargetLang) => Promise<void>;
}

function FillGapMode({ item, onResult, onAdvance, speakAnswer }: FillGapProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const accent = statsThemeAccent(themeMode);
  const { playCorrect } = useCorrectSound();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { flashKey, flash } = useWordFlash();
  // У арены errorWord = arenaQuestion.correct, phrase — с подставленным словом;
  // дистракторы — авторские arenaQuestion.options (buildTrainerFillGapOptions сам
  // убирает correct, дедуплицирует и шафлит).
  const { phrase, errorWord } = trainerSessionPhrase(item);
  const [options] = useState(() => buildTrainerFillGapOptions({
    correctWord: errorWord,
    phrase,
    category: item.category,
    grammarTag: item.grammarTag,
    sourceDistractors: item.queue === 'arena' && item.arenaQuestion
      ? item.arenaQuestion.options
      : lessonSourceDistractorsForItem(item, errorWord),
  }));
  const [chosen, setChosen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const hasRecordedResult = useRef(false);
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  // Фраза крупно; пропуск — светящийся слот ровно на месте слова с ошибкой.
  // buildTrainerSessionDeck гарантирует gapIndex >= 0 для fill_gap; -1 — фолбэк без слота.
  const phraseWords = useMemo(() => phrase.split(' '), [phrase]);
  const gapIndex = useMemo(() => trainerGapTokenIndex(phrase, errorWord), [phrase, errorWord]);

  const recordResult = (correct: boolean) => {
    if (hasRecordedResult.current) return;
    hasRecordedResult.current = true;
    onResult(correct);
  };

  const pick = (opt: string) => {
    if (feedback !== 'none') return;
    const isOk = opt.toLowerCase() === errorWord.toLowerCase();
    setChosen(opt);
    setFeedback(isOk ? 'correct' : 'wrong');
    if (isOk) {
      hapticSuccess();
      playCorrect();
      void speakAnswer(phrase, studyTarget);
      recordResult(true);
    } else {
      hapticError();
      shakeX.value = withSequence(
        withTiming(-5, { duration: 55 }),
        withTiming(5, { duration: 55 }),
        withTiming(-3, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
      recordResult(false);
    }
  };

  const retry = () => {
    if (feedback === 'none') return;
    void hapticTap();
    setChosen(null);
    setFeedback('none');
    shakeX.value = 0;
  };

  const gapBg = feedback === 'correct'
    ? t.correctBg
    : feedback === 'wrong'
      ? t.wrongBg
      : statsThemeSoftBg(themeMode, 'normal');
  const gapColor = feedback === 'correct' ? t.correct : feedback === 'wrong' ? t.wrong : accent;
  const phraseFontSize = Math.round(f.bodyLg * 1.2);

  return (
    <View style={{ flex: 1, gap: 14 }}>
      {/* Фраза крупно, пропуск светится; при ошибке — мягкая тряска */}
      <Reanimated.View style={shakeStyle}>
        <View style={[styles.gapCard, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderWidth: 0, borderRadius: isCompassTheme ? 9 : 20, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
          {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
          <Text style={[styles.promptTag, { color: t.textGhost, fontSize: f.label - 1 }]}>
            {triLang(lang, {
              ru: 'Вставь пропущенное слово',
              uk: 'Встав пропущене слово',
              es: 'Elige la palabra que falta',
              'pt-BR': 'Escolha a palavra que falta',
              vi: 'Chọn từ còn thiếu',
              id: 'Pilih kata yang hilang',
              tr: 'Eksik kelimeyi seç',
              pl: 'Wybierz brakujące słowo',
            })}
          </Text>
          <View style={styles.phraseWrap}>
            {phraseWords.map((word, index) => (index === gapIndex ? (
              <View key={`gap-${index}`} style={[styles.gapSlot, { backgroundColor: gapBg }]}>
                <Text style={{ color: gapColor, fontSize: f.bodyLg, fontWeight: '900' }}>{chosen ?? '?'}</Text>
              </View>
            ) : (
              <Text key={`w-${index}`} style={{ color: t.textPrimary, fontSize: phraseFontSize, fontWeight: '800', lineHeight: Math.round(phraseFontSize * 1.6) }}>{word}</Text>
            )))}
          </View>
        </View>
      </Reanimated.View>

      {/* Варианты 2×2 */}
      <View style={styles.chipsGrid}>
        {options.map(opt => {
          const isChosen = chosen === opt;
          const isCorrect = opt.toLowerCase() === errorWord.toLowerCase();
          const on = flashKey === opt;
          let bg = on ? t.accent : (isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgSurface2);
          let tc = on ? t.correctText : t.textPrimary;
          let opacity = 1;
          if (isChosen && feedback === 'correct') { bg = isCompassTheme ? COMPASS_RICH.washStrong : t.correctBg; tc = isCompassTheme ? COMPASS_RICH.champagne : t.correct; }
          if (isChosen && feedback === 'wrong')   { bg = isCompassTheme ? COMPASS_RICH.copperWash : t.wrongBg; tc = isCompassTheme ? COMPASS_RICH.peach : t.wrong; }
          if (!isChosen && feedback !== 'none' && isCorrect) { bg = isCompassTheme ? COMPASS_RICH.washStrong : t.correctBg; tc = isCompassTheme ? COMPASS_RICH.champagne : t.correct; }
          if (feedback !== 'none' && !isChosen && !isCorrect) opacity = 0.58;
          return (
            <DuoPressable
              key={opt}
              withHaptic={false}
              disabled={feedback !== 'none'}
              edgeHeight={5}
              edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
              wrapStyle={styles.chipWrap}
              style={[
                styles.chip,
                isCompassTheme && compassShadow(feedback === 'none' ? 1 : 2),
                {
                  backgroundColor: bg,
                  borderWidth: 0,
                  borderRadius: isCompassTheme ? 9 : 13,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                  opacity,
                },
              ]}
              onPress={() => {
                flash(opt);
                // Результат (success/error) даёт pick — отдельный tap убран,
                // иначе складывается с сильным сигналом в один удар.
                pick(opt);
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={9} selected={feedback !== 'none' && (isChosen || isCorrect)} quiet={feedback === 'none'} /> : null}
              <Text style={{ color: tc, fontSize: f.body, fontWeight: '800' }}>{opt}</Text>
            </DuoPressable>
          );
        })}
      </View>

      {/* Микро-подсказка после ответа: честные данные — фраза целиком + её перевод.
          Поля «объяснение правила» в TrainerItem нет — ничего не выдумываем. */}
      {feedback !== 'none' ? (
        <Reanimated.View entering={FadeInDown.duration(220)} style={[styles.noteRow, { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalSoft : t.bgSurface, marginTop: 'auto' }]}>
          <Ionicons name="bulb-outline" size={16} color={accent} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.caption - 1, fontWeight: '700' }}>{phrase}</Text>
            {trainerTranslationForLang(item, lang).trim() ? (
              <Text style={{ color: t.textMuted, fontSize: f.caption - 1, fontWeight: '600', marginTop: 2 }}>{trainerTranslationForLang(item, lang)}</Text>
            ) : null}
          </View>
        </Reanimated.View>
      ) : null}

      {feedback !== 'none' ? (
        <View style={styles.resultActions}>
          <TouchableOpacity
            onPress={onAdvance}
            style={[styles.resultActionButton, { backgroundColor: t.correct }]}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Готово, перейти к следующей фразе', uk: 'Готово, перейти до наступної фрази', es: 'Listo, pasar a la siguiente frase', 'pt-BR': 'Concluído, ir para a próxima frase', vi: 'Xong, chuyển sang câu tiếp theo', id: 'Selesai, lanjut ke frasa berikutnya', tr: 'Tamam, sonraki ifadeye geç', pl: 'Gotowe, przejdź do następnej frazy' })}
          >
            <Text style={[styles.resultActionText, { color: t.correctText, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Готово →', uk: 'Готово →', es: 'Listo →', 'pt-BR': 'Concluído →', vi: 'Xong →', id: 'Selesai →', tr: 'Tamam →', pl: 'Gotowe →' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={retry}
            style={[styles.resultActionButton, { backgroundColor: t.bgSurface2 }]}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Повторить эту фразу ещё раз', uk: 'Повторити цю фразу ще раз', es: 'Repetir esta frase otra vez', 'pt-BR': 'Repetir esta frase mais uma vez', vi: 'Lặp lại câu này một lần nữa', id: 'Ulangi frasa ini sekali lagi', tr: 'Bu ifadeyi tekrar et', pl: 'Powtórz tę frazę jeszcze raz' })}
          >
            <Text style={[styles.resultActionText, { color: t.textPrimary, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Повторить ещё раз', uk: 'Повторити ще раз', es: 'Repetir otra vez', 'pt-BR': 'Repetir mais uma vez', vi: 'Lặp lại lần nữa', id: 'Ulangi sekali lagi', tr: 'Tekrar et', pl: 'Powtórz jeszcze raz' })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerPhrasesSession() {
  const router = useRouter();
  const params = useLocalSearchParams<TrainerPlanTaskRouteParams>();
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const accent = statsThemeAccent(themeMode);
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const sourceLocale = isStudyTargetSourceUiLang(lang) ? lang : 'ru';
  const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget);
  // Озвучка верного ответа принадлежит экрану, а НЕ карточке: карточка
  // размонтируется при переходе к следующему заданию (меняется key), и cleanup
  // useAudio внутри карточки обрывал бы TTS-фразу на полуслове. Здесь же хук
  // переживает смену карточек, поэтому фраза доигрывает до конца.
  const { speakAnswer } = useSpeakAnswer();

  const [deck, setDeck] = useState<SessionCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const dailySessionTracked = useRef(false);
  const planTrainerCompletionTracked = useRef(false);
  const sessionStartRef = useRef(0);
  const pendingResultRef = useRef<Promise<void>>(Promise.resolve());
  const advancingRef = useRef(false);
  const planTrainerContext = useMemo(() => readTrainerPlanTaskContext({
    mode: params.mode,
    planDayIndex: params.planDayIndex,
    planId: params.planId,
    planInstanceId: params.planInstanceId,
    planTaskId: params.planTaskId,
    planTrainerTask: params.planTrainerTask,
    requiredItems: params.requiredItems,
  }), [
    params.mode,
    params.planDayIndex,
    params.planId,
    params.planInstanceId,
    params.planTaskId,
    params.planTrainerTask,
    params.requiredItems,
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setLoading(true);
    void (async () => {
      try {
        if (!trainerGateOpen) {
          if (cancelled) return;
          setAccessReady(true);
          setLoading(false);
          return;
        }
        if (planTrainerContext.taskId) {
          const planAllowed = isFeatureFreeForEveryone('smart_trainer') || await getVerifiedPremiumStatus();
          if (cancelled) return;
          if (!planAllowed) {
            logTrainerDirectGateBlocked('/trainer_phrases_session');
            // Снимаем экран тренажёра со стека «назад»: при закрытии пейвола
            // возврат сюда снова упёрся бы в этот же гейт → пейвол открывался бы
            // заново «на месте» бесконечно. Уходим на реальный предыдущий экран.
            markNextNavigationAsReplace();
            router.replace({ pathname: '/premium_modal', params: { context: 'smart_trainer', source: 'smart_trainer_lock' } } as any);
            return;
          }
        } else {
          const allowed = await consumeTrainerSessionEntry('/trainer_phrases_session', studyTarget);
          if (cancelled) return;
          // «Пульт»: если режимы тренера переведены в «Фри» — дневной лимит снят для всех.
          if (!allowed && !isFeatureFreeForEveryone('trainer_modes')) {
            logTrainerDirectGateBlocked('/trainer_phrases_session');
            // см. коммент выше: убираем тренажёр из стека, чтобы «назад» с пейвола
            // не вернулось на исчерпанный лимит и не открыло пейвол снова.
            markNextNavigationAsReplace();
            router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
            return;
          }
        }
        setAccessReady(true);
        await ensureFrenchRemotePersonalPractice(sourceLocale);
        // Plan-контекст: фразовая сессия обслуживает и арену плана — грузим обе
        // plan-очереди и объединяем тем же компаратором, что и свободную практику.
        const items = planTrainerContext.taskId
          ? await (async () => {
              const [planPhrases, planArena] = await Promise.all([
                getTrainerPremiumItemsForPlanQueue(
                  planTrainerContext.planInstanceId,
                  planTrainerContext.mode,
                  'phrases',
                  planTrainerContext.requiredItems,
                  studyTarget,
                ),
                getTrainerPremiumItemsForPlanQueue(
                  planTrainerContext.planInstanceId,
                  planTrainerContext.mode,
                  'arena',
                  planTrainerContext.requiredItems,
                  studyTarget,
                ),
              ]);
              return mergePhraseSessionItems(planPhrases, planArena, planTrainerContext.requiredItems);
            })()
          : await getPhraseSessionItems(PHRASE_SESSION_LIMIT, studyTarget, sourceLocale);
        if (cancelled) return;
        if (items.length === 0) { setDone(true); setLoading(false); return; }
        sessionStartRef.current = Date.now();
        setDeck(buildTrainerSessionDeck(items));
        setLoading(false);
      } catch {
        // Сбой загрузки колоды → экран ошибки с retry вместо вечного лоадера.
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    }, [planTrainerContext, router, reloadKey, sourceLocale, studyTarget, trainerGateOpen]);

  const handleResult = useCallback((answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);

    pendingResultRef.current = (async () => {
      await markTrainerResult(card.item.key, card.item.queue, answeredCorrectly, studyTarget);
      const updates: { type: TaskType; increment: number }[] = [];
      if (!dailySessionTracked.current) {
        dailySessionTracked.current = true;
        updates.push({ type: 'recall_session', increment: 1 });
      }
      if (answeredCorrectly) {
        updates.push({ type: 'recall_answers', increment: 1 });
        updates.push({ type: card.item.queue === 'arena' ? 'trainer_arena' : 'trainer_phrases', increment: 1 });
        checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget }).catch(() => {});
      }
      if (updates.length > 0) updateMultipleTaskProgress(updates, { studyTarget }).catch(() => {});
    })().catch(() => {});
  }, [deck, current, studyTarget]);

  const handleAdvance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    await pendingResultRef.current;
    const next = current + 1;
    if (next >= deck.length) {
      if (deck.length >= 5 && wrong === 0) {
        updateMultipleTaskProgress([{ type: 'recall_perfect', increment: 1 }], { studyTarget }).catch(() => {});
      }
      checkAchievements({
        type: 'trainer_session_result',
        correct,
        wrong,
        total: deck.length,
        studyTarget,
      }).catch(() => {});
      setDone(true);
    } else {
      setCurrent(next);
    }
    advancingRef.current = false;
  }, [deck.length, current, correct, wrong, studyTarget]);

  useEffect(() => {
    if (!done || !planTrainerContext.taskId || planTrainerCompletionTracked.current) return;
    planTrainerCompletionTracked.current = true;
    void markTrainerPlanTaskCompleted(planTrainerContext, studyTarget);
  }, [done, planTrainerContext, studyTarget]);

  if (loadError) {
    return (
      <TrainerErrorView
        lang={lang}
        onRetry={() => { hapticTap(); setReloadKey(k => k + 1); }}
        onExit={() => { hapticTap(); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
      />
    );
  }

  if (!accessReady || loading) {
    return <TrainerLoadingView lang={lang} />;
  }

  if (!trainerGateOpen) {
    const copy = frenchTrainerGateCopy(lang);
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={38} color={sx.muted} />
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {copy.title}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {copy.body}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/trainer' as any)} style={{ marginTop: 22, backgroundColor: t.correct, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: t.correctText, fontSize: f.sub, fontWeight: '900' }}>{copy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    // Цепочка микса: после фраз (и арены) предлагаем слова, если они ещё ждут.
    const wordsChain = planTrainerContext.taskId
      ? []
      : getCachedDueItems('words', WORD_SESSION_LIMIT, studyTarget, sourceLocale);
    const nextLabel = wordsChain.length > 0
      ? `${triLang(lang, {
        ru: 'Дальше: Слова',
        uk: 'Далі: Слова',
        es: 'Siguiente: Palabras',
        'pt-BR': 'A seguir: Palavras',
        vi: 'Tiếp: Từ vựng',
        id: 'Lanjut: Kata',
        tr: 'Sıradaki: Kelimeler',
        pl: 'Dalej: Słowa',
      })} · ${wordsChain.length}`
      : undefined;
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <TrainerSessionReport
              queue="phrases"
              correct={correct}
              wrong={wrong}
              total={deck.length || correct + wrong}
              accent={accent}
              durationMs={sessionStartRef.current > 0 ? Date.now() - sessionStartRef.current : undefined}
              onDone={() => { hapticTap(); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
              nextLabel={nextLabel}
              onNext={nextLabel ? () => { hapticTap(); router.replace('/trainer_words_session' as any); } : undefined}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const card = deck[current];

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TapScale onPress={() => safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            <Text style={[styles.headerTitle, { color: sx.primary, fontSize: f.body }]}>
              {triLang(lang, {
                ru: 'Фразы',
                uk: 'Фрази',
                es: 'Frases',
                'pt-BR': 'Frases',
                vi: 'Cụm từ',
                id: 'Frasa',
                tr: 'İfadeler',
                pl: 'Frazy',
              })}
            </Text>
            {card ? (
              <ReportErrorButton
                screen="trainer_phrases"
                dataId={`trainer_phrase_${card.item.key ?? 'unknown'}`}
                dataText={`${trainerSessionPhrase(card.item).phrase}\n${trainerTranslationForLang(card.item, lang)}`}
                variant="icon-flag"
                accessibilityLabel="Сообщить об ошибке во фразе"
                style={[
                  { width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, marginLeft: 8 },
                  isCompassTheme && { borderRadius: 9, backgroundColor: COMPASS_RICH.charcoalRaised, borderColor: COMPASS_RICH.hairline, ...compassShadow(1) },
                ]}
              />
            ) : null}
          </View>

          {/* Прогресс: тонкая полоса + чип-счётчик */}
          <View style={styles.progressRow}>
            <GradientProgressBar
              progress={deck.length > 0 ? current / deck.length : 0}
              accent={isCompassTheme ? COMPASS_RICH.champagne : accent}
              height={6}
              style={styles.progressBarFlex}
            />
            <View style={[styles.countChip, { backgroundColor: t.bgSurface }]}>
              <Text style={{ color: t.textMuted, fontSize: f.label - 1, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
                {deck.length > 0 ? Math.min(current + 1, deck.length) : 0} / {deck.length}
              </Text>
            </View>
          </View>

          <BouncyScrollView
            decelerationRate="normal"
            contentContainerStyle={{ padding: 16, paddingTop: 8, flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {card?.mode === 'word_bank'
              ? <WordBankMode key={card.item.key + '_wb'} item={card.item} onResult={handleResult} onAdvance={handleAdvance} speakAnswer={speakAnswer} />
              : card && <FillGapMode key={card.item.key + '_fg'} item={card.item} onResult={handleResult} onAdvance={handleAdvance} speakAnswer={speakAnswer} />
            }
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontWeight: '700' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  progressBarFlex: { flex: 1 },
  countChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  promptCard: {
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  promptTag: {
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  answerZone: {
    minHeight: 96,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'center',
  },
  gapCard: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 12,
  },
  phraseWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 7,
    rowGap: 8,
  },
  gapSlot: {
    minWidth: 64,
    height: 32,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chipWrap: { flexBasis: '47%', flexGrow: 1 },
  chip: {
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    borderRadius: 11,
    height: 38,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontWeight: '600' },
  checkBtn: {
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: { fontWeight: '800' },
  resultActions: {
    gap: 10,
  },
  resultActionButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  resultActionText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  doneTitle: { fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  doneStats: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
    marginBottom: 32,
    width: '100%',
  },
  doneStat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  doneBtn: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, width: '100%' },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
