import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const banner = readFileSync(path.join(root, 'components/SaveProgressBanner.tsx'), 'utf8');
const home = readFileSync(path.join(root, 'app/(tabs)/home.tsx'), 'utf8');

assert.equal(/\bXP\b|user_total_xp|xp_changed|xp_updated|XP_THRESHOLD/.test(banner), false);
assert.equal(banner.includes('hasSavedLearningProgress?: boolean'), true);
assert.equal(banner.includes('if (!hasSavedLearningProgressRef.current)'), true);
assert.equal(home.includes('hasSavedLearningProgress={lessonsCompleted > 0}'), true);
assert.equal(banner.includes('context="home_banner"'), true);
console.log('save progress banner no longer depends on XP');
