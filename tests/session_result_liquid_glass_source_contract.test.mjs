// зачем (владелец 01.10): итог тренировки карточек = общий экран завершения 2.0
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
const CALLER_HASHES = {
  'app/flashcards_blitz_session.tsx': '3d1ea533da47551edd3986fb9340fd9c4289ae390c3067b6eeae5cc242634fcb',
  'app/flashcards_recall_session.tsx': 'd2aadef834596945ab0bfc45014d13bd7bc3581b1aaba8845eab26b482416127',
  'app/flashcards_swipe.tsx': '6d0e9410bfed5feaccf12bc784473e4f6d33d839cc626215ec8668738f288ee1',
  'app/flashcards_speaking_session.tsx': 'ab93e11aadd09277d3a23075d47f4d7f4d1ade81de67800234f9fae0c17843ea',
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

test('the result renders the shared 2.0 done screen with the session numbers', () => {
  assert.match(source, /import V2DoneScreen from '..\/..\/components\/completion\/V2DoneScreen';/);
  assert.match(impl, /<V2DoneScreen/);
  assert.match(impl, /correct=\{correct\}/);
  assert.match(impl, /wrong=\{wrong\}/);
  assert.match(impl, /coinsGained=\{runesGained\}/);
  assert.match(impl, /scoreLabel=\{scoreText\}/);
  assert.match(impl, /stars=\{null\}/);
});

test('finale sound/haptic and weekly feedback gate are kept', () => {
  assert.match(impl, /playSfx\('session_complete'\);/);
  assert.match(impl, /fcHaptic\('finish'\);/);
  assert.match(impl, /feedbackSlot=\{feedback && showFeedback \?/);
  assert.match(impl, /<FeedbackRatingCard[\s\S]*kind="vocab"/);
});

test('Done haptics before the callback; «Добить» shows only with a retry handler', () => {
  assert.match(impl, /onPrimary=\{\(\) => \{ fcHaptic\('tap'\); onDone\(\); \}\}/);
  assert.match(impl, /secondaryLabel=\{onRetryWrong && retryWrongLabel \? retryWrongLabel : undefined\}/);
  assert.match(impl, /learnLeft > 0/);
  assert.match(impl, /onClose=\{onDone\}/);
});
