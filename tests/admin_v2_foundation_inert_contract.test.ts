import { existsSync, readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const foundationFiles = [
  'admin/v2/daily-digest.js',
  'admin/v2/migration.html',
  'admin/v2/scripts/admin-analytics-state.js',
  'admin/v2/scripts/admin-capabilities.js',
  'admin/v2/scripts/admin-guidance.js',
  'admin/v2/scripts/admin-operational-snapshot.js',
  'admin/v2/styles/admin.css',
];

describe('Admin v2 inert foundation release gate', () => {
  test('foundation files contain no callable or Firebase write surface', () => {
    const forbidden = [
      /httpsCallable\s*\(/,
      /firebase-functions/,
      /\bgetFirestore\s*\(/,
      /\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\s*\(/,
    ];

    for (const relativePath of foundationFiles) {
      const source = readFileSync(path.join(root, relativePath), 'utf8');
      for (const pattern of forbidden) {
        expect({ relativePath, pattern: String(pattern), matched: pattern.test(source) }).toEqual({
          relativePath,
          pattern: String(pattern),
          matched: false,
        });
      }
    }
  });

  test('foundation release does not ship a privileged Firebase bridge', () => {
    expect(existsSync(path.join(root, 'admin/v2/scripts/admin-firebase.js'))).toBe(false);
  });

  test('foundation release does not activate Admin v2 or replace legacy admin', () => {
    expect(existsSync(path.join(root, 'admin/v2/index.html'))).toBe(false);
    expect(existsSync(path.join(root, 'admin/v2/scripts/admin-router.js'))).toBe(false);

    const legacyAdmin = readFileSync(path.join(root, 'admin/index.html'), 'utf8');
    expect(legacyAdmin).not.toMatch(/location\.(?:assign|replace)\([^)]*\/v2\//);
  });
});
