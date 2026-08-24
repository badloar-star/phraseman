import assert from 'node:assert/strict';
import { EPISODE_01_SESSION_01_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_01_v1';
import { EPISODE_01_SESSION_02_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_02_v1';
import { EPISODE_01_SESSION_03_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_03_v1';
import { EPISODE_01_SESSION_04_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_04_v1';
import { EPISODE_01_SESSION_05_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_05_v1';
import { EPISODE_01_SESSION_06_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_06_v1';
import { EPISODE_01_SESSION_07_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_07_v1';
import { EPISODE_01_SESSION_08_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_08_v1';
import { EPISODE_01_SESSION_09_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_09_v1';
import { EPISODE_01_SESSION_10_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_10_v1';
import { buildSessionShardFromSource } from '../modules/learning-v2/content/source/session_shard_from_source_v1';

const sources = [
  EPISODE_01_SESSION_01_SOURCE,
  EPISODE_01_SESSION_02_SOURCE,
  EPISODE_01_SESSION_03_SOURCE,
  EPISODE_01_SESSION_04_SOURCE,
  EPISODE_01_SESSION_05_SOURCE,
  EPISODE_01_SESSION_06_SOURCE,
  EPISODE_01_SESSION_07_SOURCE,
  EPISODE_01_SESSION_08_SOURCE,
  EPISODE_01_SESSION_09_SOURCE,
  EPISODE_01_SESSION_10_SOURCE,
] as const;

for (const source of sources) {
  const shard = buildSessionShardFromSource(source);
  const seen = new Map<string, number>();
  for (const card of shard.cards.slice(3)) {
    const target = card.contentItem.target.text.normalize('NFC').trim();
    const identity = `${target}\u0000${card.family}`;
    const previousSlot = seen.get(identity);
    assert.equal(
      previousSlot,
      undefined,
      `Session ${source.requiredSessionOrdinal} repeats target ${JSON.stringify(target)} ` +
        `with family ${card.family} in slots ${previousSlot} and ${card.taskSlot}. ` +
        'A repeated target must use a different task family inside one session.',
    );
    seen.set(identity, card.taskSlot);
  }
}

process.stdout.write('LEARNING V2 LESSON 1 NO REPEATED TARGET+FAMILY GATE: PASS\n');
