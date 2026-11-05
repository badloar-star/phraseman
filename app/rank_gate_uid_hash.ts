// rank_gate_uid_hash.ts — стабильный 31-битный хэш uid для списка «принудительно новых» в remote config (числовой ключ rank_gates_force_new_uid_hash).
// зачем (владелец 05.11 07:1x: «принудительно новый для моего аккаунта»; координатор): remote config у нас только bools/numbers, строки uid в конфиге не хранятся — в нём лежит ЧИСЛО.
// Алгоритм — FNV-1a 32-бит по UTF-8 байтам uid, старший бит отброшен (результат 1…2147483647; 0 зарезервирован как «выключено»). ТОЛЬКО эта функция считает хэш:
// скрипт scripts/rank_gate_uid_hash.mjs — её копия для Ядра (тест tests/rank_gate_force_new_2026_11_05.test.ts сверяет оба).
export function rankGateUidHash(uid: string): number {
  let h = 0x811c9dc5;
  const bytes = typeof TextEncoder !== 'undefined' ? Array.from(new TextEncoder().encode(uid)) : Array.from(unescape(encodeURIComponent(uid)), (c) => c.charCodeAt(0));
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const value = h & 0x7fffffff;
  return value === 0 ? 1 : value;
}

/** Принудительно ли аккаунт «новый» по значению числового ключа remote config (0 — выключено). */
export function isRankGateForcedNew(uid: string | null, forceHash: number): boolean {
  return forceHash > 0 && uid !== null && uid.length > 0 && rankGateUidHash(uid) === forceHash;
}

/** Модуль в app/ — не экран. */
export default function __RouteShim() { return null; }
