import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
assert.doesNotMatch(home, /avatar_select|AvatarNudge|avatar_nudge_state/u);
assert.match(home, /nav\.push\('\/coin_rank'\)/u);
console.log('COIN RANK HOME ROUTE RETIREMENT: PASS');
