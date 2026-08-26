import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('session attempts UI contract', () => {
  test('loss feedback stays visual and never adds an attempt-lost toast', () => {
    const hud = read('components/session_attempts/SessionAttemptsHud.tsx');
    const modal = read('components/session_attempts/SessionAttemptsRecoveryModal.tsx');
    const combined = `${hud}\n${modal}`;

    expect(combined).not.toMatch(/ActionToast|InGameToast|ToastAndroid|showToast/);
    expect(combined).not.toMatch(/попытка потеряна|attempt lost/iu);
    expect(hud).toContain('withSequence');
    expect(hud).toContain('useReduceMotion');
  });

  test('recovery modal cannot be dismissed through the backdrop or hardware back', () => {
    const modal = read('components/session_attempts/SessionAttemptsRecoveryModal.tsx');
    const shell = read('components/modal_fx/HybridAlertShell.tsx');

    expect(modal).toContain('dismissible={false}');
    expect(shell).toContain('dismissible?: boolean');
    expect(shell).toContain('const dismissHandler = dismissible ? runExit : ignoreDismiss;');
    expect(shell).toContain('onPress={dismissible ? runExit : undefined}');
  });
});
