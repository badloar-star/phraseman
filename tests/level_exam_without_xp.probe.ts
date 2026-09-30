import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const scoring = fs.readFileSync(path.join(root, 'app', 'level_exam_scoring.ts'), 'utf8');
const result = fs.readFileSync(path.join(root, 'components', 'level-exam', 'LevelExamResult.tsx'), 'utf8');

assert.equal(scoring.includes('baseXp'), false);
assert.equal(result.includes('baseXp'), false);
assert.equal(result.includes(' XP'), false);
assert.equal(scoring.includes('getExamMedalTier(pct)'), true);
assert.equal(result.includes('{result.pct}%'), true);
