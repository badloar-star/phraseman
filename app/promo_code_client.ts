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
import { withCallableTimeout } from './callable_timeout';

const FUNCTIONS_REGION = 'us-central1';
const promoRedeemInFlight = new Map<string, Promise<PromoRedeemResult>>();

export type PromoRedeemStatus =
  | 'redeemed'        // успех — выдано rewardDays дней
  | 'promo_disabled'  // промокоды временно выключены в Пульте
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
  rewardKind?: 'days' | 'lifetime';
  vipUntilMs?: number;
  grantAtMs?: number;
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
  rewardKind?: 'days' | 'lifetime';
  vipUntilMs?: number;
  grantAtMs?: number;
}

/** Активировать промокод. НЕ бросает — всегда возвращает типизированный статус. */
export async function redeemPromoCode(rawCode: string): Promise<PromoRedeemResult> {
  const code = normalizePromoCodeInput(rawCode);
  if (!CLIENT_CODE_RE.test(code)) return { status: 'bad_code' };
  const existing = promoRedeemInFlight.get(code);
  if (existing) return existing;

  const request = (async (): Promise<PromoRedeemResult> => {
    try {
      await initFirebaseAppCheckIfAvailable().catch(() => {});
      const fn = httpsCallable<{ code: string }, RedeemResponse>(
        getFunctions(getApp(), FUNCTIONS_REGION),
        'promoCodeRedeem',
      );
      // 30с вместо ~70с дефолта: кнопка «Применить» не висит минуту на плохой сети.
      const res = await withCallableTimeout(fn({ code }), 'promoCodeRedeem');
      const data = res.data;
      if (data?.ok) {
        return {
          status: 'redeemed',
          rewardDays: data.rewardDays,
          rewardKind: data.rewardKind,
          vipUntilMs: Math.max(0, Math.floor(Number(data.vipUntilMs ?? 0))),
          grantAtMs: Math.max(0, Math.floor(Number(data.grantAtMs ?? 0))),
        };
      }
    // Сервер вернул ok:false с reason — маппим в наш статус (если знаем).
      const reason = String(data?.reason ?? '');
      const known: PromoRedeemStatus[] = ['promo_disabled', 'not_found', 'disabled', 'expired', 'limit_reached', 'already_redeemed', 'bad_reward'];
      return { status: (known as string[]).includes(reason) ? (reason as PromoRedeemStatus) : 'error' };
    } catch {
      return { status: 'error' };
    }
  })().finally(() => {
    promoRedeemInFlight.delete(code);
  });

  promoRedeemInFlight.set(code, request);
  return request;
}
