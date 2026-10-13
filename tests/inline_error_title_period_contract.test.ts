// зачем (LANG_PASS_REVIEW_R1 п.4/п.6, координатор 13.10): заголовок отказа входа без точки сливался с текстом в одно предложение;
// английский в зоне Авторизации — американский (canceled, Practice), как даты 10/12/2026.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('окно входа: заголовок ошибки отделён точкой; английский по-американски', () => {
  it('showInlineError ставит точку только если заголовок не кончается знаком конца фразы', () => {
    const src = read('components/RegistrationPromptModal.tsx');
    expect(src).toContain("const titleEnded = /[.!?…:]$/.test(title.trim()) ? title.trim() : `${title.trim()}.`;");
    expect(src).toContain('setInlineError(`${titleEnded}\\n${message}`);');
    // то же правило, что в коде, на примерах
    const join = (title: string) => (/[.!?…:]$/.test(title.trim()) ? title.trim() : `${title.trim()}.`);
    expect(join('This phone is already linked to another account')).toBe('This phone is already linked to another account.');
    expect(join('Не удалось войти!')).toBe('Не удалось войти!');
    expect(join('Подожди…')).toBe('Подожди…');
  });

  it('видимые английские строки зоны без британского написания', () => {
    expect(read('app/(tabs)/settings.tsx')).not.toMatch(/'(Account switch|The account switch was) cancelled/);
    expect(read('app/account_sync_copy.ts')).not.toContain('sign-in was cancelled');
    expect(read('components/AiDialogConsentModal.tsx')).not.toContain("en: 'Practise ");
  });
});
