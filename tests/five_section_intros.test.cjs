const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = p => fs.readFileSync(p, 'utf8');
const routes = [
  ['cards_hub_first_visit', 'orbit', 'app/flashcards/FlashcardsHubScreen.tsx'],
  ['statistics_first_visit', 'orbit', 'app/streak_stats.tsx'],
  ['daily_phrase_first_visit', 'orbit', 'components/DailyPhraseCard.tsx'],
  ['videos_first_visit', 'premiere', 'app/lingman_videos.tsx'],
  ['friends_first_visit', 'orbit', 'app/(tabs)/friends.tsx'],
  ['legacy_lessons_first_visit', 'orbit', 'app/(tabs)/lessons.tsx'],
  ['profile_card_first_visit', undefined, 'app/(tabs)/home.tsx'],
  // зачем: PM-171 — 'ideas_first_visit' удалена вместе с разделом «Идеи» (app/ideas_catalog.tsx больше не существует).
];
test('approved explanations have complete localized copy and selected families', () => {
  assert.ok(fs.existsSync('app/feature_intro_sections_copy.ts'), 'section explanations are missing');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read('app/feature_intro_sections_copy.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: p => { assert.equal(p, '../constants/i18n'); return { triLang: (lang, texts) => texts[lang] }; },
  });
  const defs = exports.SECTION_FEATURE_INTROS;
  assert.equal(defs.length, routes.length);
  for (const [id, family] of routes) {
    const def = defs.find(d => d.id === id);
    assert.ok(def, id); assert.equal(def.family, family); assert.equal(def.trigger, 'first_visit');
    for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      for (const field of ['title', 'body', 'ctaLabel']) assert.ok(def[field](locale)?.trim(), `${id} ${locale} ${field}`);
    }
  }
});
test('statistics explanation does not promise XP', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read('app/feature_intro_sections_copy.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: p => { assert.equal(p, '../constants/i18n'); return { triLang: (lang, texts) => texts[lang] }; },
  });
  const statistics = exports.SECTION_FEATURE_INTROS.find(d => d.id === 'statistics_first_visit');
  assert.ok(statistics);
  for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    assert.doesNotMatch(statistics.body(locale), /XP|опыт|досвід/u, `statistics ${locale} must not promise XP`);
  }
});
test('sections open directly and Peak retains its first-visit tour', () => {
  for (const [id, , path] of routes) {
    assert.doesNotMatch(read(path), /FeatureIntroEntry|FeatureIntroModal|useRequestedFeatureIntro/, path);
    assert.ok(!read(path).includes(id), path);
  }
  for (const path of ['app/flashcards_training_setup.tsx', 'app/flashcards_swipe.tsx']) {
    assert.doesNotMatch(read(path), /FeatureIntroEntry|FeatureIntroModal|showSwipeHint/, path);
  }
  assert.match(read('components/spire/peak/PeakScreenV2.tsx'), /tourOn \? <PeakTourFull/);
});
test('daily phrase opens directly and keeps widget playback', () => {
  const source = read('components/DailyPhraseCard.tsx');
  assert.match(source, /handledDeepLinkRef\.current = linkKey;\s+setDetailsVisible\(true\);/);
  assert.match(source, /spokenDeepLinkRef\.current = linkKey/);
  assert.match(source, /if \(!detailsRuntimeActiveRef\.current\) return;[\s\S]+?setDetailsVisible\(true\);/);
});
