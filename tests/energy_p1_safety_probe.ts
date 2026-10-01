import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const bridge = read('app/lingman_youtube.ts');
for (const marker of ['getCurrentTime', 'positionMs: positionMs', 'sampledAtMs: Date.now()', 'setInterval']) {
  assert.ok(bridge.includes(marker), `video bridge marker missing: ${marker}`);
}

// зачем: Q9 — видео не источник монет (список D104/D105/D109)
for (const removed of [
  'app/energy_video_watch_credit.ts',
  'hooks/use_video_watch_energy_boost.ts',
  'app/video_watch_runes_client.ts',
]) {
  assert.ok(!fs.existsSync(path.join(process.cwd(), removed)), `retired video reward source returned: ${removed}`);
}
const videoPlayer = read('components/youtube/YoutubeInlinePlayer.tsx');
assert.ok(
  !/from ['"][^'"]*(use_video_watch_energy_boost|video_watch_runes_client|energy_video_watch_credit)['"]/.test(videoPlayer),
  'video player must not mint energy or runes for watching',
);

const serverRunes = read('functions/src/video_watch_runes.ts');
for (const marker of ['action === \'progress\'', 'progressSeq', 'maxCreditedPositionMs', 'session.verifiedMs']) {
  assert.ok(serverRunes.includes(marker), `server verified-progress marker missing: ${marker}`);
}
assert.ok(!serverRunes.includes('observedVideoWatchDuration(session.startedAt, now'), 'claim still credits idle wall time');

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
