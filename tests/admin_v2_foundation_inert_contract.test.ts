import { readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

const foundationFiles = [
  'admin/v2/daily-digest.js',
  'admin/v2/migration.html',
  'admin/v2/scripts/admin-analytics-state.js',
  'admin/v2/scripts/admin-capabilities.js',
  'admin/v2/scripts/admin-guidance.js',
  'admin/v2/scripts/admin-operational-snapshot.js',
  'admin/v2/styles/admin.css',
];

describe('Admin v2 analytics-only release gate', () => {
  test('foundation files remain free of callable and Firebase write surfaces', () => {
    const forbidden = [
      /httpsCallable\s*\(/,
      /firebase-functions/,
      /\bgetFirestore\s*\(/,
      /\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\s*\(/,
    ];

    for (const relativePath of foundationFiles) {
      const source = read(relativePath);
      for (const pattern of forbidden) {
        expect({ relativePath, pattern: String(pattern), matched: pattern.test(source) }).toEqual({
          relativePath,
          pattern: String(pattern),
          matched: false,
        });
      }
    }
  });

  test('Firebase bridge exposes exactly the three money.read analytics callables', () => {
    const bridge = read('admin/v2/scripts/admin-analytics-firebase.js');
    const callableNames = Array.from(
      bridge.matchAll(/httpsCallable\(functionsUs,\s*'([^']+)'\)/g),
      (match) => match[1],
    ).sort();

    expect(callableNames).toEqual([
      'adminMonthlyDecisionPack',
      'adminProductAnalytics',
      'adminSubscriptionAnalytics',
    ]);
    expect(bridge).not.toMatch(/firebase-firestore|\bgetFirestore\b|\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction)\b/);
    expect(bridge).not.toContain('revenueCatShardsWebhook');
  });

  test('analytics-only activation preserves legacy admin as the primary fallback', () => {
    const index = read('admin/v2/index.html');
    const app = read('admin/v2/scripts/admin-analytics-app.js');
    const legacyAdmin = read('admin/index.html');

    expect(index).toContain('href="../index.html"');
    expect(index).toContain('/v2/scripts/admin-analytics-app.js');
    expect(app).toContain('admin-analytics-firebase.js');
    expect(app).not.toMatch(/publishRemoteConfig|dispatchSupport|promoCode|createAsset|runAsset|activateFactory|rollbackFactory/);
    expect(legacyAdmin).not.toMatch(/location\.(?:assign|replace)\([^)]*\/v2\//);
  });
});
