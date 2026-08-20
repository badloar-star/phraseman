import { EPISODE_01_SESSION_20_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_20_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 20 uses impersonal it for weather and things', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_20_SOURCE, 20, 'words_then_phrases', ['impersonal_it', 'weather_adjective']));
