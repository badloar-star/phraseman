import assert from 'node:assert/strict';

import { EPISODE_01_SESSION_02_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_02_v1';
import { buildSessionChildBodiesFromShard } from '../modules/learning-v2/content/source/session_package_from_shard_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const shard = buildSessionShardFromSource(EPISODE_01_SESSION_02_SOURCE);

for (const locale of locales) {
  const children = buildSessionChildBodiesFromShard(shard, locale, 'en:lesson-01:session:02');
  const repeatInteractions = children.learner.interactions.filter(
    (interaction) => interaction.family === 'scripted_repeat_compare',
  );
  assert.ok(repeatInteractions.length > 0, `repeat mode must exist for ${locale}`);
  for (const interaction of repeatInteractions) {
    assert.equal(interaction.modePayload?.family, 'scripted_repeat_compare');
    if (interaction.modePayload?.family !== 'scripted_repeat_compare') continue;
    const target = interaction.modePayload.targetPhrase.trim();
    assert.ok(target, `repeat target must stay in modePayload for ${locale}`);
    assert.ok(
      !interaction.prompt.toLocaleLowerCase(locale).includes(target.toLocaleLowerCase(locale)),
      `repeat instruction must not duplicate visible target "${target}" for ${locale}`,
    );
  }
}

process.stdout.write('LEARNING V2 REPEAT PROMPT/TARGET SEPARATION 2026-08-26 GATE: PASS\n');
