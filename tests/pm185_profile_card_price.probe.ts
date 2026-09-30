import { readFileSync } from 'node:fs';

const source = readFileSync('app/profile_card_system.ts', 'utf8');
if (!source.includes('PROFILE_CARD_UPGRADE_PRICE_COINS = 10_000')) {
  throw new Error('PM-185 profile-card price contract missing');
}
if (source.includes('profileCardUpgrade')) throw new Error('retired server purchase callable leaked into profile-card system');
console.log('PM-185 PROFILE CARD PRICE: PASS');
