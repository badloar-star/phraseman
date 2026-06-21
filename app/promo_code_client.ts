// ════════════════════════════════════════════════════════════════════════════
// promo_code_client.ts — клиент вызова callable promoCodeRedeem.
//
// Юзер вводит промокод → сервер проверяет (decidePromoRedemption) и выдаёт дни
// премиума (VIP). Здесь только тонкая обёртка: нормализация ввода + вызов +
// маппинг ответа сервера в типизированный статус для UI.
// ════════════════════════════════════════════════════════════════════════════
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

export type PromoRedeemStatus =
  | 'redeemed'        // успех — выдано rewardDays дней
  | 'not_found'
  | 'disabled'
  | 'expired'
  | 'limit_reached'
  | 'already_redeemed'
  | 'bad_reward'
  | 'bad_code'        // локальная валидация формата не прошла
  | 'error';          // сеть/неизвестная ошибка

export interface PromoRedeemResult {
  status: PromoRedeemStatus;
  rewardDays?: number;
}

// Код: 3..32 символа, латиница/цифры/дефис/подчёркивание (зеркало серверного CODE_RE).
const CLIENT_CODE_RE = /^[A-Z0-9_-]{3,32}$/;

/** trim + upper (зеркало серверного normalizePromoCode). */
export function normalizePromoCodeInput(raw: string): string {
  return String(raw ?? '').trim().toUpperCase();
}

interface RedeemResponse {
  ok: boolean;
  reason?: string;
  rewardDays?: number;
  vipUntilMs?: number;
}

/** Активировать промокод. НЕ бросает — всегда возвращает типизированный статус. */
export async function redeemPromoCode(rawCode: string): Promise<PromoRedeemResult> {
  const code = normalizePromoCodeInput(rawCode);
  if (!CLIENT_CODE_RE.test(code)) return { status: 'bad_code' };

  try {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable<{ code: string }, RedeemResponse>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'promoCodeRedeem',
    );
    const res = await fn({ code });
    const data = res.data;
    if (data?.ok) return { status: 'redeemed', rewardDays: data.rewardDays };
    // Сервер вернул ok:false с reason — маппим в наш статус (если знаем).
    const reason = String(data?.reason ?? '');
    const known: PromoRedeemStatus[] = ['not_found', 'disabled', 'expired', 'limit_reached', 'already_redeemed', 'bad_reward'];
    return { status: (known as string[]).includes(reason) ? (reason as PromoRedeemStatus) : 'error' };
  } catch {
    return { status: 'error' };
  }
}
