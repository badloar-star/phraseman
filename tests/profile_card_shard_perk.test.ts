import fs from 'fs';
import path from 'path';
import { PROFILE_CARD_SHARD_BOOST, profileCardShardMultiplier } from '../app/profile_card_system';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/shards_system', () => ({
  getShardsBalance: jest.fn(),
  spendShards: jest.fn(),
  forceSyncShardsToCloud: jest.fn(async () => {}),
}));
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: false,
  IS_EXPO_GO: true,
}));

describe('profileCardShardMultiplier — Фаза 2: +5% осколков за карточку IV+', () => {
  it('pins the shard boost constant to ×1.05', () => {
    expect(PROFILE_CARD_SHARD_BOOST).toBe(1.05);
  });

  it('is neutral below level IV and ×1.05 for levels IV…V', () => {
    expect(profileCardShardMultiplier(0)).toBe(1);
    expect(profileCardShardMultiplier(1)).toBe(1);
    expect(profileCardShardMultiplier(2)).toBe(1);
    expect(profileCardShardMultiplier(3)).toBe(1);
    expect(profileCardShardMultiplier(4)).toBe(1.05);
    expect(profileCardShardMultiplier(5)).toBe(1.05);
  });
});

describe('shards_system — точка применения и округление (source contract)', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', 'shards_system.ts'), 'utf8');

  it('reads the card level through the storage-key pattern at level IV+, without importing profile_card_system', () => {
    expect(source).toContain("AsyncStorage.getItem('profile_card_level')");
    expect(source).toContain("parseInt(raw || '0') >= 4 ? 1.05 : 1");
    expect(source).not.toMatch(/from '\.\/profile_card_system'/);
  });

  it('applies the perk in all three earn funnels (addShards, addShardsRaw, awardOneTime)', () => {
    expect(source.match(/profileCardShardBonus\(amount, perkM\)/g)).toHaveLength(3);
  });

  it('rounds the bonus part up (Math.ceil) with a guaranteed +1 minimum on any base > 0', () => {
    expect(source).toContain('Math.ceil(baseAmount * (perkM - 1))');
    // ceil(x * 0.05) при x > 0 всегда ≥ 1 — фиксируем формулу Фазы 2:
    // base 1 → +1, 2 → +1, 3 → +1, 5 → +1, 20 → +1, 21 → +2, 40 → +2.
    const bonus = (base: number) => Math.ceil(base * 0.05);
    expect([1, 2, 3, 5, 20].map(bonus)).toEqual([1, 1, 1, 1, 1]);
    expect(bonus(21)).toBe(2);
    expect(bonus(40)).toBe(2);
  });

  it('excludes purchases, wagers, refunds and compensations from the perk', () => {
    for (const reason of [
      'shards_store_purchase',
      'streak_wager_win',
      'club_boost_refund',
      'release_wave_bonus',
      'global_broadcast_modal',
    ]) {
      expect(source).toContain(`'${reason}',`);
    }
    expect(source).not.toContain('arena_match_wager_win');
    expect(source).toContain('PROFILE_CARD_PERK_EXCLUDED_REASONS.has(logReason)');
  });

  it('passes the bonus part to the shards_earned event as an optional field', () => {
    expect(source.match(/bonus: perkBonus/g)).toHaveLength(7);
    expect(source).toContain('amount: totalAmount, ...(perkBonus > 0 ? { bonus: perkBonus } : {})');
  });

  it('does not touch the spend path', () => {
    const spendIdx = source.indexOf('export const spendShardsIdempotent');
    const awardIdx = source.indexOf('export const awardOneTime');
    expect(source.slice(spendIdx, awardIdx)).not.toContain('totalAmount');
  });
});

describe('Показ бонуса юзеру (source contract)', () => {
  const host = fs.readFileSync(path.join(process.cwd(), 'components', 'GlobalShardsEarnedHost.tsx'), 'utf8');
  const lesson = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_complete.tsx'), 'utf8');
  const events = fs.readFileSync(path.join(process.cwd(), 'app', 'events.ts'), 'utf8');

  it('types the optional bonus field on the shards_earned event', () => {
    expect(events).toContain('bonus?: number;');
  });

  it('shows the card bonus segment in the global earn toast, localized into 8 languages', () => {
    expect(host).toContain('CARD_BONUS_WORD');
    expect(host).toContain('p.bonus');
    for (const seg of [
      '`карточка +${n}`',
      '`картка +${n}`',
      '`tarjeta +${n}`',
      '`cartão +${n}`',
      '`thẻ +${n}`',
      '`kartu +${n}`',
      '`kart +${n}`',
      '`karta +${n}`',
    ]) {
      expect(host).toContain(seg);
    }
  });

  it('aggregates the perk bonus into the lesson batch toast with the same per-source formula', () => {
    expect(lesson).toContain('profileCardShardMultiplier(');
    expect(lesson).toContain('perkBonusTotal');
    expect(lesson).toContain('Math.ceil((SHARD_REWARDS[k] ?? 0) * (shardPerkM - 1))');
    expect(lesson).toContain('{ amount: total, ...(perkBonusTotal > 0 ? { bonus: perkBonusTotal } : {}), reasonText }');
  });
});
