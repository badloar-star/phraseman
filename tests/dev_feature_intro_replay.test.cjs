const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = p => fs.readFileSync(p, 'utf8');
function load(dev, store) {
  const exports = {};
  const source = read('app/feature_intro_dev_replay.ts');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => name === 'react' ? { useSyncExternalStore: () => {} } : name === './config' ? { ENABLE_DEV_TOOLS: dev, IS_STORE_RELEASE: store } : (() => { throw Error(name); })(),
  });
  return exports;
}
test('DEV replay starts off, toggles without persistence and notifies once per change', () => {
  const api = load(true, false); let changes = 0;
  const off = api.subscribeDevFeatureIntroReplay(() => changes++);
  assert.equal(api.isDevFeatureIntroReplayEnabled(), false);
  api.setDevFeatureIntroReplay(true); api.setDevFeatureIntroReplay(true);
  assert.equal(api.isDevFeatureIntroReplayEnabled(), true); assert.equal(changes, 1);
  api.setDevFeatureIntroReplay(false); assert.equal(changes, 2); off();
  api.setDevFeatureIntroReplay(true); assert.equal(changes, 2);
  assert.equal(load(true, false).isDevFeatureIntroReplayEnabled(), false);
});
test('replay cannot be enabled outside DEV or in a store build', () => {
  for (const [dev, store] of [[false, false], [false, true], [true, true]]) {
    const api = load(dev, store); api.setDevFeatureIntroReplay(true);
    assert.equal(api.isDevFeatureIntroReplayEnabled(), false);
  }
});
test('registry bypass does not erase the ordinary once-only history', () => {
  const source = read('app/feature_intro_registry.ts');
  assert.ok(source.includes('if (isDevFeatureIntroReplayEnabled()) return true;'));
  assert.ok(source.includes('if (isDevFeatureIntroReplayEnabled()) return;'));
  assert.ok(!read('app/feature_intro_dev_replay.ts').includes('AsyncStorage'));
});
test('DEV switch and every custom owner are wired without resetting consent', () => {
  const hub = read('components/dev/DevHubSheet.tsx');
  assert.ok(hub.includes('testID="dev-intro-replay-toggle"'));
  assert.ok(hub.includes('accessibilityState={{ checked: devIntroReplay }}'));
  for (const file of ['hooks/use_feature_intro.ts', 'app/club_screen.tsx', 'app/flashcards_swipe.tsx', 'components/AiDialogConsentModal.tsx']) {
    assert.ok(read(file).includes('useDevFeatureIntroReplay'), file);
  }
  const ai = read('components/AiDialogConsentModal.tsx');
  assert.ok(ai.includes('onAccept={previewOnly ? closePreview : onAccept}'));
  assert.ok(ai.includes('onDecline={previewOnly ? closePreview : onDecline}'));
  assert.ok(!ai.includes('setAiDialogConsent'));
});
