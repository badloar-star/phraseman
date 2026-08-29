import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');

describe('customization selection cloud restore authority', () => {
  test('resolves owner+lineage journal and PhoneState before applying raw cloud mirrors', () => {
    const applyStart = source.indexOf('async function applyRestoreFromUserDoc');
    const restoreWrite = source.indexOf('await applyPersonalPlanRestorePairs', applyStart);
    const resolve = source.indexOf('await resolveCustomizationSelectionAuthority', applyStart);
    const overwriteAvatar = source.indexOf('cloudData.user_avatar = authority.selection.avatarValue', resolve);
    const overwriteFrame = source.indexOf('cloudData.user_avatar_frame = authority.selection.frameId', resolve);
    const overwriteAura = source.indexOf('cloudData.user_avatar_aura = authority.selection.storedAuraSelection', resolve);

    expect(applyStart).toBeGreaterThan(-1);
    expect(resolve).toBeGreaterThan(applyStart);
    expect(restoreWrite).toBeGreaterThan(resolve);
    expect(resolve).toBeLessThan(restoreWrite);
    expect(overwriteAvatar).toBeGreaterThan(resolve);
    expect(overwriteFrame).toBeGreaterThan(resolve);
    expect(overwriteAura).toBeGreaterThan(resolve);
    expect(source.slice(resolve, overwriteAura + 100)).toContain('readPhoneStateCustomizationSelection');
    expect(source.slice(resolve, overwriteAura + 500)).toContain('drainCustomizationSelectionOutbox');
  });

  test('never resolves selection authority without the captured current account generation', () => {
    const applyStart = source.indexOf('async function applyRestoreFromUserDoc');
    const resolve = source.indexOf('await resolveCustomizationSelectionAuthority', applyStart);
    const guard = source.lastIndexOf('isCurrentAccountGeneration(vipGeneration)', resolve);

    expect(guard).toBeGreaterThan(applyStart);
    expect(guard).toBeLessThan(resolve);
    expect(source.slice(resolve, resolve + 250)).toContain('token: vipGeneration');
  });

  test('level-gift auto-equip threads its existing non-recursive account lease', () => {
    const levelGift = fs.readFileSync(path.join(__dirname, '..', 'app', 'level_gift_system.ts'), 'utf8');
    const call = levelGift.indexOf('await commitExternalAuraSelectionOccurrence({');
    const callBody = levelGift.slice(call, call + 500);

    expect(call).toBeGreaterThan(-1);
    expect(callBody).toContain('inheritedLease: opts?.accountTransitionLockLease');
  });
});
