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
for (const name of ['blitz', 'recall', 'speaking']) {
  assert.match(modes[name], /<PracticeRoundIconButton/, `${name} deck picker button is round`);
  assert.match(modes[name], /<PracticeHeaderTitle/, `${name} title uses 20/700`);
}
assert.match(modes.blitz, /<PracticeTimerPill/);
assert.match(modes.blitz, /<PracticeAnswerMark kind=\{state\}/);
assert.match(modes.blitz, /testID="fc-blitz-timer"/);
assert.match(modes.blitz, /disabled=\{locked\}/);
assert.match(modes.swipe, /<PracticeHeaderTitle glass=\{swipeGlass\} title=\{title\} subtitle=\{subtitle\}/);

console.log('practice modes liquid-glass source contract: PASS');
