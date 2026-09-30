import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const mirror = fs.readFileSync(path.join(root, 'app', 'paywall_progress_mirror.ts'), 'utf8');
const cards = fs.readFileSync(path.join(root, 'components', 'paywall', 'PaywallProofCards.tsx'), 'utf8');

assert.equal(mirror.includes("'user_total_xp'"), false);
assert.equal(/\bxp\s*:/.test(mirror), false);
assert.equal(cards.includes('mirror.xp'), false);
assert.equal(cards.includes("label: 'XP'"), false);
assert.equal(mirror.includes("'streak_count'"), true);
assert.equal(cards.includes('mirror.phrases'), true);
assert.equal(cards.includes('mirror.words'), true);
