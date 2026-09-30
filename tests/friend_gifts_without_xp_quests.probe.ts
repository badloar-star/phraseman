import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
assert.equal(fs.existsSync(path.join(root, 'functions', 'src', 'friend_gifts.ts')), false);
const deploy = fs.readFileSync(path.join(root, 'functions', 'package.json'), 'utf8');
assert.equal(fs.existsSync(path.join(root, 'app', 'friend_gifts.ts')), false);
const friends = fs.readFileSync(path.join(root, 'app', '(tabs)', 'friends.tsx'), 'utf8');
assert.equal(fs.existsSync(path.join(root, 'app', 'friend_quests.ts')), false);
for (const retired of [
  'friendGetActiveQuest', 'friendClaimQuestReward', 'friend_quests',
  'friend_quest_meta', 'friend_quest_weekly', 'FRIEND_QUEST_TARGET_XP',
  'prepareLevelSpinMinting', 'user_total_xp',
]) {
  assert.equal(deploy.includes(retired), false, `Retired friend XP quest remains in deploy config: ${retired}`);
}
for (const retired of ['functions:friendGetActiveQuest', 'functions:friendClaimQuestReward']) {
  assert.equal(deploy.includes(retired), false, `Deploy still selects ${retired}`);
}
assert.doesNotMatch(friends, /friendQuest|FriendQuest|friend-quest-card|getActiveFriendQuest/);
assert.doesNotMatch(friends, /'по XP'|'за XP'|'by XP'/);
assert.match(friends, /return visible\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name\)\)/);
