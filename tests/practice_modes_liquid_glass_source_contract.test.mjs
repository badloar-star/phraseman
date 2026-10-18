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
// зачем (Тень 12.10): круглые кнопки шапки без кромки — плашка с малой тенью; обводки (hairlineWidth/glassEdge) запрещены
assert.doesNotMatch(chrome, /StyleSheet\.hairlineWidth|glassEdge/);
assert.match(chrome, /nestedBoxShadow\(glass\)/);
assert.ok(chrome.split('\n').length <= 400);

for (const [name, source] of Object.entries(modes)) {
  assert.match(source, /components\/practice\/PracticeChrome/, `${name} uses the shared practice chrome`);
  assert.match(source, /<PracticeBackButton/, `${name} uses the round back button`);
}
// зачем (PM-129/PM-130, координатор 03.10): у Блица и «Устно» кнопки выбора наборов в шапке больше
// нет — наборы выбираются на экране настройки (D152), на её месте плашка монет из practice.html.
assert.match(modes.recall, /<PracticeRoundIconButton/, 'recall deck picker button is round');
for (const name of ['blitz', 'recall', 'speaking']) {
  assert.match(modes[name], /<PracticeHeaderTitle/, `${name} title uses 20/700`);
}
assert.doesNotMatch(modes.blitz, /testID="fc-blitz-pick-decks"/);
assert.doesNotMatch(modes.speaking, /testID="fc-speak-pick-decks"/);
assert.match(modes.blitz, /<PracticeTimerPill/);
assert.match(modes.blitz, /<PracticeAnswerMark kind=\{state\}/);
assert.match(modes.blitz, /testID="fc-blitz-timer"/);
assert.match(modes.blitz, /disabled=\{locked\}/);
// зачем (Карточки 2.0 12.10, cards-v2.html `sessHdr`): шапка «Правда / ложь» — общий PracticeSessionHeader с ✕ и названием, без подзаголовка и пилюли энергии
assert.match(modes.swipe, /<PracticeSessionHeader[\s\S]{0,160}backIcon="close"[\s\S]{0,400}title=\{title\}/);

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
// зачем (Тень 12.10): карточка вопроса `.qc` — плашка с тенью, без кромки 1 px и без overflow hidden (он режет тень)
assert.match(states, /borderRadius: 16,\s/, '.qc radius 16');
assert.doesNotMatch(states, /borderWidth: StyleSheet\.hairlineWidth/, '.qc has no border');
assert.match(states, /boxShadow: plateBoxShadow\(glass\)/, '.qc has the plate shadow');

// Пусто / мало карточек / ошибка загрузки / данные тренировки не открылись — единая панель.
for (const [name, source, ids] of [
  ['blitz', modes.blitz, ['fc-blitz-pick-decks-empty', 'fc-blitz-too-few']],
  ['recall', modes.recall, ['fc-recall-pick-decks-empty', 'fc-recall-empty']],
  ['speaking', modes.speaking, ['fc-speak-pick-decks-empty', 'fc-speak-empty']],
  ['swipe', modes.swipe, ['flashcards-swipe-no-cards', 'flashcards-swipe-reload']],
]) {
  assert.match(source, /components\/practice\/PracticeStates/, `${name} imports shared states`);
  assert.match(source, /<PracticeStatePanel/, `${name} uses the state panel`);
  for (const id of ids) assert.ok(source.includes(id), `${name} keeps ${id}`);
}
// Действия служебных состояний прежние.
// зачем (правило владельца «экранов-ошибок нигде», 18.10): «Тренировка не открылась / Попробовать снова» убрано — тихие повторы и тихий уход.
assert.doesNotMatch(modes.blitz, /fc-blitz-quota-retry/);
assert.match(modes.blitz, /useSilentLeave\(quotaUnavailable && quotaAutoRetries >= BLITZ_QUOTA_RETRY_DELAYS_MS\.length/);
assert.match(modes.blitz, /onPress: openDeckPicker,[\s\S]{0,80}testID: 'fc-blitz-pick-decks-empty'/);
assert.doesNotMatch(modes.speaking, /fc-speak-quota-retry/);
assert.match(modes.speaking, /useSilentLeave\(speechNa, 'flashcards_speaking'/);
assert.match(modes.recall, /useSilentLeave\(!activeCard && loadExhausted, 'flashcards_recall'/);
assert.match(modes.swipe, /useSilentLeave\(showQuickNoCards && Boolean\(loadError\), 'flashcards_swipe'/);
assert.match(modes.speaking, /onPress: openDeckPicker,[\s\S]{0,80}testID: 'fc-speak-pick-decks-empty'/);
assert.match(modes.recall, /onPress: openDeckSetup/);
assert.doesNotMatch(modes.recall, /fc-recall-load-error/);
assert.match(modes.swipe, /onPress: \(\) => void loadSources\(\)/);

// Загрузка без спиннера — скелет той же геометрии.
assert.doesNotMatch(modes.recall, /ActivityIndicator/);
assert.match(modes.recall, /testID="fc-recall-loading"/);
assert.doesNotMatch(setup.slice(setup.indexOf('fc-training-setup-loading'), setup.indexOf('fc-training-setup-loading-row-')), /<ActivityIndicator/);

// «Напиши» (Карточки 2.0 12.10, cards-v2.html `write()`): карточка `.qh` высотой 170 r20, поле `.field` 60/14 (кольцо исхода — состояние), «Подсказка» под полем, `.cta` «Проверить» / «Дальше».
assert.match(modes.recall, /minHeight: 170, borderRadius: 20/);
assert.match(modes.recall, /compactInputShell: \{ minHeight: 60, marginTop: 22, borderRadius: 14/);
assert.doesNotMatch(modes.recall, /borderColor: recallGlass\.glassEdge/);
assert.match(modes.recall, /<PracticeCta[\s\S]{0,120}testID="fc-recall-check"[\s\S]{0,120}disabled=\{!canCheck\}[\s\S]{0,40}onPress=\{checkAnswer\}/);
assert.match(modes.recall, /<PracticeCta[\s\S]{0,120}testID="fc-recall-continue"/);
assert.ok(modes.recall.indexOf('testID="fc-recall-input"') < modes.recall.indexOf('testID="fc-recall-hint"'), 'hint sits under the input');
assert.match(modes.recall, /<PracticeProgressRow[\s\S]{0,200}left=\{totalCards > 0 \? String\(masteredCount\) : ''\}/);

// «Устно»: прогресс «позиция … всего» под полосой, задания — пилюли с подписью, стороны — тон стекла.
assert.match(modes.speaking, /testID="fc-speak-progress"/);
// зачем (Карточки 2.0 12.10, `sessHdr('Устно', '4 / 20')`): счёт сессии теперь в шапке справа от названия, а не отдельной строкой под полосой
assert.match(modes.speaking, /\{`\$\{progress\.position\} \/ \$\{progress\.total\}`\}/);
assert.match(modes.speaking, /styles\.taskPill/);
assert.match(modes.speaking, /\{optionLabel\}/);
assert.match(modes.speaking, /taskPill: \{[\s\S]{0,60}minHeight: 44/);

// «Правда / ложь» (Карточки 2.0 12.10): смахиваемая карточка (TrueFalseSwipeCard), круги 76 с подписями «Ложь / Правда», панель исхода 20/700 и «Дальше».
assert.match(modes.swipe, /<TrueFalseSwipeCard/);
assert.match(modes.swipe, /trueFalseAnswer: \{\s*width: 76,\s*height: 76,\s*borderRadius: 38,/);
assert.doesNotMatch(modes.swipe, /trueFalseAnswer: \{[^}]*borderWidth/);
assert.match(modes.swipe, /<PracticeCta[\s\S]{0,80}testID="flashcards-truefalse-continue"[\s\S]{0,120}onPress=\{continueWithFly\}/);
assert.match(modes.swipe, /<PracticeProgressRow[\s\S]{0,120}testID="flashcards-truefalse-progress"/);
assert.match(modes.swipe, /trainingCard: \{\s*borderRadius: 16,/);
// Цвета верно/неверно — токены темы (goodSoft/badSoft), цветной обводки-контейнера нет (кольцо исхода — только inset-состояние).
assert.match(modes.swipe, /verdictCorrect \? swipeGlass\.goodSoft : swipeGlass\.badSoft/);
assert.doesNotMatch(modes.swipe, /borderColor: verdictCorrect/);

// Жемчуга и опыта в тренировках нет.
for (const [name, source] of Object.entries({ ...modes, states })) {
  assert.doesNotMatch(source, /pearl|жемчуг|\bXP\b|xpGained/i, `${name} shows no pearls/XP`);
}

console.log('practice modes liquid-glass source contract: PASS');
