import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// зачем (PM-055-A1): множители/бусты XP удалены целиком. Их имена допустимы только в файлах,
// которые ЧИТАЮТ историю и закрывают её безопасной заменой (shards_6 / rewardType 'none').
// Любое новое упоминание вне allowlist — это возможный новый producer/UI/кеш/уведомление.
const root = path.resolve(__dirname, '..');
const TOKEN = /xp_?boost|xpmultiplier|xp_multiplier|double_?xp|xp_2x|boost_?xp|xp_bank/i;
const COMPAT_ONLY = new Set([
  'app/level_spin_local_contract.ts', // старые квитанции спина → shards_6
  'modules/phone-state/domains/economy.ts', // старые списания рун читаются как история
  'functions/src/global_broadcast_claim.ts', // старый rewardType → 'none'
  // зачем (01.10, миграция подарков в монеты Q12): ниже — только чтение/стирание старого, не новый источник XP.
  'app/retired_account_local_keys.ts', // тот же список старых ключей, вынесен из cloud_sync (440447f59/bd53e2409)
  'functions/src/accounts_v2_migration/inventory.ts', // опись старых полей для переноса аккаунта
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|probe)\.tsx?$/.test(entry.name) ? [full] : [];
  });
}
const offenders: string[] = [];
const seenCompat = new Set<string>();
let scanned = 0;
for (const dir of ['app', 'components', 'modules', 'hooks', 'functions/src']) {
  for (const file of walk(path.join(root, dir))) {
    scanned += 1;
    const rel = path.relative(root, file).split(path.sep).join('/');
    const hit = fs.readFileSync(file, 'utf8').split(/\r?\n/).some((line) => TOKEN.test(line.replace(/\/\/.*$/, '')));
    if (!hit) continue;
    if (COMPAT_ONLY.has(rel)) seenCompat.add(rel);
    else offenders.push(rel);
  }
}
assert.ok(scanned > 800, `scanned only ${scanned} files`);
assert.deepEqual(offenders, [], `XP boost/multiplier tokens outside compat allowlist: ${offenders.join(', ')}`);
console.log(`xp_boost_tokens_compat_only: PASS (${scanned} files; compat-only hits in ${seenCompat.size}/${COMPAT_ONLY.size} allowlisted files)`);
