import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../hooks/use_runtime_active.ts'),
  'utf8',
);

describe('runtime active hook contract', () => {
  it('combines navigation focus, foreground state, and explicit owner visibility', () => {
    expect(source).toContain('const screenFocused = useIsScreenFocused()');
    expect(source).toContain('const appActive = useAppRuntimeActive()');
    expect(source).toContain('return screenFocused && appActive && ownerVisible');
  });
});
