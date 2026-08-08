// ═══════════════════════════════════════════════════════════════════════════
// ДЕВ-НАЧИСЛЕНИЕ ЖЕМЧУЖИН — КЛИЕНТСКАЯ СТОРОНА
//
// ЖЕЛЕЗНОЕ ПРАВИЛО ВЛАДЕЛЬЦА (2026-07-27, дословно): «когда я в дев режиме —
// начисление на ЛЮБОЙ аккаунт через дев ВСЕГДА админское и ВСЕГДА идёт на
// сервер». Закреплено контрактным тестом tests/dev_shards_grant_contract.test.ts
// — менять нельзя без решения владельца.
//
// Из правила следуют три требования, и все три проверяются тестом:
//   1. дев-начисление ОБЯЗАНО звать сервер (devShardsGrant), а не только писать
//      в телефон — иначе турнир и другие серверные проверки баланса жемчужин
//      не увидят (именно из-за этого «500 в деве» давали not_enough_gems);
//   2. НЕТ проверки админ-роли на клиенте — правило говорит «на ЛЮБОЙ аккаунт»;
//   3. отказ сервера НЕ проглатывается молча — экран обязан сказать правду,
//      иначе владелец снова упрётся в турнир и будет искать поломку не там.
//
// Гейт безопасности живёт на СЕРВЕРЕ (remote_config/app.numbers
// .dev_shards_grant_enabled, по умолчанию выключен), а не здесь: клиентский
// флаг подделывается, серверный — нет.
// ═══════════════════════════════════════════════════════════════════════════

import { DebugLogger } from './debug-logger';

/** Регион прод-callable — тот же, что у shardsApplyDelta. */
const FUNCTIONS_REGION = 'us-central1';

export type DevShardsGrantResult =
  /** balance — серверный баланс ПОСЛЕ начисления (он же источник правды). */
  | { ok: true; balance: number; granted: number }
  /**
   * disabled — серверный рубильник выключен (штатное состояние прода).
   * failed — сеть/сервер не ответили.
   */
  | { ok: false; reason: 'disabled' | 'failed' };

/** opId делает вызов идемпотентным: сетевой ретрай не удвоит начисление. */
function newDevGrantOpId(): string {
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `devgrant_${Date.now().toString(36)}_${random}`;
}

/**
 * Начисляет жемчужины НА СЕРВЕР. Работает для любого авторизованного аккаунта
 * — админ-роль не требуется и НЕ проверяется (правило владельца).
 *
 * Стоимость: один вызов функции на нажатие дев-кнопки. В проде серверный
 * рубильник выключен, поэтому вызов сразу отклоняется без записей.
 */
export async function grantShardsOnServerForDev(amount: number): Promise<DevShardsGrantResult> {
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: 'failed' };

  try {
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions') as {
      getFunctions: (...args: unknown[]) => unknown;
      httpsCallable: (
        fns: unknown,
        name: string,
      ) => (data: unknown) => Promise<{ data: { balance?: number; granted?: number } }>;
    };
    const { getApp } = require('@react-native-firebase/app') as { getApp: () => unknown };
    const call = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'devShardsGrant');
    const result = await call({ amount, opId: newDevGrantOpId() });
    return {
      ok: true,
      balance: Number(result.data?.balance ?? 0),
      granted: Number(result.data?.granted ?? amount),
    };
  } catch (error) {
    const message = String((error as { message?: string })?.message ?? '');
    // Рубильник выключен — это НЕ поломка, а штатное состояние прод-проекта.
    if (message.includes('dev_shards_grant_disabled')) return { ok: false, reason: 'disabled' };
    DebugLogger.error('dev_shards_grant:grantShardsOnServerForDev', error, 'warning');
    return { ok: false, reason: 'failed' };
  }
}
