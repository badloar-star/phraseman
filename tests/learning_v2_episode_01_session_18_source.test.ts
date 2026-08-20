import { EPISODE_01_SESSION_18_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_18_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 18 keeps third-person negation without new grammar', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_18_SOURCE, 18, 'phrases', []));
