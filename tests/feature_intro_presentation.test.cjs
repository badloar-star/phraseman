const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('AI explanation stays inside the existing explicit consent sheet', () => {
  const dialog = read('components/AiDialogConsentModal.tsx');
  assert.ok(dialog.includes('illustration={<DialogueComicStage />}'));
  assert.ok(dialog.includes('introduction={introduction}'));
  assert.ok(dialog.includes('Твои сообщения будут отправляться в OpenAI, чтобы собеседник отвечал.\\n\\nМожно выключить в настройках в любой момент.'));
  assert.ok(dialog.includes('onAccept={previewOnly ? closePreview : onAccept}'));
  assert.ok(dialog.includes('onDecline={previewOnly ? closePreview : onDecline}'));
  assert.ok(!dialog.includes('markFeatureIntroSeen'));
  const hybrid = read('components/AiConsentSheetModalHybrid.tsx');
  assert.ok(hybrid.includes('<ScrollView'));
  assert.ok(hybrid.indexOf('</ScrollView>') < hybrid.indexOf('<AcceptButton label='));
  assert.ok(hybrid.indexOf('</ScrollView>') < hybrid.indexOf('>{body}</Text>'));
});

test('the shipped intro uses the approved artwork stage, scrollable explanation and native dismiss handoff', () => {
  const modal = read('components/FeatureIntroModal.tsx');
  assert.match(modal, /<FeatureIntroStage/);
  assert.match(modal, /<ScrollView/);
  assert.match(modal, /onDismissed=/);
  assert.match(modal, /requestDismiss/);
  assert.match(modal, /family/);
});

test('Arena explicitly selects premiere without replacing the account-scoped once-only hook', () => {
  const source = read('components/arena/ArenaHubSurface.tsx');
  assert.match(source, /useFeatureIntro\('arena_first_visit', active\)/);
  assert.match(source, /family=\{arenaIntroDef.family\}/);
  assert.match(read('app/feature_intro_registry.ts'), /ru: 'Открыть Арену'/);
});

test('League uses a short intro and retains manually opened rules with weekly-result priority', () => {
  const source = read('app/club_screen.tsx');
  assert.match(source, /<FeatureIntroModal/);
  assert.match(source, /<LeagueRulesSheet/);
  assert.match(source, /league-rules-help/);
  assert.match(source, /leagueIntroVisible && runtimeActive && !pendingLeagueResult/);
  assert.ok(!source.includes('secondaryLabel={featureIntroRules(lang)}'));
});

test('owner-approved wording has no rules referral or redundant speaker explanation', () => {
  const copy = read('app/feature_intro_copy.ts');
  assert.ok(!copy.includes('Условия повышения и понижения всегда можно открыть в правилах.'));
  assert.ok(!copy.includes('Динамик озвучит фразу.'));
});

test('settings replay lists explanations without resetting first-visit state', () => {
  const source = read('app/feature_guide.tsx');
  assert.match(read('app/(tabs)/settings.tsx'), /settings-feature-guide-row/);
  assert.match(source, /FEATURE_INTRO_REGISTRY/);
  assert.match(source, /<FeatureIntroModal/);
  assert.doesNotMatch(source, /resetAllFeatureIntrosSeen|multiRemove|markFeatureIntroSeen|shouldShowFeatureIntro/);
});
test('the first dismissal owns the action even if another CTA is tapped during exit', () => {
  const modal = read('components/FeatureIntroModal.tsx');
  assert.ok(modal.includes('if (dismissRequested.current) return;'));
  assert.ok(modal.includes('onDismissRequested={() => { dismissRequested.current = true; }}'));
});
test('training entry offers selected mode explanations only after access and content are ready', () => {
  const setup = read('app/flashcards_training_setup.tsx');
  assert.ok(setup.includes('<FeatureIntroEntry'));
  assert.ok(setup.includes("accessResolved && quotaPreview.status === 'allowed' && loadState === 'ready'"));
  assert.ok(setup.includes('key={mode}'));
});
test('manual guide closes on blur and swipe copy does not invent visible button labels', () => {
  assert.ok(read('app/feature_guide.tsx').includes('if (!active) setSelected(null)'));
  assert.ok(!read('app/feature_intro_copy.ts').includes('действия подписаны на кнопках'));
});
