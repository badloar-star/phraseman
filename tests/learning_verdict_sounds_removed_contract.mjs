import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const feedback = read('app/feedback/feedback_kit.ts');
const compatibilityHook = read('hooks/use-correct-sound.ts');

assert.equal(feedback.includes("'pm.learn.correct'"), false, 'correct answers must not request an audio cue');
assert.equal(feedback.includes("'pm.learn.needs_work'"), false, 'incorrect answers must not request an audio cue');
assert.equal(feedback.includes('haptics.correct()'), true, 'correct-answer haptic feedback must remain');
assert.equal(feedback.includes('haptics.wrong()'), true, 'incorrect-answer haptic feedback must remain');
assert.equal(compatibilityHook.includes("'pm.learn.correct'"), false, 'legacy correct-answer callers must stay silent');
