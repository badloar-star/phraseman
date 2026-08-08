import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('settings nickname save contract', () => {
  it('applies the nickname locally IMMEDIATELY, reserves on the server in background, rolls back on rejection (genuine Optimistic UI)', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
    const saveNameStart = source.indexOf('const saveName = async () => {');
    const rowStart = source.indexOf('  return (', saveNameStart);
    const saveName = source.slice(saveNameStart, rowStart);

    expect(saveNameStart).toBeGreaterThanOrEqual(0);
    expect(rowStart).toBeGreaterThan(saveNameStart);

    const localState = saveName.indexOf('setUserName(trimmed)');
    const modalClose = saveName.indexOf('closeNameModalNow()', localState);
    const reserve = saveName.indexOf("reserveNameDetailed(trimmed, oldName, { source: 'settings' })");
    const takenGate = saveName.indexOf("if (reservation.status === 'taken')");
    const rollbackFn = saveName.indexOf('const rollbackToOldName');

    // Genuine optimistic order: apply locally + close modal FIRST, THEN reserve
    // on the server in the background, THEN gate on the result.
    expect(localState).toBeGreaterThanOrEqual(0);
    expect(modalClose).toBeGreaterThan(localState);
    expect(reserve).toBeGreaterThan(modalClose);
    expect(takenGate).toBeGreaterThan(reserve);

    // Rejection path must roll back the optimistically-applied name.
    expect(rollbackFn).toBeGreaterThan(0);
    expect(rollbackFn).toBeLessThan(reserve);
    const rejectionBlock = saveName.slice(reserve);
    expect(rejectionBlock).toContain("if (reservation.status === 'taken')");
    expect(rejectionBlock.indexOf('rollbackToOldName()')).toBeLessThan(rejectionBlock.indexOf("setNameChangeNotice(L('Это имя уже занято"));
    expect(saveName).toContain("if (reservation.status === 'cooldown')");
    expect(saveName).toContain("if (reservation.status !== 'ok')");
    expect(saveName).not.toContain('isNameAvailable');

    // Rollback restores the previous name via setUserName(oldName), gated by the
    // same last-write-guard so a stale response can't clobber a fresher attempt.
    expect(saveName).toContain('setUserName(oldName)');
    expect(saveName).toContain('if (isStaleAttempt()) return;');
  });

  it('locks the save button while nickname reservation is in flight', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
    const saveNameStart = source.indexOf('const saveName = async () => {');
    const rowStart = source.indexOf('  return (', saveNameStart);
    const saveName = source.slice(saveNameStart, rowStart);

    expect(source).toContain('const [nameSaving, setNameSaving] = useState(false);');
    expect(source).toContain('const nameSavingRef = useRef(false);');
    expect(source).toContain('warmNameAvailabilityAuth();');
    expect(saveName).toContain('if (nameSavingRef.current) return;');
    expect(saveName).toContain('nameSavingRef.current = true;');
    expect(saveName).toContain('setNameSaving(true);');
    expect(saveName).toContain('nameSavingRef.current = false;');
    expect(saveName).toContain('setNameSaving(false);');
    expect(source).toContain('disabled={nameSaving}');
    expect(source).toContain('ActivityIndicator');
  });
});
