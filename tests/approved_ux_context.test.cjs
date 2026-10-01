const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('remaining contextual explanations preserve the existing controls', () => {
  const friends = read('app/(tabs)/friends.tsx');
  assert.ok(friends.includes('Зов доступен только друзьям'));
  assert.ok(friends.includes('Друг уже получил максимум зовов на сегодня'));
  assert.ok(read('app/settings_notifications.tsx').includes('Проверь разрешение в настройках телефона'));
  // 30.09: «Личный план» снят целиком (970f8e7b8) — его объяснение больше некому сохранять.
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'app/personal_plan.tsx')), false);
  // 30.09: шторка практики ошибок удалена вместе с мёртвым входом (ccfc43a1c) — объяснять больше негде.
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'components/mistake-practice/MistakePracticeSetupSheet.tsx')), false);
  assert.ok(read('app/mistake_practice_intro_copy.ts').includes('Это практика, а не пересдача'));
  assert.ok(read('app/feature_intro_copy.ts').includes("id: 'mistake_practice_help'"));
  const mic = read('app/flashcards/SpeakHoldButton.tsx');
  assert.ok(!mic.includes('accessibilityLabel={`qa-${testID}`}'));
  assert.ok(mic.includes('accessibilityHint='));
  assert.ok(mic.includes("'#07110A'"));
  const speaking = read('app/flashcards_speaking_session.tsx');
  assert.ok(speaking.includes('<SpeakingTaskHint>'));
  assert.ok(!speaking.includes('accessibilityLabel="qa-fc-speak-'));
  const hint = read('app/flashcards/SpeakingTaskHint.tsx');
  assert.ok(hint.includes('testID="fc-speak-task-hint"'));
  assert.ok(hint.includes('maxHeight: slotHeight'));
  assert.ok(hint.includes('<ScrollView'));
});
test('setup explanation distinguishes loading, failed, empty, unselected and selected decks', () => {
  const ts = require('typescript');
  const vm = require('node:vm');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read('app/flashcards/training_setup_explanation.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  const explain = exports.trainingSetupExplanation;
  const labels = { loading: 'loading', error: 'choose', empty: 'empty', unselected: 'select' };
  assert.equal(explain('loading', 0, '', labels), 'loading');
  assert.equal(explain('error', 0, '', labels), 'choose');
  assert.equal(explain('ready', 0, '', labels), 'empty');
  assert.equal(explain('ready', 3, '', labels), 'select');
  assert.equal(explain('ready', 3, '2 packs · 20 cards', labels), '2 packs · 20 cards');
});
test('training setup does not call existing packs empty merely because nothing is selected', () => {
  assert.ok(read('app/flashcards_training_setup.tsx').includes('trainingSetupExplanation('));
});
test('voice controls announce user-facing labels and retain QA testIDs', () => {
  const voice = read('app/flashcards_voice_picker.tsx');
  assert.ok(!voice.includes('accessibilityLabel={`qa-fc-voice-rate-'));
  assert.ok(voice.includes('testID={`fc-voice-rate-${p.key}`}'));
  assert.ok(voice.includes('accessibilityState={{ selected: active }}'));
});
// зачем: PM-171 — app/ideas_submit.tsx удалён вместе с разделом «Идеи», UX-контракт
// на его тексты снят вместе с экраном.
test('approved empty shelves and learning settings explain the next action', () => {
  assert.ok(read('app/achievements_screen.tsx').includes('Здесь будут твои награды. Занимайся'));
  assert.ok(read('app/flashcards_my_packs.tsx').includes('кнопкой «+» внизу'));
  assert.ok(read('app/settings_edu.tsx').includes('Выключи, если хочешь остановиться'));
});
test('support placeholder contains a reproducible example rather than abstract questions', () => {
  assert.ok(read('app/support_report.tsx').includes('Например: в «Карточках» нажимаю'));
});
test('swipe explanation waits for the reader instead of expiring after six seconds', () => {
  assert.ok(!read('app/flashcards_swipe.tsx').includes('setTimeout(() => dismissSwipeHint(), 6000)'));
});
test('the retired home cards cannot render or run their pulse; manual guide is the replacement', () => {
  assert.ok(read('app/home_feature_tips.ts').includes('HOME_FEATURE_TIPS_ON_HOME = false'));
  const home = read('app/(tabs)/home.tsx');
  assert.ok(home.includes('const shouldPulse = HOME_FEATURE_TIPS_ON_HOME &&'));
  assert.ok(home.includes('const homeFeatureTipCardVisible = HOME_FEATURE_TIPS_ON_HOME &&'));
  // 30.09: отдельное условие показа несёт флаг само (снимок 0217c4a21 его снимал — возвращено).
  assert.ok(home.includes('const showHomeFeatureTipCard = HOME_FEATURE_TIPS_ON_HOME &&'));
});
test('approved recovery copy explains causes and a way back without promises of future content', () => {
  for (const [file, copy] of [
    ['app/flashcards_blitz_session.tsx', 'Для блица нужны хотя бы 4 карточки'],
    ['app/pack_opening.tsx', 'Не удалось открыть набор. Вернись назад'],
    ['app/flashcards/SessionResultScreen.tsx', 'Тренировка завершена'],
    // 30.09: personal_plan_theory удалён вместе с «Личным планом» (970f8e7b8).
    ['app/survey_screen.tsx', 'Можно вернуться в приложение'],
    // 01.10: описание «Устно» сокращено по скрину владельца — строка про паузу убрана.
  ]) assert.ok(read(file).includes(copy), file);
});
