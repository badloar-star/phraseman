/** 04.10: ошибки входа в онбординге — на языке интерфейса; раньше 9 веток отдавали русский текст любому языку. */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8');
const body = src.slice(src.indexOf('function describeAuthError('), src.indexOf('// ── Русские даты без Intl'));

test('every branch of describeAuthError is localized through triLang', () => {
  expect(body.length).toBeGreaterThan(500);
  expect(body).not.toMatch(/human = '[А-Яа-яЁё]/);
  expect(body).toMatch(/let human = triLang\(lang, \{/);
  // 18.10: сеть и «слишком много попыток» переехали в общий словарь app/auth_error_copy.ts (тоже triLang)
  expect((body.match(/triLang\(lang, \{/g) ?? []).length).toBeGreaterThanOrEqual(10);
  expect(body).toContain('authErrorTextForKind(authErrorKind(code), lang)');
});
