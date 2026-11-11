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
import { usePremium } from '../components/PremiumContext';
import {
  isMistakeExplainBlockedByFreeLimit,
  shouldConsumeFreeMistakeExplain,
} from './mistake_explain_plus_gate';
import { hapticTap } from '../hooks/use-haptics';
import { MISTAKE_EXPLAIN_ENABLED } from './mistake_explain_flag';
import { actionToastTri, emitAppEvent } from './events';
import { getNetStatus, subscribeNetStatus, type NetStatus } from './net_status';
import {
  hasAiExplainConsentDecision,
  isAiExplainConsentGranted,
  isAiExplainConsentHydrated,
  recordAiExplainConsentToCloud,
  setAiExplainConsent,
  subscribeAiExplainConsent,
} from './ai_explain_consent';
import { AI_EXPLAIN_AUTO_RETRIES, AI_EXPLAIN_RETRY_PAUSE_MS } from './load_gate_config';
import { buildMistakeExplainFallbackText } from './mistake_explain_fallback';
import { getDevAiExplainDemoText, isDevAiExplainLimit } from './dev_paywall_state';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import type { MistakeBreakdown } from './mistake_breakdown_model';
/**
 * Shared orchestration for the AI mistake breakdown (inline `AiMistakeCard`).
 *
 * Extracted from lesson1.tsx so every lesson surface drives
 * the exact same behaviour: the inline breakdown hits the cached `explainMistake`
 * Cloud Function. The pure UI components + client + server cache are reused as-is.
 *
 * зачем (владелец 11.11: «убери кнопку объяснить проще и функцию… они не нужны… обе удалить»): упрощённого разбора
 * («Объяснить проще», вариант eli5) в хуке больше нет — ни состояния, ни запроса, ни повторов.
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
  /**
   * Запускать разбор сразу на экране результата (прежнее поведение, нужное «Моим ошибкам»). По умолчанию false: разбор — по тапу
   * (владелец 11.10, журнал 15).
   */
  autoStart?: boolean;
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
  /**
   * зачем (владелец 11.11, аудит разбора): поля разбора — слово-промах, нужное слово, правило, пояснение.
   * null = полей нет (старая запись кэша, локальный шаблон, dev-подмена) — экран показывает aiMistakeText.
   */
  aiMistakeBreakdown: MistakeBreakdown | null;
  aiMistakeRemaining: number | null;
  /**
   * Подпись под скелетоном на время ожидания. Меняется по мере ожидания, чтобы
   * затянувшийся ответ не читался как зависание (см. app/ai_wait_copy.ts).
   */
  aiMistakeWaitLine: string;
  /**
   * зачем (D158): true - в aiMistakeText лежит ЛОКАЛЬНЫЙ шаблон, а не разбор ИИ (ИИ не ответил после
   * 2 автоповторов). Карточка показывает «Разбор ИИ появится позже» и ручную «Обновить».
   */
  aiMistakeFallback: boolean;
  /** Ручная «Обновить»: ровно ОДНА новая попытка ИИ, без нового цикла автоповторов. */
  refreshMistakeExplain: () => void;
  /** Retry the inline breakdown (also the card's onExplain). */
  explain: () => void;
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
    active: activeInput,
    autoStart = false,
    phraseKey,
    lessonId,
    phraseId,
    studyTarget,
    interfaceLang,
    prompt,
    userAnswer,
    targetAnswer,
  } = input;
  // зачем (владелец 17.10): при выключенном флаге хук инертен — все эффекты, запросы, карточка и шторка согласия завязаны на active.
  const active = MISTAKE_EXPLAIN_ENABLED && activeInput;
  useEffect(() => {
    if (!MISTAKE_EXPLAIN_ENABLED && activeInput) {
      console.log(`[MISTAKE-EXPLAIN] disabled phraseKey=${phraseKey} flag=${String(MISTAKE_EXPLAIN_ENABLED)} — карточка, согласие и вызов ИИ выключены`); // guard-ok: ИИ-разбор отключён владельцем
    }
  }, [activeInput, phraseKey]);

  const [aiMistakeState, setAiMistakeState] = useState<AiMistakeCardState>(() =>
    peekAiMistakeLimitNoticeShownToday() ? 'hidden' : 'idle',
  );
  const [aiMistakeText, setAiMistakeText] = useState<string | null>(null);
  const [aiMistakeRemaining, setAiMistakeRemaining] = useState<number | null>(null);
  // зачем: поля привязаны к ТЕКСТУ, с которым пришли. Любой сброс или подмена текста (смена фразы, шаблон D158,
  // повтор, смена аккаунта) автоматически снимает поля — чужие поля под другим текстом показать невозможно.
  const [breakdownForText, setBreakdownForText] = useState<{ text: string; breakdown: MistakeBreakdown } | null>(null);

  // зачем: D158 - признак «в тексте локальный шаблон, не ИИ» (см. UseMistakeExplainResult).
  const [aiMistakeFallback, setAiMistakeFallback] = useState(false);
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
  // зачем (решение B6, 2026-09-30): сервер (functions/src/mistake_explain.ts) пропускает Plus
  // без дневного лимита — клиент не должен останавливать Plus на 3 разборах и списывать их.
  // Источник — сырое hasPremiumAccess, ровно как resolvePremiumAccess на сервере.
  const { hasPremiumAccess, isPremium: premiumStore, isVip: premiumVip, isIntroFullAccess, devLocalPlusOverride } = usePremium();
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
  const phraseIdRef = useRef(phraseId); // для логов [AI-EXPLAIN]: только id, без текста ответа ученика
  phraseIdRef.current = phraseId;
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
  const mistakeRetryAttemptRef = useRef(0);
  const explainRef = useRef<(withHaptic?: boolean, backgroundRetry?: boolean) => void>(() => {});

  const clearRetryTimers = useCallback(() => {
    if (mistakeRetryTimerRef.current) clearTimeout(mistakeRetryTimerRef.current);
    mistakeRetryTimerRef.current = null;
  }, []);

  const invalidateRequests = useCallback(() => {
    mistakeInFlightTokenRef.current = null;
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
    setAiMistakeState('hidden');
    setAiMistakeText(null);
    setAiMistakeRemaining(null);
    setAiMistakeFallback(false);
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
    setAiMistakeState((state) => state === 'loading' ? 'idle' : state);
    setWaitStage('start');
  }, [clearRetryTimers, invalidateRequests, netStatus]);

  // Reset everything when the phrase or result changes.
  useEffect(() => {
    clearRetryTimers();
    invalidateRequests();
    mistakeRetryAttemptRef.current = 0;
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
    setAiMistakeFallback(false);
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

  // зачем (владелец 11.11: «разбор промаха готовится очень долго»; журнал сервера 16:17 — из 23 с около 11 с ушло на
  // холодный старт, а прогрев «в момент ошибки» опоздал: тап пришёл через секунду и разбудил ВТОРОЙ инстанс).
  // Будим сервер РАНЬШЕ — при показе фразы, пока человек ещё собирает ответ. Только тем, кто уже согласился на
  // ИИ-разбор (остальным он не понадобится), и не чаще раза в 9 минут (TTL внутри warmAiFunction) — счёт не растёт.
  useEffect(() => {
    if (!MISTAKE_EXPLAIN_ENABLED || !phraseKey) return;
    if (getNetStatus() !== 'online' || !isAiExplainConsentGranted()) return;
    warmExplainMistake();
  }, [phraseKey]);

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
    // зачем: D158 - фиксированная пауза 2 с и ровно AI_EXPLAIN_AUTO_RETRIES повторов (раньше экспонента до 30 с без потолка).
    const delayMs = AI_EXPLAIN_RETRY_PAUSE_MS;
    console.log(`[AI-EXPLAIN] mistake:retry_scheduled attempt=${attempt}/${AI_EXPLAIN_AUTO_RETRIES} delayMs=${delayMs} phrase=${phraseIdRef.current}`); // guard-ok: ветка повтора ИИ логируется и в релизе
    mistakeRetryTimerRef.current = setTimeout(() => {
      mistakeRetryTimerRef.current = null;
      if (netStatusRef.current === 'online' && isExplanationScopeCurrent(scope)) {
        console.log(`[AI-EXPLAIN] mistake:retry_fire attempt=${attempt}/${AI_EXPLAIN_AUTO_RETRIES} phrase=${phraseIdRef.current}`); // guard-ok
        explainRef.current(false, true);
      } else {
        console.log(`[AI-EXPLAIN] mistake:retry_skipped net=${netStatusRef.current} scopeCurrent=${isExplanationScopeCurrent(scope)} phrase=${phraseIdRef.current}`); // guard-ok: ранний выход
      }
    }, delayMs);
  }, [isExplanationScopeCurrent]);

  // Тик подписи под скелетоном. Живёт ровно пока идёт ожидание: два таймера на
  // весь цикл, оба гасятся при уходе — фоновых таймеров экран не оставляет.
  useEffect(() => {
    const busy = aiMistakeState === 'loading';
    if (!busy) return;
    const toWorking = setTimeout(() => setWaitStage('working'), AI_WAIT_SECOND_STAGE_MS);
    const toLong = setTimeout(() => setWaitStage('long'), AI_WAIT_THIRD_STAGE_MS);
    return () => {
      clearTimeout(toWorking);
      clearTimeout(toLong);
    };
  }, [aiMistakeState]);

  const buildArgs = useCallback(
    (variant: 'full') => {
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

  // зачем: D158 - мгновенный шаблон из уже известных данных ошибки (без выдумывания грамматики).
  const buildFallbackText = useCallback((): string => {
    const mismatch = resolvePhraseMistakeToken(targetAnswer, userAnswer);
    return buildMistakeExplainFallbackText(asLang(interfaceLang), {
      picked: mismatch?.picked,
      expected: mismatch?.expected,
    });
  }, [targetAnswer, userAnswer, interfaceLang]);

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
      const limitShown = await hasShownAiMistakeLimitNoticeToday().catch(noteSwallowedAs('use_mistake_explain:promise_1', false));
      if (!isCurrentRequest()) {
        console.log(`[MISTAKE-EXPLAIN] explain:stale_before_call phrase=${phraseId}`); // guard-ok: ранний выход
        releaseInFlight();
        return;
      }
      // зачем (Авторизация 12.10, paywalls-008): dev `ai_explain=limit` — карточка «лимит дня» без вызова сервера и без отметки в хранилище.
      if (isDevAiExplainLimit()) {
        console.warn(`[DEV-STATE] explain: лимит дня подменён (ai_explain=limit) phrase=${phraseId}`); // guard-ok: dev-ветка
        setAiMistakeText(null);
        setAiMistakeState('limit');
        releaseInFlight();
        return;
      }
      const devDemoText = getDevAiExplainDemoText();
      if (devDemoText !== null) {
        // зачем (координатор 13.10, mistakes-panel-016): dev `ai_explain=demo` — объяснение образца без сервера и без расхода разбора дня.
        console.warn(`[DEV-STATE] explain: объяснение подменено (ai_explain=demo) phrase=${phraseId}`); // guard-ok: dev-ветка
        setAiMistakeText(devDemoText);
        setAiMistakeRemaining(null);
        setAiMistakeFallback(false);
        setAiMistakeState('ready');
        releaseInFlight();
        return;
      }
      if (limitShown) {
        // зачем: лимит дня уже показан — разбор прячется без запроса; без лога это выглядит как «ИИ молчит».
        console.log(`[MISTAKE-EXPLAIN] explain:hidden reason=daily_limit_notice_shown phrase=${phraseId}`); // guard-ok: ранний выход
        setAiMistakeState('hidden');
        setAiMistakeText(null);
        releaseInFlight();
        return;
      }
      setAiMistakeState('loading');
      setAiMistakeText(null);
      setAiMistakeFallback(false);
      setWaitStage('start');
      console.log(`[AI-EXPLAIN] mistake:call attempt=${mistakeRetryAttemptRef.current + 1}/${AI_EXPLAIN_AUTO_RETRIES + 1} background=${backgroundRetry} phrase=${phraseId}`); // guard-ok: каждый платный вызов ИИ виден в логе
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
        setBreakdownForText(res.breakdown ? { text: res.text, breakdown: res.breakdown } : null);
        if (!res.breakdown) console.log(`[AI-EXPLAIN] mistake:no_fields fromCache=${res.fromCache === true} phrase=${phraseId} — карточка покажет сплошной текст`); // guard-ok: ветка старой записи кэша
        setAiMistakeRemaining(typeof res.remainingQuota === 'number' ? res.remainingQuota : null);
        setAiMistakeState('ready');
        console.log(`[AI-EXPLAIN] mistake:success afterFailures=${mistakeRetryAttemptRef.current} fromCache=${res.fromCache === true} phrase=${phraseId}`); // guard-ok
        mistakeRetryAttemptRef.current = 0;
        // Показ состоялся — списываем бесплатный разбор дня (владелец 17.09:
        // «оставить автозагрузку, считать каждый показ»). Считаем ЗДЕСЬ, а не
        // при запросе: неудавшийся запрос не должен съедать бесплатный разбор.
        if (shouldConsumeFreeMistakeExplain({
          isPremium: hasPremiumAccess,
          paidForThisPhrase: paidUnlockedForPhrase === phraseKey,
        })) {
          void markAiMistakeExplainUsed();
          setFreeExplainsLeft((prev: number) => Math.max(0, prev - 1));
        } else {
          console.log(`[MISTAKE-EXPLAIN] consume:skipped premium=${hasPremiumAccess} paidPhrase=${paidUnlockedForPhrase === phraseKey}`); // guard-ok: ветка лимита логируется и в релизе
        }
      } catch (error) {
        const errCode = String((error as { code?: unknown })?.code ?? 'unknown');
        if (!isCurrentRequest()) {
          console.log(`[AI-EXPLAIN] mistake:failure_stale code=${errCode} phrase=${phraseId}`); // guard-ok: ранний выход
          return;
        }
        setAiMistakeText(null);
        if (isFreeDailyLimitError(error)) {
          // зачем (Сверка 05.10, MISTAKE_RUN_2026-10-04_2233: daily_limit при premium=true freeLeft=3): сервер отдаёт
          // explain_free_daily_limit только на БЕСПЛАТНОМ пути — он не признал Plus. Печатаем, из какого источника
          // Plus у телефона (стор / VIP / вводный доступ / локальная выдача разработчика) и что ответил сервер.
          console.log(`[AI-EXPLAIN] mistake:daily_limit phrase=${phraseId} client=${JSON.stringify({
            hasPremiumAccess, store: premiumStore, vip: premiumVip, intro: isIntroFullAccess,
            devOverride: devLocalPlusOverride, dev: typeof __DEV__ !== 'undefined' && __DEV__,
          })} server=${JSON.stringify(mistakeExplainErrorText(error).slice(0, 160))}`); // guard-ok
          await markAiMistakeLimitNoticeShownToday();
          if (!isCurrentRequest()) return;
          setAiMistakeState('limit');
          return;
        }
        if (isMistakeExplainOfflineError(error) || getNetStatus() !== 'online') {
          console.log(`[AI-EXPLAIN] mistake:offline code=${errCode} net=${getNetStatus()} phrase=${phraseId}`); // guard-ok
          setAiMistakeState('idle');
          return;
        }
        if (mistakeRetryAttemptRef.current < AI_EXPLAIN_AUTO_RETRIES) {
          console.log(`[AI-EXPLAIN] mistake:failure code=${errCode} retriesUsed=${mistakeRetryAttemptRef.current}/${AI_EXPLAIN_AUTO_RETRIES} phrase=${phraseId}`); // guard-ok
          setAiMistakeState('loading');
          scheduleMistakeRetry(requestScope);
        } else {
          // зачем: D158 - автоповторы исчерпаны: мгновенный локальный шаблон вместо вечного скелетона.
          console.log(`[AI-EXPLAIN] mistake:exhausted->template code=${errCode} phrase=${phraseId}`); // guard-ok
          setAiMistakeText(buildFallbackText());
          setAiMistakeFallback(true);
          setAiMistakeState('ready');
        }
      } finally {
        releaseInFlight();
      }
    },
    [aiMistakeState, phraseKey, phraseId, buildArgs, buildFallbackText, isExplanationScopeCurrent, scheduleMistakeRetry, hasPremiumAccess, paidUnlockedForPhrase, premiumStore, premiumVip, isIntroFullAccess, devLocalPlusOverride],
  );

  explainRef.current = (withHaptic = true, backgroundRetry = false) => {
    void explain(withHaptic, backgroundRetry);
  };

  // зачем (владелец 11.10, журнал 15; макет learn D5): ИИ-разбор ошибки запускается ТОЛЬКО по тапу «Разобрать мой ответ» — автозапуска на экране
  // результата «Неверно» больше нет (квота/энергия тратятся только по выбору человека). Бывшая автозагрузка (согласие → лимит → запрос)
  // теперь целиком в requestMistakeExplanation; здесь — один след на каждую ошибку, чтобы «разбор не пришёл» читался по логу.
  useEffect(() => {
    if (!active || autoStart) return;
    console.log(`[MISTAKE-EXPLAIN] manual_only: ждём тап phrase=${phraseKey} net=${netStatus} state=${aiMistakeState} consent=${isAiExplainConsentGranted() ? 'granted' : hasAiExplainConsentDecision() ? 'denied' : 'undecided'} freeLeft=${freeExplainsLeft} premium=${hasPremiumAccess}`); // guard-ok: вход в экран результата
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phraseKey]);

  // зачем (владелец 11.10, журнал 15): автозагрузка разбора осталась ТОЛЬКО для экранов, которые просят её явно (autoStart — «Мои ошибки»).
  // Урок и планы запускают разбор тапом.
  useEffect(() => {
    // зачем (координатор 04.10, «Почему» почти всегда общая фраза; «сперва логи»): каждый выход
    // автозагрузки пишет, ЧТО её остановило — иначе «ИИ не ответил» неотличимо от «запроса не было».
    if (!autoStart) return;
    if (!active || netStatus !== 'online' || aiMistakeState !== 'idle') {
      if (active) {
        console.log(`[MISTAKE-EXPLAIN] autoload:skip net=${netStatus} state=${aiMistakeState} phrase=${phraseKey}`); // guard-ok: ранний выход
      }
      return;
    }
    if (!isAiExplainConsentHydrated()) {
      console.log(`[MISTAKE-EXPLAIN] autoload:skip reason=consent_not_hydrated phrase=${phraseKey}`); // guard-ok: ранний выход
      return;
    }
    if (!hasAiExplainConsentDecision()) {
      setConsentGateVisible(true);
      return;
    }
    // Бесплатные разборы дня кончились и этот не оплачен — автозагрузка
    // останавливается, экран показывает предложение купить за руны.
    // зачем ранний выход с логом: без него «разбор не появился» читалось бы
    // как поломка ИИ, а не как исчерпанный лимит.
    if (isMistakeExplainBlockedByFreeLimit({
      freeLeft: freeExplainsLeft,
      isPremium: hasPremiumAccess,
      paidForThisPhrase: paidUnlockedForPhrase === phraseKey,
    })) {
      console.log(`[MISTAKE-BUY] autoload:stopped freeLeft=${freeExplainsLeft} premium=${hasPremiumAccess} phrase=${phraseKey}`); // guard-ok: ранний выход обязан логироваться и в релизе
      return;
    }
    if (hasPremiumAccess && freeExplainsLeft <= 0) {
      console.log(`[MISTAKE-EXPLAIN] autoload:plus_bypass freeLeft=${freeExplainsLeft} phrase=${phraseKey}`); // guard-ok: ветка Plus без лимита
    }
    if (!isAiExplainConsentGranted()) {
      console.log(`[MISTAKE-EXPLAIN] autoload:skip reason=consent_denied phrase=${phraseKey}`); // guard-ok: ранний выход
      return;
    }
    console.log(`[MISTAKE-EXPLAIN] autoload:request freeLeft=${freeExplainsLeft} premium=${hasPremiumAccess} phrase=${phraseKey}`); // guard-ok
    void explain(false);
  }, [active, phraseKey, netStatus, aiMistakeState, explain, forceConsentRecheckTick, hasPremiumAccess, freeExplainsLeft, paidUnlockedForPhrase, autoStart]);

  const requestMistakeExplanation = useCallback(() => {
    if (!active) {
      console.log(`[MISTAKE-EXPLAIN] tap:ignored reason=inactive phrase=${phraseKey}`); // guard-ok: ранний выход
      return;
    }
    if (netStatusRef.current !== 'online') {
      // зачем: раньше тап офлайн молча ничего не делал — теперь человек видит причину и может повторить, когда сеть вернётся.
      console.log(`[MISTAKE-EXPLAIN] tap:offline net=${netStatusRef.current} phrase=${phraseKey}`); // guard-ok: ранний выход
      hapticTap();
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Нет сети — разбор появится, когда она вернётся. Нажми ещё раз.', uk: 'Немає мережі — розбір з’явиться, коли вона повернеться. Натисни ще раз.',
        en: 'No connection. Tap again once you’re back online.', es: 'Sin conexión. Vuelve a tocar cuando la tengas.',
        'pt-BR': 'Sem conexão. Toque de novo quando voltar a rede.', vi: 'Không có mạng. Hãy chạm lại khi có mạng.',
        id: 'Tidak ada koneksi. Ketuk lagi saat sudah online.', tr: 'Bağlantı yok. İnternet gelince tekrar dokun.', pl: 'Brak sieci. Dotknij ponownie, gdy wróci.',
      }));
      return;
    }
    if (!isAiExplainConsentGranted()) {
      console.log(`[MISTAKE-EXPLAIN] tap:consent_gate decision=${hasAiExplainConsentDecision() ? 'denied' : 'undecided'} phrase=${phraseKey}`); // guard-ok: ветка согласия
      setConsentGateVisible(true);
      return;
    }
    console.log(`[MISTAKE-EXPLAIN] tap:request freeLeft=${freeExplainsLeft} premium=${hasPremiumAccess} paid=${paidUnlockedForPhrase === phraseKey} phrase=${phraseKey}`); // guard-ok: запрос по тапу
    void explain(true);
  }, [active, explain, freeExplainsLeft, hasPremiumAccess, paidUnlockedForPhrase, phraseKey]);

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
        // зачем (координатор 25.10, [COIN-SPEND-GAP]): цена между кошельком и показанным числом, досылка не удалась — «монеты ещё сохраняются», а не «не хватает»
        if (result.reason === 'coins_saving') void Promise.all([import('./coin_spend_gap'), import('./events')]).then(([{ coinsSavingToast }, { emitAppEvent }]) => emitAppEvent('action_toast', coinsSavingToast()));
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

  // зачем: D158 - ручная «Обновить» = ровно ОДНА попытка. Счётчик автоповторов выставляем в потолок:
  // при новом сбое сразу снова шаблон, без нового цикла автоповторов.
  const refreshMistakeExplain = useCallback(() => {
    console.log(`[AI-EXPLAIN] mistake:manual_refresh phrase=${phraseId}`); // guard-ok
    mistakeRetryAttemptRef.current = AI_EXPLAIN_AUTO_RETRIES;
    void explain(true);
  }, [explain, phraseId]);

  // зачем (журнал 15): без автозапуска согласие спрашивается по тапу, поэтому карточка с кнопками видна и тем, кто ещё не решил;
  // скрываем её только у тех, кто согласие явно отклонил.
  const consentBlocksCard = active && !isAiExplainConsentGranted() && (autoStart || hasAiExplainConsentDecision());

  return {
    aiMistakeState: consentBlocksCard
      ? 'hidden'
      : active && aiMistakeState === 'idle' && peekAiMistakeLimitNoticeShownToday()
        ? 'hidden'
        : active ? aiMistakeState : 'hidden',
    aiMistakeText,
    aiMistakeBreakdown: active && aiMistakeState === 'ready' && !aiMistakeFallback && breakdownForText !== null
      && breakdownForText.text === aiMistakeText
      ? breakdownForText.breakdown
      : null,
    aiMistakeRemaining,
    aiMistakeWaitLine: aiMistakeWaitLine(asLang(interfaceLang), waitStage),
    aiMistakeFallback,
    refreshMistakeExplain,
    explain: requestMistakeExplanation,
    consentGate: {
      visible: consentGateVisible,
      onAccept: onConsentAccept,
      onDecline: onConsentDecline,
    },
    economy: {
      freeLeft: freeExplainsLeft,
      priceRunes: MISTAKE_EXPLAIN_PRICE_RUNES,
      balanceRunes: explainRuneBalance,
      awaitingPurchase: active && isMistakeExplainBlockedByFreeLimit({
        freeLeft: freeExplainsLeft,
        isPremium: hasPremiumAccess,
        paidForThisPhrase: paidUnlockedForPhrase === phraseKey,
      }),
      onBuy: onBuyExplain,
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
