import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8');
const community = fs.readFileSync(path.join(__dirname, '..', 'app', 'community_packs', 'functionsClient.ts'), 'utf8');

for (const marker of [
  'QuestTaskCard', 'QuestSheetModal', '../quests_client',
  'activeQuest', 'questSheetOpen', 'handleQuestClaim', 'loadActiveQuest',
]) {
  assert.equal(home.includes(marker), false, `Home still contains ${marker}`);
}
assert.equal(community.includes("import('../quests_client')"), false);
assert.equal(home.includes('HomeV2Header'), true);
assert.equal(home.includes('DailyPhraseCard'), true);
