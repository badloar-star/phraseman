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

  test('emits current catalog receipts while retaining v1..v5 recovery compatibility', () => {
    const runtime = readFileSync(path, 'utf8');
    const contract = readFileSync(join(process.cwd(), 'app', 'level_spin_local_contract.ts'), 'utf8');
    // зачем константа вместо литерала (2026-08-26): версия каталога менялась
    // уже дважды, и литерал `catalogVersion: 3` в рантайме однажды разошёлся
    // с каталогом — квитанции ушли бы с чужой версией. Теперь источник один.
    expect(runtime).toContain('catalogVersion: LEVEL_SPIN_REWARD_CATALOG_VERSION');
    expect(runtime).toContain('schemaVersion: 2');
    expect(contract).toContain('catalogVersion: 1 | 2 | 3 | 4 | 5 | 6;');
    expect(contract).toContain('(receipt.catalogVersion === 1 && receipt.schemaVersion === 1)');
    expect(contract).toContain('(receipt.catalogVersion === 2 && receipt.schemaVersion === 2)');
    expect(contract).toContain('(receipt.catalogVersion === 3 && receipt.schemaVersion === 2)');
    expect(contract).toContain('(receipt.catalogVersion === 4 && receipt.schemaVersion === 2)');
    expect(contract).toContain('(receipt.catalogVersion === 5 && receipt.schemaVersion === 2)');
    expect(contract).toContain('(receipt.catalogVersion === 6 && receipt.schemaVersion === 2)');
    expect(contract).toContain('isLocalSpinGiftAllowedForCatalogVersion');
  });

  test('rechecks the active receipt inside the claim lock before consuming another credit', () => {
    const source = readFileSync(path, 'utf8');
    const claim = source.slice(
      source.indexOf('export async function claimLocalLevelSpin'),
      source.indexOf('\n}', source.indexOf('export async function claimLocalLevelSpin')) + 2,
    );
    expect(claim).toContain('const activeReceipt = await restoreActiveReceipt(current);');
    expect(claim).toContain('if (activeReceipt) return activeReceipt;');
    expect(claim).toContain('current = await loadLocalState(owner);');
    expect(claim.indexOf('if (activeReceipt) return activeReceipt;'))
      .toBeLessThan(claim.indexOf('const credit = current.credits[0];'));
  });

  test('drops an exhausted reward from the roll instead of paying a consolation', () => {
    const runtime = readFileSync(path, 'utf8');
    // Награда, которую человеку уже нечего дать, выбывает ИЗ РОЗЫГРЫША.
    // Утешительная выплата здесь была бы слишком щедрой (решение владельца).
    expect(runtime).toContain('listExhaustedSpinRewardIds()');
    expect(runtime).toContain('RETIRED_LEVEL_SPIN_REWARD_IDS');
    expect(runtime).toContain("['attempt_restore_all'] as const");
    expect(runtime).toContain('pickLevelSpinRewardExcluding(requestId, excludedRewardIds)');
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
    //
    // зачем (2026-08-26): раньше здесь сверялась ТОЧНАЯ строка импорта, и тест
    // падал, когда рядом добавили isLocalSpinReceiptCreditId из того же модуля.
    // Сторожим намерение — источник валидатора, — а не форматирование строки.
    expect(source).toMatch(
      /import \{[^}]*\bisLocalSpinCreditId\b[^}]*\} from '\.\/level_spin_credit_ids';/,
    );
    // Оба фильтра — и сам кредит, и ключ идемпотентности (issuedCreditIds) —
    // обязаны прогонять значение через общий валидатор. Форма записи (прямой
    // вызов, .filter, guard с typeof) значения не имеет, важен факт проверки.
    const creditsValidated = /credits[\s\S]{0,400}?isLocalSpinCreditId\(/.test(source);
    const issuedValidated = /issuedCreditIds[\s\S]{0,400}?isLocalSpinCreditId\(/.test(source);
    expect(creditsValidated).toBe(true);
    expect(issuedValidated).toBe(true);
    expect(source).not.toContain('LOCAL_SPIN_CREDIT_ID_RE');
  });
});
