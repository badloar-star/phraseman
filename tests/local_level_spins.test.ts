import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('local level Spin runtime', () => {
  const path = join(process.cwd(), 'app', 'local_level_spins.ts');

  test('exists as an AsyncStorage-first reward path with no Firebase callable dependency', () => {
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, 'utf8');
    expect(source).toContain('LOCAL_LEVEL_SPIN_STATE_KEY');
    expect(source).toContain('AsyncStorage');
    expect(source).toContain('export async function claimLocalLevelSpin');
    expect(source).toContain('export async function grantLocalLevelSpins');
    expect(source).toContain('export async function grantLocalDevSpin');
    expect(source).toContain('migrateCachedBalanceToLocalCredits');
    expect(source).not.toContain('httpsCallable');
    expect(source).not.toContain('getFunctions');
    expect(source).not.toContain("from './level_reward_spins_client'");
    expect(source).not.toContain("from './cloud_sync'");
  });

  test('runs the Spin screen through the local claim path, not a callable', () => {
    const screen = readFileSync(join(process.cwd(), 'app', 'level_reward_spin.tsx'), 'utf8');
    expect(screen).toContain("from './local_level_spins'");
    expect(screen).toContain('claimLocalLevelSpin');
    expect(screen).not.toContain('claimLevelSpin');
    expect(screen).not.toContain('recoverLevelSpinClaim');
    expect(screen).not.toContain('fetchLevelSpinStatus');
    expect(screen).not.toContain("from './level_reward_spins_client'");
    const presentation = readFileSync(join(process.cwd(), 'components', 'LevelSpinFinishLine.tsx'), 'utf8');
    expect(presentation).not.toContain("from '../app/level_reward_spins_client'");
  });

  test('mints the local credit at the device XP level crossing before background sync', () => {
    const xp = readFileSync(join(process.cwd(), 'app', 'xp_manager.ts'), 'utf8');
    expect(xp).toContain("import { enqueueLevelSpinLevelUps } from './level_spin_level_up_queue'");
    expect(xp).toContain('enqueueLevelSpinLevelUps(prevLvl, newLvl, options.accountTransitionLockLease)');
    expect(xp).toContain(': enqueueLevelSpinLevelUps(prevLvl, newLvl)');
  });

  test('keeps every account and every claim commit isolated and recoverable', () => {
    const source = readFileSync(path, 'utf8');
    const queue = readFileSync(join(process.cwd(), 'app', 'level_spin_level_up_queue.ts'), 'utf8');
    expect(source).toContain('localLevelSpinStateKey(owner)');
    expect(source).toContain('issuedLevels');
    expect(source).toContain('activeReceipt');
    expect(source).toContain('AsyncStorage.multiSet');
    expect(queue).toContain('pendingLevelSpinQueueKey(owner)');
    expect(queue).toContain('grantLocalLevelSpinsForAccount(crossed, token, accountTransitionLockLease)');
    expect(queue).not.toContain('await grantLocalLevelSpins(crossed);');
  });

  test('emits catalog v3 receipts while retaining v1 and v2 recovery compatibility', () => {
    const runtime = readFileSync(path, 'utf8');
    const contract = readFileSync(join(process.cwd(), 'app', 'level_spin_local_contract.ts'), 'utf8');
    expect(runtime).toContain('catalogVersion: 3');
    expect(runtime).toContain('schemaVersion: 2');
    expect(contract).toContain('catalogVersion: 1 | 2 | 3;');
    expect(contract).toContain('(receipt.catalogVersion === 1 && receipt.schemaVersion === 1)');
    expect(contract).toContain('(receipt.catalogVersion === 2 && receipt.schemaVersion === 2)');
    expect(contract).toContain('(receipt.catalogVersion === 3 && receipt.schemaVersion === 2)');
  });

  /**
   * Класс бага (инцидент 2026-08-23): фильтр `issuedCreditIds` при загрузке
   * состояния знал не все источники спина. Новые ключи (`session_` для курса
   * V2, `arena_ranked_` для победы в рейтинге) молча стирались при каждом
   * перезапуске приложения — и тот же матч или та же сессия выдавали спин
   * ПОВТОРНО, потому что защита от дубля исчезала вместе с ключом.
   *
   * Сторож проверяет связь «источник кредита ↔ фильтр»: добавил новый префикс
   * в выдачу — обязан добавить его и в разрешающую регулярку. Обычные тесты
   * этот баг не ловят: выдача работает, ломается только переживание перезапуска.
   */
  test('accepts the idempotency key of EVERY spin source when reloading state', () => {
    const source = readFileSync(path, 'utf8');
    // Оба фильтра загрузки обязаны идти от ОДНОГО общего валидатора. Реальное
    // поведение каждого префикса проверяет level_spin_credit_ids.test.ts.
    expect(source).toContain("import { isLocalSpinCreditId } from './level_spin_credit_ids';");
    expect(source).toContain('isLocalSpinCreditId(credit.id)');
    expect(source).toContain('.filter(isLocalSpinCreditId)');
    expect(source).not.toContain('LOCAL_SPIN_CREDIT_ID_RE');
  });
});
