import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, invalidateAccountGeneration } from '../app/account_generation';
import {
  SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS,
  SUPPORT_DIAGNOSTIC_TTL_MS,
  captureSupportDiagnosticBundle,
  recordSupportDiagnostic,
} from '../app/support_diagnostics';

jest.mock('@react-native-async-storage/async-storage');

describe('support diagnostics local ring', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    beginAccountGeneration('stable-a');
  });

  it('records concurrently without losing events and caps the newest history', async () => {
    const base = Date.now();
    await Promise.all(Array.from({ length: SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS + 20 }, (_, index) => (
      recordSupportDiagnostic({
        atMs: base + index,
        event: 'navigation',
        screen: `/screen_${index}`,
        result: 'info',
      })
    )));

    const bundle = await captureSupportDiagnosticBundle(base + 1_000);
    expect(bundle?.events).toHaveLength(SUPPORT_DIAGNOSTIC_LOCAL_MAX_EVENTS);
    expect(bundle?.events[0].screen).toBe('/screen_20');
    expect(bundle?.events.at(-1)?.screen).toBe('/screen_219');
  });

  it('drops expired events and isolates a new account generation', async () => {
    const now = Date.now();
    await recordSupportDiagnostic({
      atMs: now - SUPPORT_DIAGNOSTIC_TTL_MS - 1,
      event: 'app_state',
      result: 'info',
    });
    await recordSupportDiagnostic({ atMs: now, event: 'navigation', screen: '/settings' });
    expect((await captureSupportDiagnosticBundle(now))?.events).toHaveLength(1);

    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    expect(await captureSupportDiagnosticBundle(now)).toBeNull();
  });

  it('fails closed for forbidden fields and corrupt storage', async () => {
    await recordSupportDiagnostic({
      atMs: Date.now(),
      event: 'support_report',
      result: 'start',
      // The public type deliberately has no arbitrary metadata bag.
      ...( { email: 'person@example.com', comment: 'private report text' } as never),
    });
    const first = await captureSupportDiagnosticBundle();
    expect(first?.events[0]).toEqual(expect.objectContaining({ event: 'support_report', result: 'start' }));
    expect(JSON.stringify(first)).not.toContain('person@example.com');
    expect(JSON.stringify(first)).not.toContain('private report');

    const keys = await AsyncStorage.getAllKeys();
    if (keys[0]) await AsyncStorage.setItem(keys[0], '{broken');
    expect(await captureSupportDiagnosticBundle()).toBeNull();
  });
});
