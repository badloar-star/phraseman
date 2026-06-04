import { readFileSync } from 'fs';
import path from 'path';

describe('lesson intro visibility sync policy', () => {
  const source = readFileSync(path.join(process.cwd(), 'app', 'cloud_sync.ts'), 'utf8');
  const syncKeysStart = source.indexOf('export const SYNC_KEYS');
  const syncKeysEnd = source.indexOf('] as const;', syncKeysStart);
  const syncKeysSource = source.slice(syncKeysStart, syncKeysEnd);
  const frenchKeysStart = source.indexOf('export const FRENCH_TARGET_SYNC_KEYS');
  const frenchKeysEnd = source.indexOf('] as const;', frenchKeysStart);
  const frenchKeysSource = source.slice(frenchKeysStart, frenchKeysEnd);
  const wipeKeysStart = source.indexOf('export function accountLocalDataKeysForToday');
  const wipeKeysEnd = source.indexOf(']);', wipeKeysStart);
  const wipeKeysSource = source.slice(wipeKeysStart, wipeKeysEnd);

  it('does not restore old lesson intro flags from cloud sync payloads', () => {
    expect(syncKeysSource).not.toContain('intro_shown');
    expect(syncKeysSource).not.toContain('lessonIntroShownKey');
    expect(frenchKeysSource).not.toContain('lessonIntroShownKey');
  });

  it('still wipes local intro flags when account data is cleared', () => {
    expect(wipeKeysSource).toContain('lessonIntroShownKey(lessonId, target)');
  });

  it('does not write users documents for heartbeat-only syncs', () => {
    expect(source).toContain('const hasProgressPatch = Object.keys(progressPatch).length > 0;');
    expect(source).toContain('if (!hasProgressPatch && !shouldSendCreatedAt)');
    expect(source).toContain('lastActivityStampAt = now;');
    expect(source).toMatch(/if \(!hasProgressPatch && !shouldSendCreatedAt\)[\s\S]*?return;/);
  });
});
