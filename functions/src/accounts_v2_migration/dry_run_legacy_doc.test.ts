import { MIGRATION_EXPORT_FORMAT, runMigrationDryRun } from './dry_run';

/*
 * Account V2, Пакет 6G — перенос при первом входе (OD21): старый документ
 * человека лежит под users/{stableId}, а владелец операций V2 — uid Firebase.
 *
 * зачем: серверная функция переноса находит документ по привязке auth_links
 * (то же правило, что firestore.rules authLinkMapsToUser). У такого документа
 * canonicalStableId равен ЕГО id, а не uid — без явного legacyDocId dry-run
 * счёл бы его чужим (owner_mismatch) и перенос не случился бы НИКОГДА.
 * Чужой canonicalStableId по-прежнему держит HOLD.
 */

const UID = 'authUidAAAAAAAAAAAAAAAAAAAA1';
const STABLE = 'stable-doc-0001';

function snapshot(user: Record<string, unknown>): unknown {
  return { format: MIGRATION_EXPORT_FORMAT, uid: UID, user, subcollections: {} };
}

describe('accounts_v2_migration dry-run — документ под stableId (Пакет 6G)', () => {
  it('canonicalStableId = id старого документа → перенос готов, владелец операций — uid', () => {
    const result = runMigrationDryRun(
      snapshot({ canonicalStableId: STABLE, progress: { lesson1_best_score: '5' } }),
      { legacyDocId: STABLE },
    );
    expect(result.report.status).toBe('ready');
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0].operations.every(({ ownerUid }) => ownerUid === UID)).toBe(true);
  });

  it('без legacyDocId прежнее правило: canonicalStableId ≠ uid → HOLD owner_mismatch', () => {
    const result = runMigrationDryRun(snapshot({ canonicalStableId: STABLE, progress: { lesson1_best_score: '5' } }));
    expect(result.report.status).toBe('hold');
    expect(result.report.held).toEqual([{ reason: 'owner_mismatch', path: '$', count: 1 }]);
  });

  it('чужой canonicalStableId при legacyDocId → HOLD owner_mismatch, ноль операций', () => {
    const result = runMigrationDryRun(
      snapshot({ canonicalStableId: 'someone-else', progress: { lesson1_best_score: '5' } }),
      { legacyDocId: STABLE },
    );
    expect(result.report.status).toBe('hold');
    expect(result.batches).toEqual([]);
  });

  it('пустой/битый legacyDocId не ослабляет проверку', () => {
    for (const legacyDocId of ['', ' x ', 'a/b']) {
      const result = runMigrationDryRun(
        snapshot({ canonicalStableId: STABLE, progress: { lesson1_best_score: '5' } }),
        { legacyDocId },
      );
      expect(result.report.status).toBe('hold');
    }
  });
});
