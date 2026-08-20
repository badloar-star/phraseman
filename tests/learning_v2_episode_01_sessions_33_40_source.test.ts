import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { assertEpisode01Sessions33To40Contract } from '../modules/learning-v2/content/source/episode_01_sessions_33_40_support_v1';

test('sessions 33–40 match the fifth-chapter map and never form questions with do or does', () => {
  assertEpisode01Sessions33To40Contract(AUTHORED_EPISODE_01_SESSIONS);
});
