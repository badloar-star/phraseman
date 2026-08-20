import { EPISODE_01_SESSION_21_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_21_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 21 teaches third-person contractions only', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_21_SOURCE, 21, 'phrases', ['contraction_thirdperson']));
