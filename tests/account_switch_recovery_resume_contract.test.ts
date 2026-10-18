// зачем (A5, правило владельца 18.10 «выход без ошибки»): экран выхода вызывает resumeAccountSwitchRecovery вместо окна
// «Не удалось выйти — перезапусти приложение». Функция доводит записанную смену тем же восстановлением, что при запуске,
// тихо повторяет только retryable и не повторяет quarantined.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8').replace(/\r\n/g, '\n');
const start = src.indexOf('export async function resumeAccountSwitchRecovery(');
const fn = src.slice(start, src.indexOf('\n}\n', start));

describe('A5: resumeAccountSwitchRecovery', () => {
  it('экспортируется и доводит смену восстановлением запуска', () => {
    expect(start).toBeGreaterThan(0);
    expect(fn).toContain('await resumePendingAccountSwitchQuarantine()');
    expect(fn).toContain("if (result.result === 'completed' || result.result === 'none') return { ok: true };");
  });

  it('quarantined не повторяется; каждая попытка и отказ пишут причину', () => {
    expect(fn).toContain("if (result.result === 'quarantined' || pauseMs === undefined)");
    expect(fn).toContain("stage: 'recovery_attempt'");
    expect(fn).toContain("stage: 'recovery_gave_up'");
    expect(src).toContain('const ACCOUNT_SWITCH_RECOVERY_RETRY_PAUSES_MS: readonly number[] = [800, 2_000];');
  });

  it('исключение восстановления не немое — становится retryable с кодом', () => {
    expect(fn).toContain("result = { result: 'retryable', reason: `threw_${identityErrorCode(error)}` };");
  });
});
