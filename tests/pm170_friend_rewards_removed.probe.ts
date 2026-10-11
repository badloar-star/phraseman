// PM-170 — сторож: награды «Вместе» (сундук, подарки, квесты, звёзды за уровни) удалены из кода,
// а не оставлены заглушками (D78). Привет («Позвать») и добавление друзей от них не зависят.
// Запуск: npx tsx tests/pm170_friend_rewards_removed.probe.ts
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

// Клиент: файл клейма и награды за уровни — удалены.
assert.ok(!existsSync(path.join(root, 'app/friends_together/claims_client.ts')), 'claims_client.ts вернулся');
const days = read('app/friends_together/together_days.ts');
const store = read('app/friends_together/together_store.ts');
for (const sym of ['STAR_REWARD_BY_LEVEL', 'starRewardForLevel', 'friendGiftCostForLevel', 'BONUS_PERCENT_BY_LEVEL', 'bonusPercentForLevel']) {
  assert.ok(!days.includes(sym), `together_days.ts: вернулся ${sym}`);
}
for (const sym of ['markFriendLevelClaimedLocally', 'claimedLevel', 'bonusPercent', 'friends_together_bonus_v1']) {
  assert.ok(!store.includes(sym), `together_store.ts: вернулся ${sym}`);
}

// Сервер: callable клейма, звёзды за уровни и правило сундука — удалены; «Позвать» жив.
const server = read('functions/src/friends_together.ts');
const core = read('functions/src/friends_together_core.ts');
const index = read('functions/src/index.ts');
const rules = read('firestore.rules');
assert.ok(!/friendsTogetherClaimLevel/.test(server + index), 'friendsTogetherClaimLevel вернулся');
assert.ok(!/starsForLevel|bonusPercentForLevel|LEVEL_STAR_REWARDS/.test(core), 'награды за уровни вернулись в core');
// зачем (координатор 11.10): чтение клейма сундука оставлено для клиентов 1.6.x до min_app_version >= 2.0 —
// только чтение владельцем; запись клиенту по-прежнему запрещена, серверной выдачи нет.
const chestRule = /match \/users\/\{userId\}\/friends_chest_claims\/\{weekKey\} \{([^}]*)\}/.exec(rules);
assert.ok(chestRule, 'правило чтения friends_chest_claims для 1.6.x пропало до min_app_version >= 2.0');
assert.match(chestRule[1], /allow read: if canonicalUserMatchesAuth\(userId\);/, 'friends_chest_claims: читать может только владелец');
assert.match(chestRule[1], /allow write: if false;/, 'friends_chest_claims: клиентская запись запрещена');
assert.equal((rules.match(/friends_chest_claims\/\{/g) ?? []).length, 1, 'friends_chest_claims: ровно один блок');
assert.ok(/export const friendsNudge\b/.test(server), 'friendsNudge («Позвать») пропал');
assert.ok(/export \{ friendsNudge \} from "\.\/friends_together"/.test(index), 'friendsNudge не экспортирован');

console.log('PM-170 FRIEND REWARDS REMOVED: PASS');
