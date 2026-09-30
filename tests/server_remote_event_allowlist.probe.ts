import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'index.ts'), 'utf8');
const roulettePolicy = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'referral_roulette_policy.ts'), 'utf8');
const referralAdmin = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'admin_referrals.ts'), 'utf8');
const retiredExports = [
  'leagueJoinOrUpdateGroup', 'leagueUpdateMyMember', 'leagueSyncMyBoost',
  'leagueChestClaim', 'leagueFinalizeCron', 'leagueResidentsTickCron',
  'computeLeaderboardStatsCron', 'resetWeeklyXpCron',
  'authorizeLearningV2CourseUnlock', 'resolveLearningV2CourseUnlockReceipt',
];
for (const name of retiredExports) {
  assert.doesNotMatch(source, new RegExp(`export const ${name}\\b`, 'u'), `${name} remains exported`);
}
for (const token of ['leagueFinalize', 'resetWeeklyXp', 'seasonPass', 'xp_boost', 'max_voice', 'pearls_to_coins', 'gifts_to_coins']) {
  assert.doesNotMatch(source, new RegExp(token, 'iu'), `retired remote-event token remains: ${token}`);
}
assert.match(source, /cleanupExpiredAppMessagesCron/u);
assert.match(source, /reEngagePushCron/u);
assert.match(source, /premiumExpiryReminderCron/u);
assert.match(source, /progressSubmitEvent/u);
assert.match(source, /revenueCatShardsWebhook/u);
// зачем: D80/D99 (владелец, 2026-09-30) — реферальная рулетка ЖИВА. Прежняя
// проверка «рулетка навсегда выключена» (PM-202) отменена решением владельца:
// теперь сторож держит обратное — флаги читаются из «Пульта», админские
// переключатели настоящие, серверные спины экспортированы, dev-выдачи нет (D78).
assert.match(roulettePolicy, /softEnabled:\s*numbers\?\.referral_roulette_enabled !== false/u, 'referral roulette soft flag must follow remote config (D99)');
assert.match(roulettePolicy, /emergencyStop:\s*numbers\?\.referral_roulette_emergency_stop === true/u, 'referral roulette emergency stop must follow remote config (D99)');
for (const name of ['adminSetSpinWeights', 'adminSetReferralRouletteEnabled', 'adminSetReferralRouletteEmergencyStop']) {
  const start = referralAdmin.indexOf(`export const ${name}`);
  assert.ok(start >= 0, `${name} must exist (D99)`);
  const body = referralAdmin.slice(start, referralAdmin.indexOf('\n});', start));
  assert.doesNotMatch(body, /referral_roulette_retired/u, `${name} is a tombstone again (D99)`);
  assert.match(body, /assertAdmin\(request\)/u, `${name} lost its admin gate`);
  assert.match(source, new RegExp(`\\b${name},`, 'u'), `${name} is not exported (D99)`);
}
for (const name of ['referralSpin', 'referralClaimSpin']) {
  assert.ok(source.includes(`export { ${name} }`), `${name} is not exported (D99)`);
}
assert.doesNotMatch(source, /export \{ referralDevGrantSpin \}/u, 'referralDevGrantSpin must stay removed (D78)');
console.log('SERVER REMOTE EVENT ALLOWLIST: PASS');
