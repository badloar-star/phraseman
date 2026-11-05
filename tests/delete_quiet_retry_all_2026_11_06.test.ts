// A9 / Q25 «только успех» (решение владельца 05.11, auth-scenario-matrix §D): тихие повторы быстрой фазы удаления — для ВСЕХ окон удаления (не только вариант Б).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/DeleteAccountConfirmModal.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('удаление аккаунта: тихие повторы для всех видов окна', () => {
  it('повторы не зависят от variantB', () => {
    expect(src).toContain('const res = await retryAccountDeleteHandoffQuietly(attemptHandoff, mode);');
    expect(src).not.toContain('variantB ? await retryAccountDeleteHandoffQuietly');
  });
  it('ветка пишет журнал, а окно отказа остаётся последним средством после исчерпания повторов (запрос удаления нельзя потерять молча)', () => {
    expect(src).toContain("'[ACCOUNT-DELETE-UI] handoff:quiet_retry'");
    expect(src).toContain("reportAccountDeleteHandoffFailed(res.reason);");
    expect(src).toContain("handoff_failed_silent");
  });
});
