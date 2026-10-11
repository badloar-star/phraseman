import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// 12.10 (координатор, аудит COVERAGE_AUDIT_R1 §C): «Модал имени» в Настройках был недостижим
// (ни одного setNameModal(true)) и удалён вместе со своим saveName. Смена имени с Optimistic UI,
// откатом и броней на сервере живёт в app/account_details.tsx → components/account/NicknameEditModal.tsx;
// её поведение сторожат tests/account_name_rollback_notice_contract.test.mjs и
// tests/nickname_guard_reconcile.test.ts. Этот сторож следит, чтобы мёртвая копия не вернулась.
describe('settings nickname save contract', () => {
  it('Settings no longer carries the dead name modal — nickname editing lives in the Account screen', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).not.toContain('const saveName = async () => {');
    expect(settings).not.toMatch(/\bnameModal\b/);
    expect(settings).not.toContain('reserveNameDetailed(');
    expect(settings).not.toContain('accountModalVisible');

    const account = read('app/account_details.tsx');
    expect(account).toContain('<NicknameEditModal');
  });
});
