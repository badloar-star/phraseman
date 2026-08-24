import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('PhoneState production runtime wiring', () => {
  test('root installs the production runtime before any account bootstrap can run', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("import { installPhoneStateProductionRuntime } from './phone_state_runtime'");
    expect(layout).toContain('installPhoneStateProductionRuntime();');
    expect(layout.indexOf('installPhoneStateProductionRuntime();'))
      .toBeLessThan(layout.indexOf('bootstrapPhoneState({'));
  });

  test('runtime opens and migrates SQLCipher before configuring health and local authority', () => {
    const runtime = read('app/phone_state_runtime.ts');
    expect(runtime).toContain('openPhoneStateDatabase');
    expect(runtime).toContain('migratePhoneStateSchema');
    expect(runtime).toContain('configurePhoneStateHealthStorage');
    expect(runtime).toContain('configurePhoneStateProgressCutover');
    expect(runtime).toContain('configurePhoneStateShadowRuntime');
    expect(runtime).toContain('createPracticeReducer');
    expect(runtime).toContain('configurePhoneStatePracticeBridge');
    expect(runtime).toContain('createEconomyReducer');
    expect(runtime).toContain('configurePhoneStateEconomyBridge');
    expect(runtime).toContain('importLegacyEconomyOnce');
    expect(runtime).toContain('createLearningV2Reducer');
    expect(runtime).toContain('configurePhoneStateLearningV2Bridge');
    expect(runtime).toContain('configurePhoneStateSyncLifecycleRuntime');
    expect(runtime).toContain('database.closeAsync()');
  });

  test('runtime does not surface background sync failures or delete the journal', () => {
    const runtime = read('app/phone_state_runtime.ts');
    expect(runtime).not.toMatch(/Alert\.|throw new Error\(['"]sync/);
    expect(runtime).not.toMatch(/DELETE FROM operations|DROP TABLE operations/);
  });

  test('friend gift external intents use the shared coordinator instead of a second connectivity poller', () => {
    const runtime = read('app/phone_state_runtime.ts');
    const layout = read('app/_layout.tsx');
    expect(runtime).toContain('drainExternalIntents');
    expect(runtime).toContain('resumePendingFriendGiftSends');
    expect(runtime).toContain('configurePhoneStateBackgroundSyncBridge');
    expect(layout).not.toContain("import('./friend_gift_outbox')");
  });

  test('a successful remote pull hydrates Spin stars in the same guarded account generation', () => {
    const runtime = read('app/phone_state_runtime.ts');
    const syncStart = runtime.indexOf('const result = await engine.syncOnce()');
    const syncReturn = runtime.indexOf('return result;', syncStart);
    const syncSlice = runtime.slice(syncStart, syncReturn);
    expect(syncSlice).toContain('hydrateLevelSpinStarsAfterPhoneStatePull');
    expect(syncSlice).toContain('session.context.runtimeToken');
  });
});
