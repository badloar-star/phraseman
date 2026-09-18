import { useCallback, useEffect, useRef, useState } from 'react';

import {
  callExplainMistake,
  isMistakeExplainOfflineError,
  warmExplainMistake,
} from './ai_mistake_explain_client';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import {
  aiMistakeWaitLine,
  AI_WAIT_SECOND_STAGE_MS,
  AI_WAIT_THIRD_STAGE_MS,
  type AiWaitStage,
} from './ai_wait_copy';
import { asLang } from './explain_phrase_request';
import {
  buyMistakeExplainLocally,
  getAiMistakeExplainsLeftToday,
  hasShownAiMistakeLimitNoticeToday,
  markAiMistakeExplainUsed,
  markAiMistakeLimitNoticeShownToday,
  peekAiMistakeLimitNoticeShownToday,
  FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT,
  MISTAKE_EXPLAIN_PRICE_RUNES,
} from './ai_mistake_explain_limit_session';
import { readUnifiedLevelSpinStars } from './level_spin_star_grants';
import { DebugLogger } from './debug-logger';
import { resolveAllMistakeTokens, resolvePhraseMistakeToken } from './mistake_token_resolver';
import type { AiMistakeCardState } from '../components/AiMistakeCard';
import { hapticTap } from '../hooks/use-haptics';
import { getNetStatus, subscribeNetStatus, type NetStatus } from './net_status';
import {
  hasAiExplainConsentDecision,
  isAiExplainConsentGranted,
  isAiExplainConsentHydrated,
  recordAiExplainConsentToCloud,
  setAiExplainConsent,
  subscribeAiExplainConsent,
} from './ai_explain_consent';

/**
 * Shared orchestration for the AI mistake breakdown (inline `AiMistakeCard`) and
 * the «Объяснить проще» ELI5 modal (`MistakeEli5Modal`).
 *
 * Extracted from lesson1.tsx so every lesson surface drives
 * the exact same behaviour: inline breakdown auto-loads on a wrong answer, the
 * footer button opens a simpler explanation, both hit the cached `explainMistake`
 * Cloud Function. The pure UI components + client + server cache are reused as-is.
 *
 * The hook is intentionally generic: callers pass a synthetic `lessonId` (e.g. a
 * plan-mode id) and a `phraseKey` that changes whenever the active phrase/result
 * changes — that key both resets state and discards stale async responses.
 * Every wrong answer exposes an explicit learner choice; once requested, transient
 * failures remain a loading state and retry silently until a ready explanation arrives.
 */
export interface UseMistakeExplainInput {
  /** Whether to run at all (e.g. result shown AND the answer was wrong). */
  active: boolean;
  /** Stable key for the current phrase+result; changing it resets + invalidates. */
  phraseKey: string;
  /** Synthetic lesson id for cache bucketing (plan modes pass a mode-derived id). */
  lessonId: number;
  /** Stable id for the phrase (for cache hashing). */
  phraseId: string;
  studyTarget: string;
  interfaceLang: string;
  /** The native-language prompt / meaning shown to the learner. */
  prompt: string;
  /** What the learner actually answered. */
  userAnswer: string;
  /** The correct target answer. */
  targetAnswer: string;
}

export interface UseMistakeExplainResult {
  /** Props for the inline <AiMistakeCard>. */
  aiMistakeState: AiMistakeCardState;
  aiMistakeText: string | null;
  aiMistakeRemaining: number | null;
  /**
   * Подпись под скелетоном на время ожидания. Меняется по мере ожидания, чтобы
   * затянувшийся ответ не читался как зависание (см. app/ai_wait_copy.ts).
   */
  aiMistakeWaitLine: string;
  /** Retry the inline breakdown (also the card's onExplain). */
  explain: () => void;
  /** Props for <MistakeEli5Modal> + the card's onOpenSimple. */
  eli5: {
    open: boolean;
    state: 'idle' | 'loading' | 'ready';
    text: string | null;
    onOpen: () => void;
    onClose: () => void;
    onRetry: () => void;
  };
  /**
   * Props for <AiExplainConsentModal>. Shown ONCE, before the very first
   * autoload of the inline breakdown, when the user has no consent decision
   * yet. Accepting resumes the normal autoload for THIS mistake; declining
   * keeps aiMistakeState at 'hidden' (card doesn't render at all).
   */
  consentGate: {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
  };
  /**
   * Экономика разбора (владелец 2026-09-17, экран 5 макета рун): 3 в день
   * бесплатно, дальше 120 рун за разбор.
   *
   * зачем ЕДИНЫЙ счётчик на все экраны (решение владельца: «везде — уроки,
   * диалоги, мои ошибки»): три отдельных дали бы девять бесплатных разборов
   * в сутки и обнулили бы смысл лимита.
   *
   * ⚠️ Сам разбор не переделан — владелец: «они уже идеальны». Автозагрузка
   * сохранена, просто каждый показ теперь считается.
   */
  economy: {
    /** Остаток бесплатных разборов на сегодня. */
    freeLeft: number;
    priceRunes: number;
    balanceRunes: number;
    /** Бесплатные кончились и разбор ждёт оплаты. */
    awaitingPurchase: boolean;
    /** Купить разбор за руны и показать его. */
    onBuy: () => void;
  };
}

function mistakeExplainErrorText(error: unknown): string {
  const code = String((error as { code?: unknown })?.code ?? '').toLowerCase();
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return `${code} ${message}`;
}

function isFreeDailyLimitError(error: unknown): boolean {
  return mistakeExplainErrorText(error).includes('explain_free_daily_limit');
}

type ExplanationRequestScope = Readonly<{
  phraseKey: string;
  accountGeneration: AccountGenerationToken;
}>;

function isSameAccountGeneration(a: AccountGenerationToken, b: AccountGenerationToken): boolean {
  return a.generation === b.generation && a.stableId === b.stableId && a.phase === b.phase;
}

export function useMistakeExplain(input: UseMistakeExplainInput): UseMistakeExplainResult {
  const {
    active,
    phraseKey,
    lessonId,
    phraseId,
    studyTarget,
    interfaceLang,
    prompt,
    userAnswer,
    targetAnswer,
  } = input;

  const [aiMistakeState, setAiMistakeState] = useState<AiMistakeCardState>(() =>
    peekAiMistakeLimitNoticeShownToday() ? 'hidden' : 'idle',
  );
  const [aiMistakeText, setAiMistakeText] = useState<string | null>(null);
  const [aiMistakeRemaining, setAiMistakeRemaining] = useState<number | null>(null);

  const [eli5Open, setEli5Open] = useState(false);
  const [eli5State, setEli5State] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [eli5Text, setEli5Text] = useState<string | null>(null);
  const eli5InFlightTokenRef = useRef<number | null>(null);
  const eli5RequestSeqRef = useRef(0);
  const mistakeInFlightTokenRef = useRef<number | null>(null);
  const mistakeRequestSeqRef = useRef(0);

  // Explicit opt-in gate (юридическое требование, см. app/ai_explain_consent.ts).
  const [consentGateVisible, setConsentGateVisible] = useState(false);
  const [forceConsentRecheckTick, setForceConsentRecheckTick] = useState(0);
  const [netStatus, setNetStatus] = useState<NetStatus>(() => getNetStatus());
  const netStatusRef = useRef<NetStatus>(netStatus);
  netStatusRef.current = netStatus;

  // Стадия ожидания для подписи под скелетоном. Отдельный state, а не таймер в
  // компоненте: карточка ре-рендерится и без нас, а тик должен идти ровно пока
  // мы ждём ответ. 'retried' взводит тихий повтор — тогда ожидание уже долгое.
  const [waitStage, setWaitStage] = useState<AiWaitStage>('start');

  /**
   * Экономика разбора: 3 бесплатных в день, дальше 120 рун (владелец 17.09).
   *
   * `paidUnlockedForPhrase` — оплаченный разбор ИМЕННО этой фразы. Привязка к
   * фразе обязательна: общий флаг открыл бы все последующие промахи бесплатно
   * либо заставил платить повторно за уже оплаченный.
   */
  const [freeExplainsLeft, setFreeExplainsLeft] = useState(FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT);
  const [explainRuneBalance, setExplainRuneBalance] = useState(0);
  const [paidUnlockedForPhrase, setPaidUnlockedForPhrase] = useState<string | null>(null);
  const explainBuyingRef = useRef(false);

  // Остаток и баланс — локальные чтения, 0 обращений к Firestore.
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    void Promise.all([
      getAiMistakeExplainsLeftToday(),
      readUnifiedLevelSpinStars(captureAccountGeneration()),
    ]).then(([left, stars]) => {
      if (cancelled) return;
      setFreeExplainsLeft(left);
      setExplainRuneBalance(stars.balance);
    }).catch((error: unknown) => {
      // Немой catch запрещён: тихий сбой показал бы платную стену человеку,
      // у которого бесплатные разборы ещё есть.
      DebugLogger.error(
        'use_mistake_explain:economy_read',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
    return () => { cancelled = true; };
  }, [active, phraseKey]);

  // Mirror of phraseKey, read inside async callbacks to drop stale responses
  // (user moved to another phrase before the answer arrived).
  const phraseKeyRef = useRef(phraseKey);
  phraseKeyRef.current = phraseKey;
  const activeRef = useRef(active);
  activeRef.current = active;
  const renderedAccountGeneration = captureAccountGeneration();
  const renderScopeRef = useRef({ phraseKey, active, accountGeneration: renderedAccountGeneration });
  if (renderScopeRef.current.phraseKey !== phraseKey || renderScopeRef.current.active !== active) {
    renderScopeRef.current = { phraseKey, active, accountGeneration: renderedAccountGeneration };
  }
  const accountGenerationRef = useRef(renderScopeRef.current.accountGeneration);
  const accountScopeBlockedRef = useRef(false);

  const mountedRef = useRef(true);
  const mistakeRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eli5RetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mistakeRetryAttemptRef = useRef(0);
  const eli5RetryAttemptRef = useRef(0);
  const explainRef = useRef<(withHaptic?: boolean, backgroundRetry?: boolean) => void>(() => {});
  const openEli5Ref = useRef<(backgroundRetry?: boolean) => void>(() => {});

  const clearRetryTimers = useCallback(() => {
    if (mistakeRetryTimerRef.current) clearTimeout(mistakeRetryTimerRef.current);
    if (eli5RetryTimerRef.current) clearTimeout(eli5RetryTimerRef.current);
    mistakeRetryTimerRef.current = null;
    eli5RetryTimerRef.current = null;
  }, []);

  const invalidateRequests = useCallback(() => {
    mistakeInFlightTokenRef.current = null;
    eli5InFlightTokenRef.current = null;
  }, []);

  const isExplanationScopeCurrent = useCallback((scope: ExplanationRequestScope): boolean => (
    mountedRef.current
    && activeRef.current
    && !accountScopeBlockedRef.current
    && phraseKeyRef.current === scope.phraseKey
    && isAiExplainConsentGranted()
    && isCurrentAccountGeneration(scope.accountGeneration)
  ), []);

  const cancelPendingExplanationWork = useCallback(() => {
    clearRetryTimers();
    invalidateRequests();
    mistakeRetryAttemptRef.current = 0;
    eli5RetryAttemptRef.current = 0;
    setAiMistakeState('hidden');
    setAiMistakeText(null);
    setAiMistakeRemaining(null);
    setEli5Open(false);
    setEli5State('idle');
    setEli5Text(null);
    setWaitStage('start');
    setConsentGateVisible(false);
  }, [clearRetryTimers, invalidateRequests]);

  useEffect(() => {
    // Без активного промаха AI не должен сам держать сетевой probe и заставлять
    // весь экран урока перерисовываться на сменах online/offline.
    if (!active) return undefined;
    setNetStatus(getNetStatus());
    return subscribeNetStatus((online) => {
      setNetStatus(online ? 'online' : 'offline');
    });
  }, [active]);

  // Любое состояние без подтверждённого online немедленно снимает сетевые
  // запросы/повторы из владения UI.
  // Готовый локально закэшированный ответ сохраняем, но вечный skeleton не
  // оставляем и новые запросы до возвращения сети не запускаем.
  useEffect(() => {
    if (netStatus === 'online') return;
    clearRetryTimers();
    invalidateRequests();
    mistakeRetryAttemptRef.current = 0;
    eli5RetryAttemptRef.current = 0;
    setAiMistakeState((state) => state === 'loading' ? 'idle' : state);
    setEli5State((state) => state === 'loading' ? 'idle' : state);
    setWaitStage('start');
  }, [clearRetryTimers, invalidateRequests, netStatus]);

  // Reset everything when the phrase or result changes.
  useEffect(() => {
    clearRetryTimers();
    invalidateRequests();
    mistakeRetryAttemptRef.current = 0;
    eli5RetryAttemptRef.current = 0;
    const renderedGeneration = renderScopeRef.current.accountGeneration;
    const currentGeneration = captureAccountGeneration();
    const generationMatchesRender = isSameAccountGeneration(renderedGeneration, currentGeneration);
    if (generationMatchesRender) accountGenerationRef.current = renderedGeneration;
    accountScopeBlockedRef.current = (
      !active
      || !generationMatchesRender
      || !isCurrentAccountGeneration(renderedGeneration)
    );
    setAiMistakeState(
      accountScopeBlockedRef.current || peekAiMistakeLimitNoticeShownToday() ? 'hidden' : 'idle',
    );
    setAiMistakeText(null);
    setAiMistakeRemaining(null);
    setEli5Open(false);
    setEli5State('idle');
    setEli5Text(null);
    setWaitStage('start');
    setConsentGateVisible(false);
  }, [phraseKey, active, clearRetryTimers, invalidateRequests]);

  // Прогрев инстанса в момент ошибки — ДО того, как понадобится разбор.
  // зачем: у explainMistake minInstances: 0 (владелец не платит за тёплый
  // инстанс). Пока пользователь смотрит на свой неверный ответ, инстанс успевает
  // проснуться, и разбор приходит без паузы. Внутри стоит TTL — на серии ошибок
  // подряд сеть дёргается не чаще раза в 9 минут.
  useEffect(() => {
    if (
      !active
      || netStatus !== 'online'
      || accountScopeBlockedRef.current
      || !isCurrentAccountGeneration(accountGenerationRef.current)
    ) return;
    warmExplainMistake();
  }, [active, netStatus, phraseKey]);

  // Сторож размонтажа. Проверки phraseKeyRef ловят СМЕНУ фразы, но не уход с
  // экрана: при размонтировании ref сохраняет прежнее значение, условие пройдёт,
  // и поздний onRetryStart дёрнул бы setState на мёртвом компоненте.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRetryTimers();
      invalidateRequests();
    };
  }, [clearRetryTimers, invalidateRequests]);

  useEffect(() => {
    const subscription = subscribeAccountGeneration((nextGeneration) => {
      const ownedGeneration = accountGenerationRef.current;
      if (isSameAccountGeneration(nextGeneration, ownedGeneration)) return;
      // Never replay account A's phrase/answer under account B. This hook remains
      // blocked until its caller supplies a new phrase/result scope or remounts.
      accountScopeBlockedRef.current = true;
      cancelPendingExplanationWork();
    });
    return () => subscription.remove();
  }, [cancelPendingExplanationWork]);

  useEffect(() => subscribeAiExplainConsent(() => {
    setForceConsentRecheckTick((value) => value + 1);
    if (!isAiExplainConsentGranted()) {
      cancelPendingExplanationWork();
      return;
    }
    if (
      activeRef.current
      && !accountScopeBlockedRef.current
      && isCurrentAccountGeneration(accountGenerationRef.current)
      && !peekAiMistakeLimitNoticeShownToday()
    ) {
      setAiMistakeState((state) => state === 'hidden' ? 'idle' : state);
    }
  }), [cancelPendingExplanationWork]);

  const scheduleMistakeRetry = useCallback((scope: ExplanationRequestScope) => {
    if (netStatusRef.current !== 'online') return;
    if (mistakeRetryTimerRef.current) clearTimeout(mistakeRetryTimerRef.current);
    const attempt = mistakeRetryAttemptRef.current + 1;
    mistakeRetryAttemptRef.current = attempt;
    const delayMs = Math.min(30_000, 1_000 * (2 ** Math.min(attempt, 5)));
    mistakeRetryTimerRef.current = setTimeout(() => {
      mistakeRetryTimerRef.current = null;
      if (netStatusRef.current === 'online' && isExplanationScopeCurrent(scope)) {
        explainRef.current(false, true);
      }
    }, delayMs);
  }, [isExplanationScopeCurrent]);

  const scheduleEli5Retry = useCallback((scope: ExplanationRequestScope) => {
    if (netStatusRef.current !== 'online') return;
    if (eli5RetryTimerRef.current) clearTimeout(eli5RetryTimerRef.current);
    const attempt = eli5RetryAttemptRef.current + 1;
    eli5RetryAttemptRef.current = attempt;
    const delayMs = Math.min(30_000, 1_000 * (2 ** Math.min(attempt, 5)));
    eli5RetryTimerRef.current = setTimeout(() => {
      eli5RetryTimerRef.current = null;
      if (netStatusRef.current === 'online' && isExplanationScopeCurrent(scope)) {
        openEli5Ref.current(true);
      }
    }, delayMs);
  }, [isExplanationScopeCurrent]);

  // Тик подписи под скелетоном. Живёт ровно пока идёт ожидание: два таймера на
  // весь цикл, оба гасятся при уходе — фоновых таймеров экран не оставляет.
  useEffect(() => {
    const busy = aiMistakeState === 'loading' || eli5State === 'loading';
    if (!busy) return;
    const toWorking = setTimeout(() => setWaitStage('working'), AI_WAIT_SECOND_STAGE_MS);
    const toLong = setTimeout(() => setWaitStage('long'), AI_WAIT_THIRD_STAGE_MS);
    return () => {
      clearTimeout(toWorking);
      clearTimeout(toLong);
    };
  }, [aiMistakeState, eli5State]);

  const buildArgs = useCallback(
    (variant: 'full' | 'eli5') => {
      const diffPairs = resolveAllMistakeTokens(targetAnswer, userAnswer);
      const mismatch = resolvePhraseMistakeToken(targetAnswer, userAnswer);
      return {
        lessonId,
        phraseId,
        studyTarget,
        interfaceLang,
        prompt,
        userAnswer,
        targetAnswer,
        phraseMeaning: prompt,
        selectedWrongWord: mismatch?.picked,
        expectedWord: mismatch?.expected,
        diffPairs,
        variant,
      } as const;
    },
    [lessonId, phraseId, studyTarget, interfaceLang, prompt, userAnswer, targetAnswer],
  );

  const explain = useCallback(
    async (withHaptic = true, backgroundRetry = false) => {
      // Гейт согласия — реальная блокировка сети, не только рендера. Без него
      // нажатие «Попробовать снова» на карточке в error-состоянии (или гонка с
      // отозванным consent) всё равно ушло бы в сеть с текстом ответа юзера.
      if (
        !activeRef.current
        || netStatusRef.current !== 'online'
        || (aiMistakeState === 'loading' && !backgroundRetry)
        || !isAiExplainConsentGranted()
        || accountScopeBlockedRef.current
        || !isCurrentAccountGeneration(accountGenerationRef.current)
        || mistakeInFlightTokenRef.current !== null
      ) return;
      const requestScope: ExplanationRequestScope = {
        phraseKey,
        accountGeneration: accountGenerationRef.current,
      };
      const requestToken = ++mistakeRequestSeqRef.current;
      mistakeInFlightTokenRef.current = requestToken;
      const isCurrentRequest = () => (
        mistakeInFlightTokenRef.current === requestToken
        && isExplanationScopeCurrent(requestScope)
      );
      const releaseInFlight = () => {
        if (isCurrentRequest()) mistakeInFlightTokenRef.current = null;
      };
      if (withHaptic) hapticTap();
      const limitShown = await hasShownAiMistakeLimitNoticeToday().catch(() => false);
      if (!isCurrentRequest()) {
        releaseInFlight();
        return;
      }
      if (limitShown) {
        setAiMistakeState('hidden');
        setAiMistakeText(null);
        releaseInFlight();
        return;
      }
      setAiMistakeState('loading');
      setAiMistakeText(null);
      setWaitStage('start');
      try {
        const res = await callExplainMistake(buildArgs('full'), {
          // Тихий повтор пошёл — ожидание уже долгое, подпись переводим сразу,
          // не дожидаясь пятисекундного порога. Про сам сбой пользователю не
          // сообщаем: через секунду он, скорее всего, получит нормальный разбор.
          onRetryStart: () => {
            if (isCurrentRequest()) {
              setWaitStage('working');
            }
          },
        });
        if (!isCurrentRequest()) return;
        setAiMistakeText(res.text);
        setAiMistakeRemaining(typeof res.remainingQuota === 'number' ? res.remainingQuota : null);
        setAiMistakeState('ready');
        mistakeRetryAttemptRef.current = 0;
        // Показ состоялся — списываем бесплатный разбор дня (владелец 17.09:
        // «оставить автозагрузку, считать каждый показ»). Считаем ЗДЕСЬ, а не
        // при запросе: неудавшийся запрос не должен съедать бесплатный разбор.
        if (paidUnlockedForPhrase !== phraseKey) {
          void markAiMistakeExplainUsed();
          setFreeExplainsLeft((prev: number) => Math.max(0, prev - 1));
        }
        const bundledEli5 = typeof res.eli5Text === 'string' ? res.eli5Text.trim() : '';
        if (bundledEli5) {
          if (eli5RetryTimerRef.current) clearTimeout(eli5RetryTimerRef.current);
          eli5RetryTimerRef.current = null;
          // The bundled response wins ownership over any separately pending ELI5
          // request. Its late success/catch/finally must not replace this result,
          // schedule a retry, or clear ownership of future work.
          eli5InFlightTokenRef.current = null;
          eli5RetryAttemptRef.current = 0;
          setEli5Text(bundledEli5);
          setEli5State('ready');
        }
      } catch (error) {
        if (!isCurrentRequest()) return;
        setAiMistakeText(null);
        if (isFreeDailyLimitError(error)) {
          await markAiMistakeLimitNoticeShownToday();
          if (!isCurrentRequest()) return;
          setAiMistakeState('limit');
          return;
        }
        if (isMistakeExplainOfflineError(error) || getNetStatus() !== 'online') {
          setAiMistakeState('idle');
          return;
        }
        setAiMistakeState('loading');
        scheduleMistakeRetry(requestScope);
      } finally {
        releaseInFlight();
      }
    },
    [aiMistakeState, phraseKey, buildArgs, isExplanationScopeCurrent, scheduleMistakeRetry],
  );

  explainRef.current = (withHaptic = true, backgroundRetry = false) => {
    void explain(withHaptic, backgroundRetry);
  };

  const openEli5 = useCallback(async (backgroundRetry = false) => {
    if (
      !activeRef.current
      || netStatusRef.current !== 'online'
      || !isAiExplainConsentGranted()
      || accountScopeBlockedRef.current
      || !isCurrentAccountGeneration(accountGenerationRef.current)
    ) return;
    if (!backgroundRetry) hapticTap();
    // A silent retry may finish a dismissed request, but must never reopen a modal
    // the learner explicitly closed.
    if (!backgroundRetry) setEli5Open(true);
    if (eli5State === 'ready' && eli5Text) return;
    if (eli5InFlightTokenRef.current !== null) return;
    const requestScope: ExplanationRequestScope = {
      phraseKey,
      accountGeneration: accountGenerationRef.current,
    };
    const requestToken = ++eli5RequestSeqRef.current;
    eli5InFlightTokenRef.current = requestToken;
    const isCurrentRequest = () => (
      eli5InFlightTokenRef.current === requestToken
      && isExplanationScopeCurrent(requestScope)
    );
    setEli5State('loading');
    setEli5Text(null);
    setWaitStage('start');
    try {
      const res = await callExplainMistake(buildArgs('eli5'), {
        onRetryStart: () => {
          if (isCurrentRequest()) {
            setWaitStage('working');
          }
        },
      });
      if (!isCurrentRequest()) return;
      setEli5Text(res.text);
      setEli5State('ready');
      eli5RetryAttemptRef.current = 0;
    } catch (error) {
      if (!isCurrentRequest()) return;
      setEli5Text(null);
      if (isFreeDailyLimitError(error)) {
        await markAiMistakeLimitNoticeShownToday();
        if (!isCurrentRequest()) return;
        if (eli5RetryTimerRef.current) clearTimeout(eli5RetryTimerRef.current);
        eli5RetryTimerRef.current = null;
        eli5RetryAttemptRef.current = 0;
        setEli5Open(false);
        setEli5State('idle');
        setAiMistakeText(null);
        setAiMistakeState('limit');
        return;
      }
      if (isMistakeExplainOfflineError(error) || getNetStatus() !== 'online') {
        setEli5State('idle');
        return;
      }
      setEli5State('loading');
      scheduleEli5Retry(requestScope);
      return;
    } finally {
      if (isCurrentRequest()) eli5InFlightTokenRef.current = null;
    }
  }, [eli5State, eli5Text, phraseKey, buildArgs, isExplanationScopeCurrent, scheduleEli5Retry]);

  openEli5Ref.current = (backgroundRetry = false) => { void openEli5(backgroundRetry); };

  useEffect(() => {
    if (!active || netStatus !== 'online' || aiMistakeState !== 'idle') return;
    if (!isAiExplainConsentHydrated()) return;
    if (!hasAiExplainConsentDecision()) {
      setConsentGateVisible(true);
      return;
    }
    // Бесплатные разборы дня кончились и этот не оплачен — автозагрузка
    // останавливается, экран показывает предложение купить за руны.
    // зачем ранний выход с логом: без него «разбор не появился» читалось бы
    // как поломка ИИ, а не как исчерпанный лимит.
    if (freeExplainsLeft <= 0 && paidUnlockedForPhrase !== phraseKey) {
      console.log(`[MISTAKE-BUY] autoload:stopped freeLeft=${freeExplainsLeft} phrase=${phraseKey}`); // guard-ok: ранний выход обязан логироваться и в релизе
      return;
    }
    if (!isAiExplainConsentGranted()) return;
    void explain(false);
  }, [active, phraseKey, netStatus, aiMistakeState, explain, forceConsentRecheckTick]);

  const requestMistakeExplanation = useCallback(() => {
    if (!active || netStatusRef.current !== 'online') return;
    if (!isAiExplainConsentGranted()) {
      setConsentGateVisible(true);
      return;
    }
    void explain(true);
  }, [active, explain]);

  const onConsentAccept = useCallback(() => {
    setConsentGateVisible(false);
    void setAiExplainConsent('granted').then(() => {
      void recordAiExplainConsentToCloud();
    });
    // Согласие не должно «съесть» текущую ошибку — грузим разбор сразу же.
    void explain(false);
  }, [explain]);

  const onConsentDecline = useCallback(() => {
    setConsentGateVisible(false);
    void setAiExplainConsent('denied').then(() => {
      void recordAiExplainConsentToCloud();
    });
  }, []);

  /**
   * Купить разбор за руны, когда бесплатные кончились. Списание МГНОВЕННОЕ и
   * локальное; сразу после него запускается обычная загрузка разбора — та же,
   * что и у бесплатного (сам разбор не переделан, владелец: «уже идеальны»).
   *
   * Двойной тап защищён ref: второй тап того же кадра ещё видит старое
   * состояние и списал бы 120 рун второй раз.
   */
  const onBuyExplain = useCallback(() => {
    if (explainBuyingRef.current || paidUnlockedForPhrase === phraseKey) return;
    explainBuyingRef.current = true;
    void buyMistakeExplainLocally(captureAccountGeneration()).then((result) => {
      explainBuyingRef.current = false;
      if (!result.ok) {
        console.log(`[MISTAKE-BUY] denied reason=${result.reason} phrase=${phraseKey}`); // guard-ok: отказ обязан логироваться и в релизе
        return;
      }
      setExplainRuneBalance(result.balance);
      setPaidUnlockedForPhrase(phraseKey);
      // Оплачено — загружаем разбор обычным путём.
      void explain(false);
    }).catch((error: unknown) => {
      explainBuyingRef.current = false;
      DebugLogger.error(
        'use_mistake_explain:buy',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    });
  }, [paidUnlockedForPhrase, phraseKey, explain]);

  const consentBlocksCard = active && !isAiExplainConsentGranted();

  return {
    aiMistakeState: consentBlocksCard
      ? 'hidden'
      : active && aiMistakeState === 'idle' && peekAiMistakeLimitNoticeShownToday()
        ? 'hidden'
        : active ? aiMistakeState : 'hidden',
    aiMistakeText,
    aiMistakeRemaining,
    aiMistakeWaitLine: aiMistakeWaitLine(asLang(interfaceLang), waitStage),
    explain: requestMistakeExplanation,
    eli5: {
      open: eli5Open,
      state: eli5State,
      text: eli5Text,
      onOpen: () => void openEli5(),
      onClose: () => setEli5Open(false),
      onRetry: () => void openEli5(),
    },
    consentGate: {
      visible: consentGateVisible,
      onAccept: onConsentAccept,
      onDecline: onConsentDecline,
    },
    economy: {
      freeLeft: freeExplainsLeft,
      priceRunes: MISTAKE_EXPLAIN_PRICE_RUNES,
      balanceRunes: explainRuneBalance,
      awaitingPurchase: active && freeExplainsLeft <= 0 && paidUnlockedForPhrase !== phraseKey,
      onBuy: onBuyExplain,
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
