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
