import fs from 'node:fs';
import path from 'node:path';

// зачем (координатор 12.10): тексты онбординга переехали из components/CleanOnboarding.tsx в components/onboarding/*.
// Сторожа, которые проверяли русскую формулировку подстрокой в исходнике экрана, читают экран + эти файлы вместе.
const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  'components/onboarding/clean_onboarding_copy_core.ts',
  'components/onboarding/clean_onboarding_copy_paywall.ts',
  'components/onboarding/clean_onboarding_copy_language.ts',
  'components/onboarding/clean_onboarding_dates.ts',
  'app/paywall_subscription_disclosure.ts',
];

export const ONBOARDING_COPY_SOURCE: string = FILES
  .map((file) => `\n// ── ${file}\n${fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n')}`)
  .join('\n');
