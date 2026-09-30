import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const server = path.join(root, 'functions/src/friend_gifts.ts');
const entry = fs.readFileSync(path.join(root, 'functions/src/index.ts'), 'utf8');
const pkg = fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8');
const push = fs.readFileSync(path.join(root, 'functions/src/expo_push.ts'), 'utf8');

assert.equal(fs.existsSync(server), false);
for (const retired of ['friendSendGift', 'friendThankGift', 'friendConsumeChainShield']) {
  assert.equal(entry.includes(retired), false, `Function export remains: ${retired}`);
  assert.equal(pkg.includes(`functions:${retired}`), false, `Deploy target remains: ${retired}`);
}
assert.match(push, /export async function sendExpoPush/);
// зачем: D78 — arena_v2.ts удалён вместе с серверной Ареной; потребителей push
// проверяем среди оставшихся модулей.
for (const consumer of ['friends_together.ts', 'friend_activity_likes.ts']) {
  const source = fs.readFileSync(path.join(root, 'functions/src', consumer), 'utf8');
  assert.match(source, /from '\.\/expo_push'/);
}
