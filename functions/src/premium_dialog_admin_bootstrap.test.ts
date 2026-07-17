import fs from 'fs';
import path from 'path';

describe('premium dialog direct-entry Firebase Admin bootstrap', () => {
  it('initializes the default Admin app idempotently before exporting the callable', () => {
    const source = fs.readFileSync(path.join(__dirname, 'premium_dialog.ts'), 'utf8');
    const bootstrap = source.indexOf('if (!admin.apps.length) admin.initializeApp();');
    const callableExport = source.indexOf('export const premiumDialogSend = onCall');

    expect(bootstrap).toBeGreaterThanOrEqual(0);
    expect(bootstrap).toBeLessThan(callableExport);
  });
});
