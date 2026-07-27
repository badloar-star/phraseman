// ═══════════════════════════════════════════════════════════════════════════
// ДЕВ-НАЧИСЛЕНИЕ ЖЕМЧУЖИН НА СЕРВЕР
//
// зачем 2026-07-27 (владелец: «не хватает жемчужин, я в дев добавил 500, они
// ОБЯЗАНЫ быть валидны»): дев-кнопка магазина писала баланс ТОЛЬКО в телефон
// (addShardsRaw + skipServerAwait). Серверная запись шла через shardsApplyDelta,
// а тот сверяет причину и сумму с каталогом shard_reward_catalog — каталог
// намеренно обнулён и причины 'shards_store_purchase' в нём нет вовсе, поэтому
// сервер отклонял начисление. Локальный баланс показывал 500, серверный
// оставался прежним — и турнир, который читает users/{uid}.shards, честно
// отвечал not_enough_gems.
//
// Каталог НЕ расширяем: он защищает экономику от накрутки для всех
// пользователей. Вместо этого зовём adminGrantReward — существующую
// админ-функцию, которая пишет баланс легально, идемпотентно и с записью в
// аудит. Она требует claim admin: true в токене, поэтому обычный пользователь
// с дев-сборкой ничего себе не начислит: сервер откажет.
// ═══════════════════════════════════════════════════════════════════════════

import { DebugLogger } from './debug-logger';
import { getCanonicalUserId } from './user_id_policy';

/** Регион админских callable — тот же, что у остальных прод-функций. */
const ADMIN_FUNCTIONS_REGION = 'us-central1';

export type DevShardsGrantResult =
  /** granted — сколько сервер реально начислил (он же источник правды). */
  | { ok: true; granted: number }
  | { ok: false; reason: 'no_user' | 'not_admin' | 'failed' };

/**
 * Начисляет жемчужины на СЕРВЕР через админскую функцию.
 *
 * Идемпотентность: ключ операции содержит метку времени и uid, поэтому повтор
 * нажатия создаёт новую операцию (это осознанно — дев-кнопка должна начислять
 * каждый раз), а сетевой ретрай одного и того же вызова — нет.
 *
 * Стоимость: один вызов функции на нажатие дев-кнопки. В релизной сборке путь
 * не используется вовсе (вызывается только под isDevStoreBypass).
 */
export async function grantShardsOnServerForDev(amount: number): Promise<DevShardsGrantResult> {
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: 'failed' };

  const uid = await getCanonicalUserId();
  if (!uid) return { ok: false, reason: 'no_user' };

  try {
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
      getFunctions: (...args: unknown[]) => unknown;
      httpsCallable: (
        fns: unknown,
        name: string,
      ) => (data: unknown) => Promise<{ data: { amount?: number } }>;
    };
    const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
    const call = httpsCallable(getFunctions(getApp(), ADMIN_FUNCTIONS_REGION), 'adminGrantReward');

    // Ключи обязаны пройти TOKEN_RE на сервере — только буквы, цифры, дефис и
    // подчёркивание. Метка времени делает каждое нажатие отдельной операцией.
    const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const result = await call({
      uid,
      type: 'shards',
      amount,
      reason: 'dev_store_bypass_grant',
      comment: 'DEV: начисление из магазина',
      idempotencyKey: `dev_grant_${stamp}`,
      requestId: `dev_req_${stamp}`,
    });
    return { ok: true, granted: Number(result.data?.amount ?? amount) };
  } catch (error) {
    const code = String((error as { code?: string })?.code ?? '');
    const message = String((error as { message?: string })?.message ?? '');
    // Нет админской роли — это НЕ поломка: обычный дев-билд без claim просто не
    // может начислять на сервер. Отличаем от настоящей ошибки, чтобы экран
    // сказал внятное, а не «попробуйте ещё раз».
    if (code.includes('permission-denied') || message.includes('Admin role required')) {
      return { ok: false, reason: 'not_admin' };
    }
    DebugLogger.error('dev_shards_grant:grantShardsOnServerForDev', error, 'warning');
    return { ok: false, reason: 'failed' };
  }
}
