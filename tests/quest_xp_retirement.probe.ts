import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseQuestConfig, QUEST_KINDS } from '../functions/src/quests_core';

const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const example = {
  questId: 'old_xp_quest', status: 'queued', kind: 'earn_xp', target: 100,
  title: { ru: 'Старое задание' }, body: { ru: 'Старое задание' },
  rewards: [{ kind: 'runes', amount: 10 }], durationHours: 72,
};

assert.equal(QUEST_KINDS.includes('earn_xp' as never), false);
assert.equal(parseQuestConfig(example), null);
assert.equal(read('app/quests_client.ts').includes("| 'earn_xp'"), false);
assert.equal(read('functions/src/quests.ts').includes("case 'earn_xp'"), false);
assert.equal(read('components/QuestSheetModal.tsx').includes("case 'xp'"), false);
assert.equal(read('admin/v2/legacy.html').includes("{ id: 'earn_xp'"), false);
assert.equal(read('app/quests_client.ts').includes('QUEST_KIND_SET.has(kind)'), true);
assert.equal(read('app/quests_client.ts').includes('QUEST_TARGET_UNIT_SET.has(unit)'), true);
