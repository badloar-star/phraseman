/** PM-252 п.3 (04.10): сообщения приложения читаются принудительно только при входе, не на каждом возврате. */
import fs from 'fs';
import path from 'path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

describe('app messages foreground refresh', () => {
  test('force only on the first refresh per account in this process', () => {
    expect(layout).toContain('const appMessagesForcedForStableIds = new Set<string>();');
    expect(layout).toContain('const isLoginRefresh = !appMessagesForcedForStableIds.has(forcedKey);');
    expect(layout).toMatch(/refreshAppMessagesSnapshotOnce\(isLoginRefresh\s*\?\s*\{ force: true \}\s*:\s*\{ minIntervalMs: APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS \}\)/);
    expect(layout).not.toMatch(/refreshAppMessagesSnapshotOnce\(\{ force: true \}\)/);
  });

  test('later returns hit the network at most every 6 hours', () => {
    expect(layout).toContain('const APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS = 6 * 60 * 60_000;');
  });
});
