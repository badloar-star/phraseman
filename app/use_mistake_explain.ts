import { useCallback, useEffect, useRef, useState } from 'react';

import { callExplainMistake, warmExplainMistake } from './ai_mistake_explain_client';
import {
  aiMistakeWaitLine,
  AI_WAIT_SECOND_STAGE_MS,
  AI_WAIT_THIRD_STAGE_MS,
  type AiWaitStage,
} from './ai_wait_copy';
import { asLang } from './explain_phrase_request';
import {
  hasShownAiMistakeLimitNoticeToday,
  markAiMistakeLimitNoticeShownToday,
  peekAiMistakeLimitNoticeShownToday,
} from './ai_mistake_explain_limit_session';
import { resolveAllMistakeTokens, resolvePhraseMistakeToken } from './mistake_token_resolver';
import {
  aiOffline,
  isAiOfflineError,
} from './ai_kill_switch_copy';
import type { AiMistakeCardState } from '../components/AiMistakeCard';
import { hapticTap } from '../hooks/use-haptics';
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
 * Extracted from lesson1.tsx so BOTH lessons and personal-plan exercises drive
 * the exact same behaviour: inline breakdown auto-loads on a wrong answer, the
 * footer button opens a simpler explanation, both hit the cached `explainMistake`
 * Cloud Function. The pure UI components + client + server cache are reused as-is.
 *
 * The hook is intentionally generic: callers pass a synthetic `lessonId` (e.g. a
 * plan-mode id) and a `phraseKey` that changes whenever the active phrase/result
 * changes — that key both resets state and discards stale async responses.
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
    state: 'idle' | 'loading' | 'ready' | 'error';
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
}

/** Серверный дневной free-кап ИИ-разборов ('explain_free_daily_limit'). */
function isFreeDailyLimitError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return message.includes('explain_free_daily_limit');
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
  const [eli5State, setEli5State] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [eli5Text, setEli5Text] = useState<string | null>(null);
  const eli5InFlightRef = useRef(false);

  // Explicit opt-in gate (юридическое требование, см. app/ai_explain_consent.ts).
  const [consentGateVisible, setConsentGateVisible] = useState(false);
  // Форс-тик, которым subscribeAiExplainConsent будит consent-эффект ниже —
  // сама подписка не хранит нужное нам значение (нам важен факт гидрации, не
  // конкретное consent-состояние), поэтому это просто счётчик перерисовки.
  const [forceConsentRecheckTick, setForceConsentRecheckTick] = useState(0);
  useEffect(() => subscribeAiExplainConsent(() => setForceConsentRecheckTick((n) => n + 1)), []);

  // Стадия ожидания для подписи под скелетоном. Отдельный state, а не таймер в
  // компоненте: карточка ре-рендерится и без нас, а тик должен идти ровно пока
  // мы ждём ответ. 'retried' взводит тихий повтор — тогда ожидание уже долгое.
  const [waitStage, setWaitStage] = useState<AiWaitStage>('start');

  // Mirror of phraseKey, read inside async callbacks to drop stale responses
  // (user moved to another phrase before the answer arrived).
  const phraseKeyRef = useRef(phraseKey);
  phraseKeyRef.current = phraseKey;

  // Reset everything when the phrase or result changes.
  useEffect(() => {
    setAiMistakeState(peekAiMistakeLimitNoticeShownToday() ? 'hidden' : 'idle');
    setAiMistakeText(null);
    setAiMistakeRemaining(null);
    setEli5Open(false);
    setEli5State('idle');
    setEli5Text(null);
    eli5InFlightRef.current = false;
    setWaitStage('start');
    setConsentGateVisible(false); // на новой фразе gate переоткроется автозагрузкой, если решения всё ещё нет.
  }, [phraseKey, active]);

  // Прогрев инстанса в момент ошибки — ДО того, как понадобится разбор.
  // зачем: у explainMistake minInstances: 0 (владелец не платит за тёплый
  // инстанс). Пока пользователь смотрит на свой неверный ответ, инстанс успевает
  // проснуться, и разбор приходит без паузы. Внутри стоит TTL — на серии ошибок
  // подряд сеть дёргается не чаще раза в 9 минут.
  useEffect(() => {
    if (!active) return;
    warmExplainMistake();
  }, [active, phraseKey]);

  // Сторож размонтажа. Проверки phraseKeyRef ловят СМЕНУ фразы, но не уход с
  // экрана: при размонтировании ref сохраняет прежнее значение, условие пройдёт,
  // и поздний onRetryStart дёрнул бы setState на мёртвом компоненте.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
    async (withHaptic = true) => {
      // Гейт согласия — реальная блокировка сети, не только рендера. Без него
      // нажатие «Попробовать снова» на карточке в error-состоянии (или гонка с
      // отозванным consent) всё равно ушло бы в сеть с текстом ответа юзера.
      if (!active || aiMistakeState === 'loading' || !isAiExplainConsentGranted()) return;
      if (withHaptic) hapticTap();
      const requestKey = phraseKey;
      if (await hasShownAiMistakeLimitNoticeToday()) {
        if (phraseKeyRef.current !== requestKey) return;
        setAiMistakeState('hidden');
        setAiMistakeText(null);
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
            if (mountedRef.current && phraseKeyRef.current === requestKey) setWaitStage('working');
          },
        });
        if (phraseKeyRef.current !== requestKey) return; // phrase changed — discard.
        setAiMistakeText(res.text);
        setAiMistakeRemaining(typeof res.remainingQuota === 'number' ? res.remainingQuota : null);
        setAiMistakeState('ready');
      } catch (error) {
        if (phraseKeyRef.current !== requestKey) return;
        // Offline failures stay quiet, but the card remains visible with its
        // deterministic local comparison and retry action.
        if (aiOffline() || isAiOfflineError(error)) {
          setAiMistakeState('error');
          setAiMistakeText(null);
          return;
        }
        // Дневной free-кап генераций (сервер — источник правды): не «ошибка»,
        // а мягкое состояние с приглашением в Plus (забавный текст + кнопка Plus).
        if (isFreeDailyLimitError(error)) {
          await markAiMistakeLimitNoticeShownToday();
          if (phraseKeyRef.current !== requestKey) return;
          setAiMistakeState('limit');
          return;
        }
        // Automatic failures stay visible as an honest retryable error.
        if (!withHaptic) {
          setAiMistakeState('error');
          setAiMistakeText(null);
          return;
        }
        setAiMistakeText(null);
        setAiMistakeState('error');
      }
    },
    [active, aiMistakeState, phraseKey, buildArgs],
  );

  const openEli5 = useCallback(async () => {
    if (!active || !isAiExplainConsentGranted()) return; // defensive: кнопка и так не рендерится без согласия.
    hapticTap();
    setEli5Open(true);
    if (eli5State === 'ready' && eli5Text) return;
    if (eli5InFlightRef.current) return;
    eli5InFlightRef.current = true;
    const requestKey = phraseKey;
    setEli5State('loading');
    setEli5Text(null);
    setWaitStage('start');
    try {
      const res = await callExplainMistake(buildArgs('eli5'), {
        onRetryStart: () => {
          if (mountedRef.current && phraseKeyRef.current === requestKey) setWaitStage('working');
        },
      });
      if (phraseKeyRef.current !== requestKey) return;
      setEli5Text(res.text);
      setEli5State('ready');
    } catch (error) {
      if (phraseKeyRef.current !== requestKey) return;
      // Ошибка сети или сервера не является объяснением. Оставляем модалку
      // в retryable error-state; её локализованный UI уже содержит кнопку повтора.
      setEli5Text(null);
      setEli5State('error');
      return;
    } finally {
      eli5InFlightRef.current = false;
    }
  }, [active, eli5State, eli5Text, phraseKey, buildArgs]);

  // Auto-load the inline breakdown once when it becomes relevant — но только
  // если согласие уже дано. Нет решения ещё → показываем модалку согласия
  // ВМЕСТО автозагрузки (карточка остаётся 'hidden', ничего не рендерится до
  // ответа пользователя). Отказ → gate закрывается, карточка не грузится.
  //
  // isAiExplainConsentHydrated() — защита от гонки холодного старта: bootstrap
  // гидрирует consent максимум 350мс (Promise.race в _layout.tsx), но НЕ ждёт
  // его — если урок открылся раньше, consentMemory ещё на дефолте 'unset', и
  // уже согласившемуся пользователю зря показало бы повторный gate. forceConsentRecheck
  // (через subscribeAiExplainConsent выше) перезапускает этот эффект, когда
  // гидрация фактически завершится, даже если значение не изменилось.
  useEffect(() => {
    if (!active || aiMistakeState !== 'idle') return;
    if (!isAiExplainConsentHydrated()) return;
    if (!hasAiExplainConsentDecision()) {
      setConsentGateVisible(true);
      return;
    }
    if (!isAiExplainConsentGranted()) return; // denied — карточка не рендерится вовсе.
    void explain(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phraseKey, aiMistakeState, explain, forceConsentRecheckTick]);

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

  // Без явного 'granted' карточка не рендерится вовсе — не 'idle' с пустым
  // плейсхолдером, а именно 'hidden'. Раньше здесь возвращался сырой aiMistakeState,
  // который на denied/ещё-нет-решения оставался 'idle', и AiMistakeCard (рендерит
  // всё, кроме 'hidden') рисовал пустую карточку с «мёртвой» кнопкой повтора —
  // разбор, которого пользователь не разрешал, физически никогда не пришёл бы.
  const consentBlocksCard = active && !isAiExplainConsentGranted();

  return {
    aiMistakeState: consentBlocksCard
      ? 'hidden'
      : active && aiMistakeState === 'idle' && peekAiMistakeLimitNoticeShownToday()
        ? 'hidden'
        : aiMistakeState,
    aiMistakeText,
    aiMistakeRemaining,
    aiMistakeWaitLine: aiMistakeWaitLine(asLang(interfaceLang), waitStage),
    explain: () => void explain(true),
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
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
