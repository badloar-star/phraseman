import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function listTextFiles(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  const result: string[] = [];

  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const relativePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...listTextFiles(relativePath));
    } else if (/\.(?:html?|txt|json)$/i.test(entry.name)) {
      result.push(relativePath);
    }
  }

  return result;
}

describe('retired Quiz and Arena website contract', () => {
  test('preserves the active website quiz and its separate consent flow', () => {
    const startPage = read('knowly-www/start/index.html');
    const startScript = read('knowly-www/assets/start.js');

    expect(startPage).toContain('/assets/start.js');
    expect(startScript).toContain('marketingConsent: !!marketingConsent');
    expect(startScript).toContain("name: 'marketingConsent'");
    expect(startScript).toMatch(/quiz/i);
  });

  test('removes retired native Arena and duel claims from public website copy', () => {
    const excludedPrefixes = [
      path.join('knowly-www', 'start'),
      path.join('knowly-www', 'legal'),
      path.join('knowly-www', 'phraseman', 'duel'),
    ];
    const publicCopy = listTextFiles('knowly-www')
      .filter((file) => !excludedPrefixes.some((prefix) => file.startsWith(prefix)))
      .map(read)
      .join('\n');

    expect(publicCopy).not.toMatch(/\b(?:arena|duels?|matchmaking)\b|дуэл|арен(?:а|е|у|ы|ой)/i);
  });

  test('turns legacy duel URLs into a safe website tombstone', () => {
    const firebase = JSON.parse(read('firebase.json'));
    const websiteHosting = firebase.hosting.find((entry: { target?: string }) => entry.target === 'knowlywww');
    const rootTombstone = read('duel/index.html');
    const hostedTombstone = read('knowly-www/phraseman/duel/index.html');

    for (const source of ['/duel', '/duel/**', '/phraseman/duel', '/phraseman/duel/**']) {
      expect(websiteHosting.redirects).toContainEqual({
        source,
        destination: '/download/',
        type: 302,
      });
    }
    expect(websiteHosting.rewrites).not.toContainEqual(
      expect.objectContaining({ source: '/phraseman/duel/**' }),
    );
    expect(`${rootTombstone}\n${hostedTombstone}`).not.toContain('phraseman://duel');
    expect(rootTombstone).toContain("location.replace('/download/')");
    expect(hostedTombstone).toContain("location.replace('/download/')");
  });

  test('stops advertising duel universal links while preserving invite links', () => {
    const appConfig = read('app.json');
    const association = JSON.parse(read('knowly-www/.well-known/apple-app-site-association'));
    const associationJson = JSON.stringify(association);

    expect(appConfig).toContain('/phraseman/invite');
    expect(appConfig).not.toContain('/phraseman/duel');
    expect(associationJson).toContain('/phraseman/invite');
    expect(associationJson).not.toContain('/phraseman/duel');
  });

  test('describes legacy records truthfully without presenting retired features as active', () => {
    for (const file of [
      'legal/privacy_policy_en.json',
      'legal/privacy_policy_en_ios.json',
    ]) {
      const privacy = read(file);
      expect(privacy).toContain('retired Quiz and Arena features');
      expect(privacy).toContain('website quiz');
      expect(privacy).not.toMatch(/run leaderboards[^\n]+arena|match-found alerts|matchmaking queue|arena profile/i);
    }

    for (const file of ['legal/terms_of_use_en.json', 'legal/terms_of_use_en_ios.json']) {
      const terms = read(file);
      expect(terms).toContain('Quiz and Arena were retired');
      expect(terms).not.toMatch(/leaderboards, leagues, clubs, arena|notifications, matchmaking/i);
    }
  });
});
