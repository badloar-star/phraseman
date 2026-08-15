import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('MAX Voice graceful fallback contract', () => {
  it('offers the walkie-talkie route after both preflight and transport failures', () => {
    const prestart = read('app/max_call_prestart.tsx');
    const session = read('app/max_call_session.tsx');
    for (const source of [prestart, session]) {
      expect(source).toContain("pathname: '/ai_dialog_session'");
      expect(source).toContain("maxFallback: '1'");
    }
  });

  it('opens the existing half-duplex conversation mode and explains MAX minutes', () => {
    const fallback = read('app/ai_dialog_session.tsx');
    expect(fallback).toContain("params.maxFallback === '1'");
    expect(fallback).toContain('useState(maxFallbackRequested)');
    expect(fallback).toContain('testID="max-voice-fallback-banner"');
    expect(fallback).toContain('Минуты MAX не тратятся');
  });
});
