import { EPISODE_01_SESSION_19_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_19_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 19 uses inversion with is only', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_19_SOURCE, 19, 'phrases', []));
