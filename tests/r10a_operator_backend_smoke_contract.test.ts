import fs from 'node:fs';
import path from 'node:path';

test('R10A smoke is local-only and cannot call a provider or deploy', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'run-r10a-operator-backend-smoke.cjs'), 'utf8');
  expect(source).not.toMatch(/OPENAI_API_KEY|api\.openai\.com|https?:\/\/|firebase deploy|child_process/);
  expect(source).toContain('providerCalls: 0');
  expect(source).toContain("deployment: 'not_performed'");
});
