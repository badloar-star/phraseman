// Админка 05.11, сигнатура G (acc_mut / delete_background_failed «local_exit_unverified»): карантин удаления — задуманное состояние, а не сбой.
// Данные уже стёрты в быстрой фазе, замок остаётся, старт/возврат в приложение дожимает удаление → уровень warning; прочие причины — critical.
// Три выхода с одной причиной различаются метками веток в журнале (сперва логи).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/auth_provider.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('удаление аккаунта: карантин local_exit_unverified', () => {
  it("фоновый исход с причиной local_exit_unverified идёт в админку как warning, остальные — critical", () => {
    expect(src).toContain("DebugLogger.error('acc_mut:delete_background_failed', new Error(line), result.reason === 'local_exit_unverified' ? 'warning' : 'critical');");
  });
  it('каждая ветка карантина пишет свою метку (durable_fresh_identity / completion / deferred_to_startup)', () => {
    expect(src).toContain('[AUTH-DELETE] quarantine branch=durable_fresh_identity');
    expect(src).toContain('[AUTH-DELETE] quarantine branch=completion');
    expect(src).toContain('delete:anon_server=deferred_to_startup');
  });
  it('настоящие сбои остаются critical: исключение фоновой фазы', () => {
    expect(src).toContain("DebugLogger.error('acc_mut:delete_background_threw', new Error(line), 'critical');");
  });
});
