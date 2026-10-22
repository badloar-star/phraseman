// ═══════════════════════════════════════════════════════════════════════════
// global_broadcast_settled.ts — решение «звать ли сервер за рассылками» по версии из remote_config/app.
//
// зачем (владелец 22.10, вопрос 27 «сначала безопасные»; карта b94ddc823 п.7): вызов globalBroadcastListActive
// (полное ядро, ≈ 4 чтения) шёл каждый старт, пока на сервере есть хоть одна рассылка. Сервер (1 · Ядро) пишет
// remote_config/app.numbers.global_broadcast_rev — мс последнего изменения рассылок. Если при этой версии проверка уже
// закончилась «показывать нечего» у этого владельца — сервер не зовём до смены версии (страховка — раз в 7 дней).
// Чистая функция без импортов приложения — её проверяет тест без загрузки модуля рассылок.
// ═══════════════════════════════════════════════════════════════════════════

export const GLOBAL_BROADCAST_SETTLED_KEY = 'global_broadcast_settled_v1';
export const GLOBAL_BROADCAST_SETTLED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type GlobalBroadcastSettledRecord = Readonly<{ uid?: unknown; rev?: unknown; at?: unknown }>;

export function decideGlobalBroadcastSettledSkip(input: Readonly<{
  remoteRev: number;
  uid: string;
  settled: GlobalBroadcastSettledRecord | null;
  nowMs: number;
}>): Readonly<{ skip: boolean; reason: string }> {
  if (!(input.remoteRev > 0)) return { skip: false, reason: 'no_remote_rev' };
  const settled = input.settled;
  if (!settled || settled.uid !== input.uid) return { skip: false, reason: 'not_settled_for_owner' };
  if (settled.rev !== input.remoteRev) return { skip: false, reason: 'rev_changed' };
  const age = typeof settled.at === 'number' ? input.nowMs - settled.at : -1;
  if (age < 0 || age >= GLOBAL_BROADCAST_SETTLED_MAX_AGE_MS) return { skip: false, reason: 'max_age' };
  return { skip: true, reason: 'rev_unchanged_settled' };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
