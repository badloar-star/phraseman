import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// зачем: тренировки карточек 1 в 1 по макету practice.html — общая шапка занятия
// (круглая «‹» в области 44 dp, заголовок 20/700, пилюля таймера, отметка верно/неверно)
// живёт в components/practice/PracticeChrome.tsx и подключена во всех режимах.
const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');
const chrome = read('components', 'practice', 'PracticeChrome.tsx');
const modes = {
  blitz: read('app', 'flashcards_blitz_session.tsx'),
  recall: read('app', 'flashcards_recall_session.tsx'),
  speaking: read('app', 'flashcards_speaking_session.tsx'),
  swipe: read('app', 'flashcards_swipe.tsx'),
};

assert.match(chrome, /PRACTICE_TOUCH = 44/);
assert.match(chrome, /PRACTICE_ROUND = 34/);
assert.match(chrome, /fontSize: 20, lineHeight: 26, fontWeight: '700'/);
assert.match(chrome, /minHeight: 38, borderRadius: 19, paddingHorizontal: 24/);
assert.doesNotMatch(chrome, /borderWidth: [2-9]|adjustsFontSizeToFit/);
assert.match(chrome, /StyleSheet\.hairlineWidth/);
assert.ok(chrome.split('\n').length <= 400);

for (const [name, source] of Object.entries(modes)) {
  assert.match(source, /components\/practice\/PracticeChrome/, `${name} uses the shared practice chrome`);
  assert.match(source, /<PracticeBackButton/, `${name} uses the round back button`);
}
// зачем (PM-129, координатор 03.10): у Блица кнопки выбора наборов в шапке больше нет — наборы
// выбираются на экране настройки (D152), а на её месте стоит плашка монет из practice.html.
for (const name of ['recall', 'speaking']) {
  assert.match(modes[name], /<PracticeRoundIconButton/, `${name} deck picker button is round`);
}
for (const name of ['blitz', 'recall', 'speaking']) {
  assert.match(modes[name], /<PracticeHeaderTitle/, `${name} title uses 20/700`);
}
assert.doesNotMatch(modes.blitz, /testID="fc-blitz-pick-decks"/);
assert.match(modes.blitz, /<PracticeTimerPill/);
assert.match(modes.blitz, /<PracticeAnswerMark kind=\{state\}/);
assert.match(modes.blitz, /testID="fc-blitz-timer"/);
assert.match(modes.blitz, /disabled=\{locked\}/);
assert.match(modes.swipe, /<PracticeHeaderTitle glass=\{swipeGlass\} title=\{title\} subtitle=\{subtitle\}/);

// ── Второй проход (владелец 2026-09-30): служебные состояния, строка прогресса, кнопки, карточки.
const states = read('components', 'practice', 'PracticeStates.tsx');
const setup = read('app', 'flashcards_training_setup.tsx');
assert.ok(states.split('\n').length <= 400, 'PracticeStates stays a small presentational file');
assert.doesNotMatch(states, /adjustsFontSizeToFit|numberOfLines|borderWidth: [2-9]/);
assert.match(states, /minHeight: 48, borderRadius: 24/, '.cta 48/24');
assert.match(states, /minHeight: 44, borderRadius: 22/, '.cta.sm keeps a 44 dp touch target');
assert.match(states, /width: 61, height: 61, borderRadius: 16/, 'state tile 61/16');
assert.match(states, /track: \{ height: 6, borderRadius: 3/, 'progress track 6 px');
assert.match(states, /fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: \['tabular-nums'\]/, '.prog labels 16/700 D145');
assert.match(states, /borderRadius: 16, borderWidth: StyleSheet\.hairlineWidth/, '.qc radius 16 with a 1 px edge');

// Пусто / мало карточек / ошибка загрузки / данные тренировки не открылись — единая панель.
for (const [name, source, ids] of [
  ['blitz', modes.blitz, ['fc-blitz-quota-retry', 'fc-blitz-pick-decks-empty', 'fc-blitz-too-few']],
  ['recall', modes.recall, ['fc-recall-pick-decks-empty', 'fc-recall-empty']],
  ['speaking', modes.speaking, ['fc-speak-quota-retry', 'fc-speak-pick-decks-empty', 'fc-speak-empty']],
  ['swipe', modes.swipe, ['flashcards-swipe-no-cards', 'flashcards-swipe-reload']],
]) {
  assert.match(source, /components\/practice\/PracticeStates/, `${name} imports shared states`);
  assert.match(source, /<PracticeStatePanel/, `${name} uses the state panel`);
  for (const id of ids) assert.ok(source.includes(id), `${name} keeps ${id}`);
}
// Действия служебных состояний прежние.
assert.match(modes.blitz, /onPress: retryQuotaStart,[\s\S]{0,80}testID: 'fc-blitz-quota-retry'/);
assert.match(modes.blitz, /onPress: openDeckPicker,[\s\S]{0,80}testID: 'fc-blitz-pick-decks-empty'/);
assert.match(modes.speaking, /onPress: retryQuotaStart,[\s\S]{0,80}testID: 'fc-speak-quota-retry'/);
assert.match(modes.speaking, /onPress: openDeckPicker,[\s\S]{0,80}testID: 'fc-speak-pick-decks-empty'/);
assert.match(modes.recall, /onPress: openDeckSetup/);
assert.doesNotMatch(modes.recall, /fc-recall-load-error/);
assert.match(modes.swipe, /onPress: \(\) => void loadSources\(\)/);

// Загрузка без спиннера — скелет той же геометрии.
assert.doesNotMatch(modes.recall, /ActivityIndicator/);
assert.match(modes.recall, /testID="fc-recall-loading"/);
assert.doesNotMatch(setup.slice(setup.indexOf('fc-training-setup-loading'), setup.indexOf('fc-training-setup-loading-row-')), /<ActivityIndicator/);

// «Вспомни»: карточка `.qc`, поле `.inp` 56/14, «Подсказка» под полем, `.cta` «Проверить» / «Продолжить →».
assert.match(modes.recall, /minHeight: 140, borderRadius: 16/);
assert.match(modes.recall, /compactInputShell: \{ minHeight: 56, marginTop: 22, borderRadius: 14/);
assert.match(modes.recall, /borderColor: recallGlass\.glassEdge/);
assert.match(modes.recall, /<PracticeCta[\s\S]{0,120}testID="fc-recall-check"[\s\S]{0,120}disabled=\{!canCheck\}[\s\S]{0,40}onPress=\{checkAnswer\}/);
assert.match(modes.recall, /<PracticeCta[\s\S]{0,120}testID="fc-recall-continue"[\s\S]{0,80}trailingArrow/);
assert.ok(modes.recall.indexOf('testID="fc-recall-input"') < modes.recall.indexOf('testID="fc-recall-hint"'), 'hint sits under the input');
assert.match(modes.recall, /<PracticeProgressRow[\s\S]{0,200}left=\{totalCards > 0 \? String\(masteredCount\) : ''\}/);

// «Устно»: прогресс «позиция … всего» под полосой, задания — пилюли с подписью, стороны — тон стекла.
assert.match(modes.speaking, /testID="fc-speak-progress"/);
assert.match(modes.speaking, /\{progress\.position\}<\/Text>/);
assert.match(modes.speaking, /styles\.taskPill/);
assert.match(modes.speaking, /\{optionLabel\}/);
assert.match(modes.speaking, /taskPill: \{[\s\S]{0,60}minHeight: 44/);

// «Правда / ложь»: карточка радиус 16 с кромкой, круги 88, вердикт 16/600, «Продолжить →».
assert.match(modes.swipe, /trueFalseCard: \{\s*borderRadius: 16,/);
assert.match(modes.swipe, /trueFalseAnswer: \{\s*width: 88,\s*height: 88,\s*borderRadius: 44,\s*borderWidth: 1,/);
assert.match(modes.swipe, /<PracticeCta[\s\S]{0,80}testID="flashcards-truefalse-continue"[\s\S]{0,120}onPress=\{continueAfterFeedback\}/);
assert.match(modes.swipe, /<PracticeProgressRow[\s\S]{0,120}testID="flashcards-truefalse-progress"/);
assert.match(modes.swipe, /trainingCard: \{\s*borderRadius: 16,/);
// Цвета верно/неверно — прежние токены темы, цветной обводки нет.
assert.match(modes.swipe, /backgroundColor: verdictCorrect \? t\.correctBg : t\.wrongBg/);
assert.doesNotMatch(modes.swipe, /borderColor: verdictCorrect/);

// Жемчуга и опыта в тренировках нет.
for (const [name, source] of Object.entries({ ...modes, states })) {
  assert.doesNotMatch(source, /pearl|жемчуг|\bXP\b|xpGained/i, `${name} shows no pearls/XP`);
}

console.log('practice modes liquid-glass source contract: PASS');
