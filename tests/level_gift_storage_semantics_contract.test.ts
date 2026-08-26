import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const giftSource = readFileSync(join(process.cwd(), 'app', 'level_gift_system.ts'), 'utf8');
const bonusSource = readFileSync(join(process.cwd(), 'app', 'bonus_energy_store.ts'), 'utf8');

test('effect receipts bind payload, canonical cosmetic id, gift id and exact handler slot', () => {
  assert.match(giftSource, /LEVEL_GIFT_RECEIPT_PAYLOAD_GIFT_IDS/);
  assert.match(giftSource, /AVATAR_AURAS\.some\(\(aura\) => aura\.id === value\.id\)/);
  assert.match(giftSource, /CUSTOM_AVATARS\.some\(\(avatar\) => avatar\.id === value\.id\)/);
  assert.match(giftSource, /CUSTOM_AVATAR_GRADIENTS\.some\(\(gradient\) => gradient\.id === value\.gradientId\)/);
  assert.match(giftSource, /Object\.prototype\.hasOwnProperty\.call\(THEME_DISPLAY_NAMES, value\.id\)/);
  assert.match(giftSource, /isLevelGiftEffectReceiptForOccurrence/);
  assert.match(giftSource, /const levelGiftEffectReceiptSlot/);
  assert.match(giftSource, /hasOwnProperty\.call\(value, 'aura'\)[\s\S]*return 'aura'/);
  assert.match(giftSource, /hasOwnProperty\.call\(value, 'theme'\)[\s\S]*return 'theme'/);
  assert.match(giftSource, /hasOwnProperty\.call\(value, 'customAvatar'\)[\s\S]*return 'custom_avatar'/);
  assert.match(giftSource, /return 'primary'/);
  assert.match(giftSource, /levelGiftEffectReceiptSlot\(value\)/);
  assert.match(giftSource, /}, 'aura'\);/);
  assert.match(giftSource, /}, 'theme'\);/);
  assert.match(giftSource, /}, 'custom_avatar'\);/);
});

test('expired mutation reads are non-mutating and fallback bonus grants share the account lock', () => {
  const mutationRead = bonusSource.match(
    /export async function readBonusEnergyForMutation[\s\S]*?\n}\n/,
  )?.[0] ?? '';
  assert.match(mutationRead, /inspected\.status === 'expired'[\s\S]*return null/);
  assert.doesNotMatch(mutationRead, /removeGiftAccountValue/);

  const fallbackGrant = giftSource.match(
    /const applyEnergyBonusN[\s\S]*?\n};\n/,
  )?.[0] ?? '';
  assert.match(fallbackGrant, /withAccountTransitionLock/);
  assert.match(fallbackGrant, /opts\?\.accountTransitionLockLease/);
});
