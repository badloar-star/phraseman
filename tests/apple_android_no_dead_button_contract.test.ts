// зачем (координатор 18.10 05:45): на Android без Services ID кнопки Apple нет (тупиковой кнопки быть не должно), на iOS
// кнопка Apple не пропала; если ветку всё же достигли — человеку простая фраза, имя переменной сборки только в журнале.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const provider = read('app/auth_provider.ts');
const modal = read('components/RegistrationPromptModal.tsx');

const fnBody = (src: string, signature: string): string => {
  const start = src.indexOf(signature);
  expect(start).toBeGreaterThan(-1);
  return src.slice(start, src.indexOf('\n}\n', start));
};

describe('Apple на Android — без тупиковой кнопки', () => {
  it('Android: доступность Apple = наличие Services ID (и в асинхронной, и в синхронной проверке)', () => {
    expect(fnBody(provider, 'export async function isAppleSignInAvailable(')).toContain("if (Platform.OS === 'android') {\n    return !!getAppleAndroidServiceId();");
    expect(fnBody(provider, 'export function peekAppleSignInAvailability(')).toContain("if (Platform.OS === 'android') return !!getAppleAndroidServiceId();");
    expect(fnBody(provider, 'export function peekAppleUnavailableReason(')).toContain("getAppleAndroidServiceId() ? null : 'missing_service_id'");
  });

  it('iOS: кнопка Apple не пропала — решает нативный isAvailableAsync, Services ID не требуется', () => {
    const asyncBody = fnBody(provider, 'export async function isAppleSignInAvailable(');
    const iosBranch = asyncBody.slice(asyncBody.indexOf("if (Platform.OS === 'ios') {"), asyncBody.indexOf("if (Platform.OS === 'android')"));
    expect(iosBranch).toContain('mod.isAvailableAsync()');
    expect(iosBranch).not.toContain('getAppleAndroidServiceId');
    expect(fnBody(provider, 'export function peekAppleSignInAvailability(')).toContain("if (Platform.OS === 'ios') return iosAppleSignInAvailabilityCache;");
  });

  it('окно входа рисует Apple только при доступности и пишет причину скрытия раз за показ', () => {
    expect(modal).toContain('{appleAvail === true && (');
    expect(modal).toMatch(/if \(applePeek === false\) \{\s*console\.log\(`\[AUTH-MODAL\] apple_hidden reason=\$\{peekAppleUnavailableReason\(\) \?\? 'unknown'\}/);
  });

  it('на экране нет имени переменной сборки и инструкций Apple Developer — только в журнале', () => {
    const branch = modal.slice(modal.indexOf('if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {'), modal.indexOf('const baseMsg = triLang(lang, {'));
    const visible = branch.slice(branch.indexOf('showInlineError('));
    expect(visible).not.toMatch(/EXPO_PUBLIC|Services ID|Apple Developer|\.env|EAS/);
    expect(visible).toContain('Вход через Apple на этом телефоне сейчас недоступен. Войди через Google.');
    expect(branch.slice(0, branch.indexOf('showInlineError('))).toContain('[AUTH-MODAL] apple_android_missing_service_id');
  });
});
