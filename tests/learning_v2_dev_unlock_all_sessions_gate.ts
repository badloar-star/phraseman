import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildLearningV2AuthoringDevicePreviewV1,
  buildLearningV2DevUnlockedDraftDevicePreviewV1,
} from '../modules/learning-v2/preview/authoring_device_preview_v1';

assert.throws(
  () => buildLearningV2AuthoringDevicePreviewV1(3, 'ru'),
  /learning_v2_authoring_device_preview_forbidden/u,
  'The owner-review preview must keep the registry boundary',
);

const buildFailures: string[] = [];
for (let sessionOrdinal = 1; sessionOrdinal <= 56; sessionOrdinal += 1) {
  try {
    const draft = buildLearningV2DevUnlockedDraftDevicePreviewV1(
      sessionOrdinal,
      'ru',
    );
    assert.equal(draft.lessonOrdinal, 1);
    assert.equal(draft.sessionOrdinal, sessionOrdinal);
    assert.equal(draft.sideEffectPolicy, 'preview_only_no_learner_writes');
    assert.ok(
      draft.learnerChild.interactions.length > 0,
      `Session ${sessionOrdinal} must have playable interactions`,
    );
  } catch (error: unknown) {
    buildFailures.push(
      `S${sessionOrdinal}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
assert.deepEqual(buildFailures, [], buildFailures.join('\n'));

const lessonsSource = readFileSync('app/(tabs)/lessons.tsx', 'utf8');
assert.match(lessonsSource, /learning-v2-dev-unlock-all-sessions/u);
assert.match(lessonsSource, /__DEV__\s*&&\s*ENABLE_DEV_TOOLS/u);
assert.match(lessonsSource, /dev_unlocked_drafts_v1/u);
assert.match(lessonsSource, /DEV: открыть все/u);
assert.match(lessonsSource, /DEV: вернуть замки/u);
assert.doesNotMatch(
  lessonsSource.slice(
    lessonsSource.indexOf('learning-v2-dev-unlock-all-sessions'),
    lessonsSource.indexOf('learning-v2-dev-unlock-all-sessions') + 1800,
  ),
  /AsyncStorage|setLearningV2Progress|completedSessionIds/u,
  'DEV toggle must be presentation-only and must not mutate progress',
);

const playerSource = readFileSync(
  'app/learning_v2_direct_session_player_v1.tsx',
  'utf8',
);
assert.match(playerSource, /dev_unlocked_drafts_v1/u);
assert.match(playerSource, /buildLearningV2DevUnlockedDraftDevicePreviewV1/u);

process.stdout.write('LEARNING V2 DEV UNLOCK ALL SESSIONS GATE: PASS\n');
