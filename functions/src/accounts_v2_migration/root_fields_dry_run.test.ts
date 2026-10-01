import { join } from 'path';
import { MIGRATION_EXPORT_FORMAT, runMigrationDryRun } from './dry_run';
import { classifyRootField } from './inventory';

/*
 * Account V2, Пакет 8A — dry-run на РЕАЛЬНОМ составе корня users/{id}.
 *
 * зачем: E2E 2026-10-01 (квитанция 5b18dd743, сценарий A, дефект 1) — документ с
 * accountGeneration/updatedAt/last_active_at/created_at уходил в HOLD unknown_field и перенос
 * не писал ничего. Здесь документ собирается из ВСЕХ корневых полей, которые находит перепись
 * кода (scripts/accounts_v2_root_fields_code_census.cjs), — новый писатель автоматически
 * попадает в этот тест. Ожидание: status ready, урок переносится.
 */

type CensusModule = Readonly<{ buildRootFieldCensus: () => Readonly<{ fields: Readonly<Record<string, readonly string[]>> }> }>;
const REPO = join(__dirname, '..', '..', '..');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- общий CJS-модуль переписи.
const { buildRootFieldCensus } = require(join(REPO, 'scripts', 'accounts_v2_root_fields_code_census.cjs')) as CensusModule;

const UID = 'authUidAAAAAAAAAAAAAAAAAAAA1';
const NOW = 1_790_000_000_000;


/**
 * Безопасные значения: поля, чьё ЗНАЧЕНИЕ держит весь аккаунт (identityHidden:true, чужой
 * canonicalStableId, duplicateOfStableId, anon_merge_claim), получают «чистое» значение —
 * эти HOLD по значению проверяются в dry_run.test.ts и здесь не ослабляются.
 */
const SAFE_VALUES: Readonly<Record<string, unknown>> = Object.freeze({
  stars: { balance: 7 },
  identityHidden: false,
  canonicalStableId: UID,
  duplicateOfStableId: '',
  anon_merge_claim: false,
  linkedAuth: { provider: 'google.com', providerUid: 'x', linkedAt: NOW },
});

function valueFor(name: string): unknown {
  return Object.prototype.hasOwnProperty.call(SAFE_VALUES, name) ? SAFE_VALUES[name] : NOW;
}

function run(user: Record<string, unknown>) {
  return runMigrationDryRun({ format: MIGRATION_EXPORT_FORMAT, uid: UID, user, subcollections: {} }, { nowMs: NOW });
}

describe('accounts_v2_migration dry-run — реальный состав корня users/{id} (Пакет 8A)', () => {
  let names: string[];
  beforeAll(() => {
    names = Object.keys(buildRootFieldCensus().fields).filter((name) => name !== 'progress');
  }, 120_000);

  it('сценарий A из E2E: служебные поля входа Learning V2 и старой синхронизации не держат перенос', () => {
    const result = run({
      accountGeneration: 1, updatedAt: NOW, last_active_at: NOW, created_at: NOW, canonicalStableId: UID,
      progress: { lesson1_best_score: '5', lesson2_best_score: '4' },
    });
    expect(result.report.held).toEqual([]);
    expect(result.report.status).toBe('ready');
    expect(result.batches.flatMap((batch) => batch.operations)).toHaveLength(2);
  });

  it('документ со ВСЕМИ корневыми полями, которые пишет код → ready, урок переносится', () => {
    const user: Record<string, unknown> = { progress: { lesson1_best_score: '5' } };
    // зачем (8A): реальный активный пользователь — ВСЕ поля из переписи, включая progressServer* и
    // mistakePracticeMergePending (решение координатора: keep_in_place OD20).
    for (const name of names) user[name] = valueFor(name);
    for (const name of ['progressServerState', 'progressServerAuthoritative', 'progressServerCutoverAt', 'progressMigratedAt', 'mistakePracticeMergePending']) {
      expect(user).toHaveProperty(name);
    }
    expect(Object.keys(user).length).toBeGreaterThanOrEqual(65);
    const result = run(user);
    expect(result.report.held).toEqual([]);
    expect(result.report.status).toBe('ready');
    expect(result.report.applyAllowed).toBe(true);
    expect(result.batches.flatMap((batch) => batch.operations)).toHaveLength(1);
  });

  it('служебные поля остаются на месте (keep_in_place), а не переносятся и не теряются молча', () => {
    const keptRules = names.filter((name) => classifyRootField(name).disposition === 'keep_in_place');
    expect(keptRules).toEqual(expect.arrayContaining(['accountGeneration', 'updatedAt', 'created_at', 'last_active_at', 'expoPushToken']));
    const result = run({ accountGeneration: 1, updatedAt: NOW, expoPushToken: 'ExponentPushToken[x]', progress: {} });
    const kept = result.report.keptInPlace.map((row) => row.path).sort();
    expect(kept).toEqual(['accountGeneration', 'expoPushToken', 'updatedAt']);
  });

  it('бывшие HOLD Пакета 5 больше не держат перенос: остаются на месте (решение 8A, OD20)', () => {
    for (const name of ['progressServerState', 'progressServerAuthoritative', 'progressServerCutoverAt', 'progressMigratedAt', 'mistakePracticeMergePending']) {
      const result = run({ [name]: name === 'progressServerAuthoritative' || name === 'mistakePracticeMergePending' ? true : NOW, progress: { lesson1_best_score: '5' } });
      expect([name, result.report.status, result.report.keptInPlace.map((row) => row.path)]).toEqual([name, 'ready', [name]]);
    }
  });

  it('неизвестное поле корня по-прежнему HOLD unknown_field (сторож не ослаблен)', () => {
    const result = run({ someFutureRootField: 1, progress: { lesson1_best_score: '5' } });
    expect(result.report.status).toBe('hold');
    expect(result.report.held).toEqual([expect.objectContaining({ reason: 'unknown_field' })]);
  });
});
