// зачем (координатор 18.10 06:12, «без системных текстов»): код ошибки входа даёт человеку словарную фразу — без кода,
// без «Firebase», без текста исключения; сам код — только в журнал [AUTH-…].
import fs from 'node:fs';
import path from 'node:path';
import {
  authErrorKind,
  authErrorLogCode,
  authErrorTextForKind,
} from '../app/auth_error_copy';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const SYSTEM_WORDS = /Firebase|auth\/|native_|firebase_|DEBUG|webClientId|SHA-1|Play Services|error|exception/i;

describe('словарь кодов ошибок входа', () => {
  it('коды Firebase / Google / dev-подмены раскладываются по видам', () => {
    expect(authErrorKind('firebase_auth_network-request-failed')).toBe('network');
    expect(authErrorKind('native_7')).toBe('network');
    expect(authErrorKind('dev_stub:network-request-failed')).toBe('network');
    expect(authErrorKind('firebase_auth_too-many-requests')).toBe('too_many');
    expect(authErrorKind('firebase_auth_credential-already-in-use')).toBe('other');
    expect(authErrorKind(undefined)).toBe('other');
  });

  it('фразы есть на 9 языках и не содержат системных слов', () => {
    for (const lang of LANGS) {
      for (const kind of ['network', 'too_many'] as const) {
        const text = authErrorTextForKind(kind, lang);
        expect(text).toBeTruthy();
        expect(text).not.toMatch(SYSTEM_WORDS);
      }
      expect(authErrorTextForKind('other', lang)).toBeNull();
    }
  });

  it('в журнал — только короткий машинный код; текст исключения превращается в other', () => {
    expect(authErrorLogCode('firebase_auth_too-many-requests')).toBe('firebase_auth_too-many-requests');
    expect(authErrorLogCode('The email a@b.c is already in use by another account.')).toBe('other');
    expect(authErrorLogCode('')).toBe('none');
  });
});

describe('экраны входа не показывают код', () => {
  const modal = read('components/RegistrationPromptModal.tsx');
  const onboarding = read('components/CleanOnboarding.tsx');

  it('окно входа: код ошибки всегда в журнал, общий текст — через словарь', () => {
    expect(modal).toContain('[AUTH-MODAL] sign_in error provider=${provider} code=${authErrorLogCode(result.error)}');
    expect(modal).not.toContain("if (__DEV__) console.warn('[RegistrationPromptModal] sign-in error'");
    expect(modal).toContain('const baseMsg = authErrorTextForKind(authErrorKind(result.error), lang) ?? triLang(lang, {');
  });

  it('окно входа: отмена не показывает отладочный текст ни в какой сборке', () => {
    expect(modal).not.toContain('DEBUG: cancelled');
    expect(modal).not.toContain('webClientId / SHA-1');
    expect(modal).toContain('[AUTH-MODAL] sign_in cancelled provider=');
  });

  it('окно входа и онбординг не передают на экран текст исключения', () => {
    for (const src of [modal, onboarding]) {
      expect(src).not.toMatch(/showInlineError\([^)]*(\.message|String\((e|err|error)\))/);
      expect(src).not.toMatch(/setAuthError\([^)]*(\.message|String\((e|err|error)\))/);
    }
  });

  it('онбординг: код в журнал [AUTH-ONB], не на экран', () => {
    expect(onboarding).toContain('[AUTH-ONB] error_text code=${authErrorLogCode(code)} kind=${authErrorKind(code)}');
    const fn = onboarding.slice(onboarding.indexOf('function describeAuthError('), onboarding.indexOf('// ── Даты и «дни» на 9 языках'));
    expect(fn).toContain('return human;');
    expect(fn).not.toMatch(/\$\{human\}\\n|code\.slice\(/);
  });
});
