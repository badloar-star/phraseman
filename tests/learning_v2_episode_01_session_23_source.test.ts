import { EPISODE_01_SESSION_23_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_23_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 23 is spoken production from the third-person material', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_23_SOURCE, 23, 'voice', ['spoken_production']));
