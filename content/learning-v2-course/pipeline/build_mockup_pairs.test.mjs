import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

// Source-level interaction test, not a browser/viewport verification.
test('mockup renders every pair and waits for the seventh match', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  const state = { pairsDone: [], pairSel: null, right: 0, wrong: 0, answered: false };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const grid = Array.from({ length: 7 }, (_, i) => ({ pairId: `p${i}`, target: `target${i}`, meaningByLocale: { ru: `meaning${i}` } }));
  const scope = {
    S: state, h: (tag, props, children = []) => ({ tag, props, children }),
    shuffle: values => values.slice().reverse(), loc: value => value.ru,
    avoidAlignedPairs: (_left, right) => right,
    WARNBOX: () => assert.fail('unexpected empty grid'), nextRow: () => ({ tag: 'next' }),
    render: () => { nodes = []; scope.renderPairs(panel, { interactionId: 'fixture' }, { pairGrid: grid }); },
  };
  vm.runInNewContext(fn, scope);
  scope.render();
  assert.deepEqual(Array.from(nodes[0].children, column => column.children.length), [7,7]);
  for (let i = 0; i < 7; i++) {
    nodes[0].children[0].children.find(button => button.props.text === `target${i}`).props.onClick();
    nodes[0].children[1].children.find(button => button.props.text === `meaning${i}`).props.onClick();
    assert.equal(state.answered, i === 6);
  }
  assert.equal(state.right, 7);
  assert.equal(state.wrong, 0);
  assert.ok(nodes[0].children.every(column => column.children.every(button => button.props.disabled)));
});

test('mockup never aligns a Speed Match pair on the same row', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderPairs('), source.indexOf('function renderSpeak('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { pairsDone: [], pairSel: null, right: 0, wrong: 0, answered: false };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const grid = Array.from({ length: 4 }, (_, i) => ({
    pairId: `p${i}`,
    target: `target${i}`,
    meaningByLocale: { ru: `meaning${i}` },
  }));
  const scope = {
    S: state,
    h: (tag, props, children = []) => ({ tag, props, children }),
    loc: value => value.ru,
    WARNBOX: () => assert.fail('unexpected empty grid'),
    nextRow: () => ({ tag: 'next' }),
    render: () => {},
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.renderPairs(panel, { interactionId: 'en:lesson-01:session-02:i07' }, { pairGrid: grid });
  const [left, right] = nodes[0].children.map(column => column.children.map(button => button.props.text));
  for (let row = 0; row < grid.length; row++) {
    assert.notEqual(
      left[row].replace('target', ''),
      right[row].replace('meaning', ''),
      `row ${row + 1} must not reveal a correct pair`,
    );
  }
});

test('mockup identifies a selected extra builder tile by its physical tile ID', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderBuilder('), source.indexOf('function renderPairs('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, ok: null, assembled: [], tileFeedback: null, step: 3, right: 0, wrong: 0, locale: 'ru' };
  let nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state,
    h: (tag, props, children = []) => ({ tag, props, children }),
    shuffle: values => values,
    speak: () => {},
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    WARNBOX: () => assert.fail('unexpected missing tiles'),
    render: () => { nodes = []; scope.renderBuilder(panel, { interactionId: 'fixture' }, payload); },
  };
  const payload = {
    targetPhrase: 'I am here.', orderedTokens: ['I', 'am', 'here'], authoredDistractorTokens: ['ready', 'ready'],
    slotFeedback: [
      { responseId: 'fixture:tile:d1', correct: false, feedbackByLocale: { ru: 'Первый лишний ready.' } },
      { responseId: 'fixture:tile:d2', correct: false, feedbackByLocale: { ru: 'Второй лишний ready.' } },
    ],
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.render();
  const tiles = nodes.find(node => node?.props?.class === 'tiles').children;
  tiles.filter(tile => tile.props.text === 'ready')[1].props.onClick();
  assert.equal(state.tileFeedback, 'Второй лишний ready.');
});

test('Speed Match derangement has a guaranteed fallback for five pairs', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const left = [0, 1, 2, 3, 4].map(id => ({ id }));
  const right = [0, 2, 4, 1, 3].map(id => ({ id }));
  const scope = { left, right };
  vm.runInNewContext(`${shuffleSource}\nresult = avoidAlignedPairs(left, right);`, scope);
  assert.deepEqual(Array.from(scope.result, item => item.id).sort(), [0, 1, 2, 3, 4]);
  assert.ok(scope.result.every((item, row) => item.id !== left[row].id));
});

test('mockup shuffles choices and renders localized listen meanings', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderChoice('), source.indexOf('function correctIdOf('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, picked: null, ok: false, right: 0, wrong: 0, locale: 'uk' };
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state,
    h: (tag, props, children = []) => ({ tag, props, children }),
    speak: () => {},
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    WARNBOX: () => assert.fail('unexpected empty options'),
    correctIdOf: () => 'fixture:r1',
    nextRow: () => ({ tag: 'next' }),
    render: () => {},
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.renderChoice(panel, {
    interactionId: 'en:lesson-03:session-25:i02',
    family: 'listen_choose',
    responseOptions: [
      { responseId: 'fixture:r1', text: 'phone' },
      { responseId: 'fixture:r2', text: 'bone' },
    ],
  }, {
    localizedMeaningChoices: [
      { responseId: 'fixture:r1', targetText: 'phone', meaningByLocale: { ru: 'телефон', uk: 'телефон' } },
      { responseId: 'fixture:r2', targetText: 'bone', meaningByLocale: { ru: 'кость', uk: 'кістка' } },
    ],
    choiceFeedback: [],
  });
  const labels = nodes[0].children.map(button => button.children[0].text);
  assert.notEqual(labels[0], 'телефон', 'authored correct-first choice must never remain first after seeded shuffle');
  assert.deepEqual(new Set(labels), new Set(['кістка', 'телефон']));
});

test('mockup renders separate sound-contrast audioA and audioB controls', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  const fn = source.slice(source.indexOf('function renderChoice('), source.indexOf('function correctIdOf('));
  const shuffleSource = source.slice(source.indexOf('const shuffle ='), source.indexOf('function resetStep('));
  const state = { answered: false, picked: null, ok: false, right: 0, wrong: 0, locale: 'ru' };
  const spoken = [];
  const nodes = [];
  const panel = { append: node => nodes.push(node) };
  const scope = {
    S: state,
    h: (tag, props, children = []) => ({ tag, props, children }),
    speak: text => spoken.push(text),
    document: { createTextNode: text => ({ text }) },
    loc: value => value?.[state.locale] ?? value?.ru ?? '',
    tl: value => value,
    sanitizeLearnerPrompt: value => value,
    WARNBOX: () => assert.fail('unexpected missing sound-contrast audio'),
    correctIdOf: () => 'fixture:r1',
    nextRow: () => ({ tag: 'next' }),
    render: () => {},
  };
  vm.runInNewContext(`${shuffleSource}\n${fn}`, scope);
  scope.renderChoice(panel, {
    interactionId: 'en:lesson-01:session-04:i08',
    family: 'sound_contrast',
    responseOptions: [
      { responseId: 'fixture:r1', text: 'right' },
      { responseId: 'fixture:r2', text: 'wrong' },
    ],
  }, {
    audioA: { audioTargetId: 'fixture:a', transcript: 'right' },
    audioB: { audioTargetId: 'fixture:b', transcript: 'wrong' },
    contrastA: 'right',
    contrastB: 'wrong',
    choiceFeedback: [],
  });
  const audioButtons = nodes[0].children;
  assert.deepEqual(Array.from(audioButtons, button => button.children[0].text), ['▶  Прослушать A', '▶  Прослушать B']);
  audioButtons.forEach(button => button.props.onClick());
  assert.deepEqual(spoken, ['right', 'wrong']);
});

test('mockup fails closed when canonical release contains a multi-phrase practice or intro interaction', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  assert.match(source, /auditSinglePhraseRelease/u);
  assert.match(source, /single_phrase_mockup_hold/u);
  assert.match(source, /report\.violationCount/u);
  assert.match(source, /report\.introFileCount/u);
});

test('mockup keeps learner-facing labels free of the internal session term and numbers every task', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('./build_mockup.mjs', import.meta.url)), 'utf8');
  assert.match(source, /const displayTitle/u);
  assert.match(source, /text:"Задание " \+ taskNumber/u);
  assert.match(source, /Пройти урок/u);
  assert.doesNotMatch(source.slice(source.indexOf('const displayTitle'), source.indexOf('const esc')), /\\bсессия\\b/u);
});
