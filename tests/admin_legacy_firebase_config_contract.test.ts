import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const legacy = fs.readFileSync(path.join(root, 'admin', 'legacy.html'), 'utf8');
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

describe('legacy admin Firebase client configuration', () => {
  test('keeps the browser key out of tracked HTML and resolves public config at runtime', () => {
    expect(legacy).not.toMatch(/\bAIza[0-9A-Za-z_-]{35}\b/);
    expect(legacy).not.toMatch(/\bapiKey\s*:/);
    expect(legacy).toContain('globalThis.PHR_MAN_FIREBASE_CONFIG');
    expect(legacy).toContain('/__/firebase/init.json');
    expect(legacy).toContain('initializeApp(await resolveFirebaseConfig())');
  });

  test('keeps local environment overrides out of Git', () => {
    expect(gitignore).toMatch(/^\.env\*\.local$/m);
  });
});
