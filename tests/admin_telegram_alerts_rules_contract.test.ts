import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');

describe('Telegram owner alerts Firestore boundary', () => {
  test('outbox is Admin SDK only and excluded from browser-admin catch-all', () => {
    expect(rules).toMatch(/match \/admin_alert_events\/\{document=\*\*\} \{\s*allow read, write: if false;/);
    expect(rules).toMatch(/function isServerOwnedSensitiveRoot\(collection\)[\s\S]*admin_alert_events/);
    expect(rules).toContain('&& !isServerOwnedSensitiveRoot(collection)');
  });

  test('alerts config can be read by admin but written only through callable', () => {
    const block = rules.match(/match \/admin_config\/\{docId\} \{[\s\S]*?\n    \}/)?.[0] ?? '';
    expect(block).toContain('allow read: if isAdmin();');
    expect(block).toContain("allow write: if isAdmin() && docId != 'support_inbox' && docId != 'alerts';");
  });
});
