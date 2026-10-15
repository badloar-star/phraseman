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
  // 04.10 (overlays-more OM-ACHIEVEMENT-EARNED — эталон): дата — чип «Получено · дд.мм.гггг» по центру,
  // заголовок 25/31 800; значка календаря на кадре нет.
  expect(modal).toContain('testID="achievement-dossier-obtained"');
  expect(modal).toContain("fontSize: 25, lineHeight: 31, fontWeight: '800'");
  expect(modal).not.toContain('name="calendar-outline"');
  expect(modal).toContain('<HybridAlertShell');
});

// 04.10: на кадре «Поделиться» — тёмная капсула `.cta.gh` 48/24 без значков (было: строка 56 со стрелкой).
test('share is a full-width 48 capsule and close is an accessible icon action', () => {
  const shareStart = modal.indexOf('testID="achievement-share-primary"');
  const share = modal.slice(shareStart, shareStart + 1800);
  const closeStart = modal.indexOf('testID="achievement-close-secondary"');
  const close = modal.slice(closeStart, closeStart + 900);

  expect(shareStart).toBeGreaterThan(0);
  expect(share).toContain("width: '100%'");
  expect(share).toContain('minHeight: 48');
  expect(share).toContain('borderRadius: 24');
  expect(share).toContain('accessibilityRole="button"');
  expect(share).toContain('accessibilityLabel=');
  expect(share).not.toContain('name="share-outline"');

  expect(closeStart).toBeGreaterThan(0);
  expect(close).toContain('width: 44');
  expect(close).toContain('height: 44');
  expect(close).toContain('accessibilityRole="button"');
  expect(close).toContain('name="close"');
});

test('premium restyle preserves share telemetry without a pearl claim action', () => {
  expect(modal).toContain('buildAchievementShareMessage(lang, name, STORE_URL)');
  expect(modal).toContain('Share.share({ message: msg })');
  // зачем (разбор красных 15.10): 258cde253 (R56) убрал мёртвый checkAchievements('achievement_shared') — такого события нет в
  // FOUNDATION_ACHIEVEMENT_EVENT_TYPES; телеметрия «поделился» теперь журнал [ACH-SHARE]. Жемчужины за «поделиться» по-прежнему нет.
  expect(modal).toContain('[ACH-SHARE] итог action=');
  expect(modal).not.toContain("checkAchievements({ type: 'achievement_shared'");
  expect(modal).not.toContain('onShardClaimed');
  expect(modal).not.toContain('claimAchievementShardReward');
  expect(modal).not.toContain('+1 жемчужина');
});
