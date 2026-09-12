import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
function facts(t, lesson, { pairs = 5, wrong = 3, tasks = 17, secondBoard = false, overlap = false, duplicateTarget = false, duplicateMeaning = false, correctAsWrong = false } = {}) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'learning-ladder-'));
  t.after(() => {
    assert.equal(path.dirname(root), parent);
    assert.ok(path.basename(root).startsWith('learning-ladder-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const dir = path.join(root, `sessions/en/l${String(lesson).padStart(2, '0')}/s01`);
  fs.mkdirSync(dir, { recursive: true });
  const blocks = [];
  const modes = [];
  for (let n = 1; n <= tasks; n++) {
    const board = n === 1 || (n === 2 && secondBoard);
    modes.push(`${n}=${board ? 'speed_match' : 'context_gap_grammar'}`);
    const content = board
      ? Array.from({ length: pairs }, (_, i) => `${n === 2 && overlap && i === 0 ? 'word1a' : `word${n}${String.fromCharCode(97 + (duplicateTarget && i === 1 ? 0 : i))}`} — значение ${duplicateMeaning && i === 1 ? 0 : i}`).join(' · ')
      : `She ___ ready. → **is**${Array.from({ length: wrong }, (_, i) => ` · ${correctAsWrong && i === 0 ? 'IS' : `wrong${i}`}`).join('')}`;
    // Intentionally omit a count in the title: inspect the actual board.
    blocks.push(`**${n} · ${board ? 'Соедините пары' : 'Вставьте слово'}**\n${content}`);
  }
  const source = path.join(dir, 'final.ru.md');
  fs.writeFileSync(source, `# Test\n\n**Новые слова:** —\n\n## Практика\n\n${blocks.join('\n\n')}\n\n## Для сборщика\n\nmodes: ${modes.join(', ')}\n`);
  const program = `import {machineFacts,HARD_FACT_RE} from ${JSON.stringify(pathToFileURL(path.join(here, 'run.mjs')).href)}; const all=machineFacts(${JSON.stringify(source)}).split('\\n'); console.log(JSON.stringify({all,hard:all.filter(x=>HARD_FACT_RE.test(x))}));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

test('L5 rejects four actual pairs even without a count in the heading', t => {
  assert.ok(facts(t, 5, { pairs: 4 }).hard.some(x => x.includes('ПАРЫ НИЖЕ СТУПЕНИ')));
  assert.ok(!facts(t, 5, { pairs: 5 }).hard.some(x => x.includes('ПАРЫ НИЖЕ СТУПЕНИ')));
});
test('L9 choice distractors are counted and blocking; L2 is frozen', t => {
  assert.ok(facts(t, 9, { wrong: 2 }).hard.some(x => x.includes('ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ')));
  assert.ok(!facts(t, 9, { wrong: 3 }).hard.some(x => x.includes('ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ')));
  assert.ok(!facts(t, 2, { pairs: 3, wrong: 1 }).all.some(x => /СТУПЕНИ/.test(x)));
});
test('two disjoint L3 boards remain allowed; overlapping targets fail', t => {
  assert.ok(!facts(t, 3, { pairs: 4, secondBoard: true }).hard.some(x => /ПОВТОР СЛОВ МЕЖДУ ДОСКАМИ/.test(x)));
  assert.ok(facts(t, 3, { pairs: 4, secondBoard: true, overlap: true }).hard.some(x => /ПОВТОР СЛОВ МЕЖДУ ДОСКАМИ/.test(x)));
});
test('task target is advisory, twelve-task floor is blocking', t => {
  assert.ok(!facts(t, 3, { tasks: 16 }).hard.some(x => /МАЛО ЗАДАНИЙ|ОРИЕНТИР ЗАДАНИЙ/.test(x)));
  assert.ok(facts(t, 3, { tasks: 11 }).hard.some(x => /МАЛО ЗАДАНИЙ/.test(x)));
});
test('duplicate labels cannot inflate board or wrong-option counts', t => {
  assert.ok(facts(t,5,{duplicateTarget:true}).hard.some(x=>x.includes('ДУБЛИ В ДОСКЕ')));
  assert.ok(facts(t,5,{duplicateMeaning:true}).hard.some(x=>x.includes('ДУБЛИ В ДОСКЕ')));
  assert.ok(facts(t,9,{correctAsWrong:true}).hard.some(x=>x.includes('ДИСТРАКТОРЫ НИЖЕ СТУПЕНИ')));
});

function evaluate(expression) {
  const program = `import {difficultyLadder,difficultyFacts,HARD_FACT_RE} from ${JSON.stringify(pathToFileURL(path.join(here, 'run.mjs')).href)}; console.log(JSON.stringify(${expression}));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}
test('profiles preserve every actual transition and never require unavailable types', () => {
  const profiles = evaluate('[2,3,5,9,10,11,13,19,20,21,25].map(difficultyLadder)');
  assert.equal(profiles[0].frozen, true);
  assert.deepEqual(profiles.slice(1).map(d => [d.lesson,d.tasks,d.pairs,d.distractors,d.boardTarget]), [
    [3,17,4,2,1],[5,17,5,2,1],[9,17,5,3,2],[10,17,5,3,2],
    [11,19,5,3,2],[13,19,6,3,2],[19,19,6,4,3],[20,19,6,4,3],
    [21,21,6,4,3],[25,21,7,4,3],
  ]);
  assert.ok(profiles.every(d => d.allowedSourceTypes === 8));
});
test('later pair and choice thresholds block only their exact undershoot', t => {
  for (const [lesson, pairs, wrong] of [[13,6,3],[19,6,4],[25,7,4]]) {
    assert.ok(facts(t, lesson, {pairs:pairs-1,wrong}).hard.some(x=>x.includes('ПАРЫ НИЖЕ СТУПЕНИ')));
    assert.ok(!facts(t, lesson, {pairs,wrong}).hard.some(x=>/ПАРЫ НИЖЕ|ДИСТРАКТОРЫ НИЖЕ/.test(x)));
  }
});
function payload(families, targets = [], newWords = '—') {
  return `**Новые слова:** ${newWords}\n\n## Практика\n\n${families.map((f,i)=>`**${i+1} · Задание**\n→ **${targets[i] ?? 'Yes, I am.'}**`).join('\n\n')}\n\n## Для сборщика\n\nmodes: ${families.map((f,i)=>`${i+1}=${f}`).join(', ')}\n`;
}
test('phrase median excludes short answers, gaps and cards, deduplicates targets and stays advisory', () => {
  const families = ['phrase_builder','listen_build_dictation','phrase_builder','phrase_builder','word_card','context_gap_grammar'];
  const source = payload(families, ["She's here with me.", "She's here with me.", 'Yes, I am.', 'She is here.', 'key','is'], 'key');
  const output = evaluate(`(()=>{const all=difficultyFacts(${JSON.stringify(source)},19); return {all,hard:all.filter(x=>HARD_FACT_RE.test(x))}})()`);
  assert.ok(output.all.some(x=>x.includes('медиана 3.5')));
  assert.ok(!output.hard.some(x=>x.includes('ОРИЕНТИР ПОЛНОЙ ФРАЗЫ')));
});
test('sound contrast is exempt from choice minima; unsupported modes and zero-new cards fail', () => {
  const source = payload(['sound_contrast','word_card','invented_mode']);
  const output = evaluate(`difficultyFacts(${JSON.stringify(source)},19).filter(x=>HARD_FACT_RE.test(x))`);
  assert.ok(!output.some(x=>x.includes('ДИСТРАКТОРЫ НИЖЕ')));
  assert.ok(output.some(x=>x.includes('КАРТОЧКА БЕЗ НОВОГО СЛОВА')));
  assert.ok(output.some(x=>x.includes('НЕРАЗРЕШЁННАЯ МЕХАНИКА')));
});
