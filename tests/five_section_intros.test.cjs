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
  ['ideas_first_visit', undefined, 'app/ideas_catalog.tsx'],
  ['spin_first_visit', undefined, 'app/level_reward_spin.tsx'],
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
test('all approved explanations are registered and wired at their real entry owners', () => {
  assert.match(read('app/feature_intro_registry.ts'), /\.\.\.SECTION_FEATURE_INTROS/);
  for (const [id, , path] of routes) assert.ok(read(path).includes(id), `${path} must own ${id}`);
  assert.match(read('components/DailyPhraseCard.tsx'), /useRequestedFeatureIntro/);
});
test('daily phrase hands off after native dismissal and preserves widget links', () => {
  const source = read('components/DailyPhraseCard.tsx');
  assert.ok(source.includes('introActive && !detailsVisible'));
  assert.ok(source.includes('onDismissed={dailyIntro.finish}'));
  assert.ok(source.includes('onDone={dailyIntro.close}'));
  assert.ok(source.includes('if (detailsVisible) {\n      handledDeepLinkRef.current = linkKey;') || source.includes('if (detailsVisible) {\r\n      handledDeepLinkRef.current = linkKey;'));
  assert.ok(source.includes('handledDeepLinkRef.current = pendingDeepLinkRef.current'));
  assert.ok(source.includes('spokenDeepLinkRef.current = linkKey'));
});
test('friends explanation yields to incoming and confirmation modals', () => {
  const entry = read('app/(tabs)/friends.tsx').split('\n').find(line => line.includes('id="friends_first_visit"'));
  for (const name of ['friendQuestStarted', 'friendQuestCompleted', 'studyInvite', 'deleteTarget', 'incomingGiftModal', 'levelUpModal']) {
    assert.ok(entry?.includes(`!${name}`), name);
  }
});
