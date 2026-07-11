// ═══════════════════════════════════════════════════════════════════════════
// trainer_phrases_session.tsx — Сессия фраз
//
// Два режима чередуются:
//   word_bank  — сборка фразы из перемешанных слов (как в уроке)
//   fill_gap   — вставь пропущенное слово (то слово где была ошибка)
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TapScale from '../components/TapScale';
import ReportErrorButton from '../components/ReportErrorButton';
import { Ionicons } from '@expo/vector-icons';
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
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import DuoPressable from '../components/DuoPressable';
import { useWordFlash } from '../hooks/use-word-flash';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { useSpeakAnswer } from '../hooks/use-speak-answer';
import { useStudyTarget } from '../components/StudyTargetContext';
import {
  getDueItems,
  getTrainerPremiumItemsForPlanQueue,
  markTrainerResult,
  trainerTranslationForLang,
  type TrainerItem,
} from './trainer_store';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { checkAchievements } from './achievements';
import {
  shuffleWordBankTiles,
  tokenizeRecallPhrase,
  type WordBankTile,
} from './review_evaluator';
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

type SessionMode = 'word_bank' | 'fill_gap';

interface SessionCard {
  item: TrainerItem;
  mode: SessionMode;
}

const TRAINER_PHRASE_CORRECT_FEEDBACK_MIN_MS = 700;

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPhraseAnswerFeedback(
  answerSpeech: Promise<void>,
): Promise<void> {
  await Promise.all([
    answerSpeech.catch(() => undefined),
    wait(TRAINER_PHRASE_CORRECT_FEEDBACK_MIN_MS),
  ]);
}

function buildDeck(items: TrainerItem[]): SessionCard[] {
  const deck: SessionCard[] = [];
  items.forEach((item, i) => {
    // Если есть errorWord — чередуем word_bank и fill_gap; иначе всегда word_bank
    const hasFillGap = !!item.errorWord;
    const mode: SessionMode = hasFillGap && i % 2 === 0 ? 'fill_gap' : 'word_bank';
    deck.push({ item, mode });
  });
  return deck;
}

function normalizeFillGapToken(value?: string): string {
  return (value ?? '').toLowerCase().replace(/^[.!?,;:"()[\]{}]+|[.!?,;:"()[\]{}]+$/g, '').trim();
}

function lessonSourceDistractorsForItem(item: TrainerItem, errorWord: string): readonly string[] | undefined {
  if (!item.lessonId || !errorWord) return undefined;
  const phrase = getLessonData(item.lessonId).find(row => row.english.trim() === item.key.trim());
  const rows: readonly LessonWord[] = phrase?.wordsEn ?? phrase?.words ?? [];
  const errorKey = normalizeFillGapToken(errorWord);
  const row = rows.find(word => {
    const correct = normalizeFillGapToken(word.correct || word.text);
    const text = normalizeFillGapToken(word.text);
    return correct === errorKey || text === errorKey;
  });
  return row?.distractors;
}

// ── WordBank режим ────────────────────────────────────────────────────────────
interface WordBankProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
  // Озвучка живёт на родителе (TrainerPhrasesSession), а не внутри карточки:
  // при переходе к следующему заданию карточка размонтируется (меняется key),
  // и если бы useAudio() был здесь, его cleanup оборвал бы фразу на полуслове.
  speakAnswer: (text: string, studyTarget: StudyTargetLang) => Promise<void>;
}

function WordBankMode({ item, onResult, speakAnswer }: WordBankProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { playCorrect } = useCorrectSound();
  const [bank, setBank] = useState<WordBankTile[]>(() => shuffleWordBankTiles(item.key));
  const [selected, setSelected] = useState<WordBankTile[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { flashKey, flash } = useWordFlash();

  const correctTokens = tokenizeRecallPhrase(item.key);
  const canCheck = selected.length === correctTokens.length && correctTokens.length > 0;

  const tapBank = (tile: WordBankTile) => {
    if (feedback !== 'none') return;
    setSelected(s => [...s, tile]);
    setBank(b => b.filter(t => t.slot !== tile.slot));
  };

  const tapSelected = (tile: WordBankTile) => {
    if (feedback !== 'none') return;
    setBank(b => [...b, tile].sort((a, b) => a.slot - b.slot));
    setSelected(s => s.filter(t => t.slot !== tile.slot));
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
      void waitForPhraseAnswerFeedback(speakAnswer(item.key, studyTarget)).then(() => onResult(true));
    } else {
      hapticError();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        setFeedback('none');
        setSelected([]);
        setBank(shuffleWordBankTiles(item.key));
        onResult(false);
      }, 1200);
    }
  };

  const borderColor = feedback === 'correct' ? '#40C080' : feedback === 'wrong' ? '#E05050' : t.border;

  return (
    <View style={{ flex: 1, gap: 16 }}>
      {/* Перевод — задание */}
      <View style={[styles.translationBox, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent', borderWidth: 0, borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
        <Text style={[styles.translationText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, {
            ru: 'Составь фразу:',
            uk: 'Склади фразу:',
            es: 'Forma la frase:',
            'pt-BR': 'Monte a frase:',
            vi: 'Sắp xếp câu:',
            id: 'Susun frasa:',
            tr: 'Cümleyi kur:',
            pl: 'Ułóż frazę:',
          })}
        </Text>
        <Text style={[styles.translationMain, { color: t.textPrimary, fontSize: f.body }]}>
          {trainerTranslationForLang(item, lang)}
        </Text>
      </View>

      {/* Область сборки */}
      <Animated.View style={[
        styles.assemblyBox,
        isCompassTheme && compassShadow(2),
        { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? (feedback === 'correct' ? COMPASS_RICH.hairlineStrong : feedback === 'wrong' ? COMPASS_RICH.copper : COMPASS_RICH.hairline) : borderColor, borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : (feedback === 'none' ? 0 : 1.5), borderRadius: isCompassTheme ? 10 : 16, overflow: isCompassTheme ? 'hidden' : 'visible', transform: [{ translateX: shakeAnim }] },
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
                <TouchableOpacity
                  key={tile.slot}
                  onPress={() => tapSelected(tile)}
                  style={[styles.tile, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : borderColor + '22', borderRadius: isCompassTheme ? 8 : 10, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
                >
                  {isCompassTheme ? <CompassDepthSurface radius={8} selected /> : null}
                  <Text style={[styles.tileText, { color: t.textPrimary, fontSize: f.body }]}>{tile.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
        }
      </Animated.View>

      {/* Банк слов */}
      <View style={styles.tilesRow}>
        {bank.map(tile => {
          const tileKey = `${tile.slot}`;
          const on = flashKey === tileKey;
          return (
            <DuoPressable
              key={tile.slot}
              withHaptic={false}
              edgeHeight={5}
              edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
              style={[
                styles.tile,
                isCompassTheme && compassShadow(1),
                {
                  backgroundColor: on ? t.accent : (isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard),
                  borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : 'transparent',
                  borderWidth: 0,
                  borderRadius: isCompassTheme ? 8 : 10,
                  overflow: isCompassTheme ? 'hidden' : 'visible',
                },
              ]}
              onPress={() => {
                flash(tileKey);
                requestAnimationFrame(() => { void hapticTap(); });
                tapBank(tile);
              }}
            >
              {isCompassTheme ? <CompassDepthSurface radius={8} quiet /> : null}
              <Text style={[styles.tileText, { color: on ? (t.correctText ?? '#fff') : t.textPrimary, fontSize: f.body, fontWeight: on ? '700' : '600' }]}>{tile.text}</Text>
            </DuoPressable>
          );
        })}
      </View>

          {/* Кнопка проверки */}
          <TouchableOpacity
            onPress={check}
            disabled={!canCheck || feedback !== 'none'}
            style={[styles.checkBtn, {
              backgroundColor: isCompassTheme ? (canCheck ? COMPASS_RICH.champagne : COMPASS_RICH.charcoalSoft) : canCheck ? '#4A9EFF' : t.bgSurface,
              borderWidth: 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairline : 'transparent',
              borderRadius: isCompassTheme ? 9 : 16,
              overflow: isCompassTheme ? 'hidden' : 'visible',
              opacity: canCheck ? 1 : 0.4,
            }]}
          >
            {isCompassTheme ? <CompassDepthSurface radius={9} cream={canCheck} quiet={!canCheck} /> : null}
        <Text style={[styles.checkBtnText, { fontSize: f.body }]}>
          {triLang(lang, {
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
          // Заполняем поле ответа каноническими словами (как setSelectedWords в уроке)
          // и очищаем банк, чтобы ручная сборка не конфликтовала с подставленным ответом.
          setSelected(correctTokens.map((text, slot) => ({ slot, text })));
          setBank([]);
          // Верный устный ответ = правильная фраза, поэтому засчитываем сразу, не
          // дожидаясь асинхронного selected (иначе check() прочитал бы старое состояние).
          setFeedback('correct');
          hapticSuccess();
          playCorrect();
          void waitForPhraseAnswerFeedback(speakAnswer(item.key, studyTarget)).then(() => onResult(true));
        }}
      />
    </View>
  );
}

// ── Fill Gap режим ────────────────────────────────────────────────────────────
interface FillGapProps {
  item: TrainerItem;
  onResult: (correct: boolean) => void;
  // См. комментарий к WordBankProps.speakAnswer — озвучка принадлежит родителю,
  // чтобы фраза не обрывалась при размонтировании карточки на следующем задании.
  speakAnswer: (text: string, studyTarget: StudyTargetLang) => Promise<void>;
}

function FillGapMode({ item, onResult, speakAnswer }: FillGapProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const { playCorrect } = useCorrectSound();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { flashKey, flash } = useWordFlash();
  const errorWord = item.errorWord ?? '';
  const [options] = useState(() => buildTrainerFillGapOptions({
    correctWord: errorWord,
    phrase: item.key,
    category: item.category,
    grammarTag: item.grammarTag,
    sourceDistractors: lessonSourceDistractorsForItem(item, errorWord),
  }));
  const [chosen, setChosen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none');

  const phraseWithGap = item.key.replace(new RegExp(`\\b${errorWord}\\b`, 'i'), '___');

  const pick = (opt: string) => {
    if (feedback !== 'none') return;
    const isOk = opt.toLowerCase() === errorWord.toLowerCase();
    setChosen(opt);
    setFeedback(isOk ? 'correct' : 'wrong');
    if (isOk) {
      hapticSuccess();
      playCorrect();
      void waitForPhraseAnswerFeedback(speakAnswer(item.key, studyTarget)).then(() => onResult(true));
    } else {
      hapticError();
      setTimeout(() => {
        setChosen(null);
        setFeedback('none');
        onResult(false);
      }, 1100);
    }
  };

  return (
    <View style={{ flex: 1, gap: 16 }}>
      {/* Перевод */}
      <View style={[styles.translationBox, isCompassTheme && compassShadow(2), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent', borderWidth: 0, borderRadius: isCompassTheme ? 10 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
        <Text style={[styles.translationText, { color: t.textMuted, fontSize: f.caption }]}>
          {triLang(lang, {
            ru: 'Вставь пропущенное слово:',
            uk: 'Встав пропущене слово:',
            es: 'Elige la palabra que falta:',
            'pt-BR': 'Escolha a palavra que falta:',
            vi: 'Chọn từ còn thiếu:',
            id: 'Pilih kata yang hilang:',
            tr: 'Eksik kelimeyi seç:',
            pl: 'Wybierz brakujące słowo:',
          })}
        </Text>
        <Text style={[styles.translationHint, { color: t.textMuted, fontSize: f.caption }]}>
          {trainerTranslationForLang(item, lang)}
        </Text>
        <Text style={[styles.translationMain, { color: t.textPrimary, fontSize: f.bodyLg }]}>
          {phraseWithGap}
        </Text>
      </View>

      {/* Варианты */}
      <View style={{ gap: 10 }}>
        {options.map(opt => {
          const isChosen = chosen === opt;
          const isCorrect = opt.toLowerCase() === errorWord.toLowerCase();
          const on = flashKey === opt;
          let bg = on ? t.accent : (isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard);
          let bc = on ? t.accent : (isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border);
          let tc = on ? (t.correctText ?? '#fff') : t.textPrimary;
          let opacity = 1;
          if (isChosen && feedback === 'correct') { bg = isCompassTheme ? COMPASS_RICH.washStrong : t.correctBg; bc = isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct; tc = isCompassTheme ? COMPASS_RICH.champagne : t.correct; }
          if (isChosen && feedback === 'wrong')   { bg = isCompassTheme ? COMPASS_RICH.copperWash : t.wrongBg; bc = isCompassTheme ? COMPASS_RICH.copper : t.wrong; tc = isCompassTheme ? COMPASS_RICH.peach : t.wrong; }
          if (!isChosen && feedback !== 'none' && isCorrect) { bg = isCompassTheme ? COMPASS_RICH.washStrong : t.correctBg; bc = isCompassTheme ? COMPASS_RICH.hairlineStrong : t.correct; tc = isCompassTheme ? COMPASS_RICH.champagne : t.correct; }
          if (feedback !== 'none' && !isChosen && !isCorrect) opacity = 0.58;
          return (
            <DuoPressable
              key={opt}
              withHaptic={false}
              disabled={feedback !== 'none'}
              edgeHeight={5}
              edgeColor={on ? t.accent : 'rgba(0,0,0,0.30)'}
              style={[
                styles.optionBtn,
                isCompassTheme && compassShadow(feedback === 'none' ? 1 : 2),
                {
                  backgroundColor: bg,
                  borderColor: bc,
                  borderWidth: isCompassTheme ? StyleSheet.hairlineWidth : (feedback === 'none' && !on ? 0 : 1.5),
                  borderRadius: isCompassTheme ? 9 : 14,
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
              <Text style={[styles.optionText, { color: tc, fontSize: f.body, fontWeight: on ? '700' : '700' }]}>{opt}</Text>
            </DuoPressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerPhrasesSession() {
  const router = useRouter();
  const params = useLocalSearchParams<TrainerPlanTaskRouteParams>();
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
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
        const items = planTrainerContext.taskId
          ? await getTrainerPremiumItemsForPlanQueue(
              planTrainerContext.planInstanceId,
              planTrainerContext.mode,
              'phrases',
              planTrainerContext.requiredItems,
              studyTarget,
            )
          : await getDueItems('phrases', 15, studyTarget, sourceLocale);
        if (cancelled) return;
        if (items.length === 0) { setDone(true); setLoading(false); return; }
        setDeck(buildDeck(items));
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

  const handleResult = useCallback(async (answeredCorrectly: boolean) => {
    const card = deck[current];
    if (!card) return;

    const nextCorrect = correct + (answeredCorrectly ? 1 : 0);
    const nextWrong = wrong + (answeredCorrectly ? 0 : 1);
    if (answeredCorrectly) setCorrect(c => c + 1);
    else setWrong(c => c + 1);

    await markTrainerResult(card.item.key, 'phrases', answeredCorrectly, studyTarget);
    const updates: { type: TaskType; increment: number }[] = [];
    if (!dailySessionTracked.current) {
      dailySessionTracked.current = true;
      updates.push({ type: 'recall_session', increment: 1 });
    }
    if (answeredCorrectly) {
      updates.push({ type: 'recall_answers', increment: 1 });
      updates.push({ type: 'trainer_phrases', increment: 1 });
      checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget }).catch(() => {});
    }

    const next = current + 1;
    if (next >= deck.length) {
      if (deck.length >= 5 && nextWrong === 0) updates.push({ type: 'recall_perfect', increment: 1 });
      checkAchievements({
        type: 'trainer_session_result',
        correct: nextCorrect,
        wrong: nextWrong,
        total: deck.length,
        studyTarget,
      }).catch(() => {});
      setDone(true);
    } else {
      setCurrent(next);
    }
    if (updates.length > 0) updateMultipleTaskProgress(updates, { studyTarget }).catch(() => {});
  }, [deck, current, correct, wrong, studyTarget]);

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
          <TouchableOpacity onPress={() => router.replace('/trainer' as any)} style={{ marginTop: 22, backgroundColor: '#40C080', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: '#07110A', fontSize: f.sub, fontWeight: '900' }}>{copy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <TrainerSessionReport
              queue="phrases"
              correct={correct}
              wrong={wrong}
              total={deck.length || correct + wrong}
              accent="#40C080"
              onDone={() => { hapticTap(); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const card = deck[current];
  const modeLabel = card?.mode === 'fill_gap'
    ? triLang(lang, {
      ru: 'Заполни пропуск',
      uk: 'Заповни пропуск',
      es: 'Completa',
      'pt-BR': 'Complete',
      vi: 'Điền từ',
      id: 'Lengkapi',
      tr: 'Tamamla',
      pl: 'Uzupełnij',
    })
    : triLang(lang, {
      ru: 'Составь фразу',
      uk: 'Склади фразу',
      es: 'Forma la frase',
      'pt-BR': 'Monte a frase',
      vi: 'Sắp xếp câu',
      id: 'Susun frasa',
      tr: 'Cümleyi kur',
      pl: 'Ułóż frazę',
    });

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
                dataText={`${card.item.key}\n${trainerTranslationForLang(card.item, lang)}`}
                variant="icon-flag"
                accessibilityLabel="Сообщить об ошибке во фразе"
                style={[
                  { width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, marginLeft: 8 },
                  isCompassTheme && { borderRadius: 9, backgroundColor: COMPASS_RICH.charcoalRaised, borderColor: COMPASS_RICH.hairline, ...compassShadow(1) },
                ]}
              />
            ) : null}
          </View>

          {/* Прогресс */}
          <GradientProgressBar
            progress={deck.length > 0 ? current / deck.length : 0}
            accent={isCompassTheme ? COMPASS_RICH.champagne : '#40C080'}
            style={styles.progressBar}
          />

          {/* Лейбл режима */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text style={{ color: sx.muted, fontSize: f.caption, fontWeight: '600' }}>{modeLabel}</Text>
          </View>

          <BouncyScrollView
            decelerationRate="normal"
            contentContainerStyle={{ padding: 16, paddingTop: 8, flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {card?.mode === 'word_bank'
              ? <WordBankMode key={card.item.key + '_wb'} item={card.item} onResult={handleResult} speakAnswer={speakAnswer} />
              : card && <FillGapMode key={card.item.key + '_fg'} item={card.item} onResult={handleResult} speakAnswer={speakAnswer} />
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
  progressBar: { marginHorizontal: 16 },
  translationBox: {
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  translationText: { fontWeight: '600' },
  translationHint: { fontWeight: '600', lineHeight: 19 },
  translationMain: { fontWeight: '700', lineHeight: 24 },
  assemblyBox: {
    minHeight: 72,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tileText: { fontWeight: '600' },
  checkBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  checkBtnText: { color: '#fff', fontWeight: '800' },
  optionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionText: { fontWeight: '700' },
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
