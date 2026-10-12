// зачем (владелец п.76, координатор 12.10): английский интерфейс входит в R1. Сторож экранов входа, аккаунта, удаления и ошибок входа:
// у каждого перевода есть английский, и в английском поле нет кириллицы (частая ошибка — русский текст, скопированный в слот en).
// Онбординг сторожит tests/clean_onboarding_copy.test.ts (9 языков на ключ, en без кириллицы).
import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  'components/CleanOnboarding.tsx',
  'components/RegistrationPromptModal.tsx',
  'app/account_details.tsx',
  'components/DeleteAccountConfirmModal.tsx',
  'components/account/AccountLogoutFlow.tsx',
  'components/account/NicknameEditModal.tsx',
  'app/onboarding_account_switch_confirm.ts',
  'app/account_switch_copy.ts',
  'app/account_delete_restore_prompt.ts',
  'app/privacy_settings.tsx',
  'components/referral_code_sheet.tsx',
  // зачем (координатор 12.10, английский в зоне Авторизации): аудит всей зоны (94 файла) — 0 пропусков; остальные экраны зоны под тем же сторожем,
  // чтобы новый текст без en не просочился: согласия, удаление, тексты аккаунта, юридические экраны.
  'components/AccountDeletedNotice.tsx',
  'components/AiConsentSheetModal.tsx',
  'components/AiConsentSheetModalHybrid.tsx',
  'components/AiDialogConsentModal.tsx',
  'components/AiExplainConsentModal.tsx',
  'components/AuthProviderButtons.tsx',
  'components/account/GlassInlineAlert.tsx',
  'app/account_backup_blocked_copy.ts',
  'app/account_switch_still_running_copy.ts',
  'app/account_sync_copy.ts',
  'app/ai_kill_switch_copy.ts',
  'app/ai_dialog_consent_gate.tsx',
  'app/privacy_screen.tsx',
  'app/terms_screen.tsx',
];
const CYRILLIC = /[Ѐ-ӿ]/;
const STR = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const EN_KEY = new RegExp(String.raw`\b(?:en|messageEn|labelEn)\s*:\s*(${STR})`, 'g');
const L_CALL = new RegExp(String.raw`\bL\(\s*(${STR})\s*,\s*(${STR})\s*,\s*(${STR})`, 'g');
const TRILANG_OBJECT = /triLang\(\s*[\w.]+\s*,\s*\{/g;

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('sign-in, account and deletion screens have English', () => {
  it.each(FILES)('%s: no Cyrillic in an English slot', (file) => {
    const src = read(file);
    const bad: string[] = [];
    for (const m of src.matchAll(EN_KEY)) if (CYRILLIC.test(m[1])) bad.push(m[0].slice(0, 80));
    for (const m of src.matchAll(L_CALL)) if (CYRILLIC.test(m[3])) bad.push(`L(…, ${m[3].slice(0, 60)})`);
    expect(bad).toEqual([]);
  });

  it('the checks are not empty: English slots and L(…) calls are found across these files', () => {
    let enSlots = 0;
    let lCalls = 0;
    for (const file of FILES) {
      const src = read(file);
      enSlots += [...src.matchAll(EN_KEY)].length;
      lCalls += [...src.matchAll(L_CALL)].length;
    }
    expect(enSlots).toBeGreaterThan(50);
    expect(lCalls).toBeGreaterThan(20);
  });

  it.each(FILES)('%s: every triLang map carries English', (file) => {
    const src = read(file);
    const missing: number[] = [];
    for (const m of src.matchAll(TRILANG_OBJECT)) {
      let depth = 1;
      let j = (m.index ?? 0) + m[0].length;
      const start = j;
      while (j < src.length && depth > 0) {
        if (src[j] === '{') depth += 1;
        else if (src[j] === '}') depth -= 1;
        j += 1;
      }
      const body = src.slice(start, j);
      // `en: '…'` или краткая запись `en,` внутри помощника L
      if (!/(^|[\s,{])['"]?en['"]?\s*(:|,)/.test(body)) missing.push(src.slice(0, m.index).split('\n').length);
    }
    expect(missing).toEqual([]);
  });
});
