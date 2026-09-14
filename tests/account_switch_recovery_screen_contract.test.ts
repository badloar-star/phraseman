import fs from 'fs';
import path from 'path';

describe('account-switch recovery wall contract', () => {
  const componentPath = path.join(process.cwd(), 'components', 'AccountSwitchRecoveryScreen.tsx');
  const layoutPath = path.join(process.cwd(), 'app', '_layout.tsx');

  it('is mounted globally and cannot be dismissed while a marker exists', () => {
    const component = fs.readFileSync(componentPath, 'utf8');
    const layout = fs.readFileSync(layoutPath, 'utf8');

    expect(layout).toContain("import AccountSwitchRecoveryScreen from '../components/AccountSwitchRecoveryScreen'");
    expect(layout).toContain('<AccountSwitchRecoveryScreen />');
    expect(component).toContain('subscribeAccountSwitchQuarantine');
    expect(component).toContain('getAccountSwitchQuarantineSnapshot');
    expect(component).toMatch(/onRequestClose=\{\(\) => \{ \/\* account isolation wall is not dismissible \*\/ \}\}/);
    expect(component).not.toContain('onClose');
  });

  it('offers only an idempotent recovery retry and never clears or wipes a corrupt marker directly', () => {
    const component = fs.readFileSync(componentPath, 'utf8');

    expect(component).toContain('resumeRuntimeAccountSwitchQuarantine');
    expect(component).not.toContain('clearCompletedAccountSwitchQuarantine');
    expect(component).not.toContain('wipeLocalAccountData');
    expect(component).not.toContain('removeItem(');
  });
});
