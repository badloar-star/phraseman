import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const dir = 'docs/v2/mockups/2026-09-12-five-directions/';
const approved = JSON.parse(fs.readFileSync(dir + 'owner-approved.json', 'utf8'));
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(dir + 'owner-preset.js', 'utf8'), sandbox);
const preset = JSON.parse(JSON.stringify(sandbox.window.V2_OWNER_PRESET));
assert.equal(approved.sourceFiles.length, 8);
assert.equal(Object.keys(approved.notes).length, 8);
assert.equal(approved.supersededNotes.length, 0);
assert.equal(approved.directions.word, 'editorial');
assert.equal(approved.theme, 'inherit-app');
for (const screen of ['lessons', 'map', 'modal', 'intro0']) assert.deepEqual(preset.edits[`atlas/${screen}/*`], approved.edits[`atlas/${screen}/*`]);
for (const screen of ['intro1', 'intro2']) assert.deepEqual(preset.edits[`atlas/${screen}/*`], approved.edits['atlas/intro0/*']);
assert.deepEqual(preset.edits['editorial/word/*'], approved.edits['atlas/word/*']);
assert.equal(preset.edits['clay/lessons/*'], undefined);

const native = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/learning-v2/learningV2OwnerLayout.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, native);
const layout = native.exports.LEARNING_V2_OWNER_LAYOUT;
for (const [page, scope] of Object.entries({ lessons: 'atlas/lessons/*', map: 'atlas/map/*', modal: 'atlas/modal/*', intro: 'atlas/intro0/*', word: 'atlas/word/*' })) {
  for (const [key, value] of Object.entries(approved.edits[scope].screen)) {
    // Node/map controls on a word/intro screen had no matching element.
    if (!(key in layout[page])) { assert.ok(['nodeSize', 'mapStep'].includes(key)); continue; }
    assert.equal(layout[page][key], value, `${page}.${key}`);
  }
}
vm.runInNewContext(fs.readFileSync(dir + 'data.js', 'utf8'), sandbox);
assert.deepEqual(Array.from(native.exports.LEARNING_V2_OWNER_EN_TITLES_RU), Array.from(sandbox.window.V2_DESIGN_DATA.lessons, lesson => lesson.title));
for (const file of ['app/(tabs)/lessons.tsx', 'components/learning-v2/LearningV2PulseCourse.tsx', 'components/learning-v2/LearningV2NewWordEncounterOverlay.tsx', 'components/learning-v2/LearningV2WordPocketOverlayV1.tsx', 'components/LearningV2SessionOutcomeSheet.tsx', 'app/learning_v2_session_intro.tsx']) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } });
  assert.equal(output.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, file);
}
console.log('PASS: 8 owner exports, all notes retained, selected hybrid + exact effective geometry, 32 titles, 6 TSX syntax checks (not full typecheck).');
