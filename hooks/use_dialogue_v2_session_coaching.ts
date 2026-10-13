import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { captureAccountGeneration } from '../app/account_generation';
import { getDevDialogSend } from '../app/dev_dialog_state';
import {
  markAiDialogMonthlyQuotaExhausted,
  readAiDialogMonthlyQuota,
  recordAiDialogMonthlyQuotaFromServer,
} from '../app/ai_dialog_daily_quota';
import type { AiDialogQuotaObservation } from '../app/ai_dialog_daily_quota';
import {
  EMPTY_DIALOGUE_V2_QUOTA,
  beginDialogueV2QuotaTurn,
  displayDialogueV2QuotaRemaining,
  rollbackDialogueV2QuotaTurn,
  setDialogueV2QuotaRemaining,
  settleDialogueV2QuotaTurn,
  type DialogueV2QuotaState,
} from '../app/dialogue_v2_quota_optimistic';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';
import type {
  DialogueV2CoachedTurnQuota,
  DialogueV2CoachingMood,
  DialogueV2TurnCoaching,
} from '../app/dialogue_v2_turn_coaching_client';
import {
  DIALOGUE_V2_WHY_FREE_PER_DAY,
  emptyWhyAllowance,
  persistDialogueV2WhyAllowance,
  readDialogueV2WhyAllowance,
  revealWhy,
  whyFreeLeft,
  type DialogueV2WhyAllowance,
} from '../app/dialogue_v2_why_allowance';

// зачем (владелец 2026-09-30, D111/D112, макет dialogs.html C3–C38): всё состояние разбора
// хода V2 в одном месте, чтобы маршрут сессии остался тонким: настроение и текущее задание
// из последнего хода, подсказка, раскрытые переводы и «Лучше так», шторка «Почему так» с
// дневным счётчиком Free, месячный остаток ответов (зеркало на телефоне + ответ сервера) и
// «собеседник закрыл сцену». Каждый тап меняет состояние сразу (Optimistic UI); запись в
// хранилище догоняет фоном и никогда не отнимает уже показанное.

export const DIALOGUE_V2_FREE_MONTHLY_REPLIES = REVENUE_MONTHLY_LIMITS.ai_dialog_replies;

export type DialogueV2SessionQuotaView = Readonly<{ remaining: number; total: number }>;

type Input = Readonly<{
  studyTarget: string | null;
  sessionId: string | null;
  /** true — Free (лимиты и счётчики действуют); false — Plus или доступ ещё не известен. */
  freeTier: boolean;
}>;

function withId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  next.add(id);
  return next;
}

function withoutId(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  next.delete(id);
  return next;
}

export function useDialogueV2SessionCoaching({ studyTarget, sessionId, freeTier }: Input) {
  const [mood, setMood] = useState<DialogueV2CoachingMood | null>(null);
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [summarySeen, setSummarySeen] = useState(false);
  const [translatedIds, setTranslatedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [fixOpenIds, setFixOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [whyMessageId, setWhyMessageId] = useState<string | null>(null);
  const [whyRevealed, setWhyRevealed] = useState(false);
  const [allowance, setAllowance] = useState<DialogueV2WhyAllowance>(() => emptyWhyAllowance());
  const allowanceRef = useRef(allowance);
  allowanceRef.current = allowance;
  // зачем (E3, координатор 12.10): остаток и ходы в полёте — ОДНО состояние, чтобы ответ сервера менял их одной отрисовкой.
  const [quota, setQuota] = useState<DialogueV2QuotaState>(EMPTY_DIALOGUE_V2_QUOTA);
  const setQuotaRemaining = useCallback((remaining: number | null) => {
    setQuota((current) => setDialogueV2QuotaRemaining(current, remaining));
  }, []);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  // зачем (Сверка 05.10, dialogue_completion_run: «coached:send → quota_exhausted», реплика пропала молча): сервер
  // сказал «лимит исчерпан» (dialog_free_limit), а телефон считал человека Plus (freeTier=false) — экран лимита был
  // закрыт условием freeTier. Отказ СЕРВЕРА — факт, он показывает экран лимита независимо от того, что телефон
  // думает о тарифе.
  const [serverExhausted, setServerExhausted] = useState(false);
  // зачем: поздний ответ зеркала не должен затирать свежий остаток из хода (last-write-guard).
  const quotaFromServerRef = useRef(false);

  useEffect(() => {
    let alive = true;
    void readDialogueV2WhyAllowance().then((stored) => {
      if (alive) setAllowance(stored);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!freeTier || !studyTarget) {
      // зачем (координатор 12.10, «сперва логи»): пилюли нет — назвать, почему (Plus или нет языка), а не молчать.
      console.log(`[DIALOG-QUOTA-OPT] initial: skip freeTier=${String(freeTier)} studyTarget=${studyTarget ? 'yes' : 'no'}`);
      setQuotaRemaining(null);
      setQuotaExhausted(false);
      return undefined;
    }
    let alive = true;
    const stableId = captureAccountGeneration().stableId;
    const readStartedAt = Date.now();
    void readAiDialogMonthlyQuota(studyTarget, stableId).then((state) => {
      // зачем (координатор 12.10, Сверка: remaining=null на первой реплике): откуда взялось начальное значение пилюли —
      // кэш (зеркало остатка) или null, сколько шло чтение и не опоздало ли оно за ответом сервера.
      const remainingFromMirror = state.status === 'allowed' ? state.remaining : state.status === 'exhausted' ? 0 : null;
      console.log('[DIALOG-QUOTA-OPT] initial', JSON.stringify({
        source: remainingFromMirror === null ? 'null' : 'cache',
        status: state.status,
        remaining: remainingFromMirror,
        readMs: Date.now() - readStartedAt,
        stableId: stableId ? 'yes' : 'no',
        applied: alive && !quotaFromServerRef.current,
        skippedBecause: !alive ? 'unmounted' : quotaFromServerRef.current ? 'server_answered_first' : null,
      }));
      if (!alive || quotaFromServerRef.current) return;
      if (state.status === 'allowed') setQuotaRemaining(state.remaining);
      if (state.status === 'exhausted') {
        setQuotaRemaining(0);
        setQuotaExhausted(true);
      }
    });
    return () => { alive = false; };
  }, [freeTier, studyTarget]);

  /** Разбор нового хода; replyIds — id пузырей собеседника в порядке `replies`. */
  const applyCoaching = useCallback((coaching: DialogueV2TurnCoaching | null) => {
    // зачем (Сверка 05.10: диалог закончился после 2-й реплики, цели засчитаны скачком 1→4): цель и конец диалога
    // решает сервер (activeObjectiveId, dialogueEnded в ответе хода) — печатаем, что пришло на каждом ходе.
    if (!coaching) {
      console.log('[DIALOGUE-V2] coaching:none — ход без разбора');
      return;
    }
    console.log('[DIALOGUE-V2] coaching:turn', JSON.stringify({
      activeObjectiveId: coaching.activeObjectiveId,
      dialogueEnded: coaching.dialogueEnded,
      mood: coaching.mood ?? null,
      hasHint: !!coaching.hint,
    }));
    if (coaching.mood) setMood(coaching.mood);
    if (coaching.activeObjectiveId) setActiveObjectiveId(coaching.activeObjectiveId);
    if (coaching.hint) setHint(coaching.hint);
    if (coaching.dialogueEnded) setEnded(true);
  }, []);

  /** Отправка хода: пилюля «N/30» уменьшается сразу (повтор того же turnId — без изменений). */
  const beginQuotaTurn = useCallback((turnId: string) => {
    setQuota((current) => beginDialogueV2QuotaTurn(current, turnId));
  }, []);

  /** Сбой хода (service / network / rate_limited / paused): откат пилюли. */
  const rollbackQuotaTurn = useCallback((turnId: string, reason: string) => {
    setQuota((current) => rollbackDialogueV2QuotaTurn(current, turnId, reason));
  }, []);

  const applyQuota = useCallback((quota: DialogueV2CoachedTurnQuota | null, turnId?: string, replayed = false) => {
    if (!quota || quota.remaining === null) {
      console.log(`[DIALOGUE-V2] quota:skip — ${quota ? 'remaining=null (безлимит)' : `нет квоты в ответе (replayed=${String(replayed)})`}`);
      // зачем (E3): ход отвечен — снимаем его из «в полёте» даже без остатка в ответе, иначе пилюля осталась бы −1.
      // Повтор хода (replayed) без квоты списывает 1 сам — см. settleDialogueV2QuotaTurn (аудит 13.10, п.4).
      if (turnId) setQuota((current) => settleDialogueV2QuotaTurn(current, turnId, null, replayed));
      return;
    }
    console.log('[DIALOGUE-V2] quota:turn', JSON.stringify({
      remaining: quota.remaining, exhausted: quota.remaining <= 0, resetAtMs: quota.resetAtMs, quotaVersion: quota.quotaVersion,
    }));
    quotaFromServerRef.current = true;
    // зачем (E3): остаток сервера и снятие хода — один переход, цифра не прыгает (−1 сразу, ответ подтверждает).
    const serverRemaining = quota.remaining;
    setQuota((current) => (turnId
      ? settleDialogueV2QuotaTurn(current, turnId, serverRemaining)
      : setDialogueV2QuotaRemaining(current, serverRemaining)));
    if (quota.remaining <= 0) {
      setQuotaExhausted(true);
      setServerExhausted(true);
    }
    if (quota.quotaVersion !== null && studyTarget) {
      void recordAiDialogMonthlyQuotaFromServer(studyTarget, captureAccountGeneration().stableId, {
        remainingQuota: quota.remaining,
        resetAtMs: quota.resetAtMs,
        quotaVersion: quota.quotaVersion,
      });
    }
  }, [studyTarget]);

  const markExhausted = useCallback((observation: AiDialogQuotaObservation | null, turnId?: string) => {
    console.warn('[DIALOGUE-V2] quota:exhausted_by_server', JSON.stringify({
      freeTierOnPhone: freeTier,
      observation: observation ?? null,
    }));
    quotaFromServerRef.current = true;
    setQuota((current) => (turnId ? settleDialogueV2QuotaTurn(current, turnId, 0) : setDialogueV2QuotaRemaining(current, 0)));
    setQuotaExhausted(true);
    setServerExhausted(true);
    // зачем (координатор 12.10, dev_dialog_send=quota_exhausted): «исчерпан» от подставного хода не пишем в зеркало —
    // иначе тестовый аккаунт застрял бы на экране лимита до конца месяца. Экран лимита показывается как обычно.
    if (getDevDialogSend() === 'quota_exhausted') {
      console.log('[DEV-STATE] dialogs: send=quota_exhausted — экран лимита показан, зеркало не тронуто');
      return;
    }
    if (studyTarget) {
      void markAiDialogMonthlyQuotaExhausted(studyTarget, captureAccountGeneration().stableId, observation ?? undefined);
    }
  }, [freeTier, studyTarget]);

  const toggleTranslation = useCallback((messageId: string) => {
    setTranslatedIds((current) => (current.has(messageId) ? withoutId(current, messageId) : withId(current, messageId)));
  }, []);

  const openFix = useCallback((messageId: string) => {
    setFixOpenIds((current) => withId(current, messageId));
  }, []);

  const openWhy = useCallback((messageId: string) => {
    if (!freeTier) {
      setWhyRevealed(true);
      setWhyMessageId(messageId);
      return;
    }
    const revealId = `${sessionId ?? 'nosession'}:${messageId}`;
    const step = revealWhy(allowanceRef.current, revealId);
    if (step.next !== allowanceRef.current) {
      allowanceRef.current = step.next;
      setAllowance(step.next);
      persistDialogueV2WhyAllowance(step.next);
    }
    if (!step.allowed) console.warn('[DIALOGUE-V2] why:gate → free explanations used up today');
    setWhyRevealed(step.allowed);
    setWhyMessageId(messageId);
  }, [freeTier, sessionId]);

  const closeWhy = useCallback(() => setWhyMessageId(null), []);
  const markSummarySeen = useCallback(() => setSummarySeen(true), []);

  const shownRemaining = displayDialogueV2QuotaRemaining(quota);
  const quotaView: DialogueV2SessionQuotaView | null = useMemo(() => (
    freeTier && shownRemaining !== null
      ? Object.freeze({ remaining: shownRemaining, total: DIALOGUE_V2_FREE_MONTHLY_REPLIES })
      : null
  ), [freeTier, shownRemaining]);

  return {
    mood,
    activeObjectiveId,
    hint,
    ended,
    summarySeen,
    translatedIds,
    fixOpenIds,
    whyMessageId,
    whyGate: freeTier
      ? Object.freeze({ revealed: whyRevealed, freeLeft: whyFreeLeft(allowance), freePerDay: DIALOGUE_V2_WHY_FREE_PER_DAY })
      : null,
    quotaView,
    quotaExhausted: (freeTier && quotaExhausted) || serverExhausted,
    applyCoaching,
    applyQuota,
    beginQuotaTurn,
    rollbackQuotaTurn,
    markExhausted,
    toggleTranslation,
    openFix,
    openWhy,
    closeWhy,
    markSummarySeen,
  };
}
