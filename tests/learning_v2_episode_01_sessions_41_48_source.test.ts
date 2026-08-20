import { assertEpisode01Sessions41To48Contract } from '../modules/learning-v2/content/source/episode_01_sessions_41_48_support_v1';
import { EPISODE_01_SESSION_41_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_41_v1';
import { EPISODE_01_SESSION_42_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_42_v1';
import { EPISODE_01_SESSION_43_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_43_v1';
import { EPISODE_01_SESSION_44_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_44_v1';
import { EPISODE_01_SESSION_45_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_45_v1';
import { EPISODE_01_SESSION_46_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_46_v1';
import { EPISODE_01_SESSION_47_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_47_v1';
import { EPISODE_01_SESSION_48_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_48_v1';

const CHAPTER = [
  EPISODE_01_SESSION_41_SOURCE,
  EPISODE_01_SESSION_42_SOURCE,
  EPISODE_01_SESSION_43_SOURCE,
  EPISODE_01_SESSION_44_SOURCE,
  EPISODE_01_SESSION_45_SOURCE,
  EPISODE_01_SESSION_46_SOURCE,
  EPISODE_01_SESSION_47_SOURCE,
  EPISODE_01_SESSION_48_SOURCE,
] as const;

test('sessions 41–48 are continuously registered for the world-description chapter', () => {
  expect(
    CHAPTER.map((source) => source.requiredSessionOrdinal),
  ).toEqual([41, 42, 43, 44, 45, 46, 47, 48]);
  assertEpisode01Sessions41To48Contract(CHAPTER);
});
