import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { assertAccountIsNotSealedFromDeletion } from './account_delete';

// зачем: 22.09.2026 владелец в очередной раз не смог войти в админку. Замер
// показал, что аккаунт был не «обесправлен», а УДАЛЁН и пересоздан Google-входом
// (created 09:45:00 = момент входа, надгробия удалений 09:32 и 09:34). Защиты
// администратора в конвейере удаления не было ни одной строки. Сторож держит
// пломбу: снять её молча нельзя.

const ctx = Object.freeze({
  runId: 'test-run',
  stableUidHash: 'a'.repeat(64),
  authUidHash: 'b'.repeat(64),
  startedAtMs: Date.now(),
});

const stats = () => ({ docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false });

describe('пломба: аккаунт администратора удалить нельзя', () => {
  it('запрещает удаление при admin: true', async () => {
    await expect(assertAccountIsNotSealedFromDeletion(
      'owner-uid',
      ctx,
      stats(),
      async () => ({ customClaims: { admin: true, adminRole: 'owner' } }),
    )).rejects.toThrow(/owner_account_delete_sealed/);
  });

  it('запрещает удаление и при admin: true без роли', async () => {
    await expect(assertAccountIsNotSealedFromDeletion(
      'admin-uid',
      ctx,
      stats(),
      async () => ({ customClaims: { admin: true } }),
    )).rejects.toThrow(/owner_account_delete_sealed/);
  });

  it('пропускает обычного пользователя', async () => {
    await expect(assertAccountIsNotSealedFromDeletion(
      'user-uid',
      ctx,
      stats(),
      async () => ({ customClaims: {} }),
    )).resolves.toBeUndefined();
  });

  it('пропускает пользователя вообще без claims', async () => {
    await expect(assertAccountIsNotSealedFromDeletion(
      'user-uid',
      ctx,
      stats(),
      async () => ({}),
    )).resolves.toBeUndefined();
  });

  it('fail-closed: Auth недоступен — удаление ЗАПРЕЩЕНО', async () => {
    // зачем: снести аккаунт вслепую дороже, чем отказать. Отказ владелец
    // переживёт, потерю доступа к своему продукту — уже нет.
    await expect(assertAccountIsNotSealedFromDeletion(
      'user-uid',
      ctx,
      stats(),
      async () => { throw Object.assign(new Error('backend down'), { code: 'auth/internal-error' }); },
    )).rejects.toThrow(/owner_seal_lookup_failed/);
  });

  it('нет записи в Auth — удаление разрешено (чистка остатков)', async () => {
    await expect(assertAccountIsNotSealedFromDeletion(
      'ghost-uid',
      ctx,
      stats(),
      async () => { throw Object.assign(new Error('gone'), { code: 'auth/user-not-found' }); },
    )).resolves.toBeUndefined();
  });

  it('пломба реально вызвана в ядре удаления, до первой разрушающей стадии', () => {
    const src = readFileSync(join(__dirname, 'account_delete.ts'), 'utf8');
    const seal = src.indexOf('await assertAccountIsNotSealedFromDeletion(');
    const firstStage = src.indexOf("runDeleteStage(ctx, stats, 'permanent_denials'");
    expect(seal).toBeGreaterThan(0);
    expect(firstStage).toBeGreaterThan(0);
    expect(seal).toBeLessThan(firstStage);
  });
});
