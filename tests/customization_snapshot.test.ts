import fs from 'fs';
import path from 'path';
import {
  buildCustomizationSnapshot,
  customizationSnapshotsEqual,
} from '../app/customization_snapshot';

describe('customization snapshot', () => {
  it('preserves explicit none and valid owned maps', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['user_avatar', 'custom:custom-01:violet:black'],
      ['user_avatar_aura', 'none'],
      ['user_total_xp', '1250'],
      ['shards_balance', '44'],
      ['custom_avatar_owned_v1', JSON.stringify({ 'custom-01': 'violet:black' })],
      ['avatar_aura_owned_v1', JSON.stringify({ 'aura-aurora': true, bad: false })],
      ['custom_avatar_gift_owned_v1', 'custom-61'],
      ['avatar_aura_gift_owned_v1', 'aura-nimbus'],
    ]), 100, 18);

    expect(snapshot.storedAuraSelection).toBe('none');
    expect(snapshot.shards).toBe(44);
    expect(snapshot.ownedAvatars).toEqual({ 'custom-01': 'violet:black' });
    expect(snapshot.ownedAuras).toEqual({ 'aura-aurora': true });
    expect(snapshot.giftedAvatarId).toBe('custom-61');
    expect(snapshot.giftedAuraId).toBe('aura-nimbus');
  });

  it('rejects arrays and malformed JSON', () => {
    const snapshot = buildCustomizationSnapshot(new Map([
      ['custom_avatar_owned_v1', '["custom-01"]'],
      ['avatar_aura_owned_v1', '{bad'],
    ]), 100, 1);
    expect(snapshot.ownedAvatars).toEqual({});
    expect(snapshot.ownedAuras).toEqual({});
  });

  it('compares normalized content instead of object identity', () => {
    const a = buildCustomizationSnapshot(new Map(), 100, 1);
    const b = buildCustomizationSnapshot(new Map(), 200, 1);
    expect(customizationSnapshotsEqual(a, b)).toBe(true);
  });

  it('stays lightweight for startup', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/customization_snapshot.ts'), 'utf8');
    expect(source).not.toContain("from '../constants/custom_avatars'");
    expect(source).not.toContain("from '../constants/avatars'");
    expect(source).not.toContain("from '../constants/avatar_auras'");
    expect(source).not.toContain('require(');
  });
});
