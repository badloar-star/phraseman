import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const context = read('components/EnergyContext.tsx');
const countdownStart = context.indexOf('export function useEnergyCountdown');
const countdownEnd = context.indexOf('// ── Helpers', countdownStart);
const countdown = context.slice(countdownStart, countdownEnd);
assert.ok(countdown.includes('bonusEnergy'), 'countdown ignores the temporary energy pool');
assert.ok(countdown.includes('bonusEnergyCapacity'), 'countdown ignores temporary capacity');
assert.ok(countdown.includes('activeEnergy < activeMaxEnergy'), 'countdown stops at the base cap');
assert.ok(countdown.includes('activeEnergy >= activeMaxEnergy'), 'countdown full-state check stops at the base cap');
assert.ok(
  context.includes('const formattedTime = activeEnergy < activeMaxEnergy && !isUnlimited'),
  'context formattedTime stops at the base cap',
);
assert.ok(!context.includes('складываются до 300'), 'context documents the obsolete absolute 300 cap');

const energySystem = read('app/energy_system.ts');
const maxReaderStart = energySystem.indexOf('async function readLevelAwareBaseMaxEnergy');
const maxReaderEnd = energySystem.indexOf('/**', maxReaderStart);
const maxReader = energySystem.slice(maxReaderStart, maxReaderEnd);
assert.ok(!maxReader.includes('catch'), 'profile-card capacity read silently falls back to 100');
const resetStart = energySystem.indexOf('export async function resetEnergyToMax');
const resetEnd = energySystem.indexOf('/**', resetStart);
const reset = energySystem.slice(resetStart, resetEnd);
assert.ok(reset.includes('withStorageLock(async () =>'), 'resetEnergyToMax writes outside the shared storage mutex');
assert.ok(
  reset.indexOf('AsyncStorage.multiSet(writes)') > reset.indexOf('withStorageLock(async () =>'),
  'resetEnergyToMax does not keep its write inside the shared storage mutex',
);

// зачем (разбор красного 03.10): энергию с Главной 2.0 убрал владелец (01.10) — подсказка, её состояние и значок
// на Главной больше не должны существовать; это охраняет home_v2_no_energy_no_share_owner_2026_10_01.test.ts.
// Прежние три проверки «они на месте» были устаревшей противоположностью и снесены.

// зачем (§99, 03.10): проверки текста подарков энергии (+200 / «до 300») снесены вместе с app/level_gift_system.ts (D09).

// зачем (PM-086, владелец 2026-09-24): components/EnergyCostBadge.tsx удалён
// целиком — ценники энергии убраны со всех кнопок, проверки его формата
// (Premium-гейт, локализация) сторожить больше нечего. Расход энергии
// (EnergyContext) не менялся.

const estimateStart = context.indexOf('export function estimateEnergyFullRecoveryMs');
const estimateEnd = context.indexOf('/**', estimateStart + 10);
const estimateBlock = context.slice(estimateStart, estimateEnd);
assert.ok(estimateStart >= 0, 'future full-energy estimate helper is missing');
assert.ok(estimateBlock.includes('override.expiresAt'), 'full-energy estimate ignores recovery override expiry');
assert.ok(estimateBlock.includes('settleEnergyState'), 'full-energy estimate does not settle chronological rate segments');
const syncStart = context.indexOf('const syncEnergyFullNotification');
const syncEnd = context.indexOf('syncEnergyPushRef.current', syncStart);
const syncBlock = context.slice(syncStart, syncEnd);
assert.ok(syncBlock.includes('overrides: []'), 'retired reward override remains in full-energy notification');
assert.ok(syncBlock.includes('estimateEnergyFullRecoveryMs'), 'notification still projects the current rate forever');

const animatedNumber = read('components/energy/AnimatedEnergyNumber.tsx');
assert.ok(animatedNumber.includes('ENERGY_ACTIVE_CAPACITY_LIMIT'), 'animated counter does not support the 350 active cap');

console.log('ENERGY DEEP AUDIT CONTRACT PROBE: PASS');
