import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const speaking = read('components/SpeakingPanel.tsx');
const lesson = read('app/lesson1.tsx');
const review = read('components/LessonReviewSheet.tsx');
const ceremony = read('components/level_up/LevelUpMintCeremony.tsx');
const cert = read('components/CertificateNameModal.tsx');
const picker = read('app/flashcards/PackLanguagePicker.tsx');

const OLD_HEX = /#d4a017|#FFD700|#B8860B/i;
const thickBorder = (src) => /border(Top|Bottom|Left|Right)?Width:\s*(1\.5|[2-9])\b/.test(src);

test('SpeakingPanel modal surface reads Liquid Glass tokens and keeps semantic verdict colors', () => {
  assert.ok(speaking.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(speaking.includes('card: glass.opaqueSheet'));
  assert.ok(speaking.includes('accent: glass.cta') && speaking.includes('onAccent: glass.ctaInk'));
  assert.ok(speaking.includes('mTheme.correct') && speaking.includes('mTheme.wrong'), 'correct/wrong semantics kept');
  assert.ok(!speaking.includes('borderColor: mTheme.border'), 'no container border on the modal card');
  assert.ok(!speaking.includes('adjustsFontSizeToFit'));
  assert.ok(speaking.includes('onFillAnswer?.(targetText)') && speaking.includes('onClose'), 'handlers intact');
});

test('lesson review modal is the glass sheet with the same handlers', () => {
  assert.ok(lesson.includes('<LessonReviewSheet'));
  for (const h of ['onClose={closeReview}', 'onPrev={reviewGoPrev}', 'onNext={reviewGoNext}', 'onPlay={onPlayReviewAudio}']) {
    assert.ok(lesson.includes(h), h);
  }
  assert.ok(!lesson.includes('visible={reviewOpen} transparent'), 'old inline Modal removed');
  assert.ok(review.includes('liquidGlassTokens(liquidGlassThemeId)'));
  // зачем (Motion п.8, learn.html D9): фон и движение шторки даёт KitSheetModal (.sheet кита, glass.opaqueSheet внутри).
  assert.ok(review.includes('<KitSheetModal') && review.includes('glass.opaqueControl'));
  assert.ok(!/borderWidth|borderColor/.test(review) && !thickBorder(review));
  assert.ok(!review.includes('adjustsFontSizeToFit') && !OLD_HEX.test(review));
  assert.ok(review.includes('minWidth: 44') && review.includes('width: 44, height: 44'), 'touch targets >= 44');
});

test('level-up ceremony CTA uses theme tokens; queue/logic untouched', () => {
  assert.ok(ceremony.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(ceremony.includes('backgroundColor: glass.accent') && ceremony.includes('color: glass.accentInk'));
  assert.ok(ceremony.includes('{copy.newLevel}'), 'eyebrow from the mockup');
  assert.ok(ceremony.includes('onPress={finish}') && ceremony.includes('onPress={skip}'));
  assert.ok(!ceremony.includes('adjustsFontSizeToFit') && !thickBorder(ceremony));
});

test('certificate name modal has no gold or borders and keeps its props', () => {
  assert.ok(cert.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(!OLD_HEX.test(cert), 'no gold hex');
  assert.ok(!/borderWidth|borderColor/.test(cert), 'no borders');
  assert.ok(!cert.includes('adjustsFontSizeToFit'));
  for (const p of ['onSave', 'onSkip', 'initialName', 'motionVariant', 'HybridAlertShell', 'sanitizeCertName']) assert.ok(cert.includes(p), p);
});

test('pack language picker is a borderless glass menu with the same public props', () => {
  assert.ok(picker.includes('liquidGlassTokens(liquidGlassThemeId)'));
  assert.ok(picker.includes('g.opaqueSheet') && picker.includes('g.buttonFill')); // зачем (владелец 13.10, №35): кнопка-триггер языка на токене кнопок buttonFill, а не на слабом opaqueControl
  assert.ok(!/borderWidth|borderColor/.test(picker), 'no borders');
  assert.ok(!picker.includes('adjustsFontSizeToFit'));
  assert.ok(picker.includes('liquidGlass?: boolean'), 'callers passing liquidGlass still typecheck');
  for (const p of ['onChange(item.code)', 'disabled', 'testID="pack-language-picker"', 'accessibilityState={{ selected }}']) assert.ok(picker.includes(p), p);
  assert.ok(picker.includes('hitSlop={4}') && picker.includes('minHeight: 48'), 'targets >= 44');
});
