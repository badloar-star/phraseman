const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(process.cwd(), '.superpowers', 'brainstorm', 'feature-intros', 'ux-review', 'implemented', 'variant_copy.ts'),
  'utf8',
);

test('variant mock provides three complete Russian options for every requested modal', () => {
  const ids = [
    'cards_hub_first_visit', 'statistics_first_visit', 'daily_phrase_first_visit', 'videos_first_visit',
    'friends_first_visit', 'arena_first_visit', 'league_rules_first_visit', 'cards_swipe_help',
    'training_listening_first_visit', 'training_speaking_first_visit', 'training_blitz_first_visit',
    'ai-dialog-consent', 'mistake_practice_help', 'profile_card_first_visit', 'ideas_first_visit', 'spin_first_visit',
  ];

  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const entry = source.match(new RegExp(`(?:\\b${escaped}|['"]${escaped}['"]): \\[([\\s\\S]*?)\\n  \\]`, 'u'));
    assert.ok(entry, `${id} must have a variant entry`);
    assert.equal((entry[1].match(/title:/gu) ?? []).length, 3, `${id} must have 3 titles`);
    assert.equal((entry[1].match(/body:/gu) ?? []).length, 3, `${id} must have 3 bodies`);
  }
});
