// Считает значение для remote config rank_gates_force_new_uid_hash по uid аккаунта (та же функция, что app/rank_gate_uid_hash.ts: FNV-1a 32-бит по UTF-8, & 0x7fffffff, 0 → 1).
// Запуск: node scripts/rank_gate_uid_hash.mjs <stableUid>   → печатает число; его выставляет Ядро в боевом remote config (bools/numbers → numbers.rank_gates_force_new_uid_hash).
const uid = process.argv[2];
if (!uid) { console.error('usage: node scripts/rank_gate_uid_hash.mjs <stableUid>'); process.exit(2); }
let h = 0x811c9dc5;
for (const b of Buffer.from(uid, 'utf8')) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
const value = h & 0x7fffffff;
console.log(value === 0 ? 1 : value);
