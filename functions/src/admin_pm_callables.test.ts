import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');

test('exports Product Manager callables as manual onCall functions only', () => {
  const source = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_pm_callables.ts'), 'utf8');
  expect(source).toContain('adminGenerateProductBrief');
  expect(source).toContain('adminMutateProductItem');
  expect(source).toContain('onCall(');
  expect(source).not.toContain('onSchedule');
});

test('uses existing admin custom-claim and App Check policy', () => {
  const source = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_pm_callables.ts'), 'utf8');
  expect(source).toContain('ENFORCE_APP_CHECK');
  expect(source).toContain('request.auth?.token?.admin !== true');
  expect(source).toContain('permission-denied');
});

test('index exports Product Manager callables without touching legacy digest export', () => {
  const indexSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'index.ts'), 'utf8');
  expect(indexSource).toContain("export { adminGenerateDailyDigest } from './admin_daily_digest';");
  expect(indexSource).toContain("export { adminGenerateProductBrief, adminMutateProductItem } from './admin_pm_callables';");
});
