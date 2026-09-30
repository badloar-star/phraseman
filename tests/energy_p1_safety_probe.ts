import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const bridge = read('app/lingman_youtube.ts');
for (const marker of ['getCurrentTime', 'positionMs: positionMs', 'sampledAtMs: Date.now()', 'setInterval']) {
  assert.ok(bridge.includes(marker), `video bridge marker missing: ${marker}`);
}

const videoCredit = read('app/energy_video_watch_credit.ts');
assert.ok(videoCredit.includes('measureVerifiedPlaybackProgress'), 'verified playback tracker is missing');
assert.ok(videoCredit.includes('highestCreditedPositionMs'), 'client replay high-watermark is missing');
assert.ok(videoCredit.includes('withAccountTransitionLock'), 'video energy write is outside account lock');
assert.ok(videoCredit.includes('ENERGY_PASSIVE_UNIT_MS'), 'video credit cannot preserve passive recovery');
assert.ok(videoCredit.includes('extraEquivalentPassiveMs'), 'video credit stacks a full 10x over passive recovery');

const videoHook = read('hooks/use_video_watch_energy_boost.ts');
assert.ok(videoHook.includes('reportPlaybackSample'), 'player samples do not reach the energy hook');
assert.ok(!videoHook.includes('watchedMs = Math.max(0, Date.now() - creditedAt)'), 'wall-clock playing still mints energy');
assert.ok(videoHook.includes('reportVideoWatchRuneProgress'), 'verified samples do not reach Premium runes');

const serverRunes = read('functions/src/video_watch_runes.ts');
for (const marker of ['action === \'progress\'', 'progressSeq', 'maxCreditedPositionMs', 'session.verifiedMs']) {
  assert.ok(serverRunes.includes(marker), `server verified-progress marker missing: ${marker}`);
}
assert.ok(!serverRunes.includes('observedVideoWatchDuration(session.startedAt, now'), 'claim still credits idle wall time');
const runesClient = read('app/video_watch_runes_client.ts');
const claimStart = runesClient.indexOf('export async function claimVideoWatchRuneSession');
const claimBlock = runesClient.slice(claimStart);
assert.ok(
  claimBlock.indexOf('AsyncStorage.setItem(pendingClaimKey(stableId)')
    < claimBlock.indexOf('flushPendingProgressUnlocked(token, stableId)'),
  'claim intent is not durable before the final progress flush',
);
const startStart = runesClient.indexOf('export async function startVideoWatchRuneSession');
const startEnd = runesClient.indexOf('export async function claimVideoWatchRuneSession', startStart);
const startBlock = runesClient.slice(startStart, startEnd);
assert.ok(startBlock.includes('recoverPendingVideoWatchRuneSessionUnlocked'), 'start does not recover progress then claim before replacement');
assert.ok(!startBlock.includes('multiRemove([pendingProgressKey(stableId), progressCursorKey(stableId)]'), 'start discards durable verified progress');

const refill = read('app/energy_shard_refill.ts');
assert.ok(refill.includes('operationId?: string'), 'refill cannot receive a stable operation id');
assert.ok(refill.includes('operationId,'), 'refill does not bind the debit and visual event to one id');
const noEnergy = read('components/NoEnergyModal.tsx');
// зачем (решение A1, 2026-09-30): кнопка покупки энергии за жемчуг убрана из окна —
// окно больше не должно списывать жемчуг вообще.
assert.ok(!noEnergy.includes('refillEnergyWithShards'), 'NoEnergy modal must not spend pearls after pearl UI retirement');

const season = read('app/season_reward_apply.ts');
assert.ok(season.includes('JSON.stringify({ ...bonus, amount: bonus.capacity })'), 'season battery does not fill active bonus capacity');
const energySystem = read('app/energy_system.ts');
assert.ok(energySystem.includes('JSON.stringify({ ...bonus, amount: bonus.capacity })'), 'full-energy reset does not fill active bonus capacity');

const ledger = read('app/energy_session_operation_ledger.ts');
const legacyReplayBlocks = ledger.match(/compatibleLegacyReplay =[\s\S]{0,180}/g) ?? [];
assert.equal(legacyReplayBlocks.length, 2, 'legacy replay checks missing');
for (const block of legacyReplayBlocks) {
  assert.ok(!block.includes('cost === cost'), 'legacy V1 replay still conflicts with current numeric prices');
}

const animated = read('components/energy/AnimatedEnergyNumber.tsx');
assert.ok(animated.includes('energyVisualTransactions.subscribe'), 'counter does not consume operation stream');
assert.ok(animated.includes('consumedOperationIds'), 'counter does not dedupe operation ids');

const context = read('components/EnergyContext.tsx');
assert.ok(context.includes('settleEnergyAcrossRateSegments'), 'offline recovery does not split at override expiry');
assert.ok(context.includes('buildEnergyRecoveryRateSegments'), 'recovery segment planner missing');
const refillStart = context.indexOf('const refillToMax =');
const refillEnd = context.indexOf('const formattedTime =', refillStart);
const refillBlock = context.slice(refillStart, refillEnd);
assert.ok(refillBlock.indexOf('readBonusEnergyForMutation') > refillBlock.indexOf('withStorageLock'), 'Premium refill reads bonus before storage lock');
assert.ok(refillBlock.indexOf('AsyncStorage.multiSet') > refillBlock.indexOf('readBonusEnergyForMutation'), 'Premium refill write is not atomic with bonus read');
for (const marker of [
  'lastRecoveryRef.current = state.lastSettledAt;',
  'recoveryCreditMicrounitsRef.current = 0;',
  'recoveryDivisionRemainderRef.current = 0;',
  'isUnlimitedRef.current = true;',
  'setEnergy(fullEnergy);',
  'setMaxEnergy(fullEnergy);',
  'setIsUnlimited(true);',
  'bonusRef.current = refilledBonus;',
  'setBonusEnergy(refilledBonus);',
  'setTimeUntilNextMs(0);',
  'setRecoveryEndsAtMs(0);',
]) {
  assert.equal(refillBlock.split(marker).length - 1, 1, `refillToMax state update must occur once: ${marker}`);
}

const popover = read('components/energy/EnergyInfoPopover.tsx');
assert.ok(popover.includes('isUnlimited ? copy.unlimited : heading'), 'unlimited energy label is missing');
assert.ok(!popover.includes('bonusExpiresAt'), 'retired gift-capacity state leaked into the popover');
assert.ok(!popover.includes('copy.gift'), 'retired gift-capacity copy returned');

console.log('ENERGY P1 SAFETY PROBE: PASS');
