import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: владелец 2026-09-29 — перенос четырёх окон достижений/опроса/карточек на
// Liquid Glass «1 в 1 с макета» (overlays-specialist.html OS-ACHIEVEMENT-NOTIF-*,
// OS-SURVEY-*; overlays-more.html OM-ACHIEVEMENT-*, OM-CARD-*). Контракт — только вид;
// пропсы, обработчики, аналитика и награды остаются как были.
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const between = (src, from, to) => {
  const a = src.indexOf(from);
  assert.ok(a >= 0, `нет начала блока: ${from}`);
  const b = to ? src.indexOf(to, a + from.length) : src.length;
  assert.ok(b > a, `нет конца блока: ${to}`);
  return src.slice(a, b);
};
const noThickBorders = (block, name) => {
  assert.doesNotMatch(block, /borderWidth:\s*(?:[2-9]|1[0-9])\b/, `${name}: нет обводок толще 1px`);
  assert.doesNotMatch(block, /borderColor:\s*(?:t\.|`|['"]#)/, `${name}: нет цветных обводок`);
  assert.doesNotMatch(block, /adjustsFontSizeToFit/, `${name}: нет ужатия шрифта`);
};

test('AchievementNotifModal (lesson_complete) is opaque Liquid Glass with neutral CTA and unchanged actions', () => {
  const src = read('../app/lesson_complete.tsx');
  const block = between(src, 'function AchievementNotifModal', 'export default function LessonComplete');
  assert.ok(block.includes('liquidGlassTokens(liquidGlassThemeId)'), 'токены активной из 13 тем');
  assert.ok(block.includes('glass.opaqueSheet'), 'непрозрачная основа окна');
  assert.ok(block.includes('glass.accent') && block.includes('glass.accentInk'), 'нейтральный CTA темы');
  assert.doesNotMatch(block, /t\.correct|t\.accent|glassFill/, 'нет старого зелёного/акцентного стиля и glassFill');
  noThickBorders(block, 'AchievementNotifModal');
  assert.ok(block.includes('minHeight: 44') || block.includes('minHeight: 48'), 'области нажатия >= 44');
  assert.ok(block.includes('await Share.share({ message: shareMessage() })'), 'шаринг сохранён');
  assert.ok(block.includes('buildCelebrationShareBody(notif.kind'), 'текст шаринга сохранён');
  assert.ok(block.includes('hapticTap(); dismiss();'), 'закрытие сохранено');
  assert.ok(block.includes("notif.kind === 'lesson_unlock'") && block.includes("notif.kind === 'level_exam_unlock'"), 'виды уведомления сохранены');
  assert.match(src, /<AchievementNotifModal[\s\S]{0,400}onDismiss=/, 'вызов с onDismiss сохранён');
});

test('SurveyRewardPanel uses Liquid Glass tokens and has no pearl reward (pearls removed 2026-09-30)', () => {
  const src = read('../components/survey/SurveyRewardPanel.tsx');
  assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(src.includes('glass.accent') && src.includes('glass.accentInk'), 'CTA «Готово» нейтральный');
  assert.doesNotMatch(src, /t\.accent|t\.correctText|t\.accentBg|TonalSurface/, 'нет старого стиля');
  noThickBorders(src, 'SurveyRewardPanel');
  for (const id of ['survey-reward-panel', 'survey-pending-accepted', 'survey-completion-check', 'survey-retry', 'survey-back', 'survey-done', 'survey-reward-error']) {
    assert.ok(src.includes(id), `testID ${id} на месте`);
  }
  for (const h of ['onDone', 'onRetry', 'onBack', 'onFollowUp']) assert.ok(src.includes(h), `${h} на месте`);
  // зачем (решение владельца 2026-09-30): жемчуг удалён полностью — ни ассета, ни «+N жемчужина».
  for (const gone of ['survey-reward-shard-asset', 'survey-reward-amount', 'oskolok', 'SHARD_REWARDS', 'useSurveyRewardImpact']) {
    assert.ok(!src.includes(gone), `pearl reward piece ${gone} removed`);
  }
  assert.ok(src.includes('SURVEY_PURPLE_TONE'), 'экспорт цвета награды сохранён');
});

test('AchievementModal (achievements_screen) is an opaque glass dossier without gradients or hex colors', () => {
  const src = read('../app/achievements_screen.tsx');
  const block = between(src, 'function AchievementModal', '// ── Секция-аккордеон');
  assert.ok(block.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(block.includes('glass.opaqueSheet'));
  assert.doesNotMatch(block, /LinearGradient/, 'нет градиентов');
  assert.doesNotMatch(block, /#[0-9a-fA-F]{6}\b/, 'нет hex-цветов (кроме rgba-подложки)');
  noThickBorders(block, 'AchievementModal');
  assert.doesNotMatch(block, /borderWidth:\s*StyleSheet\.hairlineWidth/, 'без обводок-контейнеров');
  for (const id of ['achievement-award-dossier', 'achievement-dossier-hero', 'achievement-dossier-description', 'achievement-dossier-condition', 'achievement-share-primary', 'achievement-close-secondary']) {
    assert.ok(block.includes(id), `testID ${id}`);
  }
  assert.ok(block.includes('buildAchievementShareMessage(lang, name, STORE_URL)'));
  assert.ok(block.includes("checkAchievements({ type: 'achievement_shared', studyTarget })"));
  assert.ok(block.includes('<ScrollView'), 'прокрутка для крупного шрифта');
  assert.ok(src.includes('<AchievementModal'), 'вызов на месте');
});

test('CardDetailModal (collectibles_screen) is Liquid Glass with prev/next and audio preserved', () => {
  const src = read('../app/collectibles_screen.tsx');
  const block = between(src, 'function CardDetailModal', '/* ── экран');
  assert.ok(block.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(block.includes('glass.bg') || block.includes('glass.opaqueSheet'));
  noThickBorders(block, 'CardDetailModal');
  assert.doesNotMatch(block, /borderWidth/, 'без обводок');
  assert.doesNotMatch(block, /t\.textPrimary|t\.bgCard|t\.border\b/, 'нет старых токенов темы');
  assert.ok(block.includes('onNavigate(siblings[index - 1])') && block.includes('onNavigate(siblings[index + 1])'));
  assert.ok(block.includes('speak(en)') && block.includes('speak(ex)'));
  assert.ok(block.includes('accessibilityLabel') && block.includes('accessibilityState'), 'доступность кнопок');
  assert.ok(block.includes('onRequestClose={onClose}'));
  assert.match(src, /<CardDetailModal[\s\S]{0,200}onNavigate=/);
});
