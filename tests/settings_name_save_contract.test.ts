import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('settings nickname save contract', () => {
  it('reserves the nickname on the server BEFORE applying it locally (hard uniqueness)', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
    const saveNameStart = source.indexOf('const saveName = async () => {');
    const rowStart = source.indexOf('const Row =', saveNameStart);
    const saveName = source.slice(saveNameStart, rowStart);

    expect(saveNameStart).toBeGreaterThanOrEqual(0);
    expect(rowStart).toBeGreaterThan(saveNameStart);

    const reserve = saveName.indexOf('reserveName(trimmed, oldName)');
    const takenGate = saveName.indexOf("if (reservation === 'taken')");
    const localWrite = saveName.indexOf("AsyncStorage.setItem('user_name', trimmed)");
    const localState = saveName.indexOf('setUserName(trimmed)');
    const modalClose = saveName.indexOf('closeNameModal()', localState);

    // Correct order: reserve → gate on result → only then apply locally + close.
    expect(reserve).toBeGreaterThanOrEqual(0);
    expect(takenGate).toBeGreaterThan(reserve);
    expect(localWrite).toBeGreaterThan(takenGate);
    expect(localState).toBeGreaterThan(localWrite);
    expect(modalClose).toBeGreaterThan(localState);

    // A rejected reservation must NOT apply the name (no local write before the gate).
    const earlyWrite = saveName.slice(0, reserve).indexOf("AsyncStorage.setItem('user_name', trimmed)");
    expect(earlyWrite).toBe(-1);

    // Both failure branches handled; dead isNameAvailable path stays out.
    expect(saveName).toContain("if (reservation === 'taken')");
    expect(saveName).toContain("if (reservation !== 'ok')");
    expect(saveName).not.toContain('isNameAvailable');
  });
});
