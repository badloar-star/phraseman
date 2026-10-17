import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const source = normalizeEol(readFileSync('components/ReviewPromptModal.tsx', 'utf8'));

assert.match(
  source,
  /const bottomSheet = context === 'perfect_lesson' \|\| context === 'level_exam_pass';/,
  'the two live review contexts must use the bottom sheet layout',
);
assert.match(source, /useStableSafeAreaInsets\(\)/, 'sheet must read stable safe-area insets');
assert.match(source, /top: topInset, bottom: bottomInset/, 'sheet needs top and bottom inset geometry');
assert.match(source, /useWindowDimensions\(\)/, 'short viewports need measured bounds');
assert.match(source, /testID="review-prompt-grabber"/, 'bottom sheet needs a visible grabber');
assert.match(source, /import HybridSheetShell from '\.\/modal_fx\/HybridSheetShell';/, 'hybrid sheets must retain their dedicated shell');
assert.match(source, /if \(bottomSheet && isHybrid\) \{[\s\S]*?<HybridSheetShell[\s\S]*?material="liquid-glass"/, 'hybrid bottom sheets must use Liquid Glass shell material');
assert.match(source, /<HybridSheetShell[\s\S]*?closeLabel=\{variant\.btnNo\}/, 'hybrid sheet dismissal must retain localized close copy');
assert.match(source, /maxHeight: bottomSheet \? sheetMaxHeight/, 'the sheet must be bounded by its safe viewport');
assert.match(source, /testID="review-prompt-scroll-content"/, 'long copy must have its own scroll region');
assert.match(source, /const panelActions = \(/, 'actions must be outside the scrolling content');
assert.match(source, /<ScrollView[^>]*testID="review-prompt-scroll-content"/, 'scroll is explicit rather than implicit shell behavior');
assert.ok(
  source.indexOf('testID="review-prompt-scroll-content"') < source.indexOf('{panelActions}'),
  'CTA and later action must render after the scroll region so they remain fixed',
);
assert.doesNotMatch(source, /borderWidth:/, 'the review sheet must not reintroduce a gross panel outline');
assert.match(source, /const storeCta = triLang\(lang, \{/, 'store CTA must be localized');
assert.match(source, /const ratingAccessibilityLabel = triLang\(lang, \{/, 'decorative star label must be localized');
const storeCtaBlock = source.match(/const storeCta = triLang\(lang, \{([\s\S]*?)\n  \}\);/);
const ratingLabelBlock = source.match(/const ratingAccessibilityLabel = triLang\(lang, \{([\s\S]*?)\n  \}\);/);
assert.ok(storeCtaBlock, 'store CTA localization block must be present');
assert.ok(ratingLabelBlock, 'star accessibility localization block must be present');
for (const language of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
  assert.match(storeCtaBlock[1], new RegExp(`${language}:`), `missing ${language} store CTA`);
  assert.match(ratingLabelBlock[1], new RegExp(`${language}:`), `missing ${language} star label`);
}
assert.match(source, /const storeName = Platform\.OS === 'ios' \? 'App Store' : 'Google Play';/, 'store labels must match the platform');
assert.doesNotMatch(source, /const bottomSheet = false;/, 'review contexts must not remain forced centered');
assert.match(source, /void markReviewPrompted\(\)/, 'prompt lifecycle must remain unchanged');
// зачем (17.10, R58 #55 3080d1805): «оценено» отмечается только если стор действительно открылся — без ложного «оценено»
assert.match(source, /const opened = await openStoreReviewPage\(\);[\s\S]{0,200}?if \(opened\) await markReviewRated\(\);/, 'rate marks the review only after the store actually opened');
