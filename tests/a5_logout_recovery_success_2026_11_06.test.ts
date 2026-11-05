// зачем (A5, владелец 05.11 «выход только успех»): сорвавшийся ПОСЛЕ защитного маркера выход доводится тихо восстановлением,
// шторка входа — только при ok; при ok:false окно остаётся (fail-closed, чужой прогресс следующему аккаунту нельзя).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'account', 'AccountLogoutFlow.tsx'), 'utf8');

describe('A5: выход доводит защитный маркер тихо', () => {
  it('восстановление зовётся только для recovery_required / wipe_failed', () => {
    expect(src).toContain("import { resumeAccountSwitchRecovery, signOutAndWipeForAccountSwitch } from '../../app/auth_provider';");
    const at = src.indexOf('const recovered = await resumeAccountSwitchRecovery();');
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at - 420, at)).toContain("forced.reason === 'recovery_required' || forced.reason === 'wipe_failed'");
  });

  it('шторка входа только при recovered.ok; иначе окно отказа остаётся', () => {
    const at = src.indexOf('if (recovered.ok) {');
    expect(at).toBeGreaterThan(0);
    const block = src.slice(at, at + 160);
    expect(block).toContain('onSignedOut({ synced: false });');
    expect(src.indexOf("setFailureKind(recovery ? 'recovery' : 'precommit');")).toBeGreaterThan(at);
  });

  it('журнал [AUTH-LOGOUT] пишет начало и итог восстановления', () => {
    expect(src).toContain("stage: 'ui_recovery_start'");
    expect(src).toContain("stage: 'ui_recovery_done'");
  });
});
