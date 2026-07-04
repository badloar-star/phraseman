import { __cloudSyncTestHooks } from '../app/cloud_sync';

const { mergeOwnedFlagMap } = __cloudSyncTestHooks;

// Регресс: аура, выданная из админки (аура «Нимб» бета-тестерам), пишется в облако
// users/{uid}.progress.avatar_aura_owned_v1. Раньше owned-ключи не были в sticky-ветке
// restore → на активном устройстве (локальный XP ≥ облачного) аура НЕ появлялась и
// оставалась «под замком». Теперь owned мержится union'ом, чтобы облачная выдача
// догоняла устройство, а локально купленные ауры не терялись.

describe('cloud_sync owned-aura union merge (admin grant reaches device)', () => {
  it('adds a cloud-granted aura on top of local owned auras', () => {
    const local = JSON.stringify({ 'aura-aurora': true });
    const cloud = JSON.stringify({ 'aura-aurora': true, 'aura-nimbus': true });
    const merged = mergeOwnedFlagMap(local, cloud);
    expect(merged).not.toBeNull();
    const parsed = JSON.parse(merged as string);
    expect(parsed['aura-nimbus']).toBe(true);
    expect(parsed['aura-aurora']).toBe(true);
  });

  it('grants the aura even when the device owned nothing before', () => {
    const merged = mergeOwnedFlagMap(null, JSON.stringify({ 'aura-nimbus': true }));
    expect(merged).not.toBeNull();
    expect(JSON.parse(merged as string)['aura-nimbus']).toBe(true);
  });

  it('never drops a locally-owned aura that the cloud lacks (no regression on purchases)', () => {
    // Cloud only has nimbus; local has a purchased aura. Union keeps both.
    const local = JSON.stringify({ 'aura-mint': true });
    const cloud = JSON.stringify({ 'aura-nimbus': true });
    const parsed = JSON.parse(mergeOwnedFlagMap(local, cloud) as string);
    expect(parsed['aura-mint']).toBe(true);
    expect(parsed['aura-nimbus']).toBe(true);
  });

  it('returns null when the cloud adds nothing new (nothing to write)', () => {
    const same = JSON.stringify({ 'aura-nimbus': true });
    expect(mergeOwnedFlagMap(same, same)).toBeNull();
  });

  it('returns null for empty/absent cloud value', () => {
    expect(mergeOwnedFlagMap(JSON.stringify({ 'aura-nimbus': true }), null)).toBeNull();
    expect(mergeOwnedFlagMap(null, '')).toBeNull();
    expect(mergeOwnedFlagMap(null, undefined)).toBeNull();
  });

  it('ignores non-truthy flags in the cloud map', () => {
    // { id: false } must not be treated as owned.
    expect(mergeOwnedFlagMap(null, JSON.stringify({ 'aura-nimbus': false }))).toBeNull();
  });
});
