import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'app/achievements_screen.tsx'), 'utf8');

const modalStart = screen.indexOf('function AchievementModal');
const modalEnd = screen.indexOf('// ── Секция-аккордеон', modalStart);
const modal = screen.slice(modalStart, modalEnd);

const plaqueStart = screen.indexOf('const renderShelfDetail');
const plaqueEnd = screen.indexOf('// зачем: nearestAchievements', plaqueStart);
const plaque = screen.slice(plaqueStart, plaqueEnd);

test('shelf detail is a strong museum plaque with a contained open affordance', () => {
  expect(plaque).toContain('testID="achievement-gallery-plaque"');
  expect(plaque).toContain('testID="achievement-gallery-plaque-marker"');
  expect(plaque).toContain('testID="achievement-gallery-plaque-open"');
  expect(plaque).toContain("fontWeight: '900'");
  expect(plaque).toContain("fontWeight: '700'");
  expect(plaque).toContain('minWidth: 44');
  expect(plaque).toContain('minHeight: 44');
  expect(plaque).toContain('name="calendar-outline"');
  expect(plaque).toContain('accessibilityElementsHidden');
});

test('achievement modal presents a premium dossier hierarchy', () => {
  expect(modal).toContain('testID="achievement-award-dossier"');
  expect(modal).toContain('testID="achievement-dossier-hero"');
  expect(modal).toContain('testID="achievement-dossier-description"');
  expect(modal).toContain("fontWeight: '900'");
  expect(modal).toContain("fontWeight: '700'");
  expect(modal).toContain('name="calendar-outline"');
  expect(modal).toContain('<HybridAlertShell');
});

test('share is a premium full-width row and close is an accessible icon action', () => {
  const shareStart = modal.indexOf('testID="achievement-share-primary"');
  const share = modal.slice(shareStart, shareStart + 1800);
  const closeStart = modal.indexOf('testID="achievement-close-secondary"');
  const close = modal.slice(closeStart, closeStart + 900);

  expect(shareStart).toBeGreaterThan(0);
  expect(share).toContain("width: '100%'");
  expect(share).toContain('minHeight: 56');
  expect(share).toContain('accessibilityRole="button"');
  expect(share).toContain('accessibilityLabel=');
  expect(share).toContain('name="share-outline"');
  expect(share).toContain('color={t.accent}');

  expect(closeStart).toBeGreaterThan(0);
  expect(close).toContain('width: 44');
  expect(close).toContain('height: 44');
  expect(close).toContain('accessibilityRole="button"');
  expect(close).toContain('name="close"');
});

test('premium restyle preserves share telemetry without a pearl claim action', () => {
  expect(modal).toContain('buildAchievementShareMessage(lang, name, STORE_URL)');
  expect(modal).toContain('Share.share({ message: msg })');
  expect(modal).toContain("checkAchievements({ type: 'achievement_shared', studyTarget })");
  expect(modal).not.toContain('onShardClaimed');
  expect(modal).not.toContain('claimAchievementShardReward');
  expect(modal).not.toContain('+1 жемчужина');
});
