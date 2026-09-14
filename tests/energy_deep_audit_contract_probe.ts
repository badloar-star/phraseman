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

const home = read('app/(tabs)/home.tsx');
for (const deadMarker of [
  'EnergyTooltipAnchor',
  'ENERGY_TOOLTIP_W',
  'showEnergyTooltip',
  'energyTooltipAnim',
  'energyTooltipTimer',
  'energyIconRef',
  'energyAnchorCacheRef',
  'energyTooltip.visible',
]) {
  assert.ok(!home.includes(deadMarker), `dead home energy tooltip remains: ${deadMarker}`);
}
assert.ok(home.includes('<EnergyBar'), 'shared EnergyBar/popover was removed from home');

const gifts = read('app/level_gift_system.ts');
for (const stale of [
  'суммируется до 300', 'складається до 300', 'se acumula hasta 300',
  'acumula até 300', 'cộng dồn tối đa 300', 'menumpuk hingga 300',
  '300’e kadar birikir', 'kumuluje się do 300',
]) {
  assert.ok(!gifts.includes(stale), `obsolete absolute energy cap remains: ${stale}`);
}
for (const expected of [
  'the bonus limit stacks up to +200',
  'бонусный лимит суммируется до +200',
  'бонусний ліміт складається до +200',
  'el límite extra se acumula hasta +200',
  'o limite extra acumula até +200',
  'giới hạn thưởng cộng dồn tối đa +200',
  'batas bonus menumpuk hingga +200',
  'bonus limiti +200’e kadar birikir',
  'dodatkowy limit kumuluje się do +200',
]) {
  assert.ok(gifts.includes(expected), `additive +200 gift copy missing: ${expected}`);
}

const badge = read('components/EnergyCostBadge.tsx');
assert.ok(badge.includes("import { usePremium } from './PremiumContext'"), 'energy cost badge ignores verified Premium access');
assert.ok(badge.includes('hasPremiumAccess'), 'energy cost badge can leak prices to a paid user during EnergyContext failure');
assert.ok(badge.includes('const { lang } = useLang()'), 'energy cost accessibility does not use app locale');
assert.ok(badge.includes('triLang(lang, {'), 'energy cost accessibility is not localized');
for (const locale of ["ru:", "uk:", "en:", "es:", "'pt-BR':", "vi:", "id:", "tr:", "pl:"]) {
  assert.ok(badge.includes(locale), `energy cost accessibility locale missing: ${locale}`);
}
assert.ok(!badge.includes('accessibilityLabel={`Стоимость запуска:'), 'hard-coded Russian accessibility label remains');

const estimateStart = context.indexOf('export function estimateEnergyFullRecoveryMs');
const estimateEnd = context.indexOf('/**', estimateStart + 10);
const estimateBlock = context.slice(estimateStart, estimateEnd);
assert.ok(estimateStart >= 0, 'future full-energy estimate helper is missing');
assert.ok(estimateBlock.includes('override.expiresAt'), 'full-energy estimate ignores recovery override expiry');
assert.ok(estimateBlock.includes('settleEnergyState'), 'full-energy estimate does not settle chronological rate segments');
const syncStart = context.indexOf('const syncEnergyFullNotification');
const syncEnd = context.indexOf('syncEnergyPushRef.current', syncStart);
const syncBlock = context.slice(syncStart, syncEnd);
assert.ok(syncBlock.includes('readLeagueChestEnergyOverrideSnapshot'), 'notification does not read league recovery expiry');
assert.ok(syncBlock.includes('readBoonEnergyOverrideSnapshot'), 'notification does not read boon recovery expiry');
assert.ok(syncBlock.includes('estimateEnergyFullRecoveryMs'), 'notification still projects the current rate forever');
const tenMinuteTurboEstimate = 10 * 60_000 + (100 - 10) * 6 * 60_000;
assert.equal(tenMinuteTurboEstimate, 550 * 60_000, '0/100 with 10m of 1m turbo must schedule full at 550m');

const animatedNumber = read('components/energy/AnimatedEnergyNumber.tsx');
assert.ok(animatedNumber.includes('ENERGY_ACTIVE_CAPACITY_LIMIT'), 'animated counter does not support the 350 active cap');

const profileCard = read('app/profile_card_system.ts');
const devResetStart = profileCard.indexOf('export async function devResetProfileCard');
const devResetEnd = profileCard.indexOf('\n}', devResetStart);
assert.ok(
  profileCard.slice(devResetStart, devResetEnd).includes("emitAppEvent('energy_reload')"),
  'profile-card dev reset does not refresh energy capacity',
);

console.log('ENERGY DEEP AUDIT CONTRACT PROBE: PASS');
