import Ionicons from '@expo/vector-icons/Ionicons';
import { getDevAnswerTarget, isDevCardsFail } from './dev_cards_state';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
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
import { buildManifestCardIndex, manifestSeed, restoreManifestCards, toManifestIds } from './flashcards/training_manifest_ids';
import { resolveEnergyIntentForRecord } from './flashcards/training_energy_intent';
import { useLang } from '../components/LangContext';
import { CoinRewardFlight } from '../components/rewards/CoinRewardFlight';
import NoEnergyModal from '../components/NoEnergyModal';
import { PracticeRuneCounter } from '../components/PracticeRuneCounter';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import SkeletonBlock from '../components/SkeletonShimmer';
import { LinearGradient } from '../components/SafeLinearGradient';
import { usePremium } from '../components/PremiumContext';
import { useTrainingStudyTarget } from './flashcards/use_training_study_target';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../components/v2/ShadowSurface';
import { PracticeBackButton, PracticeHeaderTitle, PracticeRoundIconButton } from '../components/practice/PracticeChrome';
import { PracticeCta, PracticeProgressRow, PracticeStatePanel } from '../components/practice/PracticeStates';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
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
  claimFlashcardTrainingRoundStart,
  logFlashcardTrainingRoundClear,
  resolveFlashcardTrainingPendingGrantAccount,
  type FlashcardTrainingPendingGrantRecord,
} from './flashcard_training_pending_grant';
import { consumeMonthlyTrainingSession } from './monthly_training_sessions';
import { flashcardContentLang } from './spanish_content_gate';
import {
  deckRefKey,
  loadDeckCardsMulti,
  parseDeckParams,
  type DeckCard,
  type DeckRef,
} from './flashcards/deck_sources';
import { isFullPhraseFuzzyCorrect } from './flashcards/fuzzy_match';
import { usePackContinueRecorder } from './flashcards/use_pack_continue_recorder';
import { parseRecallDirection } from './flashcards/practice_setup_params';
import { FC_DEFAULT_SESSION_SIZE, isValidSessionSize } from './flashcards/mode_prefs';
import {
  requeueAfterMistake,
  summarizeSession,
  type SessionAnswerEvent,
  type SessionOutcomeSummary,
} from './flashcards/session_queue';
import { SessionResultScreen } from './flashcards/SessionResultScreen';
import { markWrongLetters } from './flashcards/recall_diff';
import { buildResultMistakes } from './flashcards/session_result_mistakes';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { isMistakeStudyTargetValue } from '../modules/mistake-practice/contracts';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import { LOAD_GATE_TOTAL_MS, loadGateBackoffMs } from './load_gate_config';

const MAX_INPUT_LENGTH = 220;
const FEEDBACK_OK_SURFACE = '#185C3A'; // theme-exempt: белый текст обратной связи на цветной плашке верно/неверно
const FEEDBACK_BAD_SURFACE = '#702B35'; // theme-exempt: белый текст обратной связи на цветной плашке верно/неверно
const FEEDBACK_TEXT = '#FFFFFF'; // theme-exempt: белый текст обратной связи на цветной плашке верно/неверно

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

/** Passive material only; text input and answer handlers stay above this layer. */
function RecallGlassSurface({ chrome, sheen = true }: { chrome: ReturnType<typeof liquidGlassTokens>; sheen?: boolean }) {
  if (!sheen) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[chrome.lightTint, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.08 }]}
      />
    </View>
  );
}

export default function FlashcardsRecallSession() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    deck?: string | string[];
    size?: string | string[];
    dir?: string | string[];
    devRunesSeed?: string | string[];
  }>();
  // зачем (координатор 04.10, настройка тренировки): направление «перевод → фраза» (как было) или
  // «фраза → перевод». Читается один раз на вход; без параметра — прежнее поведение.
  const [direction] = useState(() => parseRecallDirection(params.dir));
  const promptOf = useCallback((card: { en: string; translation: string }) =>
    (direction === 'to_source' ? card.en : card.translation), [direction]);
  const answerOf = useCallback((card: { en: string; translation: string }) =>
    (direction === 'to_source' ? card.translation : card.en), [direction]);
  const { lang } = useLang();
  // зачем (владелец 12.10, п.83, cards-027): тренировка идёт на языке ВЫБРАННЫХ наборов (?target, проверенный хуком: только
  // языки с «Карточками» ready, иначе язык приложения). Энергия и месячная квота — по аккаунту, от языка не зависят.
  const studyTarget = useTrainingStudyTarget();
  const { theme: t, f, statusBarLight, liquidGlassThemeId } = useTheme();
  const recallGlass = liquidGlassTokens(liquidGlassThemeId);
  const { accessResolved, hasPremiumAccess } = usePremium();
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
  // зачем (Карточки 2.0 12.10, cards-v2.html «Напиши — верно»: пилюля «+10» в панели ответа): сколько рун дал верный ответ; 0 — пилюли нет
  const [lastAward, setLastAward] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  // зачем (Авторизация 12.10, cards-v2-039 / cards-section-050): робот не знает ответ на случайную карточку. dev `answer=correct|wrong` вписывает в поле
  // верный ответ (первый из вариантов) или заведомо неверный — дальше робот жмёт «Проверить». Вне dev getDevAnswerTarget() === null — эффект ничего не делает.
  const activeCardId = activeCard?.id ?? null;
  useEffect(() => {
    const target = getDevAnswerTarget();
    if (target === null || !activeCard) return;
    const typed = target === 'correct' ? (answerOf(activeCard).split(/\s*[\/;]\s*/).filter(Boolean)[0] ?? answerOf(activeCard)) : 'banana window';
    console.log(`[DEV-STATE] recall: в поле вписан ${target === 'correct' ? 'верный' : 'неверный'} ответ для карточки ${activeCard.id}`); // guard-ok: dev-ветка
    setInput(typed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCardId]);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  // зачем (координатор 12.10, «Продолжить»): позиция в наборе — выучено / всего; пишется локально с задержкой и при выходе, смешанные колоды не пишутся
  const { record: recordPackContinue } = usePackContinueRecorder(deckRefs.map(deckRefKey), 'recall');
  useEffect(() => {
    if (totalCards > 0) recordPackContinue(masteredCount, totalCards);
  }, [masteredCount, recordPackContinue, totalCards]);
  // зачем: остаток очереди больше не рисуется (строка прогресса макета — «выучено … всего»), сеттер оставлен для логики.
  const [, setRemainingQueueCount] = useState(0);
  const [result, setResult] = useState<RecallResult | null>(null);

  const queueRef = useRef<DeckCard[]>([]);
  const initialCardsRef = useRef<DeckCard[]>([]);
  // зачем (итог по cards-section): ячейка «время» — от первого вопроса раунда до итога.
  const roundStartedAtRef = useRef(0);
  const repeatCountsRef = useRef<Record<string, number>>({});
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const masteredIdsRef = useRef(new Set<string>());
  const shownAtRef = useRef(Date.now());
  const answerLockedRef = useRef(false);
  const promptRef = useRef<View>(null);
  const firstPromptPresentedRef = useRef(false);
  const runeFlight = useCoinRewardFlight();
  const recallMountedRef = useRef(true);
  const recallExplicitlyAbandonedRef = useRef(false);
  const recallPendingGrantRef = useRef<{
    account: NonNullable<Awaited<ReturnType<typeof resolveFlashcardTrainingPendingGrantAccount>>>;
    record: FlashcardTrainingPendingGrantRecord;
  } | null>(null);

  // зачем (владелец, 2026-08-27; координатор 10.10): DEV-хаб «Проверка рун» открывает НАСТОЯЩИЙ экран со случайным стартовым
  // числом вместо реальной копилки — как у блица и свайпа; диск и сеть в этом режиме не трогаются (hooks/usePracticeRunes).
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(params.devRunesSeed),
    [params.devRunesSeed],
  );
  const practiceRunes = usePracticeRunes({
    activity: 'flashcards_training',
    sessionKey: `recall_${deckKey}_${attemptSessionId}`,
    completionOrdinal: 1,
    devFakeStartRunes: devRunesFake?.runes,
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
      })().catch((error: unknown) => { console.warn('[FC-RECALL] discardFlashcardTrainingPendingGrant: не удалось (продолжаем без неё)', error); });
    }
    safeRouterBack(router, '/flashcards' as never);
  }, [refundOne, router]);

  const resetRound = useCallback((cards: readonly DeckCard[], preserveOrder = false) => {
    const round = preserveOrder ? cards.slice() : shuffle(cards);
    const first = round[0] ?? null;
    initialCardsRef.current = round;
    roundStartedAtRef.current = Date.now();
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

  // зачем (владелец 01.10 + D158 §117): при ошибке загрузки молча перезапрашиваем карточки —
  // 3 тихих повтора с паузами ~1/3/8 с (app/load_gate_config.ts), а не вечный скелетон: после потолка
  // экран говорит спокойное «Сейчас недоступно» с тихой «Попробовать снова»; при возврате в
  // приложение повтор идёт сам.
  const silentRecallRetryRef = useRef(0);
  const [loadExhausted, setLoadExhausted] = useState(false);
  useEffect(() => {
    if (!loadError) return undefined;
    const backoffMs = loadGateBackoffMs(silentRecallRetryRef.current + 1);
    if (backoffMs === null) {
      console.warn('[FC-RECALL] тихие повторы исчерпаны → «Сейчас недоступно»', { attempts: silentRecallRetryRef.current });
      setLoadExhausted(true);
      return undefined;
    }
    const timer = setTimeout(() => {
      silentRecallRetryRef.current += 1;
      console.warn('[FC-RECALL] тихий повтор загрузки карточек', { attempt: silentRecallRetryRef.current, backoffMs });
      setLoadRevision((value) => value + 1);
    }, backoffMs);
    return () => clearTimeout(timer);
  }, [loadError, loadRevision]);

  const retryRecallLoad = useCallback((source: 'tap' | 'foreground') => {
    console.warn('[FC-RECALL] повтор загрузки после «Сейчас недоступно»', { source });
    silentRecallRetryRef.current = 0;
    setLoadExhausted(false);
    setLoadError(false);
    setLoadRevision((value) => value + 1);
  }, []);

  // D158: автоповтор при возврате в приложение (фокус), если загрузка исчерпала повторы.
  useEffect(() => {
    if (!loadExhausted) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryRecallLoad('foreground');
    });
    return () => sub.remove();
  }, [loadExhausted, retryRecallLoad]);

  // D158 (баг «Блица», тот же класс): загрузка, которая не ответила ни успехом, ни ошибкой, не держит
  // скелетон вечно — через потолок уходит в тот же цикл тихих повторов.
  useEffect(() => {
    if (!loading || loadError || loadExhausted) return undefined;
    const timer = setTimeout(() => {
      console.warn('[FC-RECALL] watchdog: загрузка не ответила за потолок → цикл тихих повторов', { loadRevision, ceilingMs: LOAD_GATE_TOTAL_MS });
      setLoadError(true);
    }, LOAD_GATE_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [loading, loadError, loadExhausted, loadRevision]);

  useEffect(() => {
    if (activeCard) silentRecallRetryRef.current = 0;
  }, [activeCard]);

  useEffect(() => {
    if (!accessResolved) return undefined;
    let cancelled = false;
    recallExplicitlyAbandonedRef.current = false;
    setLoading(true);
    setLoadError(false);
    /** Локальный старт на случай отказа гранта — см. fail-open в catch ниже. */
    let recallLocalStart: (() => void) | null = null;
    void (async () => {
      // зачем (координатор 12.10, R1 «нет пути», Карточки): dev `fail=recall_load` — «Сейчас недоступно» сразу, без реальной загрузки и без тихих повторов; в стор-сборке геттер выключен.
      if (isDevCardsFail('recall_load')) {
        console.log('[DEV-STATE] recall: загрузка карточек подменена сбоем (recall_load)'); // guard-ok: dev-ветка
        if (!cancelled) { silentRecallRetryRef.current = 99; setLoading(false); setLoadError(true); }
        return;
      }
      // зачем (Авторизация 12.10, cards-v2-039 / cards-section-050): при dev `answer=correct|wrong` порядок карточек — как в наборе (кадр воспроизводим).
      const devAnswerTarget = getDevAnswerTarget();
      const loadedCards = await loadDeckCardsMulti(deckRefs, contentLang, {
        shuffle: devAnswerTarget === null,
        studyTarget,
      });
      const cards = loadedCards.slice(0, sessionSize);
      if (cancelled) return;
      if (cards.length === 0) {
        setLoading(false);
        return;
      }
      const round = devAnswerTarget === null ? shuffle(cards) : cards.slice();
      if (devAnswerTarget !== null) console.log(`[DEV-STATE] recall: порядок как в наборе, ответ=${devAnswerTarget}, первая=${round[0]?.en ?? '-'}`); // guard-ok: dev-ветка
      recallLocalStart = () => { resetRound(round, true); setLoading(false); };
      // зачем: восстановление идёт из ВСЕГО загруженного пула (запись могла быть reused от прежней попытки
      // с другим срезом sessionSize); коллизия отпечатков → pending_grant_manifest_id_collision → fail-open.
      const cardIndex = buildManifestCardIndex(loadedCards);
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
          // зачем (дыра в экономике 03.10): компактный manifest — отпечатки id, без текстов и без energyIntent.
          payload: { orderedCardIds: toManifestIds(round), seed: manifestSeed(attemptSessionId) },
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
      console.log('[FC-RECALL-GATE] reconcile:done', JSON.stringify({ status: reconciled.status }));
      // зачем (баг «Блиц висит на каркасе», 03.10 — тот же дефект здесь): 'missing' сразу после prepare
      // давал немой return и вечный каркас. Уводим в catch → существующий fail-open (локальный старт).
      if (reconciled.status === 'found') pendingRecord = reconciled.record;
      else throw new Error(`pending_grant_reconcile_${reconciled.status}`);
      // зачем (лимит тренировок 04.10): без claim старта переходы фаз отвечают claim_required — запись не очищается,
      // и следующий раунд на той же колоде наследует квитанцию первого: месячный лимит не списывался.
      pendingRecord = await claimFlashcardTrainingRoundStart({
        account: pendingAccount,
        record: pendingRecord,
        mode: 'recall',
        currentAttemptId: attemptSessionId,
      });
      recallPendingGrantRef.current = { account: pendingAccount, record: pendingRecord };
      const restoredRound = restoreManifestCards<DeckCard>(
        (pendingRecord.manifest.payload as { orderedCardIds?: unknown }).orderedCardIds,
        cardIndex,
      );
      // зачем: интент берём ТОЛЬКО под запись журнала (reused/ротация), иначе двойное списание или потерянный возврат.
      const recordIntent = resolveEnergyIntentForRecord({
        record: pendingRecord,
        currentIntent: energyIntent,
        screenKind: 'flashcards_recall',
        screenSubjectId: deckKey || 'saved',
        mode: 'recall',
      });

      let energyCharged = pendingRecord.energyState === 'charged';
      const energyResult = energyCharged ? 'unlimited' : await confirmSpendOne(recordIntent);
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
        const quotaResult = await consumeMonthlyTrainingSession({
          token: accountToken,
          accessResolved,
          hasPremiumAccess,
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
            router.replace({ pathname: '/flashcards_training_setup', params: {
              mode: 'recall',
            } } as never);
          } else if (!cancelled) {
            setLoadError(true);
            setLoading(false);
          }
          return;
        }
      }

      if (cancelled || !recallMountedRef.current || recallExplicitlyAbandonedRef.current) return;
      resetRound(restoredRound, true);
      setLoading(false);
      const playable = await markFlashcardTrainingPendingGrantPlayable(
        pendingAccount,
        pendingRecord.fingerprint,
      );
      const cleared = await acknowledgeAndClearFlashcardTrainingPendingGrant(
        pendingAccount,
        pendingRecord.fingerprint,
        energyCharged ? acknowledgeSessionStart : async () => true,
        { energyCharged },
      );
      logFlashcardTrainingRoundClear('recall', playable, cleared);
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
        ).catch((error: unknown) => { console.warn('[FC-RECALL] abandonFlashcardTrainingPendingGrant: возврат энергии по отложенной выдаче не удался', error); });
        await discardFlashcardTrainingPendingGrant(
          pending.account,
          pending.record.fingerprint,
        ).catch((error: unknown) => { console.warn('[FC-RECALL] discardFlashcardTrainingPendingGrant: не удалось (продолжаем без неё)', error); });
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
        setLastAward(awarded > 0 ? awarded : 0);
        if (awarded > 0) runeFlight.fly(awarded);
      } else {
        setLastAward(0);
      }
      fcHaptic('correct');
      playSfx('correct');
    } else {
      setLastAward(0);
      const requeued = requeueAfterMistake(
        queueRef.current,
        card,
        card.id,
        repeatCountsRef.current,
      );
      queueRef.current = requeued.queue;
      repeatCountsRef.current = requeued.repeatCounts;
      // зачем (22.09): узкий список языков не пускал запись ошибки для
      // испанского и немецкого — «вспомнить» не пополняло «Мои ошибки».
      if (isMistakeStudyTargetValue(studyTarget)) {
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
        }).catch((error: unknown) => { console.warn('[FC-RECALL] captureCurrentAccountObjectiveAttempt: не удалось (продолжаем без неё)', error); });
      }
      fcHaptic('wrong');
      playSfx('incorrect');
    }
    registerAttemptVerdict({
      answerAttemptId: `flashcard-recall:${attemptSessionId}:${eventsRef.current.length}:${card.id}`,
      verdict: correct ? 'correct' : 'pedagogical_wrong',
    });
    setRemainingQueueCount(queueRef.current.length);
    setFeedback({ kind, expected: answerOf(card) });
  }, [activeCard, answerOf, answerRevealed, attemptSessionId, attemptsPhase, practiceRunes, registerAttemptVerdict, runeFlight, studyTarget]);

  const checkAnswer = useCallback(() => {
    if (!activeCard || feedback || answerRevealed || !input.trim()) return;
    // Перевод бывает с вариантами («привет / здравствуй») — засчитываем любой.
    const [main, ...alternatives] = direction === 'to_source'
      ? answerOf(activeCard).split(/\s*[\/;]\s*/).filter(Boolean)
      : [answerOf(activeCard)];
    const verdict = isFullPhraseFuzzyCorrect(input, main ?? answerOf(activeCard), alternatives);
    if (verdict.ok) recordVerdict(true, verdict.typo ? 'typo' : 'correct');
    else recordVerdict(false, 'wrong');
  }, [activeCard, answerOf, answerRevealed, direction, feedback, input, recordVerdict]);

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

  useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    hydrationTrusted: attempts.hydrationTrusted,
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
    // зачем (Карточки 2.0 12.10, cards-v2.html `sessHdr('Напиши', …)`): в шапке сессии режим называется «Напиши»
    title: triLang(lang, {
      ru: 'Напиши', uk: 'Напиши', en: 'Write', es: 'Escribe',
      'pt-BR': 'Escreva', vi: 'Viết', id: 'Tulis',
      tr: 'Yaz', pl: 'Napisz',
    }),
    prompt: triLang(lang, {
      ru: 'Напиши на изучаемом языке', uk: 'Напиши мовою, яку вивчаєш', en: 'Write in the language you are learning', es: 'Escribe en el idioma que estudias',
      'pt-BR': 'Escreva no idioma que você está aprendendo', vi: 'Viết bằng ngôn ngữ bạn đang học', id: 'Tulis dalam bahasa yang sedang kamu pelajari',
      tr: 'Öğrendiğin dilde yaz', pl: 'Napisz w języku, którego się uczysz',
    }),
    promptToSource: triLang(lang, {
      ru: 'Напиши перевод', uk: 'Напиши переклад', en: 'Write the translation', es: 'Escribe la traducción',
      'pt-BR': 'Escreva a tradução', vi: 'Viết bản dịch', id: 'Tulis terjemahannya',
      tr: 'Çevirisini yaz', pl: 'Napisz tłumaczenie',
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
      ru: 'Введи фразу целиком', uk: 'Введи вислів повністю', en: 'Type the complete phrase', es: 'Escribe la frase completa',
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
    // зачем (Карточки 2.0 12.10, макет «Дальше»)
    continue: triLang(lang, {
      ru: 'Дальше', uk: 'Далі', en: 'Next', es: 'Siguiente', 'pt-BR': 'Próximo',
      vi: 'Tiếp', id: 'Lanjut', tr: 'İleri', pl: 'Dalej',
    }),
    // макет: при ошибке панель называется «Правильно» и показывает эталон
    rightAnswer: triLang(lang, {
      ru: 'Правильно', uk: 'Правильно', en: 'Correct answer', es: 'Correcto', 'pt-BR': 'Correto',
      vi: 'Đáp án đúng', id: 'Yang benar', tr: 'Doğrusu', pl: 'Poprawnie',
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
    // D158: спокойно, без паники и без «ошибки».
    unavailable: triLang(lang, {
      ru: 'Сейчас недоступно', uk: 'Зараз недоступно', en: 'Not available right now',
      es: 'No disponible ahora', 'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng',
      id: 'Belum tersedia sekarang', tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne',
    }),
    tryAgain: triLang(lang, {
      ru: 'Попробовать снова', uk: 'Спробувати ще', en: 'Try again', es: 'Intentar de nuevo',
      'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
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
        <PracticeBackButton
          large
          icon="close"
          glass={recallGlass}
          color={t.textPrimary}
          onPress={leave}
          testID="fc-recall-back"
          accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
        />
        <PracticeHeaderTitle glass={recallGlass} title={copy.title} />
        <View style={styles.headerTools}>
          <SessionAttemptsHud
            remaining={attempts.state.remainingAttempts} attempts={attempts}
            locale={lang}
            testID="fc-recall-session-attempts"
          />
          <PracticeRoundIconButton
            glass={recallGlass}
            color={recallGlass.secondary}
            icon="albums-outline"
            testID="fc-recall-pick-decks"
            accessibilityLabel={triLang(lang, { ru: 'Выбрать наборы', uk: 'Вибрати набори', en: 'Choose packs', es: 'Elegir packs', 'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih paket', tr: 'Paket seç', pl: 'Wybierz zestawy' })}
            disabled={!interactive}
            onPress={openDeckSetup}
          />
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
      {/* зачем (practice.html `.trk` + `.prog`): полоса и строка «выучено … всего» под ней —
          только реальные числа сессии; пока карточек нет, строка пустая, а не «0/0». */}
      {/* зачем (Сверка 11.10, practice.html `.trk margin-top:22` и поле 20): полоса стояла вплотную под двухстрочным заголовком и шире карточек (поле 16). */}
      <View style={styles.progressGap}>
        <PracticeProgressRow
          glass={recallGlass}
          progress={totalCards > 0 ? masteredCount / totalCards : 0}
          left={totalCards > 0 ? String(masteredCount) : ''}
          right={totalCards > 0 ? String(totalCards) : ''}
          testID="fc-recall-progress"
        />
      </View>
    </>
  );

  if (result) {
    return (
      <SessionResultScreen
        correct={devRunesFake ? devRunesFake.tertiary + 4 : result.summary.correct}
        wrong={devRunesFake ? devRunesFake.tertiary : result.summary.wrong}
        runesGained={practiceRunes.runes}
        learnLeft={result.learnIds.length}
        overline={copy.title}
        startedAtMs={roundStartedAtRef.current}
        mistakes={buildResultMistakes(initialCardsRef.current, eventsRef.current.filter((e) => !e.correct).map((e) => e.key))}
        onRetryWrong={result.learnIds.length > 0 ? retryWrong : undefined}
        onDone={leave}
        testID="fc-recall-result"
      />
    );
  }

  // зачем (D158 §117): после потолка тихих повторов — спокойное «Сейчас недоступно» с тихой
  // «Попробовать снова» вместо вечного скелетона; значок нейтральный (тот же, что у пустого набора).
  if (!activeCard && loadExhausted) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          <ContentWrap>
            {renderHeader(true)}
            <PracticeStatePanel
              glass={recallGlass}
              testID="fc-recall-unavailable"
              icon="layers-outline"
              message={copy.unavailable}
              action={{
                label: copy.tryAgain,
                icon: 'refresh-outline',
                onPress: () => retryRecallLoad('tap'),
                testID: 'fc-recall-try-again',
              }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  // зачем (владелец 01.10): пока идут тихие повторы — тот же скелетон, а useEffect выше молча
  // перезапрашивает карточки (D158: с потолком).
  if (loading || (!activeCard && loadError)) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
          <ContentWrap>
            {renderHeader(false)}
            {/* зачем (макет + Performance Bible): загрузка = та же геометрия, что у занятия —
                карточка вопроса, поле ввода 56, кнопка «Проверить» 48; без спиннера. */}
            <View style={styles.loadingBody} accessibilityRole="progressbar" testID="fc-recall-loading">
              <SkeletonBlock width="100%" height={160} borderRadius={16} />
              <SkeletonBlock width="100%" height={56} borderRadius={14} />
              <SkeletonBlock width={132} height={44} borderRadius={22} />
              <View style={styles.loadingCta}>
                <SkeletonBlock width="100%" height={48} borderRadius={24} />
              </View>
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
            {/* зачем (cards.html setupEmpty / setupError): плитка со значком, сообщение и одна
                компактная кнопка; действие прежнее — повтор загрузки или выбор наборов. */}
            <PracticeStatePanel
              glass={recallGlass}
              testID="fc-recall-empty"
              icon="layers-outline"
              message={copy.empty}
              action={{
                label: copy.pickDecks,
                icon: 'albums-outline',
                onPress: openDeckSetup,
                testID: 'fc-recall-pick-decks-empty',
              }}
            />
          </ContentWrap>
          <NoEnergyModal variant="learn" visible={noEnergyOpen} onClose={leave} activity="flashcards" />
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const feedbackSurface = feedback?.kind === 'wrong' ? FEEDBACK_BAD_SURFACE : FEEDBACK_OK_SURFACE;
  const attemptsInteractive = attempts.hydrated && attemptsPhase === 'active';
  const canCheck = attemptsInteractive && input.trim().length > 0 && !feedback && !answerRevealed;
  const hintCharacters = Array.from(answerOf(activeCard).trim());
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
            showsVerticalScrollIndicator={false} decelerationRate="fast"
          >
            {/* зачем (Карточки 2.0 12.10, cards-v2.html `.qh`): карточка задания r20, высота 170, подпись приколота к верху, фраза 34/40 по центру */}
            <Reanimated.View
              key={activeCard.id}
              entering={reducedMotion ? undefined : FadeInUp.duration(240)}
              ref={(node) => {
                runeFlight.originRef.current = node as unknown as View;
              }}
              collapsable={false}
              style={[styles.focusCard, styles.glassSurface, { backgroundColor: recallGlass.card, boxShadow: plateBoxShadow(recallGlass) }]}
            >
              <RecallGlassSurface chrome={recallGlass} />
              {/* подпись приколота к верху карточки; диктор читает её вместе с фразой через метку обёртки ниже */}
              <Text accessible={false} style={[styles.instruction, { color: recallGlass.secondary }]}>
                {direction === 'to_source' ? copy.promptToSource : copy.prompt}
              </Text>
              <View
                ref={promptRef}
                collapsable={false}
                accessible
                accessibilityLabel={`${direction === 'to_source' ? copy.promptToSource : copy.prompt}. ${promptOf(activeCard)}`}
                style={styles.focusPrompt}
              >
                <Text style={[styles.translation, { color: t.textPrimary, fontSize: 34, lineHeight: 40 }]}>
                  {promptOf(activeCard)}
                </Text>
              </View>
            </Reanimated.View>

            {answerRevealed && !feedback ? (
              <Reanimated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                style={[styles.answerCard, styles.glassSurface, { backgroundColor: recallGlass.sheet }]}
                accessibilityLiveRegion="polite"
              >
                <RecallGlassSurface chrome={recallGlass} />
                <Text style={[styles.eyebrow, { color: recallGlass.secondary }]}>{copy.revealed}</Text>
                <Text selectable style={[styles.answerText, { color: t.textPrimary }]}>{answerOf(activeCard)}</Text>
                <View style={styles.selfGradeRow}>
                  <Pressable
                    testID="fc-recall-self-grade-wrong"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !attemptsInteractive }}
                    disabled={!attemptsInteractive}
                    onPress={() => recordVerdict(false, 'wrong')}
                    style={({ pressed }) => [styles.selfGradeButton, { backgroundColor: `${t.wrong}20`, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[styles.selfGradeText, { color: t.wrong }]}>{copy.didNotKnow}</Text>
                  </Pressable>
                  <Pressable
                    testID="fc-recall-self-grade-correct"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !attemptsInteractive }}
                    disabled={!attemptsInteractive}
                    onPress={() => recordVerdict(true, 'correct')}
                    style={({ pressed }) => [styles.selfGradeButton, { backgroundColor: `${t.correct}20`, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[styles.selfGradeText, { color: t.correct }]}>{copy.knew}</Text>
                  </Pressable>
                </View>
              </Reanimated.View>
            ) : (
              <View
                testID="fc-recall-input-shell"
                style={[
                  styles.compactInputShell,
                  {
                    backgroundColor: feedback ? (feedback.kind === 'wrong' ? recallGlass.badSoft : recallGlass.goodSoft) : recallGlass.opaqueControl,
                    // зачем (`.inp`; Тень 12.10): поле ввода — плашка с тенью, без кромки; исход «верно/неверно» — цветное кольцо-состояние (макет `.field.ok/.no`).
                    boxShadow: feedback
                      ? [...plateBoxShadow(recallGlass), { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${feedback.kind === 'wrong' ? recallGlass.bad : recallGlass.good}73` }] // shadow-ok: кольцо исхода ответа (состояние)
                      : plateBoxShadow(recallGlass),
                  },
                ]}
              >
                <RecallGlassSurface chrome={recallGlass} />
                {feedback ? (
                  // зачем (Карточки 2.0 12.10, кадры «Напиши — верно / неверно»): после проверки поле показывает набранное; лишние буквы — красным с подчёркиванием, справа ✓ / ✕
                  <View style={styles.inputResultRow}>
                    <Text testID="fc-recall-input-result" selectable style={[styles.input, styles.inputResultText, { color: t.textPrimary, fontSize: 20, lineHeight: 26 }]}>
                      {(feedback.kind === 'wrong' ? markWrongLetters(input, feedback.expected) : [{ text: input, wrong: false }]).map((part, index) => (
                        <Text
                          key={`${index}:${part.text}` /* guard-ok: части одного ответа, порядок стабилен */}
                          style={part.wrong ? { color: recallGlass.bad, textDecorationLine: 'underline', textDecorationColor: recallGlass.bad } : undefined}
                        >
                          {part.text}
                        </Text>
                      ))}
                    </Text>
                    <Ionicons name={feedback.kind === 'wrong' ? 'close' : 'checkmark'} size={20} color={feedback.kind === 'wrong' ? recallGlass.bad : recallGlass.good} />
                  </View>
                ) : null}
                {feedback ? null : <TextInput
                  testID="fc-recall-input"
                  value={input}
                  editable={attemptsInteractive && !feedback}
                  onChangeText={setInput}
                  onSubmitEditing={checkAnswer}
                  placeholder={copy.placeholder}
                  placeholderTextColor={t.textGhost}
                  selectionColor={recallGlass.accentGraphic}
                  maxLength={MAX_INPUT_LENGTH}
                  multiline
                  // зачем (аудит Карточек 🟡 «Enter в multiline», 15.10): в многострочном поле Enter вставлял перенос и onSubmitEditing не срабатывал — «Проверить» с клавиатуры не работало.
                  submitBehavior="submit"
                  returnKeyType="done"
                  autoCorrect={false}
                  autoCapitalize="sentences"
                  keyboardAppearance={statusBarLight ? 'dark' : 'light'}
                  style={[styles.input, { color: t.textPrimary, fontSize: 20, lineHeight: 26 }]}
                  accessibilityLabel={copy.placeholder}
                />}
                {/* Счётчик символов макету не нужен — показываем только у самого предела. */}
                {input.length >= MAX_INPUT_LENGTH - 20 ? (
                  <Text style={[styles.characterCount, { color: recallGlass.secondary }]}>
                    {input.length}/{MAX_INPUT_LENGTH}
                  </Text>
                ) : null}
              </View>
            )}

            {/* зачем (`.hintb` макета): «Подсказка» — пилюля под полем, начало фразы справа от неё. */}
            {!feedback && !answerRevealed ? (
              <View style={styles.hintRow}>
                <Pressable
                  testID="fc-recall-hint"
                  accessibilityRole="button"
                  accessibilityLabel={copy.hint}
                  accessibilityState={{ disabled: !attemptsInteractive || hintVisible }}
                  disabled={!attemptsInteractive || hintVisible}
                  onPress={() => setHintVisible(true)}
                  hitSlop={{ top: 4, bottom: 4 }}
                  style={({ pressed }) => [
                    styles.hintButton,
                    {
                      backgroundColor: recallGlass.buttonFill,
                      opacity: !attemptsInteractive ? 0.5 : pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Ionicons name="bulb-outline" size={18} color={recallGlass.text} />
                  <Text style={[styles.hintButtonText, { color: recallGlass.text }]}>
                    {copy.hint}
                  </Text>
                </Pressable>
                {hintVisible ? (
                  <Reanimated.View
                    testID="fc-recall-guidance"
                    entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                    accessibilityLiveRegion="polite"
                    accessible
                    accessibilityLabel={`${copy.hintPrefix}: ${hintPrefix}`}
                    style={styles.guidance}
                  >
                    <Text style={[styles.guidanceText, { color: recallGlass.secondary }]}>{hintPrefix}</Text>
                  </Reanimated.View>
                ) : null}
              </View>
            ) : null}

            {feedback ? (
              // зачем (Карточки 2.0 12.10, cards-v2.html `.ans`): панель ответа — значок исхода 40, подпись «Верно» / «Правильно», эталон 20/700, справа «+N» после верного
              <Reanimated.View
                testID="fc-recall-feedback"
                entering={reducedMotion ? undefined : FadeInDown.duration(180)}
                style={[styles.feedbackCard, { backgroundColor: feedback.kind === 'wrong' ? recallGlass.badSoft : recallGlass.goodSoft, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: `${feedback.kind === 'wrong' ? recallGlass.bad : recallGlass.good}52` }] /* shadow-ok: кольцо исхода ответа (состояние) */ }]}
                accessibilityLiveRegion="polite"
              >
                <View style={[styles.feedbackVk, { backgroundColor: feedback.kind === 'wrong' ? recallGlass.badSoft : recallGlass.goodSoft }]}>
                  <Ionicons name={feedback.kind === 'wrong' ? 'close' : 'checkmark'} size={20} color={feedback.kind === 'wrong' ? recallGlass.bad : recallGlass.good} />
                </View>
                <View style={styles.feedbackCopy}>
                  <Text style={[styles.feedbackTitle, { color: recallGlass.secondary }]}>
                    {feedback.kind === 'correct' ? copy.correct : feedback.kind === 'typo' ? copy.typo : copy.rightAnswer}
                  </Text>
                  {feedback.kind !== 'correct' ? (
                    <Text selectable style={[styles.feedbackAnswer, { color: feedback.kind === 'wrong' ? t.textPrimary : recallGlass.good }]}>{feedback.expected}</Text>
                  ) : (
                    <Text selectable style={[styles.feedbackAnswer, { color: recallGlass.good }]}>{feedback.expected}</Text>
                  )}
                </View>
                {feedback.kind !== 'wrong' && lastAward > 0 ? (
                  <View testID="fc-recall-award" style={[styles.feedbackAward, { backgroundColor: recallGlass.goodSoft }]}>
                    <Text style={[styles.feedbackAwardText, { color: recallGlass.good }]}>{`+${lastAward}`}</Text>
                  </View>
                ) : null}
              </Reanimated.View>
            ) : null}

            <View style={styles.actions}>
              {/* зачем (`.cta` / `.cta.dis` макета): «Проверить» — светлая кнопка 48, пока поле
                  пустое — тёмная выключенная; после проверки «Продолжить» со стрелкой. */}
              {feedback ? (
                <PracticeCta
                  glass={recallGlass}
                  testID="fc-recall-continue"
                  label={copy.continue}
                  disabled={!attemptsInteractive}
                  onPress={advance}
                />
              ) : !answerRevealed ? (
                <>
                  <PracticeCta
                    glass={recallGlass}
                    testID="fc-recall-check"
                    label={copy.check}
                    disabled={!canCheck}
                    onPress={checkAnswer}
                  />
                  <Pressable
                    testID="fc-recall-reveal"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !attemptsInteractive }}
                    disabled={!attemptsInteractive}
                    onPress={() => setAnswerRevealed(true)}
                    style={({ pressed }) => [styles.revealButton, { opacity: pressed ? 0.65 : 1 }]}
                  >
                    <Ionicons name="eye-outline" size={18} color={recallGlass.secondary} />
                    <Text style={[styles.revealText, { color: recallGlass.secondary }]}>{copy.reveal}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </ScrollView>
        </ContentWrap>
        {runeFlight.flight ? (
          <CoinRewardFlight
            key={runeFlight.flight.key}
            from={runeFlight.flight.from}
            to={runeFlight.flight.to}
            count={runeFlight.flight.count}
            onDone={runeFlight.clearFlight}
          />
        ) : null}
        <NoEnergyModal variant="learn" visible={noEnergyOpen} onClose={leave} activity="flashcards" />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0 },
  runeRow: { minHeight: 42, paddingHorizontal: 16, alignItems: 'flex-end', justifyContent: 'center' },
  // зачем (practice.html `.hd`): поле страницы 20, шапка 16 от верха.
  headerRow: { minHeight: 52, paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTools: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressGap: { marginTop: 22, paddingHorizontal: 4 },
  scroll: { flex: 1, minHeight: 0 },
  // зачем (practice.html): карточка «Вспомни» на 30 ниже строки прогресса, поле 20.
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 28 },
  loadingBody: { flex: 1, paddingHorizontal: 16, paddingTop: 22, gap: 18, alignItems: 'flex-start' },
  loadingCta: { width: '100%', marginTop: 'auto', paddingBottom: 28 },
  // зачем (practice.html `.qc` «Вспомни»): радиус 16, минимум 140; кромки нет (Тень 12.10).
  // зачем (Карточки 2.0 12.10, cards-v2.html `.qh` в «Напиши»): высота 170, r20, поля 20; подпись приколота к верху (18)
  focusCard: {
    minHeight: 170, borderRadius: 20,
    padding: 20, justifyContent: 'center',
  },
  glassSurface: { overflow: 'hidden' },
  focusPrompt: { alignItems: 'center', justifyContent: 'center' },
  instruction: { position: 'absolute', top: 18, left: 0, right: 0, fontSize: 16, lineHeight: 21, textAlign: 'center' },
  translation: { fontSize: 34, lineHeight: 40, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  eyebrow: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  hintRow: { minHeight: 44, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hintButton: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  hintButtonText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  guidance: { flexShrink: 1, minWidth: 0 },
  guidanceText: { fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'right' },
  // `.inp` макета: 56, радиус 14, 18/500. Кромка задаётся рядом с цветом темы.
  // зачем (Карточки 2.0 12.10, `.field` в «Напиши»): высота 60, шрифт 20
  compactInputShell: { minHeight: 60, marginTop: 22, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, justifyContent: 'center' },
  inputResultRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputResultText: { flex: 1, minWidth: 0 },
  input: { minHeight: 26, padding: 0, textAlignVertical: 'center', fontSize: 16, fontWeight: '400', lineHeight: 21 },
  characterCount: { alignSelf: 'flex-end', marginTop: 4, fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  answerCard: { marginTop: 18, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  answerText: { marginTop: 8, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  selfGradeRow: { marginTop: 16, flexDirection: 'row', gap: 12 },
  selfGradeButton: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  selfGradeText: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  // `.ansr` макета: радиус 16, заголовок 15/600, правильный ответ 20/26.
  // зачем (Карточки 2.0 12.10, `.ans`): r18, поля 14/16, зазор 14; подпись 13/600, эталон 20/700
  feedbackCard: { marginTop: 18, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  feedbackVk: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  feedbackCopy: { flex: 1, minWidth: 0 },
  feedbackTitle: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  feedbackAnswer: { marginTop: 2, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  // `.plus10`: 26 высотой, r13, поля 10, 14/700 → 13/700
  feedbackAward: { height: 26, borderRadius: 13, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  feedbackAwardText: { fontSize: 13, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { marginTop: 'auto', paddingTop: 18, gap: 8 },
  revealButton: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  revealText: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
});
