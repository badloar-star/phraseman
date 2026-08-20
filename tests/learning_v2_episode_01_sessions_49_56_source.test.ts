import { assertEpisode01Sessions49To56Contract } from '../modules/learning-v2/content/source/episode_01_sessions_49_56_support_v1';
import { EPISODE_01_SESSION_49_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_49_v1';
import { EPISODE_01_SESSION_50_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_50_v1';
import { EPISODE_01_SESSION_51_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_51_v1';
import { EPISODE_01_SESSION_52_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_52_v1';
import { EPISODE_01_SESSION_53_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_53_v1';
import { EPISODE_01_SESSION_54_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_54_v1';
import { EPISODE_01_SESSION_55_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_55_v1';
import { EPISODE_01_SESSION_56_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_56_v1';

test('sessions 49–56 complete lesson 1 without leaving the to-be boundary', () => {
  assertEpisode01Sessions49To56Contract([
    EPISODE_01_SESSION_49_SOURCE, EPISODE_01_SESSION_50_SOURCE,
    EPISODE_01_SESSION_51_SOURCE, EPISODE_01_SESSION_52_SOURCE,
    EPISODE_01_SESSION_53_SOURCE, EPISODE_01_SESSION_54_SOURCE,
    EPISODE_01_SESSION_55_SOURCE, EPISODE_01_SESSION_56_SOURCE,
  ]);
});
