import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';
import { assertEpisode01Sessions25To32Contract } from '../modules/learning-v2/content/source/episode_01_sessions_25_32_support_v1';

test('sessions 25–32 match the fourth-chapter map and complete the eight locales', () => {
  assertEpisode01Sessions25To32Contract(AUTHORED_EPISODE_01_SESSIONS);
});
