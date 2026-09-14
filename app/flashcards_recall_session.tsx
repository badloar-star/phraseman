import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Reanimated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import ContentWrap from '../components/ContentWrap';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { useLang } from '../components/LangContext';
import { LearningV2RuneFlight } from '../components/LearningV2RuneFlight';
import NoEnergyModal from '../components/NoEnergyModal';
import { PracticeRuneCounter } from '../components/PracticeRuneCounter';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import SkeletonBlock from '../components/SkeletonShimmer';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { usePracticeRuneFlight } from '../hooks/usePracticeRuneFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { captureAccountGeneration } from './account_generation';
import {
  acknowledgeAndClearFlashcardTrainingPendingGrant,
  abandonFlashcardTrainingPendingGrant,
  discardFlashcardTrainingPendingGrant,
  markFlashcardTrainingEnergyCharged,
  markFlashcardTrainingPendingGrantPlayable,
  markFlashcardTrainingQuotaCommitted,
  prepareFlashcardTrainingPendingGrant,
  reconcileFlashcardTrainingPendingGrant,
  resolveFlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantRecord,
} from './flashcard_training_pending_grant';
import { consumeFlashcardTrainingQuota } from './revenue_quota_access';
import { flashcardContentLang } from './spanish_content_gate';
import {
  deckRefKey,
  loadDeckCardsMulti,
  parseDeckParams,
  type DeckCard,
  type DeckRef,
} from './flashcards/deck_sources';
import { isFullPhraseFuzzyCorrect } from './flashcards/fuzzy_match';
import { FC_DEFAULT_SESSION_SIZE, isValidSessionSize } from './flashcards/mode_prefs';
import {
  requeueAfterMistake,
  summarizeSession,
  type SessionAnswerEvent,
  type SessionOutcomeSummary,
} from './flashcards/session_queue';
import { SessionResultScreen } from './flashcards/SessionResultScreen';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { fcHaptic, playSfx } from './flashcards/SoundService';

const MAX_INPUT_LENGTH = 220;

type RecallFeedback = Readonly<{
  kind: 'correct' | 'typo' | 'wrong';
  expected: string;
}>;

type RecallResult = Readonly<{
  summary: SessionOutcomeSummary;
  learnIds: readonly string[];
}>;

function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export default function FlashcardsRecallSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    deck?: string | string[];
    size?: string | string[];
  }>();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, statusBarLight } = useTheme();
  const { accessResolved } = usePremium();
  const reducedMotion = useReducedMotion();
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `flashcard-recall:${attemptSessionId}`,
    initialQuestionId: 'flashcard-recall:loading',
  });
  const attemptsPhase = attempts.state.phase;
  const registerAttemptVerdict = attempts.registerVerdict;
  const updateAttemptQuestion = attempts.updateQuestion;

  const deckParam = Array.isArray(params.deck) ? params.deck[0] : params.deck;
  const deckRefs = useMemo<DeckRef[]>(() => {
    const parsed = parseDeckParams(deckParam);
    return parsed.length > 0 ? parsed : [{ kind: 'saved' }];
  }, [deckParam]);
  const deckKey = useMemo(() => deckRefs.map(deckRefKey).join(','), [deckRefs]);
  const sessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    if (raw === 'all') return Number.MAX_SAFE_INTEGER;
    const parsed = Number(raw);
    return isValidSessionSize(parsed) ? parsed : FC_DEFAULT_SESSION_SIZE;
  }, [params.size]);
  const contentLang = useMemo(
    () => flashcardContentLang(lang, studyTarget),
    [lang, studyTarget],
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<DeckCard | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<RecallFeedback | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [remainingQueueCount, setRemainingQueueCount] = useState(0);
  const [result, setResult] = useState<RecallResult | null>(null);

  const queueRef = useRef<DeckCard[]>([]);
  const initialCardsRef = useRef<DeckCard[]>([]);
  const repeatCountsRef = useRef<Record<string, number>>({});
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const masteredIdsRef = useRef(new Set<string>());
  const shownAtRef = useRef(Date.now());
  const answerLockedRef = useRef(false);
  const promptRef = useRef<View>(null);
  const firstPromptPresentedRef = useRef(false);
  const runeFlight = usePracticeRuneFlight();
  const recallMountedRef = useRef(true);
  const recallExplicitlyAbandonedRef = useRef(false);
  const recallPendingGrantRef = useRef<{
    account: NonNullable<Awaited<ReturnType<typeof resolveFlashcardTrainingPendingGrantAccount>>>;
    record: FlashcardTrainingPendingGrantRecord;
  } | null>(null);

  const practiceRunes = usePracticeRunes({
    activity: 'flashcards_training',
    sessionKey: `recall_${deckKey}_${attemptSessionId}`,
    completionOrdinal: 1,
  });

  const {
    confirmSpendOne,
    refundOne,
    acknowledgeSessionStart,
  } = useEnergy();
  const energyIntent = useEnergySessionIntent(
    'flashcards_recall',
    deckKey || 'saved',
    attemptSessionId,
  );

  useEffect(() => {
    recallMountedRef.current = true;
    return () => { recallMountedRef.current = false; };
  }, []);

  const leave = useCallback(() => {
    recallExplicitlyAbandonedRef.current = true;
    const pending = recallPendingGrantRef.current;
    if (pending) {
      void (async () => {
        await abandonFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          refundOne,
          Date.now(),
          'entry_cancelled',
        );
        await discardFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
        );
      })().catch(() => {});
    }
    safeRouterBack(router, '/flashcards' as never);
  }, [refundOne, router]);

  const resetRound = useCallback((cards: readonly DeckCard[], preserveOrder = false) => {
    const round = preserveOrder ? cards.slice() : shuffle(cards);
    const first = round[0] ?? null;
    initialCardsRef.current = round;
    queueRef.current = round.slice(1);
    repeatCountsRef.current = {};
    eventsRef.current = [];
    masteredIdsRef.current = new Set();
    answerLockedRef.current = false;
    shownAtRef.current = Date.now();
    setActiveCard(first);
    setInput('');
    setFeedback(null);
    setAnswerRevealed(false);
    setHintVisible(false);
    setMasteredCount(0);
    setTotalCards(round.length);
    setRemainingQueueCount(round.length);
  }, []);

  useEffect(() => {
    if (!accessResolved) return undefined;
    let cancelled = false;
    recallExplicitlyAbandonedRef.current = false;
    setLoading(true);
    setLoadError(false);
    /** Локальный старт на случай отказа гранта — см. fail-open в catch ниже. */
    let recallLocalStart: (() => void) | null = null;
    void (async () => {
      let cards = await loadDeckCardsMulti(deckRefs, contentLang, {
        shuffle: true,
        studyTarget,
      });
      cards = cards.slice(0, sessionSize);
      if (cancelled) return;
      if (cards.length === 0) {
        setLoading(false);
        return;
      }
      const round = shuffle(cards);
      recallLocalStart = () => { resetRound(round, true); setLoading(false); };
      const pendingAccount = await resolveFlashcardTrainingPendingGrantAccount(accountToken);
      if (!pendingAccount) throw new Error('pending_grant_account_unavailable');
      const pendingScope = {
        mode: 'recall' as const,
        studyTarget,
        contentLang,
        deckKeys: deckRefs.map(deckRefKey),
        sessionSize,
        preset: 'recall',
      };
      const prepared = await prepareFlashcardTrainingPendingGrant({
        account: pendingAccount,
        scope: pendingScope,
        manifest: {
          schemaVersion: 'flashcard-training-manifest.v1',
          mode: 'recall',
          payload: JSON.parse(JSON.stringify({ round, energyIntent })),
        },
        attemptId: attemptSessionId,
        receiptId: `recall:${attemptSessionId}`,
        energyOperationId: energyIntent.operationId,
        energyEpoch: energyIntent.grant.attemptId,
      });
      if (prepared.status !== 'prepared' && prepared.status !== 'reused') {
        // зачем: без reason аудит по логу невозможен — «unavailable» ничего не объясняет.
        throw new Error(`pending_grant_${prepared.status}:${'reason' in prepared ? String(prepared.reason) : 'n/a'}`);
      }
      let pendingRecord = prepared.record;
      recallPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      const reconciled = await reconcileFlashcardTrainingPendingGrant(pendingAccount, pendingScope);
      if (reconciled.status === 'found') pendingRecord = reconciled.record;
      else if (reconciled.status !== 'missing') throw new Error(`pending_grant_reconcile_${reconciled.status}`);
      else return;
      recallPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      const restored = pendingRecord.manifest.payload as unknown as {
        round: DeckCard[];
        energyIntent: typeof energyIntent;
      };
      if (!Array.isArray(restored.round) || restored.round.length === 0) {
        throw new Error('pending_grant_manifest_invalid');
      }

      let energyCharged = pendingRecord.energyState === 'charged';
      const energyResult = energyCharged ? 'unlimited' : await confirmSpendOne(restored.energyIntent);
      if (energyResult === 'spent') {
        energyCharged = true;
        const marked = await markFlashcardTrainingEnergyCharged(
          pendingAccount,
          pendingRecord.fingerprint,
        );
        if ('record' in marked) pendingRecord = marked.record;
      }
      recallPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      if (cancelled || recallExplicitlyAbandonedRef.current) return;
      if (energyResult === 'cancelled') {
        await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
        recallPendingGrantRef.current = null;
        leave();
        return;
      }
      if (energyResult === 'insufficient') {
        await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
        recallPendingGrantRef.current = null;
        setNoEnergyOpen(true);
        setLoading(false);
        return;
      }

      if (pendingRecord.phase === 'prepared') {
        const quotaResult = await consumeFlashcardTrainingQuota({
          token: accountToken,
          accessResolved,
          receiptId: pendingRecord.receiptId,
          mode: 'recall',
        });
        if (quotaResult.status === 'allowed') {
          const marked = await markFlashcardTrainingQuotaCommitted(
            pendingAccount,
            pendingRecord.fingerprint,
            Date.now(),
            quotaResult.resetAt,
          );
          if ('record' in marked) pendingRecord = marked.record;
          recallPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
        } else {
          if (energyCharged) await abandonFlashcardTrainingPendingGrant(
            pendingAccount,
            pendingRecord.fingerprint,
            refundOne,
            Date.now(),
            'quota_refused',
          );
          await discardFlashcardTrainingPendingGrant(pendingAccount, pendingRecord.fingerprint);
          recallPendingGrantRef.current = null;
          if (!cancelled && quotaResult.status === 'exhausted') {
            setLoading(false);
            markNextNavigationAsReplace();
            router.replace({ pathname: '/premium_modal', params: {
              context: 'flashcard_training', source: 'flashcards_recall_direct',
            } } as never);
          } else if (!cancelled) {
            setLoadError(true);
            setLoading(false);
          }
          return;
        }
      }

      if (cancelled || !recallMountedRef.current || recallExplicitlyAbandonedRef.current) return;
      resetRound(restored.round, true);
      setLoading(false);
      await markFlashcardTrainingPendingGrantPlayable(
        pendingAccount,
        pendingRecord.fingerprint,
      );
      const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(
        pendingAccount,
        pendingRecord.fingerprint,
        energyCharged ? acknowledgeSessionStart : async () => true,
      );
      if (cleared.status === 'cleared') recallPendingGrantRef.current = null;
    })().catch(async (error) => {
      console.warn('[FC-RECALL] deck load failed', String((error as Error)?.message ?? error));
      const pendingAtFail = recallPendingGrantRef.current;
      console.warn('[FC-TRAIN-ENTRY] recall entry:catch', JSON.stringify({
        cancelled,
        error: (error instanceof Error ? `${error.name}: ${error.message}` : String(error)),
        pendingPhase: pendingAtFail?.record.phase ?? null,
        pendingEnergy: pendingAtFail?.record.energyState ?? null,
      }));
      if (cancelled) return;
      const pending = recallPendingGrantRef.current;
      if (pending) {
        await abandonFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
          refundOne,
          Date.now(),
          'entry_failed',
        ).catch(() => {});
        await discardFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
        ).catch(() => {});
      }
      /**
       * зачем (приказ владельца 2026-09-14, дословно: «НЕ ЧИНИ, А УБЕРИ»,
       * «убрать все проверки из раздела карточки»): слой отложенного гранта
       * (phone-state / квота / энергия) больше НЕ ИМЕЕТ ПРАВА закрыть вход в
       * тренировку. Карточки уже загружены — раунд стартует локально, без
       * чека квоты и без списания энергии; отказ инфраструктуры громко в логе.
       */
      const message = error instanceof Error ? error.message : String(error);
      if (/^pending_grant/.test(message) && recallLocalStart && recallMountedRef.current && !recallExplicitlyAbandonedRef.current) {
        recallPendingGrantRef.current = null;
        console.warn('[FC-TRAIN-ENTRY] recall entry:fail-open — грант недоступен, раунд стартует локально без чека и без списания энергии', JSON.stringify({ reason: message }));
        recallLocalStart();
        return;
      }
      if (!cancelled) {
        setLoadError(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // deckRefs is represented by the stable deckKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessResolved, accountToken, acknowledgeSessionStart, attemptSessionId, confirmSpendOne, contentLang, deckKey, energyIntent, leave, loadRevision, refundOne, resetRound, router, sessionSize, studyTarget]);

  const finish = useCallback(() => {
    const learnIds = initialCardsRef.current
      .filter((card) => !masteredIdsRef.current.has(card.id))
      .map((card) => card.id);
    setResult({ summary: summarizeSession(eventsRef.current), learnIds });
  }, []);

  useEffect(() => {
    if (result && !practiceRunes.hydrating) void practiceRunes.settle();
    // The hook methods are stable for the active session identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceRunes.hydrating, result]);

  const recordVerdict = useCallback((correct: boolean, kind: RecallFeedback['kind']) => {
    const card = activeCard;
    if (!card || answerLockedRef.current || attemptsPhase !== 'active') return;
    answerLockedRef.current = true;

    const event: SessionAnswerEvent = {
      key: card.id,
      correct,
      ms: Math.max(0, Date.now() - shownAtRef.current),
    };
    eventsRef.current = [...eventsRef.current, event];

    if (correct) {
      masteredIdsRef.current.add(card.id);
      setMasteredCount(masteredIdsRef.current.size);
      queueRef.current = queueRef.current.filter((queued) => queued.id !== card.id);
      // Revealed/self-graded answers confirm learning but do not mint currency.
      if (!answerRevealed) {
        const awarded = practiceRunes.onCorrectAnswer(card.id);
        if (awarded > 0) runeFlight.fly(awarded);
      }
      fcHaptic('correct');
      playSfx('correct');
    } else {
      const requeued = requeueAfterMistake(
        queueRef.current,
        card,
        card.id,
        repeatCountsRef.current,
      );
      queueRef.current = requeued.queue;
      repeatCountsRef.current = requeued.repeatCounts;
      if (studyTarget === 'en' || studyTarget === 'fr') {
        void captureCurrentAccountObjectiveAttempt({
          attemptId: `flashcard-recall-${attemptSessionId}:${eventsRef.current.length}:${card.id}`,
          studyTarget,
          verdict: 'wrong',
          objective: true,
          content: {
            sourceKind: 'flashcard',
            sourceId: card.id,
            canonicalTarget: card.en,
            sourceMeaning: card.translation,
          },
          facet: { kind: 'meaning', expected: card.en },
        }).catch(() => {});
      }
      fcHaptic('wrong');
      playSfx('incorrect');
    }
    registerAttemptVerdict({
      answerAttemptId: `flashcard-recall:${attemptSessionId}:${eventsRef.current.length}:${card.id}`,
      verdict: correct ? 'correct' : 'pedagogical_wrong',
    });
    setRemainingQueueCount(queueRef.current.length);
    setFeedback({ kind, expected: card.en });
  }, [activeCard, answerRevealed, attemptSessionId, attemptsPhase, practiceRunes, registerAttemptVerdict, runeFlight, studyTarget]);

  const checkAnswer = useCallback(() => {
    if (!activeCard || feedback || answerRevealed || !input.trim()) return;
    const verdict = isFullPhraseFuzzyCorrect(input, activeCard.en);
    if (verdict.ok) recordVerdict(true, verdict.typo ? 'typo' : 'correct');
    else recordVerdict(false, 'wrong');
  }, [activeCard, answerRevealed, feedback, input, recordVerdict]);

  const advance = useCallback(() => {
    if (!feedback || attemptsPhase !== 'active') return;
    if (queueRef.current.length === 0) {
      finish();
      return;
    }
    const [next, ...rest] = queueRef.current;
    queueRef.current = rest;
    answerLockedRef.current = false;
    shownAtRef.current = Date.now();
    setActiveCard(next ?? null);
    setInput('');
    setFeedback(null);
    setAnswerRevealed(false);
    setHintVisible(false);
    setRemainingQueueCount(rest.length + (next ? 1 : 0));
  }, [attemptsPhase, feedback, finish]);

  useEffect(() => {
    if (!activeCard) return;
    updateAttemptQuestion(`flashcard-recall:${attemptSessionId}:${activeCard.id}`);
  }, [activeCard, attemptSessionId, updateAttemptQuestion]);

  useEffect(() => {
    if (!activeCard) return undefined;
    if (!firstPromptPresentedRef.current) {
      firstPromptPresentedRef.current = true;
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      const node = findNodeHandle(promptRef.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeCard]);

  const resetRecallAfterSessionRuneForfeit = useCallback(() => {
    answerLockedRef.current = false;
    shownAtRef.current = Date.now();
    setInput('');
    setFeedback(null);
    setAnswerRevealed(false);
    setHintVisible(false);
  }, []);

  const attemptsReset = useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    inventoryTrusted: attempts.inventoryTrusted,
    giftCount: attempts.giftCount,
    recoverWithGift: attempts.recoverWithGift,
    forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
    restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
    onRestored: resetRecallAfterSessionRuneForfeit,
  });

  const retryWrong = useCallback(() => {
    if (!result) return;
    const learn = initialCardsRef.current.filter((card) => result.learnIds.includes(card.id));
    // The result screen has already begun settling the completed pass. Keep
    // the retry on a fresh immutable completion so answers earned while the
    // previous receipt is still syncing cannot reuse its operation id.
    practiceRunes.startNewCompletion();
    setResult(null);
    resetRound(learn);
  }, [practiceRunes, resetRound, result]);

  const openDeckSetup = useCallback(() => {
    router.replace({
      pathname: '/flashcards_training_setup',
      params: { mode: 'recall' },
    } as never);
  }, [router]);

  const copy = useMemo(() => ({
    title: triLang(lang, {
      ru: 'Вспомни и напиши', uk: 'Згадай і напиши', en: 'Recall and write', es: 'Recuerda y escribe',
      'pt-BR': 'Lembre e escreva', vi: 'Nhớ và viết', id: 'Ingat dan tulis',
      tr: 'Hatırla ve yaz', pl: 'Przypomnij i napisz',
    }),
    prompt: triLang(lang, {
      ru: 'Напиши на изучаемом языке', uk: 'Напиши мовою, яку вивчаєш', en: 'Write in the language you are learning', es: 'Escribe en el idioma que estudias',
      'pt-BR': 'Escreva no idioma que você está aprendendo', vi: 'Viết bằng ngôn ngữ bạn đang học', id: 'Tulis dalam bahasa yang sedang kamu pelajari',
      tr: 'Öğrendiğin dilde yaz', pl: 'Napisz w języku, którego się uczysz',
    }),
    hint: triLang(lang, {
      ru: 'Подсказка', uk: 'Підказка', en: 'Hint', es: 'Pista', 'pt-BR': 'Dica',
      vi: 'Gợi ý', id: 'Petunjuk', tr: 'İpucu', pl: 'Podpowiedź',
    }),
    hintPrefix: triLang(lang, {
      ru: 'Начало', uk: 'Початок', en: 'Starts with', es: 'Empieza por', 'pt-BR': 'Começa com',
      vi: 'Bắt đầu bằng', id: 'Diawali dengan', tr: 'Başlangıç', pl: 'Początek',
    }),
    placeholder: triLang(lang, {
      ru: 'Введи фразу целиком', uk: 'Введи фразу повністю', en: 'Type the complete phrase', es: 'Escribe la frase completa',
      'pt-BR': 'Digite a frase completa', vi: 'Nhập toàn bộ cụm từ', id: 'Ketik seluruh frasa',
      tr: 'İfadeyi tamamen yaz', pl: 'Wpisz całe wyrażenie',
    }),
    check: triLang(lang, {
      ru: 'Проверить', uk: 'Перевірити', en: 'Check', es: 'Comprobar', 'pt-BR': 'Verificar',
      vi: 'Kiểm tra', id: 'Periksa', tr: 'Kontrol et', pl: 'Sprawdź',
    }),
    reveal: triLang(lang, {
      ru: 'Показать ответ', uk: 'Показати відповідь', en: 'Show answer', es: 'Mostrar respuesta',
      'pt-BR': 'Mostrar resposta', vi: 'Hiện đáp án', id: 'Tampilkan jawaban', tr: 'Cevabı göster',
      pl: 'Pokaż odpowiedź',
    }),
    knew: triLang(lang, {
      ru: 'Знал', uk: 'Знав', en: 'I knew it', es: 'Lo sabía', 'pt-BR': 'Eu sabia',
      vi: 'Tôi biết', id: 'Saya tahu', tr: 'Biliyordum', pl: 'Wiedziałem',
    }),
    didNotKnow: triLang(lang, {
      ru: 'Не знал', uk: 'Не знав', en: 'I did not know', es: 'No lo sabía', 'pt-BR': 'Eu não sabia',
      vi: 'Tôi không biết', id: 'Saya tidak tahu', tr: 'Bilmiyordum', pl: 'Nie wiedziałem',
    }),
    continue: triLang(lang, {
      ru: 'Продолжить', uk: 'Продовжити', en: 'Continue', es: 'Continuar', 'pt-BR': 'Continuar',
      vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj',
    }),
    correct: triLang(lang, {
      ru: 'Верно', uk: 'Правильно', en: 'Correct', es: 'Correcto', 'pt-BR': 'Correto',
      vi: 'Đúng', id: 'Benar', tr: 'Doğru', pl: 'Dobrze',
    }),
    typo: triLang(lang, {
      ru: 'Почти! Правильно:', uk: 'Майже! Правильно:', en: 'Almost! Correct form:', es: '¡Casi! Forma correcta:',
      'pt-BR': 'Quase! Forma correta:', vi: 'Gần đúng! Dạng đúng:', id: 'Hampir! Bentuk yang benar:',
      tr: 'Neredeyse! Doğrusu:', pl: 'Prawie! Poprawnie:',
    }),
    wrong: triLang(lang, {
      ru: 'Пока нет. Правильно:', uk: 'Поки ні. Правильно:', en: 'Not yet. Correct answer:', es: 'Aún no. Respuesta correcta:',
      'pt-BR': 'Ainda não. Resposta correta:', vi: 'Chưa đúng. Đáp án:', id: 'Belum. Jawaban yang benar:',
      tr: 'Henüz değil. Doğru cevap:', pl: 'Jeszcze nie. Poprawna odpowiedź:',
    }),
    revealed: triLang(lang, {
      ru: 'Ответ', uk: 'Відповідь', en: 'Answer', es: 'Respuesta', 'pt-BR': 'Resposta',
      vi: 'Đáp án', id: 'Jawaban', tr: 'Cevap', pl: 'Odpowiedź',
    }),
    empty: triLang(lang, {
      ru: 'В выбранных наборах нет карточек с переводом.',
      uk: 'В обраних наборах немає карток із перекладом.',
      en: 'The selected packs have no cards with a translation.',
      es: 'Los packs elegidos no tienen tarjetas con traducción.',
      'pt-BR': 'Os pacotes escolhidos não têm cartões com tradução.',
      vi: 'Các bộ thẻ đã chọn không có thẻ kèm bản dịch.',
      id: 'Paket yang dipilih tidak memiliki kartu dengan terjemahan.',
      tr: 'Seçilen paketlerde çevirili kart yok.',
      pl: 'Wybrane zestawy nie mają fiszek z tłumaczeniem.',
    }),
    pickDecks: triLang(lang, {
      ru: 'Выбрать наборы', uk: 'Вибрати набори', en: 'Choose packs', es: 'Elegir packs',
      'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket',
      tr: 'Paket seç', pl: 'Wybierz zestawy',
    }),
    loadError: triLang(lang, {
      ru: 'Не удалось загрузить карточки. Проверь интернет и попробуй ещё раз.',
      uk: 'Не вдалося завантажити картки. Перевір інтернет і спробуй ще раз.',
      en: 'Could not load the cards. Check your connection and try again.',
      es: 'No se pudieron cargar las tarjetas. Comprueba tu conexión e inténtalo de nuevo.',
      'pt-BR': 'Não foi possível carregar os cartões. Verifique a conexão e tente novamente.',
      vi: 'Không thể tải thẻ. Hãy kiểm tra kết nối và thử lại.',
      id: 'Kartu tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
      tr: 'Kartlar yüklenemedi. Bağlantını kontrol edip tekrar dene.',
      pl: 'Nie udało się wczytać kart. Sprawdź połączenie i spróbuj ponownie.',
    }),
    retry: triLang(lang, {
      ru: 'Повторить', uk: 'Повторити', en: 'Try again', es: 'Reintentar',
      'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
    }),
  }), [lang]);

  const renderHeader = (interactive: boolean) => (
    <>
      <View style={styles.runeRow}>
        <View ref={runeFlight.counterRef} collapsable={false}>
          <PracticeRuneCounter
            runes={practiceRunes.runes}
            lang={lang}
            backgroundColor={t.bgCard}
            color={t.textPrimary}
            testID="fc-recall-practice-runes"
          />
        </View>
      </View>
      <View style={styles.headerRow}>
        <Pressable
          testID="fc-recall-back"
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
          onPress={leave}
          hitSlop={8}
          style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
            {copy.title}
          </Text>
        </View>
        <View style={styles.headerTools}>
          <SessionAttemptsHud
            remaining={attempts.state.remainingAttempts}
            locale={lang}
            giftRescueSequence={attemptsReset.giftRescueSequence}
            giftRecoveryError={attemptsReset.giftRecoveryError}
            onRetryGiftRecovery={attemptsReset.retryGiftRecovery}
            testID="fc-recall-session-attempts"
          />
          <Text style={[styles.progressText, { color: t.textMuted, fontSize: f.caption }]} testID="fc-recall-progress">
            {masteredCount}/{totalCards}
          </Text>
          <Pressable
            testID="fc-recall-pick-decks"
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, { ru: 'Выбрать наборы', uk: 'Вибрати набори', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybierz zestawy' })}
            disabled={!interactive}
            onPress={openDeckSetup}
            hitSlop={8}
            style={styles.headerButton}
          >
            <Ionicons name="albums-outline" size={20} color={t.textMuted} />
          </Pressable>
          {interactive && activeCard ? (
            <ReportErrorButton
              screen="flashcards_recall"
              dataId={`flashcard_${activeCard.id}`}
              dataText={`EN: ${activeCard.en}\nRU: ${activeCard.translation}`}
              variant="icon-flag"
              accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', uk: 'Повідомити про помилку в картці', en: 'Report an error in the card', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w fiszce' })}
              testID="fc-recall-report"
            />
          ) : null}
        </View>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: t.accent,
              transform: [{ scaleX: totalCards > 0 ? masteredCount / totalCards : 0 }],
            },
          ]}
        />
      </View>
    </>
  );

  if (result) {
    return (
      <SessionResultScreen
        correct={result.summary.correct}
        wrong={result.summary.wrong}
        xpGained={0}
        runesGained={practiceRunes.runes}
        learnLeft={result.learnIds.length}
        onRetryWrong={result.learnIds.length > 0 ? retryWrong : undefined}
        onDone={leave}
        testID="fc-recall-result"
      />
    );
  }

  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          <ContentWrap>
            {renderHeader(false)}
            <View style={styles.loadingBody} accessibilityRole="progressbar">
              <SkeletonBlock width="100%" height={220} borderRadius={24} />
              <SkeletonBlock width="100%" height={92} borderRadius={18} />
              <ActivityIndicator color={t.accent} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!activeCard) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          <ContentWrap>
            {renderHeader(true)}
            <View style={styles.emptyBody}>
              <Ionicons name={loadError ? 'cloud-offline-outline' : 'create-outline'} size={44} color={t.textGhost} />
              <Text accessibilityLiveRegion="polite" style={[styles.emptyText, { color: loadError ? t.wrong : t.textMuted, fontSize: f.body }]}>
                {loadError ? copy.loadError : copy.empty}
              </Text>
              <Pressable
                testID="fc-recall-pick-decks-empty"
                accessibilityRole="button"
                onPress={loadError ? () => setLoadRevision((value) => value + 1) : openDeckSetup}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: t.bgSurface, opacity: pressed ? 0.78 : 1 }]}
              >
                <Ionicons name={loadError ? 'refresh-outline' : 'albums-outline'} size={18} color={t.accent} />
                <Text style={[styles.secondaryButtonText, { color: t.textPrimary, fontSize: f.body }]}>
                  {loadError ? copy.retry : copy.pickDecks}
                </Text>
              </Pressable>
            </View>
          </ContentWrap>
          <NoEnergyModal visible={noEnergyOpen} onClose={leave} activity="flashcards" />
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const feedbackColor = feedback?.kind === 'wrong' ? t.wrong : t.correct;
  const attemptsInteractive = attempts.hydrated && attemptsPhase === 'active';
  const canCheck = attemptsInteractive && input.trim().length > 0 && !feedback && !answerRevealed;
  const hintCharacters = Array.from(activeCard.en.trim());
  const hintPrefix = hintCharacters.length > 6
    ? `${hintCharacters.slice(0, 6).join('')}…`
    : hintCharacters.join('');

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          {renderHeader(true)}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.instruction, { color: t.textMuted, fontSize: f.caption }]}>
              {copy.prompt}
            </Text>
            <Reanimated.View
              key={activeCard.id}
              entering={reducedMotion ? undefined : FadeInUp.duration(240)}
              ref={(node) => {
                runeFlight.originRef.current = node as unknown as View;
              }}
              collapsable={false}
              style={[styles.focusCard, { backgroundColor: t.bgCard }]}
            >
              <View
                ref={promptRef}
                collapsable={false}
                accessible
                accessibilityLabel={`${copy.prompt}. ${activeCard.translation}`}
                style={styles.focusPrompt}
              >
                <Text style={[styles.translation, { color: t.textPrimary, fontSize: Math.max(f.h2, 25) }]}>
                  {activeCard.translation}
                </Text>
              </View>
              <View style={styles.focusFooter}>
                <Text style={[styles.queueMeta, { color: t.textMuted, fontSize: f.caption }]}>
                  {Math.max(1, remainingQueueCount)} / {totalCards}
                </Text>
                <Pressable
                  testID="fc-recall-hint"
                  accessibilityRole="button"
                  accessibilityLabel={copy.hint}
                  accessibilityState={{ disabled: !attemptsInteractive || hintVisible }}
                  disabled={!attemptsInteractive || hintVisible}
                  onPress={() => setHintVisible(true)}
                  style={({ pressed }) => [
                    styles.hintButton,
                    {
                      backgroundColor: t.bgSurface,
                      opacity: !attemptsInteractive || hintVisible ? 0.5 : pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="bulb-outline" size={17} color={t.accent} />
                  <Text style={[styles.hintButtonText, { color: t.textSecond, fontSize: f.caption }]}>
                    {copy.hint}
                  </Text>
                </Pressable>
              </View>
            </Reanimated.View>

            {hintVisible && !feedback && !answerRevealed ? (
              <Reanimated.View
                testID="fc-recall-guidance"
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                accessibilityLiveRegion="polite"
                style={[styles.guidance, { backgroundColor: `${t.accent}14` }]}
              >
                <Ionicons name="sparkles-outline" size={17} color={t.accent} />
                <Text style={[styles.guidanceText, { color: t.textSecond, fontSize: f.sub }]}>
                  {copy.hintPrefix}: <Text style={{ color: t.accent, fontWeight: '900' }}>{hintPrefix}</Text>
                </Text>
              </Reanimated.View>
            ) : null}

            {answerRevealed && !feedback ? (
              <Reanimated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                style={[styles.answerCard, { backgroundColor: t.bgSurface }]}
                accessibilityLiveRegion="polite"
              >
                <Text style={[styles.eyebrow, { color: t.textMuted, fontSize: f.caption }]}>{copy.revealed}</Text>
                <Text selectable style={[styles.answerText, { color: t.textPrimary, fontSize: f.h2 }]}>{activeCard.en}</Text>
                <View style={styles.selfGradeRow}>
                  <Pressable
                    testID="fc-recall-self-grade-wrong"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !attemptsInteractive }}
                    disabled={!attemptsInteractive}
                    onPress={() => recordVerdict(false, 'wrong')}
                    style={({ pressed }) => [styles.selfGradeButton, { backgroundColor: `${t.wrong}20`, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[styles.selfGradeText, { color: t.wrong, fontSize: f.body }]}>{copy.didNotKnow}</Text>
                  </Pressable>
                  <Pressable
                    testID="fc-recall-self-grade-correct"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !attemptsInteractive }}
                    disabled={!attemptsInteractive}
                    onPress={() => recordVerdict(true, 'correct')}
                    style={({ pressed }) => [styles.selfGradeButton, { backgroundColor: `${t.correct}20`, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[styles.selfGradeText, { color: t.correct, fontSize: f.body }]}>{copy.knew}</Text>
                  </Pressable>
                </View>
              </Reanimated.View>
            ) : (
              <View
                style={[
                  styles.compactInputShell,
                  {
                    backgroundColor: t.bgSurface,
                    borderColor: feedback ? feedbackColor : input.trim() ? t.accent : t.border,
                  },
                ]}
              >
                <TextInput
                  testID="fc-recall-input"
                  value={input}
                  editable={attemptsInteractive && !feedback}
                  onChangeText={setInput}
                  onSubmitEditing={checkAnswer}
                  placeholder={copy.placeholder}
                  placeholderTextColor={t.textGhost}
                  selectionColor={t.accent}
                  maxLength={MAX_INPUT_LENGTH}
                  multiline
                  autoCorrect={false}
                  autoCapitalize="sentences"
                  keyboardAppearance={statusBarLight ? 'dark' : 'light'}
                  style={[styles.input, { color: t.textPrimary, fontSize: f.bodyLg }]}
                  accessibilityLabel={copy.placeholder}
                />
                <Text style={[styles.characterCount, { color: t.textGhost, fontSize: f.caption }]}>
                  {input.length}/{MAX_INPUT_LENGTH}
                </Text>
              </View>
            )}

            {feedback ? (
              <Reanimated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                style={[styles.feedbackCard, { backgroundColor: `${feedbackColor}1F` }]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons
                  name={feedback.kind === 'wrong' ? 'close-circle' : 'checkmark-circle'}
                  size={24}
                  color={feedbackColor}
                />
                <View style={styles.feedbackCopy}>
                  <Text style={[styles.feedbackTitle, { color: feedbackColor, fontSize: f.bodyLg }]}>
                    {feedback.kind === 'correct' ? copy.correct : feedback.kind === 'typo' ? copy.typo : copy.wrong}
                  </Text>
                  {feedback.kind !== 'correct' ? (
                    <Text selectable style={[styles.feedbackAnswer, { color: t.textPrimary, fontSize: f.body }]}>{feedback.expected}</Text>
                  ) : null}
                </View>
              </Reanimated.View>
            ) : null}

            <View style={styles.actions}>
              {feedback ? (
                <Pressable
                  testID="fc-recall-continue"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !attemptsInteractive }}
                  disabled={!attemptsInteractive}
                  onPress={advance}
                  style={({ pressed }) => [styles.primaryButton, { backgroundColor: t.accent, opacity: !attemptsInteractive ? 0.38 : pressed ? 0.84 : 1 }]}
                >
                  <Text style={[styles.primaryButtonText, { color: t.correctText, fontSize: f.bodyLg }]}>{copy.continue}</Text>
                </Pressable>
              ) : !answerRevealed ? (
                <>
                  <Pressable
                    testID="fc-recall-check"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canCheck }}
                    disabled={!canCheck}
                    onPress={checkAnswer}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      { backgroundColor: t.accent, opacity: !canCheck ? 0.38 : pressed ? 0.84 : 1 },
                    ]}
                  >
                    <Text style={[styles.primaryButtonText, { color: t.correctText, fontSize: f.bodyLg }]}>{copy.check}</Text>
                  </Pressable>
                  <Pressable
                    testID="fc-recall-reveal"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !attemptsInteractive }}
                    disabled={!attemptsInteractive}
                    onPress={() => setAnswerRevealed(true)}
                    style={({ pressed }) => [styles.revealButton, { opacity: pressed ? 0.65 : 1 }]}
                  >
                    <Ionicons name="eye-outline" size={18} color={t.textMuted} />
                    <Text style={[styles.revealText, { color: t.textMuted, fontSize: f.body }]}>{copy.reveal}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </ScrollView>
        </ContentWrap>
        {runeFlight.flight ? (
          <LearningV2RuneFlight
            key={runeFlight.flight.key}
            from={runeFlight.flight.from}
            to={runeFlight.flight.to}
            count={runeFlight.flight.count}
            onDone={runeFlight.clearFlight}
          />
        ) : null}
        <NoEnergyModal visible={noEnergyOpen} onClose={leave} activity="flashcards" />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0 },
  runeRow: { minHeight: 42, paddingHorizontal: 16, alignItems: 'flex-end', justifyContent: 'center' },
  headerRow: { minHeight: 52, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 64, alignItems: 'center', paddingHorizontal: 4 },
  headerTitle: { fontWeight: '900', textAlign: 'center', lineHeight: 20 },
  headerTools: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressText: { minWidth: 36, textAlign: 'right', fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 4, marginHorizontal: 16, borderRadius: 999, overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', borderRadius: 999, transformOrigin: 'left' },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 },
  loadingBody: { flex: 1, paddingHorizontal: 16, paddingTop: 18, gap: 14, alignItems: 'center' },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  emptyText: { textAlign: 'center', lineHeight: 23 },
  instruction: { marginBottom: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  focusCard: { minHeight: 220, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 18, justifyContent: 'space-between' },
  focusPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  translation: { textAlign: 'center', textAlignVertical: 'center', fontWeight: '900', lineHeight: 34 },
  focusFooter: { minHeight: 44, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  queueMeta: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  hintButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  hintButtonText: { fontWeight: '800' },
  guidance: { minHeight: 44, marginTop: 10, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  guidanceText: { flex: 1, fontWeight: '700' },
  compactInputShell: { minHeight: 92, marginTop: 12, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },
  input: { minHeight: 52, padding: 0, textAlignVertical: 'top', fontWeight: '700', lineHeight: 26 },
  characterCount: { position: 'absolute', right: 14, bottom: 10, fontVariant: ['tabular-nums'] },
  answerCard: { marginTop: 14, borderRadius: 18, padding: 16 },
  answerText: { marginTop: 9, fontWeight: '900', lineHeight: 30 },
  selfGradeRow: { marginTop: 16, flexDirection: 'row', gap: 10 },
  selfGradeButton: { flex: 1, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  selfGradeText: { fontWeight: '900', textAlign: 'center' },
  feedbackCard: { marginTop: 14, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  feedbackCopy: { flex: 1, minWidth: 0 },
  feedbackTitle: { fontWeight: '900' },
  feedbackAnswer: { marginTop: 5, fontWeight: '800', lineHeight: 22 },
  actions: { marginTop: 'auto', paddingTop: 18, gap: 8 },
  primaryButton: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { fontWeight: '900', textAlign: 'center' },
  revealButton: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  revealText: { fontWeight: '800' },
  secondaryButton: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontWeight: '900' },
});
