import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('settings nickname save contract', () => {
  it('applies the new nickname locally before waiting on Firestore reservation', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
    const saveNameStart = source.indexOf('const saveName = async () => {');
    const rowStart = source.indexOf('const Row =', saveNameStart);
    const saveName = source.slice(saveNameStart, rowStart);

    expect(saveNameStart).toBeGreaterThanOrEqual(0);
    expect(rowStart).toBeGreaterThan(saveNameStart);
    expect(saveName).not.toContain('isNameAvailable');

    const localWrite = saveName.indexOf("AsyncStorage.setItem('user_name', trimmed)");
    const localState = saveName.indexOf('setUserName(trimmed)');
    const modalClose = saveName.indexOf('closeNameModal()', localState);
    const reserve = saveName.indexOf('reserveName(trimmed, oldName)');

    expect(localWrite).toBeGreaterThanOrEqual(0);
    expect(localState).toBeGreaterThan(localWrite);
    expect(modalClose).toBeGreaterThan(localState);
    expect(reserve).toBeGreaterThan(modalClose);
    expect(saveName).toContain("if (reservation === 'taken')");
    expect(saveName).toContain('setUserName(oldName)');
  });
});
