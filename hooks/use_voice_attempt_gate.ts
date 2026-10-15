// use_voice_attempt_gate.ts — гейт голосовой попытки ЛЮБОГО микрофона на общем дневном счётчике Free (D196, Ядро).
//
// зачем (владелец 15.10 ~11:10): «один счётчик 3/день на все микрофоны приложения». Раньше у каждого места была своя квота (useSpeakingAttemptGate:
// серверный revenue-квотник, точки остатка, у диалогов V2 — локальный счётчик). Этот хук повторяет API старого гейта (locked / tryStartAttempt / canStartAttempt /
// commitStartedAttempt), чтобы экраны меняли только строку подключения, но решает по ОДНОМУ счётчику app/voice_daily_allowance.ts:
//   • canStartAttempt — в кадре тапа: лимит кончился → пейвол ai_voice_input и запись не стартует; «доступ неизвестен» пропускает (Plus не блокируем из-за медленной проверки);
//   • commitStartedAttempt — в момент РЕАЛЬНОГО начала записи (подтверждённый старт распознавания): списывает одну попытку, цифра на значке падает сразу (Optimistic UI, подписка на память);
//   • одна попытка = один ключ (повторный вызов того же старта не спишет второй раз).
// Plus — без лимита и без списания. Журнал: [VOICE-LIMIT] (общий модуль) и [VOICE-GATE] — какая поверхность и чем решено.
import { useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';

import { trackEvent } from '../app/analytics';
import type { PaywallSource } from '../app/paywall_entry_contract';
import {
  VOICE_LIMIT_PAYWALL_CONTEXT,
  recordVoiceDailyAttempt,
  useVoiceDailyAllowance,
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
}>;

const PAYWALL_DEBOUNCE_MS = 600;

export function useVoiceAttemptGate(input: Readonly<{ surface: VoiceAllowanceSurface; source: PaywallSource }>): VoiceAttemptGate {
  const { surface, source } = input;
  const router = useRouter();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const allowance = useVoiceDailyAllowance();
  const seqRef = useRef(0);
  // зачем (аудит Optimistic UI 15.10): два быстрых тапа по исчерпанному микрофону открывали два пейвола и слали два `paywall_shown` — тот же дребезг, что гасит useGuardedNav (600 мс)
  const lastPaywallAtRef = useRef(Number.NEGATIVE_INFINITY);
  const locked = allowance.kind === 'limited' && allowance.exhausted;

  const canStartAttempt = useCallback((): boolean => {
    const allowed = voiceDailyAllowanceGate(surface, { accessResolved, hasPremiumAccess });
    if (!allowed) {
      const now = Date.now();
      if (now - lastPaywallAtRef.current < PAYWALL_DEBOUNCE_MS) {
        console.log(`[VOICE-GATE] ${surface}: лимит исчерпан, повторный тап ${now - lastPaywallAtRef.current} мс после пейвола — игнор`); // guard-ok: ранний выход называет причину
        return false;
      }
      lastPaywallAtRef.current = now;
      console.log(`[VOICE-GATE] ${surface}: лимит исчерпан → пейвол ${VOICE_LIMIT_PAYWALL_CONTEXT} source=${source}`); // guard-ok: ветка решения называет значение
      void trackEvent('paywall_shown', { context: VOICE_LIMIT_PAYWALL_CONTEXT, source });
      // литерал контекста — для сторожа точек входа пейвола; значение то же, что VOICE_LIMIT_PAYWALL_CONTEXT, источник типизирован PaywallSource
      router.push({ pathname: '/premium_modal', params: { context: 'ai_voice_input', source } } as never);
    }
    return allowed;
  }, [accessResolved, hasPremiumAccess, router, source, surface]);

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
    () => ({ allowance, locked, canStartAttempt, commitStartedAttempt, tryStartAttempt }),
    [allowance, canStartAttempt, commitStartedAttempt, locked, tryStartAttempt],
  );
}
