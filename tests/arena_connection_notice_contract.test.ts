import fs from 'fs';
import path from 'path';

import { arenaText } from '../modules/arena/copy';

const ROOT = path.join(__dirname, '..');
const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('ArenaConnectionNotice contract', () => {
  it('provides nonempty offline and unknown copy in every supported language', () => {
    for (const lang of LANGS) {
      expect(arenaText(lang, 'hubOffline')).not.toHaveLength(0);
      expect(arenaText(lang, 'hubOfflineHint')).not.toHaveLength(0);
      expect(arenaText(lang, 'valueUnknown')).not.toHaveLength(0);
    }
  });

  it('keeps the offline notice accessible and its accent retry control legible', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'arena', 'ArenaConnectionNotice.tsx'), 'utf8');

    expect(source).toContain('testID="arena-hub-offline"');
    expect(source).toContain('accessibilityLiveRegion="polite"');
    expect(source).toContain("arenaText(lang, 'retry')");
    expect(source).toContain('onRetry');
    expect(source).toContain('backgroundColor: P.accent');
    expect(source).toContain('color: P.okInk');
    expect(source).not.toMatch(/retryText[^\n]*color:\s*['\"](?:#fff|white)['\"]/i);
  });
});
