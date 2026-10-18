import fs from 'node:fs';
import path from 'node:path';

describe('friends profile refresh scheduling', () => {
  it('loads on activation and membership changes without following equivalent subscription arrays or focus ticks', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'),
      'utf8',
    );

    expect(source).toContain('const friendsRuntimeActive = useRuntimeActive(friendsTabVisible);');
    expect(source).toContain('const profileMembershipKey = useMemo(');
    expect(source).toContain('const friendMembershipKey = useMemo(');
    expect(source).toContain('const uids = JSON.parse(profileMembershipKey) as string[];');
    expect(source).toContain('if (!friendsRuntimeActive || uids.length === 0) return;');
    expect(source).toContain('[friendMembershipKey, friendsRuntimeActive, friendsTogetherPolicy.enabled, profileMembershipKey]');
    expect(source).not.toContain('[friends, requests, friendsRuntimeActive, focusTick, friendsTogetherPolicy.enabled]');
  });
});

describe('friends modal hydration and rapid taps', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'), 'utf8');

  it('passes the live selected profile to the card after background hydration', () => {
    expect(source).toContain('const selectedPlayerProfile = useMemo(');
    expect(source).toContain('if (!uid || !profiles[uid]) return selectedPlayer;');
    expect(source).toContain('profileWithLookupDisplayName(uid, profiles[uid] ?? null, selectedPlayer.name)');
    expect(source).toContain('player={selectedPlayerProfile}');
  });

  it('claims the modal guard synchronously before opening either friend modal', () => {
    for (const handler of ['openProfile', 'openFriendSheet']) {
      const body = source.slice(source.indexOf(`const ${handler} = useCallback`));
      expect(body.slice(0, body.indexOf('}, []);'))).toMatch(/if \(modalWedgeGuardRef.current\) return;\s*modalWedgeGuardRef.current = true;/);
    }
  });

  it('preserves profile state identity on cache-only revalidation', () => {
    expect(source).toContain('Object.entries(fresh).every(([uid, profile]) => prev[uid] === profile)');
  });
});
describe('profile to friendship sheet native handoff', () => {
  it('retains the modal guard until native profile dismissal completes', () => {
    const tab = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'), 'utf8');
    const modal = fs.readFileSync(path.join(__dirname, '..', 'components', 'PlayerProfileModal.tsx'), 'utf8');
    expect(tab).toContain('|| profileDismissPending');
    expect(tab).toContain('setProfileDismissPending(true);');
    expect(tab).toContain('onDismissed={() => setProfileDismissPending(false)}');
    expect(modal).toContain('onDismiss={notifyDismissed}');
    expect(modal).toContain("Platform.OS === 'ios'");
    expect(modal).toContain('NATIVE_MODAL_DISMISS_GAP_MS');
  });
});
