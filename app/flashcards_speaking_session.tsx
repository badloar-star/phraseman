// ═══════════════════════════════════════════════════════════════════════════
// flashcards_speaking_session.tsx — режим «Говорить» раздела «Карточки».
//
// зачем (владелец, 2026-08-17): «в разделе карточки в отработке есть тренировка
// блиц, слушать — надо ещё речь, чтобы карточки можно было отрабатывать говоря».
//
// Что это: карточка → зажал микрофон → сказал фразу по-английски → отпустил →
// оценка. Движок оценки — тот же `SpeakingPanel` (presentation="inline"),
// что стоит за кнопкой «Устно» в уроках и тренажёре фраз: пословная сверка,
// контрольный прогон, Android-путь через whisper. Свой распознаватель не пишем.
//
// Два задания (взяты из плана говорильной дорожки Learning V2,
// docs/v2/SPEAKING_TRACK_PLAN_2026-08-17.md, типы 2 и 1 — те, для которых
// у карточки есть данные):
//  • «Скажи по-английски» — на лицевой стороне ТОЛЬКО перевод, английский
//    скрыт: тренирует извлечение из головы (ядро дорожки). Подсказка — тап по
//    карточке (флип) или динамик.
//  • «Повтори за диктором» — английский показан и озвучен, человек повторяет:
//    опора полная, тренирует произношение.
// Типы 3–4 плана («собери и скажи», «одно слово убрали») требуют `words[]` с
// ролями — у карточек их нет, поэтому сюда не берём.
//
// Очередь — общее правило раздела (`session_queue`): не сдал → карточка в конец,
// максимум 2 повтора; чистая логика — flashcards/speaking_session_logic.ts.
// XP режим не даёт (как слушание/блиц: говорение — надстройка, без двойного счёта).
// Финал → SessionResultScreen (верно/ошибок/точность + «Добить»).
//
// Премиум-гейт — как у всех речевых поверхностей: `useFeatureAccess('speaking')`
// внутри `SpeakHoldButton` (без доступа → пейвол context='speaking').
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '../components/ThemeContext';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import ReportErrorButton from '../components/ReportErrorButton';
import SpeakingPanel, { buildSpeakingPanelTheme, type SpeakingPanelStatus } from '../components/SpeakingPanel';
import SpeakingInlineSlot from '../components/SpeakingInlineSlot';
import SpeakingInlineResultStars from '../components/SpeakingInlineResultStars';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import { trackEvent } from './analytics';
import { SPEECH_PRONUNCIATION_PASS_THRESHOLD } from './pronunciation_scoring_client';
import { speakingBand, speakingBandLabel } from './speaking_score_bands';
import PhraseCard, { useFcReduceMotion } from './flashcards/PhraseCard';
import DeckPickerSheet, { type DeckSheetOption } from './flashcards/DeckPickerSheet';
import { loadFcDeckOptions } from './flashcards/deck_options';
import SessionResultScreen from './flashcards/SessionResultScreen';
import SpeakHoldButton, { SPEAK_HOLD_LABEL_HEIGHT } from './flashcards/SpeakHoldButton';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import { safeRouterBack } from './navigation_back';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckCard, type DeckRef } from './flashcards/deck_sources';
import { isValidSessionSize, FC_DEFAULT_SESSION_SIZE, getLastPreset, presetDeckIds, type FcModePreset } from './flashcards/mode_prefs';
import { deckRouteParam, decksCountLabel, SOLO_DECK_ID } from './flashcards/deck_selection';
import {
  DEFAULT_SPEAKING_PREFS,
  FC_SPEAKING_PREFS_KEY,
  SPEAKING_AUTO_ADVANCE_MS,
  SPEAKING_TASKS,
  advanceSpeaking,
  beginSpeakingAttempt,
  cancelSpeakingAttempt,
  currentSpeakingCard,
  initialSpeakingState,
  parseSpeakingPrefs,
  scoreSpeakingAttempt,
  speakingProgress,
  speakingRetryCards,
  summarizeSpeaking,
  type SpeakingAttempt,
  type SpeakingPrefs,
  type SpeakingSessionState,
  type SpeakingTask,
} from './flashcards/speaking_session_logic';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import PracticeRuneCounter from '../components/PracticeRuneCounter';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import SessionAttemptsRecoveryModal from '../components/session_attempts/SessionAttemptsRecoveryModal';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { captureAccountGeneration } from './account_generation';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { SESSION_ATTEMPTS_MOTION } from '../constants/motionHybrid';

/** Акцент режима (words #4A9EFF / phrases #40C080 / listening #9C6ADE / blitz #FF8A3D). */
const ACCENT = '#22B8A8';
const CARD_MIN_H = 260;

// ── Настройки fc_speaking_prefs_v1 (парсинг — в speaking_session_logic) ──────
function saveSpeakingPrefs(prefs: SpeakingPrefs): void {
  void AsyncStorage.getItem(FC_SPEAKING_PREFS_KEY)
    .then((raw) => {
      let base: Record<string, unknown> = {};
      try {
        const p = raw ? JSON.parse(raw) : null;
        if (p && typeof p === 'object' && !Array.isArray(p)) base = p as Record<string, unknown>;
      } catch {}
      return AsyncStorage.setItem(FC_SPEAKING_PREFS_KEY, JSON.stringify({ ...base, ...prefs }));
    })
    .catch(() => {});
}

// Fisher-Yates: единое перемешивание карточек.
function shuffleArr<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type ResultState = { correct: number; wrong: number; learnLeft: number };

const TITLE = {
  ru: 'Говорить', uk: 'Говорити', es: 'Hablar', 'pt-BR': 'Falar',
  vi: 'Nói', id: 'Bicara', tr: 'Konuş', pl: 'Mów',
} as const;

// ── Экран ────────────────────────────────────────────────────────────────────
export default function FlashcardsSpeakingSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak, stop: stopSpeech } = useAudio();
  const params = useLocalSearchParams<{ deck?: string; size?: string; devRunesSeed?: string | string[] }>();
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ
  // экран, но счётчик стартует со случайного числа вместо реальной копилки.
  // Диск и сеть в этом режиме не трогаются (см. hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const [speakingEnergyRevision, setSpeakingEnergyRevision] = useState(0);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `flashcard-speaking:${attemptSessionId}`,
    initialQuestionId: 'flashcard-speaking:loading',
  });
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const attemptsModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const neutralVoiceSequenceRef = useRef(0);
  useEffect(() => () => {
    if (attemptsModalTimerRef.current) clearTimeout(attemptsModalTimerRef.current);
  }, []);

  // Сессия говорения — руки заняты, экран не гасим (как в слушании).
  useKeepAwake();

  const deckRefs = useMemo<DeckRef[]>(() => {
    const parsed = parseDeckParams(params.deck);
    return parsed.length > 0 ? parsed : [{ kind: 'saved' }];
  }, [params.deck]);
  const deckKey = useMemo(() => deckRefs.map(deckRefKey).join(','), [deckRefs]);
  const sessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    const n = raw ? parseInt(raw, 10) : NaN;
    return isValidSessionSize(n) ? n : FC_DEFAULT_SESSION_SIZE;
  }, [params.size]);
  const contentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const reduceMotion = useFcReduceMotion();

  const [loading, setLoading] = useState(true);
  // Старт сессии «Говорить» = 1 ⚡ (владелец 2026-08-23: единая экономика).
  const {
    confirmSpendOne: confirmSpeakEnergy,
    refundOne: refundSpeakEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const speakingEnergyIntent = useEnergySessionIntent(
    'flashcards_speaking',
    deckKey || 'saved',
    `${attemptSessionId}:${speakingEnergyRevision}`,
  );
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const speakingEntryChargedRef = useRef(false);
  const speakingRefundInFlightRef = useRef<Promise<void> | null>(null);
  const refundSpeakingEntry = useCallback((operationId: string, reason: string): Promise<void> => {
    if (speakingRefundInFlightRef.current) return speakingRefundInFlightRef.current;
    const pending = refundSpeakEnergy(operationId, reason).then(() => {
      speakingEntryChargedRef.current = false;
      setSpeakingEnergyRevision((current) => current + 1);
    }).catch(() => {});
    speakingRefundInFlightRef.current = pending;
    void pending.finally(() => {
      if (speakingRefundInFlightRef.current === pending) speakingRefundInFlightRef.current = null;
    });
    return pending;
  }, [refundSpeakEnergy]);
  const [session, setSession] = useState<SpeakingSessionState>(() => initialSpeakingState([]));
  const sessionRef = useRef(session);
  const mistakeCaptureRunRef = useRef(`flashcard-speaking-${Date.now().toString(36)}`);
  sessionRef.current = session;
  const [task, setTask] = useState<SpeakingTask>(DEFAULT_SPEAKING_PREFS.task);
  const [flipped, setFlipped] = useState(false);
  /** Микрофон зажат прямо сейчас — SpeakingPanel слушает. */
  const [holdActive, setHoldActive] = useState(false);
  /**
   * Панель уткнулась в тупик (не расслышал / завис движок / нет доступа к
   * микрофону / устройство не умеет распознавать речь) и сама выйти из него
   * не может — presentation="inline" не имеет кнопки «Дальше»/«Закрыть» для
   * этих статусов (только «Открыть настройки» на denied). Раньше это держало
   * карточку залипшей навсегда: phase оставался 'live', «Пропустить» и
   * «Послушать» были заблокированы holdActive, единственный выход — снова
   * зажать микрофон и надеяться на удачу (а для 'unavailable' и это не
   * помогает — устройство физически не распознаёт речь).
   */
  const [stuck, setStuck] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  // зачем (владелец, 2026-08-27): «Добить» (onRetryWrong) — второй раунд ТОЙ ЖЕ
  // попытки по оставшимся ошибочным карточкам, не новое прохождение — ordinal
  // фиксирован, копилка продолжает жить через оба раунда без сброса.
  const practiceRunes = usePracticeRunes({
    activity: 'speaking_practice',
    sessionKey: attemptSessionId,
    completionOrdinal: 1,
    devFakeStartRunes: devRunesFake?.runes,
  });
  useEffect(() => {
    if (result) void practiceRunes.settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  /** Ключ монтирования панели: новая попытка → свежая панель (без хвостов прошлой). */
  const attemptKeyRef = useRef(0);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const card = currentSpeakingCard(session);
  const progress = speakingProgress(session);
  const phase = session.phase;

  // ── Загрузка карточек + настроек ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let chargedOperationId: string | null = null;
    let entryGranted = false;
    void (async () => {
      if (speakingRefundInFlightRef.current) {
        await speakingRefundInFlightRef.current;
        return;
      }
      if (cancelled) return;
      const [pool, rawPrefs] = await Promise.all([
        loadDeckCardsMulti(deckRefs, contentLang, { shuffle: true }).catch((): DeckCard[] => []),
        AsyncStorage.getItem(FC_SPEAKING_PREFS_KEY).catch(() => null),
      ]);
      if (cancelled) return;
      const prefs = parseSpeakingPrefs(rawPrefs);
      const cards = shuffleArr(pool).slice(0, sessionSize);
      if (cards.length === 0) {
        setSession(initialSpeakingState([]));
        setLoading(false);
        return;
      }
      if (!speakingEntryChargedRef.current) {
        speakingEntryChargedRef.current = true;
        const energyResult = await confirmSpeakEnergy(speakingEnergyIntent);
        if (energyResult === 'spent') chargedOperationId = speakingEnergyIntent.operationId;
        if (cancelled) {
          if (chargedOperationId) {
            void refundSpeakingEntry(chargedOperationId, 'entry_cancelled');
          }
          return;
        }
        if (energyResult === 'cancelled') {
          safeRouterBack(router, '/flashcards' as never);
          return;
        }
        if (energyResult === 'insufficient') { setNoEnergyOpen(true); setLoading(false); return; }
      }
      finishedRef.current = false;
      clearAdvanceTimer();
      setTask(prefs.task);
      setFlipped(false);
      setHoldActive(false);
      setStuck(false);
      setResult(null);
      setSession(initialSpeakingState(cards));
      setLoading(false);
      entryGranted = true;
      if (chargedOperationId) {
        void acknowledgeSessionStart(chargedOperationId).catch(() => {});
      }
    })().catch(async () => {
      if (chargedOperationId && !entryGranted) {
        await refundSpeakingEntry(chargedOperationId, 'entry_failed');
      }
      if (!cancelled) {
        setSession(initialSpeakingState([]));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      if (chargedOperationId && !entryGranted) {
        void refundSpeakingEntry(chargedOperationId, 'entry_cancelled');
      }
    };
    // deckRefs пересоздаётся на каждый рендер; deckKey — стабильный ключ того же списка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acknowledgeSessionStart, clearAdvanceTimer, confirmSpeakEnergy, contentLang, deckKey, refundSpeakingEntry, router, sessionSize, speakingEnergyIntent]);

  // ── Финал ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !session.finished || session.queue.length === 0 || finishedRef.current) return;
    finishedRef.current = true;
    stopSpeech();
    const summary = summarizeSpeaking(session);
    setResult({ correct: summary.correct, wrong: summary.wrong, learnLeft: summary.learnKeys.length });
  }, [loading, session, stopSpeech]);

  // ── Выход: глушим речь и таймеры ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAdvanceTimer();
      stopSpeech();
    };
  }, [clearAdvanceTimer, stopSpeech]);

  const speakCard = useCallback(
    (c: DeckCard | null) => {
      if (!c) return;
      speak(c.en, undefined, { language: 'en-US' });
    },
    [speak],
  );

  /**
   * «Повтори за диктором»: эталон звучит сам при появлении карточки —
   * в этом смысл задания (опора полная). В «Скажи по-английски» — тишина:
   * подсказка только по запросу.
   */
  const cardId = card?.id ?? null;
  useEffect(() => {
    if (!cardId) return;
    attempts.updateQuestion(`flashcard-speaking:${cardId}:${session.index}`);
  }, [attempts.updateQuestion, cardId, session.index]);
  useEffect(() => {
    if (loading || !cardId || task !== 'repeat' || phase !== 'idle') return;
    const c = sessionRef.current.queue[sessionRef.current.index];
    if (!c || c.id !== cardId) return;
    // Небольшая пауза: экран/флип успевают встать до речи.
    const timer = setTimeout(() => speakCard(c), 350);
    return () => clearTimeout(timer);
    // Озвучиваем один раз на карточку, не на каждую смену фазы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cardId, task]);

  // ── Микрофон: удержание → панель слушает; отпускание → панель оценивает ───
  const onHoldStart = useCallback(() => {
    const s = sessionRef.current;
    if (s.finished || !currentSpeakingCard(s)) return;
    clearAdvanceTimer();
    // Эталон не должен попасть в микрофон (панель тоже глушит, но лучше сразу).
    stopSpeech();
    // Новая попытка после тупика — пробуем снова начисто: свежий key панели
    // (тупиковый статус мог быть на предыдущей попытке) и сброс stuck.
    if (s.phase !== 'live' || stuck) attemptKeyRef.current += 1;
    setStuck(false);
    setSession((cur) => beginSpeakingAttempt(cur));
    setHoldActive(true);
  }, [clearAdvanceTimer, stopSpeech, stuck]);

  const onHoldEnd = useCallback(() => {
    setHoldActive(false);
  }, []);

  const goNext = useCallback((opts?: { skip?: boolean; force?: boolean }) => {
    clearAdvanceTimer();
    stopSpeech();
    setFlipped(false);
    setStuck(false);
    setSession((cur) => advanceSpeaking(cur, opts));
  }, [clearAdvanceTimer, stopSpeech]);

  const onScore = useCallback(
    (attempt: SpeakingAttempt) => {
      const s = sessionRef.current;
      if (s.phase !== 'live') return;
      setHoldActive(false);
      setStuck(false);
      const scoredState = scoreSpeakingAttempt(s, attempt);
      sessionRef.current = scoredState;
      setSession(scoredState);
      const failedCard = currentSpeakingCard(s);
      const attemptEffect = attempts.registerVerdict({
        answerAttemptId: [
          attemptSessionId,
          failedCard?.id ?? 'unknown',
          String(s.index),
          String(scoredState.attemptsOnCard),
        ].join(':'),
        verdict: attempt.passed ? 'correct' : 'pedagogical_wrong',
      });
      // зачем (владелец, 2026-08-27): руна за карточку — засчитывается один
      // раз за сессию, сколько бы попыток на неё ни ушло до зачёта.
      if (attempt.passed && failedCard) practiceRunes.onCorrectAnswer(failedCard.id);
      // Раскрываем английский — и на зачёте (подтверждение), и на промахе (учимся).
      setFlipped(task === 'recall');
      if (attempt.passed) {
        fcHaptic('correct');
        playSfx('correct');
        void trackEvent('speaking_attempt_passed', { source: 'flashcards', score: attempt.score });
        clearAdvanceTimer();
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          goNext();
        }, SPEAKING_AUTO_ADVANCE_MS);
      } else {
        if (failedCard && (studyTarget === 'en' || studyTarget === 'fr')) {
          void captureCurrentAccountObjectiveAttempt({
            attemptId: `${mistakeCaptureRunRef.current}:${s.index}:${failedCard.id}:${attempt.score}`,
            studyTarget,
            verdict: 'wrong',
            objective: true,
            content: {
              sourceKind: 'flashcard',
              sourceId: failedCard.id,
              canonicalTarget: failedCard.en,
              sourceMeaning: failedCard.translation,
            },
            facet: { kind: 'pronunciation', expected: failedCard.en },
          }).catch(() => {});
        }
        fcHaptic('wrong');
        playSfx('incorrect');
      }
      if (attemptEffect === 'attempts_exhausted') {
        clearAdvanceTimer();
        setHoldActive(false);
        stopSpeech();
        attemptsModalTimerRef.current = setTimeout(
          () => setShowAttemptsModal(true),
          SESSION_ATTEMPTS_MOTION.exhaustedModalDelayMs,
        );
      }
    },
    [attemptSessionId, attempts.registerVerdict, task, clearAdvanceTimer, goNext, stopSpeech, studyTarget],
  );

  /** Панель закрылась сама (отказ движка / «нет речи») — ждём удержания снова. */
  const onPanelClose = useCallback(() => {
    setHoldActive(false);
    attempts.registerVerdict({
      answerAttemptId: `${attemptSessionId}:cancelled:${neutralVoiceSequenceRef.current++}`,
      verdict: 'cancelled',
    });
    setSession((cur) => cancelSpeakingAttempt(cur));
  }, [attemptSessionId, attempts.registerVerdict]);

  /**
   * Тупиковый статус движка (см. коммент у `stuck`): панель сама не сообщает
   * ни оценку, ни закрытие — держим её видимой (текст ошибки/кнопка
   * «Открыть настройки» никуда не денутся, key не меняем), но разблокируем
   * выход из карточки. holdActive гасим — микрофон физически не слушает.
   */
  const DEAD_END_STATUSES = useMemo(
    () => new Set(['no_speech', 'stalled', 'denied', 'unavailable']),
    [],
  );
  const onPanelStatusChange = useCallback(
    (status: string) => {
      if (DEAD_END_STATUSES.has(status)) {
        setHoldActive(false);
        setStuck(true);
        attempts.registerVerdict({
          answerAttemptId: `${attemptSessionId}:voice-status:${status}:${neutralVoiceSequenceRef.current++}`,
          verdict: status === 'no_speech' ? 'no_speech' : 'technical_error',
        });
      }
    },
    [attemptSessionId, attempts.registerVerdict, DEAD_END_STATUSES],
  );

  const onRetry = useCallback(() => {
    fcHaptic('tap');
    clearAdvanceTimer();
    setFlipped(false);
    setSession((cur) => (cur.phase === 'scored' ? { ...cur, phase: 'idle', attempt: null } : cur));
  }, [clearAdvanceTimer]);

  const retryCurrentSpeakingCardAfterRecovery = useCallback(async (source: 'gift' | 'runes') => {
    try {
      if (source === 'gift') await attempts.recoverWithGift();
      else await attempts.recoverWithRunes();
      clearAdvanceTimer();
      stopSpeech();
      setShowAttemptsModal(false);
      setHoldActive(false);
      setStuck(false);
      setFlipped(false);
      attemptKeyRef.current += 1;
      setSession((cur) => (cur.phase === 'scored' ? { ...cur, phase: 'idle', attempt: null } : cur));
    } catch {
      // The same speaking card remains stopped beneath the recovery modal.
    }
  }, [attempts.recoverWithGift, attempts.recoverWithRunes, clearAdvanceTimer, stopSpeech]);

  const endExhaustedSpeakingSession = useCallback(() => {
    attempts.endAttemptsSession();
    clearAdvanceTimer();
    stopSpeech();
    setHoldActive(false);
    setShowAttemptsModal(false);
    const summary = summarizeSpeaking(sessionRef.current);
    setResult({ correct: summary.correct, wrong: summary.wrong, learnLeft: summary.learnKeys.length });
  }, [attempts.endAttemptsSession, clearAdvanceTimer, stopSpeech]);

  const onPickTask = useCallback((next: SpeakingTask) => {
    fcHaptic('tap');
    stopSpeech();
    setTask(next);
    setFlipped(false);
    saveSpeakingPrefs({ task: next });
  }, [stopSpeech]);

  const leave = useCallback(() => {
    fcHaptic('tap');
    safeRouterBack(router, '/flashcards' as never);
  }, [router]);

  /** «Добить»: второй раунд только по несданным карточкам, тот же экран. */
  const onRetryWrong = useCallback(() => {
    const cards = speakingRetryCards(sessionRef.current);
    if (cards.length === 0) return;
    finishedRef.current = false;
    clearAdvanceTimer();
    setResult(null);
    setFlipped(false);
    setHoldActive(false);
    setStuck(false);
    setSession(initialSpeakingState(cards));
  }, [clearAdvanceTimer]);

  // ── Выбор наборов из самого режима (как в слушании/блице) ─────────────────
  const autoPickedRef = useRef(false);
  useEffect(() => {
    autoPickedRef.current = false;
  }, [deckKey]);
  useEffect(() => {
    if (loading || session.queue.length > 0 || result || autoPickedRef.current) return;
    autoPickedRef.current = true;
    setDeckPickerOpen(true);
  }, [loading, session.queue.length, result, deckKey]);

  useEffect(() => {
    if (!deckPickerOpen) return;
    let cancelled = false;
    void (async () => {
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions('speaking', lang).catch(() => [] as DeckSheetOption[]),
        getLastPreset('speaking').catch(() => null),
      ]);
      if (cancelled) return;
      setDeckOptions(decks);
      setDeckPreset(preset);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckPickerOpen, lang]);

  const openDeckPicker = useCallback(() => {
    fcHaptic('tap');
    stopSpeech();
    setDeckPickerOpen(true);
  }, [stopSpeech]);
  const closeDeckPicker = useCallback(() => setDeckPickerOpen(false), []);

  const startWithPreset = useCallback(
    (preset: FcModePreset) => {
      setDeckPickerOpen(false);
      const decks = presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID);
      const deck = deckRouteParam(decks) || 'saved';
      if (parseDeckParams(deck).map(deckRefKey).join(',') === deckKey && preset.size === sessionSize) return;
      router.replace({
        pathname: '/flashcards_speaking_session',
        params: { deck, size: String(preset.size) },
      } as never);
    },
    [deckKey, router, sessionSize],
  );

  const deckPickerSheet = (
    <DeckPickerSheet
      visible={deckPickerOpen}
      onClose={closeDeckPicker}
      onStart={startWithPreset}
      decks={deckOptions}
      initialPreset={deckPreset}
      lang={lang}
      t={t}
      f={f}
      reduceMotion={reduceMotion}
      mode="speaking"
      showsEnergyCostForPreset={(preset) => {
        const nextDeck = deckRouteParam(presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID)) || 'saved';
        return parseDeckParams(nextDeck).map(deckRefKey).join(',') !== deckKey || preset.size !== sessionSize;
      }}
    />
  );

  const deckTitle = useMemo(() => {
    if (deckRefs.length > 1) return decksCountLabel(lang, deckRefs.length);
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', en: 'My cards', es: 'Mis tarjetas', 'pt-BR': 'Meus cartões',
      vi: 'Thẻ của tôi', id: 'Kartu saya', tr: 'Kartlarım', pl: 'Moje fiszki',
    });
    if (deckRef.kind === 'pack') return triLang(lang, {
      ru: 'Набор карточек', uk: 'Набір карток', en: 'Card pack', es: 'Pack de tarjetas', 'pt-BR': 'Pacote de cartões',
      vi: 'Bộ thẻ', id: 'Set kartu', tr: 'Kart seti', pl: 'Zestaw fiszek',
    });
    return triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    });
  }, [deckRefs, lang]);

  const labels = useMemo(
    () => ({
      title: triLang(lang, TITLE),
      recall: triLang(lang, {
        ru: 'Скажи по-английски', uk: 'Скажи англійською', en: 'Say it in English', es: 'Dilo en inglés',
        'pt-BR': 'Diga em inglês', vi: 'Nói bằng tiếng Anh', id: 'Ucapkan dalam bahasa Inggris',
        tr: 'İngilizce söyle', pl: 'Powiedz po angielsku',
      }),
      repeat: triLang(lang, {
        ru: 'Повтори за диктором', uk: 'Повтори за диктором', en: 'Repeat after the speaker', es: 'Repite al locutor',
        'pt-BR': 'Repita o locutor', vi: 'Nhắc lại theo giọng đọc', id: 'Tirukan pembaca',
        tr: 'Spikeri tekrar et', pl: 'Powtórz za lektorem',
      }),
      holdIdle: triLang(lang, {
        ru: 'Зажми и говори', uk: 'Затисни й говори', en: 'Hold and speak', es: 'Mantén y habla',
        'pt-BR': 'Segure e fale', vi: 'Giữ và nói', id: 'Tahan dan bicara',
        tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów',
      }),
      holdLive: triLang(lang, {
        ru: 'Слушаю…', uk: 'Слухаю…', en: 'Listening…', es: 'Escuchando…', 'pt-BR': 'Ouvindo…',
        vi: 'Đang nghe…', id: 'Mendengarkan…', tr: 'Dinliyorum…', pl: 'Słucham…',
      }),
      holdAgain: triLang(lang, {
        ru: 'Зажми — скажи ещё раз', uk: 'Затисни — скажи ще раз', en: 'Hold — say it again', es: 'Mantén y repite',
        'pt-BR': 'Segure e repita', vi: 'Giữ và nói lại', id: 'Tahan dan ulangi',
        tr: 'Basılı tut, tekrar söyle', pl: 'Przytrzymaj i powtórz',
      }),
      next: triLang(lang, {
        ru: 'Продолжить', uk: 'Продовжити', en: 'Next', es: 'Siguiente', 'pt-BR': 'Próximo',
        vi: 'Tiếp', id: 'Lanjut', tr: 'Sonraki', pl: 'Dalej',
      }),
      skip: triLang(lang, {
        ru: 'Пропустить', uk: 'Пропустити', en: 'Skip', es: 'Saltar', 'pt-BR': 'Pular',
        vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń',
      }),
      retry: triLang(lang, {
        ru: 'Ещё раз', uk: 'Ще раз', en: 'Again', es: 'Otra vez', 'pt-BR': 'De novo',
        vi: 'Thử lại', id: 'Lagi', tr: 'Tekrar', pl: 'Jeszcze raz',
      }),
      listen: triLang(lang, {
        ru: 'Послушать', uk: 'Послухати', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir',
        vi: 'Nghe', id: 'Dengar', tr: 'Dinle', pl: 'Posłuchaj',
      }),
      pickDecks: triLang(lang, {
        ru: 'Выбрать наборы', uk: 'Обрати набори', en: 'Choose packs', es: 'Elegir packs',
        'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih set kartu',
        tr: 'Setleri seç', pl: 'Wybierz zestawy',
      }),
      empty: triLang(lang, {
        ru: 'Здесь пока нечего говорить — выберите наборы',
        uk: 'Тут поки нема чого говорити — оберіть набори',
        en: 'Nothing to say here yet — pick some packs',
        es: 'Aún no hay nada que decir: elige los packs',
        'pt-BR': 'Ainda não há o que falar: escolha os pacotes',
        vi: 'Chưa có gì để nói — hãy chọn bộ thẻ',
        id: 'Belum ada yang bisa diucapkan — pilih set kartu',
        tr: 'Söylenecek bir şey yok — setleri seçin',
        pl: 'Nie ma jeszcze czego mówić — wybierz zestawy',
      }),
      spokenCount: triLang(lang, {
        ru: 'Сказано', uk: 'Сказано', en: 'Said', es: 'Dichas', 'pt-BR': 'Ditas',
        vi: 'Đã nói', id: 'Diucapkan', tr: 'Söylenen', pl: 'Powiedziane',
      }),
    }),
    [lang],
  );

  const panelTheme = useMemo(() => buildSpeakingPanelTheme(t), [t]);

  // ── Рендер ─────────────────────────────────────────────────────────────────
  const header = (interactive: boolean) => (
    <>
      {/* Руны за сессию (владелец, 2026-08-27): шапка ниже — самая плотная из
          семи экранов (попытки + прогресс + выбор наборов), поэтому руны
          вынесены отдельной строкой сверху, а не втиснуты в тот же ряд. */}
      {interactive ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 }}>
          <PracticeRuneCounter
            runes={practiceRunes.runes}
            lang={lang}
            backgroundColor={t.bgCard}
            color={t.textPrimary}
            testID="fc-speak-practice-runes"
          />
        </View>
      ) : null}
    <View style={styles.headerRow}>
      {interactive ? (
        <TouchableOpacity
          onPress={leave}
          style={{ padding: 4 }}
          testID="fc-speak-back"
          accessibilityRole="button"
          accessibilityLabel="qa-fc-speak-back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </View>
      )}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>{labels.title}</Text>
        {interactive ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1}>{deckTitle}</Text>
        ) : (
          <SkeletonBlock width={120} height={f.caption} />
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SessionAttemptsHud
          remaining={attempts.state.remainingAttempts}
          locale={lang}
          testID="fc-speak-session-attempts"
        />
        {interactive ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption, minWidth: 44, textAlign: 'right' }} testID="fc-speak-progress">
            {progress.position} / {progress.total}
          </Text>
        ) : (
          <SkeletonBlock width={44} height={f.caption} />
        )}
        <TouchableOpacity
          testID="fc-speak-pick-decks"
          accessibilityLabel="qa-fc-speak-pick-decks"
          accessible
          accessibilityRole="button"
          onPress={openDeckPicker}
          disabled={!interactive}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <Ionicons name="albums-outline" size={20} color={t.textMuted} />
        </TouchableOpacity>
        {/* зачем: говорение сверяет речь с эталонной фразой card.en — если эталон
            неверен, «попасть» в него нельзя в принципе, и человек застревает.
            Флаг только в живом состоянии: в скелетоне карточки ещё нет. */}
        {interactive && card ? (
          <ReportErrorButton
            screen="flashcards_speaking"
            dataId={`flashcard_${card.id ?? 'unknown'}`}
            dataText={`EN: ${card.en}
RU: ${card.translation}`}
            variant="icon-flag"
            accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', uk: 'Повідомити про помилку в картці', en: 'Report an error in the card', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w fiszce' })}
            testID="fc-speak-report"
          />
        ) : null}
      </View>
    </View>
    </>
  );

  /**
   * Performance Bible: первый кадр = финальная геометрия. На загрузке держим
   * шапку, прогресс, место карточки, слот панели и транспортный ряд.
   */
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            {header(false)}
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]} />
            <View style={styles.cardArea}>
              <SkeletonBlock width="100%" height={CARD_MIN_H} borderRadius={24} />
            </View>
            <SpeakingInlineSlot style={styles.inlineSlot} />
            <View style={styles.taskRow}>
              <SkeletonBlock width="100%" height={40} borderRadius={14} />
            </View>
            <View style={styles.transportRow}>
              <SkeletonBlock width={54} height={54} borderRadius={27} />
              <SkeletonBlock width={98} height={98} borderRadius={49} />
              <SkeletonBlock width={54} height={54} borderRadius={27} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (result) {
    return (
      <SessionResultScreen
        correct={devRunesFake ? devRunesFake.tertiary + 4 : result.correct}
        wrong={devRunesFake ? devRunesFake.tertiary : result.wrong}
        xpGained={0}
        runesGained={practiceRunes.runes}
        learnLeft={result.learnLeft}
        onRetryWrong={result.learnLeft > 0 ? onRetryWrong : undefined}
        onDone={leave}
        accentColor={ACCENT}
        testID="fc-speak-result"
      />
    );
  }

  if (session.queue.length === 0) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            {header(true)}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
              <Ionicons name="mic-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>{labels.empty}</Text>
              <TouchableOpacity
                testID="fc-speak-pick-decks-empty"
                accessibilityLabel="qa-fc-speak-pick-decks"
                accessible
                onPress={openDeckPicker}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: t.bgSurface,
                }}
              >
                <Ionicons name="albums-outline" size={18} color={ACCENT} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{labels.pickDecks}</Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
        {deckPickerSheet}
      </ScreenGradient>
    );
  }

  const front = task === 'recall' ? card?.translation ?? '' : card?.en ?? '';
  const back = task === 'recall' ? card?.en ?? '' : card?.translation ?? '';
  const attempt = session.attempt;
  const band = attempt ? speakingBand(attempt.score, SPEECH_PRONUNCIATION_PASS_THRESHOLD) : null;
  /**
   * зачем (владелец, 2026-08-17, скриншот): подпись «Зажми — скажи ещё раз»
   * раньше показывалась и после ЗАЧЁТА (phase==='scored' безусловно) — но там
   * идёт автопереход на НОВУЮ карточку, и на ней снова нужно нейтральное
   * «Зажми и говори», а не «ещё раз» (ещё раз чего? фраза уже другая). «Скажи
   * ещё раз» осмысленно только после промаха/тупика — той же карточки.
   */
  const holdLabel = holdActive
    ? labels.holdLive
    : stuck || (phase === 'scored' && attempt?.passed === false)
      ? labels.holdAgain
      : phase === 'live'
        ? ''
        : labels.holdIdle;
  const spoken = session.events.filter((e) => e.correct).length;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {header(true)}

          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: ACCENT, width: `${(progress.position / progress.total) * 100}%` },
              ]}
            />
          </View>

          {/* Карточка: тап — подсмотреть/вернуть. Динамик — только в транспорте
              снизу (владелец, 2026-08-17): кнопка на самой карточке дублировала
              «Послушать» из транспортного ряда, убрана. */}
          <View style={styles.cardArea}>
            <PhraseCard
              mode="view"
              en={front}
              translation={back}
              flipped={flipped}
              onFlip={setFlipped}
              minHeight={CARD_MIN_H}
              disabled={holdActive}
              testID="fc-speak-card"
              renderFront={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={5}
                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: '700', textAlign: 'center' }}
                  >
                    {front}
                  </Text>
                </View>
              )}
              renderBack={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={6}
                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: task === 'recall' ? '700' : '500', textAlign: 'center' }}
                  >
                    {back}
                  </Text>
                </View>
              )}
            />
            <View style={styles.spokenRow}>
              <Ionicons name="mic-outline" size={13} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }} testID="fc-speak-count">
                {labels.spokenCount}: {spoken}
              </Text>
            </View>
          </View>

          {/* Слот панели говорения — одна геометрия во всех состояниях. */}
          <SpeakingInlineSlot style={styles.inlineSlot}>
            {phase === 'live' && card ? (
              <SpeakingPanel
                key={`${card.id}:${attemptKeyRef.current}`}
                targetText={card.en}
                lang={lang}
                theme={panelTheme}
                presentation="inline"
                holdActive={holdActive}
                onScore={onScore}
                onClose={onPanelClose}
                onStatusChange={onPanelStatusChange}
              />
            ) : phase === 'scored' && attempt && band ? (
              <View style={[styles.resultCard, { backgroundColor: t.bgCard }]} testID="fc-speak-attempt-result">
                <SpeakingInlineResultStars result={attempt} theme={panelTheme} testID="fc-speak-stars" />
                <Text
                  style={{ color: attempt.passed ? t.correct : t.textPrimary, fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {speakingBandLabel(band, lang)}
                </Text>
                {!attempt.passed ? (
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      testID="fc-speak-retry"
                      accessibilityRole="button"
                      accessibilityLabel={labels.retry}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={onRetry}
                      style={[styles.resultBtn, { backgroundColor: `${ACCENT}22` }]}
                    >
                      <Ionicons name="refresh" size={16} color={ACCENT} />
                      <Text style={{ color: ACCENT, fontSize: f.caption, fontWeight: '800' }}>{labels.retry}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="fc-speak-next"
                      accessibilityRole="button"
                      accessibilityLabel={labels.next}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={() => { fcHaptic('tap'); goNext(); }}
                      style={[styles.resultBtn, { backgroundColor: t.bgSurface }]}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{labels.next}</Text>
                      <Ionicons name="arrow-forward" size={16} color={t.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}
          </SpeakingInlineSlot>

          {/* Тип задания — две круглые кнопки с иконкой, без текста (владелец,
              2026-08-17): подписи «Скажи по-англи…»/«Повтори за дикт…» резались
              многоточием на узких экранах. Подпись живёт в accessibilityLabel —
              экранный диктор объявляет полный смысл, зрячий выбирает по цвету
              заливки активной кнопки (тон, не обводка). */}
          <View style={styles.taskRow} testID="fc-speak-task">
            {SPEAKING_TASKS.map((option) => {
              const active = option === task;
              const optionLabel = option === 'recall' ? labels.recall : labels.repeat;
              return (
                <TouchableOpacity
                  key={option}
                  testID={`fc-speak-task-${option}`}
                  accessibilityRole="button"
                  accessibilityLabel={optionLabel}
                  accessibilityState={{ selected: active }}
                  onPress={() => onPickTask(option)}
                  disabled={holdActive}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[
                    styles.taskCircle,
                    { backgroundColor: active ? ACCENT : t.bgSurface },
                  ]}
                >
                  <Ionicons
                    name={option === 'recall' ? 'bulb-outline' : 'repeat-outline'}
                    size={20}
                    color={active ? t.correctText : t.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Транспорт: пропустить · зажми-и-говори · послушать.
              `stuck` (панель уткнулась в тупик без своего выхода) разблокирует
              оба соседа: живой holdActive там уже не идёт, запись фактически
              остановлена — держать «Пропустить»/«Послушать» под замком нечестно. */}
          <View style={styles.transportRow}>
            <TouchableOpacity
              onPress={() => { fcHaptic('tap'); goNext({ skip: phase !== 'scored', force: stuck }); }}
              disabled={holdActive && !stuck}
              testID="fc-speak-skip"
              accessibilityLabel="qa-fc-speak-skip"
              accessibilityHint={phase === 'scored' ? labels.next : labels.skip}
              accessibilityRole="button"
              accessibilityState={{ disabled: holdActive && !stuck }}
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface, opacity: holdActive && !stuck ? 0.5 : 1 }]}
            >
              <Ionicons name="play-skip-forward" size={22} color={t.textPrimary} />
            </TouchableOpacity>
            <SpeakHoldButton
              accent={ACCENT}
              listening={holdActive}
              disabled={!card}
              reduceMotion={reduceMotion}
              onHoldStart={onHoldStart}
              onHoldEnd={onHoldEnd}
              label={holdLabel}
            />
            <TouchableOpacity
              onPress={() => { fcHaptic('tap'); speakCard(card); }}
              disabled={holdActive && !stuck}
              testID="fc-speak-listen"
              accessibilityLabel="qa-fc-speak-listen"
              accessibilityHint={labels.listen}
              accessibilityRole="button"
              accessibilityState={{ disabled: holdActive && !stuck }}
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface, opacity: holdActive ? 0.5 : 1 }]}
            >
              <Ionicons name="volume-high" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
      {deckPickerSheet}
      <NoEnergyModal visible={noEnergyOpen} onClose={leave} />
      <SessionAttemptsRecoveryModal
        visible={showAttemptsModal && attempts.state.phase === 'awaiting_recovery'}
        locale={lang}
        giftCount={attempts.giftCount}
        runeBalance={attempts.runeBalance ?? 0}
        busy={attempts.recoveryBusy}
        onUseGift={() => { void retryCurrentSpeakingCardAfterRecovery('gift'); }}
        onSpendRunes={() => { void retryCurrentSpeakingCardAfterRecovery('runes'); }}
        onEndSession={endExhaustedSpeakingSession}
      />
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
  progressTrack: { height: 4, borderRadius: 2, marginHorizontal: 16, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  cardFace: { alignItems: 'center', width: '100%', paddingVertical: 12, gap: 12 },
  spokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  inlineSlot: { paddingHorizontal: 24 },
  resultCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 14,
  },
  taskCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportRow: {
    flexDirection: 'row',
    // зачем (владелец, 2026-08-17): центр «зажми-и-говори» — круг + подпись
    // под ним, боковые кнопки — просто круг. `center` центрировал боковые по
    // ВСЕЙ высоте (круг+подпись), поэтому они садились выше, чем низ круга
    // микрофона. `flex-end` + компенсация в sideBtn сажает все три круга на
    // одну линию, подпись остаётся ниже них.
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 22,
    marginTop: 14,
    marginBottom: 14,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    // Поднимаем боковые кнопки на высоту подписи под микрофоном (см. sideBtn
    // выше) — их низ совпадает с низом круга, а не с низом подписи.
    marginBottom: SPEAK_HOLD_LABEL_HEIGHT,
  },
});
