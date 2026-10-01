import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

assert.ok(!existsSync(path.resolve(__dirname, '..', 'functions/src/league_chest.ts')), 'retired league chest server module remains');
assert.ok(!existsSync(path.resolve(__dirname, '..', 'app/services/league_chest_rewards.ts')), 'retired league chest client service remains');
assert.ok(!existsSync(path.resolve(__dirname, '..', 'app/friends_together/weekly_chest_model.ts')), 'retired friends chest client model remains');
const friendsServer = readFileSync(path.resolve(__dirname, '..', 'functions/src/friends_together.ts'), 'utf8');
const functionsIndex = readFileSync(path.resolve(__dirname, '..', 'functions/src/index.ts'), 'utf8');
const friendsScreen = readFileSync(path.resolve(__dirname, '..', 'app/(tabs)/friends.tsx'), 'utf8');
const homeScreen = readFileSync(path.resolve(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8');
assert.ok(!/export const friendsClaimWeeklyChest\b/.test(friendsServer), 'retired friends chest callable remains exported');
assert.ok(!/\bfriendsClaimWeeklyChest\b/.test(functionsIndex), 'retired friends chest remains in deploy entry');
assert.ok(!/\bFriendsChestCard\b|\bclaimWeeklyChest\b/.test(friendsScreen), 'retired friends chest remains in client screen');
assert.ok(!/\bhomeLeagueChest\b|\bgetLeagueChestGoal\b/.test(homeScreen), 'retired league chest remains on Home');
// зачем (PM-170, D78): весь клиент наград «Вместе» удалён, а не оставлен заглушкой.
assert.ok(!existsSync(path.resolve(__dirname, '..', 'app/friends_together/claims_client.ts')), 'retired friends level-claim client remains');
console.log('league and friends chest entry points retired');
