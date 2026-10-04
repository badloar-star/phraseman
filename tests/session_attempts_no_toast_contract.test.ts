import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('session attempts UI contract', () => {
  test('loss feedback stays visual and never adds an attempt-lost toast', () => {
    const hud = read('components/session_attempts/SessionAttemptsHud.tsx');
    // зачем (D09/D148, 04.10): ручная модалка восстановления (с кнопкой подарка) удалена — ни один экран её не монтировал, восстановление автоматическое
    expect(hud).not.toMatch(/ActionToast|InGameToast|ToastAndroid|showToast/);
    expect(hud).not.toMatch(/попытка потеряна|attempt lost/iu);
    expect(hud).toContain('withSequence');
    expect(hud).toContain('useReduceMotion');
  });
});
