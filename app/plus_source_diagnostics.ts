// plus_source_diagnostics.ts — [PLUS-SOURCE]: откуда приложение взяло решение «есть Plus / нет Plus» и что решило окно покупки.
//
// зачем (жалоба №8, координатор 28.10): в отчёте Plus=true, а в цепочке purchase:no_entitlement — по журналу нельзя было понять,
// чей это Plus (магазин / VIP — так приходит оплата через Telegram-бот / пробный доступ / подарок / облако) и почему открылось окно
// покупки. console.* кроме warn/error в прод-сборке вырезается, поэтому итог пишем событием журнала обращений (feature_action):
//   plus:src:<источник>:p<0|1>                       — итог полной проверки доступа (premium_guard), одно событие на смену
//   plus:paywall:<решение>:<откуда>:p<0|1>:c<кэш>     — решение окна покупки (premium_modal): show / dismiss / wait
// Только закрытые значения: ни id, ни плана, ни сумм. Формат держит белый список сервера (^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$).
import { recordSupportDiagnostic } from './support_diagnostics';

export type PlusSource =
  | 'tester_off'      // тестерский выключатель «Снять премиум»
  | 'tester_on'       // тестерский «без лимитов»
  | 'store'           // магазин (RevenueCat) или удержание переноса Plus
  | 'vip'             // VIP: промокод (в т.ч. оплата через Telegram-бот), админ-выдача
  | 'intro'           // пробный полный доступ
  | 'gift_local'      // проверенная копия подарка лояльности
  | 'gift_cloud'      // подарок лояльности из облака
  | 'cloud_store'     // после облачного восстановления: магазин
  | 'cloud_vip'       // после облачного восстановления: VIP
  | 'cloud_gift'      // после облачного восстановления: подарок
  | 'none'            // нигде нет, облако подтвердило
  | 'none_fast'       // «нет» без облака (строгая/быстрая проверка, не кэшируется)
  | 'none_unconfirmed'; // «нет», облако не подтвердило (не кэшируется)

export type PaywallEntryDecision = 'show' | 'dismiss' | 'wait' | 'manage' | 'none';
export type PaywallAccessFrom = 'live' | 'wait' | 'ceiling_cache';
export type PaywallCachedEntitlement = 'premium' | 'free' | 'unknown';

const flag = (value: boolean): string => (value ? '1' : '0');

export function plusSourceAction(source: PlusSource, access: boolean): string {
  return `plus:src:${source}:p${flag(access)}`;
}

export function plusPaywallAction(
  decision: PaywallEntryDecision,
  accessFrom: PaywallAccessFrom,
  hasPremiumAccess: boolean,
  cached: PaywallCachedEntitlement,
): string {
  return `plus:paywall:${decision}:${accessFrom}:p${flag(hasPremiumAccess)}:c${cached}`;
}

let lastSourceAction = '';

/** Итог полной проверки доступа. Пишется только при смене (проверка зовётся часто — журнал не засоряем). */
export function notePlusSource(source: PlusSource, access: boolean, nowMs: number = Date.now()): void {
  const action = plusSourceAction(source, access);
  if (action === lastSourceAction) return; // зачем: тот же итог уже записан
  lastSourceAction = action;
  console.warn('[PLUS-SOURCE] access', action); // guard-ok: одна строка на смену итога; warn — переживает прод-сборку
  void recordSupportDiagnostic({ event: 'feature_action', action, result: 'info', subject: 'app', atMs: nowMs }).catch((error: unknown) => {
    console.warn('[PLUS-SOURCE] запись в журнал не удалась', error instanceof Error ? error.message : String(error));
  });
}

/** Решение окна покупки — вызывается диспетчером один раз на смену решения. */
export function notePlusPaywallDecision(
  decision: PaywallEntryDecision,
  accessFrom: PaywallAccessFrom,
  hasPremiumAccess: boolean,
  cached: PaywallCachedEntitlement,
  nowMs: number = Date.now(),
): void {
  const action = plusPaywallAction(decision, accessFrom, hasPremiumAccess, cached);
  console.warn('[PLUS-SOURCE] paywall', action); // guard-ok: одна строка на смену решения окна
  void recordSupportDiagnostic({
    event: 'feature_action', action, screen: '/premium_modal', result: decision === 'show' ? 'blocked' : 'info', subject: 'app', atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn('[PLUS-SOURCE] запись в журнал не удалась', error instanceof Error ? error.message : String(error));
  });
}

/** Только для тестов: сбросить дедуп. */
export function resetPlusSourceDiagnosticsForTests(): void {
  lastSourceAction = '';
}

export default function __RouteShim() { return null; }
