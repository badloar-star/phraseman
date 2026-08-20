import { EPISODE_01_SESSION_24_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_24_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 24 recalls only third-person material', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_24_SOURCE, 24, 'checkpoint', []));
