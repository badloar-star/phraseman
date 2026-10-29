// plus_cloud_unconfirmed_entry.ts — диспетчеру окна покупки: подтверждало ли облако статус на этом устройстве + фоновая перепроверка.
//
// зачем (координатор 29.10, после жалобы №8): Plus только в облаке (оплата через Telegram-бот → VIP, промокод) на новом устройстве
// ещё не на телефоне, снимок «free» — окно покупки не должно открываться сразу (риск второй оплаты). Хук отдаёт отметку
// (app/plus_cloud_confirmed_marker.ts) для resolvePremiumModalEntry; если окно всё же показано вариантом «облако не ответило» —
// один раз перечитывает облако. «Восстановить покупки» магазина Telegram-VIP не находит, а это перечитывание находит:
// Plus нашёлся → PremiumContext пересчитывает доступ → диспетчер закрывает окно.
import { useEffect, useRef, useState } from 'react';
import { captureAccountGeneration } from './account_generation';
import { emitAppEvent } from './events';
import { PAYWALL_ENTRY_WAIT_CEILING_MS } from './load_gate_config';
import { peekPlusCloudConfirmed, readPlusCloudConfirmed } from './plus_cloud_confirmed_marker';
import { forcePremiumAccessCloudRestore, getVerifiedPremiumAccessStatus, invalidatePremiumCache } from './premium_guard';

const LOG = '[PLUS-CLOUD-ENTRY]';
const RECHECK_SURFACE = 'paywall_cloud_unconfirmed';
/** Ожидание облака окном на неподтверждённом устройстве: дольше обычных 1,5 с, но меньше потолка облака в premium_guard (5 с). */
export const PAYWALL_CLOUD_UNCONFIRMED_WAIT_MS = 3_000;

/** Потолок ожидания окна: на неподтверждённом устройстве при снимке «free» ждём облако дольше. */
export function paywallEntryWaitCeilingMs(cloudConfirmed: boolean | null, cached: 'free' | 'premium' | 'unknown'): number {
  return cloudConfirmed !== true && cached === 'free' ? PAYWALL_CLOUD_UNCONFIRMED_WAIT_MS : PAYWALL_ENTRY_WAIT_CEILING_MS;
}

/**
 * Отметка облака для текущего аккаунта. null — ещё читается с диска. После потолка ожидания окна (ceilingPassed)
 * «не прочитано» становится false: окно решает без отметки, а не ждёт вечно. Перечитывается, когда меняется доступ
 * (premium_guard мог поставить отметку во время проверки).
 */
export function usePlusCloudConfirmedOnDevice(accessKey: string, ceilingPassed: boolean): boolean | null {
  const stableId = captureAccountGeneration().stableId;
  const [confirmed, setConfirmed] = useState<boolean | null>(() => peekPlusCloudConfirmed(stableId));
  useEffect(() => {
    let alive = true;
    if (!stableId) {
      console.log(`${LOG} аккаунта нет — облако ждать нечего, окно решает как раньше`); // guard-ok: ранний выход
      return () => { alive = false; };
    }
    const peeked = peekPlusCloudConfirmed(stableId);
    if (peeked !== null) {
      setConfirmed(peeked);
      return () => { alive = false; };
    }
    void readPlusCloudConfirmed(stableId).then((value) => {
      if (!alive) {
        console.log(`${LOG} отметка прочитана после закрытия окна — не применяем`); // guard-ok: ранний выход
        return;
      }
      console.log(`${LOG} отметка прочитана`, JSON.stringify({ confirmed: value })); // guard-ok: одна строка на открытие окна
      setConfirmed(value);
    });
    return () => { alive = false; };
  }, [stableId, accessKey]);
  // зачем: без аккаунта Plus «только в облаке» не бывает — ждать облако и менять вариант окна незачем (прежнее поведение)
  if (!stableId) return true;
  return confirmed === null && ceilingPassed ? false : confirmed;
}

/**
 * Окно показано вариантом «облако не ответило» (shown=true) — один раз на открытие перечитать облако и сообщить PremiumContext.
 * forcePremiumAccessCloudRestore сам присоединяется к идущему восстановлению и не чаще раза в 2 мин — лишних чтений нет.
 */
export function usePlusCloudRecheckWhenUnconfirmed(shown: boolean): void {
  const startedRef = useRef(false);
  useEffect(() => {
    if (!shown || startedRef.current) return;
    startedRef.current = true;
    const startedAt = Date.now();
    console.warn(`${LOG} окно показано без подтверждения облака — перечитываем облако фоном`); // guard-ok: один раз на открытие окна
    void (async () => {
      const cloudConfirmed = await forcePremiumAccessCloudRestore(RECHECK_SURFACE);
      invalidatePremiumCache();
      const accessAfter = await getVerifiedPremiumAccessStatus();
      console.warn(`${LOG} перепроверка облака`, JSON.stringify({ cloudConfirmed, accessAfter, ms: Date.now() - startedAt })); // guard-ok: итог сети
      emitAppEvent('premium_server_recheck_done', { surface: RECHECK_SURFACE, accessAfter });
    })().catch((error: unknown) => {
      console.warn(`${LOG} перепроверка облака упала — окно остаётся, «Восстановить покупки» доступна`, error instanceof Error ? error.message : String(error));
    });
  }, [shown]);
}

export default function __RouteShim() { return null; }
