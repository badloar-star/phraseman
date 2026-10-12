// зачем (координатор 12.10, п.71): заглушка dev_account_state_stub.ts отстала от 85812a2a3 (исправлено в 90dd76678) —
// стор-сборка упала бы на отсутствующем экспорте. Гейт заглушек стоял только в release:precheck. Теперь он в pre-commit,
// но только когда коммит трогает app/dev_* или store_release_stubs/* (~0,07 с), чтобы не тормозить остальные коммиты.
import fs from 'fs';
import path from 'path';

const installer = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'install-git-hooks.mjs'), 'utf8').replace(/\r\n/g, '\n');
const PATH_FILTER = /^(app\/dev_|store_release_stubs\/)/;

describe('pre-commit: гейт стор-заглушек', () => {
  it('установщик хука запускает гейт под фильтром путей и выходит с его кодом', () => {
    const preCommit = installer.slice(installer.indexOf('const PRE_COMMIT_HOOK = `'), installer.indexOf('const PRE_PUSH_HOOK = `'));
    expect(preCommit).toContain("if git diff --cached --name-only | grep -qE '^(app/dev_|store_release_stubs/)'; then");
    expect(preCommit).toContain('  node scripts/store_release_stubs_gate.mjs');
    const gateAt = preCommit.indexOf('node scripts/store_release_stubs_gate.mjs');
    expect(preCommit.indexOf('exit "$status"', gateAt)).toBeGreaterThan(gateAt);
    // прежние проверки на месте и идут раньше
    expect(preCommit.indexOf('node scripts/scan_secrets.mjs --staged')).toBeLessThan(gateAt);
    expect(preCommit.indexOf('node scripts/guard_as_any_ratchet.mjs')).toBeLessThan(gateAt);
  });

  it('фильтр путей: dev-модули и заглушки — да, остальное — нет', () => {
    expect(PATH_FILTER.test('app/dev_state_fixtures.ts')).toBe(true);
    expect(PATH_FILTER.test('store_release_stubs/dev_state/dev_account_state_stub.ts')).toBe(true);
    expect(PATH_FILTER.test('app/_layout.tsx')).toBe(false);
    expect(PATH_FILTER.test('app/devtools.ts')).toBe(false);
    expect(PATH_FILTER.test('tests/dev_state_fixtures.test.ts')).toBe(false);
  });
});
