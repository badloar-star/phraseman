// use_voice_attempt_gate.ts — гейт голосовой попытки ЛЮБОГО микрофона на общем дневном счётчике Free (D196, Ядро).
//
// зачем (владелец 15.10 ~11:10): «один счётчик 3/день на все микрофоны приложения». Раньше у каждого места была своя квота (useSpeakingAttemptGate:
// серверный revenue-квотник, точки остатка, у диалогов V2 — локальный счётчик). Этот хук повторяет API старого гейта (locked / tryStartAttempt / canStartAttempt /
// commitStartedAttempt), чтобы экраны меняли только строку подключения, но решает по ОДНОМУ счётчику app/voice_daily_allowance.ts:
//   • canStartAttempt — в кадре тапа: лимит кончился → пейвол ai_voice_input и запись не стартует; «доступ неизвестен» пропускает (Plus не блокируем из-за медленной проверки);
//   • commitStartedAttempt — в момент РЕАЛЬНОГО начала записи (подтверждённый старт распознавания): списывает одну попытку, цифра на значке падает сразу (Optimistic UI, подписка на память);
//   • одна попытка = один ключ (повторный вызов того же старта не спишет второй раз).
// Plus — без лимита и без списания. Журнал: [VOICE-LIMIT] (общий модуль) и [VOICE-GATE] — какая поверхность и чем решено.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import { trackEvent } from '../app/analytics';
import type { PaywallSource } from '../app/paywall_entry_contract';
import {
  VOICE_LIMIT_PAYWALL_CONTEXT,
  recordVoiceDailyAttempt,
  useVoiceDailyAllowance,
  voiceAccessSource,
  voiceDailyAllowanceGate,
  type VoiceAllowanceSurface,
  type VoiceDailyAllowance,
} from '../app/voice_daily_allowance';
import { usePremium } from '../components/PremiumContext';

export type VoiceAttemptGate = Readonly<{
  /** Остаток на сегодня для значка и подписей (plus / limited / unknown). */
  allowance: VoiceDailyAllowance;
  /** true — лимит на сегодня исчерпан: тап уведёт на пейвол. */
  locked: boolean;
  /** Вызвать в кадре тапа: true — можно начинать запись, false — уже открыт пейвол. Ничего не списывает. */
  canStartAttempt: () => boolean;
  /** Вызвать, когда запись реально началась (подтверждённый старт): списывает одну попытку. */
  commitStartedAttempt: () => void;
  /** canStartAttempt + commitStartedAttempt в одном шаге — для кнопок, где «тап» = «старт» (удержание, запись по касанию). */
  tryStartAttempt: () => boolean;
  /** R13: лимит на нуле в запасном режиме (доступ ещё неизвестен) — пейвол не показан, ждём ответа ≤ 10 с (индикатор на кнопке). */
  awaitingAccess: boolean;
}>;

const PAYWALL_DEBOUNCE_MS = 600;
/** R13: сколько ждать настоящего ответа о подписке на нуле в запасном режиме, прежде чем показать пейвол. */
export const VOICE_ACCESS_AWAIT_CEILING_MS = 10_000;

export function useVoiceAttemptGate(input: Readonly<{ surface: VoiceAllowanceSurface; source: PaywallSource }>): VoiceAttemptGate {
  const { surface, source } = input;
  const router = useRouter();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const allowance = useVoiceDailyAllowance();
  const seqRef = useRef(0);
  // зачем (аудит Optimistic UI 15.10): два быстрых тапа по исчерпанному микрофону открывали два пейвола и слали два `paywall_shown` — тот же дребезг, что гасит useGuardedNav (600 мс)
  const lastPaywallAtRef = useRef(Number.NEGATIVE_INFINITY);
  const locked = allowance.kind === 'limited' && allowance.exhausted;

  // зачем (координатор R13 15.10, «платящий не должен видеть купи Plus»): на нуле в ЗАПАСНОМ режиме (доступ неизвестен, кэша
  // аккаунта нет) это может быть Plus, чья подписка ещё резолвится. Пейвол не показываем — ждём настоящего ответа ≤ 10 с:
  // Plus → можно говорить (следующий тап пишет), Free или таймаут → обычный пейвол.
  const [awaitingAccess, setAwaitingAccess] = useState(false);

  const openVoicePaywall = useCallback((reason: string): void => {
    lastPaywallAtRef.current = Date.now();
    console.log(`[VOICE-GATE] ${surface}: лимит исчерпан → пейвол ${VOICE_LIMIT_PAYWALL_CONTEXT} source=${source} reason=${reason}`); // guard-ok: ветка решения называет значение
    void trackEvent('paywall_shown', { context: VOICE_LIMIT_PAYWALL_CONTEXT, source });
    // литерал контекста — для сторожа точек входа пейвола; значение то же, что VOICE_LIMIT_PAYWALL_CONTEXT
    router.push({ pathname: '/premium_modal', params: { context: 'ai_voice_input', source } } as never);
  }, [router, source, surface]);

  useEffect(() => {
    if (!awaitingAccess) return undefined;
    if (accessResolved || hasPremiumAccess) {
      setAwaitingAccess(false);
      if (hasPremiumAccess) {
        console.log(`[ACCESS-RESOLVE] voice_await_done ${JSON.stringify({ surface, result: 'plus', action: 'record_allowed' })}`); // guard-ok: итог ожидания
        return undefined;
      }
      console.log(`[ACCESS-RESOLVE] voice_await_done ${JSON.stringify({ surface, result: 'free', action: 'paywall' })}`); // guard-ok: итог ожидания
      openVoicePaywall('await_resolved_free');
      return undefined;
    }
    const timer = setTimeout(() => {
      setAwaitingAccess(false);
      console.warn(`[ACCESS-RESOLVE] voice_await_done ${JSON.stringify({ surface, result: 'timeout', ceilingMs: VOICE_ACCESS_AWAIT_CEILING_MS, action: 'paywall' })}`); // guard-ok: итог ожидания
      openVoicePaywall('await_timeout');
    }, VOICE_ACCESS_AWAIT_CEILING_MS);
    return () => clearTimeout(timer);
  }, [accessResolved, awaitingAccess, hasPremiumAccess, openVoicePaywall, surface]);

  const canStartAttempt = useCallback((): boolean => {
    const allowed = voiceDailyAllowanceGate(surface, { accessResolved, hasPremiumAccess });
    if (!allowed && voiceAccessSource({ accessResolved, hasPremiumAccess }) === 'fallback') {
      console.log(`[VOICE-GATE] ${surface}: лимит в запасном режиме — пейвол не показываем, ждём ответа о подписке ≤ ${VOICE_ACCESS_AWAIT_CEILING_MS} мс`); // guard-ok: ветка решения
      setAwaitingAccess(true);
      return false;
    }
    if (!allowed) {
      const now = Date.now();
      if (now - lastPaywallAtRef.current < PAYWALL_DEBOUNCE_MS) {
        console.log(`[VOICE-GATE] ${surface}: лимит исчерпан, повторный тап ${now - lastPaywallAtRef.current} мс после пейвола — игнор`); // guard-ok: ранний выход называет причину
        return false;
      }
      openVoicePaywall('limit_reached');
    }
    return allowed;
  }, [accessResolved, hasPremiumAccess, openVoicePaywall, surface]);

  const commitStartedAttempt = useCallback((): void => {
    seqRef.current += 1;
    // ключ уникален на запись: поверхность + время + порядковый номер (повтор того же вызова в один миг не спишет дважды)
    recordVoiceDailyAttempt(surface, `${surface}:${Date.now()}:${seqRef.current}`, { accessResolved, hasPremiumAccess });
  }, [accessResolved, hasPremiumAccess, surface]);

  const tryStartAttempt = useCallback((): boolean => {
    if (!canStartAttempt()) return false;
    commitStartedAttempt();
    return true;
  }, [canStartAttempt, commitStartedAttempt]);

  return useMemo(
    () => ({ allowance, locked, canStartAttempt, commitStartedAttempt, tryStartAttempt, awaitingAccess }),
    [allowance, awaitingAccess, canStartAttempt, commitStartedAttempt, locked, tryStartAttempt],
  );
}
