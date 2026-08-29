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

  test('records avatar and aura purchase outcomes without raw commercial or identity data', () => {
    const source = read('app/avatar_select.tsx');
    expect(source).toContain("event: 'customization_purchase'");
    expect(source).toContain("reason: 'insufficient_currency'");
    expect(source).toContain("reason: 'account_changed'");
    expect(source).toContain("reason: 'transaction_failed'");
    expect(source).toContain('subject: pendingPurchase.target');
    const diagnosticCalls = source.match(/recordSupportDiagnostic\(\{[\s\S]*?\}\)/g) || [];
    expect(diagnosticCalls.length).toBeGreaterThanOrEqual(4);
    expect(diagnosticCalls.join('\n')).not.toMatch(/itemId|cost|balance|email|uid|error\.message|stack|tags/);
  });

  test('keeps account deletion privacy authoritative over diagnostic retention', () => {
    const auth = read('app/auth_provider.ts');
    const serverDelete = read('functions/src/account_delete.ts');
    expect(auth).toContain('AsyncStorage.clear()');
    expect(serverDelete).toContain("{ collection: 'error_reports', field: 'uid', values: 'stable' }");
    expect(auth).not.toContain("recordSupportDiagnostic({ event: 'account_delete'");
  });
});
