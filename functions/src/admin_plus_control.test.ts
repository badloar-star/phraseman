import {
  assertPlusSnapshotBatchFits, buildLegacyMigrationCandidate, csvCell, decodePlusControlCursor, encodePlusControlCursor,
  packPlusControlSnapshot, parsePlusControlRequest, unpackPlusControlSnapshot,
} from './admin_plus_control';

const NOW = Date.UTC(2026, 6, 13, 12);

describe('Admin Plus control callable contracts', () => {
  test('bounds read input and does not accept arbitrary views', () => {
    expect(parsePlusControlRequest({ view: 'secrets', query: ' X ', pageSize: 999 })).toMatchObject({ view: 'accounts', query: 'x', pageSize: 100, cursor: null });
    expect(() => parsePlusControlRequest({ cursor: 'not-a-valid-cursor' })).toThrow('invalid_cursor');
    expect(parsePlusControlRequest({ view: 'radar', exportCsv: true })).toMatchObject({ view: 'radar', exportCsv: true });
  });

  test('binds an opaque cursor to one immutable snapshot and request scope', () => {
    const first = parsePlusControlRequest({ view: 'accounts', filter: 'active' });
    const cursor = encodePlusControlCursor('snapshot-a', 100, first.scope);
    expect(decodePlusControlCursor(cursor, first.scope)).toEqual({ snapshotId: 'snapshot-a', offset: 100 });
    expect(() => decodePlusControlCursor(cursor, parsePlusControlRequest({ view: 'radar' }).scope)).toThrow('cursor_mismatch');
  });

  test('keeps records after 10,000 in the same frozen archive when source data mutates', () => {
    const source = Array.from({ length: 10_001 }, (_, index) => ({ uid: `user-${String(index).padStart(5, '0')}`, name: `User ${index}` }));
    const packed = packPlusControlSnapshot({ generatedAtMs: NOW, sourceCount: source.length, summary: { scannedUsers: source.length }, items: source });
    source[10_000].name = 'mutated after page one';
    const restored = unpackPlusControlSnapshot(packed);
    expect(restored.items).toHaveLength(10_001);
    expect(restored.items[10_000]).toMatchObject({ uid: 'user-10000', name: 'User 10000' });
  });

  test('keeps one atomic Firestore snapshot batch below the 10 MiB request ceiling', () => {
    expect(() => assertPlusSnapshotBatchFits(Array(11).fill('x'.repeat(700_000)))).not.toThrow();
    expect(() => assertPlusSnapshotBatchFits(Array(12).fill('x'.repeat(700_000)))).toThrow('plus_snapshot_too_large');
    expect(() => assertPlusSnapshotBatchFits(Array(13).fill('x'))).toThrow('plus_snapshot_too_large');
  });

  test.each(['=HYPERLINK("https://evil")', '+cmd', '-2+3', '@SUM(A1:A2)', '  =1+1'])(
    'neutralizes spreadsheet formulas in CSV cells: %s',
    (value) => expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`),
  );

  test('preserves ordinary quoted CSV values', () => {
    expect(csvCell('Alice "Plus"')).toBe('"Alice ""Plus"""');
  });

  test('prepares only active unmigrated legacy admin grants', () => {
    const candidate = buildLegacyMigrationCandidate({ id: 'legacy', progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: '0', premium_admin_grant_at: '123' } }, NOW);
    expect(candidate).toMatchObject({ uid: 'legacy', after: { vipActive: 'true', vipPlan: 'admin_vip', vipFrom: '123', vipUntil: '0' } });
    expect(candidate?.beforeFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(buildLegacyMigrationCandidate({ id: 'expired', progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', premium_expiry: String(NOW - 1) } }, NOW)).toBeNull();
    expect(buildLegacyMigrationCandidate({ id: 'already', progress: { premium_plan: 'admin_grant', admin_premium_override: 'true', vip_active: 'true', vip_plan: 'admin_vip' } }, NOW)).toBeNull();
  });
});
