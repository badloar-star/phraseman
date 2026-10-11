// зачем (владелец 05.10 11:10, решение 3): итог Карточек — свой экран по cards-section.html (CardsSessionResultV2).
// Ранее (владелец 01.10): итог тренировки карточек = общий экран завершения 2.0
// (docs/design/v2-app/practice.html «Единый экран завершения», PM-137). Прежний
// контракт замораживал хэшами старую вёрстку — её владелец велел заменить. Здесь
// охраняем то, что не должно сломаться при смене вида: пропсы, четыре места вызова,
// звук/хаптику финала, правила показа оценки и кнопки «Добить».
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = 'app/flashcards/SessionResultScreen.tsx';
const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH), 'utf8');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const parse = (relativePath, candidate) => ts.createSourceFile(relativePath, candidate, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
const print = (node, file) => printer.printNode(ts.EmitHint.Unspecified, node, file);

// Места вызова не менялись при переходе на общий экран — их пропсы заморожены прежними хэшами.
// 05.10 (решение 3, cards-section): все четыре вызова передают надпись режима, время и «Что исправить».
const CALLER_HASHES = {
  // 04.10 (владелец: «очки из Блица убирай вообще, только монеты считаем») — из вызова итога снят scoreText.
  // 11.10 (Дизайн, be2a50775): в вызове итога Блица подпись повтора «Ещё разок!» → «Ещё раз»; пропсы те же.
  'app/flashcards_blitz_session.tsx': 'ddef5dddba1150a6d360483221c2151868ad55257c1ed2f300b7329ca78a7685',
  'app/flashcards_recall_session.tsx': '5e514e2e6a32cb30bd9aea95a8dcbfc17571e1ad44fff4a4ebc4aee0a7738501',
  // 04.10 (PM-134, 2c8a7b95f): обработчик «Готово» переименован openSettings → exitFromResult, пропсы те же.
  'app/flashcards_swipe.tsx': 'ddf57868f7a045920e14c9eb0da2f3b045adf600d39bba42f82ebe49a1d11f69',
  'app/flashcards_speaking_session.tsx': 'c187dbef27bd751353d4b03c84417359ec039b2d56babf715f6b57d7ced9096d',
};

function callerNodeHash(relativePath) {
  const candidate = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const file = parse(relativePath, candidate);
  let resultNode;
  const walk = (node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'SessionResultScreen') resultNode = node;
    ts.forEachChild(node, walk);
  };
  walk(file);
  assert.ok(resultNode, `${relativePath} result caller exists`);
  return hash(print(resultNode, file));
}

const impl = (() => {
  const start = source.indexOf('function SessionResultScreenImpl(');
  return source.slice(start, source.indexOf('\n}\n', start));
})();

test('all four flashcard modes still call the result screen with unchanged props', () => {
  for (const [relativePath, expected] of Object.entries(CALLER_HASHES)) {
    assert.equal(callerNodeHash(relativePath), expected, relativePath);
  }
});

test('the result renders the cards-section result screen with the session numbers', () => {
  assert.match(source, /import CardsSessionResultV2 from '.\/CardsSessionResultV2';/);
  assert.match(impl, /<CardsSessionResultV2/);
  assert.match(impl, /correct=\{correct\}/);
  assert.match(impl, /wrong=\{wrong\}/);
  assert.match(impl, /coinsGained=\{runesGained\}/);
  assert.match(impl, /mistakes=\{mistakes\}/);
  assert.match(impl, /durationSec=\{durationSec\}/);
  const view = fs.readFileSync(path.join(ROOT, 'app/flashcards/CardsSessionResultV2.tsx'), 'utf8');
  for (const copy of ['Что исправить', 'Без единой ошибки', 'верных ответов', 'точность', 'время']) assert.ok(view.includes(copy), copy);
  // владелец 04.10: очки Блица убраны — строки счёта в итоге нет.
  assert.doesNotMatch(view, /scoreLabel|Счёт/);
});

test('finale sound/haptic and weekly feedback gate are kept', () => {
  assert.match(impl, /playSfx\('session_complete'\);/);
  assert.match(impl, /fcHaptic\('finish'\);/);
  assert.match(impl, /feedbackSlot=\{feedback && showFeedback \?/);
  assert.match(impl, /<FeedbackRatingCard[\s\S]*kind="vocab"/);
});

test('Done haptics before the callback; «Ошибки · N» shows only with a retry handler', () => {
  assert.match(impl, /onDone=\{\(\) => \{ fcHaptic\('tap'\); onDone\(\); \}\}/);
  assert.match(impl, /retryLabel=\{onRetryWrong && retryWrongLabel \? retryWrongLabel : undefined\}/);
  assert.match(impl, /learnLeft > 0/);
  assert.match(impl, /Ошибки · \$\{learnLeft\}/);
});
