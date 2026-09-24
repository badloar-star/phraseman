import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('support diagnostic high-signal integration', () => {
  test('records safe navigation and app state before the no-sink return', () => {
    const source = read('app/app_activity.ts');
    const recorder = source.indexOf('recordKnownSupportDiagnostic(action, meta, now)');
    const noSink = source.indexOf('if (!LOCAL_ACTIVITY_QUEUE_ENABLED && !canWriteToFirestore) return;');
    expect(recorder).toBeGreaterThanOrEqual(0);
    expect(recorder).toBeLessThan(noSink);
    expect(source).toContain("action === 'navigation:screen_view'");
    expect(source).toContain("action === 'app:state_change'");
    expect(source).toContain("event: 'feature_action'");
    expect(source).toContain('action,');
  });

  // зачем (D57/PM-063): app/avatar_select.tsx удалён целиком — диагностика
  // покупок аватара/ауры (customization_purchase) ушла вместе с экраном,
  // покупать эту косметику больше негде.

  test('keeps account deletion privacy authoritative over diagnostic retention', () => {
    const auth = read('app/auth_provider.ts');
    const serverDelete = read('functions/src/account_delete.ts');
    expect(auth).toContain('AsyncStorage.clear()');
    expect(serverDelete).toContain("{ collection: 'error_reports', field: 'uid', values: 'stable' }");
    expect(auth).not.toContain("recordSupportDiagnostic({ event: 'account_delete'");
  });
});
