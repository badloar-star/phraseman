import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function readProjectFile(...parts: string[]): string {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

describe('app snapshot bootstrap contract', () => {
  it('keeps the core snapshot store in-memory only', () => {
    const source = readProjectFile('app', 'app_snapshot_store.ts');

    expect(source).not.toContain('@react-native-async-storage/async-storage');
    expect(source).not.toContain('setInterval(');
    expect(source).not.toContain('onSnapshot(');
  });

  it('primes the shared snapshot inside the existing startup hydration budget', () => {
    const source = readProjectFile('app', '_layout.tsx');

    expect(source).toContain("import { primeAppSnapshotFromStorage } from './app_snapshot_bootstrap';");
    expect(source).toContain('const startupLocalHydration = Promise.all([');
    expect(source).toContain('primeAppSnapshotFromStorage(studyTarget).catch(() => {})');
  });

  it('publishes existing warm caches into the shared snapshot instead of adding listeners', () => {
    const friends = readProjectFile('app', 'friends_tab_swr_warm.ts');
    const lessons = readProjectFile('app', 'lesson_screen_bootstrap.ts');
    const arena = readProjectFile('app', 'arena_rating_cache.ts');

    expect(friends).toContain('publishFriendsSnapshot');
    expect(friends).toContain('patchAppSnapshot({');
    expect(lessons).toContain('publishLessonPrimeSummary');
    expect(arena).toContain('patchAppSnapshot({');
    expect(friends).not.toContain('onSnapshot(');
    expect(lessons).not.toContain('onSnapshot(');
  });

  it('primes account-scoped customization in the startup multiGet', () => {
    const bootstrap = readProjectFile('app', 'app_snapshot_bootstrap.ts');

    expect(bootstrap).toContain('CUSTOMIZATION_STORAGE_KEYS');
    expect(bootstrap).toContain('buildCustomizationSnapshot(values, now, profile.level)');
    expect(bootstrap).toContain('customization:');
  });

  it('visible high-traffic screens seed their first frame from the shared snapshot', () => {
    const home = readProjectFile('app', '(tabs)', 'home.tsx');
    const friends = readProjectFile('app', '(tabs)', 'friends.tsx');
    const settings = readProjectFile('app', '(tabs)', 'settings.tsx');
    const arena = readProjectFile('app', 'arena_lobby.tsx');

    expect(home).toContain('useAppSnapshotSelector');
    expect(home).toContain('snapshotTotalXp');
    expect(friends).toContain('friendsSnapshot?.friends');
    expect(settings).toContain('appSnapshot.profile?.name');
    expect(settings).toContain('appSnapshot.settings?.tapHaptics');
    expect(arena).toContain('buildArenaFriendProfilesFromSnapshot');
    expect(arena).toContain('arenaSnapshot.progress?.shards');
  });

  it('timestamps delayed profile hydration when the read starts so it cannot undo a later rename', () => {
    const store = readProjectFile('app', 'app_snapshot_store.ts');
    const home = readProjectFile('app', '(tabs)', 'home.tsx');
    const settings = readProjectFile('app', '(tabs)', 'settings.tsx');

    expect(store).toContain('export function resolveHydratedProfileName');
    expect(home).toContain('const homeHydrationStartedAt = Date.now();');
    expect(home).toContain('updatedAt: homeHydrationStartedAt,');
    expect(home).toContain('resolveHydratedProfileName(homeHydrationStartedAt, name)');
    expect(home).toContain('userName: hydratedName,');
    expect(home).toContain('name: hydratedName,');
    expect(home).toMatch(/profile:\s*{\s*source: 'storage',\s*updatedAt: homeHydrationStartedAt,/);
    expect(home).not.toMatch(/if \(name\)\s*setUserName\(name\)/);
    expect(settings).toContain('const settingsHydrationStartedAt = Date.now();');
    expect(settings).toContain('updatedAt: settingsHydrationStartedAt,');
    expect(settings).toContain('resolveHydratedProfileName(settingsHydrationStartedAt, pairs[0][1])');
    expect(settings).not.toContain('setUserName(pairs[0][1]);');
  });

  it('clears the in-memory snapshot during account-level local wipe', () => {
    const cloudSync = readProjectFile('app', 'cloud_sync.ts');

    expect(cloudSync).toContain("import { resetAppSnapshotForAccountSwitch } from './app_snapshot_store';");
    expect(cloudSync).toContain('resetAppSnapshotForAccountSwitch();');
  });
});
