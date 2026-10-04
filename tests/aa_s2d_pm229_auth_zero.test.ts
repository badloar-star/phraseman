/*
 * PM-229 (AA S2d): в auth_provider.ts и account_switch_quarantine.ts не осталось
 * ни одного немого catch — каждый пишет префикс, шаг и код ошибки. Считается тем же
 * правилом, что и проба-храповик tests/pm229_silent_catch.probe.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import { countSilent } from './pm229_silent_catch.probe';

test.each(['app/auth_provider.ts', 'app/account_switch_quarantine.ts'])('%s has zero silent catches', (rel) => {
  const abs = path.join(__dirname, '..', rel);
  expect(countSilent(fs.readFileSync(abs, 'utf8'), abs)).toBe(0);
});

test('the swallow helper logs prefix, step and error code only', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app/auth_provider.ts'), 'utf8');
  expect(source).toContain('console.warn(`${prefix} swallowed step=${step} code=${identityErrorCode(error)}`);');
});
