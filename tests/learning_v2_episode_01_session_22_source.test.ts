import { EPISODE_01_SESSION_22_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_22_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 22 uses family nouns and my with he she and is', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_22_SOURCE, 22, 'words_then_phrases', ['family_noun', 'possessive_my']));
